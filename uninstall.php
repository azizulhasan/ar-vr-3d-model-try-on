<?php
/**
 * Runs when the plugin is deleted (not on deactivation).
 *
 * AR-158:
 * - Always: the setup wizard is marked "not done", so installing AtlasAR again opens it (the
 *   settings themselves are kept, the site owner did not ask to delete them).
 * - Settings › "Delete all AtlasAR settings, 3D Library models and product data when the plugin
 *   is deleted" (off by default): removes AtlasAR's options, the 3D Library (its posts and the
 *   uploads/atlasar folder), AtlasAR's product data and its table. AtlasAR Pro's own options
 *   (atlas_ar_pro_*) and the media library are not touched.
 *
 * @package AR_TRY_ON
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/** Clean one site. */
function atlas_ar_uninstall_site() {
	global $wpdb;

	$settings = get_option( 'atlas_ar_settings' );
	$remove   = is_array( $settings ) && ! empty( $settings['general']['remove_data'] );

	if ( ! $remove ) {
		if ( is_array( $settings ) && isset( $settings['general'] ) && is_array( $settings['general'] ) ) {
			$settings['general']['wizard_done'] = false;
			update_option( 'atlas_ar_settings', $settings );
		}
		delete_option( 'atlas_ar_setup_offered' );
		return;
	}

	// phpcs:disable WordPress.DB.DirectDatabaseQuery -- one-time clean-up on uninstall, nothing to cache.
	// The 3D Library: its posts and their meta.
	$wpdb->query( $wpdb->prepare( "DELETE pm FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type = %s", 'atlas_ar_model' ) );
	$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->posts} WHERE post_type = %s", 'atlas_ar_model' ) );
	// AtlasAR's product data (the 3.x keys and the 2.x one).
	$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE %s OR meta_key = %s", $wpdb->esc_like( '_atlas_ar' ) . '%', 'ar_try_on_product_settings' ) );
	// Options and transients (not AtlasAR Pro's).
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE ( option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s ) AND option_name NOT LIKE %s",
			$wpdb->esc_like( 'atlas_ar_' ) . '%',
			$wpdb->esc_like( 'ar_try_on_' ) . '%',
			$wpdb->esc_like( '_transient_atlas_ar_' ) . '%',
			$wpdb->esc_like( '_transient_timeout_atlas_ar_' ) . '%',
			$wpdb->esc_like( 'atlas_ar_pro' ) . '%'
		)
	);
	$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}ar_compression_log" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange -- the plugin's own table.
	$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}atlas_ar_stats" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange -- AR-161: shopper analytics.
	// phpcs:enable

	// The 3D Library files.
	$uploads = wp_upload_dir( null, false );
	$dir     = trailingslashit( $uploads['basedir'] ) . 'atlasar';
	if ( is_dir( $dir ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		if ( WP_Filesystem() ) {
			global $wp_filesystem;
			$wp_filesystem->rmdir( $dir, true );
		}
	}

	wp_clear_scheduled_hook( 'atlas_ar_sweep_orphan_temp_files' );
	wp_clear_scheduled_hook( 'atlas_ar_stats_prune' );
	wp_cache_flush();
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $atlas_ar_site ) {
		switch_to_blog( $atlas_ar_site );
		atlas_ar_uninstall_site();
		restore_current_blog();
	}
} else {
	atlas_ar_uninstall_site();
}
