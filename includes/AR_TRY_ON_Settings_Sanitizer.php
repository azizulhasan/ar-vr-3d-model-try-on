<?php
namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).
/**
 * AR-85: one sanitizer for the global `ar_try_on_settings` option.
 *
 * Every writer (the dashboard Settings/Integration save, the setup wizard) goes through here:
 *  - A request may set only keys in the schema; every value is checked by type. An invalid value
 *    keeps the stored one (a bad request never wipes a setting).
 *  - Keys the server owns (the demo post) can never be set by a request.
 *  - Keys already stored but not in the schema (older versions, add-ons) are kept untouched, so
 *    existing sites lose nothing on their next save.
 * Pro and add-ons register their own keys with the `atlas_ar_settings_schema` filter.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      2.4.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class AR_TRY_ON_Settings_Sanitizer
 */
class AR_TRY_ON_Settings_Sanitizer {

	/** Longest free-text value (button labels, consent text). */
	const MAX_TEXT = 500;

	/** Keys only the server writes; a request can never set them. */
	const SERVER_OWNED = array( 'ar_try_on_ar_demo' );

	/**
	 * Rule per key: [ type, options ].
	 *  enum      options = allowed string values
	 *  set       options = allowed values; the value is a list (subset, order kept)
	 *  text      options = max length
	 *  color     hex (#abc / #aabbcc / #aabbccdd) or rgb()/rgba()
	 *  int       options = [ min, max ]
	 *  bool      true / false
	 *  url       http(s) URL
	 *  post_types list of registered post type slugs
	 *  headers   list of { key, value } HTTP headers (integration API)
	 *  flag      one-shot action (never stored as true)
	 *
	 * @return array<string, array>
	 */
	public static function schema() {
		$yes_no   = array( 'enum', array( 'yes', 'no' ) );
		$on_off   = array( 'enum', array( 'activate', 'deactivate' ) );
		$schema   = array(
			'ar_try_on_display_button_automatically' => $yes_no,
			'ar_try_on_allowed_post_types'           => array( 'post_types', null ),
			'ar_try_on_wc_hook_position'             => array( 'enum', array( 'product_image', '3d_viewer', '1', '2', '3', '4', '5', '6', '7' ) ),
			'ar_try_on_single_product_tabs'          => $yes_no,
			'ar_try_on_loading_type'                 => array( 'enum', array( 'auto', 'lazy', 'eager' ) ),
			'ar_try_on_reveal_type'                  => array( 'enum', array( 'auto', 'interaction', 'manual' ) ),
			'model_load_strategy'                    => array( 'enum', array( 'auto', 'interaction' ) ),
			'ar_try_on_poster_color'                 => array( 'color', null ),
			'ar_try_on_ar'                           => $on_off,
			'ar_try_on_ar_modes'                     => array( 'set', array( 'webxr', 'scene-viewer', 'quick-look' ) ),
			'ar_try_on_ar_scale'                     => array( 'enum', array( 'auto', 'fixed' ) ),
			'ar_try_on_xr_environment'               => $on_off,
			'ar_try_on_ar_button'                    => $on_off,
			'ar_try_on_ar_button_text'               => array( 'text', 100 ),
			'ar_try_on_ar_button_background_color'   => array( 'color', null ),
			'ar_try_on_ar_button_text_color'         => array( 'color', null ),
			'ar_try_on_enable_qr_code'               => $yes_no,
			'ar_try_on_view_in_ar_label'             => array( 'text', 100 ),
			'ar_try_on_interaction_prompt'           => array( 'enum', array( 'auto', 'when-focused', 'none' ) ),
			'ar_try_on_interaction_prompt_style'     => array( 'enum', array( 'wiggle', 'basic' ) ),
			'ar_try_on_interaction_prompt_threshold' => array( 'int', array( 0, 60000 ) ),
			'ar_try_on_clear_cache'                  => array( 'flag', null ),
			// Integration (Tripo3D / Meshy AI). The key lives in the Authorization header.
			'ar_try_on_exclude_integration_api_name'    => array( 'enum', array( '', 'tripo3d', 'meshy_ai' ) ),
			'ar_try_on_exclude_integration_api_url'     => array( 'url', null ),
			'ar_try_on_exclude_integration_api_headers' => array( 'headers', null ),
			// Virtual try-on.
			'tryon_self_host'                        => array( 'bool', null ),
			'tryon_snapshot'                         => array( 'bool', null ),
			'tryon_button_label'                     => array( 'text', 100 ),
			'tryon_consent_text'                     => array( 'text', self::MAX_TEXT ),
		);
		/**
		 * Filters the schema of the global `ar_try_on_settings` option. Add a key here before a
		 * dashboard can save it; keys not in the schema are ignored on save.
		 *
		 * @since 2.4.0
		 * @param array<string, array> $schema key => [ type, options ] (see the class docs).
		 */
		$filtered = apply_filters( 'atlas_ar_settings_schema', $schema );
		return is_array( $filtered ) ? $filtered : $schema;
	}

