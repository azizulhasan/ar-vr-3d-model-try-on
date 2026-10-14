<?php
namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).
/**
 * AR-84: AtlasAR Cloud connector — the server-side API client.
 *
 * The store owner pastes an AtlasAR Cloud API key; a product's GLB is sent to the service, which
 * returns a smaller, true-size GLB that is saved as a NEW Media Library file (the original stays).
 *
 * Security model:
 *  - The API key never reaches the browser. It is stored encrypted (libsodium secretbox, key
 *    derived from the site salts) in a non-autoloaded option and only ever shown masked.
 *  - The service URL is DEFAULT_SERVICE_URL (production) unless a developer defines the
 *    ATLAS_AR_SERVICE_URL constant (platform plugin contract, BLUEPRINT §8). While production has
 *    no URL yet the connector stays hidden. No request is ever made before the owner ticks the
 *    agreement and connects, nor while an admin page renders (status is a cached snapshot).
 *  - A revoked key is cleared automatically; the owner sees "Connect" again.
 *  - Only a local GLB attachment is uploaded (never a user-supplied URL or path: no SSRF / LFI).
 *  - The result is downloaded only from the service's own origin(s), without redirects, with a
 *    size cap, and checked for the glTF magic + header length before it is saved.
 *
 * Generic on purpose: Pro extends it through the atlas_ar_cloud_* filters (e.g. photo → 3D).
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      2.4.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Cloud
 */
class AR_TRY_ON_Cloud {

	/** Option holding { key: encrypted, plan, used, limit, resets_at, checked_at }. Not autoloaded. */
	const OPTION = 'atlas_ar_cloud';

	/** Post meta holding the running / last optimize job of an item. */
	const JOB_META = '_atlas_ar_cloud_job';

	/** Attachment meta marking a file this connector created (and from which source). */
	const RESULT_META = '_atlas_ar_cloud_source';

	/** Largest GLB we send or accept back (the service's own upload cap). */
	const MAX_BYTES = 50 * 1024 * 1024;

	/**
	 * Production service URL. Empty until the production domain is live: the connector stays hidden.
	 * Developers point a site at another service with define( 'ATLAS_AR_SERVICE_URL', '…' ).
	 */
	const DEFAULT_SERVICE_URL = '';

	/** API key format issued by the service: ar_live_ + 32 base62 characters. */
	const KEY_PATTERN = '/^ar_live_[A-Za-z0-9]{32}$/';

	/**
	 * Service base URL ('' when the site has not configured one).
	 *
	 * @return string
	 */
	public static function base_url() {
		$url = defined( 'ATLAS_AR_SERVICE_URL' ) ? (string) constant( 'ATLAS_AR_SERVICE_URL' ) : self::DEFAULT_SERVICE_URL;
		/**
		 * Filters the AtlasAR Cloud API base URL (no trailing slash).
		 *
		 * @since 2.4.0
		 * @param string $url Base URL, '' = connector disabled.
		 */
		$url = (string) apply_filters( 'atlas_ar_cloud_base_url', $url );
		$url = untrailingslashit( esc_url_raw( $url, array( 'https', 'http' ) ) );
		if ( '' === $url ) {
			return '';
		}
		// Plain http only for a local development service.
		if ( 0 === strpos( $url, 'http://' ) && ! self::is_local_host( wp_parse_url( $url, PHP_URL_HOST ) ) ) {
			return '';
		}
		return $url;
	}

	/**
	 * Whether the connector is available on this site.
	 *
	 * @return bool
	 */
	public static function is_available() {
		return '' !== self::base_url();
	}

	/**
	 * @param string|null $host Host name.
	 * @return bool
	 */
	private static function is_local_host( $host ) {
		return in_array( strtolower( (string) $host ), array( 'localhost', '127.0.0.1', '[::1]', '::1' ), true )
			|| (bool) preg_match( '/\.(localhost|test)$/i', (string) $host );
	}

	/* ------------------------------------------------------------------ */
	/* Key storage                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * 32-byte secretbox key derived from the site salts (changing the salts disconnects).
	 *
	 * @return string
	 */
	private static function box_key() {
		return sodium_crypto_generichash( wp_salt( 'auth' ) . '|atlas_ar_cloud', '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
	}

	/**
	 * @return array Stored option (decrypted key NOT included).
	 */
	public static function stored() {
		$value = get_option( self::OPTION, array() );
		return is_array( $value ) ? $value : array();
	}

	/**
	 * The decrypted API key, or '' when none / unreadable.
	 *
	 * @return string
	 */
	public static function get_key() {
		$stored = self::stored();
		if ( empty( $stored['key'] ) || ! is_string( $stored['key'] ) ) {
			return '';
		}
		$raw = base64_decode( $stored['key'], true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Decoding our own ciphertext.
		if ( false === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return '';
		}
		$nonce = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$plain = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), $nonce, self::box_key() );
		return ( is_string( $plain ) && preg_match( self::KEY_PATTERN, $plain ) ) ? $plain : '';
	}

