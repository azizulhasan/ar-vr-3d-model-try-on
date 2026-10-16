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
	 * @return array|\WP_Error the decoded answer
	 */
	public static function request( $method, $path, $body = null, $key = null ) {
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
