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
		wp_enqueue_script( 'AtlasAR', ATLAS_AR_PLUGIN_URL . 'public/js/AtlasAR.dist.js', array(), $this->version, false );
		wp_enqueue_script( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/js/ar-vr-3d-model-try-on-public-dist.js', array(), $this->version, true );
		wp_localize_script( $this->plugin_name, 'ar_try_on', $this->get_localize_data() );

		wp_enqueue_script( 'ar-try-on-lazy-loader', ATLAS_AR_PLUGIN_URL . 'public/js/lazy-load-model-viewer.js', array(), $this->version, true );
		wp_localize_script( 'ar-try-on-lazy-loader', 'ar_try_on', $this->get_localize_data() );
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

        $ar_button_content = $qr_html . $button_html;

        if ( ! isset( $post->post_type ) || $post->post_type !== 'product' ) {
            return $content . $ar_button_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Server-controlled QR + button markup (inline <script>); built from internal templates only.
        } else {
            echo $ar_button_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Server-controlled QR + button markup (inline <script>); built from internal templates only.
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

        ob_start();
        ?>
        <div  id="atlas_ar_<?php echo esc_attr($post_id) ?>"></div>
        <script type="module">
            document.addEventListener("DOMContentLoaded", async function  () {
                let atlasAR = new window.AtlasAR()
                let product_id = "<?php echo esc_attr($post_id) ?>";
                const htmlContent = atlasAR.getModelSkeleton(`model_viewer_${product_id}`);

                let current_product = document.getElementById('atlas_ar_' + product_id);
                let tab = document.getElementById('tab-title-atlas_ar_3d_view');
                let modelLoaded = false;
                tab.addEventListener('click', async function() {
                    if(!modelLoaded) {
                        current_product.innerHTML = '<h1>3D File Is Loading</h1>'
                    }
                    setTimeout(async  function(){
                        if (tab.classList.contains('active') && current_product && !modelLoaded) {
                            current_product.innerHTML = htmlContent; // Insert model-viewer HTML
                            atlasAR.fetchModelData(product_id, "#model_viewer_"+product_id )
                        }
                    }, 500)
                })

            });
        </script>
        <?php
        $ar_button_content = ob_get_clean();


		if ( $post->post_type != 'product' ) {
			return $content . $ar_button_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Server-controlled AR-button markup (inline <script>); built from internal templates.
		} else {
			echo $ar_button_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Server-controlled AR-button markup (inline <script>); built from internal templates.
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
