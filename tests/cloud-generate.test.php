<?php
/**
 * AR-97: Photo to 3D from the metabox, against a real WordPress and a real local AtlasAR Cloud
 * (with the GPU stand-in). Never shipped: gulp excludes tests/.
 *
 *   ATLAS_AR_TEST_DB_CMD="<runs one SQL statement on the service DB>" \
 *     wp eval-file …/tests/cloud-generate.test.php
 */

use AR_TRY_ON\AR_TRY_ON_Cloud;

defined( 'ABSPATH' ) || exit;

global $atlas_g; // eval-file runs this file inside a function.
$atlas_g = array( 'pass' => 0, 'fail' => 0, 'atts' => array(), 'posts' => array() );

function atlas_g_ok( $cond, $name, $detail = '' ) {
	global $atlas_g;
	$cond ? $atlas_g['pass']++ : $atlas_g['fail']++;
	echo ( $cond ? '  ok   ' : '  FAIL ' ) . $name . ( ! $cond && '' !== $detail ? " — {$detail}" : '' ) . "\n";
}

function atlas_g_rest( $method, $route, $params = array() ) {
	$request = new WP_REST_Request( $method, '/ar_try_on/v1/' . $route );
	$request->set_header( 'Content-Type', 'application/json' );
	if ( $params ) {
		$request->set_body( wp_json_encode( $params ) );
	}
	$response = rest_do_request( $request );
	return array( $response->get_status(), rest_get_server()->response_to_data( $response, false ) );
}

