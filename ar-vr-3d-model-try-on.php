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
 * @package           ATLAS_AR
 *
 * @wordpress-plugin
 * Plugin Name:       3D Viewer – 3D Model Viewer – Augmented Reality – Virtual Try On
 * Plugin URI:        https://atlasaidev.com/
 * Description:       3D Model Viewer & WordPress AR Plugin lets you upload and display 3D models with built-in AR on iOS & Android—no extra apps needed.
 * Version:           2.1.0
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

use ATLAS_AR\ATLAS_AR;
use ATLAS_AR\ATLAS_AR_Activator;
use ATLAS_AR\ATLAS_AR_Deactivate;
use ATLAS_AR\ATLAS_AR_Compression;
use ATLAS_AR\ATLAS_AR_Compression_DB;
use ATLAS_AR\ATLAS_AR_Tryon;
use ATLAS_AR_API\ATLAS_AR_Api_Routes;
use ATLAS_AR_API\ATLAS_AR_Compression_Routes;
use ATLAS_AR_API\ATLAS_AR_Tryon_Routes;
use ATLAS_AR\ATLAS_AR_Lib_AtlasAiDev;
use ATLAS_AR\ATLAS_AR_Helper;
use ATLAS_AR\ATLAS_AR_Admin_Notice;

/*
 * Backward-compatibility shim (AR-66, v2.2.0).
 *
 * v2.2.0 renamed every PHP namespace / class prefix from `AR_TRY_ON` to
 * `ATLAS_AR`. Code outside this plugin — most importantly an OLDER copy of
 * the Pro plugin that can still be active during the update window — may
 * reference the legacy `AR_TRY_ON\…` names (e.g. `AR_TRY_ON\AR_TRY_ON_Helper`).
 * This fallback autoloader transparently aliases any requested `…AR_TRY_ON…`
 * class to its renamed `…ATLAS_AR…` counterpart, so no fatal occurs until both
 * plugins are on the new naming. Appended AFTER Composer's autoloader, so
 * renamed classes load normally and this only fires for the legacy names.
 */
spl_autoload_register( function ( $class ) {
	if ( false === strpos( $class, 'AR_TRY_ON' ) ) {
		return;
	}
	$new = str_replace( 'AR_TRY_ON', 'ATLAS_AR', $class );
	if ( $new !== $class && ( class_exists( $new ) || interface_exists( $new ) || trait_exists( $new ) ) ) {
		class_alias( $new, $class );
	}
} );

// Load Admin Notice System
require_once plugin_dir_path( __FILE__ ) . 'includes/ATLAS_AR_Admin_Notice.php';

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
class ATLAS_AR_Init {

	public function __construct() {
		if ( ! defined( 'ATLAS_AR_VERSION' ) ) {
			define( 'ATLAS_AR_VERSION', apply_filters( 'ATLAS_AR_version', '2.1.0' ) );
		}

		if ( ! defined( 'ATLAS_AR_PLUGIN_NAME' ) ) {
			define( 'ATLAS_AR_PLUGIN_NAME', apply_filters( 'ATLAS_AR_plugin_name', 'AtlasAR' ) );
		}

		$this->run();
	}

	public function run() {
		$plugin = new ATLAS_AR();
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
	new ATLAS_AR_Init();
//	if ( ! defined( 'TTA_PRO_PLUGIN_PATH' ) ) {
		ATLAS_AR_Lib_AtlasAiDev::instance()->init();
//	}
	new ATLAS_AR_Api_Routes();

	// Initialize Compression feature (v1.8.0+)
    ATLAS_AR_Compression::init();


    // Register Compression REST API routes
	add_action( 'rest_api_init', function() {
		$compression_routes = new ATLAS_AR_Compression_Routes();
		$compression_routes->register_routes();
	} );

	// Initialize Try-On feature (v1.10.0+) — face try-on, lazy-loaded.
	$atlas_ar_tryon = new ATLAS_AR_Tryon( ATLAS_AR_VERSION );
	$atlas_ar_tryon->register();

	add_action( 'rest_api_init', function() {
		$tryon_routes = new ATLAS_AR_Tryon_Routes();
		$tryon_routes->register_routes();
	} );

	// Initialize Admin Notice System (v1.8.0+)
	ATLAS_AR_Admin_Notice::instance();

	// Admin action to manually create compression database tables.
	add_action( 'admin_init', function() {
		// Read-only superglobal access guarded by capability + nonce checks below;
		// the GET flag itself carries no untrusted payload — just toggles the action.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verified on the next line.
		if ( ! isset( $_GET['ar_create_compression_tables'] ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Verified explicitly below.
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'ar_create_compression_tables' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		ATLAS_AR_Compression_DB::init();
		wp_safe_redirect( admin_url( 'admin.php?page=ar-vr-3d-model-try-on&compression_tables_created=1' ) );
		exit;
	} );

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

// Add custom cron schedule for compression queue processing
add_filter( 'cron_schedules', function( $schedules ) {
	$schedules['every_five_minutes'] = array(
		'interval' => 300, // 5 minutes in seconds
		'display'  => __( 'Every 5 Minutes', 'ar-vr-3d-model-try-on' ),
	);
	return $schedules;
} );


//add_action( 'wp', [ $this, 'add_frontend_ar_button' ] );

add_action( 'init', function () {
    atlas_ar_run();
    // AR-62 §3h: daily sweep for orphan temp generation files.
    if ( ! wp_next_scheduled( 'atlas_ar_sweep_orphan_temp_files' ) ) {
        wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'atlas_ar_sweep_orphan_temp_files' );
    }
} );
add_action( 'atlas_ar_sweep_orphan_temp_files', array( 'ATLAS_AR\\ATLAS_AR_Helper', 'sweep_orphan_temp_files' ) );
/**
 * The code that runs during plugin activation.
 * This action is documented in includes/ATLAS_AR_Activator.php
 */
register_activation_hook( __FILE__, function () {
	ATLAS_AR_Activator::activate(1);
} );
/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/ATLAS_AR_Deactivate.php
 */
register_deactivation_hook( __FILE__, function () {
	ATLAS_AR_Deactivate::deactivate();
} );


register_block_type( 'atlas/ar-shortcode', array(
    'editor_script' => 'atlas-ar-block',
    'editor_style'  => 'atlas-ar-block-editor',
) );

/**
 *
 * Create short code for qr code.
 * Example [atlasvoice]
 *
 * @param $atts
 *
 * @return string
 */
function atlas_ar_create_shortcode( $atts ) {

    return ATLAS_AR_Helper::create_shortcode( $atts );

}

add_shortcode( 'atlas_ar', 'atlas_ar_create_shortcode' );


// Filter to allow shortcodes in HTML tags
add_filter( 'do_shortcode_tag', 'atlas_ar_allow_shortcode_in_html_tag', 10, 4 );
function atlas_ar_allow_shortcode_in_html_tag( $output, $tag, $attr, $m ) {
    if ( $tag == 'atlas_ar' && ! empty( $attr ) ) {
        if ( isset( $attr['position'] ) && $attr['position'] == 'after' ) {
            $content = ATLAS_AR_Helper::create_shortcode( $attr,  $m[5] ) . $m[5];
        } else {
            $content = $m[5] . ATLAS_AR_Helper::create_shortcode( $attr, $m[5] );
        }

        //Get the content wrapped by the shortcode.
        return $content;
    }

    return $output;
}


