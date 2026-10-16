<?php

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).

defined( 'ABSPATH' ) || exit;

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
class AR_TRY_ON_Hooks {

	public function __construct() {
		// Hook to update cache when any post is created or updated
		add_action( 'save_post', [ 'AR_TRY_ON\AR_TRY_ON_Cache', 'update_post_type_cache' ] );

		// Hook to update cache when any post is deleted
		add_action( 'delete_post', [ 'AR_TRY_ON\AR_TRY_ON_Cache', 'update_post_type_cache' ] );
	}

}

new AR_TRY_ON_Hooks();

