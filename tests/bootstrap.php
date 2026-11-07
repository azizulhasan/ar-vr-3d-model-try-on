<?php
/**
 * AR-177 / AR-176: PHPUnit bootstrap. The tests are integration tests: they load a local WordPress site
 * (with WooCommerce) where this copy of the plugin is installed and active, and work on posts
 * they create and delete themselves. Nothing else on the site is changed; settings are put back.
 *
 * Site: the ATLAS_AR_WP_ROOT environment variable, else D:/laragon/www/tts.
 *
 * @package AR_TRY_ON
 */

$root = getenv( 'ATLAS_AR_WP_ROOT' );
$root = $root ? rtrim( str_replace( '\\', '/', $root ), '/' ) : 'D:/laragon/www/tts';
if ( ! file_exists( $root . '/wp-load.php' ) ) {
	fwrite( STDERR, "No WordPress at {$root}: set ATLAS_AR_WP_ROOT to a local site's folder.\n" );
	exit( 1 );
}

// A request-like environment for wp-load.php on the command line.
$_SERVER['HTTP_HOST']       = isset( $_SERVER['HTTP_HOST'] ) ? $_SERVER['HTTP_HOST'] : 'localhost';
$_SERVER['REQUEST_URI']     = '/';
$_SERVER['REQUEST_METHOD']  = 'GET';
$_SERVER['SERVER_PROTOCOL'] = 'HTTP/1.1';
define( 'WP_USE_THEMES', false );
define( 'ATLAS_AR_TESTS', true );

// Only WooCommerce and the free plugin load (the free plugin is tested on its own): other
// plugins on the site stay out — some ship their own PHPUnit in vendor/, which would clash.
// A pre-initialised hook, the way WordPress's own test suite adds filters before wp-settings.php.
$GLOBALS['wp_filter']['option_active_plugins'][10]['atlas_ar_tests'] = array(
	'function'      => function ( $plugins ) {
		return array_values( array_intersect( (array) $plugins, array( 'woocommerce/woocommerce.php', 'ar-vr-3d-model-try-on/ar-vr-3d-model-try-on.php' ) ) );
	},
	'accepted_args' => 1,
);

// Composer autoloaders register themselves in front of the others; a loader a plugin or
// WordPress registers after PHPUnit's would then serve its own (older) PHPUnit classes. Put the
// loaders that were there before WordPress (PHPUnit's) back in front.
$atlas_ar_loaders = spl_autoload_functions();

require $root . '/wp-load.php';

foreach ( array_reverse( $atlas_ar_loaders ) as $atlas_ar_loader ) {
	spl_autoload_unregister( $atlas_ar_loader );
	spl_autoload_register( $atlas_ar_loader, true, true );
}
unset( $atlas_ar_loaders, $atlas_ar_loader );

if ( ! method_exists( '\AR_TRY_ON\AR_TRY_ON_Library', 'user_can_see' ) ) {
	fwrite( STDERR, "AtlasAR is not active on {$root}: install this copy of the plugin there first.\n" );
	exit( 1 );
}
if ( ! class_exists( 'WooCommerce' ) ) {
	fwrite( STDERR, "WooCommerce is not active on {$root}: the tests need it.\n" );
	exit( 1 );
}
