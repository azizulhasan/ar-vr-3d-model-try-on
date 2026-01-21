<?php
namespace AR_TRY_ON;
/**
 * AR Try On - Format Converter Handler
 *
 * Converts FBX/OBJ files to GLB format using Node.js.
 * Pro feature only.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      1.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Format_Converter
 */
class AR_TRY_ON_Format_Converter {

	/**
	 * Path to Node.js conversion script
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
	 * Supported input formats
	 *
	 * @var array
	 */
	private static $supported_formats = array( 'fbx', 'obj', 'gltf', 'glb' );

	/**
	 * Initialize format converter
	 *
	 * @since 1.8.0
	 */
	public static function init() {
		self::$script_path = plugin_dir_path( dirname( __FILE__ ) ) . 'includes/compression/format-converter.js';
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
	 * Check if format conversion is available
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
			$checks['error'] = __( 'Node.js not found. Please install Node.js to enable format conversion.', 'ar-vr-3d-model-try-on' );
			return $checks;
		}

		// Check script exists
		if ( file_exists( self::$script_path ) ) {
			$checks['script_exists'] = true;
		} else {
			$checks['error'] = sprintf(
				__( 'Conversion script not found: %s', 'ar-vr-3d-model-try-on' ),
				self::$script_path
			);
			return $checks;
		}

		// Check dependencies
		$node_modules = plugin_dir_path( dirname( __FILE__ ) ) . 'node_modules';

		if ( is_dir( $node_modules ) ) {
			$checks['dependencies_ok'] = true;
		} else {
			$checks['error'] = __( 'Node.js dependencies not installed. Run "npm install" in the plugin directory.', 'ar-vr-3d-model-try-on' );
			return $checks;
		}

