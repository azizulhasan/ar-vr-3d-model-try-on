<?php

namespace AR_TRY_ON_Public;

use AR_TRY_ON\AR_TRY_ON_Helper;
use AR_TRY_ON\AR_TRY_ON_Cache;
use AR_TRY_ON\AR_TRY_ON_Tryon;

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://racmanuel.dev
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two hooks to
 * enqueue the public-facing stylesheet and JavaScript.
 * As you add hooks and methods, update this description.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/public
 * @author     Manuel Ramirez Coronel <ra_cm@outlook.com>
 */
class AR_TRY_ON_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_name The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The unique prefix of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_prefix The string used to uniquely prefix technical functions of this plugin.
	 */
	private $plugin_prefix;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	/**
	 * Backing cache for {@see self::get_localize_data()}. Built once
	 * per request on the first enqueue call so Pro's filter listeners
	 * (registered via the `atlas_ar_loaded` action — AR-61 §1.1 Phase 4)
	 * have had a chance to hook in before Free reads the filter values.
	 *
	 * @var array|null
	 */
	private $localize_data = null;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $plugin_name The name of the plugin.
	 * @param string $plugin_prefix The unique prefix of this plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 */
	public function __construct( $plugin_name, $plugin_prefix, $version ) {

		$this->plugin_name   = $plugin_name;
		$this->plugin_prefix = $plugin_prefix;
		$this->version       = $version;


		// `localize_data` is built lazily by get_localize_data()
		// rather than here in the constructor — see the long comment
		// in AR_TRY_ON_Admin's constructor for why. AR-61 §1.1 Phase 4.
		$this->localize_data = null;


		// Add `type="module"` to specific script handles by mutating the
		// existing <script> tag instead of rebuilding it. The handles are
		// already registered/enqueued via wp_enqueue_script() elsewhere;
		// this filter only edits the opening tag WordPress generates for
		// them. Plugin Check (PluginCheck) flags any literal `<script>`
		// in a string as a non-enqueued script — using str_replace on
		// the existing tag avoids that false positive.
		add_filter( 'script_loader_tag', function ( $tag, $handle ) {
			if ( 'ar-try-on-google-model-viewer' === $handle || 'AtlasAR' === $handle ) {
				$tag = str_replace( ' src=', ' type="module" src=', $tag );
			}

			return $tag;
		}, 10, 2 );

	}

	/**
	 * Build (or return the cached copy of) the wp_localize_script
	 * payload for the public bundle.
	 *
	 * Mirrors {@see AR_TRY_ON_Admin::get_localize_data()} on the
	 * public side. Lazy by design — the Phase 3 filter-driven keys
	 * (supported_formats, dashboard_tabs, metabox_sections) are read
	 * here at enqueue time, by which point Pro has had a chance to
	 * register its filter listeners via the `atlas_ar_loaded` action.
	 *
	 * @since   1.0.0
	 * @updated AR-61 §1.1 Phase 4
	 * @return  array
	 */
	private function get_localize_data() {
		if ( null !== $this->localize_data ) {
			return $this->localize_data;
		}
		$this->localize_data = [
			'api_url'       => esc_url_raw( rest_url() ),
			'api_namespace' => 'ar_try_on',
			'api_version'   => 'v1',
			'nonce'         => wp_create_nonce( ATLAS_AR_NONCE ),
			'plugin_name'   => ATLAS_AR_PLUGIN_NAME,
			'rest_nonce'    => wp_create_nonce( 'wp_rest' ),
			'VERSION'       => ATLAS_AR_VERSION,
			'plugin_url'    => ATLAS_AR_PLUGIN_URL,
			'is_pro_active' => AR_TRY_ON_Helper::is_pro_active(),
			'cached_ids'    => AR_TRY_ON_Helper::update_cache_data( false ),

			/*
			 * Phase 3 extension-surface payload — kept symmetric with
			 * the admin-side localize_data so public-bundle code
			 * (current and future) can read the same Pro-extension
			 * data without a second REST round-trip.
			 */
			'supported_formats' => AR_TRY_ON_Helper::supported_formats(),
			'dashboard_tabs'    => AR_TRY_ON_Helper::dashboard_settings_tabs(),
			'metabox_sections'  => AR_TRY_ON_Helper::metabox_sections(),
		];
		return $this->localize_data;
	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( is_admin() && AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_style( 'ar-vr-3d-model-try-on', ATLAS_AR_PLUGIN_URL . '/public/css/ar-try-on.css', array(), $this->version, 'all' );


		}

		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {

			// filemtime-based versioning forces browsers to grab a
			// fresh copy whenever we tweak the CSS — the plugin
			// `$this->version` is too coarse (it only changes on
			// release), so iterative UI/UX tweaks would otherwise be
			// served from cache.
			$public_css_path = ATLAS_AR_PLUGIN_PATH . 'public/css/ar-vr-3d-model-try-on-public.css';
			$public_css_ver  = file_exists( $public_css_path ) ? (string) filemtime( $public_css_path ) : $this->version;

			wp_enqueue_style( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $public_css_ver, 'all' );
			wp_enqueue_style( 'atlas_ar_modal', ATLAS_AR_PLUGIN_URL . 'public/css/atlas_ar_modal.css', array(), $this->version, 'all' );

			// Enqueue image/3D toggle styles
			wp_enqueue_style( 'atlas-ar-toggle', ATLAS_AR_PLUGIN_URL . 'public/css/image-3d-toggle.css', array(), $this->version, 'all' );

			// Dynamic Try-On / View-in-AR buttons block. Replaces the inline
			// <style> that build_dynamic_buttons_block() used to emit — the
			// rules are class-scoped (.atlas-ar-tryon-buttons) and the footer
			// sampler still sets the per-wrapper CSS custom properties inline.
			// Enqueued in <head> here so it's present before the_content runs
			// (the_content fires after wp_head, so a late enqueue would miss).
			$tryon_css_path = ATLAS_AR_PLUGIN_PATH . 'public/css/ar-tryon-buttons.css';
			$tryon_css_ver  = file_exists( $tryon_css_path ) ? (string) filemtime( $tryon_css_path ) : $this->version;
			wp_enqueue_style( 'atlas-ar-tryon-buttons', ATLAS_AR_PLUGIN_URL . 'public/css/ar-tryon-buttons.css', array(), $tryon_css_ver, 'all' );
		}



	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		// Per-product loader split: on a single product page whose
		// `ar_placement` is `face-*` AND the static viewer toggle is OFF,
		// the AtlasAR + lazy-loader + QR scripts add nothing useful and
		// just waste bytes. In that one case we ship only tryon-bootstrap
		// (enqueued separately by AR_TRY_ON_Tryon::enqueue_assets). All
		// other contexts keep the current bundle exactly as before.
		$skip_static_ar_bundle = false;
		if ( class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) ) {
			$post_id = AR_TRY_ON_Tryon::current_product_id();
			if ( $post_id ) {
				$placement = AR_TRY_ON_Tryon::get_product_placement( $post_id );
				$show_viewer = AR_TRY_ON_Tryon::should_show_static_viewer( $post_id );
				if ( AR_TRY_ON_Tryon::is_face_placement( $placement ) && ! $show_viewer ) {
					$skip_static_ar_bundle = true;
				}
			}
		}

		// QR generator script is independent of the static AR bundle —
		// the QR is rendered by `render_qr_code_footer()` at `wp_footer`
		// for every supported singular post (face or not), so the
		// generator JS needs to be on the page regardless of whether
		// we're about to bail the static AR bundle for a face-only
		// product. Enqueue BEFORE the bail.
		if ( AR_TRY_ON_Helper::is_qr_code_enabled() ) {
			wp_enqueue_script( 'ar-try-on-qr-generator', ATLAS_AR_PLUGIN_URL . 'public/js/ar-try-on-qr-generator.min.js', array(), $this->version, false );
			// Builds the QR into the placeholder div rendered by
			// AR_TRY_ON_Helper::get_qr_code(). Depends on the generator lib.
			wp_enqueue_script( 'ar-try-on-qr-init', ATLAS_AR_PLUGIN_URL . 'public/js/ar-qr-init.js', array( 'ar-try-on-qr-generator' ), $this->version, true );
		}

		if ( $skip_static_ar_bundle ) {
			// Try-On only product page — bootstrap is enqueued by Tryon class.
			return;
		}

		// Performance Optimization: Lazy load model-viewer instead of loading immediately
		// This saves ~956KB and improves initial page load by 100-200ms
		// Model-viewer will load only when AR content becomes visible in viewport
		//
		// filemtime-based versioning (same reason as the CSS above): the
		// webpack dist bundles get rebuilt mid-version (e.g. the AR-66
		// product-id -> data-product-id rename), but `$this->version` only
		// changes on release. Without a fresh ?ver, browsers keep serving the
		// stale cached bundle and miss the rebuild (symptom: a button with a
		// valid data-product-id logs "Product ID is missing" from the old JS).
		$atlasar_path   = ATLAS_AR_PLUGIN_PATH . 'public/js/AtlasAR.dist.js';
		$public_js_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-vr-3d-model-try-on-public-dist.js';
		$lazy_js_path   = ATLAS_AR_PLUGIN_PATH . 'public/js/lazy-load-model-viewer.js';
		$atlasar_ver    = file_exists( $atlasar_path ) ? (string) filemtime( $atlasar_path ) : $this->version;
		$public_js_ver  = file_exists( $public_js_path ) ? (string) filemtime( $public_js_path ) : $this->version;
		$lazy_js_ver    = file_exists( $lazy_js_path ) ? (string) filemtime( $lazy_js_path ) : $this->version;

		wp_enqueue_script( 'AtlasAR', ATLAS_AR_PLUGIN_URL . 'public/js/AtlasAR.dist.js', array(), $atlasar_ver, false );
		wp_enqueue_script( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/js/ar-vr-3d-model-try-on-public-dist.js', array(), $public_js_ver, true );
		wp_localize_script( $this->plugin_name, 'ar_try_on', $this->get_localize_data() );

		wp_enqueue_script( 'ar-try-on-lazy-loader', ATLAS_AR_PLUGIN_URL . 'public/js/lazy-load-model-viewer.js', array(), $lazy_js_ver, true );
		wp_localize_script( 'ar-try-on-lazy-loader', 'ar_try_on', $this->get_localize_data() );

		// Inline `[atlas_ar reveal="true"]` model-viewer reveal. Replaces the
		// inline <script type="module"> that AR_TRY_ON_Helper::create_shortcode
		// used to emit — it finds each `.atlas-ar-shortcode-reveal` placeholder
		// and injects the AtlasAR skeleton. Enqueued here (alongside AtlasAR,
		// its dependency) so it's reliably printed regardless of which late
		// gallery / the_content hook actually rendered the shortcode.
		$reveal_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-shortcode-reveal.js';
		$reveal_ver  = file_exists( $reveal_path ) ? (string) filemtime( $reveal_path ) : $this->version;
		wp_enqueue_script( 'atlas-ar-shortcode-reveal', ATLAS_AR_PLUGIN_URL . 'public/js/ar-shortcode-reveal.js', array( 'AtlasAR' ), $reveal_ver, true );

		// Product-gallery image⇄3D toggle. Replaces the inline <script> that
		// AR_TRY_ON::add_image_3d_toggle_to_gallery emitted — that method runs
		// at wp_footer priority 20 (too late to enqueue), so register the
		// handle here. The JS bails when no #atlas_ar-toggle-3d-container is
		// present, so enqueuing it on every supported page is harmless.
		// Depends on the reveal script so the model-viewer skeleton is
		// injected into the hidden container before the toggle clones it.
		$toggle_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-image-3d-toggle.js';
		$toggle_ver  = file_exists( $toggle_path ) ? (string) filemtime( $toggle_path ) : $this->version;
		wp_enqueue_script( 'atlas-ar-image-3d-toggle', ATLAS_AR_PLUGIN_URL . 'public/js/ar-image-3d-toggle.js', array( 'AtlasAR', 'atlas-ar-shortcode-reveal' ), $toggle_ver, true );

		// WooCommerce gallery 3D-item poster hydration. Replaces the inline
		// <script> that AR_TRY_ON::add_3d_file_as_product_gallery_item emitted
		// (rendered on woocommerce_product_thumbnails). Reads the cached poster
		// from sessionStorage; bails when no #atlas_ar-3d-gallery-item exists.
		$poster_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-gallery-poster.js';
		$poster_ver  = file_exists( $poster_path ) ? (string) filemtime( $poster_path ) : $this->version;
		wp_enqueue_script( 'atlas-ar-gallery-poster', ATLAS_AR_PLUGIN_URL . 'public/js/ar-gallery-poster.js', array(), $poster_ver, true );

		// WooCommerce "3D View" product tab lazy loader. Replaces the inline
		// <script> in atlas_ar_button_tab(); loads the model when the tab is
		// clicked. Bails when no .atlas-ar-wc-tab-viewer container is present.
		$wctab_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-wc-tab.js';
		$wctab_ver  = file_exists( $wctab_path ) ? (string) filemtime( $wctab_path ) : $this->version;
		wp_enqueue_script( 'atlas-ar-wc-tab', ATLAS_AR_PLUGIN_URL . 'public/js/ar-wc-tab.js', array( 'AtlasAR' ), $wctab_ver, true );

		// Try-On overlay button placement. Replaces the inline <script> in
		// AR_TRY_ON_Tryon::render_button_overlay (wp_footer:25, too late to
		// enqueue). Clones the #atlas_ar-tryon-overlay-source <template> into
		// the gallery image container; bails when the template is absent.
		$overlay_path = ATLAS_AR_PLUGIN_PATH . 'public/js/ar-tryon-overlay-place.js';
		$overlay_ver  = file_exists( $overlay_path ) ? (string) filemtime( $overlay_path ) : $this->version;
		wp_enqueue_script( 'atlas-ar-tryon-overlay-place', ATLAS_AR_PLUGIN_URL . 'public/js/ar-tryon-overlay-place.js', array(), $overlay_ver, true );
	}

	/**
	 * Add defer attribute to plugin scripts for better frontend performance
	 *
	 * @param string $tag The script tag HTML
	 * @param string $handle The script handle
	 * @param string $src The script source URL
	 * @return string Modified script tag
	 */
	public function add_defer_attribute( $tag, $handle, $src ) {
		// List of plugin scripts that should be deferred
		$defer_scripts = array(
			'ar-try-on-lazy-loader',
			'ar-try-on-google-model-viewer',
			'AtlasAR',
			$this->plugin_name,
			'ar-try-on-qr-generator',
			'ar-try-on-qr-init'
		);

		// Add defer attribute if this is one of our scripts
		if ( in_array( $handle, $defer_scripts, true ) ) {
			// Only add defer if not already present
			if ( strpos( $tag, ' defer' ) === false ) {
				$tag = str_replace( ' src=', ' defer src=', $tag );
			}
		}

		return $tag;
	}

    /**
     * Per-request guards so we emit at most one QR code and one
     * View-in-AR buttons-block per post on a given page load, no
     * matter how many WC hooks `atlas_ar_button` is wired into.
     *
     * @var array<int,bool>
     */
    protected static $qr_rendered_for_post = array();
    protected static $btn_rendered_for_post = array();

    /**
     * AR-61: lets sibling renderers (e.g. the `[atlas_ar reveal="false"]`
     * branch in {@see AR_TRY_ON_Helper::create_shortcode}) tell us they
     * already emitted a View-in-AR button for `$post_id` from inside the
     * post body, so the auto-display path in {@see atlas_ar_button}
     * doesn't add a second one below the content.
     */
    public static function mark_button_rendered( $post_id ) {
        $post_id = (int) $post_id;
        if ( $post_id > 0 ) {
            self::$btn_rendered_for_post[ $post_id ] = true;
        }
    }

    /**
     * Emit the QR code (when enabled in settings) once per supported
     * singular post at `wp_footer`. Independent of `atlas_ar_button`'s
     * content-filter / WC-hook firings — so the QR shows up even when
     * `the_content` is bypassed (e.g., WC product page in toggle-mode
     * where the description is rendered through a tab adapter that
     * skips `the_content`).
     *
     * Guarded by `$qr_rendered_for_post` so we never emit twice if
     * `atlas_ar_button` already produced one earlier in the request.
     */
    public function render_qr_code_footer() {
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            return;
        }
        if ( ! is_singular() ) {
            return;
        }
        global $product, $post;
        $post_id = $product ? (int) $product->get_id() : (int) ( $post->ID ?? 0 );
        if ( $post_id <= 0 ) {
            return;
        }
        if ( ! AR_TRY_ON_Helper::has_3d_model( $post_id ) ) {
            return;
        }
        if ( ! empty( self::$qr_rendered_for_post[ $post_id ] ) ) {
            return;
        }
        $settings = AR_TRY_ON_Helper::get_settings();
        if ( ! AR_TRY_ON_Helper::is_qr_code_enabled( $settings ) ) {
            return;
        }
        $qr_html = (string) AR_TRY_ON_Helper::get_qr_code( $settings );
        if ( $qr_html === '' ) {
            return;
        }
        self::$qr_rendered_for_post[ $post_id ] = true;
        // get_qr_code() now returns only an escapable placeholder div
        // (the QR is built at runtime by the enqueued ar-qr-init.js), so
        // it can be escaped with wp_kses() — no more inline <script>.
        echo wp_kses( $qr_html, AR_TRY_ON_Helper::allowed_html( 'qr' ) );
    }

    public function atlas_ar_button( $content ) {
        $current_filter = current_filter();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            if ( $current_filter === 'the_content' ) {
                return $content;
            }

            return;
        }

        // Global product variable
        global $product;
        global $post;
        if ( $product ) {
            $post_id = (int) $product->get_id();
        } else {
            $post_id = (int) ( $post->ID ?? 0 );
        }

        $settings = AR_TRY_ON_Helper::get_settings();

        // ── QR code ─────────────────────────────────────────────────
        // QR is independent of placement — face products should also
        // get one when the merchant has QR enabled. Emit it once per
        // post per request via the static guard so repeat hook fires
        // don't double up.
        $qr_html = '';
        if ( $post_id > 0 && empty( self::$qr_rendered_for_post[ $post_id ] ) ) {
            $qr_html = (string) AR_TRY_ON_Helper::get_qr_code( $settings );
            if ( $qr_html !== '' ) {
                self::$qr_rendered_for_post[ $post_id ] = true;
            }
        }

        // ── Face-* products: buttons are rendered by AR_TRY_ON_Tryon ─
        // (render_button_for_face_product / render_button_overlay /
        // append_button_to_content). This method only contributes the
        // QR for face products — the static-AR "View in AR" button
        // doesn't apply because face products use the Try-On modal.
        $is_face = false;
        if ( class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) && $post_id ) {
            $placement = AR_TRY_ON_Tryon::get_product_placement( $post_id );
            $is_face   = AR_TRY_ON_Tryon::is_face_placement( $placement );
        }
        if ( $is_face ) {
            // $qr_html is now just an escapable placeholder div.
            $safe_qr = wp_kses( $qr_html, AR_TRY_ON_Helper::allowed_html( 'qr' ) );
            if ( $current_filter === 'the_content' ) {
                return $content . $safe_qr;
            }
            echo wp_kses( $qr_html, AR_TRY_ON_Helper::allowed_html( 'qr' ) );
            return;
        }

        // ── Non-face products: QR + dynamically-styled View-in-AR ────
        // We replace the legacy raw `<button>` markup with the same
        // dynamic-buttons block face products use (outer wrapper for
        // content-column alignment + theme-button sampler). This makes
        // the View-in-AR button on floor / wall posts pick up the
        // active theme's primary button color instead of falling back
        // to the browser's default gray.
        $button_html = '';
        $auto_button = isset( $settings['ar_try_on_display_button_automatically'] )
            && $settings['ar_try_on_display_button_automatically'] == 'yes';

        if ( $post_id > 0
            && $auto_button
            && empty( self::$btn_rendered_for_post[ $post_id ] )
            && ! has_shortcode( (string) ( $post->post_content ?? '' ), 'atlas_ar' )
            && class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) ) {

            $tryon = new AR_TRY_ON_Tryon( defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '0.0.0' );
            $button_html = $tryon->build_dynamic_buttons_block(
                $post_id,
                isset( $placement ) ? $placement : '',
                true, // $show_view_in_ar — emit the View-in-AR button
                array(
                    'show_tryon'        => false,        // no Try-On on non-face products
                    'view_in_ar_style'  => 'primary',    // filled — sole CTA, primary
                    'wrapper_id_suffix' => 'view-in-ar',
                )
            );
            self::$btn_rendered_for_post[ $post_id ] = true;
        }

        // Both fragments are now inline-script/style-free (QR script moved to
        // ar-qr-init.js; button <style>/SVG moved to ar-tryon-buttons.css), so
        // each is sanitised inline with its own wp_kses allow-list at the
        // output boundary — no intermediate variable, no phcs:ignore.
        if ( ! isset( $post->post_type ) || $post->post_type !== 'product' ) {
            return $content
                . wp_kses( $qr_html, AR_TRY_ON_Helper::allowed_html( 'qr' ) )
                . wp_kses( $button_html, AR_TRY_ON_Helper::allowed_html( 'ar_button' ) );
        } else {
            echo wp_kses( $qr_html, AR_TRY_ON_Helper::allowed_html( 'qr' ) )
                . wp_kses( $button_html, AR_TRY_ON_Helper::allowed_html( 'ar_button' ) );
        }
    }


	public function atlas_ar_button_tab( $content ) {
		$current_filter = current_filter();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            if ( $current_filter === 'the_content' ) {
				return $content;
			}

			return;
		}

        // Global product variable
		global $product;
		global $post;
		if ( $product ) {
			$post_id = $product->get_id();
		} else {
			$post_id = $post->ID;
		}

        // Try-On (face-*) products: AtlasAR.js bundle is intentionally
        // skipped when the merchant has the static viewer toggle OFF.
        // Emitting `new window.AtlasAR()` in the WC tab here would
        // throw "AtlasAR is not a constructor" on the front-end.
        if ( class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) ) {
            $placement = AR_TRY_ON_Tryon::get_product_placement( $post_id );
            if ( AR_TRY_ON_Tryon::is_face_placement( $placement )
                && ! AR_TRY_ON_Tryon::should_show_static_viewer( $post_id ) ) {
                if ( $current_filter === 'the_content' ) {
                    return $content;
                }
                return;
            }
        }

        // The lazy "3D View" tab loader moved from an inline <script> to the
        // enqueued public/js/ar-wc-tab.js (registered in enqueue_scripts). It
        // reads the product id from the container's data attribute and, on
        // tab click, injects the AtlasAR model-viewer skeleton. The container
        // is plain HTML escaped via wp_kses() at the output boundary.
        $ar_button_content = sprintf(
            '<div class="atlas-ar-wc-tab-viewer" id="atlas_ar_%1$s" data-atlas-product-id="%1$s"></div>',
            esc_attr( $post_id )
        );

		if ( $post->post_type != 'product' ) {
			return $content . wp_kses( $ar_button_content, AR_TRY_ON_Helper::allowed_html( 'shortcode' ) );
		} else {
			echo wp_kses( $ar_button_content, AR_TRY_ON_Helper::allowed_html( 'shortcode' ) );
		}
	}


	/**
	 * Adds a custom tab to the WooCommerce product page for viewing the product in 3D.
	 *
	 * @param array $tabs An associative array of the existing WooCommerce product tabs.
	 *
	 * @return array Modified array.
	 * @since 1.0.3
	 *
	 */
	public function atlas_ar_woocommerce_tab( $tabs ) {

		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return $tabs;
		}

		// Hide the static-AR product tab for Try-On (face-*) products
		// when the merchant hasn't opted into the static viewer alongside.
		// Otherwise the tab pane would emit `new window.AtlasAR()` even
		// though we intentionally skipped enqueuing AtlasAR.dist.js.
		if ( class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) ) {
			global $product, $post;
			$pid = $product ? $product->get_id() : ( $post ? $post->ID : 0 );
			if ( $pid ) {
				$placement = AR_TRY_ON_Tryon::get_product_placement( $pid );
				if ( AR_TRY_ON_Tryon::is_face_placement( $placement )
					&& ! AR_TRY_ON_Tryon::should_show_static_viewer( $pid ) ) {
					return $tabs;
				}
			}
		}

		$tabs['atlas_ar_3d_view'] = array(
			'title'    => __( 'AtlasAR Product View', 'ar-vr-3d-model-try-on' ),
			'priority' => 50,
			'callback' => array( $this, 'atlas_ar_button_tab' ),
		);

		return $tabs;
	}


}
