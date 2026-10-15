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
		// AR-76: every endpoint carries a 'description' and every arg a
		// description (plus enum/format where the values are fixed) so
		// AtlasMCP can expose these routes as self-explaining tools.
		// File-path args carry no 'format': WordPress runs sanitize_url()
		// on format=uri values, which would mangle an absolute path.

		// Get compression settings
		register_rest_route(
			$this->namespace,
			'/compression/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'description'         => __( 'Returns the model compression settings stored in the ar_try_on_compression_settings option (enabled, quality, keep_original, auto_compress). Read only. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Updates the model compression settings stored in the ar_try_on_compression_settings option. Only the fields that are sent change. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'enabled'         => array(
						'type'        => 'boolean',
						'required'    => false,
						'description' => __( 'Whether model compression is enabled on this site.', 'ar-vr-3d-model-try-on' ),
					),
					'quality'         => array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 100,
						'required'    => false,
						'description' => __( 'Default compression quality from 0 (smallest file) to 100 (best quality); the UI uses 10-100 and defaults to 85.', 'ar-vr-3d-model-try-on' ),
					),
					'keep_original'   => array(
						'type'        => 'boolean',
						'required'    => false,
						'description' => __( 'Whether the original uncompressed model file is kept next to the compressed one.', 'ar-vr-3d-model-try-on' ),
					),
					'auto_compress'   => array(
						'type'        => 'boolean',
						'required'    => false,
						'description' => __( 'Whether newly uploaded models are compressed automatically.', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Starts a compression job for an item\'s model: copies the source file into uploads/atlas_ar/<post_id>/original.glb, picks the method ("client" in the browser for files up to 10 MB, "server" with Pro above that), and opens a "pending" row in the compression log. Returns the log_id, the method and the file paths that the next steps (upload-compressed or Pro server-compress, then complete or fail) need. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'post_id'     => array(
						'type'        => 'integer',
						'required'    => true,
						'description' => __( 'ID of the post or product whose model is compressed.', 'ar-vr-3d-model-try-on' ),
					),
					'source_file' => array(
						'type'        => 'string',
						'format'      => 'uri',
						'required'    => true,
						'description' => __( 'URL of the model to compress, normally the item\'s current GLB src inside this site\'s uploads folder, for example https://example.com/wp-content/uploads/2026/10/chair.glb.', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Marks a compression job as complete: records the compressed file, its size and the time taken on the log row opened by /compression/prepare. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'log_id'           => array(
						'type'        => 'integer',
						'required'    => true,
						'description' => __( 'ID of the compression log row returned by /compression/prepare.', 'ar-vr-3d-model-try-on' ),
					),
					'compressed_file'  => array(
						'type'        => 'string',
						'required'    => true,
						'description' => __( 'URL or absolute path of the compressed file: the file_url returned by /upload-compressed, or the output_file returned by the Pro server-compress route.', 'ar-vr-3d-model-try-on' ),
					),
					'compression_time' => array(
						'type'        => 'integer',
						'required'    => false,
						'default'     => 0,
						'description' => __( 'Time the compression took, in milliseconds.', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Marks a compression job as failed and stores the error message on the log row opened by /compression/prepare. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'log_id'        => array(
						'type'        => 'integer',
						'required'    => true,
						'description' => __( 'ID of the compression log row returned by /compression/prepare.', 'ar-vr-3d-model-try-on' ),
					),
					'error_message' => array(
						'type'        => 'string',
						'required'    => true,
						'description' => __( 'Human-readable reason the compression failed, shown in the compression history.', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Returns the latest compression log entry of an item (status pending, complete or failed, sizes, savings, method, timestamps), or data null when the item\'s model was never compressed. Read only. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'post_id' => array(
						'type'        => 'integer',
						'required'    => true,
						'description' => __( 'ID of the post or product (from the URL).', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Returns site-wide compression statistics: number of compressed models, total original and compressed bytes, bytes saved and average savings. Read only. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Tells whether another model may be compressed. Compression is unlimited in every edition, so this always allows it (limit -1); kept for older dashboards. Read only. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Lists compression log entries (item, status, sizes, savings, method, dates), newest first, optionally filtered by status and paginated. Read only. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'status' => array(
						'type'        => 'string',
						'enum'        => array( 'pending', 'complete', 'failed' ),
						'required'    => false,
						'description' => __( 'Only entries with this status; omit for all statuses.', 'ar-vr-3d-model-try-on' ),
					),
					'limit'  => array(
						'type'        => 'integer',
						'required'    => false,
						'default'     => 50,
						'description' => __( 'Maximum number of entries to return; default 50.', 'ar-vr-3d-model-try-on' ),
					),
					'offset' => array(
						'type'        => 'integer',
						'required'    => false,
						'default'     => 0,
						'description' => __( 'Number of entries to skip for pagination; default 0.', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Deletes an item\'s compressed model files from uploads/atlas_ar/<post_id>/ and removes its compression log entries. The item\'s model settings are not changed. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'post_id' => array(
						'type'        => 'integer',
						'required'    => true,
						'description' => __( 'ID of the post or product whose compressed files are deleted (from the URL).', 'ar-vr-3d-model-try-on' ),
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
				'description'         => __( 'Stores a model that was compressed in the browser: multipart upload of the GLB/GLTF into the item\'s uploads/atlas_ar/<post_id>/ folder. Returns file_path and file_url for /compression/complete. Administrators only (manage_options).', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'file'        => array(
						'type'        => 'string',
						'format'      => 'binary',
						'required'    => false,
						'description' => __( 'The compressed GLB or GLTF, sent as the multipart form field "file".', 'ar-vr-3d-model-try-on' ),
					),
					'target_path' => array(
						'type'        => 'string',
						'required'    => false,
						'description' => __( 'Absolute path of the folder to store the file in: the paths.post_dir value returned by /compression/prepare (uploads/atlas_ar/<post_id>). When omitted the file goes to the regular uploads folder.', 'ar-vr-3d-model-try-on' ),
					),
				),
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

		// "Not compressed yet" is the normal state for every new model, not a
		// missing resource. A 404 here made the browser log a console error
		// each time the AtlasAR box opened on an uncompressed model (AR-71).
		// CompressionPanel only acts on `success && data`, so `data: null`
		// is a no-op for it.
		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => null,
				'message' => __( 'No compression found for this post.', 'ar-vr-3d-model-try-on' ),
			),
			200
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
	 * REST handler: report whether the user can still compress models.
	 *
	 * AR-61 §1.1 removed the Free count cap; the helper now always
	 * returns "unlimited / not at limit". The route stays in place
	 * because the React UI still calls it on mount — they get the
	 * permissive payload and never render the "limit reached" branch.
	 *
	 * @since   1.8.0
	 * @updated AR-61 §1.1 — count cap removed.
	 * @param   WP_REST_Request $request Request object.
	 * @return  \WP_REST_Response Response object.
	 */
	public function can_compress( $request ) {
		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => AR_TRY_ON_Compression::can_user_compress(),
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
