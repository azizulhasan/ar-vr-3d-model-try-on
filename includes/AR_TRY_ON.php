<?php

namespace AR_TRY_ON;

use AR_TRY_ON_Admin\AR_TRY_ON_Admin;
use AR_TRY_ON_Public\AR_TRY_ON_Public;

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

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles', 999999 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts', 99999 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_preview', 99999 );

		/**
		 * Enqueues the admin scripts for the WordPress admin dashboard.
		 * The function `enqueue_scripts` in `$plugin_admin` will include the necessary JavaScript files for the plugin.
		 */
		// Set the extension and mime type for Android (.glb) and iOS (.usdz) files.
		$this->loader->add_filter(
			'wp_check_filetype_and_ext',
			$plugin_admin,
			'ATLAS_AR_for_woocommerce_file_and_ext',
			10,
			4
		);
		/**
		 * Adds support for Android `.glb` and iOS `.usdz` file types by defining their extensions and mime types.
		 * The function `ar_model_viewer_for_woocommerce_file_and_ext` checks the file type during upload and processing.
		 * This ensures that the file types are correctly identified in WordPress.
		 * It hooks into the `wp_check_filetype_and_ext` filter, with a priority of 10 and passes 4 arguments.
		 */
		// Allow Android (.glb) and iOS (.usdz) files to be uploaded by adding them to the allowed MIME types.
		$this->loader->add_filter( 'upload_mimes', $plugin_admin, 'atlas_ar_for_woocommerce_mime_types' );


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

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_styles', 99999 );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_scripts', 99999 );

	}

	public function define_wc_hooks() {

		$settings = (array) get_option( 'ar_try_on_settings' );

		$wc_hook_id = isset( $settings['ar_try_on_wc_hook_position'] ) ? $settings['ar_try_on_wc_hook_position'] : false;
		switch ( $wc_hook_id ) {
			case 1:
				$this->loader->add_action( 'woocommerce_before_single_product_summary', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 2:
				$this->loader->add_action( 'woocommerce_after_single_product_summary', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 3:
				$this->loader->add_action( 'woocommerce_before_single_product', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 4:
				$this->loader->add_action( 'woocommerce_after_single_product', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 5:
				$this->loader->add_action( 'woocommerce_after_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 6:
				$this->loader->add_action( 'woocommerce_before_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
		}

		$this->loader->add_filter( 'the_content', $this->plugin_public, 'atlas_ar_button', 99999999 );


		if ( isset( $settings['ar_try_on_single_product_tabs'] ) ) {
			if ( $settings['ar_try_on_single_product_tabs'] == 'yes' ) {
				$this->loader->add_filter( 'woocommerce_product_tabs', $this->plugin_public, 'atlas_ar_woocommerce_tab' );
			}
		}

//        add_action( 'woocommerce_product_thumbnails', [$this, 'add_3d_file_as_product_gallery_item'], 20 );
        add_action( 'woocommerce_single_product_image_thumbnail_html', [$this, 'replace_woocommerce_single_product_image_thumbnail_html'], 5, 2 );

    }

    public  function add_3d_file_as_product_gallery_item() {
//        echo '<div class="myplugin-after-featured">';
//        echo '<img src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" alt="After Featured Image">';
//        echo '</div>';
//        echo '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-thumb-alt="Hat - Image 3" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w" data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image" style="width: 512px; margin-right: 0px; float: left; display: block;"><a href="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"><img width="504" height="757" src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" class="" alt="Hat - Image 3" data-caption="" data-src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image_width="504" data-large_image_height="757" decoding="async" srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 504w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113861-531ebbcd-f9b5-4c18-b5c7-a878d5017ca2-200x300.jpeg 200w" sizes="(max-width: 504px) 100vw, 504px" draggable="false"></a></div>';
//        $html = '';
//        $html .= '<div class="myplugin-before-gallery">Before Gallery Image/HTML1111111111111111111111111111111</div>';
//        echo $html;
    }

    public  function replace_woocommerce_single_product_image_thumbnail_html($html, $post_thumbnail_id) {
//        echo '<div class="myplugin-after-featured">';
//        echo '<img src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" alt="After Featured Image">';
//        echo '</div>';
//        $html .= '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-thumb-alt="Hat - Image 3" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w" data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image" style="width: 512px; margin-right: 0px; float: left; display: block;"><a href="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"><img width="504" height="757" src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" class="" alt="Hat - Image 3" data-caption="" data-src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image_width="504" data-large_image_height="757" decoding="async" srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 504w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113861-531ebbcd-f9b5-4c18-b5c7-a878d5017ca2-200x300.jpeg 200w" sizes="(max-width: 504px) 100vw, 504px" draggable="false"></a></div>';
//        return $html;
        $current_filter = current_filter();
//        error_log(print_r($current_filter, true));
                return AR_TRY_ON_Helper::create_shortcode( [], '' );

//        $html .= AR_TRY_ON_Helper::create_shortcode( [], '' );
//        return $html;
//        return '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-thumb-alt="Hat - Image 3" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w" data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image" style="width: 512px; margin-right: 0px; float: left; display: block;"><a href="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"><img width="504" height="757" src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" class="" alt="Hat - Image 3" data-caption="" data-src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image_width="504" data-large_image_height="757" decoding="async" srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 504w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113861-531ebbcd-f9b5-4c18-b5c7-a878d5017ca2-200x300.jpeg 200w" sizes="(max-width: 504px) 100vw, 504px" draggable="false"></a></div>';

        //        $html = '';
//        $html .= '<div class="myplugin-before-gallery">Before Gallery Image/HTML1111111111111111111111111111111</div>';
//        echo $html;
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
