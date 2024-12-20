<?php

namespace AR_TRY_ON;

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
			// TODO: this dynamic.
//			$expiration = get_option( '_settings', array( 'cache_ttl' => 6 * HOUR_IN_SECONDS ) );
//			$expiration =  6 * HOUR_IN_SECONDS;
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

}
