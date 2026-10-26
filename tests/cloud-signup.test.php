<?php
/**
 * AR-93: connect with an email (the platform's POST /v1/projects/register), against a real
 * WordPress and a real local AtlasAR Cloud. Never shipped: gulp excludes tests/.
 *
 *   ATLAS_AR_TEST_DB_CMD="<mysql client that runs one SQL statement on the service DB>" \
 *     wp eval-file …/tests/cloud-signup.test.php
 */

use AR_TRY_ON\AR_TRY_ON_Cloud;

defined( 'ABSPATH' ) || exit;

global $atlas_s; // eval-file runs this file inside a function.
$atlas_s = array( 'pass' => 0, 'fail' => 0 );

function atlas_s2_ok( $cond, $name, $detail = '' ) {
	global $atlas_s;
	$cond ? $atlas_s['pass']++ : $atlas_s['fail']++;
	echo ( $cond ? '  ok   ' : '  FAIL ' ) . $name . ( ! $cond && '' !== $detail ? " — {$detail}" : '' ) . "\n";
}

function atlas_s2_rest( $method, $route, $params = array() ) {
	$request = new WP_REST_Request( $method, '/ar_try_on/v1/' . $route );
	$request->set_header( 'Content-Type', 'application/json' );
	$request->set_body( wp_json_encode( $params ) );
	$response = rest_do_request( $request );
	return array( $response->get_status(), rest_get_server()->response_to_data( $response, false ) );
}

function atlas_s2_fresh() {
	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_%atlas\\_ar\\_rl\\_%'" );
	wp_cache_flush();
}

function atlas_s2_sql( $sql ) {
	exec( getenv( 'ATLAS_AR_TEST_DB_CMD' ) . ' ' . escapeshellarg( $sql ), $out ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec -- Test harness only.
	return $out;
}

$saved = get_option( AR_TRY_ON_Cloud::OPTION, null );
delete_option( AR_TRY_ON_Cloud::OPTION );
$admin  = wp_insert_user( array( 'user_login' => 'ar93_admin_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => 'administrator' ) );
$editor = wp_insert_user( array( 'user_login' => 'ar93_editor_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => 'editor' ) );
$domain = preg_replace( '#^https?://#', '', untrailingslashit( home_url() ) );
// Start from a clean slate on the service: this site not registered yet.
// (Projects are core records with keys and usage: free the domain instead of deleting them.)
atlas_s2_sql( "UPDATE projects SET domain = CONCAT('retired-', id, '.', domain) WHERE platform = 'wordpress' AND domain = '" . addslashes( $domain ) . "'" );
$first = 'owner-' . wp_generate_password( 6, false, false ) . '@example.test';

echo "\n1. Refusals before anything is sent\n";
wp_set_current_user( $editor );
atlas_s2_fresh();
list( $s ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => true ) );
atlas_s2_ok( 403 === $s, 'an editor cannot connect the site', (string) $s );
wp_set_current_user( $admin );
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => false ) );
atlas_s2_ok( 422 === $s && 'terms_not_accepted' === $d['code'], 'terms not ticked: refused' );
foreach ( array( 'not-an-email', 'a@b', "x@example.test\r\nBcc: evil@example.test", str_repeat( 'a', 300 ) . '@example.test' ) as $bad ) {
	list( $s ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $bad, 'accept_terms' => true ) );
	atlas_s2_ok( in_array( $s, array( 400, 422 ), true ), 'bad email refused: ' . substr( str_replace( array( "\r", "\n" ), ' ', $bad ), 0, 30 ), (string) $s );
}
atlas_s2_ok( false === get_option( AR_TRY_ON_Cloud::OPTION ), 'nothing stored after refusals' );

echo "\n2. A new email is connected at once\n";
atlas_s2_fresh();
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => true ) );
atlas_s2_ok( 200 === $s && true === $d['connected'] && false === $d['pending'] && $first === $d['email'], 'connected, not pending, as that email', wp_json_encode( $d ) );
atlas_s2_ok( 'free' === $d['plan'] && 20 === $d['limit'] && true === $d['webhook'], 'Free plan, 20 models a month, instant updates on' );
atlas_s2_ok( false === strpos( wp_json_encode( $d ), 'ar_live_' ), 'the key is never returned' );
atlas_s2_ok( '' !== AR_TRY_ON_Cloud::get_key(), 'the key is stored (encrypted) for the server' );

echo "\n3. Another email cannot take an already-registered site\n";
AR_TRY_ON_Cloud::disconnect();
atlas_s2_fresh();
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => 'intruder@example.test', 'accept_terms' => true ) );
atlas_s2_ok( 409 === $s && 'cloud_project_exists' === $d['code'], 'project_exists', "$s " . ( $d['code'] ?? '' ) );
atlas_s2_ok( false !== strpos( $d['message'], '•••@' ) && false === strpos( $d['message'], $first ), 'the owner is shown masked, never in full', $d['message'] );
atlas_s2_ok( false === get_option( AR_TRY_ON_Cloud::OPTION ), 'nothing stored' );

echo "\n4. The same email again: pending until the owner approves\n";
atlas_s2_fresh();
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => true ) );
atlas_s2_ok( 200 === $s && true === $d['pending'] && false === $d['connected'], 'pending, not connected', wp_json_encode( $d ) );
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/recheck' );
atlas_s2_ok( 200 === $s && true === $d['pending'], 'checking again before approval: still pending', wp_json_encode( $d ) );
$post_id = wp_insert_post( array( 'post_title' => 'AR-93', 'post_status' => 'draft' ) );
list( $s, $d ) = atlas_s2_rest( 'POST', "cloud/optimize/{$post_id}", array( 'src' => 'http://x/y.glb', 'height_cm' => 10 ) );
atlas_s2_ok( in_array( $s, array( 409, 422, 403 ), true ), 'nothing can be optimized while pending', (string) $s );
wp_delete_post( $post_id, true );
// The owner clicks "Approve" in the email (the service's own flow; simulated on its database).
atlas_s2_sql( "UPDATE api_keys k JOIN projects p ON p.id = k.project_id SET k.status = 'active' WHERE p.domain = '" . addslashes( $domain ) . "' AND k.status = 'pending'" );
list( $s, $d ) = atlas_s2_rest( 'POST', 'cloud/recheck' );
atlas_s2_ok( 200 === $s && true === $d['connected'] && false === $d['pending'] && true === $d['webhook'], 'approved: connected, instant updates on', wp_json_encode( $d ) );

echo "\n5. Rate limit\n";
AR_TRY_ON_Cloud::disconnect();
atlas_s2_fresh();
// Malformed emails never reach the handler (WordPress refuses the format); count real attempts.
for ( $i = 0; $i < 5; $i++ ) {
	atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => false ) );
}
list( $s ) = atlas_s2_rest( 'POST', 'cloud/register', array( 'email' => $first, 'accept_terms' => true ) );
atlas_s2_ok( 429 === $s, 'sign-up attempts are capped (5 per hour per user)', (string) $s );

// Cleanup.
atlas_s2_fresh();
delete_option( AR_TRY_ON_Cloud::OPTION );
if ( null !== $saved ) {
	add_option( AR_TRY_ON_Cloud::OPTION, $saved, '', false );
}
require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $admin );
wp_delete_user( $editor );
wp_set_current_user( 0 );
echo "\n# pass {$atlas_s['pass']}\n# fail {$atlas_s['fail']}\n";
if ( $atlas_s['fail'] ) {
	WP_CLI::halt( 1 );
}
