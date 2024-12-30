<?php

namespace AR_TRY_ON_API;

use AR_TRY_ON\AR_TRY_ON_Cache;

/**
 * This class is for getting all plugin's data  through api.
 * This is applied for tracker menu.
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/api
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Api_Routes {

	protected $namespace;
	protected $wordpress;
	protected $version;
	protected $analytics;
	protected $compatibility;

	public function __construct() {
		$this->version   = 'v1';
		$this->namespace = 'ar_try_on/' . $this->version;
		add_action( 'rest_api_init', [ $this, 'ar_try_on_register_routes' ] );
	}

	/**
	 * Register Routes
	 */
	public function ar_try_on_register_routes() {

		// register settings route.
		register_rest_route(
			$this->namespace,
			'/settings',
			array(
				array(
					'methods'             => \WP_REST_Server::ALLMETHODS,
					'callback'            => array( $this, 'settings' ),
					'permission_callback' => array( $this, 'get_route_access' ),
					'args'                => array(),
				),
			)
		);

		// register settings route.
		register_rest_route(
			$this->namespace,
			'/product_settings',
			array(
				array(
					'methods'             => \WP_REST_Server::ALLMETHODS,
					'callback'            => array( $this, 'product_settings' ),
					'permission_callback' => array( $this, 'get_route_access' ),
					'args'                => array(),
				),
			)
		);


	}


	/*
	 * Manage settings data
	 */
	public function settings( $request ) {
		$response['status'] = true;
		// save data about recording.
		if ( 'post' == $request['method'] ) {
			$fields = json_decode( $request['fields'] );
			update_option( 'ar_try_on_settings', $fields );
			AR_TRY_ON_Cache::delete( 'settings' );
			$response['data'] = $fields;
			AR_TRY_ON_Cache::set( 'settings', $fields );

			return rest_ensure_response( $response );
		}

		// get data about recording.
		if ( 'get' == $request['method'] ) {

			$response['data'] = get_option( 'ar_try_on_settings' );

			return rest_ensure_response( $response );
		}
	}


	/*
	 * Manage product settings data
	 */
	public function product_settings( $request ) {
		$response['status'] = true;
		// save data about recording.
		if ( 'post' == $request['method'] ) {
			$fields  = json_decode( $request['fields'] );
			$post_id = json_decode( $request['post_id'] );
			update_post_meta( $post_id, 'ar_try_on_product_settings', $fields );
			$response['data'] = $fields;

			return rest_ensure_response( $response );
		}

		// get data about recording.
		if ( 'get' == $request['method'] ) {
			$post_id = json_decode( $request['post_id'] );

			$response['data'] = get_post_meta( $post_id, 'ar_try_on_product_settings', true );

			return rest_ensure_response( $response );
		}
	}


	/*
	 * Get route access if request is valid.
	 */
	public function get_route_access() {
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) ) {
			$nonce = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_WP_NONCE'] ) );
			if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
				return apply_filters( 'ar_try_on_rest_route_access', false );
			}
		}


		return apply_filters( 'ar_try_on_rest_route_access', true );
	}
}
