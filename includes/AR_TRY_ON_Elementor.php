<?php
/**
 * AR-129: Elementor support — an "AtlasAR 3D view" widget (the same output as the [atlas_ar]
 * shortcode), and the viewer SDK in Elementor's live preview so a widget dropped in shows its
 * 3D model at once. Loaded only when Elementor asks for widgets: nothing happens without it.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Elementor {

	public static function init() {
		add_action( 'elementor/widgets/register', array( __CLASS__, 'register' ) );
		add_action( 'elementor/preview/enqueue_scripts', array( __CLASS__, 'preview_assets' ) );
	}

	/** @param \Elementor\Widgets_Manager $manager */
	public static function register( $manager ) {
		if ( ! class_exists( '\Elementor\Widget_Base' ) ) {
			return;
		}
		require_once __DIR__ . '/AR_TRY_ON_Elementor_Widget.php';
		$manager->register( new AR_TRY_ON_Elementor_Widget() );
	}

	/** Elementor's preview renders widgets after the page loaded: have the viewer ready. */
	public static function preview_assets() {
		AR_TRY_ON_Frontend::register_assets();
		if ( wp_script_is( AR_TRY_ON_Frontend::SDK_HANDLE, 'registered' ) ) {
			wp_enqueue_script( AR_TRY_ON_Frontend::FRONT_HANDLE );
			wp_enqueue_style( AR_TRY_ON_Frontend::FRONT_HANDLE );
		}
	}
}
