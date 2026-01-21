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

		// Bulk compress (Pro only)
		register_rest_route(
			$this->namespace,
			'/compression/bulk-compress',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'bulk_compress' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
				'args'                => array(
					'post_ids' => array(
						'type'     => 'array',
						'required' => false,
					),
				),
			)
		);

		// Server-side compression (Pro only)
		register_rest_route(
			$this->namespace,
			'/compression/server-compress',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'server_compress' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
				'args'                => array(
					'input_file'  => array(
						'type'     => 'string',
						'required' => true,
					),
					'output_file' => array(
						'type'     => 'string',
						'required' => true,
					),
					'quality'     => array(
						'type'     => 'integer',
						'minimum'  => 1,
						'maximum'  => 100,
						'required' => false,
						'default'  => 85,
					),
				),
			)
		);

		// Format conversion FBX/OBJ → GLB (Pro only)
		register_rest_route(
			$this->namespace,
			'/compression/convert-format',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'convert_format' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
				'args'                => array(
					'input_file'  => array(
						'type'     => 'string',
						'required' => true,
					),
					'output_file' => array(
						'type'     => 'string',
						'required' => true,
					),
					'quality'     => array(
						'type'     => 'integer',
						'minimum'  => 1,
						'maximum'  => 100,
						'required' => false,
						'default'  => 85,
					),
				),
			)
		);

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

		// Check Node.js status
		register_rest_route(
			$this->namespace,
			'/compression/node-status',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_node_status' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Check dependencies status
		register_rest_route(
			$this->namespace,
			'/compression/dependencies-status',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_dependencies_status' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// Install dependencies (Pro only)
		register_rest_route(
			$this->namespace,
			'/compression/install-dependencies',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'install_dependencies' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
			)
		);

		// Uninstall dependencies (Pro only)
		register_rest_route(
			$this->namespace,
			'/compression/uninstall-dependencies',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'uninstall_dependencies' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
			)
		);

		// Update compression method
		register_rest_route(
			$this->namespace,
			'/compression/method',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_compression_method' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
				'args'                => array(
					'method' => array(
						'type'     => 'string',
						'enum'     => array( 'auto', 'local', 'api' ),
						'required' => true,
					),
				),
			)
		);

        // get compression method
        register_rest_route(
            $this->namespace,
            '/compression/method',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'get_compression_method' ),
                'permission_callback' => array( $this, 'check_pro_permission' ),
                'args'                => array(),
            )
        );

		// Update API URL
		register_rest_route(
			$this->namespace,
			'/compression/api-url',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_api_url' ),
				'permission_callback' => array( $this, 'check_pro_permission' ),
				'args'                => array(
					'url' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);

        // GET API URL
        register_rest_route(
            $this->namespace,
            '/compression/api-url',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'get_api_url' ),
                'permission_callback' => array( $this, 'check_pro_permission' ),
                'args'                => array(),
            )
        );
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

	/**
	 * Bulk compress models (Pro only)
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function bulk_compress( $request ) {
		if ( ! AR_TRY_ON_Compression::is_pro_active() ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Bulk compression is a Pro feature.', 'ar-vr-3d-model-try-on' ),
					'code'    => 'pro_only',
				),
				403
			);
		}

		$post_ids = $request->get_param( 'post_ids' );

		// If no post IDs provided, get all AR-enabled posts
		if ( empty( $post_ids ) ) {
			$post_types = AR_TRY_ON_Helper::get_settings()['ar_try_on_allowed_post_types'];
			$posts      = get_posts(
				array(
					'post_type'      => $post_types,
					'posts_per_page' => -1,
					'fields'         => 'ids',
					'meta_query'     => array(
						array(
							'key'     => '_ar_try_on_model',
							'compare' => 'EXISTS',
						),
					),
				)
			);
			$post_ids   = $posts;
		}

		$queued = 0;
		$errors = array();

		foreach ( $post_ids as $post_id ) {
			$model_file = get_post_meta( $post_id, '_ar_try_on_model', true );

			if ( empty( $model_file ) ) {
				continue;
			}

			$result = AR_TRY_ON_Compression::add_to_queue( $post_id, $model_file );

			if ( is_wp_error( $result ) ) {
				$errors[] = array(
					'post_id' => $post_id,
					'error'   => $result->get_error_message(),
				);
			} else {
				$queued++;
			}
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => sprintf( __( '%d models queued for compression.', 'ar-vr-3d-model-try-on' ), $queued ),
				'data'    => array(
					'queued' => $queued,
					'errors' => $errors,
				),
			),
			200
		);
	}

	/**
	 * Execute server-side compression (Pro only)
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function server_compress( $request ) {
		$input_file  = $request->get_param( 'input_file' );
		$output_file = $request->get_param( 'output_file' );
		$quality     = $request->get_param( 'quality' );

		$result = AR_TRY_ON_Compression::compress_server_side( $input_file, $output_file, $quality );

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
				'message' => __( 'Model compressed successfully.', 'ar-vr-3d-model-try-on' ),
				'data'    => $result,
			),
			200
		);
	}

	/**
	 * Execute format conversion FBX/OBJ → GLB (Pro only)
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function convert_format( $request ) {
		$input_file  = $request->get_param( 'input_file' );
		$output_file = $request->get_param( 'output_file' );
		$compress    = $request->get_param( 'compress' );
		$quality     = $request->get_param( 'quality' );

		// Ensure Format Converter is loaded
		if ( ! class_exists( 'AR_TRY_ON\AR_TRY_ON_Format_Converter' ) ) {
			require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/AR_TRY_ON_Format_Converter.php';
		}

		if ( $compress ) {
			$result = AR_TRY_ON_Format_Converter::convert_and_compress( $input_file, $output_file, true, $quality );
		} else {
			$result = AR_TRY_ON_Format_Converter::convert( $input_file, $output_file );
		}

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
				'message' => __( 'Model format converted successfully.', 'ar-vr-3d-model-try-on' ),
				'data'    => $result,
			),
			200
		);
	}

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

        add_filter( 'upload_dir',  function ( $dirs ) use ( $target_path ) {
            $custom_subdir = str_replace( $dirs['basedir'], '', $target_path );

            $dirs['subdir'] = $custom_subdir;
            $dirs['path']   = $dirs['basedir'] . $custom_subdir;
            $dirs['url']    = $dirs['baseurl'] . $custom_subdir;

            return $dirs;
        } );

		$upload_overrides = array( 'test_form' => false );
		$uploaded_file    = wp_handle_upload( $file, $upload_overrides );

        remove_filter( 'upload_dir',  function ( $dirs ) use ( $target_path ) {
            $custom_subdir = str_replace( $dirs['basedir'], '', $target_path );

            $dirs['subdir'] = $custom_subdir;
            $dirs['path']   = $dirs['basedir'] . $custom_subdir;
            $dirs['url']    = $dirs['baseurl'] . $custom_subdir;

            return $dirs;
        } );

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
		// Ensure Format Converter is loaded
		if ( ! class_exists( 'AR_TRY_ON\AR_TRY_ON_Format_Converter' ) ) {
			require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/AR_TRY_ON_Format_Converter.php';
		}

		$formats = AR_TRY_ON_Format_Converter::get_supported_formats();
		$requirements = AR_TRY_ON_Format_Converter::get_system_requirements();

		return new \WP_REST_Response(
			array(
				'success'      => true,
				'formats'      => $formats,
				'requirements' => $requirements,
			),
			200
		);
	}

	/**
	 * Get Node.js status
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_node_status( $request ) {
		$status = AR_TRY_ON_Compression::check_node_available();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $status,
			),
			200
		);
	}

	/**
	 * Get dependencies status
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function get_dependencies_status( $request ) {
		$status = AR_TRY_ON_Compression::check_dependencies_installed();

		return new \WP_REST_Response(
			array(
				'success' => true,
				'data'    => $status,
			),
			200
		);
	}

	/**
	 * Install dependencies
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function install_dependencies( $request ) {
		$result = AR_TRY_ON_Compression::install_dependencies();

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
				'message' => $result['message'],
				'data'    => $result,
			),
			200
		);
	}

	/**
	 * Uninstall dependencies
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function uninstall_dependencies( $request ) {
		$result = AR_TRY_ON_Compression::uninstall_dependencies();

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
				'message' => $result['message'],
			),
			200
		);
	}

	/**
	 * Update compression method
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function update_compression_method( $request ) {
		$method = $request->get_param( 'method' );
		update_option( 'ar_try_on_compression_method', $method );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => sprintf( __( 'Compression method updated to: %s', 'ar-vr-3d-model-try-on' ), $method ),
				'method'  => $method,
			),
			200
		);
	}

    /**
     * GET compression method
     *
     * @since 1.8.0
     * @param WP_REST_Request $request Request object.
     * @return \WP_REST_Response Response object.
     */
    public function get_compression_method( $request ) {

        $method = get_option( 'ar_try_on_compression_method', 'auto' );

        return new \WP_REST_Response(
            array(
                'success' => true,
                'data' => [
                    'method' => $method,
                ]
            ),
            200
        );
    }


	/**
	 * Update API URL
	 *
	 * @since 1.8.0
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function update_api_url( $request ) {
		$url = esc_url_raw( $request->get_param( 'url' ) );
		update_option( 'ar_try_on_compression_api_url', $url );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'API URL updated successfully.', 'ar-vr-3d-model-try-on' ),
				'url'     => $url,
			),
			200
		);
	}

    /**
     * Update API URL
     *
     * @since 1.8.0
     * @param WP_REST_Request $request Request object.
     * @return \WP_REST_Response Response object.
     */
    public function get_api_url( $request ) {
        $url = get_option( 'ar_try_on_compression_api_url' );

        return new \WP_REST_Response(
            array(
                'success' => true,
                'data' => [
                    'url' => $url,
                ]
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
}
