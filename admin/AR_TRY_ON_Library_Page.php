<?php
/**
 * AR-119: the AtlasAR › 3D Library admin page, and the model picker script the product editor
 * opens instead of the Media Library.
 *
 * The page and the picker are one plain-JavaScript file on WordPress's own React (wp.element,
 * wp.components, wp.apiFetch): no build step, no extra bundle. The preview is the same viewer SDK
 * the shop uses.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON_Admin;

use AR_TRY_ON\AR_TRY_ON_Frontend;
use AR_TRY_ON\AR_TRY_ON_Library;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Library_Page {

	const SLUG   = 'atlas-ar-library';
	const HANDLE = 'atlas-ar-library';

	/** @var string the page's hook suffix */
	private static $hook = '';

	public static function init() {
		add_action( 'atlas_ar_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register' ), 5 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_page' ) );
	}

	public static function menu() {
		self::$hook = (string) add_submenu_page(
			'ar-vr-3d-model-try-on',
			__( '3D Library', 'ar-vr-3d-model-try-on' ),
			__( '3D Library', 'ar-vr-3d-model-try-on' ),
			'upload_files',
			self::SLUG,
			array( __CLASS__, 'render' )
		);
	}

	public static function render() {
		echo '<div class="wrap atlas-ar-library-wrap"><div id="atlas-ar-library"></div></div>';
	}

	/** Register the library script (the page and the product editor's picker use it). */
	public static function register() {
		$js  = ATLAS_AR_PLUGIN_PATH . 'admin/js/atlas-ar-library.js';
		$css = ATLAS_AR_PLUGIN_PATH . 'admin/css/atlas-ar-library.css';
		AR_TRY_ON_Frontend::register_assets(); // the viewer SDK, for the 3D preview
		$deps = array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n', 'wp-hooks' );
		if ( wp_script_is( AR_TRY_ON_Frontend::SDK_HANDLE, 'registered' ) ) {
			$deps[] = AR_TRY_ON_Frontend::SDK_HANDLE;
		}
		wp_register_script( self::HANDLE, ATLAS_AR_PLUGIN_URL . 'admin/js/atlas-ar-library.js', $deps, (string) filemtime( $js ), true );
		wp_set_script_translations( self::HANDLE, 'ar-vr-3d-model-try-on' );
		wp_localize_script(
			self::HANDLE,
			'atlasArLibrary',
			array(
				'maxBytes'   => AR_TRY_ON_Library::max_bytes(),
				'largeBytes' => AR_TRY_ON_Library::large_bytes(),
				'accept'     => '.' . implode( ',.', array_unique( array_merge( ...array_values( AR_TRY_ON_Library::KINDS ) ) ) ),
				'pageUrl'    => admin_url( 'admin.php?page=' . self::SLUG ),
				// AR-121: Optimise.
				'autoOptimise' => (bool) \AR_TRY_ON\AR_TRY_ON_Settings::get( 'general.auto_optimise' ),
				'cloud'        => \AR_TRY_ON\AR_TRY_ON_Cloud::available() && \AR_TRY_ON\AR_TRY_ON_Cloud::connected(),
			)
		);
		wp_register_style( self::HANDLE, ATLAS_AR_PLUGIN_URL . 'admin/css/atlas-ar-library.css', array( 'wp-components' ), (string) filemtime( $css ) );
	}

	/** On the 3D Library page only. */
	public static function enqueue_page( $hook ) {
		if ( self::$hook && $hook === self::$hook ) {
			self::enqueue();
			/**
			 * The 3D Library page is loading: add-ons enqueue their scripts here (AtlasAR Pro's
			 * "Make with AI" uses the atlasAr.library.actions filter).
			 */
			do_action( 'atlas_ar_library_enqueue' );
		}
	}

	/** Load the library script and style (also for the picker on product screens). */
	public static function enqueue() {
		wp_enqueue_script( self::HANDLE );
		wp_enqueue_style( self::HANDLE );
	}
}
