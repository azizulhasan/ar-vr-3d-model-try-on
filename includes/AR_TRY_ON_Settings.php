<?php
/**
 * AR-116: the plugin's settings — one option, `atlas_ar_settings`, described by a schema.
 *
 * Every field has a type, a default and (where it matters) its allowed values, so saving cleans
 * each value by its type and reading always returns a complete, valid set. The groups follow the
 * dashboard pages (Placement, Appearance, Try-on, Settings); the names follow the viewer SDK's
 * options where a setting reaches the shop page.
 *
 * Pro adds its own fields with the `atlas_ar_settings_schema` filter (Pro adds code; Free never
 * holds Pro-only fields).
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Settings {

	const OPTION  = 'atlas_ar_settings';
	const VERSION = 1;

	/** @var array|null Cached, cleaned settings for this request. */
	private static $cache = null;

	/**
	 * The fields, grouped. Each field: type, default, and per type: options (enum), min/max
	 * (number), max (text length).
	 *
	 * @return array
	 */
	public static function schema() {
		$schema = array(
			'placement'  => array(
				'mode'            => array( 'type' => 'enum', 'default' => 'gallery', 'options' => array( 'gallery', 'gallery3d', 'button', 'tab', 'slide' ) ),
				'button_position' => array( 'type' => 'enum', 'default' => 'after_cart', 'options' => array( 'after_cart', 'before_cart', 'after_summary', 'under_images' ) ),
				'product_tab'     => array( 'type' => 'bool', 'default' => false ),
				'qr'              => array( 'type' => 'bool', 'default' => true ),
			),
			'look'       => array(
				'background'      => array( 'type' => 'color', 'default' => '#ffffff' ),
				'lighting'        => array( 'type' => 'enum', 'default' => 'neutral', 'options' => array( 'neutral', 'bright', 'custom' ) ),
				'environment_url' => array( 'type' => 'url', 'default' => '' ),
				'exposure'        => array( 'type' => 'number', 'default' => 1, 'min' => 0.5, 'max' => 2 ),
				'shadow'          => array( 'type' => 'number', 'default' => 1, 'min' => 0, 'max' => 2 ),
				'auto_rotate'     => array( 'type' => 'bool', 'default' => true ),
				'zoom'            => array( 'type' => 'bool', 'default' => true ),
				'ar_button'       => array( 'type' => 'enum', 'default' => 'custom', 'options' => array( 'default', 'custom' ) ),
				'ar_text'         => array( 'type' => 'text', 'default' => __( 'View in your room', 'ar-vr-3d-model-try-on' ), 'max' => 60 ),
				'ar_color'        => array( 'type' => 'color', 'default' => '#0e6b5c' ),
				'load'            => array( 'type' => 'enum', 'default' => 'scroll', 'options' => array( 'scroll', 'click' ) ),
			),
			'tryon'      => array(
				'enabled'  => array( 'type' => 'bool', 'default' => true ),
				'label'    => array( 'type' => 'text', 'default' => __( 'Try it on', 'ar-vr-3d-model-try-on' ), 'max' => 60 ),
				'consent'  => array( 'type' => 'textarea', 'default' => __( 'To try this on, allow your camera. The picture stays on your device: nothing is recorded or sent.', 'ar-vr-3d-model-try-on' ), 'max' => 500 ),
				'snapshot' => array( 'type' => 'bool', 'default' => true ),
				'tracker'  => array( 'type' => 'enum', 'default' => 'cdn', 'options' => array( 'cdn', 'self' ) ),
			),
			'general'    => array(
				'post_types'    => array( 'type' => 'post_types', 'default' => array( 'product' ) ),
				'auto_optimise' => array( 'type' => 'bool', 'default' => true ),
				'telemetry'     => array( 'type' => 'bool', 'default' => false ),
				'remove_data'   => array( 'type' => 'bool', 'default' => false ),
				'wizard_done'   => array( 'type' => 'bool', 'default' => false ),
				'checklist_off' => array( 'type' => 'bool', 'default' => false ),
				'cloud_tip_off' => array( 'type' => 'bool', 'default' => false ),
			),
		);

		/**
		 * Add setting fields (AtlasAR Pro adds its own groups or fields).
		 *
		 * @param array $schema Groups of fields: type, default, options / min / max.
		 */
		return (array) apply_filters( 'atlas_ar_settings_schema', $schema );
	}

	/** @return array Every field at its default. */
	public static function defaults() {
		$out = array();
		foreach ( self::schema() as $group => $fields ) {
			foreach ( (array) $fields as $key => $field ) {
				$out[ $group ][ $key ] = isset( $field['default'] ) ? $field['default'] : null;
			}
		}
		return $out;
	}

	/** @return array The saved settings, complete and clean (defaults fill what is missing). */
	public static function all() {
		if ( null === self::$cache ) {
			$saved       = get_option( self::OPTION, array() );
			self::$cache = self::clean( is_array( $saved ) ? $saved : array(), self::defaults() );
		}
		return self::$cache;
	}

	/**
	 * One value by path, e.g. get( 'look.background' ); a whole group with get( 'look' ).
	 *
	 * @param string $path    group or group.key
	 * @param mixed  $default returned when the path does not exist
	 * @return mixed
	 */
	public static function get( $path, $default = null ) {
		$value = self::all();
		foreach ( explode( '.', (string) $path ) as $part ) {
			if ( ! is_array( $value ) || ! array_key_exists( $part, $value ) ) {
				return $default;
			}
			$value = $value[ $part ];
		}
		return $value;
	}

	/**
	 * Save changes. Only known fields are kept; each is cleaned by its type; fields not in $input
	 * keep their saved value.
	 *
	 * @param array $input a partial or full settings array (group => field => value)
	 * @return array the saved settings
	 */
	public static function update( array $input ) {
		$clean = self::clean( $input, self::all() );
		// Autoloaded: the shop pages read these settings on every request.
		update_option( self::OPTION, array( 'version' => self::VERSION ) + $clean, true );
		self::$cache = null;
		return self::all();
	}

	/** Back to the defaults. */
	public static function reset() {
		delete_option( self::OPTION );
		self::$cache = null;
	}

	/**
	 * Clean $input field by field over $base (missing or invalid values keep the $base value).
	 *
	 * @param array $input
	 * @param array $base
	 * @return array
	 */
	private static function clean( array $input, array $base ) {
		$out = array();
		foreach ( self::schema() as $group => $fields ) {
			foreach ( (array) $fields as $key => $field ) {
				$fallback = isset( $base[ $group ][ $key ] ) ? $base[ $group ][ $key ] : ( isset( $field['default'] ) ? $field['default'] : null );
				if ( isset( $input[ $group ] ) && is_array( $input[ $group ] ) && array_key_exists( $key, $input[ $group ] ) ) {
					$out[ $group ][ $key ] = self::clean_field( $input[ $group ][ $key ], $field, $fallback );
				} else {
					$out[ $group ][ $key ] = $fallback;
				}
			}
		}
		return $out;
	}

	/**
	 * Clean one value by its schema field (also used for product data, AR_TRY_ON_Product).
	 *
	 * @param mixed $value
	 * @param array $field type, options / min / max
	 * @param mixed $fallback returned for a missing or invalid value
	 * @return mixed
	 */
	public static function clean_field( $value, array $field, $fallback ) {
		switch ( isset( $field['type'] ) ? $field['type'] : 'text' ) {
			case 'bool':
				return (bool) filter_var( $value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
			case 'enum':
				$value = is_scalar( $value ) ? (string) $value : '';
				return in_array( $value, (array) $field['options'], true ) ? $value : $fallback;
			case 'number':
				if ( ! is_numeric( $value ) ) {
					return $fallback;
				}
				$n = (float) $value;
				return max( (float) $field['min'], min( (float) $field['max'], $n ) );
			case 'color':
				$color = is_string( $value ) ? sanitize_hex_color( $value ) : null;
				return $color ? $color : $fallback;
			case 'url':
				return is_string( $value ) ? esc_url_raw( $value, array( 'http', 'https' ) ) : $fallback;
			case 'textarea':
				$max = isset( $field['max'] ) ? (int) $field['max'] : 500;
				return is_scalar( $value ) ? mb_substr( sanitize_textarea_field( (string) $value ), 0, $max ) : $fallback;
			case 'post_types':
				// Not limited to the registered types: a type whose plugin is off for a moment
				// (WooCommerce's `product`) must not be dropped on save. Unknown types never match a post.
				$list = array_filter( array_map( 'sanitize_key', (array) $value ) );
				$list = array_slice( array_values( array_unique( $list ) ), 0, 30 );
				return $list ? $list : $fallback;
			case 'text':
			default:
				$max = isset( $field['max'] ) ? (int) $field['max'] : 200;
				return is_scalar( $value ) ? mb_substr( sanitize_text_field( (string) $value ), 0, $max ) : $fallback;
		}
	}
}
