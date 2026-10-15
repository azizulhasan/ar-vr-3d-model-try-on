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

	/** AR-99: post meta holding the cloud model id of the item's job (webhook lookup). */
	const MODEL_META = '_atlas_ar_cloud_model';

	/** AR-99: webhook events older than this (seconds) are refused (replay window). */
	const WEBHOOK_TOLERANCE = 300;

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
	 * The customer dashboard (sign in, plans, keys). ATLAS_AR_DASHBOARD_URL or the
	 * atlas_ar_cloud_dashboard_url filter; default: the service's /app/.
	 *
	 * @return string
	 */
	public static function dashboard_url() {
		$base = self::base_url();
		$url  = defined( 'ATLAS_AR_DASHBOARD_URL' ) ? (string) constant( 'ATLAS_AR_DASHBOARD_URL' ) : ( '' !== $base ? $base . '/app/' : '' );
		/** @since 2.4.0 @param string $url Dashboard URL ('' = none). */
		return esc_url_raw( (string) apply_filters( 'atlas_ar_cloud_dashboard_url', $url ), array( 'https', 'http' ) );
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
		$value = array_merge( array( 'key' => self::seal( $key ) ), self::usage_fields( $usage ) );
		delete_option( self::OPTION );
		add_option( self::OPTION, $value, '', false ); // Never autoloaded.
		self::ensure_webhook(); // AR-99: models arrive even when the editor is closed
		return self::status();
	}

	/**
	 * AR-93: connect with an email instead of a pasted key (platform contract, BLUEPRINT §6/§8).
	 * POST /v1/projects/register { platform, site_url, email, name } — no key needed:
	 *  - a new email gets an active key at once (connected);
	 *  - an email that already has an account gets a PENDING key: the account owner is emailed a
	 *    link to approve this site; until then every call answers approval_required;
	 *  - a site registered under another email answers project_exists with a masked owner hint.
	 * The key is stored encrypted and never shown; the email is the owner's own, shown to admins.
	 *
	 * @param string $email Account email.
	 * @return array|\WP_Error Status.
	 */
	public static function register( $email ) {
		$email = sanitize_email( (string) $email );
		if ( ! is_email( $email ) || strlen( $email ) > 190 ) { // 190 = the service's limit
			return new \WP_Error( 'invalid_email', __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$base = self::base_url();
		if ( '' === $base ) {
			return new \WP_Error( 'cloud_unavailable', __( 'AtlasAR Cloud is not available on this site.', 'ar-vr-3d-model-try-on' ), array( 'status' => 503 ) );
		}
		$response = wp_remote_post(
			$base . '/v1/projects/register',
			array(
				'headers'     => array( 'Content-Type' => 'application/json', 'Accept' => 'application/json', 'User-Agent' => 'AtlasAR-WordPress/' . ( defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '0' ) ),
				'body'        => wp_json_encode( array( 'platform' => 'wordpress', 'site_url' => home_url( '/' ), 'email' => $email, 'name' => wp_strip_all_tags( get_bloginfo( 'name' ) ) ) ),
				'timeout'     => 20,
				'redirection' => 0,
			)
		);
		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'cloud_unreachable', __( 'Could not reach AtlasAR Cloud. Please try again in a minute.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$data = is_array( $data ) ? $data : array();
		if ( $code < 200 || $code >= 300 ) {
			$remote = sanitize_key( (string) ( $data['error']['code'] ?? '' ) );
			if ( 'project_exists' === $remote ) {
				// The service masks it (j•••@example.com); keep the mask characters, plain text only.
				$hint = mb_substr( sanitize_text_field( (string) ( $data['owner_hint'] ?? '' ) ), 0, 100 );
				return new \WP_Error( 'cloud_project_exists', sprintf(
					/* translators: %s: masked email, e.g. j***@example.com */
					__( 'This site is already connected to another AtlasAR Cloud account (%s). Sign in with that email, or ask its owner to remove the site.', 'ar-vr-3d-model-try-on' ),
					'' !== $hint ? $hint : '—'
				), array( 'status' => 409 ) );
			}
			$known = array(
				'invalid_email'     => __( 'Enter a valid email address.', 'ar-vr-3d-model-try-on' ),
				'project_limit'     => __( 'That AtlasAR Cloud account has reached its plan\'s number of sites. Remove one there, or upgrade.', 'ar-vr-3d-model-try-on' ),
				'rate_limited'      => __( 'Too many connection attempts. Please try again later.', 'ar-vr-3d-model-try-on' ),
				'account_suspended' => __( 'That AtlasAR Cloud account is suspended. Please contact AtlasAR support.', 'ar-vr-3d-model-try-on' ),
				'project_suspended' => __( 'This site is suspended on AtlasAR Cloud. Please contact AtlasAR support.', 'ar-vr-3d-model-try-on' ),
			);
			return isset( $known[ $remote ] )
				? new \WP_Error( 'cloud_' . $remote, $known[ $remote ], array( 'status' => in_array( $code, array( 403, 409, 422, 429 ), true ) ? $code : 400 ) )
				: self::error_from( $code, $data );
		}
		$key = (string) ( $data['api_key'] ?? '' );
		if ( ! preg_match( self::KEY_PATTERN, $key ) ) {
			return new \WP_Error( 'cloud_bad_response', __( 'AtlasAR Cloud sent an unexpected answer. Please try again.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}
		$pending = 'pending' === ( $data['approval'] ?? '' );
		delete_option( self::OPTION );
		add_option(
			self::OPTION,
			array(
				'key'        => self::seal( $key ),
				'email'      => $email,
				'pending'    => $pending,
				'plan'       => sanitize_key( (string) ( $data['plan'] ?? 'free' ) ),
				'checked_at' => time(),
			),
			'',
			false
		);
		return $pending ? self::status() : self::recheck();
	}

	/**
	 * Re-read a pending or connected site: approved → connected (usage + webhook); still waiting →
	 * pending; revoked → disconnected by request().
	 *
	 * @return array|\WP_Error
	 */
	public static function recheck() {
		$usage = self::request( 'GET', '/v1/usage' );
		if ( is_wp_error( $usage ) ) {
			if ( 'cloud_approval_required' === $usage->get_error_code() ) {
				return self::status(); // still waiting for the owner
			}
			return $usage;
		}
		$was_pending       = ! empty( self::stored()['pending'] );
		$stored            = array_merge( self::stored(), self::usage_fields( $usage ) );
		$stored['pending'] = false;
		update_option( self::OPTION, $stored, false );
		if ( $was_pending || empty( $stored['webhook'] ) ) {
			self::ensure_webhook();
		}
		return self::status();
	}

	/**
	 * Forget the key (and remove this site's webhook on the service, best effort).
	 *
	 * @param bool $remote Also tell the service (false when the key is already revoked).
	 */
	public static function disconnect( $remote = true ) {
		if ( $remote && '' !== self::get_key() && ! empty( self::stored()['webhook'] ) ) {
			self::request( 'DELETE', '/v1/webhook', array( 'timeout' => 10 ) );
		}
		delete_option( self::OPTION );
	}

	/* ------------------------------------------------------------------ */
	/* AR-99: webhooks (the service tells this site when a model is ready) */
	/* ------------------------------------------------------------------ */

	/** The URL the service posts events to. */
	public static function webhook_url() {
		return rest_url( 'ar_try_on/v1/cloud/webhook' );
	}

	private static function seal( $plain ) {
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		return base64_encode( $nonce . sodium_crypto_secretbox( $plain, $nonce, self::box_key() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Storing ciphertext.
	}

	private static function unseal( $sealed ) {
		$raw = is_string( $sealed ) ? base64_decode( $sealed, true ) : false; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Decoding our own ciphertext.
		if ( false === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return '';
		}
		$plain = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), self::box_key() );
		return is_string( $plain ) ? $plain : '';
	}

	/** The decrypted webhook secret, or '' (then events are refused and polling still works). */
	public static function webhook_secret() {
		$stored = self::stored();
		return empty( $stored['webhook'] ) ? '' : self::unseal( $stored['webhook'] );
	}

	/**
	 * Register this site's receiver with the service and keep its secret (encrypted). The secret
	 * is shown by the service only on create or rotate; if a URL exists but we lost the secret,
	 * rotate. Failure is harmless: the editor keeps polling.
	 *
	 * @return bool
	 */
	public static function ensure_webhook() {
		if ( '' === self::get_key() ) {
			return false;
		}
		$result = self::request( 'PUT', '/v1/webhook', array( 'body' => wp_json_encode( array( 'url' => self::webhook_url() ) ), 'headers' => array( 'Content-Type' => 'application/json' ), 'timeout' => 10 ) );
		if ( is_wp_error( $result ) ) {
			return false;
		}
		$secret = (string) ( $result['secret'] ?? '' );
		if ( '' === $secret && '' === self::webhook_secret() ) {
			$rotated = self::request( 'POST', '/v1/webhook/rotate-secret', array( 'timeout' => 10 ) );
			$secret  = is_wp_error( $rotated ) ? '' : (string) ( $rotated['secret'] ?? '' );
		}
		if ( '' !== $secret ) {
			if ( ! preg_match( '/^[A-Za-z0-9_-]{20,200}$/', $secret ) ) {
				return false;
			}
			$stored            = self::stored();
			$stored['webhook'] = self::seal( $secret );
			update_option( self::OPTION, $stored, false );
		}
		return '' !== self::webhook_secret();
	}

	/**
	 * Check an event: AtlasAR-Signature "t=<unix>,v1=<hex HMAC-SHA256(secret, t . '.' . body)>",
	 * fresh within the window, compared in constant time.
	 *
	 * @param string   $header Signature header.
	 * @param string   $body   Raw request body.
	 * @param string   $secret Webhook secret.
	 * @param int|null $now    Current time (tests).
	 * @return bool
	 */
	public static function verify_webhook( $header, $body, $secret, $now = null ) {
		if ( '' === (string) $secret || ! is_string( $header ) || strlen( $header ) > 300 ) {
			return false;
		}
		$parts = array();
		foreach ( explode( ',', $header ) as $piece ) {
			$kv = explode( '=', trim( $piece ), 2 );
			if ( 2 === count( $kv ) ) {
				$parts[ $kv[0] ] = $kv[1];
			}
		}
		if ( ! isset( $parts['t'], $parts['v1'] ) || ! ctype_digit( $parts['t'] ) || ! preg_match( '/^[a-f0-9]{64}$/', $parts['v1'] ) ) {
			return false;
		}
		$now = null === $now ? time() : (int) $now;
		if ( abs( $now - (int) $parts['t'] ) > self::WEBHOOK_TOLERANCE ) {
			return false;
		}
		return hash_equals( hash_hmac( 'sha256', $parts['t'] . '.' . $body, $secret ), $parts['v1'] );
	}

	/** The item whose job is this cloud model, or 0. */
	public static function post_for_model( $model_id ) {
		if ( ! preg_match( '/^mdl_[A-Za-z0-9]{10,40}$/', (string) $model_id ) ) {
			return 0;
		}
		$ids = get_posts( array( 'post_type' => 'any', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 1, 'no_found_rows' => true, 'meta_key' => self::MODEL_META, 'meta_value' => $model_id ) ); // phpcs:ignore WordPress.DB.SlowDBQuery -- Indexed meta_key lookup, one row.
		return $ids ? (int) $ids[0] : 0;
	}

	/**
	 * Bring an item's job up to date with the service's model JSON (from polling or a webhook).
	 * Imports the finished GLB exactly once, even when a webhook and a poll arrive together.
	 *
	 * @param int   $post_id Item.
	 * @param array $job     Stored job.
	 * @param array $model   Model JSON (GET /v1/models/:id shape).
	 * @return array Updated job.
	 */
	public static function apply_model( $post_id, $job, $model ) {
		if ( in_array( $job['status'] ?? '', array( 'ready', 'failed' ), true ) || ( $model['id'] ?? '' ) !== ( $job['model_id'] ?? '' ) ) {
			return $job;
		}
		$remote = (string) ( $model['status'] ?? '' );
		if ( 'failed' === $remote ) {
			$job['status'] = 'failed';
			$job['error']  = sprintf(
				/* translators: %s: error code from the service */
				__( 'AtlasAR Cloud could not optimize this model (%s).', 'ar-vr-3d-model-try-on' ),
				sanitize_key( (string) ( $model['error']['code'] ?? 'unknown' ) )
			);
			update_post_meta( $post_id, self::JOB_META, $job );
			return $job;
		}
		if ( 'ready' !== $remote || empty( $model['files']['glb'] ) ) {
			return $job;
		}
		// Import exactly once, even when a webhook and two tabs arrive at the same moment.
		$lock = 'atlas_ar_cloud_import_' . $post_id;
		if ( ! add_option( $lock, time(), '', false ) ) {
			if ( time() - (int) get_option( $lock ) < 5 * MINUTE_IN_SECONDS ) {
				return $job; // Another request is importing.
			}
			update_option( $lock, time(), false ); // Stale lock from a crashed request.
		}
		try {
			$fresh = get_post_meta( $post_id, self::JOB_META, true ); // the other request may have finished
			if ( is_array( $fresh ) && 'ready' === ( $fresh['status'] ?? '' ) ) {
				return $fresh;
			}
			$id = self::import_result( (string) $model['files']['glb'], (int) $job['source_attachment'], $post_id, $job['model_id'] );
		} finally {
			delete_option( $lock );
		}
		if ( is_wp_error( $id ) ) {
			$job['status'] = 'failed';
			$job['error']  = $id->get_error_message();
		} else {
			$job['status']            = 'ready';
			$job['result_attachment'] = $id;
			$job['result_size']       = (int) filesize( (string) get_attached_file( $id ) );
			$job['finished_at']       = time();
		}
		update_post_meta( $post_id, self::JOB_META, $job );

		/**
		 * Fires after a model optimized by AtlasAR Cloud was saved to the Media Library (or failed).
		 *
		 * @since 2.4.0
		 * @param int   $post_id Item ID.
		 * @param array $job     Job (status, source_attachment, result_attachment, model_id).
		 */
		do_action( 'atlas_ar_cloud_optimize_finished', $post_id, $job );
		return $job;
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
		$has_key   = '' !== self::get_key();
		$pending   = $has_key && ! empty( $stored['pending'] );
		$connected = $has_key && ! $pending;
		return array(
			'available'  => self::is_available(),
			'connected'  => $connected,
			// AR-93: email sign-up waiting for the account owner's approval.
			'pending'    => $pending,
			'email'      => $has_key ? (string) ( $stored['email'] ?? '' ) : '',
			'plan'       => $connected ? (string) ( $stored['plan'] ?? '' ) : '',
			// Models this month: used / limit (limit null = no monthly limit).
			'used'       => $connected ? (int) ( $stored['used'] ?? 0 ) : 0,
			'limit'      => $connected && isset( $stored['limit'] ) ? (int) $stored['limit'] : null,
			// False until the first usage read (e.g. a connection saved by an older version).
			'usage_known' => $connected && array_key_exists( 'used', $stored ),
			'resets_at'  => $connected ? (string) ( $stored['resets_at'] ?? '' ) : '',
			'checked_at' => $connected ? (int) ( $stored['checked_at'] ?? 0 ) : 0,
			'webhook'    => $connected && ! empty( $stored['webhook'] ),
			'dashboard_url' => self::dashboard_url(),
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
			self::disconnect( false ); // Revoked key: clear it so the owner sees "Connect" again.
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
