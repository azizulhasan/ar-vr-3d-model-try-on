<?php
/**
 * AR-86 — hacker-style tests for POST ar_try_on/v1/upload-compressed.
 *
 * Fires real multipart HTTP requests at the local site (authenticated with a
 * throwaway application password that is deleted at the end) so the full
 * wp_handle_upload() path runs, then checks that nothing was written outside
 * uploads/atlas_ar/<post_id>/.
 *
 * Run (local dev site only, never production):
 *   cd /d/laragon/www/tts && php /c/wp-cli/wp-cli.phar eval-file \
 *     wp-content/plugins/ar-vr-3d-model-try-on/tests/ar-86-upload-compressed-path-traversal.php
 *
 * Not shipped: gulpfile excludes tests/**.
 *
 * @package AR_TRY_ON
 */

defined( 'ABSPATH' ) || exit;

if ( 'local' !== wp_get_environment_type() && 'development' !== wp_get_environment_type() ) {
	WP_CLI::error( 'AR-86 tests only run on a local/development site.' );
}

// eval-file runs inside a function, so keep counters in $GLOBALS explicitly.
$GLOBALS['ar86_pass'] = 0;
$GLOBALS['ar86_fail'] = 0;

/**
 * Record one assertion.
 *
 * @param string $label     Case name.
 * @param bool   $condition Pass/fail.
 * @param string $detail    Extra info on failure.
 */
function ar86_assert( $label, $condition, $detail = '' ) {
	if ( $condition ) {
		++$GLOBALS['ar86_pass'];
		WP_CLI::log( "  PASS  $label" );
	} else {
		++$GLOBALS['ar86_fail'];
		WP_CLI::log( "  FAIL  $label  $detail" );
	}
}

/**
 * POST a multipart request to the route.
 *
 * @param array  $fields   Text fields.
 * @param string $filename Uploaded file name.
 * @param string $content  Uploaded file bytes.
 * @param string $auth     Basic auth header value.
 * @return array{status:int,body:array|null,raw:string}
 */
function ar86_post( $fields, $filename, $content, $auth ) {
	$boundary = 'ar86' . wp_generate_password( 20, false );
	$body     = '';
	foreach ( $fields as $name => $value ) {
		$body .= "--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n";
	}
	$body .= "--$boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"$filename\"\r\n"
		. "Content-Type: application/octet-stream\r\n\r\n$content\r\n--$boundary--\r\n";

	$response = wp_remote_post(
		rest_url( 'ar_try_on/v1/upload-compressed' ),
		array(
			'timeout'   => 30,
			'sslverify' => false,
			'headers'   => array(
				'Authorization' => $auth,
				'Content-Type'  => "multipart/form-data; boundary=$boundary",
			),
			'body'      => $body,
		)
	);

	if ( is_wp_error( $response ) ) {
		return array( 'status' => 0, 'body' => null, 'raw' => $response->get_error_message() );
	}
	$raw = wp_remote_retrieve_body( $response );
	return array(
		'status' => (int) wp_remote_retrieve_response_code( $response ),
		'body'   => json_decode( $raw, true ),
		'raw'    => substr( $raw, 0, 300 ),
	);
}

/**
 * Assert a request was rejected with the given status + code.
 */
function ar86_expect_reject( $label, $result, $status, $code ) {
	$got = isset( $result['body']['code'] ) ? $result['body']['code'] : '';
	ar86_assert( $label, $status === $result['status'] && $code === $got, "got {$result['status']} {$got} {$result['raw']}" );
}

/**
 * Every file under $dir whose name contains the canary marker.
 */
function ar86_find_canaries( $dir, $marker ) {
	$found = array();
	if ( ! is_dir( $dir ) ) {
		return $found;
	}
	$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );
	foreach ( $it as $f ) {
		if ( false !== strpos( $f->getFilename(), $marker ) ) {
			$found[] = wp_normalize_path( $f->getPathname() );
		}
	}
	return $found;
}

// ---------------------------------------------------------------- setup.
$admins = get_users( array( 'role' => 'administrator', 'number' => 1 ) );
if ( empty( $admins ) ) {
	WP_CLI::error( 'No administrator user found.' );
}
$admin = $admins[0];
wp_set_current_user( $admin->ID );

