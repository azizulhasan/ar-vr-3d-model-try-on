<?php
namespace ATLAS_AR_API;

use AR_TRY_ON\AR_TRY_ON_Cloud;

/**
 * AR-84: REST routes of the AtlasAR Cloud connector (ar_try_on/v1/cloud/*).
 *
 * The browser only talks to these routes; the API key stays on the server.
 *  - Connecting / disconnecting the account: manage_options.
 *  - Optimizing an item's model: edit_post on that item + upload_files (a new attachment is made).
 * The cloud model id is never taken from the request: it lives in the item's post meta, so one
 * item cannot read or import another item's job (no IDOR through the cloud id).
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/api
 * @since      2.4.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Cloud_Routes
 */
class AR_TRY_ON_Cloud_Routes {

	/** @var string */
	private $namespace = 'ar_try_on/v1';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/cloud/status',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'status' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'description'         => __( 'AtlasAR Cloud connection status: whether the connector is available on this site, whether a key is saved (never returned), the plan and the remaining AI credits. Add refresh=1 to re-read plan and credits from the service. Administrators only.', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'refresh' => array(
						'type'        => 'boolean',
						'default'     => false,
						'description' => __( 'Re-read plan and credits from AtlasAR Cloud.', 'ar-vr-3d-model-try-on' ),
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/cloud/connect',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'connect' ),
					'permission_callback' => array( $this, 'can_manage' ),
					'description'         => __( 'Checks an AtlasAR Cloud API key with the service and, if it is valid, stores it encrypted. The key is never returned. Administrators only.', 'ar-vr-3d-model-try-on' ),
					'args'                => array(
						'api_key' => array(
							'type'        => 'string',
							'required'    => true,
							'description' => __( 'The AtlasAR Cloud secret key (ar_live_…).', 'ar-vr-3d-model-try-on' ),
						),
						'accept_terms' => array(
							'type'        => 'boolean',
							'required'    => true,
							'description' => __( 'Must be true: the site owner agrees that model files are sent to AtlasAR Cloud when they click Optimize, and accepts its terms and privacy policy (wp.org Guideline 7).', 'ar-vr-3d-model-try-on' ),
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'disconnect' ),
					'permission_callback' => array( $this, 'can_manage' ),
					'description'         => __( 'Forgets the stored AtlasAR Cloud API key. Models already saved in the Media Library stay. Administrators only.', 'ar-vr-3d-model-try-on' ),
				),
			)
		);

		// AR-93: connect with an email (the service makes the account and the key).
		register_rest_route(
			$this->namespace,
			'/cloud/register',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'register' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'description'         => __( 'Connects this site to AtlasAR Cloud with an email address: a new email is connected at once; an email that already has an account waits for its owner to approve this site by email. The key is stored encrypted and never returned. Administrators only.', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'email'        => array( 'type' => 'string', 'required' => true, 'format' => 'email', 'description' => __( 'The AtlasAR Cloud account email.', 'ar-vr-3d-model-try-on' ) ),
					'accept_terms' => array( 'type' => 'boolean', 'required' => true, 'description' => __( 'Must be true: the owner agrees to the AtlasAR Cloud terms (wp.org Guideline 7).', 'ar-vr-3d-model-try-on' ) ),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/cloud/recheck',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'recheck' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'description'         => __( 'Checks again whether the account owner approved this site (after an email sign-up), and refreshes plan and usage. Administrators only.', 'ar-vr-3d-model-try-on' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/cloud/webhook',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'webhook' ),
				'permission_callback' => array( $this, 'verify_webhook' ),
				'description'         => __( 'Receives signed AtlasAR Cloud events (model.ready, model.failed, ping) and imports a finished model into the Media Library. Only requests signed with this site\'s webhook secret are accepted.', 'ar-vr-3d-model-try-on' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/cloud/optimize/(?P<post_id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'start' ),
					'permission_callback' => array( $this, 'can_optimize' ),
					'description'         => __( 'Sends the item\'s GLB (a Media Library file) to AtlasAR Cloud to be optimized and scaled to the real height. Returns the job; poll the GET route. Requires edit_post on the item and upload_files.', 'ar-vr-3d-model-try-on' ),
					'args'                => array(
						'post_id'   => array(
							'type'     => 'integer',
							'required' => true,
						),
						'src'       => array(
							'type'        => 'string',
							'required'    => true,
							'description' => __( 'URL of the item\'s current GLB. It must be a file in this site\'s Media Library.', 'ar-vr-3d-model-try-on' ),
						),
						'height_cm' => array(
							'type'        => 'number',
							'required'    => true,
							'minimum'     => 0.1,
							'maximum'     => 1000,
							'description' => __( 'Real height of the product in centimetres.', 'ar-vr-3d-model-try-on' ),
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'poll' ),
					'permission_callback' => array( $this, 'can_optimize' ),
					'description'         => __( 'State of the item\'s AtlasAR Cloud job. When the model is ready it is saved once as a new Media Library file and its URL is returned. Requires edit_post on the item and upload_files.', 'ar-vr-3d-model-try-on' ),
					'args'                => array(
						'post_id' => array(
							'type'     => 'integer',
							'required' => true,
						),
					),
				),
			)
		);
	}

	/**
	 * AR-99: the service's events. Public (the service is not a WordPress user), but every
	 * request must carry a valid, fresh HMAC signature made with this site's webhook secret.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return true|\WP_Error
	 */
	public function verify_webhook( $request ) {
		$ok = AR_TRY_ON_Cloud::verify_webhook( (string) $request->get_header( 'atlasar_signature' ), (string) $request->get_body(), AR_TRY_ON_Cloud::webhook_secret() );
		return $ok ? true : new \WP_Error( 'invalid_signature', __( 'Invalid or expired signature.', 'ar-vr-3d-model-try-on' ), array( 'status' => 401 ) );
	}

	/**
	 * POST /cloud/webhook — model.ready / model.failed / ping from AtlasAR Cloud.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function webhook( $request ) {
		$event = json_decode( (string) $request->get_body(), true );
		if ( ! is_array( $event ) || empty( $event['id'] ) || empty( $event['type'] ) ) {
			return new \WP_Error( 'invalid_event', 'Invalid event.', array( 'status' => 400 ) );
		}
		// Delivery is at-least-once: a repeated event id is acknowledged and ignored (2 days).
		$seen = 'atlas_ar_cloud_evt_' . substr( hash( 'sha256', (string) $event['id'] ), 0, 32 );
		if ( get_transient( $seen ) ) {
			return rest_ensure_response( array( 'ok' => true, 'duplicate' => true ) );
		}
		$type = (string) $event['type'];
		if ( 'ping' === $type ) {
			set_transient( $seen, 1, 2 * DAY_IN_SECONDS );
			return rest_ensure_response( array( 'ok' => true ) );
		}
		if ( ! in_array( $type, array( 'model.ready', 'model.failed' ), true ) || ! is_array( $event['data']['model'] ?? null ) ) {
			return rest_ensure_response( array( 'ok' => true, 'ignored' => true ) );
		}
		$model   = $event['data']['model'];
		$post_id = AR_TRY_ON_Cloud::post_for_model( $model['id'] ?? '' );
		$job     = $post_id ? get_post_meta( $post_id, AR_TRY_ON_Cloud::JOB_META, true ) : null;
		if ( ! is_array( $job ) ) {
			set_transient( $seen, 1, 2 * DAY_IN_SECONDS );
			return rest_ensure_response( array( 'ok' => true, 'ignored' => true ) ); // a model made elsewhere
		}
		$job = AR_TRY_ON_Cloud::apply_model( $post_id, $job, $model );
		if ( 'model.ready' === $type && 'ready' !== ( $job['status'] ?? '' ) ) {
			// The import did not finish (another request holds the lock, a download failed):
			// answer 503 so the service retries; polling also still finishes it.
			return new \WP_Error( 'not_imported', 'Not imported yet.', array( 'status' => 503 ) );
		}
		set_transient( $seen, 1, 2 * DAY_IN_SECONDS );
		return rest_ensure_response( array( 'ok' => true, 'status' => $job['status'] ) );
	}

	/**
	 * @return bool
	 */
	public function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public function can_optimize( $request ) {
		$post_id = absint( $request['post_id'] );
		return $post_id > 0 && get_post( $post_id ) && current_user_can( 'edit_post', $post_id ) && current_user_can( 'upload_files' );
	}

	/**
	 * Simple per-user rate limit (fixed window in a transient).
	 *
	 * @param string $bucket Name.
	 * @param int    $max    Requests per window.
	 * @param int    $window Seconds.
	 * @return true|\WP_Error
	 */
	private function rate_limit( $bucket, $max, $window ) {
		$key   = 'atlas_ar_rl_' . $bucket . '_' . get_current_user_id();
		$count = (int) get_transient( $key );
		if ( $count >= $max ) {
			return new \WP_Error( 'rate_limited', __( 'Too many attempts. Please wait a while and try again.', 'ar-vr-3d-model-try-on' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $count + 1, $window );
		return true;
	}

	/**
	 * GET /cloud/status
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function status( $request ) {
		if ( $request['refresh'] && '' !== AR_TRY_ON_Cloud::get_key() ) {
			$limited = $this->rate_limit( 'cloud_refresh', 30, HOUR_IN_SECONDS );
			if ( is_wp_error( $limited ) ) {
				return $limited;
			}
			$status = AR_TRY_ON_Cloud::refresh();
			if ( is_wp_error( $status ) ) {
				return $status;
			}
			return rest_ensure_response( $status );
		}
		return rest_ensure_response( AR_TRY_ON_Cloud::status() );
	}

	/**
	 * POST /cloud/connect
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function connect( $request ) {
		// Key guessing through our site is pointless (the service rate-limits too), but cap it.
		$limited = $this->rate_limit( 'cloud_connect', 10, HOUR_IN_SECONDS );
		if ( is_wp_error( $limited ) ) {
			return $limited;
		}
		if ( true !== $request['accept_terms'] ) {
			return new \WP_Error( 'terms_not_accepted', __( 'Tick the box to agree to the AtlasAR Cloud terms first.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$status = AR_TRY_ON_Cloud::connect( (string) $request['api_key'] );
		if ( is_wp_error( $status ) ) {
			return $status;
		}
		return rest_ensure_response( $status );
	}

	/**
	 * POST /cloud/register
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function register( $request ) {
		$limited = $this->rate_limit( 'cloud_register', 5, HOUR_IN_SECONDS );
		if ( is_wp_error( $limited ) ) {
			return $limited;
		}
		if ( true !== $request['accept_terms'] ) {
			return new \WP_Error( 'terms_not_accepted', __( 'Tick the box to agree to the AtlasAR Cloud terms first.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$status = AR_TRY_ON_Cloud::register( (string) $request['email'] );
		return is_wp_error( $status ) ? $status : rest_ensure_response( $status );
	}

	/**
	 * POST /cloud/recheck
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function recheck() {
		$limited = $this->rate_limit( 'cloud_recheck', 60, HOUR_IN_SECONDS );
		if ( is_wp_error( $limited ) ) {
			return $limited;
		}
		if ( '' === AR_TRY_ON_Cloud::get_key() ) {
			return rest_ensure_response( AR_TRY_ON_Cloud::status() );
		}
		$status = AR_TRY_ON_Cloud::recheck();
		return is_wp_error( $status ) ? $status : rest_ensure_response( $status );
	}

	/**
	 * DELETE /cloud/connect
	 *
	 * @return \WP_REST_Response
	 */
	public function disconnect() {
		AR_TRY_ON_Cloud::disconnect();
		return rest_ensure_response( AR_TRY_ON_Cloud::status() );
	}

	/**
	 * Browser-safe view of a job.
	 *
	 * @param array $job Stored job.
	 * @return array
	 */
	private function job_json( $job ) {
		$out = array(
			'status'     => (string) ( $job['status'] ?? '' ),
			'height_cm'  => (float) ( $job['height_cm'] ?? 0 ),
			'started_at' => (int) ( $job['started_at'] ?? 0 ),
			'error'      => (string) ( $job['error'] ?? '' ),
		);
		if ( ! empty( $job['result_attachment'] ) ) {
			$out['src']           = (string) wp_get_attachment_url( (int) $job['result_attachment'] );
			$out['attachment_id'] = (int) $job['result_attachment'];
			$out['source_size']   = (int) ( $job['source_size'] ?? 0 );
			$out['result_size']   = (int) ( $job['result_size'] ?? 0 );
		}
		return $out;
	}

	/**
	 * POST /cloud/optimize/{post_id}
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function start( $request ) {
		$post_id = absint( $request['post_id'] );
		$limited = $this->rate_limit( 'cloud_optimize', 30, HOUR_IN_SECONDS );
		if ( is_wp_error( $limited ) ) {
			return $limited;
		}
		$current = get_post_meta( $post_id, AR_TRY_ON_Cloud::JOB_META, true );
		if ( is_array( $current ) && in_array( $current['status'] ?? '', array( 'queued', 'processing' ), true ) && ( time() - (int) ( $current['started_at'] ?? 0 ) ) < 15 * MINUTE_IN_SECONDS ) {
			return new \WP_Error( 'job_running', __( 'This model is already being optimized.', 'ar-vr-3d-model-try-on' ), array( 'status' => 409 ) );
		}

		$source = AR_TRY_ON_Cloud::attachment_from_url( (string) $request['src'] );
		if ( ! $source ) {
			return new \WP_Error( 'invalid_source', __( 'Only a GLB file from this site\'s Media Library can be optimized. Upload the model to the Media Library first.', 'ar-vr-3d-model-try-on' ), array( 'status' => 422 ) );
		}
		$model = AR_TRY_ON_Cloud::start_optimize(
			$source,
			array(
				'name'      => get_the_title( $post_id ),
				'height_cm' => (float) $request['height_cm'],
			)
		);
		if ( is_wp_error( $model ) ) {
			return $model;
		}
		$model_id = (string) ( $model['id'] ?? '' );
		if ( ! preg_match( '/^mdl_[A-Za-z0-9]{10,40}$/', $model_id ) ) {
			return new \WP_Error( 'cloud_bad_response', __( 'AtlasAR Cloud sent an unexpected answer. Please try again.', 'ar-vr-3d-model-try-on' ), array( 'status' => 502 ) );
		}
		// Same file + height again: the service answers with the same model (idempotent). Reuse the
		// file already imported instead of adding a duplicate to the Media Library.
		if ( is_array( $current ) && ( $current['model_id'] ?? '' ) === $model_id && ! empty( $current['result_attachment'] ) && get_post( (int) $current['result_attachment'] ) ) {
			return rest_ensure_response( $this->job_json( $current ) );
		}
		$job = array(
			'model_id'          => $model_id,
			'source_attachment' => $source,
			'source_size'       => (int) filesize( (string) get_attached_file( $source ) ),
			'height_cm'         => (float) $request['height_cm'],
			'status'            => 'processing',
			'started_at'        => time(),
			'user'              => get_current_user_id(),
		);
		update_post_meta( $post_id, AR_TRY_ON_Cloud::JOB_META, $job );
		update_post_meta( $post_id, AR_TRY_ON_Cloud::MODEL_META, $model_id ); // AR-99: webhook lookup
		if ( ! AR_TRY_ON_Cloud::status()['webhook'] ) {
			AR_TRY_ON_Cloud::ensure_webhook(); // sites connected before AR-99, or a failed first try
		}
		// The service may have answered "ready" at once (same file sent before: idempotent).
		return $this->poll( $request );
	}

	/**
	 * GET /cloud/optimize/{post_id}
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function poll( $request ) {
		$post_id = absint( $request['post_id'] );
		$job     = get_post_meta( $post_id, AR_TRY_ON_Cloud::JOB_META, true );
		if ( ! is_array( $job ) || empty( $job['model_id'] ) ) {
			return rest_ensure_response( array( 'status' => 'none' ) );
		}
		if ( in_array( $job['status'], array( 'ready', 'failed' ), true ) ) {
			return rest_ensure_response( $this->job_json( $job ) );
		}

		$model = AR_TRY_ON_Cloud::request( 'GET', '/v1/models/' . rawurlencode( $job['model_id'] ) );
		if ( is_wp_error( $model ) ) {
			if ( 'cloud_not_found' === $model->get_error_code() ) {
				$job['status'] = 'failed';
				$job['error']  = $model->get_error_message();
				update_post_meta( $post_id, AR_TRY_ON_Cloud::JOB_META, $job );
				return rest_ensure_response( $this->job_json( $job ) );
			}
			return $model; // Temporary (network, rate limit): the browser polls again.
		}

		return rest_ensure_response( $this->job_json( AR_TRY_ON_Cloud::apply_model( $post_id, $job, $model ) ) );
	}
}
