<?php

namespace AR_TRY_ON;

use stdClass;
use function Symfony\Component\Translation\t;

/**
 * Fired during plugin activation
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Helper {
	public static function is_ar_try_on_page() {
		// Ensure we are in the admin area
		if ( is_admin() ) {
			if ( ! function_exists( 'get_current_screen' ) ) {
				require_once ABSPATH . 'wp-admin/includes/screen.php';
			}
			// Get the current screen object
			$screen = get_current_screen();
			// Check if we are on the "ar-try-on" page
			if ( $screen && $screen->id === 'toplevel_page_ar-vr-3d-model-try-on' ) {
				return true;
			}

			return false;
		}
	}


	public static function is_product_page() {
		if ( ! function_exists( 'get_current_screen' ) ) {
			require_once ABSPATH . 'wp-admin/includes/screen.php';
		}
		$screen = get_current_screen();

		if ( ( $screen && $screen->post_type == 'product' && $screen->base == 'post' ) || is_singular( 'product' ) ) {
			return true;
		}

		return false;
	}

	public static function get_post_types() {
		$cache_key   = AR_TRY_ON_Cache::get_key( 'get_post_types' );
		$cache_value = AR_TRY_ON_Cache::get( $cache_key );
		if ( $cache_value ) {
			return $cache_value;
		}
		$post_types      = get_post_types( array(
			'public' => 1, // Only get public post types
		), 'array' );
		$final_post_type = [];
		foreach ( $post_types as $post_type ) {
			$final_post_type[ $post_type->name ] = $post_type->name;
		}

		AR_TRY_ON_Cache::set( $cache_key, $final_post_type );

		return apply_filters( 'ar_try_on_get_post_types', $final_post_type );
	}

	public static function ar_try_on_should_load_button( $post_status = '' ) {
		$should_load_button = false;
		global $post;
		// is_home() || is_archive() || is_front_page() || is_category()
		if ( \is_single() || \is_singular() ) {
			$should_load_button = true;
		}

		$settings = (array) get_option( 'ar_try_on_settings' );

		if (
			! isset( $settings['ar_try_on_allowed_post_types'] )
			|| count( $settings['ar_try_on_allowed_post_types'] ) === 0
			|| ! is_array( $settings['ar_try_on_allowed_post_types'] )
			|| ! in_array( self::ar_try_on_post_type(), $settings['ar_try_on_allowed_post_types'] )

		) {
			$should_load_button = false;
		}

		if ( self::is_edit_page() ) {
			$should_load_button = true;
			if (
				! isset( $settings['ar_try_on_allowed_post_types'] )
				|| count( $settings['ar_try_on_allowed_post_types'] ) === 0
				|| ! is_array( $settings['ar_try_on_allowed_post_types'] )
				|| ! in_array( self::ar_try_on_post_type(), $settings['ar_try_on_allowed_post_types'] )
			) {
				$should_load_button = false;
			}
		}

		return apply_filters( 'ar_try_on_should_load_button', $should_load_button, $post );
	}

	/**
	 * Get post type
	 *
	 * @see
	 */

	public static function ar_try_on_post_type() {
		global $post;

		return isset( $post->post_type ) ? $post->post_type : '';
	}


	public static function is_edit_page() {
		global $pagenow;

		// Check if we are in the admin area and on the edit post/page screen
		if ( is_admin() ) {
			if ( $pagenow === 'post.php' || $pagenow === 'post-new.php' ) {
				return true;
			}
		}

		return false;
	}

	public static function is_ar_supported_post_type() {
		global $post;

		if ( ! $post ) {
			return false;
		}

		if ( ! is_admin() && ! ( is_singular() || is_single() ) ) {
			return false; // The current page is singular or single on the frontend
		}

		$settings = (array) get_option( 'ar_try_on_settings' );

		$post_types = $settings['ar_try_on_allowed_post_types'];

		$result = in_array( $post->post_type, $post_types );

		if ( $post->post_type == 'product' && in_array( $post->post_type, $post_types ) && $result && ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
			$result = false;
		}
		$current_hook = current_filter();
		if ( $post->post_type == 'product' && $result && $current_hook === 'the_content' ) {
			$result = false;
		}

		if ( ! is_admin() ) {
			$product_settings = (array) get_post_meta( $post->ID, 'ar_try_on_product_settings', true );

			//Get the file url for android
			if ( ! isset( $product_settings['ar_try_on_file_android'] ) || ! $product_settings['ar_try_on_file_android'] ) {
				$result = false;
			}
		}


		return $result;
	}

}
