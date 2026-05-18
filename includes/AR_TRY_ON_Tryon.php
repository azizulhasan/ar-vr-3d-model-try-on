<?php

namespace AR_TRY_ON;

/**
 * Virtual Try-On — TensorFlow.js + MediaPipe Face Landmarker integration.
 *
 * Free v1 scope: face only (glasses + hats), single face, snapshot capture.
 * Pro extends via filters declared in {@see AR_TRY_ON_Tryon_Hooks}.
 *
 * Try-On is **opt-in per product** via the existing `ar_placement` field
 * (`face-glasses` / `face-hat`). Existing products with `floor`/`wall` are
 * untouched — no extra scripts, no extra buttons, no behavior change.
 *
 * Settings live inside the existing `ar_try_on_settings` option (read via
 * {@see AR_TRY_ON_Helper::get_settings}) using a `tryon_` key prefix.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */
class AR_TRY_ON_Tryon {

	const SCRIPT_HANDLE = 'atlas-ar-tryon-bootstrap';
	const STYLE_HANDLE  = 'atlas-ar-tryon';

	/**
	 * Special wrapper-ID sentinel meaning "set sampled CSS variables on
	 * `document.documentElement` instead of on a specific wrapper". Used
	 * by `render_button_overlay` so the overlay button (which lives
	 * outside any `.atlas-ar-dyn-buttons` wrapper) still gets the
	 * theme-sampled colors via `var(--atlas-ar-btn-bg)` in `tryon.css`.
	 */
	const DOC_ROOT_SENTINEL = '__atlas_ar_dyn_doc_root';

	const CDN_WASM_BASE  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
	const CDN_FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

	/**
	 * Free-tier limit on the number of face-* (Try-On) products. Pro
	 * removes the cap entirely. Tunable via filter.
	 */
	const FREE_FACE_PRODUCT_LIMIT = 3;

	/** @var string */
	protected $version;

	/**
	 * Per-request render guard, keyed by post ID. Prevents the Try-On
	 * button from being emitted twice on the same page — for example when
	 * the WC hook path AND the `the_content` fallback both run on a WC
	 * product whose theme also calls `apply_filters('the_content', ...)`
	 * inside the gallery summary. First emit wins; later calls bail.
	 *
	 * @var array<int,bool>
	 */
	protected static $rendered_for_post = array();

	/**
	 * Wrapper element IDs that need the runtime theme-button sampler
	 * to run against them. Populated by {@see append_button_to_content}
	 * and emitted by {@see print_dynamic_button_sampler_script} at
	 * `wp_footer` — keeping the inline JS out of `the_content`'s filter
	 * chain so `wptexturize` / `wpautop` / smart-quote conversion can
	 * never mangle it.
	 *
	 * @var array<int,string>
	 */
	protected static $pending_button_wrappers = array();

	public function __construct( $version ) {
		$this->version = $version;
	}

	/**
	 * Mark a post as already-rendered for this request, returning true if
	 * it was rendered earlier (caller should bail) and false if this call
	 * is the first one (caller should proceed).
	 *
	 * Single source of truth across:
	 *  - {@see render_button_for_face_product} (WC numeric-position hook),
	 *  - {@see render_button_overlay}          (WC toggle-mode footer),
	 *  - {@see append_button_to_content}       (non-WC `the_content` filter),
	 *  - {@see \AR_TRY_ON\AR_TRY_ON_Helper::create_shortcode}
	 *    (`[atlas_ar]` shortcode reveal=true overlay path).
	 *
	 * Public so external callers (like the shortcode renderer in
	 * `AR_TRY_ON_Helper`) can mark the post as rendered and prevent
	 * downstream paths (e.g., `render_button_overlay` at `wp_footer`)
	 * from double-emitting the Try-On button on the same page.
	 */
	public function has_already_rendered( $post_id ) {
		$post_id = (int) $post_id;
		if ( $post_id <= 0 ) {
			return true; // nothing sane to render against
		}
		if ( ! empty( self::$rendered_for_post[ $post_id ] ) ) {
			return true;
		}
		self::$rendered_for_post[ $post_id ] = true;
		return false;
	}

