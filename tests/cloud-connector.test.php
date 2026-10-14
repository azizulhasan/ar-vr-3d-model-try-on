<?php
/**
 * AR-84: AtlasAR Cloud connector — end-to-end + attacker tests, run against a real WordPress and a
 * real local AtlasAR Cloud service (never shipped: gulp excludes tests/).
 *
 *   ATLAS_AR_TEST_KEY_FILE=…  ATLAS_AR_TEST_KEY_B_FILE=…  ATLAS_AR_TEST_GLB=…  \
 *     wp eval-file wp-content/plugins/ar-vr-3d-model-try-on/tests/cloud-connector.test.php
 *
 * Needs define( 'ATLAS_AR_SERVICE_URL', 'http://127.0.0.1:8765' ) and the service + worker running.
 * Everything it creates (users, posts, attachments, options) is removed at the end.
 */

use AR_TRY_ON\AR_TRY_ON_Cloud;

defined( 'ABSPATH' ) || exit;

global $atlas_t; // eval-file runs this file inside a function.
$atlas_t = array( 'pass' => 0, 'fail' => 0, 'cleanup' => array() );

function atlas_ok( $cond, $name, $detail = '' ) {
	global $atlas_t;
	if ( $cond ) {
		$atlas_t['pass']++;
		echo "  ok   {$name}\n";
	} else {
		$atlas_t['fail']++;
		echo "  FAIL {$name}" . ( '' !== $detail ? " — {$detail}" : '' ) . "\n";
	}
}

function atlas_rest( $method, $route, $params = array() ) {
	$request = new WP_REST_Request( $method, '/ar_try_on/v1/' . ltrim( $route, '/' ) );
	foreach ( $params as $k => $v ) {
		'GET' === $method ? $request->set_query_params( array_merge( $request->get_query_params(), array( $k => $v ) ) ) : $request->set_param( $k, $v );
	}
	if ( 'GET' !== $method ) {
		$request->set_header( 'Content-Type', 'application/json' );
		$request->set_body( wp_json_encode( $params ) );
	}
	$response = rest_do_request( $request );
	return array( $response->get_status(), rest_get_server()->response_to_data( $response, false ), $response );
}

function atlas_as( $user_id ) {
	wp_set_current_user( $user_id );
	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_atlas\\_ar\\_rl\\_%' OR option_name LIKE '\\_transient\\_timeout\\_atlas\\_ar\\_rl\\_%'" ); // Fresh rate-limit windows per step.
	wp_cache_flush();
}

