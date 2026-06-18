<?php

namespace AR_TRY_ON;

defined( 'ABSPATH' ) || exit;

class AR_TRY_ON_Constants {

	private static $instance = null;

	public static function instance() {
		if ( self::$instance == null ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function init() {
		self::define_constants();
	}

	private static function is_model_folder_writable() {
		$upload_dir = wp_upload_dir();
		$base_dir   = $upload_dir['basedir'];

		// wp_is_writable() is the WP_Filesystem-aware wrapper for is_writable().
		if ( wp_is_writable( $base_dir ) ) {
			return true;
		}

		return false;
	}

	public static function define_constants() {

		if ( ! defined( 'ATLAS_AR_JS_URL' ) ) {
			$path = plugin_dir_url( __DIR__ ) . 'admin/js';
			define( 'ATLAS_AR_JS_URL', $path );
		}

		if ( ! defined( 'ATLAS_AR_CSS_URL' ) ) {
			$path = plugin_dir_url( __DIR__ ) . 'admin/css';
			define( 'ATLAS_AR_CSS_URL', $path );
		}


		if ( ! defined( 'ATLAS_AR_MODEL_DIR' ) ) {
			/**
			 * ATLAS_AR_MODEL_DIR
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			$upload_dir = wp_upload_dir();
			$base_dir   = $upload_dir['basedir'];
			$tta_dir    = $base_dir . "/atlas_ar";

			define( 'ATLAS_AR_MODEL_DIR', apply_filters( 'atlas_ar_model_dir', $tta_dir . '/' ) );
			if ( self::is_model_folder_writable() ) {
				if ( ! \is_dir( ATLAS_AR_MODEL_DIR ) ) {
					// wp_mkdir_p() is the WordPress wrapper that uses
					// WP_Filesystem when available; it also recursively
					// creates parent dirs (replaces native mkdir(..., true)).
					wp_mkdir_p( ATLAS_AR_MODEL_DIR );
				}
			}
		}

		if ( ! defined( 'ATLAS_AR_MODEL_DIR_URL' ) ) {
			/**
			 * ATLAS_AR_MODEL_DIR_URL
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			$upload_dir = wp_upload_dir();
			$base_dir   = $upload_dir['baseurl'];
			$tta_dir    = $base_dir . "/atlas_ar";
			$should_ssl = \explode( ':', $tta_dir )[0] === 'http';
			if ( ! empty( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] != 'off' ) {
				if ( $should_ssl ) {
					$tta_dir = \str_replace( 'http', 'https', $tta_dir );
				}
			}

			define( 'ATLAS_AR_MODEL_DIR_URL', apply_filters( 'atlas_ar_model_dir_url', $tta_dir . '/' ) );

		}
        

		if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_DIR' ) ) {
			/**
			 * ATLAS_AR_CURRENT_MODEL_DIR
			 *
			 * @var string.
			 * @since 1.0.0
			 */
            $api_name = AR_TRY_ON_Helper::get_integrated_api_name();

			define( 'ATLAS_AR_CURRENT_MODEL_DIR', apply_filters( 'atlas_ar_current_model_dir', ATLAS_AR_MODEL_DIR . $api_name . '/' ) );
		}

		if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_DIR_URL' ) ) {
			/**
			 * ATLAS_AR_CURRENT_MODEL_DIR_URL
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			define( 'ATLAS_AR_CURRENT_MODEL_DIR_URL', apply_filters( 'atlas_ar_current_model_dir_url', ATLAS_AR_MODEL_DIR_URL . $api_name . '/' ) );

		}


        if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_TEMP_DIR' ) ) {
            /**
             * ATLAS_AR_CURRENT_MODEL_TEMP_DIR
             *
             * @var string.
             * @since 1.0.0
             */

            define( 'ATLAS_AR_CURRENT_MODEL_TEMP_DIR', apply_filters( 'atlas_ar_current_model_temp_dir', ATLAS_AR_CURRENT_MODEL_DIR . 'temp/' ) );
        }

        if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL' ) ) {
            /**
             * ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL
             *
             * @var string.
             * @since 1.0.0
             */
            define( 'ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL', apply_filters( 'atlas_ar_current_model_temp_dir_url', ATLAS_AR_CURRENT_MODEL_DIR_URL . 'temp/' ) );

        }

        // ATLAS_AR_COMPRESSION_API_URL moved to Pro (Includes/AR_TRY_ON_Pro_Constants.php)
        // under the AR-61 Yoast-pattern split: server-side compression is Pro-only,
        // so the API URL knob has no consumers in Free and must not ship with Free
        // to wp.org. The ATLAS_AR_DEBUG_MODE constant defined in this plugin's
        // bootstrap (ar-vr-3d-model-try-on.php) still gates Pro's switch between
        // local + production endpoints — Pro reads it via the Requires Plugins
        // dependency. To override the URL for local dev or staging, define
        // ATLAS_AR_COMPRESSION_API_URL in wp-config.php before plugins load.

	}
}
(new AR_TRY_ON_Constants())->init();