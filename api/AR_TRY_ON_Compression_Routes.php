<?php
namespace ATLAS_AR_API;

use AR_TRY_ON\AR_TRY_ON_Compression_DB;
use AR_TRY_ON\AR_TRY_ON_Compression;
use AR_TRY_ON\AR_TRY_ON_Format_Converter;
use AR_TRY_ON\AR_TRY_ON_Helper;

/**
 * AR Try On - Compression REST API Routes
 *
 * REST API endpoints for compression feature.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/api
 * @since      1.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Compression_Routes
 */
class AR_TRY_ON_Compression_Routes {

	/**
	 * API namespace
	 *
	 * @var string
	 */
	private $namespace = 'ar_try_on/v1';

	/**
	 * Target directory for the next wp_handle_upload() call.
	 *
	 * Set by upload_compressed_file() before add_filter()/remove_filter()
	 * so the named callback filter_upload_dir_target() can read it without
	 * needing a closure (closures bound to add_filter cannot be removed
	 * with remove_filter — they are distinct callable instances).
	 *
	 * @var string|null
	 */
	private $upload_target_path = null;

	/**
	 * Register routes
	 *
	 * @since 1.8.0
	 */
	public function register_routes() {
		// Get compression settings
		register_rest_route(
			$this->namespace,
			'/compression/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Update compression settings
		register_rest_route(
			$this->namespace,
			'/compression/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_settings' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'enabled'         => array(
						'type'     => 'boolean',
						'required' => false,
					),
					'quality'         => array(
						'type'     => 'integer',
						'minimum'  => 0,
						'maximum'  => 100,
						'required' => false,
					),
					'keep_original'   => array(
						'type'     => 'boolean',
						'required' => false,
					),
					'auto_compress'   => array(
						'type'     => 'boolean',
						'required' => false,
					),
				),
			)
		);

		// Prepare compression
		register_rest_route(
			$this->namespace,
			'/compression/prepare',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'prepare_compression' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'post_id'     => array(
						'type'     => 'integer',
						'required' => true,
					),
					'source_file' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);

