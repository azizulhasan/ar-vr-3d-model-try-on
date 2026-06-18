<?php

namespace AR_TRY_ON;

use AR_TRY_ON_Admin\AR_TRY_ON_Admin;
use AR_TRY_ON_Public\AR_TRY_ON_Public;
use AR_TRY_ON\AR_TRY_ON_Tryon;

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      AR_TRY_ON_Loader $loader Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_name The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $version The current version of the plugin.
	 */
	protected $version;

	/**
	 * The unique prefix of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_prefix The string used to uniquely prefix technical functions of this plugin.
	 */
	protected $plugin_prefix;
	/**
	 * plugin public object
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      AR_TRY_ON_Public $plugin_public The string used to uniquely prefix technical functions of this plugin.
	 */
	protected $plugin_public;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'ATLAS_AR_VERSION' ) ) {
			$this->version = ATLAS_AR_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name   = 'ar-vr-3d-model-try-on';
		$this->plugin_prefix = 'atlas_ar_';


		$this->load_dependencies();
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_wc_hooks();


	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		require_once ATLAS_AR_PLUGIN_PATH . '/includes/AR_TRY_ON_Constants.php';
        require_once ATLAS_AR_PLUGIN_PATH . '/includes/AR_TRY_ON_Hooks.php';

		$this->loader = new AR_TRY_ON_Loader();

	}


	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new AR_TRY_ON_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles', 10 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts', 10 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_preview', 10 );

		// Add defer attribute to admin scripts for better performance
