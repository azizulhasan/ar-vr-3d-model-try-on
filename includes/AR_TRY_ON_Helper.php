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
class AR_TRY_ON_Helper
{
    /**
     * Static cache for plugin settings to avoid repeated database queries
     *
     * @since 1.7.9
     * @var array|null
     */
    private static $settings_cache = null;

    /**
     * Get plugin settings with caching to reduce database queries
     *
     * @since 1.7.9
     * @return array Plugin settings
     */
    public static function get_settings() {
        if ( self::$settings_cache === null ) {
            self::$settings_cache = (array) get_option( 'ar_try_on_settings', array() );
        }
        return self::$settings_cache;
    }

    /**
     * Clear the settings cache (call after settings update)
     *
     * @since 1.7.9
     * @return void
     */
    public static function clear_settings_cache() {
        self::$settings_cache = null;
    }

    public static function is_atlas_ar_page()
    {
        // Ensure we are in the admin area
        if (is_admin()) {
            if (!function_exists('get_current_screen')) {
                require_once ABSPATH . 'wp-admin/includes/screen.php';
            }
            // Get the current screen object
            $screen = get_current_screen();
            // Check if we are on the "ar-try-on" page
            if ($screen && $screen->id === 'toplevel_page_ar-vr-3d-model-try-on') {
                return true;
            }

            return false;
        }
    }

    public static function get_post_types()
    {
        $cache_key = AR_TRY_ON_Cache::get_key('get_post_types');
        $cache_value = AR_TRY_ON_Cache::get($cache_key);
        if ($cache_value) {
            return $cache_value;
        }
        $post_types = get_post_types(array(
            'public' => 1, // Only get public post types
        ), 'array');
        $final_post_type = [];
        foreach ($post_types as $post_type) {
            $final_post_type[$post_type->name] = $post_type->name;
        }

        // Apply the filter BEFORE caching so Pro-added post types are part of
        // the cached value. Previously the pre-filter array was cached but the
        // post-filter array returned, so on every cache hit (the common path)
        // Pro's extra post types were silently dropped.
        $final_post_type = apply_filters('atlas_ar_get_post_types', $final_post_type);

        AR_TRY_ON_Cache::set($cache_key, $final_post_type);

        return $final_post_type;
    }

    /**
     * AR-114: the current product's (or post's) ID. WordPress sets the global `$product` to the
     * product's slug (a string) until WooCommerce replaces it with the WC_Product object, so code
     * that runs earlier (a shortcode in a product description rendered for an SEO meta
     * description, for example) must not call get_id() on it.
     *
     * @return int 0 when there is no current product or post.
     */
    public static function current_post_id()
    {
        global $product, $post;
        if (is_object($product) && method_exists($product, 'get_id')) {
            return (int) $product->get_id();
        }
        return (int) ($post->ID ?? 0);
    }

    public static function is_ar_supported_post_type($call_type = '')
    {
        global $post;

        if (!$post) {
            return false;
        }

        if (!is_admin() && !(is_singular() || is_single())) {
            return false; // The current page is singular or single on the frontend
        }

        // Per-request memoization. This helper is called several times per page
        // load (enqueue_styles, enqueue_scripts, the_content, footer, …) and
        // each call previously re-ran get_option() + get_post_meta(), which
        // multiplies DB queries on large sites. The result depends on the
        // current post, the explicit $call_type, and the hook we are running
        // under (current_filter() is read below), so the key combines all three.
        static $support_cache = [];
        $cache_key = $post->ID . '|' . $call_type . '|' . current_filter();
        if (array_key_exists($cache_key, $support_cache)) {
            return $support_cache[$cache_key];
        }

        $settings = self::get_settings();
        $post_types = [];
        if (isset($settings['ar_try_on_allowed_post_types']) && !empty($settings['ar_try_on_allowed_post_types'])) {
            $post_types = $settings['ar_try_on_allowed_post_types'];
        }

        $result = in_array($post->post_type, $post_types);

        if ($post->post_type == 'product' && in_array($post->post_type, $post_types) && $result && !is_plugin_active('woocommerce/woocommerce.php')) {
            $result = false;
        }
        $current_hook = current_filter();
        if ($post->post_type == 'product'
            && $result
            && $current_hook === 'the_content'
            && $call_type === '') {
            $result = false;
        }

        if (!is_admin()) {
            $product_settings = (array)get_post_meta($post->ID, 'ar_try_on_product_settings', true);
            $product_settings = AR_TRY_ON_Helper::rename_old_keys_of_product_metadata($product_settings);

            //Get the file url for android
            if (!isset($product_settings['src'])) {
                $result = false;
            }

            if (isset($product_settings['src']) && !$product_settings['src']) {
                $result = false;
            }
        }

        $support_cache[$cache_key] = $result;

        return $result;
    }

