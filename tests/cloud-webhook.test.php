<?php
/**
 * AR-99: AtlasAR Cloud → plugin webhooks, against a real WordPress and a real local AtlasAR Cloud
 * (the service posts to this site over HTTP). Never shipped: gulp excludes tests/.
 *
 *   ATLAS_AR_TEST_KEY_FILE=…  ATLAS_AR_TEST_GLB=…  wp eval-file …/tests/cloud-webhook.test.php
 */

use AR_TRY_ON\AR_TRY_ON_Cloud;

defined( 'ABSPATH' ) || exit;

global $atlas_w; // eval-file runs this file inside a function.
$atlas_w = array( 'pass' => 0, 'fail' => 0, 'posts' => array(), 'atts' => array() );

function atlas_w_ok( $cond, $name, $detail = '' ) {
	global $atlas_w;
	$cond ? $atlas_w['pass']++ : $atlas_w['fail']++;
	echo ( $cond ? '  ok   ' : '  FAIL ' ) . $name . ( ! $cond && '' !== $detail ? " — {$detail}" : '' ) . "\n";
}

function atlas_w_post( $body, $signature = null ) {
	$request = new WP_REST_Request( 'POST', '/ar_try_on/v1/cloud/webhook' );
	$request->set_header( 'Content-Type', 'application/json' );
	if ( null !== $signature ) {
		$request->set_header( 'AtlasAR-Signature', $signature );
	}
	$request->set_body( $body );
	$response = rest_do_request( $request );
	return array( $response->get_status(), rest_get_server()->response_to_data( $response, false ) );
}

function atlas_w_sign( $body, $secret, $t = null ) {
	$t = null === $t ? time() : $t;
	return 't=' . $t . ',v1=' . hash_hmac( 'sha256', $t . '.' . $body, $secret );
}

