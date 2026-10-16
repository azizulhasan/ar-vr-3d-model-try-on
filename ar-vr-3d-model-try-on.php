<?php
/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @since             1.0.0
 * @package           AR_TRY_ON
 *
 * @wordpress-plugin
 * Plugin Name:       3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On
 * Plugin URI:        https://atlasaidev.com/
 * Description:       3D Model Viewer & WordPress AR Plugin lets you upload and display 3D models with built-in AR on iOS & Android—no extra apps needed.
 * Version:           2.3.0
 * Author:            AtlasAiDev
 * Author URI:        https://atlasaidev.com/
 * License:           GPL-3.0+
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.txt
 * Text Domain:       ar-vr-3d-model-try-on
 * Domain Path:       /languages
 * Requires PHP:      7.4
 * Requires at least: 5.6
 */

// Absolute path to the WordPress directory.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
} // Exit if accessed directly

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

require_once 'vendor/autoload.php';

use AR_TRY_ON\AR_TRY_ON;
use AR_TRY_ON\AR_TRY_ON_Activator;
use AR_TRY_ON\AR_TRY_ON_Deactivate;
use AR_TRY_ON\AR_TRY_ON_Lib_AtlasAiDev;
use AR_TRY_ON\AR_TRY_ON_Helper;
use AR_TRY_ON\AR_TRY_ON_Admin_Notice;

// Load Admin Notice System
require_once plugin_dir_path( __FILE__ ) . 'includes/AR_TRY_ON_Admin_Notice.php';

remove_action( 'shutdown', 'wp_ob_end_flush_all', 1 );

/*
 * Freemius SDK and the Free-side license bootstrap were removed in
 * AR-61 §1.1 (the Yoast-pattern split). The free plugin has no license
 * check, no premium-version handshake, and no trial counter — it is
 * fully functional standalone for every user.
 *
 * The Pro plugin (ar-vr-3d-model-try-on-pro) keeps its own copy of the
 * Freemius SDK and handles all license / subscription state there. No
 * Pro upgrade ever requires this Free plugin to "talk to" Freemius.
 *
 * Historical implementations of av3mto_fs() / fs_dynamic_init() that
 * used to live in this block are preserved in git history; recover
 * with `git show 7d7848a^:ar-vr-3d-model-try-on.php` (the commit just
 * before AR-61 §1.1 work began) if ever needed.
 */

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */

if ( ! defined( 'ATLAS_AR_NONCE' ) ) {

	define( 'ATLAS_AR_NONCE', 'ATLAS_AR_NONCE' );
}

if ( ! defined( 'ATLAS_AR_TEXT_DOMAIN' ) ) {

	define( 'ATLAS_AR_TEXT_DOMAIN', 'ar-vr-3d-model-try-on' );
}

if ( ! defined( 'ATLAS_AR_ROOT_FILE' ) ) {

	define( 'ATLAS_AR_ROOT_FILE', __FILE__ );
}

if ( ! defined( 'ATLAS_AR_ROOT_FILE_NAME' ) ) {
	$atlas_ar_path = explode( DIRECTORY_SEPARATOR, ATLAS_AR_ROOT_FILE );
	$atlas_ar_file = end( $atlas_ar_path );
	define( 'ATLAS_AR_ROOT_FILE_NAME', $atlas_ar_file );
	unset( $atlas_ar_path, $atlas_ar_file );
}

if ( ! defined( 'ATLAS_AR_ADMIN_PATH' ) ) {

	define( 'ATLAS_AR_ADMIN_PATH', plugin_dir_url( __FILE__ ) . 'admin/' );
}

if ( ! defined( 'ATLAS_AR_DEBUG_MODE' ) ) {

	define( 'ATLAS_AR_DEBUG_MODE', 0 );
}

if ( ! defined( 'ATLAS_AR_PLUGIN_URL' ) ) {
	$atlas_ar_https        = 'https://playground.wordpress.net';
	$atlas_ar_http_preview = 'http://playground.wordpress.net';

	$atlas_ar_site_url = plugin_dir_url( ATLAS_AR_ROOT_FILE );
	$atlas_ar_site_url = str_replace( $atlas_ar_http_preview, $atlas_ar_https, $atlas_ar_site_url );
	/**
	 * Plugin Directory URL
	 *
	 * @var string
	 * @since 1.2.2
	 */
	define( 'ATLAS_AR_PLUGIN_URL', trailingslashit( $atlas_ar_site_url ) );
	unset( $atlas_ar_https, $atlas_ar_http_preview, $atlas_ar_site_url );
}

if ( ! defined( 'ATLAS_AR_PLUGIN_PATH' ) ) {
	/**
	 * Plugin Directory PATH
	 *
	 * @var string
	 * @since 1.2.2
	 */
	define( 'ATLAS_AR_PLUGIN_PATH', trailingslashit( plugin_dir_path( ATLAS_AR_ROOT_FILE ) ) );
}

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
class AR_TRY_ON_Init {

	public function __construct() {
		if ( ! defined( 'ATLAS_AR_VERSION' ) ) {
			define( 'ATLAS_AR_VERSION', apply_filters( 'ATLAS_AR_version', '2.3.0' ) );
		}

		if ( ! defined( 'ATLAS_AR_PLUGIN_NAME' ) ) {
			define( 'ATLAS_AR_PLUGIN_NAME', apply_filters( 'ATLAS_AR_plugin_name', 'AtlasAR' ) );
		}

		$this->run();
	}

