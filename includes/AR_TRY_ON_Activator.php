<?php

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).

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

		// Record first activation time — used to gate time-based admin notices
		// (e.g. the review request). Only set once so it survives reactivation.
		if ( ! get_option( 'ar_try_on_activated_at' ) ) {
			update_option( 'ar_try_on_activated_at', time(), false );
		}

		// AR-120: activation no longer writes demo data into a post or the old settings option:
		// the setup wizard and the 3D Library take over (AR_TRY_ON_Dashboard::on_activation).

		return array();
	}

}
