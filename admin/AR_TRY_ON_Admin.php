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
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'wp_is_mobile' ) ) {
			require_once ABSPATH . 'wp-includes/vars.php';
		}

		$this->localize_data = [
			'api_url'       => esc_url_raw( rest_url() ),
			'api_namespace' => 'ar_try_on',
			'api_version'   => 'v1',
			'plugin_name'   => ATLAS_AR_PLUGIN_NAME,
			'rest_nonce'    => wp_create_nonce( 'wp_rest' ),
			'VERSION'       => ATLAS_AR_VERSION,
			'plugin_url'    => ATLAS_AR_PLUGIN_URL,
			'post_types'    => AR_TRY_ON_Helper::get_post_types(),
			'is_wc_active'  => is_plugin_active( 'woocommerce/woocommerce.php' ),
			'is_pro_active' => AR_TRY_ON_Helper::is_pro_active(),

		];
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( AR_TRY_ON_Helper::is_atlas_ar_page() || AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_style( 'ar-vr-3d-model-try-on', ATLAS_AR_PLUGIN_URL . 'public/css/ar-try-on.css', array(), $this->version, 'all' );
        }
        wp_enqueue_style( 'atlas_ar_toastify', ATLAS_AR_PLUGIN_URL . 'admin/css/atlas_ar_toastify.css', array(), $this->version, 'all' );

		wp_enqueue_style( 'ar-vr-3d-model-try-on-admin', ATLAS_AR_PLUGIN_URL . 'admin/css/ar-try-on-admin.css', array(), $this->version, 'all' );

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
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		do_action( 'atlas_ar_enqueue_pro_dashboard_scripts' );


		if ( AR_TRY_ON_Helper::is_atlas_ar_page() ) {
			/* Load react js */
			wp_enqueue_script( 'ar-try-on-dashboard-ui', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-dashboard-ui.min.js', array(), $this->version, true );
			wp_localize_script( 'ar-try-on-dashboard-ui', 'ar_try_on', $this->localize_data );
		}

		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_media(); // Enqueue the WordPress media uploader
			wp_enqueue_script( 'ar-try-on-metabox-ui', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-metabox-ui.min.js', array( 'wp-hooks' ), $this->version, true );
			wp_localize_script( 'ar-try-on-metabox-ui', 'ar_try_on', $this->localize_data );
			
			wp_enqueue_script(
				'ar-try-on-media-library',
				ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-media-library.min.js', // Path to your JS file
				['ar-try-on-metabox-ui'], // Dependencies
				$this->version,
				true
			);
		}

	}

	public function enqueue_preview() {

		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
//
//			wp_enqueue_style( 'alertify', ATLAS_AR_PLUGIN_URL . 'public/css/alertifyjs/alertify.css', array(), $this->version, 'all' );
//			wp_enqueue_style( 'alertify-default', ATLAS_AR_PLUGIN_URL . 'public/css/alertifyjs/themes/default.css', array( 'alertify' ), $this->version, 'all' );
//			wp_enqueue_style( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );


			// TODO:: enqueue base on model setup/settings
			wp_enqueue_script( 'ar-try-on-google-model-viewer', ATLAS_AR_PLUGIN_URL . 'public/js/google-model-viewer.js', array('ar-try-on-metabox-ui'), $this->version, true );
			wp_enqueue_script( $this->plugin_name . '-preview', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-vr-3d-model-try-on-preview.min.js', array('ar-try-on-google-model-viewer'), $this->version, true );
			wp_localize_script( $this->plugin_name . '-preview', 'ar_try_on', $this->localize_data );
		}
	}

	/**
	 * Add Menu and Submenu page
	 */

	public function atlas_ar_menu() {
		add_menu_page(
			'AtlasAR',
			'AtlasAR',
			'manage_options',
			'ar-vr-3d-model-try-on',
			array( $this, "ar_try_on_settings" ),
			ATLAS_AR_PLUGIN_URL . 'admin/images/ar-try-on-logo-resized-30x34.png',
			20
		);
	}

	public function ar_try_on_settings() {
		echo wp_kses( "<div class='wpwrap'><div id='ar_try_on_dashboard_ui'></div></div>", array(
			'div' => array(
				'id'    => array(),
				'class' => array(),
			)
		) );
	}


	/**
	 * Sets the extension and mime type for Android - .gbl and IOS - .usdz files.
	 *
	 * @param array $wp_check_filetype_and_ext File data array containing 'ext', 'type', and 'proper_filename' keys.
	 * @param string $file Full path to the file.
	 * @param string $filename The name of the file (may differ from $file due to $file being in a tmp directory).
	 * @param array $mimes Key is the file extension with value as the mime type.
	 */
	public function allowed_file_and_ext( $types, $file, $filename, $mimes, $real_mime = null ) {
        $f_sp = explode(".", $filename);
        $f_exp_count  = count($f_sp);

        if ($f_exp_count <= 1) {
            return $types;
        } else {
            $f_name = $f_sp[0];
            $ext  = $f_sp[$f_exp_count - 1];
        }

        $extendedMimes = $this->mime_types();

        if (isset($extendedMimes[$ext])) {
            $type = $extendedMimes[$ext];
            $proper_filename = '';
            return compact('ext', 'type', 'proper_filename');
        }
        return $types;
        
	}

	/**
	 * Adds Android - .gbl and IOS - .usdz filetype to allowed mimes
	 * @see https://codex.wordpress.org/Plugin_API/Filter_Reference/upload_mimes
	 *
	 * @param array $mimes Mime types keyed by the file extension regex corresponding tothose types. 'swf' and 'exe' removed from full list. 'htm|html' also removed depending on '$user' capabilities.
	 *
	 * @return array
	 */
	public function mime_types(  ) {

        $mimes = [
            'glb' => 'model/gltf-binary',
            'gltf' => 'model/gltf-binary',
            'usdz' => 'model/vnd.pixar.usd',
        ];

        // TODO: apply this on in from version.
        if(AR_TRY_ON_Helper::is_pro_active()) {
            $mimes += [
                'obj' => 'model/obj',
                '3ds' => 'application/x-3ds',
                'step' => 'application/step',
                'stl' => 'application/vnd.ms-pki.stl',
                'fbx' => 'application/octet-stream',
                '3dml' => 'text/vnd.in3d.3dml',
                'dae' => 'application/collada+xml',
                'wrl' => 'model/vrml',
                '3mf' => 'application/vnd.ms-3mfdocument',
                'mtl' => 'model/mtl',
                'bin' => 'application/octet-stream',
                'hdr' => 'image/vnd.radiance',
            ];
        }

        return $mimes;
	}

}