list( $app_password, $app_item ) = WP_Application_Passwords::create_new_application_password( $admin->ID, array( 'name' => 'ar86-test-' . time() ) );
$auth = 'Basic ' . base64_encode( $admin->user_login . ':' . $app_password ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode

$post_id = wp_insert_post( array( 'post_title' => 'AR-86 test post', 'post_status' => 'draft' ) );
$paths   = \AR_TRY_ON\AR_TRY_ON_Compression::get_upload_paths( $post_id );
$post_dir = $paths['post_dir'];
$uploads  = wp_upload_dir();

$marker   = 'ar86canary' . wp_generate_password( 6, false, false );
$glb      = 'glTF' . pack( 'V', 2 ) . pack( 'V', 12 ); // Minimal GLB header.
$glb_name = $marker . '_compressed.glb';

$attack_targets = array(
	'../ traversal to wp-content'      => $post_dir . '/../../../' . $marker,
	'../ traversal ending in a digit'  => ATLAS_AR_MODEL_DIR . '../../plugins/' . $post_id,
	'encoded-ish ..\\ traversal'       => str_replace( '/', '\\', $post_dir ) . '\\..\\..\\..',
	'absolute path outside uploads'    => wp_normalize_path( sys_get_temp_dir() ),
	'Windows drive path'               => 'C:\\Windows\\Temp',
	'Windows drive path ending digit'  => 'C:/Users/Public/' . $post_id,
	'wp-content/plugins'               => WP_PLUGIN_DIR,
	'this plugin folder'               => WP_PLUGIN_DIR . '/ar-vr-3d-model-try-on',
	'uploads root'                     => $uploads['basedir'],
	'atlas_ar root (not post folder)'  => ATLAS_AR_MODEL_DIR,
	'another post folder'              => ATLAS_AR_MODEL_DIR . ( $post_id + 999999 ),
	'stream wrapper'                   => 'php://filter/resource=' . $post_dir,
);

WP_CLI::log( "AR-86 tests — post $post_id, folder $post_dir" );

try {
	// ------------------------------------------------ 1. target path attacks.
	WP_CLI::log( 'Target path attacks (post_id + target_path, like the new client):' );
	foreach ( $attack_targets as $label => $target ) {
		$r = ar86_post( array( 'post_id' => $post_id, 'target_path' => $target ), $glb_name, $glb, $auth );
		ar86_expect_reject( $label, $r, 422, 'atlas_ar_upload_target_invalid' );
	}

	WP_CLI::log( 'Target path attacks (target_path only, like a pre-AR-86 client):' );
	foreach ( $attack_targets as $label => $target ) {
		$r    = ar86_post( array( 'target_path' => $target ), $glb_name, $glb, $auth );
		$code = isset( $r['body']['code'] ) ? $r['body']['code'] : '';
		ar86_assert(
			"$label (legacy)",
			422 === $r['status'] && in_array( $code, array( 'atlas_ar_upload_target_invalid', 'atlas_ar_upload_invalid_post' ), true ),
			"got {$r['status']} $code {$r['raw']}"
		);
	}

	$r = ar86_post( array( 'post_id' => 0 ), $glb_name, $glb, $auth );
	ar86_expect_reject( 'missing post_id and target_path', $r, 422, 'atlas_ar_upload_invalid_post' );

	$r = ar86_post( array( 'post_id' => $post_id + 999999 ), $glb_name, $glb, $auth );
	ar86_expect_reject( 'non-existent post_id', $r, 422, 'atlas_ar_upload_invalid_post' );

	// ------------------------------------------------ 2. file attacks.
	WP_CLI::log( 'File attacks (valid folder):' );
	$file_attacks = array(
		'PHP shell renamed .glb'      => array( $marker . '.glb', '<?php echo "pwned"; ?>' ),
		'PHP file'                    => array( $marker . '.php', '<?php echo "pwned"; ?>' ),
		'HTML file'                   => array( $marker . '.html', '<script>alert(1)</script>' ),
		'double extension .glb.php'   => array( $marker . '.glb.php', $glb ),
		'fake .gltf (not JSON)'       => array( $marker . '.gltf', '<?php echo 1; ?>' ),
		'.gltf JSON without asset'    => array( $marker . '.gltf', '{"scenes":[]}' ),
		'empty .glb'                  => array( $marker . '.glb', '' ),
	);
	foreach ( $file_attacks as $label => $spec ) {
		$r = ar86_post( array( 'post_id' => $post_id ), $spec[0], $spec[1], $auth );
		ar86_expect_reject( $label, $r, 422, 'atlas_ar_upload_file_invalid' );
	}

	// File names with separators. PHP strips the directory part of an
	// uploaded file name before the handler sees it, so check the handler
	// directly with a crafted $_FILES entry as well.
	foreach ( array( '../' . $marker . '.glb', '..\\..\\' . $marker . '.glb' ) as $evil_name ) {
		$r     = ar86_post( array( 'post_id' => $post_id ), $evil_name, $glb, $auth );
		$found = ar86_find_canaries( WP_CONTENT_DIR, $marker );
		$ok    = in_array( $r['status'], array( 200, 422 ), true );
		foreach ( $found as $f ) {
			$ok = $ok && 0 === strpos( $f, wp_normalize_path( $post_dir ) . '/' );
		}
		ar86_assert( "name '$evil_name' stays in the post folder (HTTP)", $ok, "status {$r['status']} files " . implode( ',', $found ) );
		foreach ( $found as $f ) {
			if ( 0 === strpos( $f, wp_normalize_path( $post_dir ) . '/' ) ) {
				wp_delete_file( $f );
			}
		}
	}

	$routes = new \ATLAS_AR_API\AR_TRY_ON_Compression_Routes();
	$tmp    = wp_tempnam( 'ar86' );
	file_put_contents( $tmp, $glb ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	foreach ( array( '../evil.glb', '..\\evil.glb', "evil.glb\0.php" ) as $evil_name ) {
		$req = new WP_REST_Request( 'POST', '/ar_try_on/v1/upload-compressed' );
		$req->set_param( 'post_id', $post_id );
		$req->set_file_params( array( 'file' => array( 'name' => $evil_name, 'tmp_name' => $tmp, 'size' => strlen( $glb ), 'error' => 0, 'type' => 'model/gltf-binary' ) ) );
		$res = $routes->upload_compressed_file( $req );
		ar86_assert(
			'name ' . wp_json_encode( $evil_name ) . ' rejected (in-process)',
			is_wp_error( $res ) && 'atlas_ar_upload_file_invalid' === $res->get_error_code()
		);
	}
	wp_delete_file( $tmp );

	// filter_upload_dir_target() defence in depth.
	$prop = new ReflectionProperty( $routes, 'upload_target_path' );
	$prop->setAccessible( true );
	$base_dirs = wp_upload_dir( null, false );
	foreach ( array( WP_PLUGIN_DIR, $uploads['basedir'] . '/../plugins', 'C:/Windows/Temp' ) as $evil_dir ) {
		$prop->setValue( $routes, $evil_dir );
		$dirs = $routes->filter_upload_dir_target( $base_dirs );
		ar86_assert( "upload_dir filter refuses $evil_dir", ! empty( $dirs['error'] ) );
	}
	$prop->setValue( $routes, $post_dir );
	$dirs = $routes->filter_upload_dir_target( $base_dirs );
	ar86_assert( 'upload_dir filter keeps the post folder', empty( $dirs['error'] ) && wp_normalize_path( $dirs['path'] ) === wp_normalize_path( $post_dir ) );
	$prop->setValue( $routes, null );

	// ------------------------------------------------ 3. nothing escaped.
	$escaped = array_filter(
		ar86_find_canaries( WP_CONTENT_DIR, $marker ),
		function ( $f ) use ( $post_dir ) {
			return 0 !== strpos( $f, wp_normalize_path( $post_dir ) . '/' );
		}
	);
	$escaped = array_merge( $escaped, ar86_find_canaries( sys_get_temp_dir(), $marker ) );
	ar86_assert( 'no canary file written outside the post folder', empty( $escaped ), implode( ', ', $escaped ) );
	ar86_assert( 'no canary folder created in wp-content', ! file_exists( WP_CONTENT_DIR . '/' . $marker ) );

	// ------------------------------------------------ 4. normal compress still works.
	WP_CLI::log( 'Normal uploads (existing users):' );
	$clients = array(
		'pre-AR-86 client (target_path only)' => array( 'target_path' => $post_dir ),
		'AR-86 client (post_id + target_path)' => array( 'post_id' => $post_id, 'target_path' => $post_dir ),
		'post_id only'                         => array( 'post_id' => $post_id ),
		'target_path with trailing slash'      => array( 'target_path' => $post_dir . '/' ),
		// On Windows the browser gets post_dir from /compression/prepare as
		// "D:\site/wp-content/uploads/atlas_ar/<id>" (mixed slashes).
		'target_path with Windows slashes'     => array( 'target_path' => str_replace( '/', '\\', $post_dir ) ),
		'target_path, Windows mixed slashes'   => array( 'target_path' => str_replace( '/', '\\', ABSPATH ) . substr( $post_dir, strlen( wp_normalize_path( ABSPATH ) ) ) ),
	);
	foreach ( $clients as $label => $fields ) {
		$r    = ar86_post( $fields, 'model_compressed.glb', $glb, $auth );
		$path = isset( $r['body']['file_path'] ) ? wp_normalize_path( $r['body']['file_path'] ) : '';
		$url  = isset( $r['body']['file_url'] ) ? $r['body']['file_url'] : '';
		ar86_assert(
			$label,
			200 === $r['status'] && ! empty( $r['body']['success'] )
				&& 0 === strpos( $path, wp_normalize_path( $post_dir ) . '/' ) && is_file( $path )
				&& 0 === strpos( $url, trailingslashit( $paths['post_url'] ) ),
			"got {$r['status']} {$r['raw']}"
		);
		if ( $path && is_file( $path ) ) {
			wp_delete_file( $path );
		}
	}

	$gltf = wp_json_encode( array( 'asset' => array( 'version' => '2.0' ) ) );
	$r    = ar86_post( array( 'post_id' => $post_id ), 'model_compressed.gltf', $gltf, $auth );
	$path = isset( $r['body']['file_path'] ) ? $r['body']['file_path'] : '';
	ar86_assert( 'valid .gltf upload', 200 === $r['status'] && is_file( $path ), "got {$r['status']} {$r['raw']}" );
	if ( $path && is_file( $path ) ) {
		wp_delete_file( $path );
	}

	// ------------------------------------------------ 5. auth.
	$anon = wp_remote_post( rest_url( 'ar_try_on/v1/upload-compressed' ), array( 'body' => array( 'post_id' => $post_id ) ) );
	ar86_assert( 'anonymous request refused', in_array( (int) wp_remote_retrieve_response_code( $anon ), array( 401, 403 ), true ) );
} finally {
	// ------------------------------------------------ cleanup.
	WP_Application_Passwords::delete_application_password( $admin->ID, $app_item['uuid'] );
	foreach ( ar86_find_canaries( WP_CONTENT_DIR, $marker ) as $f ) {
		wp_delete_file( $f );
	}
	// Places an unpatched build could have written to.
	foreach ( array( sys_get_temp_dir(), 'C:/Windows/Temp', 'C:/Users/Public', 'C:/Users/Public/' . $post_id ) as $dir ) {
		foreach ( (array) glob( wp_normalize_path( $dir ) . '/*' . $marker . '*' ) as $f ) {
			if ( $f && is_file( $f ) ) {
				WP_CLI::log( "  cleanup: removed escaped file $f" );
				wp_delete_file( $f );
			}
		}
	}
	wp_delete_post( $post_id, true );
	if ( is_dir( $post_dir ) && 2 === count( scandir( $post_dir ) ) ) {
		rmdir( $post_dir ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
	}
}

WP_CLI::log( "\nAR-86: {$GLOBALS['ar86_pass']} passed, {$GLOBALS['ar86_fail']} failed." );
if ( $GLOBALS['ar86_fail'] > 0 ) {
	WP_CLI::halt( 1 );
}
WP_CLI::success( 'AR-86 upload-compressed tests passed.' );
