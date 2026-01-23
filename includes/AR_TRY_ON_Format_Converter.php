<?php
namespace AR_TRY_ON;
/**
 * AR Try On - Format Converter Handler
 *
 * Converts FBX/OBJ files to GLB format using external API.
 * Pro feature only. WordPress.org compliant (no exec()).
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
	 * Supported input formats for conversion
	 *
	 * @var array
	 */
	private static $supported_input_formats = array( 'fbx', 'obj' );

	/**
	 * Supported output format
	 *
	 * @var string
	 */
	private static $output_format = 'glb';

	/**
	 * Initialize format converter
	 *
	 * @since 1.8.0
	 */
	public static function init() {
		// No initialization needed for API-based conversion
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
	 * Get supported input formats
	 *
	 * @since 1.8.0
	 * @return array Supported input formats.
	 */
	public static function get_supported_input_formats() {
		return self::$supported_input_formats;
	}

	/**
	 * Get supported output format
	 *
	 * @since 1.8.0
	 * @return string Supported output format.
	 */
	public static function get_output_format() {
		return self::$output_format;
	}

	/**
	 * Check if a format is supported for conversion
	 *
	 * @since 1.8.0
	 * @param string $format File format (without dot).
	 * @return bool Whether format is supported.
	 */
	public static function is_format_supported( $format ) {
		return in_array( strtolower( $format ), self::$supported_input_formats, true );
	}

	/**
	 * Convert model format (FBX/OBJ → GLB) using API-based conversion (Pro only)
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
		if ( ! self::is_format_supported( $input_ext ) ) {
			return new \WP_Error(
				'unsupported_format',
				sprintf(
					__( 'Unsupported input format: %s. Only FBX and OBJ are supported.', 'ar-vr-3d-model-try-on' ),
					$input_ext
				)
			);
		}

		// Get API URL
		$api_url = defined( 'ATLAS_AR_COMPRESSION_API_URL' ) ? ATLAS_AR_COMPRESSION_API_URL : '';
		if ( empty( $api_url ) ) {
			return new \WP_Error( 'api_not_configured', __( 'API URL is not configured.', 'ar-vr-3d-model-try-on' ) );
		}

		$api_endpoint = trailingslashit( $api_url ) . 'convert-format';

		// Get file URL
		$input_file_url = AR_TRY_ON_Helper::get_file_url_from_path( $input_file );
		if ( ! $input_file_url ) {
			return new \WP_Error( 'url_not_found', __( 'Could not determine file URL.', 'ar-vr-3d-model-try-on' ) );
		}

		// Prepare API request
		$body = array(
			'url'     => $input_file_url,
			'quality' => intval( $quality ),
			'format'  => $input_ext,
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
			$error_message = isset( $result['message'] ) ? $result['message'] : __( 'Format conversion failed.', 'ar-vr-3d-model-try-on' );
			return new \WP_Error( 'conversion_failed', $error_message );
		}

		// Download converted file
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
				sprintf( __( 'Failed to download converted file: %s', 'ar-vr-3d-model-try-on' ), $download_response->get_error_message() )
			);
		}

		// Save converted file
		$converted_data = wp_remote_retrieve_body( $download_response );
		if ( ! file_put_contents( $output_file, $converted_data ) ) {
			return new \WP_Error( 'save_failed', __( 'Failed to save converted file.', 'ar-vr-3d-model-try-on' ) );
		}

		return array(
			'success'          => true,
			'original_size'    => $result['data']['original_size'],
			'converted_size'   => $result['data']['converted_size'],
			'conversion_time'  => $result['data']['conversion_time'],
			'output_file'      => $output_file,
			'output_url'       => AR_TRY_ON_Helper::get_file_url_from_path( $output_file ),
			'format'           => self::$output_format,
		);
	}

	/**
	 * Get supported formats information
	 *
	 * @since 1.8.0
	 * @return array Formats information.
	 */
	public static function get_formats_info() {
		return array(
			'input'  => self::$supported_input_formats,
			'output' => array( self::$output_format ),
			'method' => 'API-based conversion',
		);
	}
}