	/**
	 * Bind WP hooks. Called once from the main bootstrap.
	 *
	 * IMPORTANT: We do NOT register a separate "Try It On" button. Try-On
	 * piggy-backs on the existing `atlas_ar_button` output via data
	 * attributes. Asset enqueue is gated to face-* products only.
	 */
	public function register() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ), 20 );

		// Cap enforcement — Free tier is limited to N face-* products.
		add_action( 'updated_post_meta', array( $this, 'enforce_free_cap_after_save' ), 10, 4 );
		add_action( 'added_post_meta',   array( $this, 'enforce_free_cap_after_save' ), 10, 4 );
		add_action( 'admin_notices',     array( $this, 'render_cap_notice' ) );

		// "Show Button In" controls where the Try-On button appears.
		// Numeric values 1-7 map to WC action hooks. Toggle-mode values
		// (`product_image` / `3d_viewer`) get a special path: the button
		// renders as an overlay on the featured image, right next to the
		// existing cube toggle (so cube + Try-On co-exist).
		$global   = AR_TRY_ON_Helper::get_settings();
		$position = isset( $global['ar_try_on_wc_hook_position'] ) ? $global['ar_try_on_wc_hook_position'] : 'product_image';

		if ( self::is_toggle_mode_position( $position ) ) {
			add_action( 'wp_footer', array( $this, 'render_button_overlay' ), 25 );
		} else {
			$hook = self::resolve_button_hook( $position );
			if ( $hook ) {
				add_action( $hook, array( $this, 'render_button_for_face_product' ), 25 );
			}
		}

		// Non-WC fallback: on a single post / supported CPT with a face-*
		// placement, the WC numeric hooks above never fire and the gallery
		// overlay JS has no `.woocommerce-product-gallery__image` to attach
		// to. Without this filter the button is invisible on the front-end
		// even though the merchant configured the product for face try-on.
		// Gated on WC-product so existing WC behavior is untouched.
		add_filter( 'the_content', array( $this, 'append_button_to_content' ), 25 );

		// The theme-button style sampler is emitted at `wp_footer` instead
		// of inside `the_content` to avoid wptexturize / wpautop mangling
		// inline JS (smart-quote conversion, autop wrapping, etc.). By the
		// time `wp_footer` fires the wrapper `<div>` is already in the DOM,
		// so the script can locate it by ID and apply the sampled styles.
		add_action( 'wp_footer', array( $this, 'print_dynamic_button_sampler_script' ), 100 );
	}

	public static function is_toggle_mode_position( $position ) {
		return $position === 'product_image' || $position === '3d_viewer';
	}

	/**
	 * Map a numeric `ar_try_on_wc_hook_position` value (1-7) to the WC
	 * action hook used for the AR button. Returns a default for unknown
	 * non-toggle values so the button still has a home.
	 */
	public static function resolve_button_hook( $position ) {
		$map = array(
			1 => 'woocommerce_before_single_product_summary',
			2 => 'woocommerce_after_single_product_summary',
			3 => 'woocommerce_before_single_product',
			4 => 'woocommerce_after_single_product',
			5 => 'woocommerce_after_add_to_cart_form',
			6 => 'woocommerce_before_add_to_cart_form',
			7 => 'woocommerce_product_thumbnails',
		);

		if ( isset( $map[ $position ] ) ) {
			return $map[ $position ];
		}

		return apply_filters( 'atlas_ar_tryon_default_button_hook', 'woocommerce_after_add_to_cart_form' );
	}

	/* ---------- Settings ---------- */

	public static function default_settings() {
		return array(
			'tryon_self_host'    => false,
			'tryon_snapshot'     => true,
			'tryon_button_label' => __( 'Try it on', 'ar-vr-3d-model-try-on' ),
			'tryon_consent_text' => __( 'Allow camera access to try this product on virtually. Video stays on your device.', 'ar-vr-3d-model-try-on' ),
		);
	}

	/**
	 * Read tryon_* keys from the shared `ar_try_on_settings` option, merged
	 * with sane defaults.
	 */
	public static function get_settings() {
		$saved = AR_TRY_ON_Helper::get_settings();
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::default_settings() );
	}

	public static function available_modes() {
		$modes = array( 'face-glasses', 'face-hat' );
		return apply_filters( 'atlas_ar_tryon_modes', $modes );
	}

	public static function model_urls() {
		$settings  = self::get_settings();
		$self_host = ! empty( $settings['tryon_self_host'] );

		$face_url = $self_host && file_exists( ATLAS_AR_PLUGIN_PATH . 'public/models/face_landmarker.task' )
			? ATLAS_AR_PLUGIN_URL . 'public/models/face_landmarker.task'
			: self::CDN_FACE_MODEL;

		$wasm_base = $self_host && is_dir( ATLAS_AR_PLUGIN_PATH . 'public/models/wasm' )
			? ATLAS_AR_PLUGIN_URL . 'public/models/wasm'
			: self::CDN_WASM_BASE;

		$models = array(
			'face'      => $face_url,
			'wasm_base' => $wasm_base,
		);

		return apply_filters( 'atlas_ar_tryon_models', $models );
	}

	/* ---------- Per-product helpers ---------- */

	public static function is_face_placement( $placement ) {
		return is_string( $placement ) && strpos( $placement, 'face-' ) === 0;
	}

	/**
	 * Return per-product `ar_try_on_product_settings`. Mirrors the existing
	 * Helper code path so old keys stay normalized.
	 */
	public static function get_product_settings( $post_id ) {
		$raw = (array) get_post_meta( (int) $post_id, 'ar_try_on_product_settings', true );
		if ( method_exists( 'AR_TRY_ON\\AR_TRY_ON_Helper', 'rename_old_keys_of_product_metadata' ) ) {
			$raw = AR_TRY_ON_Helper::rename_old_keys_of_product_metadata( $raw );
		}
		return $raw;
	}

	public static function get_product_placement( $post_id ) {
		$ps = self::get_product_settings( $post_id );
		return isset( $ps['ar_placement'] ) ? (string) $ps['ar_placement'] : 'floor';
	}

	public static function should_show_static_viewer( $post_id ) {
		$ps = self::get_product_settings( $post_id );
		return ! empty( $ps['show_static_viewer_for_tryon'] );
	}

	public static function get_product_glb_src( $post_id ) {
		$ps = self::get_product_settings( $post_id );
		return isset( $ps['src'] ) ? (string) $ps['src'] : '';
	}

	/* ---------- Free-tier product cap ---------- */

	public static function is_pro_active() {
		// Centralized check — handles both `-pro` and `-premium` folder
		// layouts and lazy-loads wp-admin/includes/plugin.php when called
		// from the front-end.
		return (bool) AR_TRY_ON_Helper::is_pro_active();
	}

	public static function free_face_product_limit() {
		return (int) apply_filters( 'atlas_ar_tryon_free_product_limit', self::FREE_FACE_PRODUCT_LIMIT );
	}

	/**
	 * Count published products whose `ar_placement` starts with `face-`.
	 * Excludes a specific post id so the metabox save-time check can
	 * report "post-save count if I save this one".
	 */
	public static function count_face_products( $exclude_id = 0 ) {
		$cache_key = 'atlas_ar_tryon_face_count_' . (int) $exclude_id;
		$cached    = wp_cache_get( $cache_key, 'atlas_ar' );
		if ( false !== $cached ) {
			return (int) $cached;
		}

		global $wpdb;
		$exclude_id = (int) $exclude_id;
		$sql = "
			SELECT COUNT(DISTINCT p.ID)
			FROM {$wpdb->posts} p
			INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
			WHERE p.post_type = 'product'
			AND p.post_status IN ('publish','draft','pending','future','private')
			AND pm.meta_key = 'ar_try_on_product_settings'
			AND pm.meta_value LIKE %s
		";
		$params = array( '%s:12:"ar_placement";s:%face-%' );

		// LIKE pattern needs to match serialized array containing
		// `s:12:"ar_placement";s:N:"face-...";`. We use a coarse LIKE
		// against the substring `"ar_placement";s:` followed by `"face-`.
		$pattern = '%"ar_placement";s:%"face-%';
		$prepared = $wpdb->prepare( $sql, $pattern );

		if ( $exclude_id > 0 ) {
			$prepared = preg_replace(
				'/WHERE/',
				"WHERE p.ID != " . $exclude_id . " AND",
				$prepared,
				1
			);
		}

		$count = (int) $wpdb->get_var( $prepared );
		wp_cache_set( $cache_key, $count, 'atlas_ar', 30 );
		return $count;
	}

	/**
	 * Returns true when adding/keeping a face-* placement on `$post_id`
	 * would exceed the Free-tier product cap. Pro is always allowed.
	 */
	public static function would_exceed_free_cap( $post_id ) {
		if ( self::is_pro_active() ) {
			return false;
		}
		$current = self::count_face_products( $post_id );
		return $current >= self::free_face_product_limit();
	}

	/**
	 * Hook handler for `updated_post_meta` / `added_post_meta`.
	 *
	 * When a product is saved with `ar_placement = face-*` and the Free
	 * cap is already at limit (excluding this product), silently downgrade
	 * the placement to `floor` and stash a notice for the admin.
	 *
	 * Pro is always allowed past the cap. The recursion guard prevents
	 * the rewrite from re-triggering this handler.
	 */
	public function enforce_free_cap_after_save( $meta_id, $post_id, $meta_key, $meta_value ) {
		if ( $meta_key !== 'ar_try_on_product_settings' ) {
			return;
		}
		if ( self::is_pro_active() ) {
			return;
		}
		static $reentry = false;
		if ( $reentry ) {
			return;
		}

		$ps = is_array( $meta_value ) ? $meta_value : maybe_unserialize( $meta_value );
		if ( ! is_array( $ps ) || empty( $ps['ar_placement'] ) ) {
			return;
		}
		if ( ! self::is_face_placement( $ps['ar_placement'] ) ) {
			return;
		}

		$limit   = self::free_face_product_limit();
		$current = self::count_face_products( $post_id );
		if ( $current < $limit ) {
			return;
		}

		// Downgrade placement to floor.
		$ps['ar_placement'] = 'floor';
		$reentry = true;
		update_post_meta( $post_id, 'ar_try_on_product_settings', $ps );
		$reentry = false;

		set_transient(
			'atlas_ar_tryon_cap_notice_' . get_current_user_id(),
			array(
				'product_id' => (int) $post_id,
				'limit'      => $limit,
				'time'       => time(),
			),
			60
		);
	}

	/**
	 * Surface the cap-hit notice in admin when the merchant lands on the
	 * next page after a save that got downgraded.
	 */
	public function render_cap_notice() {
		$key  = 'atlas_ar_tryon_cap_notice_' . get_current_user_id();
		$data = get_transient( $key );
		if ( ! $data || empty( $data['product_id'] ) ) {
			return;
		}
		delete_transient( $key );
		$pid   = (int) $data['product_id'];
		$limit = (int) $data['limit'];
		$title = get_the_title( $pid );
		?>
		<div class="notice notice-warning is-dismissible">
			<p>
				<strong>AtlasAR Try-On limit reached.</strong>
				<?php
				printf(
					/* translators: %1$s product title, %2$d cap */
					esc_html__( 'The Free version supports up to %2$d face Try-On products. "%1$s" was saved with the standard Floor placement instead. Upgrade to Pro for unlimited Try-On products.', 'ar-vr-3d-model-try-on' ),
					esc_html( $title ),
					$limit
				);
				?>
			</p>
		</div>
		<?php
	}

	/**
	 * Returns the post ID we should treat as "the current product" on a
	 * single product page. Returns 0 for non-product contexts.
	 */
	public static function current_product_id() {
		if ( function_exists( 'is_product' ) && is_product() ) {
			$id = (int) get_queried_object_id();
			if ( $id ) {
				return $id;
			}
		}
		global $product, $post;
		if ( $product && is_object( $product ) && method_exists( $product, 'get_id' ) ) {
			return (int) $product->get_id();
		}
		if ( $post && isset( $post->ID ) ) {
			return (int) $post->ID;
		}
		return 0;
	}

	/**
	 * True when the current request should ship the try-on bootstrap. We
	 * load only on a product page whose `ar_placement` is `face-*`. For
	 * non-product pages the bootstrap stays out of the wire entirely so
	 * existing flows are not affected.
	 */
	public static function should_enqueue_for_current_request() {
		$post_id = self::current_product_id();
		if ( ! $post_id ) {
			return false;
		}
		$placement = self::get_product_placement( $post_id );
		return self::is_face_placement( $placement );
	}

	/* ---------- Front-end button (face-* only) ---------- */

	/**
	 * Render the Try-On click target for face-* products.
	 *
	 * Uses the same `.ar_vr_3d_model_try_on` class as the existing AR
	 * button so all CSS / accessibility / theme styling continues to apply.
	 * The data attributes tell tryon-bootstrap.js to handle the click
	 * (instead of the AtlasAR static-AR flow).
	 *
	 * No-op when current request is not a face-* product.
	 */
	public function render_button_for_face_product() {
		if ( ! self::should_enqueue_for_current_request() ) {
			return;
		}
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		$post_id = self::current_product_id();
		if ( ! $post_id ) {
			return;
		}
		if ( ! AR_TRY_ON_Helper::has_3d_model( $post_id ) ) {
			return;
		}
		// Per-request guard — first emitter wins. Subsequent calls (e.g.,
		// from `the_content` after the WC hook has already fired) bail.
		if ( $this->has_already_rendered( $post_id ) ) {
			return;
		}

		$placement = self::get_product_placement( $post_id );
		$placement = apply_filters( 'atlas_ar_tryon_woocommerce_mode_for_product', $placement, $post_id );
		$glb_src   = self::get_product_glb_src( $post_id );
		$settings  = self::get_settings();

		printf(
			'<button type="button" product-id="%1$d" class="ar_vr_3d_model_try_on button" data-mode="%2$s" data-glb-src="%3$s">%4$s</button>',
			(int) $post_id,
			esc_attr( $placement ),
			esc_url( $glb_src ),
			esc_html( $settings['tryon_button_label'] )
		);
	}

	/**
	 * Toggle-mode rendering: inject a Try-On button as an overlay on the
	 * featured product image, right next to the existing cube toggle.
	 *
	 * Runs at `wp_footer` so it can place markup that the front-end JS
	 * grafts into the gallery container (mirroring the pattern used by
	 * {@see \AR_TRY_ON\AR_TRY_ON::add_image_3d_toggle_to_gallery}).
	 */
	public function render_button_overlay() {
		if ( ! self::should_enqueue_for_current_request() ) {
			return;
		}
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		$post_id = self::current_product_id();
		if ( ! $post_id || ! AR_TRY_ON_Helper::has_3d_model( $post_id ) ) {
			return;
		}
		// Per-request guard — the overlay path is only used on WC product
		// pages (it targets `.woocommerce-product-gallery__image`), but
		// guard anyway so the non-WC `the_content` fallback never collides.
		if ( $this->has_already_rendered( $post_id ) ) {
			return;
		}

		$placement = self::get_product_placement( $post_id );
		$placement = apply_filters( 'atlas_ar_tryon_woocommerce_mode_for_product', $placement, $post_id );
		$glb_src   = self::get_product_glb_src( $post_id );
		$settings  = self::get_settings();
		$label     = $settings['tryon_button_label'];

		// Register a sentinel so the theme-button sampler runs even
		// though no `.atlas-ar-dyn-buttons` wrapper exists on this
		// overlay-only page. The sampler reads the sentinel as "set
		// vars on document.documentElement so the overlay button
		// inherits them via var() in tryon.css".
		if ( ! in_array( self::DOC_ROOT_SENTINEL, self::$pending_button_wrappers, true ) ) {
			self::$pending_button_wrappers[] = self::DOC_ROOT_SENTINEL;
		}

		?>
		<template id="atlas_ar-tryon-overlay-source">
			<button type="button" product-id="<?php echo (int) $post_id; ?>" class="ar_vr_3d_model_try_on art-tryon-image-overlay" data-mode="<?php echo esc_attr( $placement ); ?>" data-glb-src="<?php echo esc_url( $glb_src ); ?>"><?php echo esc_html( $label ); ?></button>
		</template>
		<script>
			(function () {
				'use strict';
				function place() {
					var img = document.querySelector('.woocommerce-product-gallery__image');
					if (!img || img.dataset.atlasArTryonOverlayPlaced === '1') return;
					var tpl = document.getElementById('atlas_ar-tryon-overlay-source');
					if (!tpl || !tpl.content) return;
					if (getComputedStyle(img).position === 'static') {
						img.style.position = 'relative';
					}
					// Reuse the cube's existing container if it's already there
					// (cube toggle script adds .atlas-ar-toggle-container) — that
					// way the Try-On button sits visually adjacent to the cube.
					var container = img.querySelector('.atlas-ar-toggle-container');
					if (!container) {
						container = document.createElement('div');
						container.className = 'atlas-ar-toggle-container';
						img.appendChild(container);
					}
					var btn = tpl.content.firstElementChild.cloneNode(true);
					container.appendChild(btn);
					img.dataset.atlasArTryonOverlayPlaced = '1';
				}
				if (document.readyState === 'loading') {
					document.addEventListener('DOMContentLoaded', place);
				} else {
					place();
				}
				// Cube toggle JS may run later (it also targets the same gallery
				// element). Re-run after a short delay so we land beside it.
				setTimeout(place, 250);
				setTimeout(place, 1000);
			})();
		</script>
		<?php
	}

	/**
	 * `the_content` filter fallback — append the Try-On button to non-WC
	 * posts that have a face-* placement.
	 *
	 * The WC numeric-position hooks ({@see resolve_button_hook}) and the
	 * toggle-mode overlay ({@see render_button_overlay}) both assume a
	 * WooCommerce product context. On a regular post / supported CPT
	 * neither path renders, so without this filter the merchant ends up
	 * with no Try-On button on the front-end even though the product is
	 * configured for face try-on.
	 *
	 * Safeguards (see register() comment):
	 *  1. WC-product gate — bail on `is_product()` so existing WC paths
	 *     remain the single renderer for products.
	 *  2. Singular-only — the filter runs on archive excerpts too; skip
	 *     those.
	 *  3. Per-request render guard — never emit a second button for the
	 *     same post on the same request.
	 *  4. Shortcode-presence — if the content already contains an
	 *     `[atlas_ar]` shortcode the merchant placed manually, don't add
	 *     a sibling button.
	 *  5. Existing markup check — if the content already includes a
	 *     `.ar_vr_3d_model_try_on` button from any other source (e.g.,
	 *     a theme that emits one), don't duplicate.
	 *  6. All the same gates the other render paths use
	 *     ({@see should_enqueue_for_current_request},
	 *     {@see is_ar_supported_post_type},
	 *     {@see has_3d_model}, {@see is_face_placement}).
	 *
	 * Must return `$content` — this is a filter, never an echo path.
	 */
	public function append_button_to_content( $content ) {
		// Filter must always return a string; default to unchanged content.
		if ( ! is_string( $content ) ) {
			return $content;
		}

		// Safeguard 1 — leave WC products to the WC hook / overlay path.
		if ( function_exists( 'is_product' ) && is_product() ) {
			return $content;
		}

		// Safeguard 2 — only on a singular view (skips archives / search /
		// loops / blocks rendered out-of-context).
		if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		// Asset-gate parity with the other render paths.
		if ( ! self::should_enqueue_for_current_request() ) {
			return $content;
		}
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return $content;
		}

		$post_id = self::current_product_id();
		if ( ! $post_id ) {
			return $content;
		}
		if ( ! AR_TRY_ON_Helper::has_3d_model( $post_id ) ) {
			return $content;
		}

		$placement = self::get_product_placement( $post_id );
		if ( ! self::is_face_placement( $placement ) ) {
			return $content;
		}

		// Safeguard 4 — the merchant has placed `[atlas_ar]` in the body,
		// which already injects the viewer + button. Don't add another.
		if ( has_shortcode( $content, 'atlas_ar' ) ) {
			return $content;
		}

		// Safeguard 5 — content already contains a Try-On button from any
		// other source.
		if ( false !== strpos( $content, 'ar_vr_3d_model_try_on' ) ) {
			return $content;
		}

		// Safeguard 3 — per-request guard. Set *after* the cheaper checks
		// so we don't burn the slot on a request that wouldn't have
		// rendered anyway.
		if ( $this->has_already_rendered( $post_id ) ) {
			return $content;
		}

		$placement = apply_filters( 'atlas_ar_tryon_woocommerce_mode_for_product', $placement, $post_id );

		$show_view_in_ar = self::should_show_static_viewer( $post_id );
		$buttons_block   = $this->build_dynamic_buttons_block( $post_id, $placement, $show_view_in_ar );

		return $content . $buttons_block;
	}

	/**
	 * Build the dynamic-buttons HTML block (Try-On + optional View-in-AR
	 * side-by-side, theme-button-sampled) and register the wrapper for
	 * the wp_footer sampler.
	 *
	 * Shared by:
	 *  - {@see append_button_to_content} (non-WC `the_content` filter)
	 *  - {@see \AR_TRY_ON\AR_TRY_ON_Helper::create_shortcode} (shortcode
	 *    + block, reveal=false branch)
	 *
	 * Returns the HTML string. The caller decides where to insert it.
	 *
	 * @param int     $post_id          Product / post ID.
	 * @param string  $placement        Face placement value (face-glasses etc.).
	 * @param bool    $show_view_in_ar  Render the View-in-AR outline button
	 *                                  alongside Try-On (true when the
	 *                                  merchant opted into the static viewer).
	 * @param array   $args             Optional overrides:
	 *                                  - glb_src (string) — defaults to
	 *                                    `get_product_glb_src($post_id)`.
	 *                                  - wrapper_id_suffix (string) —
	 *                                    appended to the wrapper DOM id so
	 *                                    multiple buttons-blocks on the
	 *                                    same page never collide.
	 * @return string Buttons block HTML (style + wrapper + buttons).
	 */
	public function build_dynamic_buttons_block( $post_id, $placement, $show_view_in_ar = false, $args = array() ) {
		$post_id  = (int) $post_id;
		$glb_src  = isset( $args['glb_src'] ) ? (string) $args['glb_src'] : self::get_product_glb_src( $post_id );
		$suffix   = isset( $args['wrapper_id_suffix'] ) ? (string) $args['wrapper_id_suffix'] : '';
		$settings = self::get_settings();

		// New optional args (backwards-compatible — defaults preserve
		// the existing behavior of every prior caller):
		//   - `show_tryon` (bool, default true) — render the Try-On
		//     button. Non-face placements pass false.
		//   - `view_in_ar_style` (string, default "outline") — "outline"
		//     (secondary) or "primary" (filled). Non-face placements
		//     where View-in-AR is the sole CTA pass "primary".
		$show_tryon       = ! isset( $args['show_tryon'] ) || (bool) $args['show_tryon'];
		$view_in_ar_style = isset( $args['view_in_ar_style'] ) ? (string) $args['view_in_ar_style'] : 'outline';

		// Inline SVG icons — currentColor so they pick up the button text
		// color regardless of theme. ~200 bytes each, no extra request.
		$icon_3d  = '<svg class="atlas-ar-btn-icon" aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M2 7l10 5 10-5"/><path d="M12 22V12"/></svg>';
		$icon_try = '<svg class="atlas-ar-btn-icon" aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0113 0"/><rect x="3" y="4" width="18" height="16" rx="2" ry="2"/></svg>';

		// The `ar_vr_3d_model_try_on` class is preserved so the existing
		// JS click handlers in `tryon-bootstrap.js` and `AtlasAR.dist.js`
		// keep recognising clicks.
		$btn_base      = 'ar_vr_3d_model_try_on button wp-block-button__link wp-element-button atlas-ar-dyn-btn';
		$btn_primary   = $btn_base . ' atlas-ar-dyn-btn--primary';
		$btn_secondary = $btn_base . ' atlas-ar-dyn-btn--secondary';

		// View in AR — outline (secondary) by default; primary (filled)
		// when it's the sole CTA on the page (non-face products).
		//
		// AR-61: label resolution chain (most specific wins):
		//   1. caller arg `args['button_label']` (shortcode attribute)
		//   2. per-product metabox `view_in_ar_label`
		//   3. global setting `ar_try_on_view_in_ar_label`
		//   4. translated default ("View in AR")
		$view_in_ar_button = '';
		if ( $show_view_in_ar ) {
			$view_in_ar_label = '';
			if ( isset( $args['button_label'] ) && $args['button_label'] !== '' ) {
				$view_in_ar_label = (string) $args['button_label'];
			} else {
				$product_settings = (array) get_post_meta( $post_id, 'ar_try_on_product_settings', true );
				if ( ! empty( $product_settings['view_in_ar_label'] ) ) {
					$view_in_ar_label = (string) $product_settings['view_in_ar_label'];
				}
			}
			if ( $view_in_ar_label === '' && ! empty( $settings['ar_try_on_view_in_ar_label'] ) ) {
				$view_in_ar_label = (string) $settings['ar_try_on_view_in_ar_label'];
			}
			if ( $view_in_ar_label === '' ) {
				$view_in_ar_label = __( 'View in AR', 'ar-vr-3d-model-try-on' );
			}

			$is_primary       = $view_in_ar_style === 'primary';
			$view_btn_class   = $is_primary ? $btn_primary : $btn_secondary;
			$view_block_class = $is_primary ? 'wp-block-button' : 'wp-block-button is-style-outline';
			$view_in_ar_button = sprintf(
				'<div class="%1$s"><button product-id="%2$d" class="%3$s" aria-label="%4$s">%5$s<span class="atlas-ar-btn-label">%6$s</span></button></div>',
				esc_attr( $view_block_class ),
				$post_id,
				esc_attr( $view_btn_class ),
				esc_attr__( 'View in augmented reality or 3D', 'ar-vr-3d-model-try-on' ),
				$icon_3d,
				esc_html( $view_in_ar_label )
			);
		}

		// Try On (primary / filled). Suppressed for non-face placements.
		$tryon_button = '';
		if ( $show_tryon ) {
			$tryon_button = sprintf(
				'<div class="wp-block-button"><button type="button" product-id="%1$d" class="%2$s" data-mode="%3$s" data-glb-src="%4$s" aria-label="%5$s">%6$s<span class="atlas-ar-btn-label">%7$s</span></button></div>',
				$post_id,
				esc_attr( $btn_primary ),
				esc_attr( $placement ),
				esc_url( $glb_src ),
				esc_attr__( 'Try this on with your webcam', 'ar-vr-3d-model-try-on' ),
				$icon_try,
				esc_html( $settings['tryon_button_label'] )
			);
		}

		$wrapper_id = 'atlas-ar-dyn-buttons-' . $post_id . ( $suffix !== '' ? '-' . sanitize_key( $suffix ) : '' );

		if ( ! in_array( $wrapper_id, self::$pending_button_wrappers, true ) ) {
			self::$pending_button_wrappers[] = $wrapper_id;
		}

		$style = $this->build_button_style_block( $wrapper_id );

		// Wrap in the `.atlas-ar-shortcode-outer` so the buttons block
		// aligns with the post content column (constrained layout) the
		// same way the revealed model viewer does — instead of getting
		// auto-centered relative to the full-width container.
		return $style
			. '<div class="atlas-ar-shortcode-outer">'
			. '<div id="' . esc_attr( $wrapper_id ) . '" class="wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex atlas-ar-dyn-buttons">'
			. $view_in_ar_button
			. $tryon_button
			. '</div>'
			. '</div>';
	}

	/**
	 * Register the sentinel so the wp_footer sampler runs and sets
	 * theme-button CSS variables on `document.documentElement`. Used by
	 * the shortcode in reveal=true mode (so the Try-On button overlaid
	 * on the model viewer inherits theme colors) and by the WC overlay
	 * path.
	 */
	public function register_doc_root_sampler() {
		if ( ! in_array( self::DOC_ROOT_SENTINEL, self::$pending_button_wrappers, true ) ) {
			self::$pending_button_wrappers[] = self::DOC_ROOT_SENTINEL;
		}
	}

	/**
	 * Build only the inline `<style>` block scoped to the wrapper.
	 * The companion JS sampler lives at {@see print_dynamic_button_sampler_script}
	 * and runs at `wp_footer` to dodge `the_content` filter mangling.
	 *
	 * The CSS sets sensible defaults using block-theme CSS variables
	 * (`--wp--preset--color--*`) so block themes look reasonable even
	 * before the JS runs. Once the sampler does run it overrides via
	 * inline custom properties on the wrapper element.
	 */
	protected function build_button_style_block( $wrapper_id ) {
		// CSS: defaults come from theme CSS variables when available, then
		// hardcoded final fallback. Anything the JS sampler can derive
		// overrides these by setting the custom properties inline on the
		// wrapper element.
		$style = '<style id="atlas-ar-dyn-buttons-style-' . esc_attr( $wrapper_id ) . '">'
			. '#' . esc_attr( $wrapper_id ) . '{'
				. 'margin-block-start:var(--wp--style--block-gap,1.5rem);'
				. 'gap:0.75rem;'
				. 'border:none !important;'
				. 'padding:0 !important;'
				. 'background:transparent !important;'
				. 'box-shadow:none !important;'
				. '--atlas-ar-btn-bg:var(--wp--preset--color--primary,var(--wp-admin-theme-color,#111));'
				. '--atlas-ar-btn-bg-image:none;'
				. '--atlas-ar-btn-color:var(--wp--preset--color--background,#fff);'
				. '--atlas-ar-btn-border-width:0;'
				. '--atlas-ar-btn-border-style:solid;'
				. '--atlas-ar-btn-border-color:transparent;'
				. '--atlas-ar-btn-radius:9999px;'
				. '--atlas-ar-btn-padding:0.7em 1.4em;'
				. '--atlas-ar-btn-font-family:inherit;'
				. '--atlas-ar-btn-font-size:1rem;'
				. '--atlas-ar-btn-font-weight:600;'
				. '--atlas-ar-btn-line-height:1.2;'
				. '--atlas-ar-btn-letter-spacing:normal;'
				. '--atlas-ar-btn-text-transform:none;'
				. '--atlas-ar-btn-text-decoration:none;'
				. '--atlas-ar-btn-shadow:none;'
				. '--atlas-ar-btn-transition:filter .15s ease, background-color .15s ease, color .15s ease;'
				. '--atlas-ar-btn-cursor:pointer;'
				. '--atlas-ar-btn-min-height:auto;'
			. '}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-dyn-btn{'
				. 'display:inline-flex;align-items:center;gap:0.5em;'
				. 'background-color:var(--atlas-ar-btn-bg);'
				. 'background-image:var(--atlas-ar-btn-bg-image);'
				. 'color:var(--atlas-ar-btn-color);'
				. 'border:var(--atlas-ar-btn-border-width) var(--atlas-ar-btn-border-style) var(--atlas-ar-btn-border-color);'
				. 'border-radius:var(--atlas-ar-btn-radius);'
				. 'padding:var(--atlas-ar-btn-padding);'
				. 'font-family:var(--atlas-ar-btn-font-family);'
				. 'font-size:var(--atlas-ar-btn-font-size);'
				. 'font-weight:var(--atlas-ar-btn-font-weight);'
				. 'line-height:var(--atlas-ar-btn-line-height);'
				. 'letter-spacing:var(--atlas-ar-btn-letter-spacing);'
				. 'text-transform:var(--atlas-ar-btn-text-transform);'
				. 'text-decoration:var(--atlas-ar-btn-text-decoration);'
				. 'box-shadow:var(--atlas-ar-btn-shadow);'
				. 'transition:var(--atlas-ar-btn-transition);'
				. 'cursor:var(--atlas-ar-btn-cursor);'
				. 'min-height:var(--atlas-ar-btn-min-height);'
			. '}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-dyn-btn--primary:hover{filter:brightness(0.92);}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-dyn-btn--secondary{'
				. 'background-color:transparent;'
				. 'background-image:none;'
				. 'color:var(--atlas-ar-btn-bg);'
				. 'border-width:max(2px,var(--atlas-ar-btn-border-width));'
				. 'border-style:solid;'
				. 'border-color:var(--atlas-ar-btn-bg);'
			. '}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-dyn-btn--secondary:hover{'
				. 'background-color:var(--atlas-ar-btn-bg);'
				. 'color:var(--atlas-ar-btn-color);'
			. '}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-btn-icon{flex:0 0 auto;}'
			. '#' . esc_attr( $wrapper_id ) . ' .atlas-ar-btn-label{display:inline-block;}'
			. '</style>';

		return $style;
	}

	/**
	 * Emit the theme-button sampler JS at `wp_footer`. Runs against
	 * every wrapper ID registered by {@see append_button_to_content}.
	 *
	 * Why this is at wp_footer and not inline in the_content output:
	 * the_content runs `wptexturize` (smart-quote conversion), `wpautop`
	 * (paragraph wrapping), and other filters that can mangle inline JS
	 * — string quotes become curly quotes, newlines become `<br>`, etc.
	 * At wp_footer the script bypasses all of that and is emitted as-is.
	 *
	 * The wrapper `<div>` was inserted earlier (inside the_content) so
	 * by the time wp_footer fires it's safely in the DOM ready to be
	 * located by ID.
	 *
	 * Sampling strategy:
	 *   1. PROBE — inject a hidden `<a>` carrying the canonical theme
	 *      button classes (block + WC variants), read computed style,
	 *      remove. Captures the theme's *intended* primary button even
	 *      when no actual button is on the current page (which is why
	 *      the earlier live-element scan was picking WP-blue from a
	 *      hidden search-submit on the /glass/ post).
	 *   2. LIVE FALLBACK — if no probe yields a styled bg (old classic
	 *      theme with no WP 6+ hooks), fall back to scanning visible
	 *      page buttons in priority order.
	 */
	public function print_dynamic_button_sampler_script() {
		if ( empty( self::$pending_button_wrappers ) ) {
			return;
		}

		$ids_json      = wp_json_encode( array_values( self::$pending_button_wrappers ) );
		$sentinel_json = wp_json_encode( self::DOC_ROOT_SENTINEL );
		?>
<script id="atlas-ar-dyn-buttons-sampler">
(function(){
	"use strict";
	var ids = <?php echo $ids_json; ?>;
	// When this sentinel ID is in the list, the sampler treats
	// document.documentElement as the wrapper — so CSS vars
	// cascade to overlay buttons that live outside any
	// `.atlas-ar-dyn-buttons` element (see `tryon.css` for the
	// `.art-tryon-image-overlay` rule that uses these vars).
	var DOC_ROOT = <?php echo $sentinel_json; ?>;
	function isTransparent(c){return !c||c==="transparent"||/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(c);}
	function makeProbe(classes){
		var p=document.createElement("a");
		p.className=classes;
		p.setAttribute("aria-hidden","true");
		p.setAttribute("tabindex","-1");
		p.style.cssText="position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;";
		p.textContent="probe";
		document.body.appendChild(p);
		return p;
	}
	function findLive(w){
		var selectors=[
			".single_add_to_cart_button",
			".woocommerce a.button.alt",
			".woocommerce-Button",
			".btn-primary",
			"a.button",
			"button.button",
			".btn"
		];
		// When `w` is `document.documentElement` (the sentinel target),
		// `w.contains(n)` is true for every element on the page and we'd
		// reject all candidates. Only exclude descendants of `w` when
		// `w` is a real wrapper element scoped inside the page.
		var skipContains = w === document.documentElement || w === document.body;
		for(var i=0;i<selectors.length;i++){
			var nodes=document.querySelectorAll(selectors[i]);
			for(var j=0;j<nodes.length;j++){
				var n=nodes[j];
				if(!skipContains && w.contains(n))continue;
				if(n.offsetParent===null&&n.getClientRects().length===0)continue;
				return n;
			}
		}
		return null;
	}
	function hasStyledBg(cs){
		return !isTransparent(cs.backgroundColor)||(cs.backgroundImage&&cs.backgroundImage!=="none");
	}
	function readThemePresetColor(){
		// theme.json colors exposed by modern themes (Twenty Twenty-X,
		// Hello Elementor, most block themes). Order: accent (call-to-
		// action), then primary, then contrast (deepest brand color).
		var root=window.getComputedStyle(document.documentElement);
		var keys=["--wp--preset--color--accent","--wp--preset--color--primary","--wp--preset--color--contrast"];
		for(var i=0;i<keys.length;i++){
			var v=root.getPropertyValue(keys[i]).trim();
			if(v)return v;
		}
		return null;
	}
	function sampleLinkColor(){
		// Last-ditch fallback for framework themes like Hello Elementor
		// that ship no button styling AND no theme.json color presets.
		// The default link color is almost always the theme's accent.
		var p=document.createElement("a");
		p.href="#";
		p.style.cssText="position:absolute;left:-9999px;top:-9999px;visibility:hidden;";
		p.textContent="x";
		document.body.appendChild(p);
		var c=window.getComputedStyle(p).color;
		p.remove();
		return(c&&!isTransparent(c))?c:null;
	}
	function apply(w){
		if(!w)return;
		var sample=null;
		var probes=[];
		var paletteBg=null;
		// (1) Live theme button on the page — strongest signal.
		var live=findLive(w);
		if(live&&hasStyledBg(window.getComputedStyle(live))){
			sample=live;
		}
		// (2) Probe with classic button conventions. NOTE: we
		//     deliberately exclude `.wp-element-button` from this round —
		//     it's WordPress core's universal fallback (dark gray
		//     #32373c) on themes that don't otherwise style it, which
		//     would mask better signals from theme.json / link color.
		//     Same reason we skip the combined Gutenberg + WC probe —
		//     it carries `.wp-element-button` and would hit that
		//     fallback when WC styling isn't loaded (non-WC pages).
		if(!sample){
			probes=[
				makeProbe("button add_to_cart_button product_type_simple"),
				makeProbe("button"),
				makeProbe("btn btn-primary")
			];
			for(var pi=0;pi<probes.length;pi++){
				if(hasStyledBg(window.getComputedStyle(probes[pi]))){
					sample=probes[pi];break;
				}
			}
		}
		// (3) Theme.json color presets — block themes / Hello Elementor.
		if(!sample){
			paletteBg=readThemePresetColor();
		}
		// (4) Link color — Hello Elementor and other framework themes.
		if(!sample&&!paletteBg){
			paletteBg=sampleLinkColor();
		}
		// (5) Last-resort: `.wp-element-button` probe (accepts WP default).
		if(!sample&&!paletteBg){
			var elProbe=makeProbe("wp-block-button__link wp-element-button button");
			probes.push(elProbe);
			if(hasStyledBg(window.getComputedStyle(elProbe))){
				sample=elProbe;
			}
		}
		// Apply palette-only result: just bg + white text. No font /
		// padding / border sampling because we don't have a real button
		// to copy from — use sensible defaults instead.
		if(!sample&&paletteBg){
			w.style.setProperty("--atlas-ar-btn-bg",paletteBg);
			w.style.setProperty("--atlas-ar-btn-color","#fff");
			probes.forEach(function(p){if(p.parentNode)p.parentNode.removeChild(p);});
			return;
		}
		if(!sample){probes.forEach(function(p){if(p.parentNode)p.parentNode.removeChild(p);});return;}
		var cs=window.getComputedStyle(sample);
		function set(name,value){if(value)w.style.setProperty(name,value);}
		set("--atlas-ar-btn-bg",cs.backgroundColor);
		set("--atlas-ar-btn-bg-image",cs.backgroundImage&&cs.backgroundImage!=="none"?cs.backgroundImage:null);
		set("--atlas-ar-btn-color",cs.color);
		set("--atlas-ar-btn-border-width",cs.borderTopWidth);
		set("--atlas-ar-btn-border-style",cs.borderTopStyle);
		set("--atlas-ar-btn-border-color",cs.borderTopColor);
		set("--atlas-ar-btn-radius",cs.borderRadius);
		set("--atlas-ar-btn-padding",cs.paddingTop+" "+cs.paddingRight+" "+cs.paddingBottom+" "+cs.paddingLeft);
		set("--atlas-ar-btn-font-family",cs.fontFamily);
		set("--atlas-ar-btn-font-size",cs.fontSize);
		set("--atlas-ar-btn-font-weight",cs.fontWeight);
		set("--atlas-ar-btn-line-height",cs.lineHeight);
		set("--atlas-ar-btn-letter-spacing",cs.letterSpacing);
		set("--atlas-ar-btn-text-transform",cs.textTransform);
		set("--atlas-ar-btn-text-decoration",cs.textDecorationLine||cs.textDecoration);
		set("--atlas-ar-btn-shadow",cs.boxShadow);
		set("--atlas-ar-btn-transition",cs.transition);
		set("--atlas-ar-btn-cursor",cs.cursor);
		set("--atlas-ar-btn-min-height",cs.minHeight);
		probes.forEach(function(p){if(p.parentNode)p.parentNode.removeChild(p);});
	}
	function run(){
		for(var i=0;i<ids.length;i++){
			var target = ids[i] === DOC_ROOT ? document.documentElement : document.getElementById(ids[i]);
			apply(target);
		}
	}
	if(document.readyState==="loading"){
		document.addEventListener("DOMContentLoaded",run);
	}else{
		run();
	}
})();
</script>
		<?php
	}

	/* ---------- Asset enqueue (conditional) ---------- */

	public function enqueue_assets() {
		if ( ! self::should_enqueue_for_current_request() ) {
			return;
		}
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		// Use filemtime as cache-buster — every rebuild emits a fresh
		// bootstrap whose webpack runtime references new chunk IDs. If
		// browsers held on to the old bootstrap (because plugin VERSION
		// didn't change) they hit ChunkLoadError when the chunk file
		// content shifts under them. filemtime guarantees a unique
		// version per build so the chunk ↔ runtime pair stays coherent.
		$css_path = ATLAS_AR_PLUGIN_PATH . 'public/css/tryon.css';
		$js_path  = ATLAS_AR_PLUGIN_PATH . 'public/js/build/tryon-bootstrap.dist.js';
		$css_ver  = file_exists( $css_path ) ? (string) filemtime( $css_path ) : $this->version;
		$js_ver   = file_exists( $js_path )  ? (string) filemtime( $js_path )  : $this->version;

		wp_enqueue_style(
			self::STYLE_HANDLE,
			ATLAS_AR_PLUGIN_URL . 'public/css/tryon.css',
			array(),
			$css_ver,
			'all'
		);

		wp_enqueue_script(
			self::SCRIPT_HANDLE,
			ATLAS_AR_PLUGIN_URL . 'public/js/build/tryon-bootstrap.dist.js',
			array(),
			$js_ver,
			true
		);

		$settings = self::get_settings();

		$pro_active = self::is_pro_active();

		// Worker options forwarded into FaceLandmarker.createFromOptions.
		// Pro flips on facial transformation matrices (used by the
		// three.js depth-occluded overlay) via the filter.
		$worker_options = apply_filters(
			'atlas_ar_tryon_worker_options',
			array(
				'numFaces'                            => 1,
				'outputFaceBlendshapes'               => false,
				'outputFacialTransformationMatrixes'  => false,
			),
			$pro_active
		);

		// Cached GLB anatomy from previous browser computation, if any.
		// Indexed by current queried product id so the JS module can use
		// it directly without re-analyzing the GLB. Anatomy is the per-
		// model geometric facts (crown opening, brim depth, lens center)
		// used to place accessories anatomically correctly without
		// merchant calibration. See plan/glb-anatomy-autofit-plan.md.
		$queried_id      = (int) get_queried_object_id();
		$cached_anatomy  = null;
		if ( $queried_id > 0 ) {
			$ps = get_post_meta( $queried_id, 'ar_try_on_product_settings', true );
			if ( is_array( $ps ) && isset( $ps['glb_anatomy'] ) && is_array( $ps['glb_anatomy'] ) ) {
				$cached_anatomy = $ps['glb_anatomy'];
			}
		}

		// `glb-anatomy.js` is dynamic-imported by the Pro renderer at
		// runtime. Serve the minified `.min.js` copy in production;
		// fall back to the readable source when `SCRIPT_DEBUG` is on
		// so developers can still set breakpoints on a live site.
		// filemtime() is used as the cache-bust query so the import
		// URL changes whenever the file is rebuilt.
		$glb_anatomy_min  = ATLAS_AR_PLUGIN_PATH . 'public/js/tryon/glb-anatomy.min.js';
		$glb_anatomy_src  = ATLAS_AR_PLUGIN_PATH . 'public/js/tryon/glb-anatomy.js';
		$glb_anatomy_use_min = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? false : file_exists( $glb_anatomy_min );
		$glb_anatomy_file = $glb_anatomy_use_min ? $glb_anatomy_min : $glb_anatomy_src;
		$glb_anatomy_url  = ATLAS_AR_PLUGIN_URL . 'public/js/tryon/' . ( $glb_anatomy_use_min ? 'glb-anatomy.min.js' : 'glb-anatomy.js' );
		$glb_anatomy_ver  = file_exists( $glb_anatomy_file ) ? filemtime( $glb_anatomy_file ) : $this->version;

		wp_localize_script(
			self::SCRIPT_HANDLE,
			'atlas_ar_tryon',
			array(
				'rest_url'       => esc_url_raw( rest_url( 'ar_try_on/v1' ) ),
				'rest_nonce'     => wp_create_nonce( 'wp_rest' ),
				'modes'          => self::available_modes(),
				'models'         => self::model_urls(),
				'snapshot'       => (bool) $settings['tryon_snapshot'],
				'button_label'   => $settings['tryon_button_label'],
				'consent_text'   => $settings['tryon_consent_text'],
				'plugin_url'     => ATLAS_AR_PLUGIN_URL,
				'pro_active'     => $pro_active,
				// Watermark only when Pro inactive. Pro filter can override.
				'watermark'      => apply_filters( 'atlas_ar_tryon_snapshot_watermark', ! $pro_active ),
				// HD snapshot (2× canvas) — default Pro-on, Free-off. Filterable.
				'snapshot_hd'    => apply_filters( 'atlas_ar_tryon_snapshot_hd', $pro_active ),
				'worker_options' => $worker_options,
				'glb_anatomy'    => $cached_anatomy,
				'can_persist_anatomy' => ( $queried_id > 0 && current_user_can( 'edit_post', $queried_id ) ),
				'product_id'     => $queried_id,
				// Server-resolved URL for the analyzer module the Pro
				// renderer dynamic-imports. Already includes the
				// filemtime cache-bust, so the renderer can use it as-is.
				'glb_anatomy_url' => $glb_anatomy_url . '?ver=' . rawurlencode( $glb_anatomy_ver ),
			)
		);
	}
}
