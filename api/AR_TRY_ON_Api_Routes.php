<?php

namespace AR_TRY_ON_API;

use AR_TRY_ON\AR_TRY_ON_Activator;
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

	public function get_model_and_settings( $request ) {

		$product_id = json_decode( $request['product_id'] );
		$product_id = intval( $product_id );

		if ( empty( $product_id ) ) {
			return rest_ensure_response( [
				'success' => false,
				'data'    => 'Invalid Product ID.'
			] );
		}

		// Global product variable
		global $product;
		$model_poster                   = '';
		$model_alt                      = '';
		$get_ios_file                   = '';
		$model_3d_file                  = '';
		$loading                        = '';
		$reveal                         = '';
		$ar                             = '';
		$scale                          = '';
		$placement                      = '';
		$xr_environment                 = '';
		$ar_modes                       = [ 'webxr', 'scene-viewer', 'quick-look' ];
		$custom_button                  = '';
		$custom_button_text             = '';
		$custom_button_text_color       = '';
		$custom_button_background_color = '';
		$poster_color                   = '';

		$product_settings = (array) get_post_meta( $product_id, 'ar_try_on_product_settings', true );

		//Get the file url for android
		if ( isset( $product_settings['ar_try_on_file_android'] ) && $product_settings['ar_try_on_file_android'] ) {
			$model_3d_file = $product_settings['ar_try_on_file_android'];
		}

		//Get the fiel url for IOS
		if ( isset( $product_settings['ar_try_on_file_ios'] ) && $product_settings['ar_try_on_file_ios'] ) {
			$get_ios_file = $product_settings['ar_try_on_file_ios'];
		}


		//Get the alt for web accessibility
		if ( isset( $product_settings['ar_try_on_file_alt'] ) && $product_settings['ar_try_on_file_alt'] ) {
			$model_alt = $product_settings['ar_try_on_file_alt'];
		}

		//Get the Poster
		if ( isset( $product_settings['ar_try_on_file_poster'] ) && $product_settings['ar_try_on_file_poster'] ) {
			$model_poster = $product_settings['ar_try_on_file_poster'];
		}

		if ( isset( $product_settings['ar_try_on_ar_placement'] ) && $product_settings['ar_try_on_ar_placement'] ) {
			$placement = $product_settings['ar_try_on_ar_placement'];
		}

		$settings = (array) get_option( 'ar_try_on_settings' );


		if ( isset( $settings['ar_try_on_poster_color'] ) && $settings['ar_try_on_poster_color'] ) {
			$poster_color = $settings['ar_try_on_poster_color'];
		}

		if ( isset( $settings['ar_try_on_loading_type'] ) && $settings['ar_try_on_loading_type'] ) {
			$loading = $settings['ar_try_on_loading_type'];
		}

		if ( isset( $settings['ar_try_on_reveal_type'] ) && $settings['ar_try_on_reveal_type'] ) {
			$reveal = $settings['ar_try_on_reveal_type'];
		}


		if ( isset( $settings['ar_try_on_ar'] ) && $settings['ar_try_on_ar'] ) {
			$ar = $settings['ar_try_on_ar'];
		}


		if ( isset( $settings['ar_try_on_ar_scale'] ) && $settings['ar_try_on_ar_scale'] ) {
			$scale = $settings['ar_try_on_ar_scale'];
		}

		// TODO remove this one after 6 months. Because this settings will be based on model type.
		if ( ! $placement && isset( $settings['ar_try_on_ar_placement'] ) && $settings['ar_try_on_ar_placement'] ) {
			$placement = $settings['ar_try_on_ar_placement'];
		}

		if ( isset( $settings['ar_try_on_xr_environment'] ) && $settings['ar_try_on_xr_environment'] ) {
			$xr_environment = $settings['ar_try_on_xr_environment'];
		}

		if ( isset( $settings['ar_try_on_ar_modes'] ) && $settings['ar_try_on_ar_modes'] ) {
			$ar_modes = $settings['ar_try_on_ar_modes'];
		}

		if ( isset( $settings['ar_try_on_ar_button'] ) && $settings['ar_try_on_ar_button'] ) {
			$custom_button = $settings['ar_try_on_ar_button'];
		}

		if ( isset( $settings['ar_try_on_ar_button_text'] ) && $settings['ar_try_on_ar_button_text'] ) {
			$custom_button_text = $settings['ar_try_on_ar_button_text'];
		}

		if ( isset( $settings['ar_try_on_ar_button_text_color'] ) && $settings['ar_try_on_ar_button_text_color'] ) {
			$custom_button_text_color = $settings['ar_try_on_ar_button_text_color'];
		}

		if ( isset( $settings['ar_try_on_ar_button_background_color'] ) && $settings['ar_try_on_ar_button_background_color'] ) {
			$custom_button_background_color = $settings['ar_try_on_ar_button_background_color'];
		}

		// Check if the customs fields has a value.
		if ( ! empty( $get_android_file ) ) {
			$android_file_url = $get_android_file;
		}


		// Obtener el nombre del producto
		$product_name = get_the_title( $product_id );

		// Comprobar que el archivo 3D existe
		if ( ! $model_3d_file ) {
			return rest_ensure_response( [
				'success' => false,
				'data'    => '3D model file is missing.'
			] );
		}

		// Preparar los datos para el retorno
		$data = array(
			'loading'                        => $loading,
			'reveal'                         => $reveal,
			'poster_color'                   => $poster_color,
			'ar'                             => $ar,
			'scale'                          => $scale,
			'ar_placement'                   => $placement,
			'xr_environment'                 => $xr_environment,
			'ar_modes'                       => $ar_modes,
			'product_name'                   => $product_name,
			'model_3d_file'                  => $model_3d_file,
			'model_ios_file'                 => $get_ios_file,
			'model_alt'                      => $model_alt,
			'model_poster'                   => $model_poster,
			'custom_button'                  => $custom_button,
			'custom_button_text'             => $custom_button_text,
			'custom_button_text_color'       => $custom_button_text_color,
			'custom_button_background_color' => $custom_button_background_color,
		);

		// Enviar la respuesta en formato JSON
		return rest_ensure_response( [
			'success' => true,
			'data'    => $data
		] );
	}

	/*
 * Manage product settings data
 */
	public function demo_preview( $request ) {
		$response['status'] = true;
		// save data about recording.
		if ( 'post' == $request['method'] ) {
			AR_TRY_ON_Activator::activate();
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
