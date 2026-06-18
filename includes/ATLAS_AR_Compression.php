<?php
namespace ATLAS_AR;
/**
 * AR Try On - 3D Model Compression Handler
 *
 * Handles client-side compression of 3D models using Draco geometry
 * compression. Free supports GLB and GLTF files up to MAX_CLIENT_SIDE_SIZE
 * with no count limit; the @gltf-transform bundle runs entirely in the
 * browser via admin/js/ar-compression-client.js.
 *
 * Pro adds (in the separate ar-vr-3d-model-try-on-pro plugin):
 *  - Server-side compression for files larger than the client-side cap.
 *  - FBX / OBJ → GLB format conversion.
 *  - Background queue + cron processing.
 *  - Bulk-compress-all-models tooling.
 *  - Multi-format upload support (FBX, OBJ, USDZ).
 * None of that Pro code lives in this file or in the Free zip.
 *
 * @package    ATLAS_AR
 * @subpackage ATLAS_AR/includes
 * @since      1.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class ATLAS_AR_Compression
 */
class ATLAS_AR_Compression {

	/**
	 * Hard ceiling for client-side compression in bytes (10 MB).
	 *
	 * This is a technical guard, NOT a Free-tier gate. Files larger
	 * than this would lock the browser tab when run through the
	 * gltf-transform pipeline. Free refuses such files with the
	 * message "File size is too big — can't be compressed." (no Pro
	 * pitch at point-of-failure — see plan/AR-61.1-yoast-pattern-split.md).
	 *
	 * @var int
	 */
	const MAX_CLIENT_SIDE_SIZE = 10485760; // 10 MB

	/**
	 * Upload directory for original and compressed files
	 *
	 * @var string
	 */
	private static $upload_dir = 'atlas_ar';

	/**
	 * Initialize compression hooks and filters.
	 *
	 * Free always runs its own setup (log table, settings, post-delete
	 * cleanup) — there is no Pro short-circuit here. The Pro plugin
	 * boots independently via its own bootstrap and ADDS to this
	 * surface through filters; it never replaces Free's compression
	 * code wholesale (AR-61 §1.1 Yoast-pattern split).
	 *
	 * @since 1.8.0
	 */
	public static function init() {
		// Initialize database tables (log table only — queue is Pro).
		ATLAS_AR_Compression_DB::init();

		// Register settings.
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );

