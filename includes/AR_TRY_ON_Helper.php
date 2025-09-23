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
class AR_TRY_ON_Helper
{
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


    public static function is_product_page()
    {
        if (!function_exists('get_current_screen')) {
            require_once ABSPATH . 'wp-admin/includes/screen.php';
        }
        $screen = get_current_screen();

        if (($screen && $screen->post_type == 'product' && $screen->base == 'post') || is_singular('product')) {
            return true;
        }

        return false;
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

        AR_TRY_ON_Cache::set($cache_key, $final_post_type);

        return apply_filters('atlas_ar_get_post_types', $final_post_type);
    }

    public static function atlas_ar_should_load_button($post_status = '')
    {
        $should_load_button = false;
        global $post;
        // is_home() || is_archive() || is_front_page() || is_category()
        if (\is_single() || \is_singular()) {
            $should_load_button = true;
        }

        $settings = (array)get_option('ar_try_on_settings');

        if (
            !isset($settings['ar_try_on_allowed_post_types'])
            || count($settings['ar_try_on_allowed_post_types']) === 0
            || !is_array($settings['ar_try_on_allowed_post_types'])
            || !in_array(self::post_type(), $settings['ar_try_on_allowed_post_types'])

        ) {
            $should_load_button = false;
        }

        if (self::is_edit_page()) {
            $should_load_button = true;
            if (
                !isset($settings['ar_try_on_allowed_post_types'])
                || count($settings['ar_try_on_allowed_post_types']) === 0
                || !is_array($settings['ar_try_on_allowed_post_types'])
                || !in_array(self::post_type(), $settings['ar_try_on_allowed_post_types'])
            ) {
                $should_load_button = false;
            }
        }

        return apply_filters('atlas_ar_should_load_button', $should_load_button, $post);
    }

    /**
     * Get post type
     *
     * @see
     */

    public static function post_type()
    {
        global $post;

        return isset($post->post_type) ? $post->post_type : '';
    }


    public static function is_edit_page()
    {
        global $pagenow;

        // Check if we are in the admin area and on the edit post/page screen
        if (is_admin()) {
            if ($pagenow === 'post.php' || $pagenow === 'post-new.php') {
                return true;
            }
        }

        return false;
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

        $settings = (array)get_option('ar_try_on_settings');
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


        return $result;
    }

    public static function create_shortcode($attr, $content = '')
    {
        $attributes = shortcode_atts(array(
            'height' => '400px',
            'width' => '500px',
            'position' => 'after',
        ), $attr);

        $current_filter = current_filter();

        if (!AR_TRY_ON_Helper::is_ar_supported_post_type('shortcode')) {
            if ($current_filter === 'the_content') {
                return $content;
            }

            return;
        }

        // Global product variable
        global $product;
        global $post;
        if ($product) {
            $post_id = $product->get_id();
            if (!$content) {
                $content = $post->post_content;
            }
        } else {
            $post_id = $post->ID;
            if (!$content) {
                $content = $post->post_content;
            }
        }

        ob_start();
        ?>
        <div style="height: <?php echo esc_attr($attributes['height']) ?>;width: <?php echo esc_attr($attributes['width']) ?>;"
             id="atlas_ar_shortcode_<?php echo esc_attr($post_id) ?>"></div>
        <script type="module">
            document.addEventListener("DOMContentLoaded", async function () {
                let atlasAR = new window.AtlasAR()
                let product_id = "<?php echo esc_attr($post_id) ?>";
                const htmlContent = atlasAR.getModelSkeleton(`model_viewer_shortcode_${product_id}`)

                let current_product = document.getElementById('atlas_ar_shortcode_' + product_id);
                let modelLoaded = false;
                if (!modelLoaded) {
                    current_product.innerHTML = '<h1>3D File Is Loading</h1>'
                }
                current_product.innerHTML = htmlContent; // Insert model-viewer HTML

                atlasAR.fetchModelData(product_id, "#model_viewer_shortcode_" + product_id)
            });
        </script>
        <?php
        $ar_button_content = ob_get_clean();

        return $ar_button_content;
    }

    public static function is_qr_code_enabled($settings = [])
    {
        if (empty($settings)) {
            $settings = (array)get_option('ar_try_on_settings');
        }
        if (!wp_is_mobile() && isset($settings['ar_try_on_enable_qr_code']) && $settings['ar_try_on_enable_qr_code'] == 'yes') {
            return true;
        }

        return false;
    }

    public static function get_qr_code($settings = [])
    {
        $ar_button_content = '';
        if (!self::is_qr_code_enabled($settings)) {
            return $ar_button_content;
        }

        $url = \get_permalink();
        ob_start();
        ?>
        <div id="atlas_ar_qr_code">

        </div>
        <script>
            var typeNumber = 0;
            var errorCorrectionLevel = 'L';
            var qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData("<?php echo esc_url($url) ?>");
            qr.make();
            document.getElementById("atlas_ar_qr_code").innerHTML = '<button id="ar_close_btn">&times;</button>' + qr.createImgTag();
            document.getElementById("ar_close_btn").addEventListener("click", function () {
                document.getElementById("atlas_ar_qr_code").style.display = "none";
            });
        </script>
        <?php
        $ar_button_content = ob_get_clean();

        return $ar_button_content;
    }