function atlas_user( $role ) {
	global $atlas_t;
	$id                         = wp_insert_user( array( 'user_login' => 'ar84_' . $role . '_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => $role ) );
	$atlas_t['cleanup']['users'][] = $id;
	return $id;
}

function atlas_attachment( $path, $name, $mime, $parent = 0 ) {
	global $atlas_t;
	$uploads = wp_upload_dir();
	$dest    = trailingslashit( $uploads['path'] ) . wp_unique_filename( $uploads['path'], $name );
	copy( $path, $dest );
	$id = wp_insert_attachment( array( 'post_mime_type' => $mime, 'post_title' => $name, 'post_status' => 'inherit' ), $dest, $parent );
	$atlas_t['cleanup']['attachments'][] = $id;
	return $id;
}

$key   = trim( (string) file_get_contents( getenv( 'ATLAS_AR_TEST_KEY_FILE' ) ) );
$key_b = trim( (string) file_get_contents( getenv( 'ATLAS_AR_TEST_KEY_B_FILE' ) ) );
$glb   = getenv( 'ATLAS_AR_TEST_GLB' );
if ( ! preg_match( AR_TRY_ON_Cloud::KEY_PATTERN, $key ) || ! is_file( $glb ) ) {
	WP_CLI::error( 'Set ATLAS_AR_TEST_KEY_FILE, ATLAS_AR_TEST_KEY_B_FILE and ATLAS_AR_TEST_GLB.' );
}
$saved_option = get_option( AR_TRY_ON_Cloud::OPTION, null ); // Restored at the end.
delete_option( AR_TRY_ON_Cloud::OPTION );

$admin  = atlas_user( 'administrator' );
$editor = atlas_user( 'editor' );
$author = atlas_user( 'author' );
$sub    = atlas_user( 'subscriber' );

echo "\n1. Availability and existing users\n";
atlas_as( $admin );
add_filter( 'atlas_ar_cloud_base_url', '__return_empty_string' );
list( $s, $d ) = atlas_rest( 'GET', 'cloud/status' );
atlas_ok( 200 === $s && false === $d['available'], 'no service URL: connector reports unavailable (UI hidden)' );
list( $s, $d ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
atlas_ok( 503 === $s && 'cloud_unavailable' === $d['code'], 'no service URL: connect refuses, nothing is sent', "$s" );
remove_filter( 'atlas_ar_cloud_base_url', '__return_empty_string' );
add_filter( 'atlas_ar_cloud_base_url', function () { return 'http://cloud.example.com'; } );
atlas_ok( '' === AR_TRY_ON_Cloud::base_url(), 'plain http is refused for a non-local service URL' );
remove_all_filters( 'atlas_ar_cloud_base_url' );
list( $s, $d ) = atlas_rest( 'GET', 'cloud/status' );
atlas_ok( true === $d['available'] && false === $d['connected'], 'with the dev URL: available, not connected (no request made)' );
$routes = rest_get_server()->get_routes();
atlas_ok( isset( $routes['/ar_try_on/v1/compression/status/(?P<post_id>\d+)'], $routes['/ar_try_on/v1/settings'] ), 'existing routes still registered' );

echo "\n2. Who may do what\n";
atlas_as( 0 );
list( $s ) = atlas_rest( 'GET', 'cloud/status' );
atlas_ok( 401 === $s, 'signed out: status 401' );
list( $s ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
atlas_ok( 401 === $s, 'signed out: connect 401' );
foreach ( array( 'subscriber' => $sub, 'editor' => $editor, 'author' => $author ) as $role => $uid ) {
	atlas_as( $uid );
	list( $s ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
	atlas_ok( 403 === $s, "{$role}: cannot connect (403)", "$s" );
	list( $s ) = atlas_rest( 'DELETE', 'cloud/connect' );
	atlas_ok( 403 === $s, "{$role}: cannot disconnect (403)", "$s" );
}

echo "\n3. Connecting\n";
atlas_as( $admin );
list( $s, $d ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key ) );
atlas_ok( 400 === $s, 'accept_terms missing: refused (400)', "$s" );
list( $s, $d ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => false ) );
atlas_ok( 422 === $s && 'terms_not_accepted' === $d['code'], 'terms not ticked: refused, nothing sent', "$s" );
foreach ( array( 'not-a-key', "ar_live_' OR 1=1 --", 'ar_live_' . str_repeat( 'A', 31 ) . '<', str_repeat( 'x', 5000 ) ) as $bad ) {
	list( $s, $d ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $bad, 'accept_terms' => true ) );
	atlas_ok( 422 === $s && 'invalid_key_format' === $d['code'], 'malformed key refused locally: ' . substr( $bad, 0, 20 ) );
}
list( $s, $d ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => 'ar_live_' . str_repeat( 'Z', 32 ), 'accept_terms' => true ) );
atlas_ok( 409 === $s && 'cloud_invalid_key' === $d['code'] && ! get_option( AR_TRY_ON_Cloud::OPTION ), 'well-formed but wrong key: refused by the service, nothing stored', "$s {$d['code']}" );
list( $s, $d, $r ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
atlas_ok( 200 === $s && true === $d['connected'] && 'free' === $d['plan'] && 3 === $d['credits'], 'valid key: connected, plan + credits shown', wp_json_encode( $d ) );
atlas_ok( false === strpos( wp_json_encode( $d ), 'ar_live_' ), 'the response never contains the key' );
global $wpdb;
$row = $wpdb->get_row( $wpdb->prepare( "SELECT option_value, autoload FROM {$wpdb->options} WHERE option_name = %s", AR_TRY_ON_Cloud::OPTION ) );
atlas_ok( $row && false === strpos( $row->option_value, $key ) && false === strpos( $row->option_value, substr( $key, 8, 12 ) ), 'database holds only ciphertext (no key, no key fragment)' );
atlas_ok( $row && in_array( $row->autoload, array( 'no', 'off' ), true ), 'option is not autoloaded', $row ? $row->autoload : '' );
atlas_ok( AR_TRY_ON_Cloud::get_key() === $key, 'key decrypts on the server' );
list( $s, $d ) = atlas_rest( 'GET', 'cloud/status' );
atlas_ok( 200 === $s && false === strpos( wp_json_encode( $d ), 'ar_live_' ), 'status never contains the key' );
$tampered        = AR_TRY_ON_Cloud::stored();
$tampered['key'] = base64_encode( str_repeat( "\0", 60 ) );
update_option( AR_TRY_ON_Cloud::OPTION, $tampered, false );
atlas_ok( '' === AR_TRY_ON_Cloud::get_key() && false === AR_TRY_ON_Cloud::status()['connected'], 'tampered ciphertext is rejected (not connected), no error' );
atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
for ( $i = 0; $i < 10; $i++ ) {
	atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => 'nope', 'accept_terms' => true ) );
}
list( $s ) = atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => 'nope', 'accept_terms' => true ) );
atlas_ok( 429 === $s, 'connect attempts are rate limited (10/hour/user)', "$s" );