    /**
     * Minimal CSS-value sanitiser for shortcode attributes. Strips
     * angle brackets and JavaScript-protocol sneaks; allows any
     * alphanumeric / dot / dash / percent / parens / space / slash /
     * comma / hash combination (which covers every legitimate CSS
     * length, color, calc(), and aspect-ratio value).
     */
    public static function sanitize_css_value($value)
    {
        $value = (string) $value;
        if ($value === '') {
            return '';
        }
        // Disallow obvious injection vectors.
        $value = preg_replace('/javascript\s*:/i', '', $value);
        $value = preg_replace('/expression\s*\(/i', '', $value);
        $value = str_replace(array('<', '>', '"', "'", ';'), '', $value);
        return trim($value);
    }

    public static function rename_old_keys_of_product_metadata($product_settings)
    {
        //TODO: remove this code after 6 months later.
        /**
         * AR-24: date: 12-08-225
         */
        $old_settings_keys = [
            'ar_try_on_file_android' => 'src',
            'ar_try_on_file_ios' => 'ios_src',
            'ar_try_on_file_poster' => 'poster',
            'ar_try_on_file_alt' => 'alt',
            'ar_try_on_ar_placement' => 'ar_placement',
        ];

        foreach ($product_settings as $key => $value) {
            if (in_array($key, array_keys($old_settings_keys))) {
                $product_settings[$old_settings_keys[$key]] = $value;
            }
        }

        return $product_settings;
    }

    public static function get_integrated_api_name()
    {
        $settings = (array)get_option('ar_try_on_settings');
        $api_name = '';
        if (
            isset($settings['ar_try_on_exclude_integration_api_name'], $settings['ar_try_on_exclude_integration_api_headers'])
            && count($settings['ar_try_on_exclude_integration_api_headers'])
            && $settings['ar_try_on_exclude_integration_api_name']
        ) {
            $api_name = $settings['ar_try_on_exclude_integration_api_name'];
        }

        return $api_name;
    }