$key = trim( (string) file_get_contents( getenv( 'ATLAS_AR_TEST_KEY_FILE' ) ) );
$glb = getenv( 'ATLAS_AR_TEST_GLB' );
$saved = get_option( AR_TRY_ON_Cloud::OPTION, null );
delete_option( AR_TRY_ON_Cloud::OPTION );
$admin = wp_insert_user( array( 'user_login' => 'ar99_admin_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => 'administrator' ) );
wp_set_current_user( $admin );

echo "\n1. Connecting registers the webhook\n";
$status = AR_TRY_ON_Cloud::connect( $key );
atlas_w_ok( ! is_wp_error( $status ) && true === $status['webhook'], 'connect also registers this site\'s receiver', is_wp_error( $status ) ? $status->get_error_message() : wp_json_encode( $status ) );
$secret = AR_TRY_ON_Cloud::webhook_secret();
global $wpdb;
$raw = (string) $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", AR_TRY_ON_Cloud::OPTION ) );
atlas_w_ok( 0 === strpos( $secret, 'whsec_' ) && false === strpos( $raw, $secret ) && false === strpos( $raw, 'whsec_' ), 'secret kept encrypted (never in the database in plain text)' );
atlas_w_ok( false === strpos( wp_json_encode( AR_TRY_ON_Cloud::status() ), 'whsec_' ), 'status never contains the secret' );
AR_TRY_ON_Cloud::ensure_webhook();
atlas_w_ok( AR_TRY_ON_Cloud::webhook_secret() === $secret, 'registering again keeps the same secret (no needless rotation)' );

echo "\n2. Attacker requests are refused\n";
$fake = wp_json_encode( array( 'id' => 'evt_fake', 'type' => 'model.ready', 'data' => array( 'model' => array( 'id' => 'mdl_' . str_repeat( 'A', 22 ), 'status' => 'ready', 'files' => array( 'glb' => 'http://169.254.169.254/x.glb' ) ) ) ) );
foreach (
	array(
		'no signature'             => null,
		'garbage signature'        => 'nope',
		'wrong secret'             => atlas_w_sign( $fake, 'whsec_' . str_repeat( 'x', 32 ) ),
		'expired (10 min old)'     => atlas_w_sign( $fake, $secret, time() - 600 ),
		'from the future (10 min)' => atlas_w_sign( $fake, $secret, time() + 600 ),
		'uppercase hex trick'      => strtoupper( atlas_w_sign( $fake, $secret ) ),
		'huge header'              => 't=' . time() . ',v1=' . str_repeat( 'a', 5000 ),
	) as $label => $sig
) {
	list( $s ) = atlas_w_post( $fake, $sig );
	atlas_w_ok( 401 === $s, "refused: {$label}", (string) $s );
}
$signed = atlas_w_sign( $fake, $secret );
list( $s ) = atlas_w_post( $fake . ' ', $signed );
atlas_w_ok( 401 === $s, 'refused: body changed after signing', (string) $s );
list( $s, $d ) = atlas_w_post( $fake, $signed );
atlas_w_ok( 200 === $s && ! empty( $d['ignored'] ), 'a correctly signed event for an unknown model is ignored (nothing downloaded)', wp_json_encode( $d ) );

echo "\n3. A model arrives by webhook alone (the editor never polls)\n";
$post = wp_insert_post( array( 'post_title' => 'AR-99 webhook test', 'post_status' => 'draft' ) );
$atlas_w['posts'][] = $post;
$uploads = wp_upload_dir();
$dest    = trailingslashit( $uploads['path'] ) . wp_unique_filename( $uploads['path'], 'ar99-model.glb' );
copy( $glb, $dest );
$source = wp_insert_attachment( array( 'post_mime_type' => 'model/gltf-binary', 'post_title' => 'ar99', 'post_status' => 'inherit' ), $dest, $post );
$atlas_w['atts'][] = $source;
$request = new WP_REST_Request( 'POST', "/ar_try_on/v1/cloud/optimize/{$post}" );
$request->set_header( 'Content-Type', 'application/json' );
$request->set_body( wp_json_encode( array( 'src' => wp_get_attachment_url( $source ), 'height_cm' => 30 ) ) );
$start = rest_get_server()->response_to_data( rest_do_request( $request ), false );
atlas_w_ok( in_array( $start['status'] ?? '', array( 'processing', 'ready' ), true ), 'job started', wp_json_encode( $start ) );
$job = array();
for ( $i = 0; $i < 60; $i++ ) {
	wp_cache_delete( $post, 'post_meta' );
	$job = get_post_meta( $post, AR_TRY_ON_Cloud::JOB_META, true );
	if ( 'ready' === ( $job['status'] ?? '' ) ) {
		break;
	}
	sleep( 1 );
}
atlas_w_ok( 'ready' === ( $job['status'] ?? '' ) && ! empty( $job['result_attachment'] ), "imported by the webhook in ~{$i}s, no poll at all", wp_json_encode( $job ) );
if ( ! empty( $job['result_attachment'] ) ) {
	$atlas_w['atts'][] = (int) $job['result_attachment'];
	atlas_w_ok( 'glTF' === file_get_contents( get_attached_file( $job['result_attachment'] ), false, null, 0, 4 ), 'the imported file is a real GLB' );
	// Replay the same delivery (at-least-once): acknowledged, never imported twice.
	$model = array( 'id' => $job['model_id'], 'status' => 'ready', 'files' => array( 'glb' => 'http://127.0.0.1:8765/files/x/y.glb' ) );
	$body  = wp_json_encode( array( 'id' => 'evt_replay_test', 'type' => 'model.ready', 'data' => array( 'model' => $model ) ) );
	atlas_w_post( $body, atlas_w_sign( $body, $secret ) );
	list( $s, $d ) = atlas_w_post( $body, atlas_w_sign( $body, $secret ) );
	atlas_w_ok( 200 === $s && ! empty( $d['duplicate'] ), 'a repeated event id is acknowledged and ignored', wp_json_encode( $d ) );
	wp_cache_delete( $post, 'post_meta' );
	atlas_w_ok( (int) get_post_meta( $post, AR_TRY_ON_Cloud::JOB_META, true )['result_attachment'] === (int) $job['result_attachment'], 'still exactly one imported file' );
}

echo "\n4. Disconnect removes the webhook on the service\n";
AR_TRY_ON_Cloud::disconnect();
$res = wp_remote_get( 'http://127.0.0.1:8765/v1/webhook', array( 'headers' => array( 'Authorization' => 'Bearer ' . $key ) ) );
atlas_w_ok( 404 === (int) wp_remote_retrieve_response_code( $res ), 'the service has no endpoint for this site any more', (string) wp_remote_retrieve_response_code( $res ) );
list( $s ) = atlas_w_post( $fake, atlas_w_sign( $fake, $secret ) );
atlas_w_ok( 401 === $s, 'old signatures stop working after disconnect', (string) $s );

// Cleanup.
foreach ( $atlas_w['atts'] as $id ) {
	wp_delete_attachment( $id, true );
}
foreach ( $atlas_w['posts'] as $id ) {
	wp_delete_post( $id, true );
}
require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $admin );
delete_option( AR_TRY_ON_Cloud::OPTION );
if ( null !== $saved ) {
	add_option( AR_TRY_ON_Cloud::OPTION, $saved, '', false );
}
echo "\n# pass {$atlas_w['pass']}\n# fail {$atlas_w['fail']}\n";
if ( $atlas_w['fail'] ) {
	WP_CLI::halt( 1 );
}
