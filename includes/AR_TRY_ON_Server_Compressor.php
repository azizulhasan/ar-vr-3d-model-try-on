<?php
namespace AR_TRY_ON;
/**
 * AR Try On - Server-Side Compression Handler
 *
 * Executes Node.js compression script for large files (>5MB).
 * Pro feature only.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      1.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Server_Compressor
 */
class AR_TRY_ON_Server_Compressor {

	/**
	 * Path to Node.js compression script
	 *
	 * @var string
	 */
	private static $script_path;

	/**
	 * Node.js executable path
	 *
	 * @var string
	 */
	private static $node_path;

	/**
	 * Initialize server compressor
	 *
	 * @since 1.8.0
	 */
	public static function init() {
		self::$script_path = plugin_dir_path( dirname( __FILE__ ) ) . 'includes/compression/server-compress.js';
		self::$node_path   = self::detect_node_path();
	}

	/**
	 * Detect Node.js executable path
	 *
	 * @since 1.8.0
	 * @return string|null Node path or null if not found.
	 */
	private static function detect_node_path() {
		$possible_paths = array(
			'node',           // Standard PATH lookup
			'/usr/bin/node',
			'/usr/local/bin/node',
			'C:\\Program Files\\nodejs\\node.exe',
			'C:\\Program Files (x86)\\nodejs\\node.exe',
		);

		foreach ( $possible_paths as $path ) {
			$output = array();
			$return_var = 0;
			@exec( escapeshellcmd( $path ) . ' --version 2>&1', $output, $return_var );

			if ( $return_var === 0 ) {
				return $path;
			}
		}

		return null;
	}

	/**
	 * Check if server-side compression is available
	 *
	 * @since 1.8.0
	 * @return array Status details.
	 */
	public static function is_available() {
		$checks = array(
			'node_installed'  => false,
			'script_exists'   => false,
			'dependencies_ok' => false,
			'node_path'       => null,
			'error'           => null,
		);

		// Check Node.js
		if ( empty( self::$node_path ) ) {
			self::init();
		}

		if ( self::$node_path ) {
			$checks['node_installed'] = true;
			$checks['node_path']      = self::$node_path;
		} else {
			$checks['error'] = __( 'Node.js not found. Please install Node.js to enable server-side compression.', 'ar-vr-3d-model-try-on' );
			return $checks;
		}

		// Check script exists
		if ( file_exists( self::$script_path ) ) {
			$checks['script_exists'] = true;
		} else {
			$checks['error'] = sprintf(
				__( 'Compression script not found: %s', 'ar-vr-3d-model-try-on' ),
				self::$script_path
			);
			return $checks;
		}

		// Check dependencies
		$package_json = plugin_dir_path( dirname( __FILE__ ) ) . 'package.json';
		$node_modules = plugin_dir_path( dirname( __FILE__ ) ) . 'node_modules';

		if ( file_exists( $package_json ) && is_dir( $node_modules ) ) {
			$checks['dependencies_ok'] = true;
		} else {
			$checks['error'] = __( 'Node.js dependencies not installed. Run "npm install" in the plugin directory.', 'ar-vr-3d-model-try-on' );
			return $checks;
		}

		return $checks;
	}