    /**
     * Whether the AtlasAR Pro plugin is loaded.
     *
     * Per the AR-61 §1.1 Yoast-pattern split (see
     * plan/AR-61.1-yoast-pattern-split.md), this method MUST NOT
     * read any license state. Its only legitimate uses are:
     *
     *   - hiding upsell badges and notices when Pro is installed, and
     *   - delegating optional add-on behaviour to Pro classes when
     *     those classes exist.
     *
     * It MUST NOT be used to gate any feature that ships in Free.
     * Free is fully functional standalone — there is no "Pro version
     * of a Free feature" anywhere; if a feature is paid, its code
     * does not exist in the Free zip at all.
     *
     * The detection uses a two-stage check, in order of confidence:
     *
     *   1. `defined( 'AR_TRY_ON_PRO_VERSION' )` — the canonical
     *      sentinel. Pro v3.0.0+ defines this constant during its
     *      own bootstrap, which runs at `plugins_loaded` priority
     *      9999. By the time any Free runtime code asks "is Pro
     *      here?" (init or later), this is reliable.
     *
     *   2. `active_plugins` option fallback — covers the rare case
     *      where Pro is registered as active but its bootstrap
     *      hasn't yet defined the constant (mid-upgrade, WP-CLI
     *      with a non-standard load order, an older Pro build
     *      that pre-dates the constant). We check the option
     *      directly instead of calling `is_plugin_active()` so
     *      the method is safe on the front end (where
     *      wp-admin/includes/plugin.php isn't auto-loaded).
     *
     * Important: the previous file_exists() fallback was REPLACED
     * with the active_plugins check during AR-61 §1.1 Phase 2
     * smoke-testing. file_exists() returned true for any site that
     * had Pro on disk but deactivated (for example after a trial)
     * — which silently hid every upsell badge in Free's UI, the
     * exact opposite of what should happen. active_plugins
     * correctly distinguishes "installed but deactivated" from
     * "active and running".
     *
     * @since   1.0.0
     * @updated AR-61 §1.1 — constant-presence check; Freemius removed
     *          from Free.
     * @updated AR-61 §1.1 Phase 2 smoke-test — fallback switched
     *          from file_exists() to active_plugins lookup so
     *          deactivated-but-installed Pro doesn't masquerade
     *          as active.
     * @return  bool True when the Pro plugin is loaded, false otherwise.
     */
    public static function is_pro_active() {
        if ( defined( 'AR_TRY_ON_PRO_VERSION' ) ) {
            return true;
        }

        $active   = (array) get_option( 'active_plugins', array() );
        $pro_keys = array(
            'ar-vr-3d-model-try-on-pro/ar-vr-3d-model-try-on-premium.php',
            'ar-vr-3d-model-try-on-premium/ar-vr-3d-model-try-on-premium.php',
        );
        foreach ( $pro_keys as $pro_key ) {
            if ( in_array( $pro_key, $active, true ) ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get absolute file system path from a WordPress URL
     *
     * @param string $url File URL.
     * @return string|false Absolute file path or false if not found.
     */
    public  static  function get_file_path_from_url( $url ) {
        $upload_dir = wp_upload_dir();

        // Only handle uploads URLs
        if ( strpos( $url, $upload_dir['baseurl'] ) === false ) {
            return false;
        }

        // Convert URL to path
        $file_path = str_replace(
            $upload_dir['baseurl'],
            $upload_dir['basedir'],
            $url
        );

        // Normalize path
        $file_path = wp_normalize_path( $file_path );

        return file_exists( $file_path ) ? $file_path : false;
    }

    /**
     * Get public WordPress upload URL from an absolute file system path
     *
     * @param string $file_path Absolute file path.
     * @return string|false File URL or false if not resolvable.
     */
    public static function get_file_url_from_path( $file_path ) {

        if ( empty( $file_path ) ) {
            return false;
        }

        $upload_dir = wp_upload_dir();

        // Normalize paths for cross-platform compatibility
        $file_path  = wp_normalize_path( $file_path );
        $basedir    = wp_normalize_path( $upload_dir['basedir'] );

        // Ensure file is inside uploads directory
        if ( strpos( $file_path, $basedir ) !== 0 ) {
            return false;
        }

        // Convert path → URL
        $file_url = str_replace(
            $basedir,
            $upload_dir['baseurl'],
            $file_path
        );

        return file_exists( $file_path ) ? $file_url : false;
    }

    /**
     * AR-62 §3h: WP-Cron callback that deletes temp generation files
     * older than 24h.
     *
     * When a user abandons a generation between the initial Tripo3D
     * fetch and the "Save This Model" click, the downloaded GLB and
     * poster sit in `uploads/ar-try-on/<date>/temp/` forever. Over
     * time they pile up. This sweep runs daily, walks every file
     * under `ATLAS_AR_CURRENT_MODEL_TEMP_DIR`, and removes anything
     * whose mtime is older than 24h. Empty directories are also
     * removed.
     *
     * Scheduled by `ar-vr-3d-model-try-on.php` on `init` (via
     * `wp_schedule_event` if not already scheduled). Unscheduled on
     * deactivation via `AR_TRY_ON_Deactivate::deactivate()`.
     *
     * @since AR-62
     * @return void
     */
    public static function sweep_orphan_temp_files() {
        if ( ! defined( 'ATLAS_AR_CURRENT_MODEL_TEMP_DIR' ) ) {
            return;
        }
        $root = ATLAS_AR_CURRENT_MODEL_TEMP_DIR;
        if ( ! is_string( $root ) || ! is_dir( $root ) ) {
            return;
        }
        $cutoff = time() - DAY_IN_SECONDS;

        // Recursive directory iterator — files first, then dirs.
        try {
            $it = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator( $root, \RecursiveDirectoryIterator::SKIP_DOTS ),
                \RecursiveIteratorIterator::CHILD_FIRST
            );
        } catch ( \Exception $e ) {
            return;
        }

        // Use the WP Filesystem API for the directory removals (WP coding
        // standards / Plugin Check flag direct rmdir()). wp_delete_file() is
        // the sanctioned wrapper for the file removals.
        global $wp_filesystem;
        if ( empty( $wp_filesystem ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }

        foreach ( $it as $node ) {
            $path = $node->getPathname();
            if ( $node->isFile() ) {
                $mtime = @filemtime( $path );
                if ( $mtime !== false && $mtime < $cutoff ) {
                    wp_delete_file( $path );
                }
            } elseif ( $node->isDir() && ! empty( $wp_filesystem ) ) {
                // Best-effort rmdir — only succeeds when empty, which after
                // the file pass means every file inside was older than the
                // cutoff.
                $wp_filesystem->rmdir( $path );
            }
        }
    }

}
