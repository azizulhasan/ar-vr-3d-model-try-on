<?php
/**
 * AR-120: the AtlasAR dashboard page and setup wizard (?page=ar-vr-3d-model-try-on&setup=1),
 * and the shared admin script (atlas-ar-ui.js) the product panel uses too.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON_Admin; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

use AR_TRY_ON\AR_TRY_ON_Frontend;
use AR_TRY_ON\AR_TRY_ON_Settings;
use ATLAS_AR_API\AR_TRY_ON_Admin_Routes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Dashboard {

	const SLUG     = 'ar-vr-3d-model-try-on';
	const UI       = 'atlas-ar-ui';
	const HANDLE   = 'atlas-ar-dashboard';
	const REDIRECT = 'atlas_ar_setup_redirect';
	/** AR-158: the version the wizard was offered in (set once, on activation or the first admin page after an update). */
	const OFFERED  = 'atlas_ar_setup_offered';

	/** @var bool the page root was printed (old Pro 3.x registers the same page again) */
	private static $rendered = false;

	public static function init() {
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register' ), 4 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'maybe_redirect' ) );
		add_filter( 'admin_body_class', array( __CLASS__, 'body_class' ) );
	}

	/** AR-128: the dashboard and the 3D Library are full-window app screens (atlas-ar-admin.css). */
	public static function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && in_array( $screen->id, array( 'toplevel_page_' . self::SLUG, 'atlasar_page_' . AR_TRY_ON_Library_Page::SLUG ), true ) ) {
			$classes .= ' atlas-ar-fullscreen';
		}
		return $classes;
	}

	/** The page's URL (the wizard: setup=1). */
	public static function url( $setup = false ) {
		return admin_url( 'admin.php?page=' . self::SLUG . ( $setup ? '&setup=1' : '' ) );
	}

	/**
	 * Print the app's root. Also reached through old AtlasAR Pro 3.x, which registers this page
	 * again with the same callback: printed once.
	 */
	public static function render() {
		if ( self::$rendered ) {
			return;
		}
		self::$rendered = true;
		echo '<div class="wrap atlas-ar-wrap"><div id="atlas-ar-dashboard"></div><noscript>' . esc_html__( 'The AtlasAR dashboard needs JavaScript.', 'ar-vr-3d-model-try-on' ) . '</noscript></div>';
	}

	public static function register() {
		$ver = function ( $rel ) {
			$path = ATLAS_AR_PLUGIN_PATH . $rel;
			return file_exists( $path ) ? (string) filemtime( $path ) : ATLAS_AR_VERSION;
		};
		AR_TRY_ON_Frontend::register_assets(); // viewer SDK for previews
		$sdk = wp_script_is( AR_TRY_ON_Frontend::SDK_HANDLE, 'registered' ) ? array( AR_TRY_ON_Frontend::SDK_HANDLE ) : array();
		wp_register_script( self::UI, ATLAS_AR_PLUGIN_URL . 'admin/js/atlas-ar-ui.js', array_merge( array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n', 'wp-hooks' ), $sdk ), $ver( 'admin/js/atlas-ar-ui.js' ), true );
		wp_set_script_translations( self::UI, 'ar-vr-3d-model-try-on' );
		wp_register_script( self::HANDLE, ATLAS_AR_PLUGIN_URL . 'admin/js/atlas-ar-dashboard.js', array( self::UI, AR_TRY_ON_Library_Page::HANDLE ), $ver( 'admin/js/atlas-ar-dashboard.js' ), true );
		wp_set_script_translations( self::HANDLE, 'ar-vr-3d-model-try-on' );
		wp_register_style( self::UI, ATLAS_AR_PLUGIN_URL . 'admin/css/atlas-ar-admin.css', array( 'wp-components', AR_TRY_ON_Library_Page::HANDLE ), $ver( 'admin/css/atlas-ar-admin.css' ) );
	}

	public static function enqueue_page( $hook ) {
		if ( 'toplevel_page_' . self::SLUG !== $hook ) {
			return;
		}
		$boot                 = AR_TRY_ON_Admin_Routes::boot();
		$boot['dashboardUrl'] = self::url();
		$boot['libraryUrl']   = admin_url( 'admin.php?page=' . AR_TRY_ON_Library_Page::SLUG );
		// AR-158: the wizard's last screen: our other plugins and the Plugins page.
		$boot['pluginsUrl']   = admin_url( 'admin.php?page=atlas-ar-other-plugins' );
		$boot['suggested']    = AR_TRY_ON_Admin::suggested_plugins( array( 'text-to-audio', 'ai-workflow-automation-ai-agent-hub', 'smart-local-ai' ) );
		add_thickbox(); // WordPress's own plugin details window (Install)
		wp_localize_script( self::UI, 'atlasArAdmin', $boot );
		wp_enqueue_script( self::HANDLE );
		wp_enqueue_style( self::UI );
		/** Lets AtlasAR Pro add its dashboard parts (wp.hooks filters, see atlas-ar-ui.js). */
		do_action( 'atlas_ar_dashboard_enqueue' );
	}

	/** Called on activation: open the wizard once on a site that has not finished it. */
	public static function on_activation() {
		update_option( self::OFFERED, ATLAS_AR_VERSION, true );
		if ( ! AR_TRY_ON_Settings::get( 'general.wizard_done' ) ) {
			set_transient( self::REDIRECT, 1, MINUTE_IN_SECONDS * 5 );
		}
	}

	public static function maybe_redirect() {
		// AR-158: an update (from 2.x, or a zip uploaded over the old folder) does not run the
		// activation hook: offer the wizard once there too. Deleting the plugin resets both
		// (uninstall.php), so a reinstall opens the wizard again.
		if ( false === get_option( self::OFFERED ) ) {
			self::on_activation();
		}
		if ( ! get_transient( self::REDIRECT ) ) {
			return;
		}
		delete_transient( self::REDIRECT );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- presence check of core's bulk-activation flag only.
		if ( wp_doing_ajax() || is_network_admin() || isset( $_GET['activate-multi'] ) || ! current_user_can( 'manage_options' ) || AR_TRY_ON_Settings::get( 'general.wizard_done' ) ) {
			return;
		}
		wp_safe_redirect( self::url( true ) );
		exit;
	}
}
