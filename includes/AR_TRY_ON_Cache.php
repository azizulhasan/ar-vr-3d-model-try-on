<?php

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).

class AR_TRY_ON_Cache {
	/**
	 * Get Cached Data
	 *
	 * @param string $key Cache Name
	 *
	 * @return mixed|false  false if cache not found.
	 * @since 3.3.10
	 */
	public static function get( $key, $prefix = '__ar_try_on_cache_' ) {
		if ( empty( $key ) ) {
			return false;
		}

		return get_transient( $prefix . $key );
	}

	/**
	 * Set Cached Data
	 *
	 * @param string $key Cache name. Expected to not be SQL-escaped. Must be
	 *                             172 characters or fewer.
	 * @param mixed $data Data to cache. Must be serializable if non-scalar.
	 *                             Expected to not be SQL-escaped.
	 * @param int|bool $expiration Optional. Time until expiration in seconds. Default 0 (no expiration).
	 *
	 * @return bool
	 */
	public static function set( $key, $data, $expiration = false, $prefix = '__ar_try_on_cache_' ) {
		if ( empty( $key ) ) {
			return false;
		}

		if ( false === $expiration ) {
			// Set default cache expiration to 6 hours for performance
			// This prevents cache from persisting indefinitely and ensures data freshness
			$expiration = 6 * HOUR_IN_SECONDS; // 6 hours = 21600 seconds
		}

		return set_transient( $prefix . $key, $data, $expiration );
	}

	public static function delete( $key, $prefix = '__ar_try_on_cache_' ) {
		if ( empty( $key ) ) {
			return false;
		}

		return delete_transient( $prefix . $key );

	}

	/**
	 * Delete All Cached Data
	 *
	 * @return bool
	 */
	public static function flush() {
		global $wpdb;

		return $wpdb->query( "DELETE FROM $wpdb->options WHERE ({$wpdb->options}.option_name LIKE '_transient_timeout___ar_try_on_cache_%') OR ({$wpdb->options}.option_name LIKE '_transient___ar_try_on_cache_%')" ); // phpcs:ignore
	}

	public static function get_key( $cache_key = 'all' ) {
		// key will be method name and value will be cache key,
		$cache_keys = [
			'get_post_types' => 'get_post_types',
			'all_plugins'    => 'all_plugins',
		];

		if ( $cache_key == 'all' ) {
			return $cache_keys;
		}

		return $cache_keys[ $cache_key ] ?? '';
	}


	// Static function to update cache for all post types
	public static function update_post_type_cache( $post_id ) {
		// Get the post type of the current post
		$cache_key = self::get_key( 'get_post_types' );
		self::delete( $cache_key );
		// Only proceed if the post type is valid
		AR_TRY_ON_Helper::get_post_types();
	}

	public static function update_transient_during_plugins_crud() {
		$cache_key = self::get_key( 'is_pro_active' );
		self::delete( $cache_key );

		$cache_key = self::get_key( 'all_plugins' );
		self::delete( $cache_key );

	}

	/**
	 * @return mixed|void
	 */
	public static function all_plugins() {
		$all_plugins_cache_key = 'all_plugins';
		$cached_all_plugins    = self::get( $all_plugins_cache_key );
		if ( $cached_all_plugins ) {
			return $cached_all_plugins;
		}

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$all_plugins = get_plugins();

		self::set( $all_plugins_cache_key, $all_plugins );

		return $all_plugins;
	}

}
