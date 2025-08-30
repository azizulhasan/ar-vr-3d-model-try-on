<?php

namespace AR_TRY_ON;

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

		if ( is_writable( $base_dir ) ) {
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
			 * Custom Font Directory.
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			$upload_dir = wp_upload_dir();
			$base_dir   = $upload_dir['basedir'];
			$tta_dir    = $base_dir . "/AtlasAR";

			define( 'ATLAS_AR_MODEL_DIR', apply_filters( 'atlas_ar_model_dir', $tta_dir . '/' ) );
			if ( self::is_model_folder_writable() ) {
				if ( ! \is_dir( ATLAS_AR_MODEL_DIR ) ) {
					mkdir( ATLAS_AR_MODEL_DIR, 0777, true );
					// Protect files from public access.
					// $content = 'deny from all';
					// $fp = fopen(ATLAS_AR_MODEL_DIR . '.htaccess', 'wb');
					// fwrite($fp, $content);
					// fclose($fp);
				}
			}
		}

		if ( ! defined( 'ATLAS_AR_MODEL_DIR_URL' ) ) {
			/**
			 * Custom Font Directory.
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			$upload_dir = wp_upload_dir();
			$base_dir   = $upload_dir['baseurl'];
			$tta_dir    = $base_dir . "/ATLASAR";
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
			 * Custom Font Directory.
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			define( 'ATLAS_AR_CURRENT_MODEL_DIR', apply_filters( 'atlas_ar_current_model_dir', ATLAS_AR_MODEL_DIR . 'gtts/' ) );
		}

		if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_DIR_URL' ) ) {
			/**
			 * Custom Font Directory.
			 *
			 * @var string.
			 * @since 1.0.0
			 */
			define( 'ATLAS_AR_CURRENT_MODEL_DIR_URL', apply_filters( 'atlas_ar_current_model_dir_url', ATLAS_AR_MODEL_DIR_URL . 'gtts/' ) );

		}

	}
}
$constants = new AR_TRY_ON_Constants();