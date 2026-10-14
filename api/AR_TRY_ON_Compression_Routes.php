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
	 * The destination folder is never taken from the client: it is derived
	 * server-side as uploads/atlas_ar/<post_id>/ (AR-86). The legacy
	 * `target_path` field is still accepted from older metabox builds, but
	 * only to read the post ID from it, and only when it resolves to that
	 * exact folder.
	 *
	 * @since 1.8.0
	 * @updated AR-86 — server-side target folder + GLB/glTF file check.
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error Response object.
	 */
	public function upload_compressed_file( $request ) {
		$files = $request->get_file_params();

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

		$target_path = $this->resolve_upload_target( $request );
		if ( is_wp_error( $target_path ) ) {
			return $target_path;
		}

		$file_check = $this->validate_compressed_file( $file );
		if ( is_wp_error( $file_check ) ) {
			return $file_check;
		}

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
	 * Work out the folder a compressed upload is written to (AR-86).
	 *
	 * The folder is always uploads/atlas_ar/<post_id>/, built on the server
	 * by AR_TRY_ON_Compression::get_upload_paths(). The post ID comes from
	 * the `post_id` field, or — for metabox builds older than AR-86 that
	 * only send `target_path` — from the last segment of `target_path`.
	 * Whenever `target_path` is sent it must resolve to exactly that folder,
	 * so `../` segments, absolute paths, other drives and other plugin
	 * folders are all rejected.
	 *
	 * @since 2.3.1
	 * @param \WP_REST_Request $request Request object.
	 * @return string|\WP_Error Absolute folder path, or WP_Error (422/403).
	 */
	private function resolve_upload_target( $request ) {
		$post_id     = absint( $request->get_param( 'post_id' ) );
		$target_path = $request->get_param( 'target_path' );
		$has_target  = null !== $target_path && '' !== $target_path;

		if ( $has_target && ! is_string( $target_path ) ) {
			return $this->upload_target_error();
		}

		if ( ! $post_id && $has_target ) {
			$last_segment = wp_basename( untrailingslashit( wp_normalize_path( $target_path ) ) );
			if ( ctype_digit( $last_segment ) ) {
				$post_id = absint( $last_segment );
			}
		}

		if ( ! $post_id || ! get_post( $post_id ) ) {
			return new \WP_Error(
				'atlas_ar_upload_invalid_post',
				__( 'A valid post ID is required to store the compressed model.', 'ar-vr-3d-model-try-on' ),
				array( 'status' => 422 )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error(
				'atlas_ar_upload_forbidden',
				__( 'You are not allowed to change the 3D model of this post.', 'ar-vr-3d-model-try-on' ),
				array( 'status' => 403 )
			);
		}

		$paths         = AR_TRY_ON_Compression::get_upload_paths( $post_id );
		$post_dir      = $paths['post_dir'];
		$real_post_dir = realpath( $post_dir );

		if ( false === $real_post_dir
			|| ! AR_TRY_ON_Helper::path_is_within_model_dir( trailingslashit( $post_dir ) . 'model.glb' )
		) {
			return $this->upload_target_error();
		}

		if ( $has_target ) {
			$real_target = realpath( $target_path );
			if ( false === $real_target
				|| wp_normalize_path( $real_target ) !== wp_normalize_path( $real_post_dir )
			) {
				return $this->upload_target_error();
			}
		}

		return $post_dir;
	}

	/**
	 * Stable error for an upload target outside the model folder (AR-86).
	 *
	 * @since 2.3.1
	 * @return \WP_Error
	 */
	private function upload_target_error() {
		return new \WP_Error(
			'atlas_ar_upload_target_invalid',
			__( 'The upload folder must be inside the 3D model folder.', 'ar-vr-3d-model-try-on' ),
			array( 'status' => 422 )
		);
	}

	/**
	 * Check the uploaded file really is a GLB / glTF model (AR-86).
	 *
	 * The name may not carry path separators, the extension must be
	 * .glb or .gltf, a .glb must start with the binary `glTF` magic and a
	 * .gltf must be JSON with an `asset` block.
	 *
	 * @since 2.3.1
	 * @param array $file One entry from WP_REST_Request::get_file_params().
	 * @return true|\WP_Error
	 */
	private function validate_compressed_file( $file ) {
		$error = new \WP_Error(
			'atlas_ar_upload_file_invalid',
			__( 'Only GLB or glTF model files can be uploaded here.', 'ar-vr-3d-model-try-on' ),
			array( 'status' => 422 )
		);

		$name = isset( $file['name'] ) && is_string( $file['name'] ) ? $file['name'] : '';
		$tmp  = isset( $file['tmp_name'] ) && is_string( $file['tmp_name'] ) ? $file['tmp_name'] : '';

		if ( '' === $name || preg_match( '#[/\\\\\x00]#', $name ) || '' === $tmp || ! is_file( $tmp ) ) {
			return $error;
		}

		$extension = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );

		if ( 'glb' === $extension ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reads 4 bytes of a local temp upload.
			return 'glTF' === file_get_contents( $tmp, false, null, 0, 4 ) ? true : $error;
		}

		if ( 'gltf' === $extension ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reads a local temp upload.
			$json = json_decode( (string) file_get_contents( $tmp ), true );
			return is_array( $json ) && isset( $json['asset'] ) ? true : $error;
		}

		return $error;
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
		// Defence in depth (AR-86): the target is resolved server-side by
		// resolve_upload_target(), but never redirect outside uploads.
		$basedir = untrailingslashit( wp_normalize_path( $dirs['basedir'] ) );
		$target  = untrailingslashit( wp_normalize_path( $this->upload_target_path ) );
		if ( 0 !== strpos( $target . '/', $basedir . '/' ) || false !== strpos( $target, '../' ) ) {
			$dirs['error'] = __( 'The upload folder must be inside the 3D model folder.', 'ar-vr-3d-model-try-on' );
			return $dirs;
		}
		$custom_subdir  = substr( $target, strlen( $basedir ) );
		$dirs['subdir'] = $custom_subdir;
		$dirs['path']   = $dirs['basedir'] . $custom_subdir;
		$dirs['url']    = $dirs['baseurl'] . $custom_subdir;
		return $dirs;
	}
}
