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

    /**
     * `[atlas_ar]` shortcode renderer and Gutenberg-block render path.
     *
     * Attributes (all have safe defaults so the shortcode never breaks
     * if the merchant omits them):
     *  - `reveal`       — "true" | "false". Default "true" (preserves
     *                     existing site behavior). When "false", the
     *                     `<model-viewer>` is NOT rendered inline and
     *                     only the Try-On / View-in-AR buttons appear.
     *  - `height`       — viewer height (any CSS length). Default 400px.
     *  - `width`        — viewer width (any CSS length). Default 500px.
     *  - `padding`      — wrapper padding (any CSS value). Default 0.
     *  - `margin`       — wrapper margin (any CSS value). Default 0.
     *  - `aspect_ratio` — optional CSS aspect-ratio (e.g. "1/1", "16/9").
     *                     When set, `height` is ignored and the viewer
     *                     sizes itself from `width` + `aspect_ratio`.
     *  - `position`     — legacy attribute, kept for backwards-compat.
     *
     * The Gutenberg block (`atlas/ar-shortcode`) emits this shortcode
     * with attributes set from the block's inspector controls. When
     * users type the shortcode manually they can pass any subset of
     * attributes; the defaults fill the rest.
     */
    public static function create_shortcode($attr, $content = '')
    {
        $attributes = shortcode_atts(array(
            'reveal'                 => 'true',
            'height'                 => '400px',
            'width'                  => '500px',
            'padding'                => '0',
            'margin'                 => '0',
            'aspect_ratio'           => '',
            'position'               => 'after',
            // AR-61: override the "View in AR" button text on a per-emit
            // basis. Empty → falls back to product metabox
            // `view_in_ar_label`, then the global translated default.
            // Example: `[atlas_ar button_label="See it in 3D"]`.
            'button_label'           => '',
            // Private: suppresses the Try-On overlay on face products.
            // Used internally by the WC gallery cube-toggle wrapper to
            // avoid emitting a duplicate Try-On button alongside the
            // gallery's own floating pill.
            'suppress_tryon_overlay' => '',
        ), $attr);

        $current_filter = current_filter();
        if (!AR_TRY_ON_Helper::is_ar_supported_post_type('shortcode')) {
            if ($current_filter === 'the_content') {
                return $content;
            }
            return '';
        }

        global $product, $post;
        $post_id = $product ? (int) $product->get_id() : (int) ($post->ID ?? 0);
        if (!$post_id) {
            return $current_filter === 'the_content' ? $content : '';
        }

        // Normalize `reveal` to a strict boolean. Any explicit "false" /
        // "0" / "no" / "off" / `false` boolean wins; everything else
        // (including the default empty case) falls back to reveal=true
        // so we never break an existing post.
        $reveal = filter_var($attributes['reveal'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($reveal === null) {
            $reveal = true;
        }

        // Detect face placement once so both branches can switch on it.
        $is_face   = false;
        $placement = '';
        if (class_exists('\\AR_TRY_ON\\AR_TRY_ON_Tryon')) {
            $placement = \AR_TRY_ON\AR_TRY_ON_Tryon::get_product_placement($post_id);
            $is_face   = \AR_TRY_ON\AR_TRY_ON_Tryon::is_face_placement($placement);
            $placement = apply_filters('atlas_ar_tryon_woocommerce_mode_for_product', $placement, $post_id);
        }

        // ── Branch 1: reveal=false → buttons-only ────────────────────
        if (!$reveal) {
            if ($is_face && class_exists('\\AR_TRY_ON\\AR_TRY_ON_Tryon')) {
                // Face product: dynamic-buttons block (Try-On + optional
                // View-in-AR). View-in-AR appears whenever the merchant
                // has show_static_viewer_for_tryon on OR the shortcode is
                // explicitly suppressed (reveal=false makes the AR
                // button the only secondary action).
                $tryon   = new \AR_TRY_ON\AR_TRY_ON_Tryon(defined('ATLAS_AR_VERSION') ? ATLAS_AR_VERSION : '0.0.0');
                $args    = array('wrapper_id_suffix' => 'shortcode');
                if (!empty($attributes['button_label'])) {
                    $args['button_label'] = (string) $attributes['button_label'];
                }
                return $tryon->build_dynamic_buttons_block(
                    $post_id,
                    $placement,
                    true, // always show View-in-AR alongside Try-On when reveal=false
                    $args
                );
            }
            // Non-face product: skip the inline viewer, let the existing
            // `atlas_ar_button` filter render the QR + View-in-AR button
            // wherever it normally runs. Returning empty here keeps the
            // shortcode location empty without disturbing other paths.
            return '';
        }

        // ── Branch 2: reveal=true → inline `<model-viewer>` ───────────
        // Build wrapper CSS from layout attributes. All values have
        // defaults so the wrapper always has a valid sizing strategy.
        $wrapper_style_parts = array();
        if ($attributes['padding'] !== '' && $attributes['padding'] !== null) {
            $wrapper_style_parts[] = 'padding:' . self::sanitize_css_value($attributes['padding']);
        }
        if ($attributes['margin'] !== '' && $attributes['margin'] !== null) {
            $wrapper_style_parts[] = 'margin:' . self::sanitize_css_value($attributes['margin']);
        }
        // `aspect_ratio` (if present) wins over `height`.
        if ($attributes['aspect_ratio'] !== '' && $attributes['aspect_ratio'] !== null) {
            $wrapper_style_parts[] = 'width:' . self::sanitize_css_value($attributes['width']);
            $wrapper_style_parts[] = 'aspect-ratio:' . self::sanitize_css_value($attributes['aspect_ratio']);
        } else {
            $wrapper_style_parts[] = 'height:' . self::sanitize_css_value($attributes['height']);
            $wrapper_style_parts[] = 'width:' . self::sanitize_css_value($attributes['width']);
        }
        $wrapper_style = implode(';', $wrapper_style_parts);

        // Try-On overlay button — rendered ABSOLUTELY positioned inside
        // the viewer wrapper for face products. Uses the same CSS-var
        // cascade as the WC gallery overlay, so the wp_footer sampler
        // gives it the active theme's primary button color.
        //
        // Suppressed when the shortcode is called from within the WC
        // gallery toggle wrapper ({@see \AR_TRY_ON\AR_TRY_ON::add_image_3d_toggle_to_gallery}) —
        // in that path the gallery's own floating pill (rendered by
        // {@see \AR_TRY_ON\AR_TRY_ON_Tryon::render_button_overlay}) is
        // the canonical Try-On entry-point, and emitting our shortcode
        // overlay too would produce a visible duplicate the moment the
        // shopper clicks the cube toggle. The flag is opt-in via the
        // `suppress_tryon_overlay` shortcode attribute (private —
        // merchants never type it).
        $tryon_overlay_html = '';
        $suppress_tryon_overlay = filter_var($attributes['suppress_tryon_overlay'] ?? '', FILTER_VALIDATE_BOOLEAN);
        if ($is_face
            && ! $suppress_tryon_overlay
            && class_exists('\\AR_TRY_ON\\AR_TRY_ON_Tryon')) {
            $tryon  = new \AR_TRY_ON\AR_TRY_ON_Tryon(defined('ATLAS_AR_VERSION') ? ATLAS_AR_VERSION : '0.0.0');
            $tryon->register_doc_root_sampler();

            $glb_src  = \AR_TRY_ON\AR_TRY_ON_Tryon::get_product_glb_src($post_id);
            $settings = \AR_TRY_ON\AR_TRY_ON_Tryon::get_settings();
            $tryon_overlay_html = sprintf(
                '<button type="button" product-id="%1$d" class="ar_vr_3d_model_try_on art-tryon-image-overlay atlas-ar-shortcode-overlay" data-mode="%2$s" data-glb-src="%3$s" aria-label="%4$s">%5$s</button>',
                $post_id,
                esc_attr($placement),
                esc_url($glb_src),
                esc_attr__('Try this on with your webcam', 'ar-vr-3d-model-try-on'),
                esc_html($settings['tryon_button_label'])
            );
        }

        ob_start();
        ?>
        <div class="atlas-ar-shortcode-outer">
            <div class="atlas-ar-shortcode-wrap" style="position:relative;<?php echo esc_attr($wrapper_style); ?>">
                <div style="height:100%;width:100%;"
                     id="atlas_ar_shortcode_<?php echo esc_attr($post_id) ?>"></div>
                <?php echo $tryon_overlay_html; ?>
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
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Minimal CSS-value sanitiser for shortcode attributes. Strips
     * angle brackets and JavaScript-protocol sneaks; allows any
     * alphanumeric / dot / dash / percent / parens / space / slash /
     * comma / hash combination (which covers every legitimate CSS
     * length, color, calc(), and aspect-ratio value).
     */
    private static function sanitize_css_value($value)
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

    public static function is_qr_code_enabled($settings = [])
    {
        if (empty($settings)) {
            $settings = self::get_settings();
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

        // Brand label rendered below the QR image. Filterable so Pro
        // can short-circuit it to an empty string ("watermark-free" on
        // paid sites). Default value carries the AtlasAR brand on
        // Free installs.
        $brand_label = (string) apply_filters( 'atlas_ar_qr_brand_label', 'AtlasAR' );

        ob_start();
        ?>
        <div id="atlas_ar_qr_code">

        </div>
        <script>
            // The qrcode lib (`ar-try-on-qr-generator.min.js`) is
            // deferred, so it may not be available the first time this
            // inline script runs. Poll up to ~5 s on a 100 ms interval
            // and bail cleanly once we either render or run out of
            // tries. Single-fire `setTimeout` was missing the QR on
            // pages that emit this inline script late in the body
            // (e.g., WC product pages where the div lives in
            // `wp_footer`, after the head-deferred lib promise).
            (function () {
                var typeNumber = 0;
                var errorCorrectionLevel = 'L';
                var tries = 0;
                var maxTries = 50;
                // Brand label HTML — empty when Pro hooks
                // `atlas_ar_qr_brand_label` to return ''.
                var brandLabel = <?php echo wp_json_encode( $brand_label ); ?>;
                var brandHtml = brandLabel
                    ? '<div class="atlas_ar_qr_brand">' + brandLabel + '</div>'
                    : '';
                var qrcodeInterval = setInterval(function () {
                    tries++;
                    if (window.qrcode) {
                        clearInterval(qrcodeInterval);
                        var qr = qrcode(typeNumber, errorCorrectionLevel);
                        qr.addData("<?php echo esc_url($url) ?>");
                        qr.make();
                        var target = document.getElementById("atlas_ar_qr_code");
                        if (!target) return;
                        target.innerHTML = '<button id="ar_close_btn">&times;</button>' + qr.createImgTag() + brandHtml;
                        var closeBtn = document.getElementById("ar_close_btn");
                        if (closeBtn) {
                            closeBtn.addEventListener("click", function () {
                                target.style.display = "none";
                            });
                        }
                    } else if (tries >= maxTries) {
                        clearInterval(qrcodeInterval);
                    }
                }, 100);
            })();
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
            'ar_try_on_wc_hook_position' => "product_image",
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
            // AR-61: skybox emptied by default — the legacy spruit_sunrise
            // HDR was tinting reflective whites pink/orange on customer
            // products (k-tools.de feedback, 13 May 2026). `environment_image`
            // now defaults to model-viewer's built-in `neutral` preset, a
            // pure grey IBL that preserves the GLB's true material colors.
            'skybox_image' => '',
            'environment_image' => 'neutral',
            // model-viewer tone-mapping: `neutral` keeps colors close to the
            // source PBR materials. Was previously implicit (filmic default).
            'tone_mapping' => 'neutral',
            'exposure' => '1',
            // Camera settings
            'auto_rotate' => false,
            'shadow_intensity' => '1',
            'camera_orbit' => '45deg 55deg 4m',
            'disable_zoom' => false,
            'disable_tap' => false,
            // AR-61: rotation hint that says "drag to rotate" on first
            // visit. `auto` shows the wiggle gesture once after
            // `interaction_prompt_threshold` ms of inactivity. Shoppers
            // who don't know the model is interactive now get a visible
            // cue. Merchant can set to `none` per product to suppress.
            'interaction_prompt' => 'auto',
            'interaction_prompt_style' => 'wiggle',
            'interaction_prompt_threshold' => '2000',
            // Canvas settings
            'canvas_alignment' => 'left',
            'canvas_width' => '100%',
            'canvas_height' => '400px',
            'canvas_margin' => '0',
            'canvas_padding' => '2px 0',
            'custom_css' => '',
            // AR-61: per-product "View in AR" button label override.
            // Empty → falls back to translated default. Merchants can
            // localize the CTA without editing theme files. The shortcode
            // attribute `button_label="..."` overrides this on a single
            // emit.
            'view_in_ar_label' => '',
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
                // Optimized: Use array_filter instead of array_search + unset + array_values
                // This is more efficient - single pass O(n) instead of multiple passes
                $post_cache_data = array_values(array_filter($post_cache_data, function($id) use ($post_id) {
                    return $id != $post_id;
                }));

                update_option('get_cache_data', $post_cache_data);
                AR_TRY_ON_Cache::set('get_cache_data', $post_cache_data, 12 * HOUR_IN_SECONDS);
            }
        } elseif ($has_value_changed) {

            $post_cache_data = is_array($post_cache_data) ? $post_cache_data : [];

            // Optimized: Use in_array check first, then array_filter for removal
            if (in_array('all', $post_cache_data)) {
                // Remove 'all' and add 'all_remove' in one operation
                $post_cache_data = array_values(array_filter($post_cache_data, function($item) {
                    return $item !== 'all';
                }));
                $post_cache_data[] = 'all_remove';
            } elseif (in_array('all_remove', $post_cache_data)) {
                // Remove 'all_remove' and add 'all' in one operation
                $post_cache_data = array_values(array_filter($post_cache_data, function($item) {
                    return $item !== 'all_remove';
                }));
                $post_cache_data[] = 'all';
            }

            // Add 'all' if neither exists
            if(!in_array('all', $post_cache_data) && !in_array('all_remove', $post_cache_data)) {
                $post_cache_data[] = 'all';
            }

            AR_TRY_ON_Cache::set('get_cache_data', $post_cache_data, 12 * HOUR_IN_SECONDS);

        }

        return $post_cache_data;
    }

    public static function is_pro_active() {

        // Freemius gate — trial active OR paid license.
        // The `__premium_only` suffix tells the Freemius deploy script
        // to strip this entire block from the Free zip, so on Free
        // builds this method always returns false after trial expiry.
        if ( function_exists( 'av3mto_fs' ) && av3mto_fs()->can_use_premium_code__premium_only() ) {
            return true;
        }

        return false;

        // Legacy folder-based detection — superseded by the Freemius
        // gate above. Kept commented for reference.
        //
        // if (!function_exists('is_plugin_active')) {
        //     include_once ABSPATH . 'wp-admin/includes/plugin.php';
        // }
        //
        // $pro_plugins = [
        //     'ar-vr-3d-model-try-on-pro/ar-vr-3d-model-try-on-premium.php',
        //     'ar-vr-3d-model-try-on-premium/ar-vr-3d-model-try-on-premium.php',
        // ];
        //
        // $status = false;
        //
        // foreach ($pro_plugins as $plugin) {
        //     if (is_plugin_active($plugin)) {
        //         $status = true;
        //         break; // Exit loop as soon as one active plugin is found
        //     }
        // }
        //
        // return $status;
    }

    /**
     * Get the effective "Show Button In" setting for a product
     * Priority: Product metabox setting > Global setting
     *
     * @since 1.8.2
     * @param int $post_id Product/Post ID
     * @return string The hook position value (1-7, 'product_image', '3d_viewer', or empty)
     */
    public static function get_effective_show_button_in($post_id) {
        // Get product-specific settings
        $product_settings = (array) get_post_meta($post_id, 'ar_try_on_product_settings', true);

        // Check if product has a specific setting (not 'global')
        if (isset($product_settings['show_button_in']) && $product_settings['show_button_in'] !== 'global') {
            return $product_settings['show_button_in'];
        }

        // Fall back to global settings
        $global_settings = self::get_settings();

        if (isset($global_settings['ar_try_on_wc_hook_position'])) {
            return $global_settings['ar_try_on_wc_hook_position'];
        }

        // Default to 'product_image'
        return 'product_image';
    }

    /**
     * Check if the display mode is toggle-based (product_image or 3d_viewer)
     *
     * @since 1.8.2
     * @param string $mode The display mode value
     * @return bool True if toggle mode
     */
    public static function is_toggle_display_mode($mode) {
        return in_array($mode, ['product_image', '3d_viewer'], true);
    }

    /**
     * Check if a product has a 3D model attached
     *
     * @since 1.8.2
     * @param int $post_id Product/Post ID
     * @return bool True if product has 3D model
     */
    public static function has_3d_model($post_id) {
        $product_settings = (array) get_post_meta($post_id, 'ar_try_on_product_settings', true);

        return isset($product_settings['src']) && !empty($product_settings['src']);
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


}
