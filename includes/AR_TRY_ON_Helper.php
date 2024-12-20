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
	public static function is_ar_try_on_for_wordpress_page() {
		// Ensure we are in the admin area
		if ( is_admin() ) {
			if ( ! function_exists( 'get_current_screen' ) ) {
				include_once ABSPATH . 'wp-admin/includes/screen.php';
			}
			// Get the current screen object
			$screen = get_current_screen();
			// Check if we are on the "ar-try-on" page
			if ( $screen && $screen->id === 'toplevel_page_ar-vr-3d-try-on-for-wordpress' ) {
				return true;
			}

			return false;
		}
	}


	public static function is_product_page() {
		if ( ! function_exists( 'get_current_screen' ) ) {
			include_once ABSPATH . 'wp-admin/includes/screen.php';
		}
		$screen = get_current_screen();

		if ( ( $screen && $screen->post_type == 'product' && $screen->base == 'post' ) || is_singular( 'product' ) ) {
			return true;
		}

		return false;
	}


}
