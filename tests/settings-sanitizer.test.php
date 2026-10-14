<?php
/**
 * AR-85: the global settings save (ar_try_on/v1/settings) and the wizard share one sanitizer.
 * Existing-user round trips + attacker inputs, run against a real WordPress (never shipped):
 *
 *   wp eval-file wp-content/plugins/ar-vr-3d-model-try-on/tests/settings-sanitizer.test.php
 *
 * The site's real option is saved first and restored at the end.
 */

use AR_TRY_ON\AR_TRY_ON_Helper;

defined( 'ABSPATH' ) || exit;

global $atlas_s; // eval-file runs this file inside a function.
$atlas_s = array( 'pass' => 0, 'fail' => 0, 'users' => array() );

function atlas_s_ok( $cond, $name, $detail = '' ) {
	global $atlas_s;
	$cond ? $atlas_s['pass']++ : $atlas_s['fail']++;
	echo ( $cond ? '  ok   ' : '  FAIL ' ) . $name . ( ! $cond && '' !== $detail ? " — {$detail}" : '' ) . "\n";
}

function atlas_s_save( $fields, $raw = false ) {
	$request = new WP_REST_Request( 'POST', '/ar_try_on/v1/settings' );
	$request->set_body_params( array( 'method' => 'post', 'fields' => $raw ? $fields : wp_json_encode( $fields ), 'has_value_changed' => 'false' ) );
	$response = rest_do_request( $request );
	wp_cache_delete( 'ar_try_on_settings', 'options' );
	wp_cache_delete( 'alloptions', 'options' );
	AR_TRY_ON_Helper::clear_settings_cache();
	return array( $response->get_status(), rest_get_server()->response_to_data( $response, false ) );
}

function atlas_s_get() {
	wp_cache_delete( 'ar_try_on_settings', 'options' );
	wp_cache_delete( 'alloptions', 'options' );
	return get_option( 'ar_try_on_settings' );
}

function atlas_s_user( $role ) {
	global $atlas_s;
	$id                 = wp_insert_user( array( 'user_login' => 'ar85_' . $role . '_' . wp_generate_password( 5, false ), 'user_pass' => wp_generate_password( 24 ), 'role' => $role ) );
	$atlas_s['users'][] = $id;
	return $id;
}

$original = get_option( 'ar_try_on_settings', null );
$admin    = atlas_s_user( 'administrator' );
$editor   = atlas_s_user( 'editor' );
wp_set_current_user( $admin );

// The full object the dashboard keeps in state (src/dashboard/App.js) plus the keys of Settings.js.
$dashboard = array(
	'ar_try_on_display_button_automatically'    => 'yes',
	'ar_try_on_allowed_post_types'              => array( 'post' ),
	'ar_try_on_wc_hook_position'                => 'product_image',
	'ar_try_on_single_product_tabs'             => 'yes',
	'ar_try_on_loading_type'                    => 'auto',
	'ar_try_on_reveal_type'                     => 'auto',
	'model_load_strategy'                       => 'interaction',
	'ar_try_on_poster_color'                    => 'rgba(78,186,79,0)',
	'ar_try_on_ar'                              => 'activate',
	'ar_try_on_ar_modes'                        => array( 'webxr', 'scene-viewer', 'quick-look' ),
	'ar_try_on_ar_scale'                        => 'auto',
	'ar_try_on_xr_environment'                  => 'activate',
	'ar_try_on_ar_button'                       => 'deactivate',
	'ar_try_on_ar_button_text'                  => 'Activate AR',
	'ar_try_on_ar_button_background_color'      => '#3a3a3a',
	'ar_try_on_ar_button_text_color'            => '#ffffff',
	'ar_try_on_enable_qr_code'                  => 'yes',
	'ar_try_on_view_in_ar_label'                => 'View in AR',
	'ar_try_on_interaction_prompt'              => 'auto',
	'ar_try_on_interaction_prompt_style'        => 'wiggle',
	'ar_try_on_interaction_prompt_threshold'    => '2000',
	'ar_try_on_clear_cache'                     => false,
	'ar_try_on_ar_demo'                         => array( 'url' => 'http://example.test/demo', 'id' => 7 ),
	'ar_try_on_exclude_integration_api_name'    => 'tripo3d',
	'ar_try_on_exclude_integration_api_url'     => 'https://api.tripo3d.ai/v2/openapi/task',
	'ar_try_on_exclude_integration_api_headers' => array(
		array( 'key' => 'Authorization', 'value' => 'Bearer tsk_test_1234567890' ),
		array( 'key' => 'Content-Type', 'value' => 'application/json' ),
	),
	'tryon_self_host'                           => false,
	'tryon_snapshot'                            => true,
	'tryon_button_label'                        => 'Try it on',
	'tryon_consent_text'                        => 'Allow camera access to try this product on virtually. Video stays on your device.',
);