		// Complete compression
		register_rest_route(
			$this->namespace,
			'/compression/complete',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'complete_compression' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'log_id'           => array(
						'type'     => 'integer',
						'required' => true,
					),
					'compressed_file'  => array(
						'type'     => 'string',
						'required' => true,
					),
					'compression_time' => array(
						'type'     => 'integer',
						'required' => false,
						'default'  => 0,
					),
				),
			)
		);

		// Fail compression
		register_rest_route(
			$this->namespace,
			'/compression/fail',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'fail_compression' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'log_id'        => array(
						'type'     => 'integer',
						'required' => true,
					),
					'error_message' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);

		// Get compression status
		register_rest_route(
			$this->namespace,
			'/compression/status/(?P<post_id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_status' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'post_id' => array(
						'type'     => 'integer',
						'required' => true,
					),
				),
			)
		);

		// Get statistics
		register_rest_route(
			$this->namespace,
			'/compression/stats',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_stats' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Check if user can compress
		register_rest_route(
			$this->namespace,
			'/compression/can-compress',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'can_compress' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Get compressed models list
		register_rest_route(
			$this->namespace,
			'/compression/models',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_models' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'status' => array(
						'type'     => 'string',
						'required' => false,
					),
					'limit'  => array(
						'type'     => 'integer',
						'required' => false,
						'default'  => 50,
					),
					'offset' => array(
						'type'     => 'integer',
						'required' => false,
						'default'  => 0,
					),
				),
			)
		);

		// Delete compressed model
		register_rest_route(
			$this->namespace,
			'/compression/delete/(?P<post_id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_compressed' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'post_id' => array(
						'type'     => 'integer',
						'required' => true,
					),
				),
			)
		);

		// Pro-only routes (bulk-compress, server-compress, convert-format) moved to Pro plugin
		// See: ar-vr-3d-model-try-on-pro/Api/AR_TRY_ON_Pro_Compression_Routes.php

		// Upload compressed file
		register_rest_route(
			$this->namespace,
			'/upload-compressed',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'upload_compressed_file' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Note: Local compression routes removed - plugin now uses API-only compression for WordPress.org compliance
	}

	/**
	 * Get compression settings
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_settings( $request ) {
		$settings = AR_TRY_ON_Compression::get_settings();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $settings,
			),
			200
		);
	}

	/**
	 * Update compression settings
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function update_settings( $request ) {
		$settings = array();

		if ( $request->has_param( 'enabled' ) ) {
			$settings['enabled'] = $request->get_param( 'enabled' );
		}
		if ( $request->has_param( 'quality' ) ) {
			$settings['quality'] = $request->get_param( 'quality' );
		}
		if ( $request->has_param( 'keep_original' ) ) {
			$settings['keep_original'] = $request->get_param( 'keep_original' );
		}
		if ( $request->has_param( 'auto_compress' ) ) {
			$settings['auto_compress'] = $request->get_param( 'auto_compress' );
		}

		$updated = AR_TRY_ON_Compression::update_settings( $settings );

		if ( $updated ) {
			return new \WP_REST_Response(
				array(
					'success' => true,
					'message' => __( 'Settings updated successfully.', 'ar-vr-3d-model-try-on' ),
					'data'    => AR_TRY_ON_Compression::get_settings(),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'Failed to update settings.', 'ar-vr-3d-model-try-on' ),
			),
			500
		);
	}

	/**
	 * Prepare compression
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function prepare_compression( $request ) {
		$post_id     = $request->get_param( 'post_id' );
		$source_file = $request->get_param( 'source_file' );

		$result = AR_TRY_ON_Compression::prepare_compression( $post_id, $source_file );

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => $result->get_error_message(),
					'code'    => $result->get_error_code(),
				),
				400
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Compression prepared successfully.', 'ar-vr-3d-model-try-on' ),
				'data'    => $result,
			),
			200
		);
	}

	/**
	 * Complete compression
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function complete_compression( $request ) {
		$log_id           = $request->get_param( 'log_id' );
		$compressed_file  = $request->get_param( 'compressed_file' );
		$compression_time = $request->get_param( 'compression_time' );

        $compressed_file_url = AR_TRY_ON_Helper::get_file_url_from_path( $compressed_file );

		$result = AR_TRY_ON_Compression::complete_compression( $log_id, $compressed_file, $compression_time );

		if ( $result ) {
			return new \WP_REST_Response(
				array(
					'success' => true,
					'message' => __( 'Compression completed successfully.', 'ar-vr-3d-model-try-on' ),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'Failed to complete compression.', 'ar-vr-3d-model-try-on' ),
				'$result' => $result,
			),
			500
		);
	}

	/**
	 * Fail compression
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function fail_compression( $request ) {
		$log_id        = $request->get_param( 'log_id' );
		$error_message = $request->get_param( 'error_message' );

		$result = AR_TRY_ON_Compression::fail_compression( $log_id, $error_message );

		if ( $result ) {
			return new \WP_REST_Response(
				array(
					'success' => true,
					'message' => __( 'Compression marked as failed.', 'ar-vr-3d-model-try-on' ),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'Failed to update compression status.', 'ar-vr-3d-model-try-on' ),
			),
			500
		);
	}

	/**
	 * Get compression status for a post
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_status( $request ) {
		$post_id = $request->get_param( 'post_id' );
		$log     = AR_TRY_ON_Compression_DB::get_compression_log( $post_id );

		if ( $log ) {
			return new \WP_REST_Response(
				array(
					'success' => true,
					'data'    => $log,
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'No compression found for this post.', 'ar-vr-3d-model-try-on' ),
			),
			404
		);
	}

	/**
	 * Get compression statistics
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_stats( $request ) {
		$stats = AR_TRY_ON_Compression::get_stats();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $stats,
			),
			200
		);
	}

	/**
	 * Check if user can compress
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function can_compress( $request ) {
		$result = AR_TRY_ON_Compression::can_user_compress();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $result,
			),
			200
		);
	}

	/**
	 * Get compressed models list
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_models( $request ) {
		$args = array(
			'status' => $request->get_param( 'status' ),
			'limit'  => $request->get_param( 'limit' ),
			'offset' => $request->get_param( 'offset' ),
		);

		$models = AR_TRY_ON_Compression::get_compressed_models( $args );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $models,
			),
			200
		);
	}

	/**
	 * Delete compressed model
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function delete_compressed( $request ) {
		$post_id = $request->get_param( 'post_id' );
		$deleted = AR_TRY_ON_Compression::delete_compressed_files( $post_id );

		if ( $deleted ) {
			return new \WP_REST_Response(
				array(
					'success' => true,
					'message' => __( 'Compressed model deleted successfully.', 'ar-vr-3d-model-try-on' ),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success' => false,
				'message' => __( 'Failed to delete compressed model.', 'ar-vr-3d-model-try-on' ),
			),
			500
		);
	}

	// Pro endpoint handlers (bulk_compress, server_compress, convert_format) moved to Pro plugin

	/**
	 * Upload compressed file
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function upload_compressed_file( $request ) {
		$files = $request->get_file_params();
		$target_path = $request->get_param( 'target_path' );

		if ( empty( $files['file'] ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'No file uploaded.', 'ar-vr-3d-model-try-on' ),
				),
				400
			);
		}

		$file = $files['file'];

		// Use WordPress upload handling
		if ( ! function_exists( 'wp_handle_upload' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

        // Use a named instance method so remove_filter() can actually find
        // and remove the registered callback (AR-61 §7.1). Closures created
        // at add_filter time and re-created at remove_filter time are
        // distinct callables and remove_filter would silently no-op.
        $this->upload_target_path = $target_path;
        add_filter( 'upload_dir', array( $this, 'filter_upload_dir_target' ) );

		$upload_overrides = array( 'test_form' => false );
		$uploaded_file    = wp_handle_upload( $file, $upload_overrides );

        remove_filter( 'upload_dir', array( $this, 'filter_upload_dir_target' ) );
        $this->upload_target_path = null;

        if ( isset( $uploaded_file['error'] ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => $uploaded_file['error'],
				),
				500
			);
		}

		return new \WP_REST_Response(
			array(
				'success'   => true,
				'message'   => __( 'File uploaded successfully.', 'ar-vr-3d-model-try-on' ),
				'file_path' => $uploaded_file['file'],
				'file_url'  => $uploaded_file['url'],
			),
			200
		);
	}

	/**
	 * Get supported formats for conversion
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_supported_formats( $request ) {
		// Get formats info from AR_TRY_ON_Format_Converter
		$formats_info = AR_TRY_ON_Format_Converter::get_formats_info();

		$requirements = array(
			'api_url' => defined( 'ATLAS_AR_COMPRESSION_API_URL' ) ? ATLAS_AR_COMPRESSION_API_URL : '',
			'method'  => $formats_info['method'],
		);

		return new \WP_REST_Response(
			array(
				'success'      => true,
				'formats'      => array(
					'input'  => $formats_info['input'],
					'output' => $formats_info['output'],
				),
				'requirements' => $requirements,
			),
			200
		);
	}

	/**
	 * Check if current user has permission
	 *
	 * @since 1.8.0
	 * @return bool Whether user has permission.
	 */
	public function check_permission() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Check if current user has permission and Pro is active
	 *
	 * @since 1.8.0
	 * @return bool Whether user has permission and Pro is active.
	 */
	public function check_pro_permission() {
		return current_user_can( 'manage_options' ) && AR_TRY_ON_Compression::is_pro_active();
	}

	/**
	 * Named callback for the `upload_dir` filter used during compressed-file uploads.
	 *
	 * Reads the desired target path from $this->upload_target_path so that the
	 * same callable reference can be passed to both add_filter() and
	 * remove_filter(). See upload_compressed_file().
	 *
	 * @since 2.0.x (AR-61 §7.1)
	 * @param array $dirs The default upload directory array from wp_upload_dir().
	 * @return array Modified upload directory pointing at the per-request target path.
	 */
	public function filter_upload_dir_target( $dirs ) {
		if ( null === $this->upload_target_path ) {
			return $dirs;
		}
		$custom_subdir  = str_replace( $dirs['basedir'], '', $this->upload_target_path );
		$dirs['subdir'] = $custom_subdir;
		$dirs['path']   = $dirs['basedir'] . $custom_subdir;
		$dirs['url']    = $dirs['baseurl'] . $custom_subdir;
		return $dirs;
	}
}
