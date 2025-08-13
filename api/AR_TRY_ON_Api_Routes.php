<?php

namespace AR_TRY_ON_API;

use AR_TRY_ON\AR_TRY_ON;
use AR_TRY_ON\AR_TRY_ON_Activator;
use AR_TRY_ON\AR_TRY_ON_Cache;
use AR_TRY_ON\AR_TRY_ON_Helper;

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
		// register get_model_and_settings route.
		register_rest_route(
			$this->namespace,
			'/get_model_and_settings',
			array(
				array(
					'methods'             => \WP_REST_Server::ALLMETHODS,
					'callback'            => array( $this, 'get_model_and_settings' ),
					'permission_callback' => array( $this, 'get_route_access' ),
					'args'                => array(),
				),
			)
		);

		// register demo_preview route.
		register_rest_route(
			$this->namespace,
			'/demo_preview',
			array(
				array(
					'methods'             => \WP_REST_Server::ALLMETHODS,
					'callback'            => array( $this, 'demo_preview' ),
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
			$fields = json_decode( $request['fields'], true );
			update_option( 'ar_try_on_settings', $fields );
			AR_TRY_ON_Cache::delete( 'settings' );

			if ( isset( $fields['ar_try_on_clear_cache'] ) && $fields['ar_try_on_clear_cache'] ) {
				AR_TRY_ON_Cache::flush();
				$fields['ar_try_on_clear_cache'] = false;
			}

			$response['data'] = $fields;
			AR_TRY_ON_Cache::set( 'settings', $fields );

			return rest_ensure_response( $response );
		}

		// get data about recording.
		if ( 'get' == $request['method'] ) {
			$settings = get_option( 'ar_try_on_settings' );
			if(empty($settings)) {
				$settings = AR_TRY_ON_Activator::activate(1);
			}
			
			$response['data'] = $settings;

			return rest_ensure_response( $response );
		}
	}

	public function get_model_and_settings( $request ) {

		$decoded_body = $request->get_params();
		$post_id = isset($decoded_body['post_id']) ? $decoded_body['post_id'] : null;
		if(!$post_id) {
			$post_id = isset($decoded_body['product_id']) ? $decoded_body['product_id'] : null;
		}
		$post_id = intval( $post_id );
		$call_from = isset($decoded_body['call_from']) ? $decoded_body['call_from'] : '';
		$method = isset($decoded_body['method']) ? $decoded_body['method'] : 'GET';
		$filtered_data = [];
		$data = [];
		if($method == 'GET') {
			$settings = (array) get_option( 'ar_try_on_settings' );
			$product_settings = [];
			if ( empty( $post_id ) && $call_from == 'admin' ) {
				if(empty($settings)) {
					$settings = AR_TRY_ON_Helper::default_settings();
				}
				$product_settings = AR_TRY_ON_Helper::default_model_settings();
			}

			if($post_id) {
				$product_settings = (array) get_post_meta( $post_id, 'ar_try_on_product_settings', true );
				$product_settings = AR_TRY_ON_Helper::rename_old_keys_of_product_metadata($product_settings);
			}
			
			// Get Default value.
			if(empty($product_settings) || !array_key_exists('src', $product_settings) ) {
				$product_settings = AR_TRY_ON_Helper::default_model_settings();
			}


			$data = $settings;
			$data += $product_settings;
			$data['product_name'] = $post_id ?  get_the_title( $post_id ) : '';
		}else{
			$fields = json_decode($decoded_body['fields']);
			$data = $fields;
			foreach( $fields  as $key =>  $value ) {
				if (strpos($key, 'ar_try_on') === false) {
					$filtered_data[$key] = $value;
				}
			}

			update_post_meta($post_id, 'ar_try_on_product_settings', $filtered_data);
		}

		// Enviar la respuesta en formato JSON
		return rest_ensure_response( [
			'success' => true,
			'data'    => $data,
		] );
	}

	/*
 * Manage product settings data
 */
	public function demo_preview( $request ) {
		$response['status'] = true;
		// save data about recording.
		if ( 'post' == $request['method'] ) {
			$response['data'] = get_option( 'ar_try_on_settings' );

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