	public function run() {
		$plugin = new AR_TRY_ON();
		$plugin->run();
		//HPOS compatibility
		if ( is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
			add_action( 'before_woocommerce_init', function () {
				if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
					\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
				}
			} );
		}
	}
}

function atlas_ar_run() {
	new AR_TRY_ON_Init();
//	if ( ! defined( 'TTA_PRO_PLUGIN_PATH' ) ) {
		AR_TRY_ON_Lib_AtlasAiDev::instance()->init();
//	}

	// AR-121: model optimisation is the Optimise module (AtlasAR.tools in the browser, AtlasAR Cloud
	// for big files) in the 3D Library; the old compression system is gone.

	// AR-116: the 3D Library and the shop front end on the viewer SDK (try-on included; the old
	// try-on runtime and its routes are no longer loaded).
	\AR_TRY_ON\AR_TRY_ON_Library::register();
	\AR_TRY_ON\AR_TRY_ON_Frontend::init();
	// AR-133: AtlasAR Cloud checking this site (moving it to another email). atlas_ar_run() runs on
	// `init`, before any output: answered here, then the request ends.
	\AR_TRY_ON\AR_TRY_ON_Cloud::answer_verify();
	\AR_TRY_ON\AR_TRY_ON_Elementor::init(); // AR-129: widget + live preview (only acts when Elementor runs)
	add_action( 'rest_api_init', array( '\ATLAS_AR_API\AR_TRY_ON_Library_Routes', 'register' ) );
	add_action( 'rest_api_init', array( '\ATLAS_AR_API\AR_TRY_ON_Admin_Routes', 'register' ) );
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		\AR_TRY_ON\AR_TRY_ON_CLI::register(); // AR-126: wp atlas-ar …
	}
	if ( is_admin() ) {
		// AR-120: dashboard + setup wizard, 3D Library page, product panel.
		\AR_TRY_ON_Admin\AR_TRY_ON_Dashboard::init();
		\AR_TRY_ON_Admin\AR_TRY_ON_Library_Page::init();
		\AR_TRY_ON_Admin\AR_TRY_ON_Product_Panel::init();
	}

	// Initialize Admin Notice System (v1.8.0+)
	AR_TRY_ON_Admin_Notice::instance();


	/**
	 * Action: atlas_ar_loaded
	 *
	 * Fires at the end of Free's `init`-priority bootstrap, after every
	 * Free subsystem (main class, AtlasAiDev lib, REST routes, Tryon
	 * runtime, Admin Notice system) has been wired up. This is the
	 * documented hook Pro should use to plug itself into Free —
	 * preferred over class_exists() / is_pro_active() polling because
	 * it gives Pro a predictable timing point that arrives after every
	 * Free hook is in place.
	 *
	 * Pro listens with:
	 *
	 *   add_action( 'atlas_ar_loaded', array( $this, 'init' ) );
	 *
	 * The action fires unconditionally (Free always emits it), so Pro's
	 * presence is not required for the action to exist — third-party
	 * add-ons can listen too. AR-61 §1.1 Phase 3.
	 */
	do_action( 'atlas_ar_loaded' );
}

/*
 * The custom `every_five_minutes` cron schedule was removed (AR-69).
 * It existed only for the old compression-queue cron, which no longer
 * runs — nothing schedules an `every_five_minutes` event anymore
 * (AR_TRY_ON_Deactivate still defensively unschedules the legacy
 * `ar_try_on_process_compression_queue` hook, which does not depend on
 * this schedule being registered).
 *
 * Its `__()` display string was evaluated whenever `cron_schedules` was
 * applied — which can happen before `init` — triggering the WordPress
 * 6.7 "translation loading … triggered too early" notice for this text
 * domain. Removing the unused schedule removes the notice.
 */

//add_action( 'wp', [ $this, 'add_frontend_ar_button' ] );

add_action( 'init', function () {
    atlas_ar_run();
    // AR-62 §3h: daily sweep for orphan temp generation files.
    if ( ! wp_next_scheduled( 'atlas_ar_sweep_orphan_temp_files' ) ) {
        wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'atlas_ar_sweep_orphan_temp_files' );
    }
} );
add_action( 'atlas_ar_sweep_orphan_temp_files', array( 'AR_TRY_ON\\AR_TRY_ON_Helper', 'sweep_orphan_temp_files' ) );
/**
 * The code that runs during plugin activation.
 * This action is documented in includes/AR_TRY_ON_Activator.php
 */
register_activation_hook( __FILE__, function () {
	// No "renew": re-activating used to reset every saved setting to the
	// defaults. Defaults are still written when nothing is saved yet, and
	// the demo post is still seeded when missing (AR-72).
	AR_TRY_ON_Activator::activate();
	\AR_TRY_ON_Admin\AR_TRY_ON_Dashboard::on_activation();
} );
/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/AR_TRY_ON_Deactivate.php
 */
register_deactivation_hook( __FILE__, function () {
	AR_TRY_ON_Deactivate::deactivate();
} );

// The `atlas/ar-shortcode` block is registered on `init` by
// AR_TRY_ON_Admin::register_block() — not here at file load, which ran
// before `init` (AR-71).

// AR-116: [atlas_ar] is registered by AR_TRY_ON_Frontend (the viewer SDK draws it).