	/**
	 * Merge the allowed, valid keys of $input into $current.
	 *
	 * @param array      $input   Values sent by a request.
	 * @param array      $current Stored settings.
	 * @param array|null $only    Limit to these keys (e.g. the wizard's fields).
	 * @return array{0: array, 1: string[]} [ settings, rejected keys ]
	 */
	public static function merge( array $input, array $current, $only = null ) {
		$schema   = self::schema();
		$settings = $current;
		$rejected = array();
		foreach ( $input as $key => $value ) {
			$key = (string) $key;
			if ( in_array( $key, self::SERVER_OWNED, true ) ) {
				continue; // Echoed back by the dashboard; silently ignored.
			}
			if ( ! isset( $schema[ $key ] ) || ( is_array( $only ) && ! in_array( $key, $only, true ) ) ) {
				$rejected[] = $key;
				continue;
			}
			$clean = self::clean( $value, $schema[ $key ] );
			if ( null === $clean ) {
				$rejected[] = $key; // Invalid: keep the stored value.
				continue;
			}
			$settings[ $key ] = $clean;
		}
		return array( $settings, $rejected );
	}

	/**
	 * Clean one value; null when it is not acceptable.
	 *
	 * @param mixed $value Raw value.
	 * @param array $rule  [ type, options ].
	 * @return mixed|null
	 */
	public static function clean( $value, $rule ) {
		list( $type, $options ) = array_pad( (array) $rule, 2, null );
		switch ( $type ) {
			case 'enum':
				return is_scalar( $value ) && in_array( (string) $value, (array) $options, true ) ? (string) $value : null;

			case 'set':
				if ( ! is_array( $value ) ) {
					return null;
				}
				$out = array();
				foreach ( $value as $item ) {
					if ( is_scalar( $item ) && in_array( (string) $item, (array) $options, true ) && ! in_array( (string) $item, $out, true ) ) {
						$out[] = (string) $item;
					}
				}
				return $out;

			case 'text':
				if ( ! is_scalar( $value ) ) {
					return null;
				}
				$max = $options ? (int) $options : self::MAX_TEXT;
				return mb_substr( sanitize_text_field( (string) $value ), 0, $max );

			case 'color':
				return is_string( $value ) ? self::color( $value ) : null;

			case 'int':
				if ( ! is_scalar( $value ) || ! preg_match( '/^\d{1,9}$/', trim( (string) $value ) ) ) {
					return null;
				}
				list( $min, $max ) = (array) $options;
				$n = (int) $value;
				// Stored as a string, as the dashboard and the defaults always did.
				return ( $n >= (int) $min && $n <= (int) $max ) ? (string) $n : null;

			case 'bool':
				if ( is_bool( $value ) ) {
					return $value;
				}
				if ( in_array( $value, array( 1, 0, '1', '0', 'true', 'false' ), true ) ) {
					return in_array( $value, array( 1, '1', 'true' ), true );
				}
				return null;

			case 'flag':
				return ! empty( $value ) && ! is_array( $value ); // Used once by the save, then stored false.

			case 'url':
				if ( ! is_string( $value ) ) {
					return null;
				}
				if ( '' === trim( $value ) ) {
					return '';
				}
				$url = esc_url_raw( trim( $value ), array( 'https', 'http' ) );
				return '' !== $url ? $url : null;

			case 'post_types':
				if ( ! is_array( $value ) ) {
					return null;
				}
				$types = array();
				foreach ( $value as $item ) {
					$slug = is_scalar( $item ) ? sanitize_key( (string) $item ) : '';
					// A type registered later (a plugin that loads after us) is kept if it looks valid.
					if ( '' !== $slug && strlen( $slug ) <= 20 && ! in_array( $slug, $types, true ) ) {
						$types[] = $slug;
					}
				}
				return array_slice( $types, 0, 50 );

			case 'headers':
				if ( ! is_array( $value ) ) {
					return null;
				}
				$out = array();
				foreach ( array_slice( $value, 0, 20 ) as $header ) {
					if ( ! is_array( $header ) ) {
						continue;
					}
					$name = isset( $header['key'] ) && is_scalar( $header['key'] ) ? (string) $header['key'] : '';
					$val  = isset( $header['value'] ) && is_scalar( $header['value'] ) ? (string) $header['value'] : '';
					// RFC 7230 token for the name; no CR/LF anywhere (header injection).
					if ( '' !== $name && ! preg_match( '/^[A-Za-z0-9!#$%&\'*+.^_`|~-]{1,64}$/', $name ) ) {
						continue;
					}
					$val   = mb_substr( trim( preg_replace( '/[\x00-\x1F\x7F]+/', '', $val ) ), 0, 2048 );
					$out[] = array( 'key' => $name, 'value' => $val );
				}
				return $out;
		}
		return null;
	}

	/**
	 * A CSS colour we accept: #rgb, #rrggbb, #rrggbbaa, rgb() or rgba().
	 *
	 * @param string $value Colour.
	 * @return string|null
	 */
	private static function color( $value ) {
		$value = strtolower( trim( $value ) );
		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/', $value ) ) {
			return $value;
		}
		if ( preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d{1,3}|1\.0{1,3}))?\s*\)$/', $value, $m ) ) {
			if ( (int) $m[1] <= 255 && (int) $m[2] <= 255 && (int) $m[3] <= 255 ) {
				return preg_replace( '/\s+/', '', $value );
			}
		}
		return null;
	}
}