    public static function default_settings()
    {
        return [
            'ar_try_on_display_button_automatically' => 'yes',
            'ar_try_on_allowed_post_types' => ['post'],
            'ar_try_on_wc_hook_position' => "3",
            'ar_try_on_single_product_tabs' => "yes",
            'ar_try_on_loading_type' => "auto",
            'ar_try_on_reveal_type' => "auto",
            'ar_try_on_poster_color' => "rgba(78,186,79,0)",
            'ar_try_on_ar' => "activate",
            'ar_try_on_ar_modes' => ["webxr", 'scene-viewer', "quick-look"],
            'ar_try_on_ar_scale' => "auto",
            'ar_try_on_xr_environment' => "activate",
            'ar_try_on_ar_button' => "deactivate",
            'ar_try_on_ar_button_text' => "Activate AR",
            'ar_try_on_ar_button_background_color' => "#3a3a3a",
            'ar_try_on_ar_button_text_color' => "#ffffff",
            'ar_try_on_enable_qr_code' => 'yes',
        ];
    }

    public static function default_model_settings()
    {
        return [
            'src' => 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb',
            'ios_src' => '',
            'poster' => 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.webp',
            'alt' => 'NeilArmstrong',
            'ar_placement' => 'floor',
            // light & environment settings
            'skybox_image' => 'https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.jpg',
            'environment_image' => 'https://modelviewer.dev/shared-assets/environments/moon_1k.hdr',
            // Camera settings
            'auto_rotate' => false,
            'shadow_intensity' => '1',
            'camera_orbit' => '45deg 55deg 4m',
            'disable_zoom' => false,
            'disable_tap' => false,
            // Canvas settings
            'canvas_alignment' => 'left',
            'canvas_width' => '100%',
            'canvas_height' => '400px',
            'canvas_margin' => '0',
            'canvas_padding' => '20px 0',
            'custom_css' => '',
        ];
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

    public static function get_structured_model_response($request_decoded_data, $api_response_data = [])
    {
        $response_body = [];
        if (isset($request_decoded_data['api_name'], $request_decoded_data['body']['type'])
            && $request_decoded_data['api_name'] == "tripo3d"
            && $request_decoded_data['body']['type'] == "text_to_model"
        ) {
            if (!empty($api_response_data)) {

                if (isset($api_response_data['data']['task_id'])) {
                    $response_body['task_id'] = $api_response_data['data']['task_id'];
                }

                if (isset($api_response_data['data']['type'])) {
                    $response_body['type'] = $api_response_data['data']['type'];
                }

                if (isset($api_response_data['data']['input'])) {
                    $response_body['input'] = $api_response_data['data']['input'];
                }

                $response_body['output'] = [];
                if (isset($api_response_data['data']['output'])) {
                    /**
                     * pbr_model will give work as glb
                     */
                    if (isset($api_response_data['data']['output']['pbr_model'])) {
                        $response_body['output']['src'] = $api_response_data['data']['output']['pbr_model'];
                    }
                    /**
                     * generated_image image will work as post image.
                     */
                    if (isset($api_response_data['data']['output']['generated_image'])) {
                        $response_body['output']['poster'] = $api_response_data['data']['output']['generated_image'];
                    }
                    /**
                     * rendered_image and thumbnail both image are same. that is why one of
                     * both will be stored.
                     */
                    // TODO:: this file will only need for slider/3d gallery
//                    if (isset($api_response_data['data']['output']['rendered_image'])) {
//                        $response_body['output']['thumbnail'] = $api_response_data['data']['output']['rendered_image'];
//                    }
                }

                /**
                 * If thumbnail is not set yet, then look into result.
                 */
                // TODO:: this file will only need for slider/3d gallery
//                if (!isset($response_body['output']['thumbnail']) && isset($api_response_data['data']['thumbnail'])) {
//                    $response_body['output']['thumbnail'] = $api_response_data['data']['thumbnail'];
//                }
                /**
                 * If src is not set yet, then look into result.
                 */
                if (!isset($response_body['output']['src']) && isset($api_response_data['data']['result']['pbr_model']['url'])) {
                    $response_body['output']['src'] = $api_response_data['data']['result']['pbr_model']['url'];
                }
                /**
                 * If thumbnail is not set yet, then look into result.
                 */
                // TODO:: this file will only need for slider/3d gallery
//                if (!isset($response_body['output']['thumbnail']) && isset($api_response_data['data']['result']['rendered_image']['url'])) {
//                    $response_body['output']['thumbnail'] = $api_response_data['data']['result']['rendered_image']['url'];
//                }

            }
        }


        return $response_body;

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


    public static function download_model_files_files_and_store($files, $settings = [])
    {

        $file_path = isset($settings['temp_path']) ? $settings['temp_path'] : ATLAS_AR_CURRENT_MODEL_TEMP_DIR;
        $file_url = isset($settings['temp_url']) ? $settings['temp_url'] : ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL;

        if (isset($settings['post_id']) && !empty($settings['post_id'])) {
            $date = self::get_post_date($settings['post_id']);
            $file_path .= $date . '/';
            $file_url .= $date . '/';
        }


        // Make sure the directory exists
        if (!file_exists($file_path)) {
            wp_mkdir_p($file_path);
        }
        $uploaded_files = [];
        if (isset($files['src']) && !empty($files['src'])) {
            foreach ($files as $file_key => $url) {
                $response = wp_remote_get($url, ['timeout' => 90]);

                if (is_wp_error($response)) {
                    error_log(print_r("Failed to download $file_key: " . $response->get_error_message(), true));
                    continue;
                }

                $body = wp_remote_retrieve_body($response);

                if (empty($body)) {
                    error_log(print_r("Empty body for $file_key", true));
                    continue;
                }

                // Extract filename from URL
                $filename = basename(parse_url($url, PHP_URL_PATH));

                // Save file
                $file_full_path = trailingslashit($file_path) . $file_key . '__' . $filename;
                $file_full_url = trailingslashit($file_url) . $file_key . '__' . $filename;
                $saved = file_put_contents($file_full_path, $body);


                $uploaded_files[$file_key]['url'] = $file_full_url;
                $uploaded_files[$file_key]['path'] = $file_full_path;
            }
        }


        return $uploaded_files;
    }

    public static function exclude_sensitive_properties($product_settings)
    {

        // word to match inside the key
        $word = "exclude";

        // filter array
        $product_settings = array_filter($product_settings, function ($value, $key) use ($word) {
            return stripos($key, $word) === false; // keep only if $word not in key
        }, ARRAY_FILTER_USE_BOTH);

        return $product_settings;
    }

    public static function move_model_files_to_permanent_folder($temporary_model_data)
    {
        $files = $temporary_model_data['temp'];
        if (empty($files)) {
            return $temporary_model_data['temp']; // nothing to move
        }
        $final_files = [];
        foreach ($files as $file_key => $file_data) {
            $file_path = $file_data['path'];
            $file_url = $file_data['url'];
            if (!file_exists($file_path)) {
                continue; // skip if file not found
            }

            // remove "temp" from the path
            $target_path = str_replace('/temp/', '/', $file_path);
            $target_url = str_replace('/temp/', '/', $file_url);

            // make sure destination folder exists
            $target_dir = dirname($target_path);
            if (!is_dir($target_dir)) {
                wp_mkdir_p($target_dir);
            }

            // move file
            rename($file_path, $target_path);

            $final_files[$file_key]['path'] = $target_path;
            $final_files[$file_key]['url'] = $target_url;
        }

        return $final_files;
    }

    public static function get_post_date($post_id)
    {
        $post_date = get_post_field('post_date', $post_id);
        $date = date('Y/m/d', strtotime($post_date));

        return $date;
    }

    public static function update_cache_data($data, $post_id = '', $state = 'add')
    {
        $has_value_changed = isset($data['has_value_changed']) ? $data['has_value_changed'] : $data;
        $post_cache_data = get_option('get_cache_data');
        $post_cache_data = AR_TRY_ON_Cache::get('get_cache_data');
        if ($has_value_changed && $post_id) {
            if ($state === 'add') {
                $post_cache_data = is_array($post_cache_data) ? $post_cache_data : [];
                $post_cache_data[] = $post_id;
                update_option('get_cache_data', $post_cache_data);
                AR_TRY_ON_Cache::set('get_cache_data', $post_cache_data);
            } elseif ($state === 'remove' && is_array($post_cache_data)) {
                // Search for the item
                $index = array_search($post_id, $post_cache_data);

                if ($index !== false) {
                    unset($post_cache_data[$index]);
                    // Reindex the array if needed
                    $post_cache_data = array_values($post_cache_data);
                }

                update_option('get_cache_data', $post_cache_data);
                AR_TRY_ON_Cache::set('get_cache_data', $post_cache_data);
            }
        } elseif ($has_value_changed) {

            $post_cache_data = is_array($post_cache_data) ? $post_cache_data : [];
            // Search for the item
            $all_index = array_search('all', $post_cache_data);
            if ($all_index !== false) {
                unset($post_cache_data[$all_index]);
                // Reindex the array if needed
                $post_cache_data = array_values($post_cache_data);
                $post_cache_data[] = 'all_remove';
            }else{
                // Search for the item
                $all_remove_index = array_search('all_remove', $post_cache_data);

                if ($all_remove_index !== false) {
                    unset($post_cache_data[$all_remove_index]);
                    // Reindex the array if needed
                    $post_cache_data = array_values($post_cache_data);
                    $post_cache_data[] = 'all';
                }
            }

            if(!in_array('all', $post_cache_data) && !in_array('all_remove', $post_cache_data)) {
                $post_cache_data[] = 'all';
            }

            AR_TRY_ON_Cache::set('get_cache_data', $post_cache_data);

        }

        return $post_cache_data;
    }

}