function atlas_g_sql( $sql ) {
	exec( getenv( 'ATLAS_AR_TEST_DB_CMD' ) . ' ' . escapeshellarg( $sql ), $out ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec -- Test harness only.
	return $out;
}

function atlas_g_attach( $name, $bytes, $mime, $parent ) {
	global $atlas_g;
	$up   = wp_upload_dir();
	$path = trailingslashit( $up['path'] ) . wp_unique_filename( $up['path'], $name );
	file_put_contents( $path, $bytes ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	$id                = wp_insert_attachment( array( 'post_mime_type' => $mime, 'post_title' => $name, 'post_status' => 'inherit' ), $path, $parent );
	$atlas_g['atts'][] = $id;
	return $id;
}

function atlas_g_fresh_limits() {
	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_%atlas\\_ar\\_rl\\_%'" );
	wp_cache_flush();
}

$saved  = get_option( AR_TRY_ON_Cloud::OPTION, null );
$domain = preg_replace( '#^https?://#', '', untrailingslashit( home_url() ) );
delete_option( AR_TRY_ON_Cloud::OPTION );
atlas_g_sql( "UPDATE projects SET domain = CONCAT('retired-', id, '.', domain) WHERE platform = 'wordpress' AND domain = '" . addslashes( $domain ) . "'" );
$admin = wp_insert_user( array( 'user_login' => 'ar97_admin_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => 'administrator' ) );
wp_set_current_user( $admin );
atlas_g_fresh_limits();

$post = wp_insert_post( array( 'post_title' => 'AR-97 photo test', 'post_status' => 'draft' ) );
$atlas_g['posts'][] = $post;
ob_start();
$im = imagecreatetruecolor( 640, 640 );
imagefilledrectangle( $im, 0, 0, 639, 639, imagecolorallocate( $im, 245, 245, 245 ) );
imagefilledellipse( $im, 320, 320, 360, 480, imagecolorallocate( $im, 200, 60, 40 ) );
imagejpeg( $im, null, 85 );
$jpeg  = ob_get_clean();
$photo = atlas_g_attach( 'ar97-vase.jpg', $jpeg, 'image/jpeg', $post );
$fake  = atlas_g_attach( 'ar97-fake.jpg', "<?php echo 'not an image';", 'image/jpeg', $post );
$glb   = atlas_g_attach( 'ar97-model.glb', 'glTF' . str_repeat( "\0", 40 ), 'model/gltf-binary', $post );

echo "\n1. Connected on the Free plan\n";
list( $s, $d ) = atlas_g_rest( 'POST', 'cloud/register', array( 'email' => 'ar97-' . wp_generate_password( 6, false, false ) . '@example.test', 'accept_terms' => true ) );
atlas_g_ok( 200 === $s && true === $d['connected'] && 'free' === $d['plan'], 'connected, Free', wp_json_encode( $d ) );
list( $s, $d ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $photo, 'height_cm' => 30 ) );
atlas_g_ok( 403 === $s && 'cloud_feature_not_in_plan' === ( $d['code'] ?? '' ), 'Free plan: photo to 3D refused by the service (feature_not_in_plan)', "$s " . ( $d['code'] ?? '' ) );
wp_cache_delete( $post, 'post_meta' );
atlas_g_ok( '' === get_post_meta( $post, AR_TRY_ON_Cloud::JOB_META, true ), 'no job stored after a refusal' );

echo "\n2. Premium (AtlasAR Pro seat)\n";
atlas_g_sql( "UPDATE accounts a JOIN projects p ON p.account_id = a.id SET a.plan_id = (SELECT id FROM plans WHERE slug = 'premium') WHERE p.platform = 'wordpress' AND p.domain = '" . addslashes( $domain ) . "'" );
list( $s, $d ) = atlas_g_rest( 'POST', 'cloud/recheck' );
atlas_g_ok( 200 === $s && 'premium' === $d['plan'], 'plan is Premium after a recheck', wp_json_encode( $d ) );
$used_before = (int) $d['used'];

echo "\n3. Refused before anything is sent\n";
foreach ( array(
	'a PHP file named .jpg'     => array( 'image_id' => $fake, 'height_cm' => 30 ),
	'a GLB instead of a photo'  => array( 'image_id' => $glb, 'height_cm' => 30 ),
	'an item, not an image'     => array( 'image_id' => $post, 'height_cm' => 30 ),
	'height 0'                  => array( 'image_id' => $photo, 'height_cm' => 0 ),
	'height 5000 cm'            => array( 'image_id' => $photo, 'height_cm' => 5000 ),
	'no image'                  => array( 'height_cm' => 30 ),
) as $label => $params ) {
	list( $s ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", $params );
	atlas_g_ok( in_array( $s, array( 400, 403, 422 ), true ), "refused: {$label}", (string) $s );
}
$editor = wp_insert_user( array( 'user_login' => 'ar97_contrib_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => 'contributor' ) );
wp_set_current_user( $editor );
list( $s ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $photo, 'height_cm' => 30 ) );
atlas_g_ok( 403 === $s, 'a contributor cannot start it (no upload_files / edit_post)', (string) $s );
wp_set_current_user( $admin );

echo "\n4. A photo becomes a model\n";
atlas_g_fresh_limits();
list( $s, $d ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $photo, 'height_cm' => 30 ) );
atlas_g_ok( 200 === $s && in_array( $d['status'] ?? '', array( 'processing', 'ready' ), true ) && 'generate' === ( $d['kind'] ?? '' ), 'job started (kind generate)', "$s " . wp_json_encode( $d ) );
list( $s ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $photo, 'height_cm' => 30 ) );
list( $s2 ) = atlas_g_rest( 'POST', "cloud/optimize/{$post}", array( 'src' => wp_get_attachment_url( $glb ), 'height_cm' => 30 ) );
atlas_g_ok( 409 === $s && 409 === $s2, 'one job per item: a second photo or optimize job is refused while it runs', "$s / $s2" );
$job = array();
for ( $i = 0; $i < 90; $i++ ) {
	list( , $job ) = atlas_g_rest( 'GET', "cloud/optimize/{$post}" );
	if ( in_array( $job['status'] ?? '', array( 'ready', 'failed' ), true ) ) {
		break;
	}
	sleep( 1 );
}
atlas_g_ok( 'ready' === ( $job['status'] ?? '' ) && ! empty( $job['attachment_id'] ), "ready in ~{$i}s", wp_json_encode( $job ) );
if ( ! empty( $job['attachment_id'] ) ) {
	$atlas_g['atts'][] = (int) $job['attachment_id'];
	$file              = get_attached_file( $job['attachment_id'] );
	atlas_g_ok( 'glTF' === file_get_contents( $file, false, null, 0, 4 ), 'the saved file is a real GLB' );
	atlas_g_ok( false !== strpos( basename( $file ), 'ar97-vase-3d-' ), 'named after the photo (…-3d-…glb)', basename( $file ) );
	atlas_g_ok( (int) wp_get_post_parent_id( $job['attachment_id'] ) === $post, 'attached to the item' );
	list( , $d ) = atlas_g_rest( 'POST', 'cloud/recheck' );
	atlas_g_ok( (int) $d['used'] === $used_before + 10, 'billed 10 models once it was ready', $used_before . ' → ' . $d['used'] );

	// The same photo and height again: the service answers with the same model, nothing new.
	atlas_g_fresh_limits();
	list( $s, $again ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $photo, 'height_cm' => 30 ) );
	atlas_g_ok( 200 === $s && (int) ( $again['attachment_id'] ?? 0 ) === (int) $job['attachment_id'], 'a repeated click reuses the same file', wp_json_encode( $again ) );
	list( , $d ) = atlas_g_rest( 'POST', 'cloud/recheck' );
	atlas_g_ok( (int) $d['used'] === $used_before + 10, 'and is not billed again', (string) $d['used'] );
}

echo "\n5. Rate limit\n";
atlas_g_fresh_limits();
$codes = array();
for ( $i = 0; $i < 21; $i++ ) {
	list( $codes[] ) = atlas_g_rest( 'POST', "cloud/generate/{$post}", array( 'image_id' => $fake, 'height_cm' => 30 ) );
}
atlas_g_ok( 429 === end( $codes ), 'photo to 3D attempts are capped (20 per hour per user)', implode( ',', array_unique( $codes ) ) );

// Cleanup.
atlas_g_fresh_limits();
AR_TRY_ON_Cloud::disconnect();
foreach ( $atlas_g['atts'] as $id ) {
	wp_delete_attachment( $id, true );
}
foreach ( $atlas_g['posts'] as $id ) {
	wp_delete_post( $id, true );
}
require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $admin );
wp_delete_user( $editor );
delete_option( AR_TRY_ON_Cloud::OPTION );
if ( null !== $saved ) {
	add_option( AR_TRY_ON_Cloud::OPTION, $saved, '', false );
}
echo "\n# pass {$atlas_g['pass']}\n# fail {$atlas_g['fail']}\n";
if ( $atlas_g['fail'] ) {
	WP_CLI::halt( 1 );
}
