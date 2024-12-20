<?php

namespace AR_TRY_ON_Admin;

use AR_TRY_ON\AR_TRY_ON_Helper;

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/admin
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_name The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	/**
	 * Plugin's localize data.
	 *
	 * @since    1.3.14
	 * @access   private
	 * @var      string $localize_data Plugin's localize data.
	 */
	public $localize_data;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $plugin_name The name of this plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version     = $version;

		if ( ! function_exists( 'is_plugin_active' ) ) {
			include ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'wp_is_mobile' ) ) {
			include_once ABSPATH . 'wp-includes/vars.php';
		}

		$this->localize_data = [
			'api_url'                  => esc_url_raw( rest_url() ),
			'api_namespace'            => 'ar_try_on',
			'api_version'              => 'v1',
			'nonce'                    => wp_create_nonce( AR_TRY_ON_NONCE ),
			'plugin_name'              => AR_TRY_ON_PLUGIN_NAME,
			'rest_nonce'               => wp_create_nonce( 'wp_rest' ),
			'VERSION'                  =>  AR_TRY_ON_VERSION,
		];
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( AR_TRY_ON_Helper::is_ar_try_on_for_wordpress_page() || AR_TRY_ON_Helper::is_product_page() ) {
			wp_enqueue_style( 'ar-vr-3d-try-on-for-wordpress', plugin_dir_url( dirname( __FILE__ ) ) . 'public/css/ar-try-on.css', array(), $this->version, 'all' );
		}
	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		/**
		 * Looad script
		 */

		if ( ! function_exists( 'is_plugin_active' ) ) {
			include ABSPATH . 'wp-admin/includes/plugin.php';
		}

		do_action( 'AR_TRY_ON_enqueue_pro_dashboard_scripts' );


//		if ( AR_TRY_ON_Helper::is_ar_try_on_for_wordpress_page() ) {
			/* Load react js */
			wp_enqueue_script( 'ar-try-on-dashboard-ui', plugin_dir_url( __FILE__ ) . 'js/build/ar-try-on-dashboard-ui.min.js', array(), $this->version, true );
			wp_localize_script( 'ar-try-on-dashboard-ui', 'ar_try_on', $this->localize_data );
//		}

		if ( AR_TRY_ON_Helper::is_product_page() ) {
			wp_enqueue_media(); // Enqueue the WordPress media uploader
			wp_enqueue_script(
				'ar-try-on-media-library',
				plugin_dir_url( __FILE__ ) . 'js/build/ar-try-on-media-library.min.js', // Path to your JS file
				[ 'wp-hooks' ], // Dependencies
				$this->version,
				true
			);

			wp_enqueue_script( 'ar-try-on-metabox-ui', plugin_dir_url( __FILE__ ) . 'js/build/ar-try-on-metabox-ui.min.js', array( 'wp-hooks' ), $this->version, true );
			wp_localize_script( 'ar-try-on-metabox-ui', 'ar_try_on', $this->localize_data );
		}

	}

	/**
	 * Add Menu and Submenu page
	 */

	public function ar_try_on_menu() {
		add_menu_page(
			'AR Try-On',
			'AR Try-On',
			'manage_options',
			'ar-vr-3d-try-on-for-wordpress',
			array( $this, "ar_try_on_settings" ),
			plugins_url('ar-vr-3d-try-on-for-wordpress') . '/admin/images/ar-try-on-logo-resized-30x34.png',
			20
		);
	}

	public function ar_try_on_settings() {
		echo "<div class='wpwrap'><div id='ar_try_on_dashboard_ui'></div></div>";
	}

}