	/**
	 * Verify a key against the service, then store it encrypted.
	 *
	 * @param string $key API key.
	 * @return array|\WP_Error Public status on success.
	 */
	public static function connect( $key ) {
		$key = trim( (string) $key );
		if ( ! preg_match( self::KEY_PATTERN, $key ) ) {
			return new \WP_Error( 'invalid_key_format', __( 'That does not look like an AtlasAR Cloud API key (it starts with ar_live_).', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$usage = self::request( 'GET', '/v1/usage', array(), $key );
		if ( is_wp_error( $usage ) ) {
			return $usage;
		}
		$nonce  = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$cipher = base64_encode( $nonce . sodium_crypto_secretbox( $key, $nonce, self::box_key() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Storing ciphertext.
		$value  = array_merge( array( 'key' => $cipher ), self::usage_fields( $usage ) );
		delete_option( self::OPTION );
		add_option( self::OPTION, $value, '', false ); // Never autoloaded.
		return self::status();
	}

	/**
	 * Forget the key.
	 */
	public static function disconnect() {
		delete_option( self::OPTION );
	}

	/**
	 * The plan and this month's model allowance from GET /v1/usage (AR-87: the shared platform's
	 * contract: { usage: { plan, units_used, units_limit, units_remaining, resets_at } }; a
	 * unit is one model, units_limit null = no monthly limit).
	 *
	 * @param array $data Decoded response.
	 * @return array
	 */
	private static function usage_fields( $data ) {
		$u     = isset( $data['usage'] ) && is_array( $data['usage'] ) ? $data['usage'] : array();
		$limit = $u['units_limit'] ?? null;
		return array(
			'plan'       => sanitize_key( (string) ( $u['plan'] ?? '' ) ),
			'used'       => absint( $u['units_used'] ?? 0 ),
			'limit'      => null === $limit ? null : absint( $limit ),
			'resets_at'  => sanitize_text_field( (string) ( $u['resets_at'] ?? '' ) ),
			'checked_at' => time(),
		);
	}

	/**
	 * Re-read plan and this month's usage with the stored key.
	 *
	 * @return array|\WP_Error
	 */
	public static function refresh() {
		$usage = self::request( 'GET', '/v1/usage' );
		if ( is_wp_error( $usage ) ) {
			return $usage;
		}
		update_option( self::OPTION, array_merge( self::stored(), self::usage_fields( $usage ) ), false );
		return self::status();
	}

	/**
	 * Browser-safe status (masked key only).
	 *
	 * @return array
	 */
	public static function status() {
		$stored    = self::stored();
		$connected = '' !== self::get_key();
		return array(
			'available'  => self::is_available(),
			'connected'  => $connected,
			'plan'       => $connected ? (string) ( $stored['plan'] ?? '' ) : '',
			// Models this month: used / limit (limit null = no monthly limit).
			'used'       => $connected ? (int) ( $stored['used'] ?? 0 ) : 0,
			'limit'      => $connected && isset( $stored['limit'] ) ? (int) $stored['limit'] : null,
			'resets_at'  => $connected ? (string) ( $stored['resets_at'] ?? '' ) : '',
			'checked_at' => $connected ? (int) ( $stored['checked_at'] ?? 0 ) : 0,
		);
	}

	/* ------------------------------------------------------------------ */
	/* HTTP                                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * Call the service API. Returns the decoded JSON body or a WP_Error with a readable message.
	 *
	 * @param string      $method  HTTP method.
	 * @param string      $path    Path starting with /v1/.
	 * @param array       $args    Extra wp_remote_request args (body, headers, timeout).
	 * @param string|null $key     Key to use (defaults to the stored one).
	 * @return array|\WP_Error
	 */
	public static function request( $method, $path, $args = array(), $key = null ) {
		$base = self::base_url();
		if ( '' === $base ) {
			return new \WP_Error( 'cloud_unavailable', __( 'AtlasAR Cloud is not available on this site.', 'ar-vr-3d-model-try-on' ), array( 'status' => 503 ) );
		}
		$using_stored = null === $key;
		$key          = $using_stored ? self::get_key() : $key;
		if ( '' === $key ) {
			return new \WP_Error( 'cloud_not_connected', __( 'Connect AtlasAR Cloud first (AtlasAR → Integration).', 'ar-vr-3d-model-try-on' ), array( 'status' => 409 ) );
		}
		$headers  = array_merge(
			array(
				'Authorization' => 'Bearer ' . $key,
				'Accept'        => 'application/json',
				'User-Agent'    => 'AtlasAR-WordPress/' . ( defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '0' ) . '; ' . home_url( '/' ),
			),
			$args['headers'] ?? array()
		);
		$response = wp_remote_request(
			$base . $path,
			array(
				'method'      => $method,
				'headers'     => $headers,
				'body'        => $args['body'] ?? null,
				'timeout'     => $args['timeout'] ?? 20,
				'redirection' => 0,
				'sslverify'   => true,
			)
		);
		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'cloud_unreachable', __( 'Could not reach AtlasAR Cloud. Please try again in a minute.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$data = is_array( $data ) ? $data : array();
		if ( $code >= 200 && $code < 300 ) {
			return $data;
		}
		$error = self::error_from( $code, $data );
		if ( $using_stored && 'cloud_invalid_api_key' === $error->get_error_code() ) {
			self::disconnect(); // Revoked key: clear it so the owner sees "Connect" again.
			$error = new \WP_Error( 'cloud_not_connected', __( 'Your AtlasAR Cloud key was revoked. Press Connect in AtlasAR → Integration to connect again.', 'ar-vr-3d-model-try-on' ), array( 'status' => 409 ) );
		}
		return $error;
	}

	/**
	 * Map a service error to a WP_Error. Only the service's stable code is trusted; the message
	 * shown to the merchant is ours (never echo remote text into the admin as HTML).
	 *
	 * @param int   $code HTTP status.
	 * @param array $data Decoded body.
	 * @return \WP_Error
	 */
	private static function error_from( $code, $data ) {
		$remote   = sanitize_key( (string) ( $data['error']['code'] ?? '' ) );
		// AR-87: the shared platform's stable error codes (API-V1.md of the service).
		$messages = array(
			'missing_api_key'       => __( 'The API key is missing.', 'ar-vr-3d-model-try-on' ),
			'invalid_api_key'       => __( 'This API key is not valid or was revoked. Create a new key in your AtlasAR Cloud dashboard.', 'ar-vr-3d-model-try-on' ),
			'approval_required'     => __( 'This site is waiting for approval: the AtlasAR Cloud account owner was emailed a link to approve it.', 'ar-vr-3d-model-try-on' ),
			'suspended'             => __( 'This site is suspended on AtlasAR Cloud. Please contact AtlasAR support.', 'ar-vr-3d-model-try-on' ),
			'rate_limited'          => __( 'Too many requests. Please wait a minute and try again.', 'ar-vr-3d-model-try-on' ),
			'quota_exceeded'        => __( 'This month\'s models on your AtlasAR Cloud plan are used up. They renew at the start of next month, or upgrade.', 'ar-vr-3d-model-try-on' ),
			'feature_not_in_plan'   => __( 'Your AtlasAR Cloud plan does not include this feature.', 'ar-vr-3d-model-try-on' ),
			'model_limit'           => __( 'Your AtlasAR Cloud plan has reached its limit of hosted models. Delete one or upgrade.', 'ar-vr-3d-model-try-on' ),
			'too_many_in_progress'  => __( 'Several models are already being processed. Please wait for them to finish.', 'ar-vr-3d-model-try-on' ),
			'server_busy'           => __( 'AtlasAR Cloud is busy. Please try again in a minute; nothing was charged.', 'ar-vr-3d-model-try-on' ),
			'file_too_large'        => __( 'The model is too large for AtlasAR Cloud (50 MB maximum).', 'ar-vr-3d-model-try-on' ),
			'generation_unavailable' => __( 'Photo to 3D is not available yet.', 'ar-vr-3d-model-try-on' ),
			'not_found'             => __( 'AtlasAR Cloud no longer has this model.', 'ar-vr-3d-model-try-on' ),
		);
		$message = $messages[ $remote ] ?? sprintf(
			/* translators: %s: error code from the service */
			__( 'AtlasAR Cloud refused the request (%s).', 'ar-vr-3d-model-try-on' ),
			'' !== $remote ? $remote : 'HTTP ' . $code
		);
		$status = in_array( $code, array( 403, 404, 409, 413, 415, 422, 429 ), true ) ? $code : 502;
		if ( 401 === $code ) {
			$status = 409; // Our route is fine; the stored key is not. Avoid a 401 that logs WP out in some clients.
		}
		return new \WP_Error( 'cloud_' . ( '' !== $remote ? $remote : 'error' ), $message, array( 'status' => $status ) );
	}

	/* ------------------------------------------------------------------ */
	/* Optimize                                                            */
	/* ------------------------------------------------------------------ */

	/**
	 * Absolute path of a local GLB attachment, or WP_Error. Only real attachments inside uploads.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string|\WP_Error
	 */
	public static function local_glb_path( $attachment_id ) {
		$attachment_id = absint( $attachment_id );
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) {
			return new \WP_Error( 'invalid_source', __( 'Choose a GLB file from the Media Library.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$file    = get_attached_file( $attachment_id );
		$uploads = wp_get_upload_dir();
		$real    = $file ? realpath( $file ) : false;
		$base    = realpath( $uploads['basedir'] );
		if ( ! $real || ! $base || 0 !== strpos( wp_normalize_path( $real ), trailingslashit( wp_normalize_path( $base ) ) ) ) {
			return new \WP_Error( 'invalid_source', __( 'This file is not in the Media Library uploads folder.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		if ( 'glb' !== strtolower( pathinfo( $real, PATHINFO_EXTENSION ) ) ) {
			return new \WP_Error( 'invalid_source', __( 'Only GLB files can be optimized.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$size = filesize( $real );
		if ( ! $size || $size > self::MAX_BYTES ) {
			return new \WP_Error( 'file_too_large', __( 'The model is too large for AtlasAR Cloud (50 MB maximum).', 'ar-vr-3d-model-try-on' ), array( 'status' => 413 ) );
		}
		return $real;
	}

	/**
	 * Find the Media Library attachment behind a model URL saved on an item (local files only).
	 *
	 * @param string $url Model URL.
	 * @return int Attachment ID or 0.
	 */
	public static function attachment_from_url( $url ) {
		$url = (string) $url;
		if ( '' === $url ) {
			return 0;
		}
		$id = attachment_url_to_postid( $url );
		if ( ! $id ) {
			// URLs saved with another scheme / host alias (http vs https).
			$path = wp_parse_url( $url, PHP_URL_PATH );
			$base = wp_parse_url( wp_get_upload_dir()['baseurl'], PHP_URL_PATH );
			if ( $path && $base && 0 === strpos( $path, trailingslashit( $base ) ) ) {
				$id = attachment_url_to_postid( wp_get_upload_dir()['baseurl'] . substr( $path, strlen( $base ) ) );
			}
		}
		return (int) $id;
	}

	/**
	 * Send an attachment to the service. Returns the cloud model array.
	 *
	 * @param int   $attachment_id Source GLB attachment.
	 * @param array $meta          { name, height_cm }.
	 * @return array|\WP_Error
	 */
	public static function start_optimize( $attachment_id, $meta ) {
		$path = self::local_glb_path( $attachment_id );
		if ( is_wp_error( $path ) ) {
			return $path;
		}
		$name   = sanitize_text_field( (string) ( $meta['name'] ?? '' ) );
		$name   = '' !== $name ? mb_substr( $name, 0, 120 ) : 'Model ' . $attachment_id;
		$height = (float) ( $meta['height_cm'] ?? 0 );
		if ( ! ( $height > 0 && $height <= 1000 ) ) {
			return new \WP_Error( 'invalid_height', __( 'Enter the real height of the product (0.1–1000 cm).', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$body = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file inside uploads, validated above.
		if ( false === $body || "glTF" !== substr( $body, 0, 4 ) ) {
			return new \WP_Error( 'not_glb', __( 'This file is not a binary GLB.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$query = http_build_query( array( 'name' => $name, 'height_cm' => (string) round( $height, 2 ) ), '', '&', PHP_QUERY_RFC3986 );
		return self::request(
			'POST',
			'/v1/models/upload?' . $query,
			array(
				'body'    => $body,
				'timeout' => 90,
				'headers' => array(
					'Content-Type'    => 'model/gltf-binary',
					// Same file + same size → same model: a retried click never spends twice.
					'Idempotency-Key' => 'wp-' . substr( hash( 'sha256', home_url() . '|' . $attachment_id . '|' . md5( $body ) . '|' . $height ), 0, 40 ),
				),
			)
		);
	}

	/**
	 * Origins the finished files may be downloaded from (the API origin, plus optional CDN).
	 *
	 * @return string[]
	 */
	private static function allowed_file_origins() {
		$origins = array( self::origin( self::base_url() ) );
		if ( defined( 'ATLAS_AR_SERVICE_FILES_URL' ) ) {
			$origins[] = self::origin( (string) constant( 'ATLAS_AR_SERVICE_FILES_URL' ) );
		}
		/**
		 * Filters the origins (scheme://host[:port]) finished models may be downloaded from.
		 *
		 * @since 2.4.0
		 * @param string[] $origins Allowed origins.
		 */
		return array_values( array_filter( (array) apply_filters( 'atlas_ar_cloud_file_origins', $origins ) ) );
	}

	/**
	 * @param string $url URL.
	 * @return string scheme://host[:port] lower-cased, '' when invalid.
	 */
	private static function origin( $url ) {
		$p = wp_parse_url( (string) $url );
		if ( empty( $p['scheme'] ) || empty( $p['host'] ) || ! in_array( strtolower( $p['scheme'] ), array( 'http', 'https' ), true ) ) {
			return '';
		}
		return strtolower( $p['scheme'] . '://' . $p['host'] ) . ( isset( $p['port'] ) ? ':' . (int) $p['port'] : '' );
	}

	/**
	 * Download a finished GLB into the Media Library as a new attachment.
	 *
	 * @param string $url       File URL from the service.
	 * @param int    $source_id Source attachment.
	 * @param int    $post_id   Item the model belongs to (attachment parent).
	 * @param string $model_id  Cloud model id.
	 * @return int|\WP_Error New attachment ID.
	 */
	public static function import_result( $url, $source_id, $post_id, $model_id ) {
		$origin = self::origin( $url );
		if ( '' === $origin || ! in_array( $origin, self::allowed_file_origins(), true ) ) {
			return new \WP_Error( 'untrusted_file_url', __( 'AtlasAR Cloud returned a file from an unexpected address; it was not downloaded.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}
		if ( 0 === strpos( $origin, 'http://' ) && ! self::is_local_host( wp_parse_url( $origin, PHP_URL_HOST ) ) ) {
			return new \WP_Error( 'untrusted_file_url', __( 'AtlasAR Cloud returned an insecure file address; it was not downloaded.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = wp_tempnam( 'atlas-ar-cloud' );
		if ( ! $tmp ) {
			return new \WP_Error( 'tmp_failed', __( 'Could not create a temporary file.', 'ar-vr-3d-model-try-on' ), array( 'status' => 500 ) );
		}
		$response = wp_remote_get(
			$url,
			array(
				'timeout'             => 60,
				'redirection'         => 0,
				'stream'              => true,
				'filename'            => $tmp,
				'limit_response_size' => self::MAX_BYTES + 1,
				'sslverify'           => true,
			)
		);
		$fail = function ( $message ) use ( $tmp ) {
			wp_delete_file( $tmp );
			return new \WP_Error( 'download_failed', $message, array( 'status' => 502 ) );
		};
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return $fail( __( 'Could not download the optimized model. Please try again.', 'ar-vr-3d-model-try-on' ) );
		}
		$size = (int) filesize( $tmp );
		if ( $size < 20 || $size > self::MAX_BYTES ) {
			return $fail( __( 'The optimized model has an unexpected size; it was not saved.', 'ar-vr-3d-model-try-on' ) );
		}
		// glTF binary header: magic "glTF", version 2, total length == file size.
		$fh     = fopen( $tmp, 'rb' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- Reading our own temp file.
		$header = $fh ? fread( $fh, 12 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fread
		if ( $fh ) {
			fclose( $fh ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		}
		$h = strlen( $header ) === 12 ? unpack( 'a4magic/Vversion/Vlength', $header ) : false;
		if ( ! $h || 'glTF' !== $h['magic'] || 2 !== $h['version'] || $size !== $h['length'] ) {
			return $fail( __( 'The downloaded file is not a valid GLB; it was not saved.', 'ar-vr-3d-model-try-on' ) );
		}

		$source_name = pathinfo( (string) get_attached_file( $source_id ), PATHINFO_FILENAME );
		$file        = array(
			'name'     => sanitize_file_name( ( '' !== $source_name ? $source_name : 'model' ) . '-optimized-' . wp_generate_password( 6, false ) . '.glb' ),
			'tmp_name' => $tmp,
		);
		$id = media_handle_sideload( $file, absint( $post_id ), null, array( 'post_mime_type' => 'model/gltf-binary' ) );
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $tmp );
			return new \WP_Error( 'save_failed', __( 'The optimized model could not be saved to the Media Library.', 'ar-vr-3d-model-try-on' ), array( 'status' => 500 ) );
		}
		update_post_meta(
			$id,
			self::RESULT_META,
			array(
				'source_attachment' => absint( $source_id ),
				'model_id'          => sanitize_text_field( $model_id ),
				'created_at'        => time(),
			)
		);
		return (int) $id;
	}
}
