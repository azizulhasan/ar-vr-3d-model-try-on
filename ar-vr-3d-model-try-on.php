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
 * Plugin Name:       AR VR 3D Model Try On
 * Description:       An augmented reality try-on plugin for wordpress products using ThreeJS,  WebXR.
 * Version:           1.0.2
 * Author:            Azizul Hasan
 * License:           GPL-3.0+
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.txt
 * Text Domain:       ar-vr-3d-model-try-on
 * Domain Path:       /languages
 * Requires PHP:      7.4
 * Requires at least: 5.6
 */

// Absolute path to the WordPress directory.
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

require_once 'vendor/autoload.php';

use AR_TRY_ON\AR_TRY_ON;
use AR_TRY_ON\AR_TRY_ON_Activator;
use AR_TRY_ON\AR_TRY_ON_Deactivate;
use AR_TRY_ON_API\AR_TRY_ON_Api_Routes;


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
	/**
	 * Plugin Directory URL
	 *
	 * @var string
	 * @since 1.2.2
	 */
	define( 'AR_TRY_ON_PLUGIN_URL', trailingslashit( plugin_dir_url( AR_TRY_ON_ROOT_FILE ) ) );
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
			define( 'AR_TRY_ON_VERSION', apply_filters( 'ar_try_on_version', '1.0.2' ) );
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
		if( is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
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
	AR_TRY_ON_Activator::activate();
} );
/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/AR_TRY_ON_Deactivate.php
 */
register_deactivation_hook( __FILE__, function () {
	AR_TRY_ON_Deactivate::deactivate();
} );
