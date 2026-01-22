<?php
namespace AR_TRY_ON;
/**
 * AR Try On - 3D Model Compression Handler
 *
 * Handles compression of 3D models using Draco geometry compression
 * and Basis Universal texture compression.
 *
 * Features:
 * - Client-side compression for small files (<5MB)
 * - Server-side compression for large files (Pro only)
 * - Support for GLB/GLTF, FBX, OBJ formats
 * - Free user limit: 5 models (soft limit)
 * - Pro user: Unlimited compression
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      1.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Compression
 */
class AR_TRY_ON_Compression {

	/**
	 * Free user compression limit
	 *
	 * @var int
	 */
	const FREE_USER_LIMIT = 5;

	/**
	 * Size threshold for client vs server-side compression (5MB)
	 *
	 * @var int
	 */
	const CLIENT_SIDE_THRESHOLD = 5242880; // 5MB in bytes

	/**
	 * Upload directory for original and compressed files
	 *
	 * @var string
	 */
	private static $upload_dir = 'atlas_ar';

	/**
	 * Initialize compression hooks and filters
	 *
	 * @since 1.8.0
	 */
	public static function init() {
		// Initialize database tables
		AR_TRY_ON_Compression_DB::init();

		// Register settings
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );

		// Handle post deletion (cleanup files)
		add_action( 'before_delete_post', array( __CLASS__, 'cleanup_on_post_delete' ) );

		// Cron job for background processing (Pro only)
		if ( self::is_pro_active() ) {
			add_action( 'ar_try_on_process_compression_queue', array( __CLASS__, 'process_queue' ) );

			// Schedule cron if not already scheduled
			if ( ! wp_next_scheduled( 'ar_try_on_process_compression_queue' ) ) {
				wp_schedule_event( time(), 'every_5_minutes', 'ar_try_on_process_compression_queue' );
			}
		}

		// Add custom cron schedule
		add_filter( 'cron_schedules', array( __CLASS__, 'add_cron_schedules' ) );