		// Handle post deletion (cleanup files).
		add_action( 'before_delete_post', array( __CLASS__, 'cleanup_on_post_delete' ) );
	}

	// Cron schedules and cleanup moved to Pro plugin (ATLAS_AR_Pro_Compression)

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
	 * Compression-limit status used by the dashboard + metabox UI.
	 *
	 * Free no longer enforces any count cap — there is no
	 * FREE_USER_LIMIT and no "you've reached your free limit" path
	 * (removed in AR-61 §1.1, plan/AR-61.1-yoast-pattern-split.md).
	 * The method is kept so the existing `/compression/can-compress`
	 * REST consumer in the React UI keeps getting the shape it
	 * expects; the values just say "unlimited, never at limit".
	 *
	 * @since   1.8.0
	 * @updated AR-61 §1.1 — count cap removed.
	 * @return  array Compression-limit status.
	 */
	public static function can_user_compress() {
		return array(
			'can_compress' => true,
			'limit'        => -1, // Unlimited.
			'used'         => -1,
			'remaining'    => -1,
			'at_limit'     => false,
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
	 * Determine which compression method should run for the given file.
	 *
	 * Free supports only client-side compression (gltf-transform in
	 * the browser). The companion Pro plugin registers a 'server'
	 * method when it is active by filtering `atlas_ar_compression_methods`
	 * and handles the actual server-side workflow itself.
	 *
	 * @since   1.8.0
	 * @updated AR-61 §1.1 — Free no longer hardcodes the Pro server path.
	 * @param   string $file_path File path.
	 * @return  string Method identifier — defaults to 'client'.
	 */
	public static function get_compression_method( $file_path ) {
		$file_size = file_exists( $file_path ) ? filesize( $file_path ) : 0;

		/**
		 * Filter: atlas_ar_compression_method
		 *
		 * Pro hooks here to upgrade large-file compression to its
		 * server-side path. Free ignores the second arg and always
		 * returns 'client'.
		 *
		 * @param string $method    Default method ('client').
		 * @param int    $file_size File size in bytes.
		 * @param string $file_path Absolute path to the file.
		 */
		return (string) apply_filters( 'atlas_ar_compression_method', 'client', $file_size, $file_path );
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

        $source_file = ATLAS_AR_Helper::get_file_path_from_url( $source_url );

		// Check if file exists.
		if ( ! $source_file ) {
			return new \WP_Error( 'file_not_found', __( 'Source file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Get paths.
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
		$log_id = ATLAS_AR_Compression_DB::log_compression(
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

	/*
	 * Server-side compression, FBX/OBJ → GLB conversion, background
	 * compression queue, and queue processor used to live here as
	 * pro_only-error stubs that delegated to the Pro plugin. The wp.org
	 * Plugins Team flagged that pattern as Guideline 5 trialware in the
	 * AR-61 closure ("locked feature present in the code in case the user
	 * upgrades, even if it never runs in Free, is still not allowed"), so
	 * these methods now live ONLY in the Pro plugin —
	 * ATLAS_AR_Pro_Compression::compress_server_side(),
	 * ATLAS_AR_Pro_Format_Converter::convert_format(),
	 * ATLAS_AR_Pro_Compression::add_to_queue(),
	 * ATLAS_AR_Pro_Compression::process_queue().
	 */

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
		$log             = ATLAS_AR_Compression_DB::get_compression_log( $log_id, 'id' );

		if ( ! $log ) {
			return false;
		}

		$compression_ratio = ( 1 - ( $compressed_size / $log['original_size'] ) ) * 100;

		return ATLAS_AR_Compression_DB::update_compression_log(
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
		return ATLAS_AR_Compression_DB::update_compression_log(
			$log_id,
			array(
				'status'        => 'failed',
				'error_message' => $error_message,
			)
		);
	}

	/**
	 * Get compression statistics
	 *
	 * @since 1.8.0
	 * @return array Statistics.
	 */
	public static function get_stats() {
		$stats = ATLAS_AR_Compression_DB::get_compression_stats();

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

		// Delete files (use wp_delete_file() per WordPress.org guidelines).
		$deleted = true;
		if ( file_exists( $paths['original'] ) ) {
			wp_delete_file( $paths['original'] );
			$deleted = $deleted && ! file_exists( $paths['original'] );
		}
		if ( file_exists( $paths['compressed'] ) ) {
			wp_delete_file( $paths['compressed'] );
			$deleted = $deleted && ! file_exists( $paths['compressed'] );
		}

		// Delete directory if empty (WP_Filesystem handles rmdir under the hood).
		if ( is_dir( $paths['post_dir'] ) && count( scandir( $paths['post_dir'] ) ) === 2 ) {
			global $wp_filesystem;
			if ( empty( $wp_filesystem ) ) {
				require_once ABSPATH . 'wp-admin/includes/file.php';
				WP_Filesystem();
			}
			if ( ! empty( $wp_filesystem ) ) {
				$wp_filesystem->rmdir( $paths['post_dir'] );
			}
		}

		// Delete from database
		ATLAS_AR_Compression_DB::delete_compression_log( $post_id );

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
		if ( ! ATLAS_AR_Helper::is_ar_supported_post_type() ) {
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
		return ATLAS_AR_Helper::is_pro_active();
	}

	/**
	 * Get list of compressed models (for management UI)
	 *
	 * @since 1.8.0
	 * @param array $args Query arguments.
	 * @return array Compressed models list.
	 */
	public static function get_compressed_models( $args = array() ) {
		$logs = ATLAS_AR_Compression_DB::get_all_compression_logs( $args );

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