//		$this->loader->add_filter( 'script_loader_tag', $plugin_admin, 'add_defer_attribute', 10, 3 );

		// Add version to assets for cache busting
		$this->loader->add_filter( 'script_loader_src', $plugin_admin, 'add_version_to_assets', 10, 2 );
		$this->loader->add_filter( 'style_loader_src', $plugin_admin, 'add_version_to_assets', 10, 2 );

        /**
         * Adds support for Android `.glb` and iOS `.usdz` file types by defining their extensions and mime types.
         * The function `ar_model_viewer_for_woocommerce_file_and_ext` checks the file type during upload and processing.
         * This ensures that the file types are correctly identified in WordPress.
         * It hooks into the `wp_check_filetype_and_ext` filter, with a priority of 10 and passes 4 arguments.
         */
        // Allow Android (.glb) and iOS (.usdz) files to be uploaded by adding them to the allowed MIME types.
        $this->loader->add_filter( 'upload_mimes', $plugin_admin, 'mime_types' );

		/**
		 * Enqueues the admin scripts for the WordPress admin dashboard.
		 * The function `enqueue_scripts` in `$plugin_admin` will include the necessary JavaScript files for the plugin.
		 */
		// Set the extension and mime type for Android (.glb) and iOS (.usdz) files.
        global $wp_version;
        if (version_compare($wp_version, '5.1') >= 0) {
            $this->loader->add_filter(
                'wp_check_filetype_and_ext',
                $plugin_admin,
                'allowed_file_and_ext',
                10,
                5
            );
        } else {
            $this->loader->add_filter(
                'wp_check_filetype_and_ext',
                $plugin_admin,
                'allowed_file_and_ext',
                10,
                4
            );
        }



		$this->loader->add_action( 'admin_menu', $plugin_admin, 'atlas_ar_menu' );
	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$this->plugin_public = new AR_TRY_ON_Public( $this->get_plugin_name(), $this->get_plugin_prefix(), $this->get_version() );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_styles', 10 );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_scripts', 10 );

		// Add defer attribute to frontend scripts for better performance
		$this->loader->add_filter( 'script_loader_tag', $this->plugin_public, 'add_defer_attribute', 10, 3 );

	}

	public function define_wc_hooks() {

		$settings = AR_TRY_ON_Helper::get_settings();

		$wc_hook_id = isset( $settings['ar_try_on_wc_hook_position'] ) ? $settings['ar_try_on_wc_hook_position'] : 'product_image';

		switch ( $wc_hook_id ) {
			case 1:
				$this->loader->add_action( 'woocommerce_before_single_product_summary', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 2:
				$this->loader->add_action( 'woocommerce_after_single_product_summary', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 3:
				$this->loader->add_action( 'woocommerce_before_single_product', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 4:
				$this->loader->add_action( 'woocommerce_after_single_product', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 5:
				$this->loader->add_action( 'woocommerce_after_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 6:
				$this->loader->add_action( 'woocommerce_before_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 7:
				$this->loader->add_action( 'woocommerce_product_thumbnails', $this, 'add_3d_file_as_product_gallery_item', 20 );
				break;
			case 'product_image':
			case '3d_viewer':
				// Add toggle functionality - output in footer to overlay on featured image
				$this->loader->add_action( 'wp_footer', $this, 'add_image_3d_toggle_to_gallery', 20 );
				break;
		}

		$this->loader->add_filter( 'the_content', $this->plugin_public, 'atlas_ar_button', 20 );

		// QR code rendering is hoisted out of `atlas_ar_button` and into
		// its own `wp_footer` hook so it always emits exactly once per
		// supported singular post — independent of whether `the_content`
		// or a WC numeric-position hook fired. Without this, WC product
		// pages in toggle mode (where atlas_ar_button only runs on
		// `the_content`) wouldn't get a QR on pages where WC's tab
		// system bypasses the_content filter for the description.
		$this->loader->add_action( 'wp_footer', $this->plugin_public, 'render_qr_code_footer', 5 );


		if ( isset( $settings['ar_try_on_single_product_tabs'] ) ) {
			if ( $settings['ar_try_on_single_product_tabs'] == 'yes' ) {
				$this->loader->add_filter( 'woocommerce_product_tabs', $this->plugin_public, 'atlas_ar_woocommerce_tab' );
			}
		}

    }

    /**
     * @return void
     */
    public function add_3d_file_as_product_gallery_item() {
        global $product;
        $product_id = $product->get_id();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            return;
        }
        $attachment_id = get_post_thumbnail_id( $product_id );
        $gallery_thumbnail = wc_get_image_size( 'gallery_thumbnail' );
        $thumbnail_size    = apply_filters( 'woocommerce_gallery_thumbnail_size', array( $gallery_thumbnail['width'], $gallery_thumbnail['height'] ) );
        $thumbnail_sizes   = wp_get_attachment_image_sizes( $attachment_id, $thumbnail_size );

        // The poster-hydration logic moved from an inline <script> to the
        // enqueued public/js/ar-gallery-poster.js (registered in
        // AR_TRY_ON_Public::enqueue_scripts). It reads the product id and the
        // default-poster srcset from the gallery item's data attributes, so
        // the markup below is plain HTML that passes cleanly through wp_kses().
        $default_srcset = ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_100x100.webp 100w, '
            . ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_150x150.webp 150w, '
            . ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_300x300.webp 300w';

        // create_shortcode() returns server-built, script-free markup; embed
        // it in the gallery item div and escape the whole string via wp_kses.
        $shortcode_html = AR_TRY_ON_Helper::create_shortcode( [], '' );

        $image = sprintf(
            '<div id="atlas_ar-3d-gallery-item" data-thumb="" data-thumb-alt="" class="woocommerce-product-gallery__image" style="width:500px;margin-right:0;float:left;display:block;" data-thumb-srcset="" data-thumb-sizes="%1$s" data-atlas-product-id="%2$s" data-atlas-default-srcset="%3$s">%4$s</div>',
            esc_attr( $thumbnail_sizes ),
            esc_attr( $product_id ),
            esc_attr( $default_srcset ),
            $shortcode_html
        );

        echo wp_kses( $image, AR_TRY_ON_Helper::allowed_html( 'shortcode' ) );
    }

    /**
     * Add image/3D toggle functionality to product gallery
     * Places toggle button on top of the featured image as overlay
     *
     * @since 1.8.2
     * @return void
     */
    public function add_image_3d_toggle_to_gallery() {
        // Only run on single product pages
        if ( ! function_exists( 'is_product' ) || ! is_product() ) {
            return;
        }

        global $product;
        if ( ! $product ) {
            return;
        }

        $product_id = $product->get_id();

        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            return;
        }

        // Check if product has 3D model
        if ( ! AR_TRY_ON_Helper::has_3d_model( $product_id ) ) {
            return;
        }

        // Try-On products: only block the image/3D toggle when the merchant
        // has NOT opted into showing the static 3D viewer alongside Try-On.
        // When `show_static_viewer_for_tryon` is enabled the cube toggle
        // works exactly as it does for floor/wall products (swap product
        // image with the inline <model-viewer>).
        if ( class_exists( '\\AR_TRY_ON\\AR_TRY_ON_Tryon' ) ) {
            $placement = AR_TRY_ON_Tryon::get_product_placement( $product_id );
            if ( AR_TRY_ON_Tryon::is_face_placement( $placement )
                && ! AR_TRY_ON_Tryon::should_show_static_viewer( $product_id ) ) {
                return;
            }
        }

        // Get the effective display mode for this product
        $display_mode = AR_TRY_ON_Helper::get_effective_show_button_in( $product_id );

        // Only proceed if toggle mode
        if ( ! AR_TRY_ON_Helper::is_toggle_display_mode( $display_mode ) ) {
            return;
        }

        // The image⇄3D toggle behaviour moved from a large inline <script>
        // to the enqueued public/js/ar-image-3d-toggle.js (registered in
        // AR_TRY_ON_Public::enqueue_scripts — this method runs at wp_footer
        // priority 20, too late to enqueue here). It reads the product id +
        // initial display mode from the container's data attributes and is
        // ordered after ar-shortcode-reveal.js (its dependency) so the
        // model-viewer skeleton is injected before the toggle clones it —
        // exactly the order the two inline scripts had.

        // `suppress_tryon_overlay` tells the shortcode NOT to emit its own
        // Try-On overlay button — the gallery's floating pill (rendered
        // separately by AR_TRY_ON_Tryon::render_button_overlay at wp_footer)
        // is the canonical Try-On entry-point in toggle mode. Without it both
        // buttons end up in the gallery image container.
        //
        // create_shortcode() returns server-built, script-free markup; we
        // wrap it in the hidden source container (carrying the per-product
        // data attributes the toggle JS reads) and escape the whole string
        // through wp_kses() — no inline script, no phcs:ignore.
        $shortcode_html = AR_TRY_ON_Helper::create_shortcode(
            array(
                'height'                 => '100%',
                'width'                  => '100%',
                'suppress_tryon_overlay' => 'true',
            ),
            ''
        );

        $toggle_html = sprintf(
            '<div id="atlas_ar-toggle-3d-container" style="display:none;" data-atlas-product-id="%1$s" data-atlas-display-mode="%2$s">%3$s</div>',
            esc_attr( $product_id ),
            esc_attr( $display_mode ),
            $shortcode_html
        );

        echo wp_kses( $toggle_html, AR_TRY_ON_Helper::allowed_html( 'shortcode' ) );
    }

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @return    string    The name of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @return    AR_TRY_ON_Loader    Orchestrates the hooks of the plugin.
	 * @since     1.0.0
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return    string    The version number of the plugin.
	 * @since     1.0.0
	 */
	public function get_version() {
		return $this->version;
	}

	/**
	 * The unique prefix of the plugin used to uniquely prefix technical functions.
	 *
	 * @return    string    The prefix of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_prefix() {
		return $this->plugin_prefix;
	}

}