echo "\n4. Optimizing a model\n";
atlas_as( $admin );
$post   = wp_insert_post( array( 'post_title' => 'AR-84 <script>alert(1)</script> Chair', 'post_status' => 'draft', 'post_author' => $editor ) );
$atlas_t['cleanup']['posts'][] = $post;
$source = atlas_attachment( $glb, 'ar84-chair.glb', 'model/gltf-binary', $post );
$src    = wp_get_attachment_url( $source );
$image  = atlas_attachment( ABSPATH . 'wp-admin/images/w-logo-blue.png', 'ar84-logo.png', 'image/png' );

atlas_as( $editor );
foreach (
	array(
		'external URL (SSRF)'         => 'http://169.254.169.254/latest/meta-data/x.glb',
		'other site'                  => 'https://evil.example/model.glb',
		'path traversal in uploads'   => wp_get_upload_dir()['baseurl'] . '/../../wp-config.php',
		'file:// scheme'              => 'file:///etc/passwd',
		'image, not a GLB'            => wp_get_attachment_url( $image ),
		'plugin file, not uploads'    => plugins_url( 'ar-vr-3d-model-try-on/readme.txt' ),
	) as $label => $bad_src
) {
	list( $s, $d ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $bad_src, 'height_cm' => 80 ) );
	atlas_ok( 422 === $s && in_array( $d['code'], array( 'invalid_source' ), true ), "refused: {$label}", "$s " . ( $d['code'] ?? '' ) );
}
foreach ( array( 0, -5, 1001, 'abc' ) as $bad_height ) {
	list( $s ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => $bad_height ) );
	atlas_ok( 400 === $s, "refused: height {$bad_height}", "$s" );
}
atlas_as( $author );
list( $s ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => 80 ) );
atlas_ok( 403 === $s, 'author cannot optimize someone else\'s item (403)', "$s" );
list( $s ) = atlas_rest( 'GET', "cloud/optimize/{$post}" );
atlas_ok( 403 === $s, 'author cannot read someone else\'s job (403)', "$s" );
atlas_as( $sub );
list( $s ) = atlas_rest( 'GET', "cloud/optimize/{$post}" );
atlas_ok( 403 === $s, 'subscriber cannot read jobs (403)', "$s" );

atlas_as( $editor );
$t0             = microtime( true );
list( $s, $d )  = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => 80 ) );
atlas_ok( 200 === $s && in_array( $d['status'], array( 'processing', 'ready' ), true ), 'editor starts the job', "$s " . wp_json_encode( $d ) );
list( $s2, $d2 ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => 80 ) );
atlas_ok( 'processing' !== $d['status'] || ( 409 === $s2 && 'job_running' === $d2['code'] ), 'a second click while running is refused (409)', "$s2" );
$job = get_post_meta( $post, AR_TRY_ON_Cloud::JOB_META, true );
atlas_ok( is_array( $job ) && preg_match( '/^mdl_/', $job['model_id'] ) && false === strpos( wp_json_encode( $d ), 'mdl_' ), 'cloud model id kept server-side only' );
for ( $i = 0; $i < 60 && 'processing' === $d['status']; $i++ ) {
	sleep( 1 );
	list( $s, $d ) = atlas_rest( 'GET', "cloud/optimize/{$post}" );
}
$secs = round( microtime( true ) - $t0, 1 );
atlas_ok( 'ready' === $d['status'] && ! empty( $d['src'] ), "ready and imported in {$secs}s", wp_json_encode( $d ) );
$result = (int) ( $d['attachment_id'] ?? 0 );
if ( $result ) {
	$atlas_t['cleanup']['attachments'][] = $result;
	$file = get_attached_file( $result );
	atlas_ok( 'model/gltf-binary' === get_post_mime_type( $result ) && 'glTF' === file_get_contents( $file, false, null, 0, 4 ), 'saved as a real GLB attachment (model/gltf-binary)' );
	atlas_ok( (int) get_post_field( 'post_parent', $result ) === $post, 'attached to the item' );
	atlas_ok( is_file( get_attached_file( $source ) ), 'original file kept' );
	atlas_ok( (bool) preg_match( '/^ar84-chair[-\d]*-optimized-[A-Za-z0-9]{6}\.glb$/', basename( $file ) ), 'safe file name: ' . basename( $file ) );
	$meta = get_post_meta( $result, AR_TRY_ON_Cloud::RESULT_META, true );
	atlas_ok( (int) $meta['source_attachment'] === $source, 'result remembers its source' );
	atlas_ok( $d['result_size'] > 0 && $d['source_size'] > 0, "sizes reported: {$d['source_size']} → {$d['result_size']} bytes" );
	list( $s3, $d3 ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => 80 ) );
	atlas_ok( 200 === $s3 && (int) $d3['attachment_id'] === $result, 'same file again: same result reused, no duplicate in the Media Library', wp_json_encode( $d3 ) );
}