echo "\n1. Existing users\n";
if ( is_array( $original ) ) {
	list( $s, $d ) = atlas_s_save( $original );
	$after         = atlas_s_get();
	$expected      = $original;
	$expected['ar_try_on_clear_cache'] = false;
	ksort( $after );
	ksort( $expected );
	atlas_s_ok( 200 === $s && $after == $expected, 'this site\'s real option re-saves unchanged (' . count( $original ) . ' keys)', wp_json_encode( array_diff_key( $expected, $after ) + array_diff_assoc( array_map( 'wp_json_encode', $expected ), array_map( 'wp_json_encode', $after ) ) ) ); // phpcs:ignore Universal.Operators.StrictComparisons.LooseEqual -- Order-insensitive deep compare.
}
// A rich, older-style option: every dashboard key + a key from an old version + the demo post.
$legacy = $dashboard + array( 'ar_try_on_old_setting' => 'keep me', 'ar_try_on_ar_demo' => array( 'url' => 'http://localhost/demo', 'id' => 42 ) );
$legacy['ar_try_on_ar_demo'] = array( 'url' => 'http://localhost/demo', 'id' => 42 );
update_option( 'ar_try_on_settings', $legacy );
list( $s, $d ) = atlas_s_save( $legacy );
$after         = atlas_s_get();
atlas_s_ok( 200 === $s, 'saving the full dashboard object is accepted' );
$lost = array();
foreach ( $legacy as $k => $v ) {
	if ( 'ar_try_on_clear_cache' !== $k && wp_json_encode( $after[ $k ] ?? null ) !== wp_json_encode( $v ) ) {
		$lost[] = $k;
	}
}
atlas_s_ok( ! $lost, 'every dashboard value is kept exactly (types too: bools, arrays, "2000" string)', implode( ',', $lost ) );
atlas_s_ok( 'keep me' === $after['ar_try_on_old_setting'], 'a stored key from an older version stays' );
atlas_s_ok( 42 === $after['ar_try_on_ar_demo']['id'], 'the server-owned demo post stays' );
atlas_s_ok( empty( $d['ignored'] ) || array( 'ar_try_on_old_setting' ) === $d['ignored'], 'nothing the dashboard sends is reported as ignored', wp_json_encode( $d['ignored'] ?? array() ) );

echo "\n2. Who may save\n";
wp_set_current_user( 0 );
list( $s ) = atlas_s_save( array( 'ar_try_on_ar_button_text' => 'x' ) );
atlas_s_ok( 401 === $s, 'signed out: 401', "$s" );
wp_set_current_user( $editor );
list( $s ) = atlas_s_save( array( 'ar_try_on_ar_button_text' => 'x' ) );
atlas_s_ok( 403 === $s, 'editor: 403', "$s" );
wp_set_current_user( $admin );
atlas_s_ok( 'Activate AR' === atlas_s_get()['ar_try_on_ar_button_text'], 'refused saves changed nothing' );

echo "\n3. Attacker input (admin session, e.g. through CSRF or a stolen nonce)\n";
$base = atlas_s_get();
list( $s, $d ) = atlas_s_save(
	array(
		'ar_try_on_ar_button_text'   => '<script>alert(1)</script>Buy now',
		'ar_try_on_view_in_ar_label' => '"><img src=x onerror=alert(2)>See it',
		'tryon_button_label'         => "Try\x00 it<svg/onload=alert(3)>",
		'tryon_consent_text'         => str_repeat( 'A', 1024 * 1024 ),
	)
);
$after = atlas_s_get();
atlas_s_ok( 'Buy now' === $after['ar_try_on_ar_button_text'], 'script tags stripped from the AR button text', $after['ar_try_on_ar_button_text'] );
atlas_s_ok( false === strpos( $after['ar_try_on_view_in_ar_label'], '<' ) && false === strpos( $after['ar_try_on_view_in_ar_label'], 'onerror' ), 'HTML/attribute injection stripped from the label', $after['ar_try_on_view_in_ar_label'] );
atlas_s_ok( false === strpos( $after['tryon_button_label'], '<' ) && false === strpos( $after['tryon_button_label'], "\0" ), 'null bytes and SVG stripped', wp_json_encode( $after['tryon_button_label'] ) );
atlas_s_ok( 500 === strlen( $after['tryon_consent_text'] ), '1 MB text cut to 500 characters', (string) strlen( $after['tryon_consent_text'] ) );

