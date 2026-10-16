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

	/**
	 * The service's website pages, for the guidance in Integrations. api.example.com → website
	 * example.com and dashboard app.example.com; one host (a local service) → that host and /app.
	 * Filter: atlas_ar_cloud_links.
	 *
	 * @return array website, dashboard, docs, connect (the WordPress how-to), pricing, terms, privacy
	 */
	public static function links() {
		$base = self::base_url();
		if ( '' === $base ) {
			return array_fill_keys( array( 'website', 'dashboard', 'docs', 'connect', 'pricing', 'terms', 'privacy' ), '' );
		}
		$split = false !== strpos( $base, '://api.' );
		$site  = $split ? str_replace( '://api.', '://', $base ) : $base;
		$links = array(
			'website'   => $site . '/',
			'dashboard' => $split ? str_replace( '://api.', '://app.', $base ) . '/' : $base . '/app/',
			'docs'      => $site . '/docs/',
			'connect'   => $site . '/docs/#wordpress',
			'pricing'   => $site . '/pricing/',
			'terms'     => $site . '/terms/',
			'privacy'   => $site . '/privacy/',
		);
		return array_map( 'esc_url_raw', (array) apply_filters( 'atlas_ar_cloud_links', $links ) );
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
			'available'     => self::available(),
			'connected'     => '' !== $c['key'],
			'key_prefix'    => $c['key_prefix'],
			'email'         => $c['email'],
			'plan'          => $c['plan'],
			'approval'      => $c['approval'],
			'usage'         => null,
			'error'         => $c['lost'] ? __( 'This site’s secret keys changed, so the saved AtlasAR Cloud key cannot be read any more. Please connect again.', 'ar-vr-3d-model-try-on' ) : '',
			'webhook'       => '' !== $c['key'] && '' !== $c['webhook_secret'],
			'webhook_error' => $c['webhook_error'],
			'links'         => self::links(),
			'site_url'      => self::links()['dashboard'],
			'my_email'      => (string) wp_get_current_user()->user_email,
		);
		// AR-134: a site connected before webhooks (or whose last try failed) tries again, at most hourly.
		if ( $out['connected'] && $out['available'] && ! $out['webhook'] && 'pending' !== $c['approval'] && ! get_transient( self::OPTION . '_webhook_try' ) ) {
			set_transient( self::OPTION . '_webhook_try', 1, HOUR_IN_SECONDS );
			$out['webhook']       = self::connect_webhook();
			$out['webhook_error'] = self::stored()['webhook_error'];
		}
		if ( $out['connected'] && $out['available'] ) {
			$usage = $fresh ? false : get_transient( self::OPTION . '_usage' );
			if ( false === $usage ) {
				$res = self::request( 'GET', '/v1/usage' );
				if ( is_wp_error( $res ) ) {
					if ( 'approval_required' === $res->get_error_code() ) {
						$out['approval'] = 'pending'; // the screen explains it once (not an error)
					} else {
						$out['error'] = $res->get_error_message();
					}
					return $out;
				}
				$usage = isset( $res['usage'] ) && is_array( $res['usage'] ) ? $res['usage'] : array();
				set_transient( self::OPTION . '_usage', $usage, self::USAGE_TTL );
				// Approved just now. Several dashboard requests can notice it at once: only one runs this.
				if ( 'pending' === $c['approval'] && ( add_option( self::OPTION . '_approving', time(), '', false ) || time() - (int) get_option( self::OPTION . '_approving' ) > 2 * MINUTE_IN_SECONDS ) ) {
					self::save( array( 'approval' => 'active' ) );
					self::connect_webhook(); // AR-134 instant updates
					do_action( 'atlas_ar_cloud_connected' ); // AtlasAR Pro: the licence makes the site Premium
					delete_option( self::OPTION . '_approving' );
					// AR-143: the plan may have changed just now (Premium), so read the usage again.
					$again = self::request( 'GET', '/v1/usage' );
					if ( ! is_wp_error( $again ) && isset( $again['usage'] ) && is_array( $again['usage'] ) ) {
						$usage = $again['usage'];
						set_transient( self::OPTION . '_usage', $usage, self::USAGE_TTL );
					}
					$out['approval'] = 'active';
					$out['webhook']  = '' !== self::stored()['webhook_secret'];
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
	 * @param bool   $news  AR-135: the separate, unticked "tips and offers" box was ticked
	 * @return array|\WP_Error status()
	 */
	public static function register( $email, $news = false ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new \WP_Error( 'atlas_ar_email', __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' ) );
		}
		$res = self::request(
			'POST',
			'/v1/projects/register',
			array(
				'platform'          => 'wordpress',
				'site_url'          => home_url( '/' ),
				'email'             => $email,
				'marketing_consent' => true === $news, // AR-135: only an explicit opt-in; ignored for an existing account
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
		self::connect_webhook(); // AR-134: instant updates (best effort)
		/** This site is connected to AtlasAR Cloud (AtlasAR Pro: its licence makes the site Premium). */
		do_action( 'atlas_ar_cloud_connected' );
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
		self::connect_webhook(); // AR-134: instant updates (best effort)
		/** This site is connected to AtlasAR Cloud (AtlasAR Pro: its licence makes the site Premium). */
		do_action( 'atlas_ar_cloud_connected' );
		return self::status( true );
	}

	/** Forget the key on this site (the account and its hosted models stay on the service). */
	public static function disconnect() {
		if ( self::connected() && '' !== self::stored()['webhook_url'] ) {
			self::request( 'DELETE', '/v1/webhook' ); // best effort: no more events to this site
		}
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
			$err  = is_array( $data ) && isset( $data['error'] ) && is_array( $data['error'] ) ? $data['error'] : array();
			$more = array( 'status' => $code );
			if ( is_array( $data ) && isset( $data['owner_hint'] ) ) { // project_exists: whose email has the site (masked by the service)
				$more['owner_hint'] = sanitize_text_field( (string) $data['owner_hint'] );
				$more['takeover']   = ! empty( $data['takeover'] );
			}
			return new \WP_Error(
				isset( $err['code'] ) ? sanitize_key( $err['code'] ) : 'atlas_ar_cloud_' . $code,
				self::error_text( isset( $err['code'] ) ? (string) $err['code'] : '', $code ),
				$more
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
		// AR-139: with a real height the model is made exactly that size; without one it keeps its
		// own size (a service before AR-139 answers invalid_height, shown as "enter the height").
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
		$tmp = self::download( $url );
		if ( is_wp_error( $tmp ) ) {
			return 'atlas_ar_cloud' === $tmp->get_error_code() ? $tmp : new \WP_Error( 'atlas_ar_cloud_down', __( 'The optimised model could not be downloaded. Please try again.', 'ar-vr-3d-model-try-on' ) );
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
		$c = wp_parse_args( is_array( $c ) ? $c : array(), array( 'key' => '', 'key_prefix' => '', 'project_id' => '', 'plan' => '', 'approval' => '', 'email' => '', 'webhook_secret' => '', 'webhook_url' => '', 'webhook_error' => '' ) );

		$key                 = self::unseal( $c['key'] );
		$c['lost']           = '' !== $c['key'] && '' === $key; // sealed with secret keys that changed since
		$c['key']            = $key;
		$c['webhook_secret'] = self::unseal( $c['webhook_secret'] );
		return $c;
	}

	private static function save( array $patch ) {
		// AR-143: merge into what is saved now, not this request's older copy (another request may
		// have saved the webhook secret meanwhile).
		wp_cache_delete( self::OPTION, 'options' );
		$c = array_merge( self::stored(), $patch );
		unset( $c['lost'] );
		$c['key']            = self::seal( (string) $c['key'] );
		$c['webhook_secret'] = self::seal( (string) $c['webhook_secret'] );
		update_option( self::OPTION, $c, false );
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
				return __( 'This month’s optimisations are used up. More are available next month, or with AtlasAR Pro (no monthly limit).', 'ar-vr-3d-model-try-on' );
			case 'model_limit':
				return __( 'Your plan’s number of hosted models is reached.', 'ar-vr-3d-model-try-on' );
			case 'feature_not_in_plan':
				return __( 'Your AtlasAR Cloud plan does not include this.', 'ar-vr-3d-model-try-on' );
			case 'rate_limited':
			case 'too_many_in_progress':
			case 'server_busy':
				return __( 'AtlasAR Cloud is busy. Please try again in a minute.', 'ar-vr-3d-model-try-on' );
			case 'generation_unavailable':
				return __( 'Photo to 3D is not switched on at AtlasAR Cloud right now. Please try again later.', 'ar-vr-3d-model-try-on' );
			case 'file_too_large':
				return __( 'The file is too large for AtlasAR Cloud (3D models up to 50 MB, photos up to 25 MB).', 'ar-vr-3d-model-try-on' );
			case 'project_exists':
				return __( 'This site is already connected to AtlasAR Cloud with another email address.', 'ar-vr-3d-model-try-on' );
			case 'already_owner':
				return __( 'This site is already connected with this email: click "Connect this site" instead.', 'ar-vr-3d-model-try-on' );
			case 'site_unreachable':
				return __( 'AtlasAR Cloud could not reach this site to confirm you run it. The site must be online and public (a local or private site cannot be moved): use the first email instead, or remove the site from that account in the AtlasAR Cloud dashboard.', 'ar-vr-3d-model-try-on' );
			case 'site_not_verified':
				return __( 'AtlasAR Cloud could not confirm this site (a cache or firewall may have hidden the check). Please try again.', 'ar-vr-3d-model-try-on' );
			case 'challenge_expired':
				return __( 'That took too long. Please try again.', 'ar-vr-3d-model-try-on' );
			case 'account_suspended':
			case 'project_suspended':
				return __( 'This AtlasAR Cloud account or site is suspended. Please contact AtlasAR support.', 'ar-vr-3d-model-try-on' );
			case 'invalid_email':
				return __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' );
			case 'invalid_height':
				return __( 'Enter the product’s real height (0.5–1000 cm): AtlasAR Cloud makes the model exactly that size.', 'ar-vr-3d-model-try-on' );
			case 'invalid_site_url':
				return __( 'AtlasAR Cloud did not accept this site’s address (Settings › General › Site Address).', 'ar-vr-3d-model-try-on' );
		}
		if ( 0 === strpos( (string) $code, 'invalid_g' ) || in_array( $code, array( 'not_glb', 'external_reference', 'out_of_bounds', 'too_complex', 'no_geometry' ), true ) || 0 === strpos( (string) $code, 'unsupported_' ) ) {
			return __( 'AtlasAR Cloud could not read this 3D file. Try exporting it again as a single GLB.', 'ar-vr-3d-model-try-on' );
		}
		/* translators: %d: HTTP status code */
		return sprintf( __( 'AtlasAR Cloud answered with an error (%d). Please try again later.', 'ar-vr-3d-model-try-on' ), (int) $status );
	}

	/**
	 * Download a file AtlasAR Cloud gave (a finished model): a path or a URL on the configured
	 * service itself is trusted (also a local development service); any other URL (the CDN)
	 * must be a safe public https URL. AtlasAR Pro uses this too.
	 *
	 * @param string $url
	 * @return string|\WP_Error a temporary file (the caller deletes it)
	 */
	public static function download( $url ) {
		$base = self::base_url();
		$url  = (string) $url;
		if ( '' !== $base && 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
			$url = $base . $url;
		}
		$own = '' !== $base && 0 === strpos( $url, $base . '/' );
		if ( ! $own && ( 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) || ! wp_http_validate_url( $url ) ) ) {
			return new \WP_Error( 'atlas_ar_cloud', __( 'AtlasAR Cloud gave an unexpected answer. Please try again later.', 'ar-vr-3d-model-try-on' ) );
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		if ( ! ( $own && self::is_local( $base ) ) ) {
			return download_url( $url, 180 );
		}
		// A local development service (http://localhost) is not a "safe" URL for download_url().
		$tmp = wp_tempnam( 'atlas-ar-cloud' );
		$res = wp_remote_get( $url, array( 'timeout' => 180, 'stream' => true, 'filename' => $tmp, 'redirection' => 0 ) );
		if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
			wp_delete_file( $tmp );
			return is_wp_error( $res ) ? $res : new \WP_Error( 'atlas_ar_cloud_down', __( 'The file could not be downloaded from AtlasAR Cloud.', 'ar-vr-3d-model-try-on' ) );
		}
		return $tmp;
	}

	/* ---------------------------------------------------------------- webhooks */

	/** The address AtlasAR Cloud sends model.ready / model.failed to. */
	public static function webhook_url() {
		return rest_url( 'ar_try_on/v1/cloud/webhook' );
	}

	/**
	 * AR-134: ask AtlasAR Cloud to tell this site when a model is ready, so a model arrives even
	 * when no AtlasAR page is open. Best effort: the plugin still checks while a page is open.
	 * The secret (shown once by the service) is kept sealed like the key.
	 *
	 * @return bool on
	 */
	public static function connect_webhook() {
		$c = self::stored();
		if ( '' === $c['key'] || 'pending' === $c['approval'] ) {
			return false;
		}
		$url = self::webhook_url();
		$res = self::request( 'PUT', '/v1/webhook', array( 'url' => $url ) );
		if ( ! is_wp_error( $res ) && empty( $res['secret'] ) && ( '' === $c['webhook_secret'] || $url !== $c['webhook_url'] ) ) {
			$res = self::request( 'POST', '/v1/webhook/rotate-secret' ); // there was one already, but not with a secret this site has
		}
		if ( is_wp_error( $res ) ) {
			self::save( array( 'webhook_error' => $res->get_error_message() ) );
			return false;
		}
		$patch = array( 'webhook_url' => $url, 'webhook_error' => '' );
		if ( ! empty( $res['secret'] ) && is_string( $res['secret'] ) ) {
			$patch['webhook_secret'] = $res['secret'];
		}
		self::save( $patch );
		return true;
	}

	/**
	 * An event from AtlasAR Cloud (REST, no login: it is signed). Checked on the raw body with
	 * this site's secret (HMAC-SHA256 of "<t>.<body>", at most 5 minutes old); each event is
	 * handled once. model.ready / model.failed finish the 3D Library's "Optimise on AtlasAR
	 * Cloud" jobs; add-ons get the action atlas_ar_cloud_event( $type, $model ).
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function receive( \WP_REST_Request $r ) {
		$secret = self::stored()['webhook_secret'];
		$body   = (string) $r->get_body();
		parse_str( str_replace( ',', '&', (string) $r->get_header( 'atlasar_signature' ) ), $sig );
		$fresh = isset( $sig['t'] ) && abs( time() - (int) $sig['t'] ) <= 300;
		$valid = '' !== $secret && isset( $sig['v1'] ) && is_string( $sig['v1'] ) && hash_equals( hash_hmac( 'sha256', $sig['t'] . '.' . $body, $secret ), $sig['v1'] );
		if ( ! $fresh || ! $valid ) {
			return new \WP_Error( 'atlas_ar_signature', 'Invalid signature.', array( 'status' => 401 ) );
		}
		$event = sanitize_text_field( (string) $r->get_header( 'atlasar_event_id' ) );
		$seen  = 'atlas_ar_cloud_evt_' . md5( $event );
		if ( '' !== $event && get_transient( $seen ) ) {
			return new \WP_REST_Response( array( 'ok' => true, 'duplicate' => true ), 200 ); // at-least-once delivery
		}
		$data  = json_decode( $body, true );
		$type  = sanitize_key( str_replace( '.', '_', (string) $r->get_header( 'atlasar_event_type' ) ) );
		$model = is_array( $data ) && isset( $data['data']['model'] ) && is_array( $data['data']['model'] ) ? $data['data']['model'] : array();
		$done  = 0;
		if ( in_array( $type, array( 'model_ready', 'model_failed' ), true ) && ! empty( $model['id'] ) ) {
			foreach ( self::models_waiting_for( (string) $model['id'] ) as $id ) {
				self::optimise_poll( $id ); // downloads the finished file (or clears a failed job)
				++$done;
			}
			/**
			 * An AtlasAR Cloud model finished (AtlasAR Pro: "Make 3D" jobs).
			 *
			 * @param string $type  model_ready | model_failed
			 * @param array  $model the model as GET /v1/models/:id answers it
			 */
			do_action( 'atlas_ar_cloud_event', $type, $model );
		}
		if ( '' !== $event ) {
			set_transient( $seen, 1, 2 * DAY_IN_SECONDS );
		}
		return new \WP_REST_Response( array( 'ok' => true, 'handled' => $done ), 200 );
	}

	/** 3D Library models whose "Optimise on AtlasAR Cloud" job is this Cloud model. */
	private static function models_waiting_for( $cloud_id ) {
		if ( ! preg_match( '/^[A-Za-z0-9_-]{4,64}$/', $cloud_id ) ) {
			return array();
		}
		return get_posts(
			array(
				'post_type'      => AR_TRY_ON_Library::POST_TYPE,
				'post_status'    => 'any',
				'posts_per_page' => 5,
				'fields'         => 'ids',
				'meta_query'     => array( array( 'key' => self::JOB_META, 'value' => '"' . $cloud_id . '"', 'compare' => 'LIKE' ) ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_query -- rare: one AtlasAR Cloud event.
			)
		);
	}

	/* ------------------------------------------------------------- move the site */

	/** The query argument AtlasAR Cloud reads the one-time code from (the core's verifyParam). */
	const VERIFY_PARAM = 'atlasar_cloud_verify';
	const VERIFY_TTL   = 900; // the service's challenge lasts 15 minutes

	/**
	 * AR-133: this site is registered with another email (a former owner, an old address): move
	 * it to $email by proving this site is yours. The service gives a one-time code, this site
	 * shows it at ?atlasar_cloud_verify=<id> for 15 minutes, the service reads it from the site's
	 * registered address, then moves the site to $email (its old key stops working; a new key,
	 * which may wait for approval when $email already has an account; the old owner is told).
	 *
	 * @param string $email
	 * @return array|\WP_Error status()
	 */
	public static function take_over( $email ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new \WP_Error( 'atlas_ar_email', __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' ) );
		}
		$start = self::request( 'POST', '/v1/projects/takeover', array( 'platform' => 'wordpress', 'site_url' => home_url( '/' ), 'email' => $email ), '' );
		if ( is_wp_error( $start ) ) {
			return $start;
		}
		$id    = isset( $start['challenge_id'] ) ? (string) $start['challenge_id'] : '';
		$token = isset( $start['token'] ) ? (string) $start['token'] : '';
		if ( ! preg_match( '/^[a-f0-9]{32}$/', $id ) || ! preg_match( '/^[A-Za-z0-9_-]{16,128}$/', $token ) ) {
			return new \WP_Error( 'atlas_ar_cloud', __( 'AtlasAR Cloud gave an unexpected answer. Please try again later.', 'ar-vr-3d-model-try-on' ) );
		}
		set_transient( self::VERIFY_PARAM . '_' . $id, $token, self::VERIFY_TTL );
		$res = self::request( 'POST', '/v1/projects/takeover/verify', array( 'challenge_id' => $id ), '' );
		delete_transient( self::VERIFY_PARAM . '_' . $id ); // used once, whatever the answer
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
		self::connect_webhook(); // AR-134: instant updates (best effort)
		/** This site is connected to AtlasAR Cloud (AtlasAR Pro: its licence makes the site Premium). */
		do_action( 'atlas_ar_cloud_connected' );
		return self::status( true );
	}

	/**
	 * Show the one-time code to AtlasAR Cloud (front end, before WordPress renders anything).
	 * Only while this site is moving a site (a 15-minute code, known by its 32-character id);
	 * otherwise the request carries on as a normal page.
	 */
	public static function answer_verify() {
		if ( ! isset( $_GET[ self::VERIFY_PARAM ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a public check by AtlasAR Cloud, answered only for a live one-time challenge.
			return;
		}
		$id = sanitize_text_field( wp_unslash( $_GET[ self::VERIFY_PARAM ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! preg_match( '/^[a-f0-9]{32}$/', $id ) ) {
			return;
		}
		$token = get_transient( self::VERIFY_PARAM . '_' . $id );
		if ( ! is_string( $token ) || '' === $token ) {
			return;
		}
		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		echo esc_html( $token ); // [A-Za-z0-9_-] only (checked when it was stored)
		exit;
	}

	/* ------------------------------------------------------------- key at rest */

	/** The stored key is sealed with this site's secret keys (wp-config.php salts). */
	private static function seal( $key ) {
		if ( '' === $key || ! function_exists( 'sodium_crypto_secretbox' ) ) {
			return $key;
		}
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		return 'enc1:' . base64_encode( $nonce . sodium_crypto_secretbox( $key, $nonce, self::secret() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- binary ciphertext stored as text.
	}

	/** The key back; '' when the site's secret keys changed (the site then asks to reconnect). */
	private static function unseal( $stored ) {
		$stored = (string) $stored;
		if ( 0 !== strpos( $stored, 'enc1:' ) ) {
			return $stored; // a key saved before AR-133: still plain, sealed on its next save
		}
		if ( ! function_exists( 'sodium_crypto_secretbox_open' ) ) {
			return '';
		}
		$raw = base64_decode( substr( $stored, 5 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		if ( false === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return '';
		}
		$key = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), self::secret() );
		return false === $key ? '' : $key;
	}

	private static function secret() {
		return sodium_crypto_generichash( wp_salt( 'auth' ) . '|atlas_ar_cloud', '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
	}
}
