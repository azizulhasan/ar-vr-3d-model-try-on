<?php

namespace ATLAS_AR_API;

/**
 * REST routes for the virtual try-on feature.
 *
 * Namespace: ar_try_on/v1
 *  POST /tryon/snapshot — save snapshot to media library (logged-in users)
 *
 * Settings + config are read/written via the existing `/settings` route
 * (shared `ar_try_on_settings` option) and delivered to JS through
 * `wp_localize_script`. There is no separate `/tryon/config` or
 * `/tryon/settings` route — single source of truth.
 *
 * @package AR_TRY_ON
 */
class AR_TRY_ON_Tryon_Routes {

	protected $namespace = 'ar_try_on/v1';

	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/tryon/snapshot',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'save_snapshot' ),
				'permission_callback' => array( $this, 'logged_in_only' ),
			)
		);
	}

	public function logged_in_only() {
		return is_user_logged_in();
	}

	public function save_snapshot( $request ) {
		$image_data = $request->get_param( 'image' );
		$product_id = absint( $request->get_param( 'product_id' ) );

		if ( ! $image_data || strpos( $image_data, 'data:image/' ) !== 0 ) {
			return new \WP_Error( 'invalid_image', 'Invalid image payload', array( 'status' => 400 ) );
		}

		$parts = explode( ',', $image_data, 2 );
		if ( count( $parts ) !== 2 ) {
			return new \WP_Error( 'invalid_image', 'Malformed data URL', array( 'status' => 400 ) );
		}
		$decoded = base64_decode( $parts[1] );
		if ( false === $decoded ) {
			return new \WP_Error( 'invalid_image', 'Decode failed', array( 'status' => 400 ) );
		}

		$upload = wp_upload_bits(
			'tryon-' . $product_id . '-' . time() . '.png',
			null,
			$decoded
		);

		if ( ! empty( $upload['error'] ) ) {
			return new \WP_Error( 'upload_failed', $upload['error'], array( 'status' => 500 ) );
		}

		do_action(
			'atlas_ar_tryon_session_recorded',
			array(
				'product_id' => $product_id,
				'snapshot'   => $upload['url'],
				'user_id'    => get_current_user_id(),
				'timestamp'  => time(),
			)
		);

		return rest_ensure_response(
			array(
				'status' => true,
				'url'    => $upload['url'],
			)
		);
	}
}
