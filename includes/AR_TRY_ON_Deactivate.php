<?php
namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).
/**
 * Fired during plugin deactivation
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Deactivate {

    /**
     * Short Description. (use period)
     *
     * Long Description.
     *
     * @since    1.0.0
     */
    public static function deactivate() {
		// Clear scheduled cron jobs
		$timestamp = wp_next_scheduled( 'ar_try_on_process_compression_queue' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'ar_try_on_process_compression_queue' );
		}
		// AR-62 §3h: orphan-temp sweeper.
		$temp_sweep = wp_next_scheduled( 'atlas_ar_sweep_orphan_temp_files' );
		if ( $temp_sweep ) {
			wp_unschedule_event( $temp_sweep, 'atlas_ar_sweep_orphan_temp_files' );
		}
    }

}
