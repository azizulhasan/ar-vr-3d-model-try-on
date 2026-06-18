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
            // Non-face product: render the View-in-AR button right here,
            // at the shortcode location, instead of relying on the
            // ambient `atlas_ar_button` filter. Returning empty was a
            // dead-end whenever the merchant placed `[atlas_ar
            // reveal="false"]` on a floor/wall post — they saw nothing.
            // AR-61 also adds `button_label="..."` support which only
            // works if this branch actually emits a button.
            if (class_exists('\\AR_TRY_ON\\AR_TRY_ON_Tryon')) {
                $tryon = new \AR_TRY_ON\AR_TRY_ON_Tryon(defined('ATLAS_AR_VERSION') ? ATLAS_AR_VERSION : '0.0.0');
                $args  = array(
                    'wrapper_id_suffix' => 'shortcode',
                    'show_tryon'        => false,
                    'view_in_ar_style'  => 'primary',
                );
                if (!empty($attributes['button_label'])) {
                    $args['button_label'] = (string) $attributes['button_label'];
                }
                // Mark this post so AR_TRY_ON_Public::atlas_ar_button
                // doesn't emit a second View-in-AR via the auto-display
                // path below the content.
                if (class_exists('\\AR_TRY_ON_Public\\AR_TRY_ON_Public')) {
                    \AR_TRY_ON_Public\AR_TRY_ON_Public::mark_button_rendered($post_id);
                }
                return $tryon->build_dynamic_buttons_block(
                    $post_id,
                    $placement,
                    true,
                    $args
                );
            }
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
                '<button type="button" data-product-id="%1$d" class="ar_vr_3d_model_try_on art-tryon-image-overlay atlas-ar-shortcode-overlay" data-mode="%2$s" data-glb-src="%3$s" aria-label="%4$s">%5$s</button>',
                $post_id,
                esc_attr($placement),
                esc_url($glb_src),
                esc_attr__('Try this on with your webcam', 'ar-vr-3d-model-try-on'),
                esc_html($settings['tryon_button_label'])
            );
        }

        // The model-viewer reveal used to run from an inline
        // <script type="module"> here; it now lives in the enqueued
        // public/js/ar-shortcode-reveal.js (registered in
        // AR_TRY_ON_Public::enqueue_scripts alongside AtlasAR), which finds
        // every `.atlas-ar-shortcode-reveal[data-product-id]` placeholder and
        // injects the AtlasAR skeleton. Removing the inline script lets the
        // shortcode markup pass cleanly through wp_kses() at the echo sites.

        ob_start();
        ?>
        <div class="atlas-ar-shortcode-outer">
            <div class="atlas-ar-shortcode-wrap" style="position:relative;<?php echo esc_attr($wrapper_style); ?>">
                <div class="atlas-ar-shortcode-reveal" style="height:100%;width:100%;"
                     id="atlas_ar_shortcode_<?php echo esc_attr($post_id) ?>"
                     data-atlas-product-id="<?php echo esc_attr($post_id) ?>"></div>
                <?php echo wp_kses( $tryon_overlay_html, self::allowed_html( 'overlay' ) ); ?>
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

    /**
     * Sanitize the per-product `custom_css` model setting.
     *
     * Reviewer item 1 (2026-06 wp.org closure): `custom_css` was persisted
     * from the `/get_model_and_settings` REST write with no restriction and
     * applied on the front-end, which is a stored CSS/markup injection
     * vector. Legitimate CSS never contains `<`/`>`, so stripping HTML tags
     * is lossless for real stylesheets but neutralises any
     * `</style><script>…` breakout attempt. The companion output sink in
     * `src/context/utilities.js` assigns this to a `<style>` element via
     * `textContent` (not `innerHTML`) so even an already-stored payload from
     * an older release cannot break out.
     *
     * @param string $css Raw CSS from the request / stored meta.
     * @return string Tag-free, length-capped CSS safe to store and apply.
     */
    public static function sanitize_custom_css($css)
    {
        // sanitize_textarea_field() is the documented sanitizer for
        // multi-line text: it runs wp_strip_all_tags() (so a
        // `</style><script>…` breakout becomes harmless text), keeps
        // newlines (CSS stays readable) and normalises UTF-8.
        $css = sanitize_textarea_field((string) $css);
        // Per-product viewer CSS is small; bound the stored size.
        if (strlen($css) > 5000) {
            $css = substr($css, 0, 5000);
        }
        return $css;
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

        // Output only an escapable placeholder div carrying the page URL
        // and brand label as data attributes. The QR itself is built at
        // runtime by the enqueued `ar-qr-init.js` (which reads these
        // attributes) — no inline <script>, so callers can wp_kses() the
        // output instead of relying on a phpcs:ignore.
        $ar_button_content = sprintf(
            '<div id="atlas_ar_qr_code" data-atlas-qr-url="%s" data-atlas-qr-brand="%s"></div>',
            esc_url( $url ),
            esc_attr( $brand_label )
        );

        return $ar_button_content;
    }

    /**
     * Context-specific allowed-HTML maps for echoing server-built markup
     * through wp_kses().
     *
     * Centralises the per-context allow-lists so every "echo server-built
     * HTML" call site in the plugin can share one escaping helper instead
     * of an ad-hoc map (or a phpcs:ignore) at each site:
     *
     *     echo wp_kses( $html, AR_TRY_ON_Helper::allowed_html( 'qr' ) );
     *
     * IMPORTANT: wp_kses HTML-encodes characters inside `<script>` (e.g.
     * `>` becomes `&gt;`), which breaks inline JavaScript. Markup that
     * needs an inline `<script>` must first move that script to an
     * enqueued file (see `public/js/ar-qr-init.js`); only the remaining
     * script-free markup can be passed through wp_kses() with one of
     * these maps. None of the contexts below allow `<script>`.
     *
     * @since 2.2.0
     * @param string $context Which markup is being escaped. One of:
     *                        'qr', 'model_viewer', 'ar_button', 'overlay'.
     * @return array wp_kses allowed-HTML map.
     */
    public static function allowed_html( $context = 'qr' )
    {
        // Attributes every wrapper element may carry.
        $global = array(
            'id'    => true,
            'class' => true,
            'style' => true,
            'title' => true,
            'role'  => true,
        );

        switch ( $context ) {
            case 'qr':
                $allowed = array(
                    'div'    => $global + array(
                        'data-atlas-qr-url'   => true,
                        'data-atlas-qr-brand' => true,
                    ),
                    'button' => $global + array( 'type' => true, 'aria-label' => true ),
                    'span'   => $global,
                    'img'    => $global + array( 'src' => true, 'alt' => true, 'width' => true, 'height' => true ),
                );
                break;

            case 'model_viewer':
                // Google's <model-viewer> web component + its wrapper markup.
                $allowed = array(
                    'div'          => $global + array(
                        'data-thumb'        => true,
                        'data-thumb-alt'    => true,
                        'data-thumb-srcset' => true,
                        'data-thumb-sizes'  => true,
                    ),
                    'span'         => $global,
                    'a'            => $global + array( 'href' => true, 'target' => true, 'rel' => true ),
                    'button'       => $global + array( 'type' => true, 'aria-label' => true ),
                    'img'          => $global + array( 'src' => true, 'srcset' => true, 'sizes' => true, 'alt' => true, 'width' => true, 'height' => true, 'loading' => true ),
                    'source'       => array( 'src' => true, 'srcset' => true, 'sizes' => true, 'type' => true ),
                    'model-viewer' => $global + array(
                        'src'                 => true,
                        'ios-src'             => true,
                        'alt'                 => true,
                        'poster'              => true,
                        'seamless-poster'     => true,
                        'ar'                  => true,
                        'ar-modes'            => true,
                        'ar-scale'            => true,
                        'ar-placement'        => true,
                        'camera-controls'     => true,
                        'auto-rotate'         => true,
                        'auto-rotate-delay'   => true,
                        'rotation-per-second' => true,
                        'camera-orbit'        => true,
                        'camera-target'       => true,
                        'field-of-view'       => true,
                        'min-camera-orbit'    => true,
                        'max-camera-orbit'    => true,
                        'min-field-of-view'   => true,
                        'max-field-of-view'   => true,
                        'environment-image'   => true,
                        'skybox-image'        => true,
                        'exposure'            => true,
                        'shadow-intensity'    => true,
                        'shadow-softness'     => true,
                        'loading'             => true,
                        'reveal'              => true,
                        'disable-tap'         => true,
                        'disable-zoom'        => true,
                        'interaction-prompt'  => true,
                        'touch-action'        => true,
                        'tone-mapping'        => true,
                        'autoplay'            => true,
                        'data-js-focus-visible' => true,
                    ),
                );
                break;

            case 'overlay':
                // The standalone Try-On overlay button: a plain <button> whose
                // only child is an escaped text label (no SVG, no script).
                $allowed = array(
                    'button' => $global + array(
                        'type'            => true,
                        'data-product-id' => true,
                        'data-mode'       => true,
                        'data-glb-src'    => true,
                        'aria-label'      => true,
                    ),
                    'span'   => $global,
                );
                break;

            case 'ar_button':
                // "View in AR" / Try-On dynamic-buttons block: wrapper divs +
                // <button>s (Try-On carries data-mode/data-glb-src) + label and
                // icon <span>s. Icons are CSS mask-image spans (no inline SVG),
                // so only div/span/button markup needs to be allowed here.
                $allowed = array(
                    'div'    => $global,
                    'span'   => $global + array( 'aria-hidden' => true ),
                    'button' => $global + array(
                        'type'            => true,
                        'aria-label'      => true,
                        'data-product-id' => true,
                        'data-mode'       => true,
                        'data-glb-src'    => true,
                    ),
                );
                break;

            case 'shortcode':
                // `[atlas_ar]` reveal=true markup: nested wrapper <div>s + the
                // empty `.atlas-ar-shortcode-reveal` placeholder (filled at
                // runtime by ar-shortcode-reveal.js) + the optional Try-On
                // overlay <button>. Also covers the hidden toggle source
                // container, which carries the per-product data attributes.
                $allowed = array(
                    'div'    => $global + array(
                        'data-atlas-product-id'    => true,
                        'data-atlas-display-mode'  => true,
                        // WooCommerce gallery item (the 3D poster wrapper).
                        'data-thumb'               => true,
                        'data-thumb-alt'           => true,
                        'data-thumb-srcset'        => true,
                        'data-thumb-sizes'         => true,
                        'data-atlas-default-srcset' => true,
                    ),
                    'span'   => $global,
                    'button' => $global + array(
                        'type'            => true,
                        'data-product-id' => true,
                        'data-mode'       => true,
                        'data-glb-src'    => true,
                        'aria-label'      => true,
                    ),
                );
                break;

            default:
                $allowed = array();
        }

        /**
         * Filter the allowed-HTML map for a given echo context, so Pro and
         * add-ons can extend (or restrict) what their markup may output.
         *
         * @since 2.2.0
         * @param array  $allowed wp_kses allowed-HTML map.
         * @param string $context Context key.
         */
        return apply_filters( 'atlas_ar_allowed_html', $allowed, $context );
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
            // AR-61: store-wide default for the "View in AR" CTA text.
            // The per-product metabox `view_in_ar_label` and the
            // `button_label="..."` shortcode attribute both override
            // this on a finer-grained scope. Resolution order in
            // `build_dynamic_buttons_block`: shortcode → product meta →
            // this setting → "View in AR" hard fallback.
            'ar_try_on_view_in_ar_label' => 'View in AR',
            // AR-61: store-wide defaults for the model-viewer
            // `interaction-prompt*` attributes — the wiggle / basic
            // gesture cue that tells shoppers the model is rotatable.
            // Per-product meta keys (`interaction_prompt`,
            // `interaction_prompt_style`, `interaction_prompt_threshold`)
            // override these.
            'ar_try_on_interaction_prompt'           => 'auto',
            'ar_try_on_interaction_prompt_style'     => 'wiggle',
            'ar_try_on_interaction_prompt_threshold' => '2000',
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
            // visit. All three per-product fields default to EMPTY so
            // the global settings (`ar_try_on_interaction_prompt`,
            // `ar_try_on_interaction_prompt_style`,
            // `ar_try_on_interaction_prompt_threshold`) drive the
            // behavior. Per-product values override individually.
            'interaction_prompt'           => '',
            'interaction_prompt_style'     => '',
            'interaction_prompt_threshold' => '',
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
        // Tripo3D's `text_to_model` and `image_to_model` task responses
        // share the same `data.output` shape (pbr_model, generated_image,
        // rendered_image). Prior to AR-62 only text_to_model was handled
        // — image_to_model responses returned an empty body and the
        // metabox polling loop never exited (Joachim Rodriguez,
        // 2026-06-07).
        if (isset($request_decoded_data['api_name'], $request_decoded_data['body']['type'])
            && $request_decoded_data['api_name'] == "tripo3d"
            && in_array($request_decoded_data['body']['type'], array('text_to_model', 'image_to_model'), true)
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

                // AR-62 §3: surface Tripo3D's live task state to JS so
                // the polling loop can exit on `failed` / `banned` /
                // `expired` and render a real progress percentage / ETA
                // in the button label instead of guessing.
                if (isset($api_response_data['data']['status'])) {
                    $response_body['status'] = (string) $api_response_data['data']['status'];
                }
                if (isset($api_response_data['data']['progress'])) {
                    $response_body['progress'] = (int) $api_response_data['data']['progress'];
                }
                if (isset($api_response_data['data']['running_left_time'])) {
                    $response_body['running_left_time'] = (int) $api_response_data['data']['running_left_time'];
                }
                if (isset($api_response_data['data']['queuing_num'])) {
                    $response_body['queuing_num'] = (int) $api_response_data['data']['queuing_num'];
                }
                if (isset($api_response_data['data']['error_code']) && $api_response_data['data']['error_code']) {
                    $response_body['error_code'] = (int) $api_response_data['data']['error_code'];
                }
                if (isset($api_response_data['data']['error_msg']) && $api_response_data['data']['error_msg']) {
                    $response_body['error_msg'] = (string) $api_response_data['data']['error_msg'];
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
                 * Poster fallback for image_to_model. Tripo3D's
                 * image_to_model response does NOT include
                 * `generated_image` — that field is text_to_model-only.
                 * The natural preview for an image_to_model run is the
                 * input image itself; download_model_files_and_store
                 * will fetch it into the post's uploads folder so the
                 * stored URL is stable and self-hosted. Without this
                 * fallback the post's model-viewer poster stays empty
                 * after save (customer report 2026-06-08).
                 *
                 * Tripo3D's `rendered_image` is a textured 3D preview
                 * (WebP) — second-best fallback if Tripo ever omits the
                 * input echo.
                 */
                if (!isset($response_body['output']['poster'])
                    && $request_decoded_data['body']['type'] === 'image_to_model'
                ) {
                    if (isset($request_decoded_data['body']['file']['url'])
                        && ! empty($request_decoded_data['body']['file']['url'])
                    ) {
                        $response_body['output']['poster'] = $request_decoded_data['body']['file']['url'];
                    } elseif (isset($api_response_data['data']['output']['rendered_image'])) {
                        $response_body['output']['poster'] = $api_response_data['data']['output']['rendered_image'];
                    } elseif (isset($api_response_data['data']['result']['rendered_image']['url'])) {
                        $response_body['output']['poster'] = $api_response_data['data']['result']['rendered_image']['url'];
                    }
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


    /**
     * Reviewer item 2 (path traversal): confirm a candidate file path stays
     * inside the plugin's model directory (uploads/atlas_ar/). Gates the
     * write sites whose destination is built from request-supplied
     * `temp_path` / `path` values.
     *
     * The file itself need not exist yet — the parent dir (created via
     * wp_mkdir_p before the write) is resolved with realpath() so symlinks
     * and `..` segments are collapsed, then prefix-checked against the
     * model-dir anchor.
     *
     * @param string $path Absolute candidate file path.
     * @return bool True only if the resolved path is within ATLAS_AR_MODEL_DIR.
     */
    public static function path_is_within_model_dir($path)
    {
        $path = wp_normalize_path((string) $path);
        if ($path === '' || strpos($path, '../') !== false) {
            return false;
        }
        $real_anchor = realpath(ATLAS_AR_MODEL_DIR);
        if ($real_anchor === false) {
            return false;
        }
        $anchor = trailingslashit(wp_normalize_path($real_anchor));
        // The target file/dir may not exist yet. Walk up to the nearest
        // existing ancestor and realpath() that (collapsing any symlinks in
        // the real portion); combined with the `../` rejection above, a path
        // whose existing ancestor is inside the anchor cannot escape it.
        $ancestor = $path;
        while (!file_exists($ancestor) && dirname($ancestor) !== $ancestor) {
            $ancestor = dirname($ancestor);
        }
        $real_ancestor = realpath($ancestor);
        if ($real_ancestor === false) {
            return false;
        }
        $real_ancestor = trailingslashit(wp_normalize_path($real_ancestor));
        return strpos($real_ancestor, $anchor) === 0;
    }

    public static function download_model_files_and_store($files, $settings = [])
    {
        // Anchor the base dir to the model dir. A caller-supplied temp_path
        // is honoured ONLY if it resolves inside uploads/atlas_ar/; anything
        // else falls back to the trusted server default (path traversal).
        $file_path = ATLAS_AR_CURRENT_MODEL_TEMP_DIR;
        $file_url  = ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL;
        if (isset($settings['temp_path']) && $settings['temp_path'] !== '') {
            $candidate    = wp_normalize_path((string) $settings['temp_path']);
            $anchor_lexic = wp_normalize_path(ATLAS_AR_MODEL_DIR);
            if (strpos($candidate, '../') === false && strpos($candidate, $anchor_lexic) === 0) {
                $file_path = $settings['temp_path'];
                $file_url  = isset($settings['temp_url']) ? $settings['temp_url'] : ATLAS_AR_CURRENT_MODEL_TEMP_DIR_URL;
            }
        }

        if (isset($settings['post_id']) && !empty($settings['post_id'])) {
            $date = self::get_post_date($settings['post_id']);
            $file_path .= $date . '/';
            $file_url .= $date . '/';
        }

        // Make sure the directory exists.
        wp_mkdir_p($file_path);

        // Use the WP Filesystem API for the actual write instead of a raw
        // file_put_contents() (wp.org reviewer item 2 + WP coding standards).
        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }

        $uploaded_files = [];
        if (!empty($wp_filesystem) && isset($files['src']) && !empty($files['src'])) {
            foreach ($files as $file_key => $url) {
                $response = wp_remote_get($url, ['timeout' => 90]);

                if (is_wp_error($response)) {
                    // Skip on error — no debug logging in production.
                    continue;
                }

                $body = wp_remote_retrieve_body($response);

                if (empty($body)) {
                    continue;
                }

                // Sanitise the array key and the URL-derived filename so they
                // cannot smuggle path separators / `..` into the destination.
                $safe_key      = sanitize_file_name((string) $file_key);
                $filename      = sanitize_file_name(basename(wp_parse_url($url, PHP_URL_PATH)));
                $file_full_path = trailingslashit($file_path) . $safe_key . '__' . $filename;
                $file_full_url  = trailingslashit($file_url) . $safe_key . '__' . $filename;

                // Final defence: never write outside the model directory.
                if (!self::path_is_within_model_dir($file_full_path)) {
                    continue;
                }

                if (!$wp_filesystem->put_contents($file_full_path, $body, FS_CHMOD_FILE)) {
                    continue;
                }

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

            // Reviewer item 2 (path traversal): both the source (from
            // request-supplied temp metadata) and the derived destination
            // must stay inside uploads/atlas_ar/ — skip the file otherwise.
            if ( ! self::path_is_within_model_dir( $file_path ) || ! self::path_is_within_model_dir( $target_path ) ) {
                continue;
            }

            // make sure destination folder exists
            $target_dir = dirname($target_path);
            if (!is_dir($target_dir)) {
                wp_mkdir_p($target_dir);
            }

            // Move via the WP Filesystem API (no raw copy()/file ops).
            global $wp_filesystem;
            if ( empty( $wp_filesystem ) ) {
                require_once ABSPATH . 'wp-admin/includes/file.php';
                WP_Filesystem();
            }
            if ( empty( $wp_filesystem ) ) {
                continue; // can't write safely without the filesystem API
            }
            if ( method_exists( $wp_filesystem, 'move' ) && $wp_filesystem->move( $file_path, $target_path, true ) ) {
                // moved
            } elseif ( $wp_filesystem->copy( $file_path, $target_path, true, FS_CHMOD_FILE ) ) {
                wp_delete_file( $file_path );
            }

            $final_files[$file_key]['path'] = $target_path;
            $final_files[$file_key]['url'] = $target_url;
        }

        return $final_files;
    }

    public static function get_post_date($post_id)
    {
        $post_date = get_post_field('post_date', $post_id);
        $date = gmdate('Y/m/d', strtotime($post_date));

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

    /**
     * Default descriptors for the dashboard's top-level navigation.
     *
     * Each entry is `{ id, label, icon? }`. Order in the array is the
     * order shown in the dashboard sidebar. React reads this from
     * `ar_try_on.dashboard_tabs` (localized).
     *
     * Pro appends its own entries (e.g. "Bulk Compression", "Analytics")
     * via the `atlas_ar_dashboard_settings_tabs` filter. The React
     * dashboard maps unknown `id`s to either a Pro-provided component
     * (when Pro localizes one alongside) or to a graceful "feature is
     * available in Pro" badge slot.
     *
     * @since AR-61 §1.1 Phase 3
     * @return array<int,array{id:string,label:string,icon?:string}>
     */
    public static function dashboard_settings_tabs() {
        $free_tabs = array(
            array( 'id' => 'overview',      'label' => 'Overview' ),
            array( 'id' => 'settings',      'label' => 'Settings' ),
            array( 'id' => 'integration',   'label' => 'Integration' ),
            array( 'id' => 'features',      'label' => 'Features' ),
            array( 'id' => 'documentation', 'label' => 'Documentation' ),
            array( 'id' => 'contact',       'label' => 'Contact Us' ),
        );

        /**
         * Filter: atlas_ar_dashboard_settings_tabs
         *
         * Lets Pro and add-ons append tabs to the React dashboard.
         * Returning an entry whose `id` matches an existing one
         * replaces that entry (last-write-wins). Returning new ids
         * appends them after the Free defaults.
         *
         * @param array<int,array{id:string,label:string,icon?:string}> $tabs
         */
        $tabs = apply_filters( 'atlas_ar_dashboard_settings_tabs', $free_tabs );

        // Defensive: shape-check each entry; drop anything malformed.
        if ( ! is_array( $tabs ) ) {
            $tabs = $free_tabs;
        }
        $clean = array();
        foreach ( $tabs as $tab ) {
            if ( ! is_array( $tab ) || empty( $tab['id'] ) || empty( $tab['label'] ) ) {
                continue;
            }
            $clean[] = array(
                'id'    => (string) $tab['id'],
                'label' => (string) $tab['label'],
                'icon'  => isset( $tab['icon'] ) ? (string) $tab['icon'] : '',
            );
        }
        return $clean;
    }

    /**
     * Default descriptors for the per-product metabox section list.
     *
     * Each entry is `{ id, label, kind }` where `kind` is one of:
     *   - 'editor' — Free ships a real editor for this section. The
     *                React metabox renders the matching component.
     *   - 'pro'    — the feature is Pro-only. Free's React component
     *                renders a <PremiumBadge>; Pro replaces it with
     *                the real editor either by adding its own React
     *                runtime or by adjusting the entry to 'editor'.
     *
     * @since AR-61 §1.1 Phase 3
     * @return array<int,array{id:string,label:string,kind:string}>
     */
    public static function metabox_sections() {
        $free_sections = array(
            array( 'id' => 'content',     'label' => 'Content',          'kind' => 'editor' ),
            array( 'id' => 'style',       'label' => 'Style',            'kind' => 'editor' ),
            array( 'id' => 'camera',      'label' => 'Camera',           'kind' => 'editor' ),
            array( 'id' => 'light',       'label' => 'Light & Environment', 'kind' => 'editor' ),
            array( 'id' => 'integration', 'label' => 'Integration',      'kind' => 'editor' ),
            array( 'id' => 'compression', 'label' => 'Model Compression', 'kind' => 'editor' ),
            // Pro-only sections: Free ships the section file as a
            // PremiumBadge slot; Pro registers an 'editor' override.
            array( 'id' => 'dimensions',  'label' => 'Dimensions', 'kind' => 'pro' ),
            array( 'id' => 'hotspots',    'label' => 'Hotspots',   'kind' => 'pro' ),
            array( 'id' => 'slider',      'label' => 'Slider',     'kind' => 'pro' ),
        );

        /**
         * Filter: atlas_ar_metabox_sections
         *
         * Lets Pro upgrade Pro-only sections to 'editor' kind (by
         * returning the same `id` with `kind = 'editor'`) and append
         * new sections (e.g. variation-models editor in Pro).
         *
         * @param array<int,array{id:string,label:string,kind:string}> $sections
         */
        $sections = apply_filters( 'atlas_ar_metabox_sections', $free_sections );

        if ( ! is_array( $sections ) ) {
            $sections = $free_sections;
        }
        $clean = array();
        foreach ( $sections as $section ) {
            if ( ! is_array( $section ) || empty( $section['id'] ) || empty( $section['label'] ) ) {
                continue;
            }
            $kind = isset( $section['kind'] ) ? (string) $section['kind'] : 'editor';
            if ( ! in_array( $kind, array( 'editor', 'pro' ), true ) ) {
                $kind = 'editor';
            }
            $clean[] = array(
                'id'    => (string) $section['id'],
                'label' => (string) $section['label'],
                'kind'  => $kind,
            );
        }
        return $clean;
    }

    /**
     * The list of 3D-model file formats this site can compress.
     *
     * Free returns the formats it natively supports — `glb` and `gltf`,
     * which are what `admin/js/ar-compression-client.js` can run through
     * the browser-side gltf-transform pipeline.
     *
     * Pro adds its own formats (FBX, OBJ, USDZ) by hooking the
     * `atlas_ar_supported_formats` filter and pushing extra entries.
     * The filter shape is intentionally simple — a flat array of lower-
     * case file-extension strings, no leading dot — so anyone hooking it
     * can do array_merge without thinking about associative-vs-numeric
     * keys.
     *
     * @since AR-61 §1.1 Phase 3
     * @return array<int,string> Lower-case file extensions, no leading dot.
     *                           Order is "Free formats first, hooked
     *                           formats appended" but consumers should
     *                           not depend on order.
     */
    public static function supported_formats() {
        $free_formats = array( 'glb', 'gltf' );

        /**
         * Filter: atlas_ar_supported_formats
         *
         * Lets Pro and third-party add-ons register additional 3D-model
         * file formats. Pro v3.x adds FBX, OBJ, USDZ via its format
         * converter.
         *
         * @param array<int,string> $formats Lower-case extensions, no dot.
         */
        $formats = apply_filters( 'atlas_ar_supported_formats', $free_formats );

        // Defensive guards — a misbehaving filter must not crash the
        // dashboard. Cast to array, force-lowercase strings, dedupe.
        if ( ! is_array( $formats ) ) {
            $formats = $free_formats;
        }
        $formats = array_values( array_unique( array_filter( array_map( static function ( $ext ) {
            return is_string( $ext ) ? strtolower( ltrim( $ext, '.' ) ) : '';
        }, $formats ) ) ) );

        return $formats;
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

    /**
     * The list of Tripo3D / Meshy AI generation modes this site can
     * actually submit.
     *
     * Free natively supports `text_to_model` only. `image_to_model`
     * (and future `multiview_to_model`) require the picker UI plus
     * server-side helpers that ship in Pro — adding them in Free
     * without Pro present would expose a feature the user can't run,
     * which is the Yoast-pattern trap AR-61 §1.1 closed.
     *
     * Pro extends the list by hooking
     * `atlas_ar_generation_supported_modes` from
     * `AR_TRY_ON_Pro_Bridge::register()`. The filter shape is a flat
     * array of Tripo3D body `type` strings so anyone hooking it can
     * just array_merge / array_push without thinking about
     * associative keys.
     *
     * The React metabox reads the result from `ar_try_on.generation_supported_modes`
     * and filters the "Supported Model Types" dropdown to it.
     *
     * @since AR-62
     * @return array<int,string> Tripo3D / Meshy AI body type strings
     *                            (e.g. `text_to_model`, `image_to_model`).
     */
    public static function generation_supported_modes() {
        $free_modes = array( 'text_to_model' );

        /**
         * Filter: atlas_ar_generation_supported_modes
         *
         * Lets Pro and third-party add-ons register additional 3D-model
         * generation modes. Pro v3.x+ adds `image_to_model` via the
         * `AR_TRY_ON_Pro_Bridge`.
         *
         * @param array<int,string> $modes Tripo3D body type strings.
         */
        $modes = apply_filters( 'atlas_ar_generation_supported_modes', $free_modes );

        // Defensive guards — a misbehaving filter must not crash the
        // metabox. Cast to array, force-lowercase strings, dedupe.
        if ( ! is_array( $modes ) ) {
            $modes = $free_modes;
        }
        $modes = array_values( array_unique( array_filter( array_map( static function ( $m ) {
            return is_string( $m ) ? strtolower( trim( $m ) ) : '';
        }, $modes ) ) ) );

        // text_to_model is always present — it's Free's baseline and
        // dropping it would leave the dropdown empty.
        if ( ! in_array( 'text_to_model', $modes, true ) ) {
            array_unshift( $modes, 'text_to_model' );
        }

        return $modes;
    }

}