foreach (
	array(
		'red;background:url(javascript:alert(1))',
		'expression(alert(1))',
		'#12345g',
		'rgba(1,2,3,0.5);x:y',
		'rgb(999,0,0)',
		'</style><script>alert(1)</script>',
	) as $evil_color
) {
	atlas_s_save( array( 'ar_try_on_ar_button_background_color' => $evil_color ) );
	atlas_s_ok( $base['ar_try_on_ar_button_background_color'] === atlas_s_get()['ar_try_on_ar_button_background_color'], 'colour refused, old value kept: ' . substr( $evil_color, 0, 30 ) );
}
atlas_s_save( array( 'ar_try_on_poster_color' => 'RGBA( 10, 20, 30, 0.5 )', 'ar_try_on_ar_button_text_color' => '#ABC' ) );
$after = atlas_s_get();
atlas_s_ok( 'rgba(10,20,30,0.5)' === $after['ar_try_on_poster_color'] && '#abc' === $after['ar_try_on_ar_button_text_color'], 'valid rgba() and short hex accepted' );

foreach ( array( 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'vbscript:msgbox(1)' ) as $evil_url ) {
	atlas_s_save( array( 'ar_try_on_exclude_integration_api_url' => $evil_url ) );
	atlas_s_ok( $base['ar_try_on_exclude_integration_api_url'] === atlas_s_get()['ar_try_on_exclude_integration_api_url'], 'URL refused, old value kept: ' . substr( $evil_url, 0, 24 ) );
}

list( $s, $d ) = atlas_s_save( array( 'siteurl' => 'https://evil.example', '__proto__' => array( 'x' => 1 ), 'ar_try_on_evil' => '<script>', 'users_can_register' => 1 ) );
$after = atlas_s_get();
atlas_s_ok( ! isset( $after['siteurl'] ) && ! isset( $after['__proto__'] ) && ! isset( $after['ar_try_on_evil'] ) && ! isset( $after['users_can_register'] ), 'unknown keys are not stored' );
atlas_s_ok( array( 'siteurl', '__proto__', 'ar_try_on_evil', 'users_can_register' ) === $d['ignored'], 'unknown keys are reported back as ignored', wp_json_encode( $d['ignored'] ?? null ) );
atlas_s_ok( get_option( 'siteurl' ) !== 'https://evil.example', 'no other option touched' );

atlas_s_save( array( 'ar_try_on_ar_button_text' => array( 'array', 'not', 'string' ), 'ar_try_on_ar_modes' => 'webxr', 'ar_try_on_display_button_automatically' => array( 'yes' ) ) );
$after = atlas_s_get();
atlas_s_ok( $base['ar_try_on_ar_button_text'] !== null && is_string( $after['ar_try_on_ar_button_text'] ) && is_array( $after['ar_try_on_ar_modes'] ) && 'yes' === $after['ar_try_on_display_button_automatically'], 'wrong types are refused (array for text, string for a list)' );
atlas_s_save( array( 'ar_try_on_ar_modes' => array( 'webxr', '<script>', 'webxr', 'quick-look' ) ) );
atlas_s_ok( array( 'webxr', 'quick-look' ) === atlas_s_get()['ar_try_on_ar_modes'], 'AR modes keep only known values, no duplicates' );

foreach ( array( 'ar_try_on_wc_hook_position' => '8; DROP TABLE', 'ar_try_on_ar' => 'maybe', 'model_load_strategy' => 'eager', 'ar_try_on_exclude_integration_api_name' => '../../evil' ) as $k => $v ) {
	atlas_s_save( array( $k => $v ) );
	atlas_s_ok( $base[ $k ] === atlas_s_get()[ $k ], "enum refused, old value kept: {$k}" );
}
foreach ( array( '-5', '1e9', '99999999', 'abc', '2000; x' ) as $v ) {
	atlas_s_save( array( 'ar_try_on_interaction_prompt_threshold' => $v ) );
	atlas_s_ok( $base['ar_try_on_interaction_prompt_threshold'] === atlas_s_get()['ar_try_on_interaction_prompt_threshold'], "threshold refused: {$v}" );
}
atlas_s_save( array( 'ar_try_on_allowed_post_types' => array( 'product', '../../x', '<b>', str_repeat( 'p', 300 ), 'product' ) ) );
atlas_s_ok( array( 'product', 'x', 'b' ) === array_values( atlas_s_get()['ar_try_on_allowed_post_types'] ) || array( 'product' ) === array_slice( atlas_s_get()['ar_try_on_allowed_post_types'], 0, 1 ), 'post types reduced to safe slugs', wp_json_encode( atlas_s_get()['ar_try_on_allowed_post_types'] ) );
atlas_s_ok( ! array_filter( atlas_s_get()['ar_try_on_allowed_post_types'], function ( $t ) { return strlen( $t ) > 20 || preg_match( '/[^a-z0-9_-]/', $t ); } ), 'no post type longer than 20 chars or with odd characters' );