		// Plugin deactivation hook to clear scheduled events
		register_deactivation_hook( plugin_dir_path( dirname( __FILE__ ) ) . 'ar-vr-3d-model-try-on.php', array( __CLASS__, 'deactivation_cleanup' ) );
	}

	/**
	 * Add custom cron schedules
	 *
	 * @since 1.8.0
	 * @param array $schedules Existing schedules.
	 * @return array Modified schedules.
	 */
	public static function add_cron_schedules( $schedules ) {
		if ( ! isset( $schedules['every_5_minutes'] ) ) {
			$schedules['every_5_minutes'] = array(
				'interval' => 300, // 5 minutes
				'display'  => __( 'Every 5 Minutes', 'ar-vr-3d-model-try-on' ),
			);
		}
		return $schedules;
	}

	/**
	 * Cleanup on plugin deactivation
	 *
	 * @since 1.8.0
	 */
	public static function deactivation_cleanup() {
		$timestamp = wp_next_scheduled( 'ar_try_on_process_compression_queue' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'ar_try_on_process_compression_queue' );
		}
	}

	/**
	 * Register compression settings
	 *
	 * @since 1.8.0
	 */
	public static function register_settings() {
		$defaults = self::get_default_settings();

		if ( false === get_option( 'ar_try_on_compression_settings' ) ) {
			add_option( 'ar_try_on_compression_settings', $defaults );
		}
	}

	/**
	 * Get default compression settings
	 *
	 * @since 1.8.0
	 * @return array Default settings.
	 */
	public static function get_default_settings() {
		return array(
			'enabled'         => true,
			'quality'         => 85,
			'keep_original'   => true,
			'auto_compress'   => true,
			'supported_formats' => array( 'glb', 'gltf' ),
		);
	}

	/**
	 * Get compression settings
	 *
	 * @since 1.8.0
	 * @return array Current settings.
	 */
	public static function get_settings() {
		$settings = get_option( 'ar_try_on_compression_settings', self::get_default_settings() );
		return wp_parse_args( $settings, self::get_default_settings() );
	}

	/**
	 * Update compression settings
	 *
	 * @since 1.8.0
	 * @param array $settings New settings.
	 * @return bool Success status.
	 */
	public static function update_settings( $settings ) {
		$current  = self::get_settings();
		$settings = wp_parse_args( $settings, $current );

		return update_option( 'ar_try_on_compression_settings', $settings );
	}

	/**
	 * Check if compression is enabled
	 *
	 * @since 1.8.0
	 * @return bool Whether compression is enabled.
	 */
	public static function is_enabled() {
		$settings = self::get_settings();
		return (bool) $settings['enabled'];
	}

	/**
	 * Check if user can compress more models (free user limit)
	 *
	 * @since 1.8.0
	 * @return array Status and details.
	 */
	public static function can_user_compress() {
		// Pro users have unlimited compression
		if ( self::is_pro_active() ) {
			return array(
				'can_compress' => true,
				'limit'        => -1, // Unlimited
				'used'         => -1,
				'remaining'    => -1,
			);
		}

		// Free users: 5 model limit (soft limit - can delete to compress new ones)
		$used = AR_TRY_ON_Compression_DB::count_user_compressions();

		return array(
			'can_compress' => true, // Always true for soft limit
			'limit'        => self::FREE_USER_LIMIT,
			'used'         => $used,
			'remaining'    => max( 0, self::FREE_USER_LIMIT - $used ),
			'at_limit'     => $used >= self::FREE_USER_LIMIT,
		);
	}

	/**
	 * Get upload directory paths
	 *
	 * @since 1.8.0
	 * @param int $post_id Post ID.
	 * @return array Directory paths.
	 */
	public static function get_upload_paths( $post_id ) {
		$wp_upload_dir = wp_upload_dir();
		$base_dir      = trailingslashit( $wp_upload_dir['basedir'] ) . self::$upload_dir;
		$base_url      = trailingslashit( $wp_upload_dir['baseurl'] ) . self::$upload_dir;
		$post_dir      = trailingslashit( $base_dir ) . $post_id;
		$post_url      = trailingslashit( $base_url ) . $post_id;

		// Create directories if they don't exist
		if ( ! file_exists( $post_dir ) ) {
			wp_mkdir_p( $post_dir );
		}

		return array(
			'base_dir'  => $base_dir,
			'base_url'  => $base_url,
			'post_dir'  => $post_dir,
			'post_url'  => $post_url,
			'url'  => trailingslashit( $post_url ) . 'original.glb',
			'original'  => trailingslashit( $post_dir ) . 'original.glb',
			'compressed' => trailingslashit( $post_dir ) . 'original_compressed.glb',
		);
	}

	/**
	 * Determine if file should use client-side or server-side compression
	 *
	 * @since 1.8.0
	 * @param string $file_path File path.
	 * @return string 'client' or 'server'.
	 */
	public static function get_compression_method( $file_path ) {
		$file_size = file_exists( $file_path ) ? filesize( $file_path ) : 0;

		// Small files: Client-side (both free and pro)
//		if ( $file_size < self::CLIENT_SIDE_THRESHOLD ) {
//			return 'client';
//		}

		// Large files: Server-side (Pro only)
		if ( self::is_pro_active() ) {
			return 'server';
		}

		// Free users: Large files use client-side with warning
		return 'client';
	}


    /**
	 * Prepare file for compression
	 *
	 * @since 1.8.0
	 * @param int    $post_id Post ID.
	 * @param string $source_url Source file path.
	 * @return array|\WP_Error Preparation result or error.
	 */
	public static function prepare_compression( $post_id, $source_url ) {
		// Check if compression is enabled
		if ( ! self::is_enabled() ) {
			return new \WP_Error( 'compression_disabled', __( 'Compression is currently disabled.', 'ar-vr-3d-model-try-on' ) );
		}

        $source_file = AR_TRY_ON_Helper::get_file_path_from_url( $source_url );

		// Check if file exists
		if ( ! $source_file ) {
			return new \WP_Error( 'file_not_found', __( 'Source file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Check user limits
		$can_compress = self::can_user_compress();
		if ( ! self::is_pro_active() && $can_compress['at_limit'] ) {
			// Check if this post already has compression (updating existing)
			$existing_log = AR_TRY_ON_Compression_DB::get_compression_log( $post_id );
			if ( ! $existing_log ) {
				return new \WP_Error(
					'limit_reached',
					sprintf(
						__( 'You have reached the free limit of %d compressed models. Delete a compressed model or upgrade to Pro for unlimited compression.', 'ar-vr-3d-model-try-on' ),
						self::FREE_USER_LIMIT
					)
				);
			}
		}

		// Get paths
		$paths = self::get_upload_paths( $post_id );

		// Copy source to original location if keep_original is enabled
		$settings = self::get_settings();
		if ( $settings['keep_original'] ) {
			if ( ! copy( $source_file, $paths['original'] ) ) {
				return new \WP_Error( 'copy_failed', __( 'Failed to copy original file.', 'ar-vr-3d-model-try-on' ) );
			}
		}else{
            $paths['original'] = $source_file;
            $paths['url'] = $source_url;
        }

		// Determine compression method
		$method    = self::get_compression_method( $source_file );
		$file_size = filesize( $source_file );
		$format    = pathinfo( $source_file, PATHINFO_EXTENSION );

		// Create compression log entry
		$log_id = AR_TRY_ON_Compression_DB::log_compression(
			array(
				'post_id'       => $post_id,
				'original_file' => $paths['original'],
				'compressed_file' => $paths['compressed'],
				'original_size' => $file_size,
				'format'        => $format,
				'quality'       => $settings['quality'],
				'status'        => 'pending',
			)
		);

		return array(
			'log_id'       => $log_id,
			'method'       => $method,
			'source_file'  => $source_file,
			'paths'        => $paths,
			'file_size'    => $file_size,
			'format'       => $format,
			'quality'      => $settings['quality'],
		);
	}

	/**
	 * Compress model using server-side compression (Smart Router)
	 *
	 * Automatically chooses between local or API compression based on:
	 * - User's compression method preference
	 * - Availability of local dependencies
	 * - API configuration status
	 *
	 * @since 1.8.0
	 * @param string $input_file Input file path.
	 * @param string $output_file Output file path.
	 * @param int    $quality Quality (1-100).
	 * @return array|\WP_Error Result array or error.
	 */
	public static function compress_server_side( $input_file, $output_file, $quality = 85 ) {
		if ( ! self::is_pro_active() ) {
			return new \WP_Error( 'pro_only', __( 'Server-side compression is a Pro feature.', 'ar-vr-3d-model-try-on' ) );
		}

		if ( ! file_exists( $input_file ) ) {
			return new \WP_Error( 'file_not_found', __( 'Input file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		$method = self::get_compression_system();

		// Option 1: Automatic (try local first, fallback to API)
		if ( $method === 'auto' ) {
			// Try local first
			if ( self::is_local_compression_available() ) {
				$result = self::compress_server_side_local( $input_file, $output_file, $quality );
				// If local succeeds, return immediately
				if ( ! is_wp_error( $result ) ) {
					return $result;
				}

				// Local failed, log the error
				error_log( '[AR Try On] Local compression failed: ' . $result->get_error_message() );
			}

			// Fallback to API
			if ( self::is_api_compression_available() ) {
				return self::compress_server_side_api( $input_file, $output_file, $quality );
			}

			// Neither available
			return new \WP_Error(
				'no_compression_available',
				__( 'Server compression is not configured. Please install local dependencies or configure API URL in plugin settings.', 'ar-vr-3d-model-try-on' )
			);
		}

		// Option 2: Local only
		if ( $method === 'local' ) {
			if ( ! self::is_local_compression_available() ) {
				return new \WP_Error(
					'local_not_available',
					__( 'Local compression is not available. Please install dependencies in plugin settings.', 'ar-vr-3d-model-try-on' )
				);
			}

			return self::compress_server_side_local( $input_file, $output_file, $quality );
		}

		// Option 3: API only
		if ( $method === 'api' ) {

			if ( ! self::is_api_compression_available() ) {
				return new \WP_Error(
					'api_not_configured',
					__( 'API compression URL is not configured. Please configure it in plugin settings.', 'ar-vr-3d-model-try-on' )
				);
			}

			return self::compress_server_side_api( $input_file, $output_file, $quality );
		}

		// Invalid method
		return new \WP_Error( 'invalid_method', __( 'Invalid compression method.', 'ar-vr-3d-model-try-on' ) );
	}

	/**
	 * Compress model using external API compression service (Pro only)
	 *
	 * @since 1.8.0
	 * @param string $input_file Input file path.
	 * @param string $output_file Output file path.
	 * @param int    $quality Quality (1-100).
	 * @return array|\WP_Error Result array or error.
	 */
	public static function compress_server_side_api( $input_file, $output_file, $quality = 85 ) {
		// Get compression API URL from settings
//		$api_url = get_option( 'ar_try_on_compression_api_url', ATLAS_AR_COMPRESSION_API_URL );
		$api_url = ATLAS_AR_COMPRESSION_API_URL;
		if ( empty( $api_url ) ) {
			return new \WP_Error( 'api_not_configured', __( 'API URL is not configured.', 'ar-vr-3d-model-try-on' ) );
		}

		$api_endpoint = trailingslashit( $api_url ) . 'compress-url';

		// Get file URL
		$input_file_url = AR_TRY_ON_Helper::get_file_url_from_path( $input_file );

        if ( ! $input_file_url ) {
			return new \WP_Error( 'url_not_found', __( 'Could not determine file URL.', 'ar-vr-3d-model-try-on' ) );
		}

		// Prepare API request
		$body = array(
			'url'     => $input_file_url,
			'quality' => intval( $quality ),
		);

		// Make API request
		$response = wp_remote_post(
			$api_endpoint,
			array(
				'body'    => wp_json_encode( $body ),
				'headers' => array(
					'Content-Type' => 'application/json',
				),
				'timeout' => 300, // 5 minutes timeout
			)
		);

		// Check for request errors
		if ( is_wp_error( $response ) ) {
			return new \WP_Error(
				'api_request_failed',
				sprintf( __( 'API request failed: %s', 'ar-vr-3d-model-try-on' ), $response->get_error_message() )
			);
		}

		$response_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );

		if ( $response_code !== 200 ) {
			return new \WP_Error(
				'api_error',
				sprintf( __( 'API returned error code %d: %s', 'ar-vr-3d-model-try-on' ), $response_code, $response_body )
			);
		}

		// Parse response
		$result = json_decode( $response_body, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new \WP_Error( 'json_parse_error', __( 'Failed to parse API response.', 'ar-vr-3d-model-try-on' ) );
		}

		if ( ! isset( $result['success'] ) || ! $result['success'] ) {
			$error_message = isset( $result['message'] ) ? $result['message'] : __( 'Compression failed.', 'ar-vr-3d-model-try-on' );
			return new \WP_Error( 'compression_failed', $error_message );
		}

		// Download compressed file
		$download_url = trailingslashit( $api_url ) . ltrim( $result['data']['download_url'], '/' );
		$download_response = wp_remote_get(
			$download_url,
			array(
				'timeout' => 300,
			)
		);

		if ( is_wp_error( $download_response ) ) {
			return new \WP_Error(
				'download_failed',
				sprintf( __( 'Failed to download compressed file: %s', 'ar-vr-3d-model-try-on' ), $download_response->get_error_message() )
			);
		}

		// Save compressed file
		$compressed_data = wp_remote_retrieve_body( $download_response );
		if ( ! file_put_contents( $output_file, $compressed_data ) ) {
			return new \WP_Error( 'save_failed', __( 'Failed to save compressed file.', 'ar-vr-3d-model-try-on' ) );
		}

		return array(
			'success'            => true,
			'original_size'      => $result['data']['original_size'],
			'compressed_size'    => $result['data']['compressed_size'],
			'compression_ratio'  => $result['data']['compression_ratio'],
			'compression_time'   => $result['data']['compression_time'],
			'output_file'        => $output_file,
			'output_url'        => AR_TRY_ON_Helper::get_file_url_from_path( $output_file ),
		);
	}

	/**
	 * Compress model using local Node.js compression (Pro only)
	 *
	 * Executes server-compress.js script directly on the server.
	 *
	 * @since 1.8.0
	 * @param string $input_file Input file path.
	 * @param string $output_file Output file path.
	 * @param int    $quality Quality (1-100).
	 * @return array|\WP_Error Result array or error.
	 */
	public static function compress_server_side_local( $input_file, $output_file, $quality = 85 ) {
		if ( ! file_exists( $input_file ) ) {
			return new \WP_Error( 'file_not_found', __( 'Input file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Get plugin directory
		$plugin_dir = dirname( dirname( __FILE__ ) );
		$script_path = $plugin_dir . '/includes/compression/server-compress.js';

		if ( ! file_exists( $script_path ) ) {
			return new \WP_Error( 'script_not_found', __( 'Compression script not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Check if Node.js is available
		$node_path = self::get_node_path();
		if ( is_wp_error( $node_path ) ) {
			return $node_path;
		}

		// Prepare command
		$command = sprintf(
			'%s %s %s %s %d 2>&1',
			escapeshellarg( $node_path ),
			escapeshellarg( $script_path ),
			escapeshellarg( $input_file ),
			escapeshellarg( $output_file ),
			intval( $quality )
		);

		// Execute compression
		$output = array();
		$return_var = 0;
		exec( $command, $output, $return_var );

		// Parse output
		$output_text = implode( "\n", $output );

		// Extract JSON result
		if ( preg_match( '/--- RESULT ---\s*(\{.*?\})\s*--- END RESULT ---/s', $output_text, $matches ) ) {
			$result = json_decode( $matches[1], true );

			if ( json_last_error() === JSON_ERROR_NONE ) {
				if ( isset( $result['success'] ) && $result['success'] ) {
					return array(
						'success'            => true,
						'original_size'      => $result['originalSize'],
						'compressed_size'    => $result['compressedSize'],
						'compression_ratio'  => $result['compressionRatio'],
						'compression_time'   => $result['compressionTime'],
						'output_file'        => $result['outputFile'],
						'output_url'        => AR_TRY_ON_Helper::get_file_url_from_path( $result['outputFile'] ),
					);
				} else {
					return new \WP_Error(
						'compression_failed',
						isset( $result['error'] ) ? $result['error'] : __( 'Compression failed.', 'ar-vr-3d-model-try-on' )
					);
				}
			}
		}

		// If we couldn't parse result, return raw output as error
		return new \WP_Error( 'parse_error', __( 'Failed to parse compression result: ', 'ar-vr-3d-model-try-on' ) . $output_text );
	}

	/**
	 * Convert model format (FBX/OBJ → GLB) using server-side conversion (Pro only)
	 *
	 * @since 1.8.0
	 * @param string $input_file Input file path (FBX or OBJ).
	 * @param string $output_file Output file path (GLB).
	 * @param int    $quality Quality (1-100).
	 * @return array|\WP_Error Result array or error.
	 */
	public static function convert_format( $input_file, $output_file, $quality = 85 ) {
		if ( ! self::is_pro_active() ) {
			return new \WP_Error( 'pro_only', __( 'Format conversion is a Pro feature.', 'ar-vr-3d-model-try-on' ) );
		}

		if ( ! file_exists( $input_file ) ) {
			return new \WP_Error( 'file_not_found', __( 'Input file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Validate input format
		$input_ext = strtolower( pathinfo( $input_file, PATHINFO_EXTENSION ) );
		if ( ! in_array( $input_ext, array( 'fbx', 'obj' ), true ) ) {
			return new \WP_Error( 'unsupported_format', __( 'Unsupported input format. Only FBX and OBJ are supported.', 'ar-vr-3d-model-try-on' ) );
		}

		// Get plugin directory
		$plugin_dir = dirname( dirname( __FILE__ ) );
		$script_path = $plugin_dir . '/includes/compression/format-converter.js';

		if ( ! file_exists( $script_path ) ) {
			return new \WP_Error( 'script_not_found', __( 'Format conversion script not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Check if Node.js is available
		$node_path = self::get_node_path();
		if ( is_wp_error( $node_path ) ) {
			return $node_path;
		}

		// Prepare command
		$command = sprintf(
			'%s %s %s %s %d 2>&1',
			escapeshellarg( $node_path ),
			escapeshellarg( $script_path ),
			escapeshellarg( $input_file ),
			escapeshellarg( $output_file ),
			intval( $quality )
		);

		// Execute conversion
		$output = array();
		$return_var = 0;
		exec( $command, $output, $return_var );

		// Parse output
		$output_text = implode( "\n", $output );

		// Extract JSON result
		if ( preg_match( '/--- RESULT ---\s*(\{.*?\})\s*--- END RESULT ---/s', $output_text, $matches ) ) {
			$result = json_decode( $matches[1], true );

			if ( json_last_error() === JSON_ERROR_NONE ) {
				if ( isset( $result['success'] ) && $result['success'] ) {
					return array(
						'success'          => true,
						'original_size'    => $result['originalSize'],
						'converted_size'   => $result['convertedSize'],
						'conversion_time'  => $result['conversionTime'],
						'output_file'      => $result['outputFile'],
						'format'           => $result['format'],
					);
				} else {
					return new \WP_Error(
						'conversion_failed',
						isset( $result['error'] ) ? $result['error'] : __( 'Format conversion failed.', 'ar-vr-3d-model-try-on' )
					);
				}
			}
		}

		// If we couldn't parse result, return raw output as error
		return new \WP_Error( 'parse_error', __( 'Failed to parse conversion result: ', 'ar-vr-3d-model-try-on' ) . $output_text );
	}


	/**
	 * Check if Node.js is available
	 *
	 * @since 1.8.0
	 * @return array Status array with 'available', 'version', 'path', 'message'.
	 */
	public static function check_node_available() {
		$node_path = self::get_node_path();

		if ( is_wp_error( $node_path ) ) {
			return array(
				'available' => false,
				'version'   => null,
				'path'      => null,
				'message'   => $node_path->get_error_message(),
			);
		}

		// Get Node.js version
		$output = array();
		$return_var = 0;
		exec( escapeshellarg( $node_path ) . ' --version 2>&1', $output, $return_var );

		$version = $return_var === 0 && ! empty( $output ) ? trim( $output[0] ) : 'unknown';

		return array(
			'available' => true,
			'version'   => $version,
			'path'      => $node_path,
			'message'   => sprintf( __( 'Node.js detected: %s', 'ar-vr-3d-model-try-on' ), $version ),
		);
	}

	/**
	 * Check if local compression dependencies are installed
	 *
	 * @since 1.8.0
	 * @return array Status array with 'installed', 'packages', 'message'.
	 */
	public static function check_dependencies_installed() {
		$plugin_dir = dirname( dirname( __FILE__ ) );
		$node_modules_dir = $plugin_dir . '/includes/compression/node_modules';
		$package_json = $plugin_dir . '/includes/compression/package.json';

		if ( ! file_exists( $package_json ) ) {
			return array(
				'installed' => false,
				'packages'  => array(),
				'message'   => __( 'package.json not found.', 'ar-vr-3d-model-try-on' ),
			);
		}

		if ( ! is_dir( $node_modules_dir ) ) {
			return array(
				'installed' => false,
				'packages'  => array(),
				'message'   => __( 'Dependencies not installed.', 'ar-vr-3d-model-try-on' ),
			);
		}

		// Read package.json to get required dependencies
		$package_data = json_decode( file_get_contents( $package_json ), true );
		$required_packages = isset( $package_data['dependencies'] ) ? array_keys( $package_data['dependencies'] ) : array();
		$installed_packages = array();

		// Check if required packages exist
		foreach ( $required_packages as $package ) {
			$package_dir = $node_modules_dir . '/' . $package;
			if ( is_dir( $package_dir ) ) {
				// Try to get version
				$package_json_path = $package_dir . '/package.json';
				if ( file_exists( $package_json_path ) ) {
					$pkg_data = json_decode( file_get_contents( $package_json_path ), true );
					$version = isset( $pkg_data['version'] ) ? $pkg_data['version'] : 'unknown';
				} else {
					$version = 'unknown';
				}

				$installed_packages[] = array(
					'name'    => $package,
					'version' => $version,
				);
			}
		}

		$all_installed = count( $installed_packages ) === count( $required_packages );

		return array(
			'installed' => $all_installed,
			'packages'  => $installed_packages,
			'message'   => $all_installed
				? sprintf( __( '%d packages installed.', 'ar-vr-3d-model-try-on' ), count( $installed_packages ) )
				: sprintf( __( 'Only %d of %d packages installed.', 'ar-vr-3d-model-try-on' ), count( $installed_packages ), count( $required_packages ) ),
		);
	}

	/**
	 * Check if local compression is available
	 *
	 * @since 1.8.0
	 * @return bool Whether local compression is available.
	 */
	public static function is_local_compression_available() {
		$node_status = self::check_node_available();
		$deps_status = self::check_dependencies_installed();

		return $node_status['available'] && $deps_status['installed'];
	}

	/**
	 * Check if API compression is available
	 *
	 * @since 1.8.0
	 * @return bool Whether API compression is configured.
	 */
	public static function is_api_compression_available() {
		$api_url = get_option( 'ar_try_on_compression_api_url', ATLAS_AR_COMPRESSION_API_URL );
		return ! empty( $api_url );
	}

	/**
	 * Get compression method from settings
	 *
	 * @since 1.8.0
	 * @return string 'auto', 'local', or 'api'.
	 */
	public static function get_compression_system() {
		return get_option( 'ar_try_on_compression_method', 'auto' );
	}

	/**
	 * Check disk space before installation
	 *
	 * @since 1.8.0
	 * @param int $required_mb Required space in MB.
	 * @return array Status array with 'available', 'free_space_mb', 'message'.
	 */
	public static function check_disk_space( $required_mb = 200 ) {
		$plugin_dir = dirname( dirname( __FILE__ ) );
		$free_space = disk_free_space( $plugin_dir );

		if ( $free_space === false ) {
			return array(
				'available'    => false,
				'free_space_mb' => 0,
				'message'      => __( 'Unable to determine disk space.', 'ar-vr-3d-model-try-on' ),
			);
		}

		$free_space_mb = round( $free_space / 1024 / 1024 );
		$has_space = $free_space_mb >= $required_mb;

		return array(
			'available'    => $has_space,
			'free_space_mb' => $free_space_mb,
			'message'      => $has_space
				? sprintf( __( '%d MB available.', 'ar-vr-3d-model-try-on' ), $free_space_mb )
				: sprintf( __( 'Insufficient disk space. %d MB required, %d MB available.', 'ar-vr-3d-model-try-on' ), $required_mb, $free_space_mb ),
		);
	}

	/**
	 * Install compression dependencies via npm
	 *
	 * @since 1.8.0
	 * @return array|\WP_Error Installation result or error.
	 */
	public static function install_dependencies() {
		// Check if Node.js is available
		$node_status = self::check_node_available();
		if ( ! $node_status['available'] ) {
			return new \WP_Error( 'node_not_found', $node_status['message'] );
		}

		// Check disk space
		$disk_status = self::check_disk_space( 200 );
		if ( ! $disk_status['available'] ) {
			return new \WP_Error( 'insufficient_disk_space', $disk_status['message'] );
		}

		$plugin_dir = dirname( dirname( __FILE__ ) );
		$compression_dir = $plugin_dir . '/includes/compression';

		if ( ! file_exists( $compression_dir . '/package.json' ) ) {
			return new \WP_Error( 'package_json_not_found', __( 'package.json not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Get npm path
		$npm_path = self::get_npm_path();
		if ( is_wp_error( $npm_path ) ) {
			return $npm_path;
		}

		// Change to compression directory and run npm install
		$command = sprintf(
			'cd %s && %s install 2>&1',
			escapeshellarg( $compression_dir ),
			escapeshellarg( $npm_path )
		);

		$output = array();
		$return_var = 0;
		$start_time = time();
        error_log(print_r([$command, $output, $return_var], true ));
		exec( $command, $output, $return_var );

		$installation_time = time() - $start_time;
		$output_text = implode( "\n", $output );

		if ( $return_var !== 0 ) {
			return new \WP_Error(
				'installation_failed',
				sprintf( __( 'npm install failed with exit code %d: %s', 'ar-vr-3d-model-try-on' ), $return_var, $output_text )
			);
		}

		// Verify installation
		$deps_status = self::check_dependencies_installed();

		if ( ! $deps_status['installed'] ) {
			return new \WP_Error(
				'verification_failed',
				__( 'Installation completed but dependencies verification failed.', 'ar-vr-3d-model-try-on' )
			);
		}

		return array(
			'success'           => true,
			'installation_time' => $installation_time,
			'packages_count'    => count( $deps_status['packages'] ),
			'packages'          => $deps_status['packages'],
			'message'           => sprintf(
				__( 'Successfully installed %d packages in %d seconds.', 'ar-vr-3d-model-try-on' ),
				count( $deps_status['packages'] ),
				$installation_time
			),
		);
	}

	/**
	 * Uninstall compression dependencies
	 *
	 * @since 1.8.0
	 * @return array|\WP_Error Uninstallation result or error.
	 */
	public static function uninstall_dependencies() {
		$plugin_dir = dirname( dirname( __FILE__ ) );
		$node_modules_dir = $plugin_dir . '/includes/compression/node_modules';

		if ( ! is_dir( $node_modules_dir ) ) {
			return new \WP_Error( 'not_installed', __( 'Dependencies are not installed.', 'ar-vr-3d-model-try-on' ) );
		}

		// Recursively delete node_modules directory
		$deleted = self::delete_directory_recursive( $node_modules_dir );

		if ( ! $deleted ) {
			return new \WP_Error( 'deletion_failed', __( 'Failed to delete node_modules directory.', 'ar-vr-3d-model-try-on' ) );
		}

		return array(
			'success' => true,
			'message' => __( 'Dependencies uninstalled successfully.', 'ar-vr-3d-model-try-on' ),
		);
	}

	/**
	 * Recursively delete a directory
	 *
	 * @since 1.8.0
	 * @param string $dir Directory path.
	 * @return bool Success status.
	 */
	private static function delete_directory_recursive( $dir ) {
		if ( ! is_dir( $dir ) ) {
			return false;
		}

		$files = array_diff( scandir( $dir ), array( '.', '..' ) );

		foreach ( $files as $file ) {
			$path = $dir . '/' . $file;

			if ( is_dir( $path ) ) {
				self::delete_directory_recursive( $path );
			} else {
				unlink( $path );
			}
		}

		return rmdir( $dir );
	}

	/**
	 * Get Node.js executable path
	 *
	 * @since 1.8.0
	 * @return string|\WP_Error Node path or error.
	 */
	private static function get_node_path() {
		// Try common paths
		$possible_paths = array(
			'node',                           // System PATH
			'/usr/bin/node',                  // Linux/Mac
			'/usr/local/bin/node',            // Mac Homebrew
			'C:\\Program Files\\nodejs\\node.exe', // Windows
			'C:\\Program Files (x86)\\nodejs\\node.exe', // Windows 32-bit
		);

		foreach ( $possible_paths as $path ) {
			// Test if node is available
			$test_output = array();
			$test_return = 0;
			exec( escapeshellarg( $path ) . ' --version 2>&1', $test_output, $test_return );

			if ( $test_return === 0 ) {
				return $path;
			}
		}

		return new \WP_Error(
			'node_not_found',
			__( 'Node.js is not installed or not found in system PATH. Server-side compression requires Node.js to be installed.', 'ar-vr-3d-model-try-on' )
		);
	}

	/**
	 * Get npm executable path based on Node.js path
	 *
	 * @since 1.8.0
	 * @return string|\WP_Error npm path or error.
	 */
	private static function get_npm_path() {
		$node_path = self::get_node_path();

		if ( is_wp_error( $node_path ) ) {
			return $node_path;
		}

		$is_windows = strtoupper( substr( PHP_OS, 0, 3 ) ) === 'WIN';

		// Try to find npm using system commands
		$possible_npm_paths = array();

		// On Windows, use 'where' command to find npm
		if ( $is_windows ) {
			$where_output = array();
			$where_return = 0;
			exec( 'where npm 2>&1', $where_output, $where_return );

			if ( $where_return === 0 && ! empty( $where_output ) ) {
				// Add all found npm paths
				foreach ( $where_output as $npm_location ) {
					$npm_location = trim( $npm_location );
					if ( ! empty( $npm_location ) && file_exists( $npm_location ) ) {
						$possible_npm_paths[] = $npm_location;
					}
				}
			}

			// Also try common paths
			$possible_npm_paths[] = 'npm.cmd';
			$possible_npm_paths[] = 'npm';
		} else {
			// On Unix, use 'which' command
			$which_output = array();
			$which_return = 0;
			exec( 'which npm 2>&1', $which_output, $which_return );

			if ( $which_return === 0 && ! empty( $which_output ) ) {
				$npm_location = trim( $which_output[0] );
				if ( ! empty( $npm_location ) && file_exists( $npm_location ) ) {
					$possible_npm_paths[] = $npm_location;
				}
			}

			$possible_npm_paths[] = 'npm';
		}

		// Also try deriving from node path
		if ( $node_path !== 'node' ) {
			$node_dir = dirname( $node_path );
			if ( $is_windows ) {
				$possible_npm_paths[] = $node_dir . '\\npm.cmd';
				$possible_npm_paths[] = $node_dir . '\\npm';
			} else {
				$possible_npm_paths[] = $node_dir . '/npm';
			}
		}

		// Test each possible path
		foreach ( $possible_npm_paths as $npm_path ) {
			$test_output = array();
			$test_return = 0;
			exec( escapeshellarg( $npm_path ) . ' --version 2>&1', $test_output, $test_return );

			if ( $test_return === 0 ) {
				return $npm_path;
			}
		}

		// If all paths failed, return error with helpful message
		return new \WP_Error(
			'npm_not_found',
			__( 'npm is not installed or not found. npm is required to install dependencies. Please ensure npm is installed and accessible from the command line.', 'ar-vr-3d-model-try-on' )
		);
	}

	/**
	 * Complete compression process
	 *
	 * @since 1.8.0
	 * @param int    $log_id Log entry ID.
	 * @param string $compressed_file Path to compressed file.
	 * @param int    $compression_time Compression time in milliseconds.
	 * @return bool Success status.
	 */
	public static function complete_compression( $log_id, $compressed_file, $compression_time = 0 ) {
		if ( ! file_exists( $compressed_file ) ) {
			return self::fail_compression( $log_id, __( 'Compressed file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		$compressed_size = filesize( $compressed_file );
		$log             = AR_TRY_ON_Compression_DB::get_compression_log( $log_id, 'id' );

		if ( ! $log ) {
			return false;
		}

		$compression_ratio = ( 1 - ( $compressed_size / $log['original_size'] ) ) * 100;

		return AR_TRY_ON_Compression_DB::update_compression_log(
			$log_id,
			array(
				'compressed_size'   => $compressed_size,
				'compression_ratio' => $compression_ratio,
				'status'            => 'complete',
				'compression_time'  => $compression_time,
			)
		);
	}

	/**
	 * Mark compression as failed
	 *
	 * @since 1.8.0
	 * @param int    $log_id Log entry ID.
	 * @param string $error_message Error message.
	 * @return bool Success status.
	 */
	public static function fail_compression( $log_id, $error_message ) {
		return AR_TRY_ON_Compression_DB::update_compression_log(
			$log_id,
			array(
				'status'        => 'failed',
				'error_message' => $error_message,
			)
		);
	}

	/**
	 * Add file to background compression queue (Pro only)
	 *
	 * @since 1.8.0
	 * @param int    $post_id Post ID.
	 * @param string $file_path File path.
	 * @param array  $options Compression options.
	 * @return int|\WP_Error Queue ID or error.
	 */
	public static function add_to_queue( $post_id, $file_path, $options = array() ) {
		if ( ! self::is_pro_active() ) {
			return new \WP_Error( 'pro_only', __( 'Background processing is a Pro feature.', 'ar-vr-3d-model-try-on' ) );
		}

		$settings = self::get_settings();
		$defaults = array(
			'format'   => pathinfo( $file_path, PATHINFO_EXTENSION ),
			'quality'  => $settings['quality'],
			'priority' => 10,
		);

		$options = wp_parse_args( $options, $defaults );

		$queue_id = AR_TRY_ON_Compression_DB::add_to_queue(
			array(
				'post_id'   => $post_id,
				'file_path' => $file_path,
				'format'    => $options['format'],
				'quality'   => $options['quality'],
				'priority'  => $options['priority'],
			)
		);

		return $queue_id ? $queue_id : new \WP_Error( 'queue_failed', __( 'Failed to add to queue.', 'ar-vr-3d-model-try-on' ) );
	}

	/**
	 * Process compression queue (Pro only, called by WP-Cron)
	 *
	 * @since 1.8.0
	 */
	public static function process_queue() {
		if ( ! self::is_pro_active() ) {
			return;
		}

		// Process up to 5 items per run to prevent server overload
		$max_items = 5;
		$processed = 0;

		while ( $processed < $max_items ) {
			$item = AR_TRY_ON_Compression_DB::get_next_queue_item();

			if ( ! $item ) {
				break; // No more items in queue
			}

			// Mark as processing
			AR_TRY_ON_Compression_DB::update_queue_item( $item['id'], 'processing' );

			// Prepare compression
			$preparation = self::prepare_compression( $item['post_id'], $item['file_path'] );

			if ( is_wp_error( $preparation ) ) {
				AR_TRY_ON_Compression_DB::update_queue_item(
					$item['id'],
					'failed',
					$preparation->get_error_message()
				);
				$processed++;
				continue;
			}

			// Execute server-side compression
			if ( $preparation['method'] === 'server' ) {
				$result = self::compress_server_side(
					$preparation['source_file'],
					$preparation['paths']['compressed'],
					$preparation['quality']
				);

				if ( is_wp_error( $result ) ) {
					self::fail_compression( $preparation['log_id'], $result->get_error_message() );
					AR_TRY_ON_Compression_DB::update_queue_item(
						$item['id'],
						'failed',
						$result->get_error_message()
					);
				} else {
					self::complete_compression(
						$preparation['log_id'],
						$result['output_file'],
						$result['compression_time']
					);
					AR_TRY_ON_Compression_DB::update_queue_item( $item['id'], 'complete' );
				}
			} else {
				// Client-side compression is handled by JavaScript
				AR_TRY_ON_Compression_DB::update_queue_item(
					$item['id'],
					'failed',
					__( 'Client-side compression cannot be processed in queue.', 'ar-vr-3d-model-try-on' )
				);
			}

			$processed++;
		}
	}

	/**
	 * Get compression statistics
	 *
	 * @since 1.8.0
	 * @return array Statistics.
	 */
	public static function get_stats() {
		$stats = AR_TRY_ON_Compression_DB::get_compression_stats();

		// Format sizes for display
		if ( ! empty( $stats ) ) {
			$stats['total_original_size_formatted']   = size_format( $stats['total_original_size'], 2 );
			$stats['total_compressed_size_formatted'] = size_format( $stats['total_compressed_size'], 2 );
			$stats['total_saved_space_formatted']     = size_format( $stats['total_saved_space'], 2 );
			$stats['avg_compression_ratio']           = isset( $stats['avg_compression_ratio'] )  ? round( (float) $stats['avg_compression_ratio'], 1 )  : 0;
		}

		return $stats;
	}

	/**
	 * Delete compressed files for a post
	 *
	 * @since 1.8.0
	 * @param int $post_id Post ID.
	 * @return bool Success status.
	 */
	public static function delete_compressed_files( $post_id ) {
		$paths = self::get_upload_paths( $post_id );

		// Delete files
		$deleted = true;
		if ( file_exists( $paths['original'] ) ) {
			$deleted = $deleted && unlink( $paths['original'] );
		}
		if ( file_exists( $paths['compressed'] ) ) {
			$deleted = $deleted && unlink( $paths['compressed'] );
		}

		// Delete directory if empty
		if ( is_dir( $paths['post_dir'] ) && count( scandir( $paths['post_dir'] ) ) === 2 ) {
			rmdir( $paths['post_dir'] );
		}

		// Delete from database
		AR_TRY_ON_Compression_DB::delete_compression_log( $post_id );

		return $deleted;
	}

	/**
	 * Cleanup on post deletion
	 *
	 * @since 1.8.0
	 * @param int $post_id Post ID.
	 */
	public static function cleanup_on_post_delete( $post_id ) {
		// Only cleanup for AR-enabled post types
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return;
		}

		self::delete_compressed_files( $post_id );
	}

	/**
	 * Check if Pro version is active
	 *
	 * @since 1.8.0
	 * @return bool Whether Pro is active.
	 */
	public static function is_pro_active() {
		return AR_TRY_ON_Helper::is_pro_active();
	}

	/**
	 * Get list of compressed models (for management UI)
	 *
	 * @since 1.8.0
	 * @param array $args Query arguments.
	 * @return array Compressed models list.
	 */
	public static function get_compressed_models( $args = array() ) {
		$logs = AR_TRY_ON_Compression_DB::get_all_compression_logs( $args );

		// Enrich with post data
		foreach ( $logs as &$log ) {
			$post = get_post( $log['post_id'] );
			if ( $post ) {
				$log['post_title'] = $post->post_title;
				$log['post_url']   = get_edit_post_link( $log['post_id'] );
			}

			// Format sizes
			$log['original_size_formatted']   = size_format( $log['original_size'], 2 );
			$log['compressed_size_formatted'] = size_format( $log['compressed_size'], 2 );
			$log['saved_space']               = $log['original_size'] - $log['compressed_size'];
			$log['saved_space_formatted']     = size_format( $log['saved_space'], 2 );
			$log['compression_ratio']         = isset( $stats['compression_ratio'] )  ? round( (float) $stats['compression_ratio'], 1 )  : 0;
		}

		return $logs;
	}
}