echo "\n5. Hostile service answers\n";
foreach (
	array(
		'cloud metadata IP'        => 'http://169.254.169.254/latest/meta-data/',
		'other host'               => 'https://evil.example/x.glb',
		'service origin, not GLB'  => AR_TRY_ON_Cloud::base_url() . '/v1/usage',
		'service origin, missing'  => AR_TRY_ON_Cloud::base_url() . '/files/mdl_nope/web.glb',
		'userinfo trick'           => 'http://127.0.0.1:8765@evil.example/x.glb',
		'port swap'                => 'http://127.0.0.1:22/x.glb',
	) as $label => $hostile
) {
	$r = AR_TRY_ON_Cloud::import_result( $hostile, $source, $post, 'mdl_test' );
	atlas_ok( is_wp_error( $r ), "not imported: {$label}", is_wp_error( $r ) ? $r->get_error_code() : 'IMPORTED ' . $r );
	if ( ! is_wp_error( $r ) ) {
		$atlas_t['cleanup']['attachments'][] = $r;
	}
}

echo "\n6. Revoked key\n";
atlas_as( $admin );
// ATLAS_AR_TEST_REVOKE_CMD revokes account B's key on the service; "<cmd> restore" un-revokes it.
$revoke = getenv( 'ATLAS_AR_TEST_REVOKE_CMD' );
if ( ! $revoke ) {
	echo "  skip (set ATLAS_AR_TEST_REVOKE_CMD)\n";
} else {
	exec( $revoke . ' restore' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec -- Test harness only.
	atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key_b, 'accept_terms' => true ) );
	atlas_ok( AR_TRY_ON_Cloud::get_key() === $key_b, 'switched to account B' );
	exec( $revoke ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec -- Test harness only.
	list( $s, $d ) = atlas_rest( 'GET', 'cloud/status', array( 'refresh' => 1 ) );
	atlas_ok( 409 === $s && 'cloud_not_connected' === $d['code'] && false === get_option( AR_TRY_ON_Cloud::OPTION ), 'revoked key is cleared; owner is told to press Connect', "$s " . ( $d['code'] ?? '' ) );
}

echo "\n7. Disconnect\n";
atlas_rest( 'POST', 'cloud/connect', array( 'api_key' => $key, 'accept_terms' => true ) );
list( $s, $d ) = atlas_rest( 'DELETE', 'cloud/connect' );
atlas_ok( 200 === $s && false === $d['connected'] && false === get_option( AR_TRY_ON_Cloud::OPTION ), 'disconnect forgets the key' );
atlas_ok( ! $result || is_file( get_attached_file( $result ) ), 'models already saved stay after disconnect' );
atlas_as( $editor );
list( $s, $d ) = atlas_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => $src, 'height_cm' => 50 ) );
atlas_ok( 409 === $s && 'cloud_not_connected' === $d['code'], 'optimize after disconnect: clear 409, nothing sent', "$s" );

// Cleanup.
wp_set_current_user( 0 );
foreach ( $atlas_t['cleanup']['attachments'] ?? array() as $id ) {
	wp_delete_attachment( $id, true );
}
foreach ( $atlas_t['cleanup']['posts'] ?? array() as $id ) {
	wp_delete_post( $id, true );
}
require_once ABSPATH . 'wp-admin/includes/user.php';
foreach ( $atlas_t['cleanup']['users'] ?? array() as $id ) {
	wp_delete_user( $id );
}
delete_option( AR_TRY_ON_Cloud::OPTION );
if ( null !== $saved_option ) {
	add_option( AR_TRY_ON_Cloud::OPTION, $saved_option, '', false );
}

echo "\n# pass {$atlas_t['pass']}\n# fail {$atlas_t['fail']}\n";
if ( $atlas_t['fail'] ) {
	WP_CLI::halt( 1 );
}
