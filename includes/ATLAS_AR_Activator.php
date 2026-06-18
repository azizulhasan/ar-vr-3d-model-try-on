<?php

namespace ATLAS_AR;


/**
 * Fired during plugin activation
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    ATLAS_AR
 * @subpackage ATLAS_AR/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    ATLAS_AR
 * @subpackage ATLAS_AR/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class ATLAS_AR_Activator {

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
				update_post_meta( $random_post_id, 'ar_try_on_product_settings', ATLAS_AR_Helper::default_model_settings() );
			}

			$post_url = get_permalink( $random_post_id );
		}

		$all_settings = (array) get_option( 'ar_try_on_settings' );
		/**
		 * Customization settings.
		 */
		if ( $renew_all_settings || empty( $all_settings ) ) {
			$all_settings = ATLAS_AR_Helper::default_settings();
			$all_settings['ar_try_on_ar_demo'] = [
					'id'  => $random_post_id,
					'url' => $post_url
			];

			update_option( 'ar_try_on_settings', $all_settings );
			ATLAS_AR_Cache::set( 'settings', $all_settings );
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
			ATLAS_AR_Cache::set( 'settings', $all_settings );
		}

		// Initialize compression database tables (log table only - queue is Pro)
		ATLAS_AR_Compression_DB::init();

		// Note: Queue table and cron job are handled by Pro plugin

		return $all_settings;
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
		// Check if the meta value exists and is an array
		if ( ! is_array( $meta_value ) ) {
			return false;
		}

		// Define the required keys
		$required_keys = array(
			'src',
			'ios_src',
			'poster',
			'alt',
			'ar_placement',
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
