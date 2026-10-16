<?php
/**
 * AR-120: the connection to AtlasAR Cloud (optional; API v1, see the service's API-V1.md).
 *
 * Nothing is sent to the service until the site owner clicks "Connect" (with the consent box) or
 * pastes a key. The API key stays on the server: the dashboard only ever gets its prefix.
 *
 * The service's address comes from the ATLAS_AR_CLOUD_URL constant (wp-config.php) or the
 * `atlas_ar_cloud_url` filter; while it is empty the Cloud features are simply not offered.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Cloud {

	const OPTION    = 'atlas_ar_cloud';
	const USAGE_TTL = 600; // the usage block is cached 10 minutes

	/** @return string the service's base URL, '' while it is not set */
	public static function base_url() {
		$url = defined( 'ATLAS_AR_CLOUD_URL' ) ? (string) ATLAS_AR_CLOUD_URL : '';
		$url = (string) apply_filters( 'atlas_ar_cloud_url', $url );
		return 'https' === wp_parse_url( $url, PHP_URL_SCHEME ) || self::is_local( $url ) ? untrailingslashit( esc_url_raw( $url ) ) : '';
	}

	public static function available() {
		return '' !== self::base_url();
	}

	public static function connected() {
		$c = self::stored();
		return '' !== $c['key'];
	}

	/**
	 * What the dashboard may know (never the key).
	 *
	 * @param bool $fresh ask the service for usage now
	 * @return array
	 */
	public static function status( $fresh = false ) {
		$c   = self::stored();
		$out = array(
			'available'  => self::available(),
			'connected'  => '' !== $c['key'],
			'key_prefix' => $c['key_prefix'],
			'email'      => $c['email'],
			'plan'       => $c['plan'],
			'approval'   => $c['approval'],
			'usage'      => null,
			'error'      => '',
			'site_url'   => self::base_url() ? str_replace( '://api.', '://app.', self::base_url() ) : '',
		);
		if ( $out['connected'] && $out['available'] ) {
			$usage = $fresh ? false : get_transient( self::OPTION . '_usage' );
			if ( false === $usage ) {
				$res = self::request( 'GET', '/v1/usage' );
				if ( is_wp_error( $res ) ) {
					$out['error'] = $res->get_error_message();
					if ( 'approval_required' === $res->get_error_code() ) {
						$out['approval'] = 'pending';
					}
					return $out;
				}
				$usage = isset( $res['usage'] ) && is_array( $res['usage'] ) ? $res['usage'] : array();
				set_transient( self::OPTION . '_usage', $usage, self::USAGE_TTL );
				if ( 'pending' === $c['approval'] ) {
					self::save( array( 'approval' => 'active' ) );
					$out['approval'] = 'active';
				}
			}
			$out['usage'] = self::clean_usage( $usage );
			if ( ! empty( $out['usage']['plan'] ) ) {
				$out['plan'] = $out['usage']['plan'];
			}
		}
		return $out;
	}

	/**
	 * Make a free account for this site (or add the site to the account of that email).
	 *
	 * @param string $email
	 * @return array|\WP_Error status()
	 */
	public static function register( $email ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new \WP_Error( 'atlas_ar_email', __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' ) );
		}
		$res = self::request(
			'POST',
			'/v1/projects/register',
			array(
				'platform' => 'wordpress',
				'site_url' => home_url( '/' ),
				'email'    => $email,
			),
			''
		);
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		if ( empty( $res['api_key'] ) || ! self::valid_key( $res['api_key'] ) ) {
			return new \WP_Error( 'atlas_ar_cloud', __( 'AtlasAR Cloud gave an unexpected answer. Please try again later.', 'ar-vr-3d-model-try-on' ) );
		}
		self::save(
			array(
				'key'        => (string) $res['api_key'],
				'key_prefix' => isset( $res['key_prefix'] ) ? sanitize_text_field( $res['key_prefix'] ) : substr( (string) $res['api_key'], 0, 12 ),
				'project_id' => isset( $res['project_id'] ) ? sanitize_text_field( (string) $res['project_id'] ) : '',
				'plan'       => isset( $res['plan'] ) ? sanitize_key( is_array( $res['plan'] ) ? ( $res['plan']['key'] ?? 'free' ) : $res['plan'] ) : 'free',
				'approval'   => isset( $res['approval'] ) && 'pending' === $res['approval'] ? 'pending' : 'active',
				'email'      => $email,
			)
		);
		return self::status( true );
	}

	/**
	 * Use a key made in the AtlasAR Cloud dashboard. Checked with the service before it is kept.
	 *
	 * @param string $key
	 * @return array|\WP_Error status()
	 */
	public static function use_key( $key ) {
		$key = trim( (string) $key );
		if ( ! self::valid_key( $key ) ) {
			return new \WP_Error( 'atlas_ar_key', __( 'That does not look like an AtlasAR Cloud key (it starts with ar_live_).', 'ar-vr-3d-model-try-on' ) );
		}
		$res = self::request( 'GET', '/v1/usage', null, $key );
		if ( is_wp_error( $res ) && 'approval_required' !== $res->get_error_code() ) {
			return $res;
		}
		self::save(
			array(
				'key'        => $key,
				'key_prefix' => substr( $key, 0, 12 ),
				'approval'   => is_wp_error( $res ) ? 'pending' : 'active',
				'email'      => '',
				'plan'       => is_wp_error( $res ) || empty( $res['usage']['plan'] ) ? 'free' : sanitize_key( $res['usage']['plan'] ),
			)
		);
		return self::status( true );
	}

	/** Forget the key on this site (the account and its hosted models stay on the service). */
	public static function disconnect() {
		delete_option( self::OPTION );
		delete_transient( self::OPTION . '_usage' );
		return self::status();
	}

	/**
	 * A call to the service with this site's key.
	 *
	 * @param string      $method
	 * @param string      $path  /v1/…
	 * @param array|null  $body  JSON body
	 * @param string|null $key   null = the stored key, '' = none
	 * @param array       $raw   a binary body instead of JSON: { body, type, headers }
	 * @return array|\WP_Error the decoded answer
	 */
	public static function request( $method, $path, $body = null, $key = null, array $raw = array() ) {
		$base = self::base_url();
		if ( '' === $base ) {
			return new \WP_Error( 'atlas_ar_cloud_off', __( 'AtlasAR Cloud is not available yet.', 'ar-vr-3d-model-try-on' ) );
		}
		$key     = null === $key ? self::stored()['key'] : (string) $key;
		$headers = array(
			'Accept'     => 'application/json',
			'User-Agent' => 'AtlasAR-WordPress/' . ( defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '0' ) . '; ' . home_url( '/' ),
		);
		if ( '' !== $key ) {
			$headers['Authorization'] = 'Bearer ' . $key;
		}
		$args = array(
			'method'      => $method,
			'timeout'     => 20,
			'redirection' => 0,
			'headers'     => $headers,
		);
		if ( null !== $body ) {
			$args['headers']['Content-Type'] = 'application/json';
			$args['body']                    = wp_json_encode( $body );
		} elseif ( isset( $raw['body'] ) ) {
			$args['headers']['Content-Type'] = isset( $raw['type'] ) ? $raw['type'] : 'application/octet-stream';
			$args['headers']                 = array_merge( $args['headers'], isset( $raw['headers'] ) ? (array) $raw['headers'] : array() );
			$args['body']                    = $raw['body'];
			$args['timeout']                 = 120;
		}
		// A local development service (http://localhost) is not a "safe" URL for WordPress.
		$res = self::is_local( $base ) ? wp_remote_request( $base . $path, $args ) : wp_safe_remote_request( $base . $path, $args );
		if ( is_wp_error( $res ) ) {
			return new \WP_Error( 'atlas_ar_cloud_down', __( 'AtlasAR Cloud could not be reached. Please try again in a moment.', 'ar-vr-3d-model-try-on' ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$data = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		if ( $code >= 400 || ! is_array( $data ) ) {
			$err = is_array( $data ) && isset( $data['error'] ) && is_array( $data['error'] ) ? $data['error'] : array();
			return new \WP_Error(
				isset( $err['code'] ) ? sanitize_key( $err['code'] ) : 'atlas_ar_cloud_' . $code,
				self::error_text( isset( $err['code'] ) ? (string) $err['code'] : '', $code ),
				array( 'status' => $code )
			);
		}
		return $data;
	}

	/* ------------------------------------------------------------------- optimise */

	const JOB_META = '_atlas_ar_cloud_job';

	/**
	 * AR-121: send a model's GLB (its original, when it has one) to AtlasAR Cloud to optimise.
	 *
	 * @param int   $id        3D Library model
	 * @param float $height_cm real height (0 = keep the model's size)
	 * @return array|\WP_Error { status, cloud_id }
	 */
	public static function optimise_start( $id, $height_cm = 0 ) {
		if ( ! self::connected() ) {
			return new \WP_Error( 'atlas_ar_cloud_off', __( 'Connect AtlasAR Cloud first (AtlasAR › Integrations).', 'ar-vr-3d-model-try-on' ) );
		}
		$path = AR_TRY_ON_Library::source_glb_path( $id );
		if ( ! $path ) {
			return new \WP_Error( 'atlas_ar_model', __( 'This model has no GLB file to optimise.', 'ar-vr-3d-model-try-on' ) );
		}
		if ( filesize( $path ) > 50 * MB_IN_BYTES ) {
			return new \WP_Error( 'atlas_ar_size', __( 'AtlasAR Cloud takes GLB files up to 50 MB.', 'ar-vr-3d-model-try-on' ) );
		}
		$query = array( 'name' => mb_substr( get_the_title( $id ), 0, 100 ) );
		if ( $height_cm >= 0.5 && $height_cm <= 1000 ) {
			$query['height_cm'] = round( (float) $height_cm, 2 );
		}
		$res = self::request(
			'POST',
			'/v1/models/upload?' . http_build_query( $query ),
			null,
			null,
			array(
				'body'    => file_get_contents( $path ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local model file sent as the request body.
				'type'    => 'model/gltf-binary',
				'headers' => array( 'Idempotency-Key' => 'wp' . (int) $id . '-' . substr( md5_file( $path ), 0, 24 ) ),
			)
		);
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$cloud_id = isset( $res['id'] ) ? sanitize_text_field( (string) $res['id'] ) : '';
		if ( '' === $cloud_id ) {
			return new \WP_Error( 'atlas_ar_cloud', __( 'AtlasAR Cloud gave an unexpected answer. Please try again later.', 'ar-vr-3d-model-try-on' ) );
		}
		update_post_meta( $id, self::JOB_META, array( 'cloud_id' => $cloud_id, 'status' => 'queued', 'height_cm' => isset( $query['height_cm'] ) ? $query['height_cm'] : 0, 'time' => time() ) );
		return array( 'status' => 'queued', 'cloud_id' => $cloud_id );
	}

	/**
	 * AR-121: check the Cloud job; when the model is ready, its GLB replaces the model's GLB.
	 *
	 * @param int $id 3D Library model
	 * @return array|\WP_Error { status, model? }
	 */
	public static function optimise_poll( $id ) {
		$job = get_post_meta( $id, self::JOB_META, true );
		if ( ! is_array( $job ) || empty( $job['cloud_id'] ) ) {
			return new \WP_Error( 'atlas_ar_cloud_job', __( 'No AtlasAR Cloud job for this model.', 'ar-vr-3d-model-try-on' ) );
		}
		$res = self::request( 'GET', '/v1/models/' . rawurlencode( $job['cloud_id'] ) );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$status = isset( $res['status'] ) ? sanitize_key( $res['status'] ) : '';
		if ( 'failed' === $status ) {
			delete_post_meta( $id, self::JOB_META );
			$why = isset( $res['error']['message'] ) ? sanitize_text_field( $res['error']['message'] ) : '';
			/* translators: %s: reason from the service */
			return new \WP_Error( 'atlas_ar_cloud_failed', trim( sprintf( __( 'AtlasAR Cloud could not optimise this model. %s', 'ar-vr-3d-model-try-on' ), $why ) ) );
		}
		if ( 'ready' !== $status || empty( $res['files']['glb'] ) ) {
			return array( 'status' => $status ? $status : 'processing' );
		}
		$url = is_array( $res['files']['glb'] ) ? (string) ( isset( $res['files']['glb']['url'] ) ? $res['files']['glb']['url'] : '' ) : (string) $res['files']['glb'];
		// A path is on the configured service (trusted); a full URL (the CDN) must be a safe https URL.
		if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
			$url = self::base_url() . $url;
		} elseif ( 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) || ! wp_http_validate_url( $url ) ) {
			return new \WP_Error( 'atlas_ar_cloud', __( 'AtlasAR Cloud gave an unexpected answer. Please try again later.', 'ar-vr-3d-model-try-on' ) );
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		$tmp = download_url( $url, 120 );
		if ( is_wp_error( $tmp ) ) {
			return new \WP_Error( 'atlas_ar_cloud_down', __( 'The optimised model could not be downloaded. Please try again.', 'ar-vr-3d-model-try-on' ) );
		}
		$model = AR_TRY_ON_Library::put_optimised(
			$id,
			array( 'tmp_name' => $tmp, 'name' => sanitize_title( get_the_title( $id ) ) . '.glb' ),
			array(
				'by'        => 'cloud',
				'triangles' => isset( $res['stats']['triangles'] ) ? $res['stats']['triangles'] : 0,
				'budget'    => isset( $res['budget'] ) ? $res['budget'] : '',
				'height_cm' => $job['height_cm'],
			)
		);
		wp_delete_file( $tmp );
		if ( is_wp_error( $model ) ) {
			return $model;
		}
		delete_post_meta( $id, self::JOB_META );
		return array( 'status' => 'ready', 'model' => $model );
	}

	/* --------------------------------------------------------------------- helpers */

	private static function stored() {
		$c = get_option( self::OPTION, array() );
		$c = is_array( $c ) ? $c : array();
		return wp_parse_args( $c, array( 'key' => '', 'key_prefix' => '', 'project_id' => '', 'plan' => '', 'approval' => '', 'email' => '' ) );
	}

	private static function save( array $patch ) {
		update_option( self::OPTION, array_merge( self::stored(), $patch ), false );
		delete_transient( self::OPTION . '_usage' );
	}

	private static function valid_key( $key ) {
		return (bool) preg_match( '/^ar_(live|test)_[A-Za-z0-9]{20,64}$/', (string) $key );
	}

	private static function is_local( $url ) {
		$host = (string) wp_parse_url( $url, PHP_URL_HOST );
		return 'http' === wp_parse_url( $url, PHP_URL_SCHEME ) && in_array( $host, array( 'localhost', '127.0.0.1' ), true );
	}

	private static function clean_usage( $u ) {
		$u = is_array( $u ) ? $u : array();
		return array(
			'plan'            => isset( $u['plan'] ) ? sanitize_key( is_array( $u['plan'] ) ? ( $u['plan']['key'] ?? '' ) : $u['plan'] ) : '',
			'units_used'      => isset( $u['units_used'] ) ? (int) $u['units_used'] : 0,
			'units_limit'     => isset( $u['units_limit'] ) && null !== $u['units_limit'] ? (int) $u['units_limit'] : null,
			'units_remaining' => isset( $u['units_remaining'] ) && null !== $u['units_remaining'] ? (int) $u['units_remaining'] : null,
			'resets_at'       => isset( $u['resets_at'] ) ? sanitize_text_field( (string) $u['resets_at'] ) : '',
		);
	}

	/** Plain words for the service's error codes. */
	private static function error_text( $code, $status ) {
		switch ( $code ) {
			case 'missing_api_key':
			case 'invalid_api_key':
				return __( 'This AtlasAR Cloud key is not valid (it may have been revoked).', 'ar-vr-3d-model-try-on' );
			case 'approval_required':
				return __( 'This site waits for approval: open the email AtlasAR Cloud sent you and approve it.', 'ar-vr-3d-model-try-on' );
			case 'suspended':
				return __( 'This AtlasAR Cloud account is suspended. Please contact AtlasAR support.', 'ar-vr-3d-model-try-on' );
			case 'quota_exceeded':
				return __( 'This month’s models are used up. More are available next month, or with a bigger plan.', 'ar-vr-3d-model-try-on' );
			case 'model_limit':
				return __( 'Your plan’s number of hosted models is reached.', 'ar-vr-3d-model-try-on' );
			case 'feature_not_in_plan':
				return __( 'Your AtlasAR Cloud plan does not include this.', 'ar-vr-3d-model-try-on' );
			case 'rate_limited':
			case 'too_many_in_progress':
			case 'server_busy':
				return __( 'AtlasAR Cloud is busy. Please try again in a minute.', 'ar-vr-3d-model-try-on' );
		}
		/* translators: %d: HTTP status code */
		return sprintf( __( 'AtlasAR Cloud answered with an error (%d). Please try again later.', 'ar-vr-3d-model-try-on' ), (int) $status );
	}
}
