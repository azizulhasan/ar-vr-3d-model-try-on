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
 * Plugin Name:       3D Viewer – 3D Model Viewer – WordPress Augmented Reality
 * Plugin URI:        https://atlasaidev.com/
 * Description:       3D Model Viewer & WordPress AR Plugin lets you upload and display 3D models with built-in AR on iOS & Android—no extra apps needed.
 * Version:           1.5.2
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
use AR_TRY_ON_API\AR_TRY_ON_Api_Routes;
use AR_TRY_ON\AR_TRY_ON_Lib_AtlasAiDev;
use AR_TRY_ON\AR_TRY_ON_Helper;



if ( ! function_exists( 'av3mto_fs' ) ) {
	// Create a helper function for easy SDK access.
	function av3mto_fs() {
		global $av3mto_fs;

		if ( ! isset( $av3mto_fs ) ) {
			// Activate multisite network integration.
			if ( ! defined( 'WP_FS__PRODUCT_18159_MULTISITE' ) ) {
				define( 'WP_FS__PRODUCT_18159_MULTISITE', true );
			}

			// Include Freemius SDK.
			require_once dirname( __FILE__ ) . '/vendor/freemius/start.php';
			$av3mto_fs = fs_dynamic_init( array(
				'id'                  => '18159',
				'slug'                => 'ar-vr-3d-model-try-on',
				'type'                => 'plugin',
				'public_key'          => 'pk_28cf95aad28914518f7065b97bbe4',
				'is_premium'          => false,
				'has_addons'          => false,
				'has_paid_plans'      => false,
				'menu'                => array(
					'slug'           => 'ar-vr-3d-model-try-on',
					'first-path'     => 'admin.php?page=ar-vr-3d-model-try-on',
					'support' => false,
					'contact' => true,
					'account' => true,
				),
			) );
		}

		return $av3mto_fs;
	}

	// Init Freemius.
	av3mto_fs();
	// Signal that SDK was initiated.
	do_action( 'av3mto_fs_loaded' );
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */

if ( ! defined( 'AR_TRY_ON_NONCE' ) ) {

	define( 'AR_TRY_ON_NONCE', 'AR_TRY_ON_NONCE' );
}

if ( ! defined( 'AR_TRY_ON_TEXT_DOMAIN' ) ) {

	define( 'AR_TRY_ON_TEXT_DOMAIN', 'ar-vr-3d-model-try-on' );
}

if ( ! defined( 'AR_TRY_ON_ROOT_FILE' ) ) {

	define( 'AR_TRY_ON_ROOT_FILE', __FILE__ );
}

if ( ! defined( 'AR_TRY_ON_ROOT_FILE_NAME' ) ) {
	$path = explode( DIRECTORY_SEPARATOR, AR_TRY_ON_ROOT_FILE );
	$file = end( $path );
	define( 'AR_TRY_ON_ROOT_FILE_NAME', $file );
}

if ( ! defined( 'AR_TRY_ON_ADMIN_PATH' ) ) {

	define( 'AR_TRY_ON_ADMIN_PATH', plugin_dir_url( __FILE__ ) . 'admin/' );
}

if ( ! defined( 'AR_TRY_ON_DEBUG_MODE' ) ) {

	define( 'AR_TRY_ON_DEBUG_MODE', 0 );
}


if ( ! defined( 'AR_TRY_ON_PLUGIN_URL' ) ) {
	$url         = 'https://playground.wordpress.net';
	$url_preview = 'http://playground.wordpress.net';

	$site_url = plugin_dir_url( AR_TRY_ON_ROOT_FILE );
	$site_url = str_replace( $url_preview, $url, $site_url );
	/**
	 * Plugin Directory URL
	 *
	 * @var string
	 * @since 1.2.2
	 */
	define( 'AR_TRY_ON_PLUGIN_URL', trailingslashit( $site_url ) );
}

if ( ! defined( 'AR_TRY_ON_PLUGIN_PATH' ) ) {
	/**
	 * Plugin Directory PATH
	 *
	 * @var string
	 * @since 1.2.2
	 */
	define( 'AR_TRY_ON_PLUGIN_PATH', trailingslashit( plugin_dir_path( AR_TRY_ON_ROOT_FILE ) ) );
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
		if ( ! defined( 'AR_TRY_ON_VERSION' ) ) {
			define( 'AR_TRY_ON_VERSION', apply_filters( 'ar_try_on_version', '1.5.2' ) );
		}

		if ( ! defined( 'AR_TRY_ON_PLUGIN_NAME' ) ) {
			define( 'AR_TRY_ON_PLUGIN_NAME', apply_filters( 'ar_try_on_plugin_name', 'AR Try-On' ) );
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


function ar_try_on_run() {
	new AR_TRY_ON_Init();
//	if ( ! defined( 'TTA_PRO_PLUGIN_PATH' ) ) {
		AR_TRY_ON_Lib_AtlasAiDev::instance()->init();
//	}
	new AR_TRY_ON_Api_Routes();
}


//add_action( 'wp', [ $this, 'add_frontend_ar_button' ] );

add_action( 'init', function () {
	ar_try_on_run();
} );
/**
 * The code that runs during plugin activation.
 * This action is documented in includes/AR_TRY_ON_Activator.php
 */
register_activation_hook( __FILE__, function () {
	AR_TRY_ON_Activator::activate(1);
} );
/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/AR_TRY_ON_Deactivate.php
 */
register_deactivation_hook( __FILE__, function () {
	AR_TRY_ON_Deactivate::deactivate();
} );


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

    return AR_TRY_ON_Helper::create_shortcode( $atts );

}

add_shortcode( 'atlas_ar', 'atlas_ar_create_shortcode' );


// Filter to allow shortcodes in HTML tags
add_filter( 'do_shortcode_tag', 'atlas_ar_allow_shortcode_in_html_tag', 10, 4 );
function atlas_ar_allow_shortcode_in_html_tag( $output, $tag, $attr, $m ) {
    if ( $tag == 'atlas_ar' && ! empty( $attr ) ) {
        if ( isset( $attr['position'] ) && $attr['position'] == 'after' ) {
            $content = AR_TRY_ON_Helper::create_shortcode( $attr,  $m[5] ) . $m[5];
        } else {
            $content = $m[5] . AR_TRY_ON_Helper::create_shortcode( $attr, $m[5] );
        }

        //Get the content wrapped by the shortcode.
        return $content;
    }

    return $output;
}