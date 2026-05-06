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

	const CDN_WASM_BASE  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
	const CDN_FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

	/**
	 * Free-tier limit on the number of face-* (Try-On) products. Pro
	 * removes the cap entirely. Tunable via filter.
	 */
	const FREE_FACE_PRODUCT_LIMIT = 3;

	/** @var string */
	protected $version;

	public function __construct( $version ) {
		$this->version = $version;
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

		$placement = self::get_product_placement( $post_id );
		$placement = apply_filters( 'atlas_ar_tryon_woocommerce_mode_for_product', $placement, $post_id );
		$glb_src   = self::get_product_glb_src( $post_id );
		$settings  = self::get_settings();
		$label     = $settings['tryon_button_label'];

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

	/* ---------- Asset enqueue (conditional) ---------- */

	public function enqueue_assets() {
		if ( ! self::should_enqueue_for_current_request() ) {
			return;
		}
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		wp_enqueue_style(
			self::STYLE_HANDLE,
			ATLAS_AR_PLUGIN_URL . 'public/css/tryon.css',
			array(),
			$this->version,
			'all'
		);

		wp_enqueue_script(
			self::SCRIPT_HANDLE,
			ATLAS_AR_PLUGIN_URL . 'public/js/build/tryon-bootstrap.dist.js',
			array(),
			$this->version,
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
				'worker_options' => $worker_options,
			)
		);
	}
}