		return $checks;
	}

	/**
	 * Check if a format is supported
	 *
	 * @since 1.8.0
	 * @param string $format File format (without dot).
	 * @return bool Whether format is supported.
	 */
	public static function is_format_supported( $format ) {
		return in_array( strtolower( $format ), self::$supported_formats, true );
	}

	/**
	 * Get supported formats
	 *
	 * @since 1.8.0
	 * @return array Supported formats.
	 */
	public static function get_supported_formats() {
		return self::$supported_formats;
	}

	/**
	 * Convert a 3D model file to GLB format
	 *
	 * @since 1.8.0
	 * @param string $input_file  Input file path.
	 * @param string $output_file Output file path (optional, auto-generated if not provided).
	 * @param array  $options     Conversion options.
	 * @return array|WP_Error Conversion result or error.
	 */
	public static function convert( $input_file, $output_file = null, $options = array() ) {
		// Check if Pro is active
		if ( ! AR_TRY_ON_Compression::is_pro_active() ) {
			return new \WP_Error( 'pro_only', __( 'Format conversion is a Pro feature.', 'ar-vr-3d-model-try-on' ) );
		}

		// Check if available
		$availability = self::is_available();
		if ( ! empty( $availability['error'] ) ) {
			return new \WP_Error( 'conversion_unavailable', $availability['error'] );
		}

		// Validate input file
		if ( ! file_exists( $input_file ) ) {
			return new \WP_Error( 'input_not_found', __( 'Input file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		// Get input format
		$input_ext = pathinfo( $input_file, PATHINFO_EXTENSION );
		$input_format = strtolower( $input_ext );

		// Check if format is supported
		if ( ! self::is_format_supported( $input_format ) ) {
			return new \WP_Error(
				'unsupported_format',
				sprintf(
					__( 'Unsupported input format: %s. Supported formats: %s', 'ar-vr-3d-model-try-on' ),
					$input_format,
					implode( ', ', self::$supported_formats )
				)
			);
		}

		// If already GLB, no conversion needed
		if ( $input_format === 'glb' && empty( $output_file ) ) {
			return array(
				'success'         => true,
				'originalFormat'  => 'glb',
				'originalSize'    => filesize( $input_file ),
				'convertedSize'   => filesize( $input_file ),
				'conversionTime'  => 0,
				'outputFile'      => $input_file,
				'conversion_needed' => false,
			);
		}

		// Auto-generate output file if not provided
		if ( empty( $output_file ) ) {
			$output_file = preg_replace( '/\.[^.]+$/', '.glb', $input_file );
		}

		// Ensure output directory exists
		$output_dir = dirname( $output_file );
		if ( ! is_dir( $output_dir ) ) {
			wp_mkdir_p( $output_dir );
		}

		// Build command
		$options_json = json_encode( $options );
		$command = sprintf(
			'%s %s %s %s %s 2>&1',
			escapeshellarg( self::$node_path ),
			escapeshellarg( self::$script_path ),
			escapeshellarg( $input_file ),
			escapeshellarg( $output_file ),
			escapeshellarg( $options_json )
		);

		// Execute conversion
		$output     = array();
		$return_var = 0;
		exec( $command, $output, $return_var );

		// Parse output
		$result = self::parse_conversion_output( implode( "\n", $output ) );

		// Log for debugging
		self::log_conversion(
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
				: __( 'Conversion failed with unknown error.', 'ar-vr-3d-model-try-on' );

			return new \WP_Error( 'conversion_failed', $error_msg );
		}

		// Verify output file exists
		if ( ! file_exists( $output_file ) ) {
			return new \WP_Error( 'output_missing', __( 'Conversion completed but output file not found.', 'ar-vr-3d-model-try-on' ) );
		}

		$result['conversion_needed'] = true;
		return $result;
	}

	/**
	 * Parse conversion output from Node.js script
	 *
	 * @since 1.8.0
	 * @param string $output Raw output from script.
	 * @return array Parsed result.
	 */
	private static function parse_conversion_output( $output ) {
		$default_result = array(
			'success'         => false,
			'originalFormat'  => null,
			'originalSize'    => 0,
			'convertedSize'   => 0,
			'conversionTime'  => 0,
			'outputFile'      => null,
			'error'           => null,
		);

		// Extract JSON result between markers
		if ( preg_match( '/--- RESULT ---\s*(\{.*?\})\s*--- END RESULT ---/s', $output, $matches ) ) {
			$json_result = json_decode( $matches[1], true );

			if ( $json_result ) {
				return wp_parse_args( $json_result, $default_result );
			}
		}

		// Failed to parse - return error
		$default_result['error'] = __( 'Failed to parse conversion result.', 'ar-vr-3d-model-try-on' );
		return $default_result;
	}

	/**
	 * Log conversion attempt for debugging
	 *
	 * @since 1.8.0
	 * @param array $data Log data.
	 */
	private static function log_conversion( $data ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( '[AR Try On Format Conversion] ' . print_r( $data, true ) );
		}
	}

	/**
	 * Get system requirements status for format conversion
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
				'name'     => __( 'Format Conversion Script', 'ar-vr-3d-model-try-on' ),
				'required' => true,
				'status'   => $availability['script_exists'],
				'details'  => $availability['script_exists']
					? __( 'Available', 'ar-vr-3d-model-try-on' )
					: __( 'Script file missing', 'ar-vr-3d-model-try-on' ),
			),
			array(
				'name'     => __( 'Node.js Dependencies (obj2gltf)', 'ar-vr-3d-model-try-on' ),
				'required' => true,
				'status'   => $availability['dependencies_ok'],
				'details'  => $availability['dependencies_ok']
					? __( 'Installed', 'ar-vr-3d-model-try-on' )
					: __( 'Run "npm install" in plugin directory', 'ar-vr-3d-model-try-on' ),
			),
			array(
				'name'     => __( 'FBX2glTF (for FBX conversion)', 'ar-vr-3d-model-try-on' ),
				'required' => false,
				'status'   => self::check_fbx2gltf_available(),
				'details'  => self::check_fbx2gltf_available()
					? __( 'Available', 'ar-vr-3d-model-try-on' )
					: __( 'Optional. Download from: https://github.com/facebookincubator/FBX2glTF', 'ar-vr-3d-model-try-on' ),
			),
		);

		return $requirements;
	}

	/**
	 * Check if FBX2glTF tool is available
	 *
	 * @since 1.8.0
	 * @return bool Whether FBX2glTF is available.
	 */
	private static function check_fbx2gltf_available() {
		$output = array();
		$return_var = 0;
		@exec( 'FBX2glTF --version 2>&1', $output, $return_var );

		return $return_var === 0;
	}

	/**
	 * Convert and optionally compress a model file
	 *
	 * @since 1.8.0
	 * @param string $input_file     Input file path.
	 * @param string $output_file    Output file path (optional).
	 * @param bool   $compress       Whether to compress after conversion.
	 * @param int    $quality        Compression quality (1-100).
	 * @return array|WP_Error Result or error.
	 */
	public static function convert_and_compress( $input_file, $output_file = null, $compress = true, $quality = 85 ) {
		// First, convert to GLB
		$conversion_result = self::convert( $input_file, $output_file );

		if ( is_wp_error( $conversion_result ) ) {
			return $conversion_result;
		}

		// If compression is requested
		if ( $compress && $conversion_result['conversion_needed'] ) {
			$converted_file = $conversion_result['outputFile'];
			$compressed_file = preg_replace( '/\.glb$/', '_compressed.glb', $converted_file );

			// Use server-side compression
			$compression_result = AR_TRY_ON_Compression::compress_server_side(
				$converted_file,
				$compressed_file,
				$quality
			);

			if ( is_wp_error( $compression_result ) ) {
				// Compression failed, but conversion succeeded
				$conversion_result['compression_failed'] = true;
				$conversion_result['compression_error']  = $compression_result->get_error_message();
				return $conversion_result;
			}

			// Merge results
			$conversion_result['compressed'] = true;
			$conversion_result['compressed_file'] = $compressed_file;
			$conversion_result['compressed_size'] = $compression_result['compressed_size'];
			$conversion_result['compression_ratio'] = $compression_result['compression_ratio'];
			$conversion_result['total_time'] = $conversion_result['conversionTime'] + $compression_result['compression_time'];
		}

		return $conversion_result;
	}
}

// Initialize
AR_TRY_ON_Format_Converter::init();