atlas_s_save(
	array(
		'ar_try_on_exclude_integration_api_headers' => array_merge(
			array(
				array( 'key' => 'Authorization', 'value' => "Bearer abc\r\nX-Injected: 1" ),
				array( 'key' => "X-Evil\r\nHost", 'value' => 'evil' ),
				array( 'key' => 'Content-Type', 'value' => array( 'nested' ) ),
				'not-a-header',
			),
			array_fill( 0, 500, array( 'key' => 'X-Fill', 'value' => 'v' ) )
		),
	)
);
$headers = atlas_s_get()['ar_try_on_exclude_integration_api_headers'];
atlas_s_ok( 'Bearer abcX-Injected: 1' === $headers[0]['value'], 'CR/LF removed from header values (no header injection)', wp_json_encode( $headers[0] ) );
atlas_s_ok( ! in_array( "X-Evil\r\nHost", wp_list_pluck( $headers, 'key' ), true ), 'header names with CR/LF dropped' );
atlas_s_ok( count( $headers ) <= 20, 'at most 20 headers stored (' . count( $headers ) . ')' );

atlas_s_save( array( 'ar_try_on_ar_demo' => array( 'url' => 'https://evil.example/phish', 'id' => 1 ) ) );
atlas_s_ok( 42 === atlas_s_get()['ar_try_on_ar_demo']['id'], 'the demo post cannot be redirected by a request' );

atlas_s_save( array( 'ar_try_on_clear_cache' => true ) );
atlas_s_ok( false === atlas_s_get()['ar_try_on_clear_cache'], 'clear-cache runs once and is stored as off' );

list( $s, $d ) = atlas_s_save( '{"ar_try_on_ar": ', true );
atlas_s_ok( 422 === $s && 'invalid_settings' === $d['code'], 'broken JSON: 422, option untouched', "$s" );
list( $s, $d ) = atlas_s_save( '"just a string"', true );
atlas_s_ok( 422 === $s, 'JSON that is not an object: 422', "$s" );
$big = array();
for ( $i = 0; $i < 20000; $i++ ) {
	$big[ 'k' . $i ] = str_repeat( 'x', 20 );
}
$t0            = microtime( true );
list( $s, $d ) = atlas_s_save( $big );
atlas_s_ok( 200 === $s && strlen( maybe_serialize( atlas_s_get() ) ) < 20000 && count( $d['ignored'] ) <= 50, sprintf( '20 000 junk keys: nothing stored, %.0f ms', ( microtime( true ) - $t0 ) * 1000 ) );

echo "\n4. Wizard uses the same rules\n";
$wizard = function ( $settings ) {
	$request = new WP_REST_Request( 'POST', '/ar_try_on/v1/wizard' );
	$request->set_header( 'Content-Type', 'application/json' );
	$request->set_body( wp_json_encode( array( 'mode' => 'full', 'status' => 'done', 'settings' => $settings ) ) );
	$response = rest_do_request( $request );
	return $response->get_status();
};
$onboarding = get_option( 'ar_try_on_onboarding_completed', null );
$s          = $wizard( array( 'ar_try_on_ar_button_text' => '<b>Hi</b><script>x</script>', 'ar_try_on_ar_button_background_color' => 'javascript:alert(1)', 'tryon_snapshot' => 'yes', 'ar_try_on_poster_color' => '#000000' ) );
$after      = atlas_s_get();
atlas_s_ok( 200 === $s && 'Hi' === $after['ar_try_on_ar_button_text'], 'wizard text sanitized the same way', "$s " . $after['ar_try_on_ar_button_text'] );
atlas_s_ok( '#3a3a3a' === $after['ar_try_on_ar_button_background_color'], 'wizard bad colour refused, old value kept' );
atlas_s_ok( true === $after['tryon_snapshot'], 'wizard snapshot flag still saved as true' );
atlas_s_ok( 'rgba(10,20,30,0.5)' === $after['ar_try_on_poster_color'], 'wizard cannot write keys outside its own fields' );
if ( null === $onboarding ) {
	delete_option( 'ar_try_on_onboarding_completed' );
} else {
	update_option( 'ar_try_on_onboarding_completed', $onboarding );
}

// Restore.
if ( null === $original ) {
	delete_option( 'ar_try_on_settings' );
} else {
	update_option( 'ar_try_on_settings', $original );
}
AR_TRY_ON_Helper::clear_settings_cache();
require_once ABSPATH . 'wp-admin/includes/user.php';
foreach ( $atlas_s['users'] as $id ) {
	wp_delete_user( $id );
}
wp_set_current_user( 0 );
echo "\n# pass {$atlas_s['pass']}\n# fail {$atlas_s['fail']}\n";
if ( $atlas_s['fail'] ) {
	WP_CLI::halt( 1 );
}
