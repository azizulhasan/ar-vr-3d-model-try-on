<?php

namespace AR_TRY_ON;
/**
 * AR Try On - Compression Database Handler
 *
 * Manages database tables and operations for 3D model compression tracking.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @since      1.8.0
 */

defined('ABSPATH') || exit;

/**
 * Class AR_TRY_ON_Compression_DB
 *
 * Handles all database operations related to compression feature.
 */
class AR_TRY_ON_Compression_DB
{

    /**
     * Database version for compression tables
     *
     * @var string
     */
    const DB_VERSION = '1.0.0';

    /**
     * Option name for storing DB version
     *
     * @var string
     */
    const VERSION_OPTION = 'ar_try_on_compression_db_version';

    /**
     * Initialize database tables on plugin activation or version change
     *
     * @since 1.8.0
     */
    public static function init()
    {
        $current_version = get_option(self::VERSION_OPTION, '0.0.0');
        if (version_compare($current_version, self::DB_VERSION, '<')) {
            self::create_tables();
            update_option(self::VERSION_OPTION, self::DB_VERSION);
        }

        // Add admin action to manually create tables if needed
        add_action('admin_init', array(__CLASS__, 'maybe_create_tables'));
    }

    /**
     * Check and create tables if they don't exist
     *
     * @since 1.8.0
     */
    public static function maybe_create_tables()
    {
        // Check if tables exist, if not create them
        global $wpdb;
        $log_table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($log_table)) {
            self::create_tables();
            update_option(self::VERSION_OPTION, self::DB_VERSION);
        }
    }

    /**
     * Create compression-related database tables
     *
     * @since 1.8.0
     */
    public static function create_tables()
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // Table 1: Compression Log - Tracks all compression operations
        $compression_log_table = $wpdb->prefix . 'ar_compression_log';
        $sql_log = "CREATE TABLE $compression_log_table (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id BIGINT(20) UNSIGNED NOT NULL,
            original_file VARCHAR(255) NOT NULL,
            compressed_file VARCHAR(255) NOT NULL,
            original_size BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
            compressed_size BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
            compression_ratio FLOAT NOT NULL DEFAULT 0,
            format VARCHAR(10) NOT NULL DEFAULT 'glb',
            quality INT NOT NULL DEFAULT 85,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_message TEXT NULL,
            compression_time INT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY post_id (post_id),
            KEY status (status),
            KEY format (format),
            KEY created_at (created_at)
        ) $charset_collate;";
        dbDelta( $sql_log );

        // Table 2: Compression Queue - For background processing (Pro feature)
        $compression_queue_table = $wpdb->prefix . 'ar_compression_queue';
        $sql_queue = "CREATE TABLE $compression_queue_table (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id BIGINT(20) UNSIGNED NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL DEFAULT 'model',
            format VARCHAR(10) NOT NULL DEFAULT 'glb',
            quality INT NOT NULL DEFAULT 85,
            status VARCHAR(20) NOT NULL DEFAULT 'queued',
            priority INT NOT NULL DEFAULT 10,
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            max_attempts INT UNSIGNED NOT NULL DEFAULT 3,
            error_message TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME NULL,
            completed_at DATETIME NULL,
            PRIMARY KEY  (id),
            KEY post_id (post_id),
            KEY status (status),
            KEY priority (priority),
            KEY created_at (created_at)
        ) $charset_collate;";
        dbDelta( $sql_queue );

        // Table 3: Compression Settings - User preferences per model
        $compression_settings_table = $wpdb->prefix . 'ar_compression_settings';
        $sql_settings = "CREATE TABLE $compression_settings_table (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id BIGINT(20) UNSIGNED NOT NULL,
            keep_original TINYINT(1) NOT NULL DEFAULT 1,
            auto_compress TINYINT(1) NOT NULL DEFAULT 1,
            quality INT NOT NULL DEFAULT 85,
            last_compressed_at DATETIME NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY post_id (post_id)
        ) $charset_collate;";
        dbDelta($sql_settings);
    }

    /**
     * Log a compression operation
     *
     * @param array $data Compression data.
     * @return int|false Insert ID on success, false on failure.
     * @since 1.8.0
     */
    public static function log_compression($data)
    {
        global $wpdb;

        $defaults = array(
            'post_id' => 0,
            'original_file' => '',
            'compressed_file' => '',
            'original_size' => 0,
            'compressed_size' => 0,
            'compression_ratio' => 0,
            'format' => 'glb',
            'quality' => 85,
            'status' => 'pending',
            'error_message' => null,
            'compression_time' => null,
        );

        $data = wp_parse_args($data, $defaults);

        // Calculate compression ratio if not provided
        if (0 === $data['compression_ratio'] && $data['original_size'] > 0) {
            $data['compression_ratio'] = (1 - ($data['compressed_size'] / $data['original_size'])) * 100;
        }

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }

        $result = $wpdb->insert(
            $table,
            $data,
            array('%d', '%s', '%s', '%d', '%d', '%f', '%s', '%d', '%s', '%s', '%d')
        );

        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Update compression log entry
     *
     * @param int $log_id Log entry ID.
     * @param array $data Data to update.
     * @return bool Success status.
     * @since 1.8.0
     */
    public static function update_compression_log($log_id, $data)
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }

        return (bool)$wpdb->update(
            $table,
            $data,
            array('id' => $log_id),
            null,
            array('%d')
        );
    }

    private static function table_exists($table)
    {
        global $wpdb;

        return $wpdb->get_var(
                $wpdb->prepare(
                    "SHOW TABLES LIKE %s",
                    $table
                )
            ) === $table;
    }


    /**
     * Get compression log for a post
     *
     * @param int $post_id Post ID.
     * @return array|null Compression log data or null.
     * @since 1.8.0
     */
    public static function get_compression_log($post_id, $type = 'post_id')
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return null; // graceful fallback
        }

        return $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $table WHERE $type = %d ORDER BY created_at DESC LIMIT 1",
                $post_id
            ),
            ARRAY_A
        );
    }


    /**
     * Get all compression logs
     *
     * @param array $args Query arguments.
     * @return array Compression logs.
     * @since 1.8.0
     */
    public static function get_all_compression_logs($args = array())
    {
        global $wpdb;

        $defaults = array(
            'status' => null,
            'limit' => 50,
            'offset' => 0,
            'orderby' => 'created_at',
            'order' => 'DESC',
        );

        $args = wp_parse_args($args, $defaults);
        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return array(); // graceful fallback
        }


        $where = '1=1';
        if (!is_null($args['status'])) {
            $where .= $wpdb->prepare(' AND status = %s', $args['status']);
        }

        $query = "SELECT * FROM $table WHERE $where ORDER BY {$args['orderby']} {$args['order']} LIMIT %d OFFSET %d";

        return $wpdb->get_results(
            $wpdb->prepare($query, $args['limit'], $args['offset']),
            ARRAY_A
        );
    }

    /**
     * Get compression statistics
     *
     * @return array Statistics data.
     * @since 1.8.0
     */
    public static function get_compression_stats_old()
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return array(); // graceful fallback
        }


        $stats = $wpdb->get_row(
            "SELECT
				COUNT(*) as total_compressions,
				COUNT(CASE WHEN status = 'complete' THEN 1 END) as successful_compressions,
				COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_compressions,
				SUM(original_size) as total_original_size,
				SUM(compressed_size) as total_compressed_size,
				AVG(compression_ratio) as avg_compression_ratio,
				SUM(original_size - compressed_size) as total_saved_space
			FROM $table
			WHERE status = 'complete'",
            ARRAY_A
        );

        return $stats ? $stats : array();
    }


    public static function get_compression_stats()
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return [];
        }

        $stats = $wpdb->get_row(
            "SELECT
            COUNT(*) AS total_compressions,
            SUM(status = 'complete') AS successful_compressions,
            SUM(status = 'failed') AS failed_compressions,
            SUM(original_size) AS total_original_size,
            SUM(compressed_size) AS total_compressed_size,
            AVG(compression_ratio) AS avg_compression_ratio,
            SUM(
                CAST(original_size AS SIGNED) - CAST(compressed_size AS SIGNED)
            ) AS total_saved_space
        FROM {$table}
        WHERE status = 'complete'",
            ARRAY_A
        );

        return $stats ?: [];
    }


    /**
     * Count user's compressed models (for free user limit)
     *
     * @return int Number of compressed models.
     * @since 1.8.0
     */
    public static function count_user_compressions()
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return 0;
        }

        return (int)$wpdb->get_var(
            "SELECT COUNT(DISTINCT post_id) FROM $table WHERE status = 'complete'"
        );
    }

    /**
     * Add item to compression queue (Pro feature)
     *
     * @param array $data Queue item data.
     * @return int|false Queue ID on success, false on failure.
     * @since 1.8.0
     */
    public static function add_to_queue($data)
    {
        global $wpdb;

        $defaults = array(
            'post_id' => 0,
            'file_path' => '',
            'file_type' => 'model',
            'format' => 'glb',
            'quality' => 85,
            'status' => 'queued',
            'priority' => 10,
            'attempts' => 0,
            'max_attempts' => 3,
        );

        $data = wp_parse_args($data, $defaults);

        $table = $wpdb->prefix . 'ar_compression_queue';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }


        $result = $wpdb->insert(
            $wpdb->prefix . 'ar_compression_queue',
            $data,
            array('%d', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%d')
        );

        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Get next queued item for processing (Pro feature)
     *
     * @return array|null Queue item or null.
     * @since 1.8.0
     */
    public static function get_next_queue_item()
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_queue';

        if (!self::table_exists($table)) {
            return array(); // graceful fallback
        }

        return $wpdb->get_row(
            "SELECT * FROM $table
			WHERE status = 'queued'
			AND attempts < max_attempts
			ORDER BY priority DESC, created_at ASC
			LIMIT 1",
            ARRAY_A
        );
    }

    /**
     * Update queue item status
     *
     * @param int $queue_id Queue item ID.
     * @param string $status New status.
     * @param string $error_message Optional error message.
     * @return bool Success status.
     * @since 1.8.0
     */
    public static function update_queue_item($queue_id, $status, $error_message = null)
    {
        global $wpdb;

        $data = array('status' => $status);

        if ('processing' === $status) {
            $data['started_at'] = current_time('mysql');
            $data['attempts'] = new stdClass(); // Increment attempts
        } elseif (in_array($status, array('complete', 'failed'), true)) {
            $data['completed_at'] = current_time('mysql');
        }

        if (!is_null($error_message)) {
            $data['error_message'] = $error_message;
        }


        $table = $wpdb->prefix . 'ar_compression_queue';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }

        // Handle attempts increment
        if (isset($data['attempts'])) {
            $wpdb->query(
                $wpdb->prepare(
                    "UPDATE $table
					SET status = %s, started_at = %s, attempts = attempts + 1
					WHERE id = %d",
                    $status,
                    $data['started_at'],
                    $queue_id
                )
            );
            unset($data['attempts']);
            unset($data['started_at']);
            unset($data['status']);
        }

        if (empty($data)) {
            return true;
        }

        return (bool)$wpdb->update(
            $table,
            $data,
            array('id' => $queue_id),
            null,
            array('%d')
        );
    }

    /**
     * Delete compression log entry
     *
     * @param int $post_id Post ID.
     * @return bool Success status.
     * @since 1.8.0
     */
    public static function delete_compression_log($post_id)
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }

        return (bool)$wpdb->delete(
            $wpdb->prefix . 'ar_compression_log',
            array('post_id' => $post_id),
            array('%d')
        );
    }

    /**
     * Clean up old compression logs (retention policy)
     *
     * @param int $days Number of days to retain.
     * @return int Number of deleted rows.
     * @since 1.8.0
     */
    public static function cleanup_old_logs($days = 90)
    {
        global $wpdb;

        $table = $wpdb->prefix . 'ar_compression_log';

        if (!self::table_exists($table)) {
            return false; // graceful fallback
        }

        return $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM $table WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
                $days
            )
        );
    }

    /**
     * Drop all compression tables (used on plugin uninstall)
     *
     * @since 1.8.0
     */
    public static function drop_tables()
    {
        global $wpdb;

        $tables = array(
            $wpdb->prefix . 'ar_compression_log',
            $wpdb->prefix . 'ar_compression_queue',
            $wpdb->prefix . 'ar_compression_settings',
        );

        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }

        delete_option(self::VERSION_OPTION);
    }
}
