<?php

namespace AR_TRY_ON;

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
		/**
		 * Customization settings.
		 */
		if ( $renew_all_settings || ! get_option( 'ar_try_on_settings' ) ) {
			update_option( 'ar_try_on_settings', [
				'ar_try_on_allowed_post_types' => ['post'],
				'ar_try_on_wc_hook_position' => "3",
				'ar_try_on_single_product_tabs' => "yes",
				'ar_try_on_loading_type' => "auto",
				'ar_try_on_reveal_type' => "auto",
				'ar_try_on_poster_color' => "rgba(78,186,79,0)",
				'ar_try_on_ar' => "activate",
				'ar_try_on_ar_modes' => ["webxr", 'scene-viewer', "quick-look"],
				'ar_try_on_ar_scale' => "auto",
				'ar_try_on_ar_placement' => "floor",
				'ar_try_on_xr_environment' => "activate",
				'ar_try_on_ar_button' => "activate",
				'ar_try_on_ar_button_text' => "Activate AR",
				'ar_try_on_ar_button_background_color' => "#3a3a3a",
				'ar_try_on_ar_button_text_color' => "#ffffff"
			] );
		}

	}


}