	/**
	 * Compress a 3D model file using Node.js
	 *
	 * @since 1.8.0
	 * @param string $input_file  Input file path.
	 * @param string $output_file Output file path.
	 * @param int    $quality     Compression quality (0-100).
	 * @return array|WP_Error Compression result or error.
	 */
	public static function compress( $input_file, $output_file, $quality = 85 ) {
		// Check if available
		$availability = self::is_available();
		if ( ! empty( $availability['error'] ) ) {
			return new \WP_Error( 'compression_unavailable', $availability['error'] );
		}

		// Validate input file
		if ( ! file_exists( $input_file ) ) {
			return new \WP_Error( 'input_not_found', __( 'Input file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Ensure output directory exists
		$output_dir = dirname( $output_file );
		if ( ! is_dir( $output_dir ) ) {
			wp_mkdir_p( $output_dir );
		}

		// Build command
		$command = sprintf(
			'%s %s %s %s %d 2>&1',
			escapeshellarg( self::$node_path ),
			escapeshellarg( self::$script_path ),
			escapeshellarg( $input_file ),
			escapeshellarg( $output_file ),
			intval( $quality )
		);

		// Execute compression
		$output     = array();
		$return_var = 0;
		exec( $command, $output, $return_var );

		// Parse output
		$result = self::parse_compression_output( implode( "\n", $output ) );

		// Log for debugging
		self::log_compression(
			array(
				'command'    => $command,
				'return_var' => $return_var,
				'output'     => $output,
				'result'     => $result,
			)
		);

		// Check for errors
		if ( $return_var !== 0 || ! $result['success'] ) {
			$error_msg = ! empty( $result['error'] )
				? $result['error']
				: __( 'Compression failed with unknown error.', 'ar-vr-3d-model-try-on' );

			return new \WP_Error( 'compression_failed', $error_msg );
		}

		// Verify output file exists
		if ( ! file_exists( $output_file ) ) {
			return new \WP_Error( 'output_missing', __( 'Compression completed but output file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		return $result;
	}

	/**
	 * Parse compression output from Node.js script
	 *
	 * @since 1.8.0
	 * @param string $output Raw output from script.
	 * @return array Parsed result.
	 */
	private static function parse_compression_output( $output ) {
		$default_result = array(
			'success'           => false,
			'originalSize'      => 0,
			'compressedSize'    => 0,
			'compressionRatio'  => 0,
			'compressionTime'   => 0,
			'outputFile'        => null,
			'error'             => null,
		);

		// Extract JSON result between markers
		if ( preg_match( '/--- RESULT ---\s*(\{.*?\})\s*--- END RESULT ---/s', $output, $matches ) ) {
			$json_result = json_decode( $matches[1], true );

			if ( $json_result ) {
				return wp_parse_args( $json_result, $default_result );
			}
		}

		// Failed to parse - return error
		$default_result['error'] = __( 'Failed to parse compression result.', 'ar-vr-3d-model-try-on' );
		return $default_result;
	}

	/**
	 * Log compression attempt for debugging
	 *
	 * @since 1.8.0
	 * @param array $data Log data.
	 */
	private static function log_compression( $data ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( '[AR Try On Server Compression] ' . print_r( $data, true ) );
		}
	}

	/**
	 * Get system requirements status
	 *
	 * @since 1.8.0
	 * @return array Requirements check results.
	 */
	public static function get_system_requirements() {
		$availability = self::is_available();

		$requirements = array(
			array(
				'name'     => __( 'Node.js', 'ar-vr-3d-model-try-on' ),
				'required' => true,
				'status'   => $availability['node_installed'],
				'details'  => $availability['node_installed']
					? sprintf( __( 'Installed at: %s', 'ar-vr-3d-model-try-on' ), $availability['node_path'] )
					: __( 'Not found. Install Node.js from nodejs.org', 'ar-vr-3d-model-try-on' ),
			),
			array(
				'name'     => __( 'Compression Script', 'ar-vr-3d-model-try-on' ),
				'required' => true,
				'status'   => $availability['script_exists'],
				'details'  => $availability['script_exists']
					? __( 'Available', 'ar-vr-3d-model-try-on' )
					: __( 'Script file missing', 'ar-vr-3d-model-try-on' ),
			),
			array(
				'name'     => __( 'Node.js Dependencies', 'ar-vr-3d-model-try-on' ),
				'required' => true,
				'status'   => $availability['dependencies_ok'],
				'details'  => $availability['dependencies_ok']
					? __( 'Installed', 'ar-vr-3d-model-try-on' )
					: __( 'Run "npm install" in plugin directory', 'ar-vr-3d-model-try-on' ),
			),
		);

		return $requirements;
	}

	/**
	 * Test compression with a sample file
	 *
	 * @since 1.8.0
	 * @return array|WP_Error Test result.
	 */
	public static function test_compression() {
		$availability = self::is_available();
		if ( ! empty( $availability['error'] ) ) {
			return new \WP_Error( 'test_failed', $availability['error'] );
		}

		// Create a temporary test file (simple GLB)
		$temp_dir  = wp_upload_dir()['basedir'] . '/ar_try_on_test';
		wp_mkdir_p( $temp_dir );

		$test_input  = $temp_dir . '/test_input.glb';
		$test_output = $temp_dir . '/test_output.glb';

		// Create minimal GLB file for testing
		$minimal_glb = self::create_minimal_glb();
		file_put_contents( $test_input, $minimal_glb );

		// Run compression
		$result = self::compress( $test_input, $test_output, 85 );

		// Cleanup
		@unlink( $test_input );
		@unlink( $test_output );
		@rmdir( $temp_dir );

		return $result;
	}

	/**
	 * Create a minimal valid GLB file for testing
	 *
	 * @since 1.8.0
	 * @return string Binary GLB data.
	 */
	private static function create_minimal_glb() {
		// Minimal glTF JSON
		$gltf_json = json_encode(
			array(
				'asset'  => array( 'version' => '2.0' ),
				'scenes' => array( array( 'nodes' => array( 0 ) ) ),
				'nodes'  => array( array( 'name' => 'Test' ) ),
			)
		);

		// Pad JSON to multiple of 4
		$json_length        = strlen( $gltf_json );
		$json_padding       = ( 4 - ( $json_length % 4 ) ) % 4;
		$json_chunk_length  = $json_length + $json_padding;
		$padded_json        = $gltf_json . str_repeat( ' ', $json_padding );

		// GLB header
		$magic   = 0x46546C67; // 'glTF'
		$version = 2;
		$length  = 12 + 8 + $json_chunk_length; // header + chunk header + chunk data

		// Build GLB
		$glb = pack( 'VVV', $magic, $version, $length ); // Header
		$glb .= pack( 'VV', $json_chunk_length, 0x4E4F534A ); // JSON chunk header ('JSON')
		$glb .= $padded_json; // JSON chunk data

		return $glb;
	}
}

// Initialize
AR_TRY_ON_Server_Compressor::init();
