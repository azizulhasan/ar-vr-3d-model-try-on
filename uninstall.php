<?php

/**
 * Fired when the plugin is uninstalled.
 *
 * When populating this file, consider the following flow
 * of control:
 *
 * - This method should be static
 * - Check if the $_REQUEST content actually is the plugin name
 * - Run an admin referrer check to make sure it goes through authentication
 * - Verify the output of $_GET makes sense
 * - Repeat with other user roles. Best directly by using the links/query string parameters.
 * - Repeat things for multisite. Once for a single site in the network, once sitewide.
 *
 * This file may be updated more in future version of the Tracker; however, this is the
 * general skeleton and outline for how the file should work.
 *
 * For more information, see the following discussion:
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 */

// If uninstall not called from WordPress, then exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

/**
 * Cleanup compression dependencies and settings
 */
function ar_try_on_cleanup_compression() {
    // Delete node_modules directory if exists
    $compression_dir = plugin_dir_path(__FILE__) . 'includes/compression';
    $node_modules_dir = $compression_dir . '/node_modules';

    if (is_dir($node_modules_dir)) {
        ar_try_on_recursive_rmdir($node_modules_dir);
    }

    // Delete compression-related database options
    delete_option('ar_try_on_compression_method');
    delete_option('ar_try_on_compression_api_url');
}

/**
 * Recursively delete a directory and all its contents
 *
 * @param string $dir Directory path
 * @return bool True on success, false on failure
 */
function ar_try_on_recursive_rmdir($dir) {
    if (!is_dir($dir)) {
        return false;
    }

    $files = array_diff(scandir($dir), array('.', '..'));

    foreach ($files as $file) {
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            ar_try_on_recursive_rmdir($path);
        } else {
            @unlink($path);
        }
    }

    return @rmdir($dir);
}

// Run cleanup
ar_try_on_cleanup_compression();
