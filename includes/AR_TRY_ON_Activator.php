<?php

namespace AR_TRY_ON;

use function GuzzleHttp\Promise\all;

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
class AR_TRY_ON_Activator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    1.0.0
	 */
	public static function activate( $renew_all_settings = false ) {

		$post_url       = '';
		$random_post_id = self::get_random_post_id();
		if ( $random_post_id ) {
			// 'The post is missing required keys or some values are empty.';
			if ( ! self::check_post_meta_keys( $random_post_id ) ) {
				update_post_meta( $random_post_id, 'ar_try_on_product_settings', array(
					"ar_try_on_file_android" => AR_TRY_ON_PLUGIN_URL . "admin/demo/1.glb",
					"ar_try_on_file_ios"     => AR_TRY_ON_PLUGIN_URL . "admin/demo/1.glb",
					"ar_try_on_file_poster"  => AR_TRY_ON_PLUGIN_URL . "admin/demo/demo_poster.png",
					"ar_try_on_file_alt"     => "Demo title"
				) );
			}

			$post_url = get_permalink( $random_post_id );
		}

		$all_settings = get_option( 'ar_try_on_settings' );
		/**
		 * Customization settings.
		 */
		if ( $renew_all_settings || ! $all_settings ) {
			$all_settings = [
				'ar_try_on_allowed_post_types'         => [ 'post' ],
				'ar_try_on_wc_hook_position'           => "3",
				'ar_try_on_single_product_tabs'        => "yes",
				'ar_try_on_loading_type'               => "auto",
				'ar_try_on_reveal_type'                => "auto",
				'ar_try_on_poster_color'               => "rgba(78,186,79,0)",
				'ar_try_on_ar'                         => "activate",
				'ar_try_on_ar_modes'                   => [ "webxr", 'scene-viewer', "quick-look" ],
				'ar_try_on_ar_scale'                   => "auto",
				'ar_try_on_ar_placement'               => "floor",
				'ar_try_on_xr_environment'             => "activate",
				'ar_try_on_ar_button'                  => "activate",
				'ar_try_on_ar_button_text'             => "Activate AR",
				'ar_try_on_ar_button_background_color' => "#3a3a3a",
				'ar_try_on_ar_button_text_color'       => "#ffffff",
				'ar_try_on_ar_demo'                    => [
					'id'  => $random_post_id,
					'url' => $post_url
				],
			];

			update_option( 'ar_try_on_settings', $all_settings );

		}

		if ( ! isset( $all_settings['ar_try_on_ar_demo'] )
		     || ! isset( $all_settings['ar_try_on_ar_demo']['url'] )
		     || ! isset( $all_settings['ar_try_on_ar_demo']['id'] )
		     || ! $all_settings['ar_try_on_ar_demo']['id']
		     || ! $all_settings['ar_try_on_ar_demo']['url']
		) {
			$all_settings['ar_try_on_ar_demo']        = [];
			$all_settings['ar_try_on_ar_demo']['url'] = $post_url;
			$all_settings['ar_try_on_ar_demo']['id']  = $random_post_id;
			update_option( 'ar_try_on_settings', $all_settings );
		}

	}

	private static function get_random_post_id( $post_type = 'post' ) {
		// Query arguments
		$args = array(
			'post_type'      => $post_type,
			'posts_per_page' => 1,
			'orderby'        => 'rand',
			'fields'         => 'ids', // Return only IDs
		);

		// Perform the query
		$query = new \WP_Query( $args );

		// Return the post ID if a post is found, or false otherwise
		if ( $query->have_posts() ) {
			return $query->posts[0];
		} else {
			return false;
		}
	}

	private static function check_post_meta_keys( $post_id ) {
		// Get the post meta value for 'ar_try_on_product_settings'
		$meta_value = (array) get_post_meta( $post_id, 'ar_try_on_product_settings', true );
		error_log( print_r( $meta_value, 1 ) );
		// Check if the meta value exists and is an array
		if ( ! is_array( $meta_value ) ) {
			return false;
		}

		// Define the required keys
		$required_keys = array(
			'ar_try_on_file_android',
			'ar_try_on_file_ios',
			'ar_try_on_file_poster',
			'ar_try_on_file_alt',
		);

		// Loop through required keys and check if they exist and have a value
		foreach ( $required_keys as $key ) {
			if ( ! isset( $meta_value[ $key ] ) ) {
				return false;
			}
			if ( empty( $meta_value[ $key ] ) ) {
				return false; // Return false if a key is missing or its value is empty
			}
		}

		return true; // All keys are present and have values
	}


}
