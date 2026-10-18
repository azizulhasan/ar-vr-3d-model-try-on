<?php

namespace AR_TRY_ON_Admin; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).


/**
 * The admin-specific functionality of the plugin.
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/admin
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON_Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_name The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;


	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $plugin_name The name of this plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version     = $version;

		add_action( 'wp_ajax_atlas_plugins_refresh', array( $this, 'ajax_refresh_plugins' ) );
	}





	/**
	 * Register the `atlas/ar-shortcode` block and its editor-only assets.
	 *
	 * Hooked on `init`. The script and style are only *registered* here and
	 * passed to register_block_type() as `editor_script` / `editor_style`,
	 * so WordPress enqueues them inside the block editor and nowhere else.
	 *
	 * They used to be enqueued on every admin screen, which also loaded the
	 * `wp-editor` package there. That package replaces `window.wp.editor`,
	 * so `wp.editor.initialize` disappeared and any plugin using the classic
	 * editor API on those screens threw (AR-71). The block never used
	 * `wp.editor` — it reads InspectorControls from `wp.blockEditor` — so
	 * that dependency is dropped too.
	 *
	 * @since 2.2.8
	 */
	public function register_block() {
		// wp-components is required for PanelBody / ToggleControl /
		// TextControl in the block's InspectorControls sidebar.
		wp_register_script(
			'atlas-ar-block',
			ATLAS_AR_PLUGIN_URL . 'blocks/atlas-ar-block.js',
			array( 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-block-editor', 'wp-components', 'wp-server-side-render' ),
			$this->version,
			true
		);

		wp_register_style(
			'atlas-ar-block-editor',
			ATLAS_AR_PLUGIN_URL . 'blocks/atlas-ar-block-editor.css',
			array( 'wp-edit-blocks' ),
			$this->version
		);

		// AR-129: rendered on the server (the same [atlas_ar] output), so the editor can show a live
		// preview (ServerSideRender) and old saved blocks keep working.
		register_block_type(
			'atlas/ar-shortcode',
			array(
				'editor_script'   => 'atlas-ar-block',
				'editor_style'    => 'atlas-ar-block-editor',
				'render_callback' => array( '\AR_TRY_ON\AR_TRY_ON_Frontend', 'render_block' ),
				'attributes'      => array(
					'id'          => array( 'type' => 'number', 'default' => 0 ),
					'reveal'      => array( 'type' => 'boolean', 'default' => false ),
					'height'      => array( 'type' => 'string', 'default' => '400px' ),
					'width'       => array( 'type' => 'string', 'default' => '500px' ),
					'padding'     => array( 'type' => 'string', 'default' => '0' ),
					'margin'      => array( 'type' => 'string', 'default' => '0' ),
					'aspectRatio' => array( 'type' => 'string', 'default' => '' ),
					'buttonLabel' => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);
	}




	/**
	 * Add Menu and Submenu page
	 */

	public function atlas_ar_menu() {
		// Position '80.5' (float string) places the menu immediately
		// after WordPress core Settings (position 80). The previous
		// value 20 collided with WP core's Pages slot and was flagged
		// by wp.org (AR-61 §7.3). An interim value of '58.5' was tried
		// but the project owner asked for placement directly after
		// Settings instead, so plugin admins always find AtlasAR at
		// the bottom of the menu, never wedged between core items.
		// Float-string is used (not integer 81) so other plugins
		// claiming round-number positions don't collide.
		$brand = self::brand();
		add_menu_page(
			$brand['name'],
			$brand['name'],
			'manage_options',
			'ar-vr-3d-model-try-on',
			array( $this, "ar_try_on_settings" ),
			ATLAS_AR_PLUGIN_URL . 'admin/images/ar-try-on-logo-resized-30x34.png',
			'80.5'
		);

        $this->atlasaidev_plugins('atlas-ar-other-plugins');

        do_action( 'atlas_ar_menu', $this );

    }

	/**
	 * AR-138: the product name and version the admin shows ("AtlasAR 3.0.0"; AtlasAR Pro sets
	 * "AtlasAR Pro" and its own version). Filter: atlas_ar_brand.
	 *
	 * @return array { name, version }
	 */
	public static function brand() {
		$brand = (array) apply_filters( 'atlas_ar_brand', array( 'name' => 'AtlasAR', 'version' => defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '' ) );
		return array(
			'name'    => sanitize_text_field( isset( $brand['name'] ) ? (string) $brand['name'] : 'AtlasAR' ),
			'version' => sanitize_text_field( isset( $brand['version'] ) ? (string) $brand['version'] : '' ),
		);
	}

	/** AR-146: AtlasAR Pro's pricing page (the one address every "Pro" link goes to). */
	const PRO_URL = 'https://wpaugmentedreality.com/pricing/';

	/**
	 * AR-146: one of our own links, tagged so we know where people came from:
	 * utm_source=plugin, utm_medium=<the screen>, utm_campaign=atlasar_3, utm_content=<the spot>.
	 * Links to other sites (Meshy, Tripo, wordpress.org) are left as they are.
	 *
	 * @param string $url     https://wpaugmentedreality.com/… or https://atlasaidev.com/…
	 * @param string $medium  dashboard, library, product_panel, plugins_page, notice, …
	 * @param string $content the button or note
	 * @return string
	 */
	public static function link( $url, $medium, $content = '' ) {
		$host = (string) wp_parse_url( (string) $url, PHP_URL_HOST );
		if ( ! preg_match( '/(^|\.)(wpaugmentedreality\.com|atlasaidev\.com|atlasvoice\.cloud|wpatlasmcp\.com)$/', $host ) ) {
			return (string) $url;
		}
		$tags = array(
			'utm_source'   => 'plugin',
			'utm_medium'   => sanitize_key( $medium ),
			'utm_campaign' => 'atlasar_3',
			'utm_content'  => sanitize_key( $content ),
		);
		return add_query_arg( array_filter( $tags ), (string) $url );
	}

	/**
	 * AR-138: the menu icon is a 30 × 34 image: fit it in WordPress's 20 px icon slot, so it sits
	 * on the same line as the other menu icons (every admin page shows the menu).
	 */
	public static function menu_icon_style() {
		wp_add_inline_style( 'admin-menu', '#adminmenu .toplevel_page_ar-vr-3d-model-try-on .wp-menu-image img{width:20px;height:20px;padding:7px 0 0;object-fit:contain;opacity:1}' );
	}

	/** The dashboard page (also the callback old AtlasAR Pro 3.x registers for this page). */
	public function ar_try_on_settings() {
		AR_TRY_ON_Dashboard::render();
	}




	/**
	 * Sets the extension and mime type for Android - .gbl and IOS - .usdz files.
	 *
	 * @param array $wp_check_filetype_and_ext File data array containing 'ext', 'type', and 'proper_filename' keys.
	 * @param string $file Full path to the file.
	 * @param string $filename The name of the file (may differ from $file due to $file being in a tmp directory).
	 * @param array $mimes Key is the file extension with value as the mime type.
	 */
	public function allowed_file_and_ext( $types, $file, $filename, $mimes, $real_mime = null ) {

        $f_sp = explode(".", $filename);
        $f_exp_count  = count($f_sp);

        if ($f_exp_count <= 1) {
            return $types;
        } else {
            $f_name = $f_sp[0];
            $ext  = strtolower( $f_sp[$f_exp_count - 1] );
        }

        // Only handle 3D model file types, let WordPress handle standard files (png, jpg, etc.)
        $extendedMimes = $this->get_3d_mime_types();

        if (isset($extendedMimes[$ext])) {
            $type = $extendedMimes[$ext];
            $proper_filename = '';
            return compact('ext', 'type', 'proper_filename');
        }

        // Return original types for standard files (png, jpg, etc.)
        return $types;
	}

	/**
	 * Get 3D model mime types
	 *
	 * @return array
	 */
	public function get_3d_mime_types() {
        $mimes = [
            'glb' => 'model/gltf-binary',
            'gltf' => 'model/gltf+json',
            'usdz' => 'model/vnd.pixar.usd',
        ];

        // AtlasAR Pro adds the file types it handles with its own upload_mimes filter.
        return $mimes;
	}

	/**
	 * Adds 3D model filetypes to allowed WordPress mimes
	 * @see https://codex.wordpress.org/Plugin_API/Filter_Reference/upload_mimes
	 *
	 * @param array $mimes Existing WordPress mime types
	 * @return array
	 */
	public function mime_types( $mimes = array() ) {
        return array_merge( $mimes, $this->get_3d_mime_types() );
	}

    /**
     * Remote URL for the plugins.json file.
     */
    const ATLAS_PLUGINS_REMOTE_URL = 'https://raw.githubusercontent.com/atlasaidev/plugins/main/plugins.json';

    /**
     * Transient key for cached remote plugin manifest.
     */
    const ATLAS_PLUGINS_TRANSIENT = 'atlas_plugins_remote_data';

    /**
     * Transient key for WP.org plugin info cache.
     */
    const ATLAS_PLUGINS_WPORG_TRANSIENT = 'atlas_plugins_wporg_info_v2';

    /**
     * Cache duration in seconds (24 hours).
     */
    const ATLAS_PLUGINS_CACHE_TTL = 86400;

    /**
     * Fetch the AtlasAiDev plugin manifest with a 24-hour transient
     * cache, falling back to a local hardcoded list when the network
     * call fails or returns invalid data.
     *
     * This call only fires when an administrator opens the
     * "Other plugins" admin submenu — never on a normal page load.
     * The submenu page itself shows a visible notice describing what
     * is fetched and what is not sent; the call is also disclosed in
     * the plugin's readme under `== External services ==`
     * (AR-61 §2.1 + §4.9).
     *
     * @since 1.0.0
     * @return array List of plugin objects.
     */
    public static function get_atlas_plugins() {
        // AR-146: our pricing / learn-more links carry UTM tags (the list itself is unchanged).
        $list = self::fetch_atlas_plugins();
        foreach ( $list as $i => $p ) {
            foreach ( array( 'learnMoreUrl', 'proUrl' ) as $k ) {
                if ( is_array( $p ) && ! empty( $p[ $k ] ) ) {
                    $list[ $i ][ $k ] = self::link( $p[ $k ], 'plugins_page', ( isset( $p['slug'] ) ? $p['slug'] : 'plugin' ) . '_' . $k );
                }
            }
        }
        return $list;
    }

    /**
     * AR-158: our other plugins for the setup wizard's last screen, from the cached catalogue or
     * the built-in list: never a network request (the wizard runs right after activation).
     *
     * @param string[] $slugs which plugins, in this order
     * @return array[] { slug, name, description, url, status: active|installed|none, action }
     */
    public static function suggested_plugins( array $slugs ) {
        $cached = get_transient( self::ATLAS_PLUGINS_TRANSIENT );
        $list   = is_array( $cached ) && ! empty( $cached ) ? $cached : self::get_fallback_plugins();
        if ( ! function_exists( 'get_plugins' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $installed = array_keys( get_plugins() );
        $out       = array();
        foreach ( $slugs as $slug ) {
            foreach ( $list as $p ) {
                if ( ! is_array( $p ) || ( isset( $p['slug'] ) ? $p['slug'] : '' ) !== $slug ) {
                    continue;
                }
                $base   = isset( $p['basename'] ) ? (string) $p['basename'] : '';
                $status = in_array( $base, $installed, true ) ? ( is_plugin_active( $base ) ? 'active' : 'installed' ) : 'none';
                $action = '';
                if ( 'installed' === $status && current_user_can( 'activate_plugins' ) ) {
                    $action = html_entity_decode( wp_nonce_url( admin_url( 'plugins.php?action=activate&plugin=' . rawurlencode( $base ) ), 'activate-plugin_' . $base ) );
                } elseif ( 'none' === $status && current_user_can( 'install_plugins' ) ) {
                    $action = admin_url( 'plugin-install.php?tab=plugin-information&plugin=' . rawurlencode( $slug ) . '&TB_iframe=true&width=772&height=700' );
                }
                $out[] = array(
                    'slug'        => $slug,
                    'name'        => isset( $p['name'] ) ? wp_strip_all_tags( (string) $p['name'] ) : $slug,
                    'description' => isset( $p['description'] ) ? wp_strip_all_tags( (string) $p['description'] ) : '',
                    'url'         => ! empty( $p['learnMoreUrl'] ) ? self::link( (string) $p['learnMoreUrl'], 'setup_wizard', $slug ) : '',
                    'status'      => $status,
                    'action'      => $action,
                );
                break;
            }
        }
        return $out;
    }

    private static function fetch_atlas_plugins() {
        $cached = get_transient( self::ATLAS_PLUGINS_TRANSIENT );
        if ( false !== $cached && is_array( $cached ) ) {
            return $cached;
        }

        $response = wp_remote_get( self::ATLAS_PLUGINS_REMOTE_URL, array(
            'timeout' => 10,
            'headers' => array( 'Accept' => 'application/json' ),
        ) );

        if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
            $body = wp_remote_retrieve_body( $response );
            $data = json_decode( $body, true );
            if ( is_array( $data ) && ! empty( $data ) ) {
                set_transient( self::ATLAS_PLUGINS_TRANSIENT, $data, self::ATLAS_PLUGINS_CACHE_TTL );
                return $data;
            }
        }

        return self::get_fallback_plugins();
    }

    /**
     * Hardcoded fallback plugin data in case remote fetch fails.
     *
     * @return array
     */
    private static function get_fallback_plugins() {
        return array(
            array(
                'name'          => 'Text To Speech TTS – AtlasVoice',
                'slug'          => 'text-to-audio',
                'basename'      => 'text-to-audio/text-to-audio.php',
                'icon'          => 'https://ps.w.org/text-to-audio/assets/icon-256x256.gif',
                'learnMoreUrl'  => 'https://atlasaidev.com/plugins/text-to-speech-pro/pricing/',
                'proBasenames'  => array(
                    'text-to-speech-pro/text-to-audio-pro.php',
                    'text-to-speech-pro-premium/text-to-audio-pro.php',
                    'text-to-audio-pro/text-to-audio-pro.php',
                    'text-to-audio-pro-premium/text-to-audio-pro.php',
                ),
                'proUrl'        => 'https://atlasaidev.com/plugins/text-to-speech-pro/pricing/',
                'configureSlug' => 'text-to-audio',
                'isNew'         => false,
                'complementary' => array('ai-workflow-automation-ai-agent-hub', 'smart-local-ai'),
                'priority'      => 1,
                'description'   => 'The most user-friendly Text-to-Speech accessibility plugin for WordPress. Automatically adds an audio player with no API required.',
                'features'      => array(
                    'Unlimited text-to-speech conversion',
                    '80+ languages, 20-300+ voices',
                    'Customizable player design',
                    'Shortcode support with flexible attributes',
                    'Custom Post Type & ACF compatibility',
                    'No external API required (browser SpeechSynthesis)',
                    'Multilingual support (WPML, GTranslate)',
                    'Analytics & engagement tracking',
                ),
            ),
            array(
                'name'          => '3D Model Viewer – AtlasAR',
                'slug'          => 'ar-vr-3d-model-try-on',
                'basename'      => 'ar-vr-3d-model-try-on/ar-vr-3d-model-try-on.php',
                'icon'          => 'https://ps.w.org/ar-vr-3d-model-try-on/assets/icon-256x256.gif',
                'learnMoreUrl'  => 'https://wpaugmentedreality.com/pricing/',
                'proBasenames'  => array(
                    'ar-vr-3d-model-try-on-pro/ar-vr-3d-model-try-on-premium.php',
                    'ar-vr-3d-model-try-on-premium/ar-vr-3d-model-try-on-premium.php',
                ),
                'proUrl'        => 'https://wpaugmentedreality.com/pricing/',
                'configureSlug' => 'ar-vr-3d-model-try-on',
                'isNew'         => false,
                'complementary' => array('text-to-audio', 'smart-local-ai'),
                'priority'      => 2,
                'description'   => 'Display interactive 3D models and augmented reality on your WordPress & WooCommerce site for enhanced product visualization.',
                'features'      => array(
                    'Interactive 3D model display',
                    'Augmented Reality (AR) support',
                    'WordPress & WooCommerce integration',
                    'Mobile-optimized viewing',
                    'Customizable display options',
                    'Reduces return rates with realistic visualization',
                    'Easy product page embedding',
                ),
            ),
            array(
                'name'          => 'MCP Server for WordPress – AtlasMCP',
                'slug'          => 'ai-workflow-automation-ai-agent-hub',
                'basename'      => 'ai-workflow-automation-ai-agent-hub/ai-workflow-automation-ai-agent-hub.php',
                'icon'          => 'https://ps.w.org/ai-workflow-automation-ai-agent-hub/assets/icon-256x256.gif',
                'learnMoreUrl'  => 'https://wpatlasmcp.com/',
                'proBasenames'  => array(
                    'ai-workflow-automation-ai-agent-hub-pro/ai-workflow-automation-ai-agent-hub-pro.php',
                ),
                'proUrl'        => 'https://atlasaidev.com/ai-agent-hub-pro/',
                'configureSlug' => 'ai-workflow-automation-ai-agent-hub',
                'isNew'         => false,
                'complementary' => array('text-to-audio', 'smart-local-ai'),
                'priority'      => 1,
                'description'   => 'Connect Claude, ChatGPT and other AI assistants to your WordPress site through MCP, with 70+ abilities for posts, media, WooCommerce and more.',
                'features'      => array(
                    '70+ abilities across 9 modules',
                    'Built-in MCP Server (JSON-RPC 2.0)',
                    'JWT authentication',
                    'Drag-and-drop workflow builder',
                    'Multi-provider AI support (OpenAI, Gemini, Claude)',
                    'WooCommerce AI Store Manager',
                    'Post editor AI integration',
                ),
            ),
            array(
                'name'          => 'Smart Local AI – AtlasAI',
                'slug'          => 'smart-local-ai',
                'basename'      => 'smart-local-ai/smart-local-ai.php',
                'icon'          => 'https://ps.w.org/smart-local-ai/assets/icon-256x256.png',
                'learnMoreUrl'  => 'https://atlasaidev.com/smart-local-ai-pro/',
                'proBasenames'  => array(
                    'smart-local-ai-pro/smart-local-ai-pro.php',
                ),
                'proUrl'        => 'https://atlasaidev.com/smart-local-ai-pro/',
                'configureSlug' => 'smart-local-ai',
                'isNew'         => true,
                'complementary' => array('ai-workflow-automation-ai-agent-hub', 'text-to-audio'),
                'priority'      => 1,
                'description'   => 'Browser-based private AI tools for WordPress. Semantic related posts, personalized recommendations, and automatic alt text generation — all running on-device with zero cloud costs.',
                'features'      => array(
                    'RelevantFlow: Semantic content recommendations',
                    'PersonaFlow: Personalized recommendations based on visitor behavior',
                    'AltGenius: Automatic alt text generation for images',
                    'Zero cost — no API keys or subscriptions needed',
                    'Privacy by architecture — all AI runs in-browser',
                    'WebGPU + WASM hardware-accelerated inference',
                    'Works with any post type including WooCommerce products',
                    'GDPR compliant — no external data transmission',
                ),
            ),
        );
    }

    /**
     * Fetch WP.org plugin info (rating, installs) for all atlas plugins.
     *
     * @param array $plugins List of plugin data from get_atlas_plugins().
     * @return array Keyed by slug: { rating, num_ratings, active_installs }
     */
    public static function get_wporg_info($plugins) {
        $cached = get_transient(self::ATLAS_PLUGINS_WPORG_TRANSIENT);
        if (false !== $cached && is_array($cached)) {
            return $cached;
        }

        $info = array();
        foreach ($plugins as $plugin) {
            $slug = $plugin['slug'];
            $url  = 'https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=' . urlencode($slug) . '&request[fields][active_installs]=1&request[fields][rating]=1&request[fields][num_ratings]=1&request[fields][sections]=0&request[fields][description]=0';
            $response = wp_remote_get($url, array('timeout' => 5));
            if (!is_wp_error($response) && 200 === wp_remote_retrieve_response_code($response)) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (is_array($data) && !empty($data['slug'])) {
                    $info[$slug] = array(
                        'name'            => isset($data['name']) ? wp_strip_all_tags(html_entity_decode($data['name'], ENT_QUOTES, 'UTF-8')) : '',
                        'rating'          => isset($data['rating']) ? (int) $data['rating'] : 0,
                        'num_ratings'     => isset($data['num_ratings']) ? (int) $data['num_ratings'] : 0,
                        'active_installs' => isset($data['active_installs']) ? (int) $data['active_installs'] : 0,
                    );
                }
            }
            if (!isset($info[$slug])) {
                $info[$slug] = array('name' => '', 'rating' => 0, 'num_ratings' => 0, 'active_installs' => 0);
            }
        }

        set_transient(self::ATLAS_PLUGINS_WPORG_TRANSIENT, $info, self::ATLAS_PLUGINS_CACHE_TTL);
        return $info;
    }

    /**
     * Detect which plugins have their Pro version installed or active.
     *
     * @param array $plugins     List of plugin data from get_atlas_plugins().
     * @param array $all_plugins All installed plugin basenames.
     * @param array $active_plugins Active plugin basenames.
     * @return array { pro_installed: string[], pro_active: string[] }
     */
    public static function detect_pro_status($plugins, $all_plugins, $active_plugins) {
        $pro_installed = array();
        $pro_active    = array();

        foreach ($plugins as $plugin) {
            $slug = $plugin['slug'];
            if (empty($plugin['proBasenames']) || !is_array($plugin['proBasenames'])) {
                continue;
            }
            foreach ($plugin['proBasenames'] as $pro_basename) {
                if (in_array($pro_basename, $all_plugins, true)) {
                    $pro_installed[] = $slug;
                    if (in_array($pro_basename, $active_plugins, true)) {
                        $pro_active[] = $slug;
                    }
                    break; // Found one match, no need to check other basenames.
                }
            }
        }

        return array(
            'pro_installed' => array_unique($pro_installed),
            'pro_active'    => array_unique($pro_active),
        );
    }

    public function atlasaidev_plugins($menu_slug = 'atlas-ar-other-plugins', $plugin_slug = 'ar-vr-3d-model-try-on') {
        // Atlas Plugins submenu — pure read of the admin page slug for enqueue routing.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only: identifies which admin screen to enqueue assets for; no data mutation.
        if (!empty($_REQUEST['page']) && $_REQUEST['page'] === $menu_slug) {
            $js  = plugin_dir_url(__FILE__) . 'js/atlas-plugins.js';
            wp_enqueue_script(
                'atlas-plugins',
                $js,
                array('wp-i18n', 'updates'),
                $this->version,
                true
            );
            wp_set_script_translations(
                'atlas-plugins',
                'ar-vr-3d-model-try-on',
                plugin_dir_path(dirname(__FILE__)) . 'languages'
            );

            // Fetch plugin list from remote (cached).
            $atlas_plugins = self::get_atlas_plugins();

            // Build basenames map dynamically from remote data.
            $atlas_basenames = array();
            foreach ($atlas_plugins as $plugin) {
                if (!empty($plugin['slug']) && !empty($plugin['basename'])) {
                    $atlas_basenames[$plugin['slug']] = $plugin['basename'];
                }
            }

            // Determine installed and active plugin statuses.
            if (!function_exists('get_plugins')) {
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
            }
            $all_plugins    = array_keys(get_plugins());
            $active_plugins = (array) get_option('active_plugins', array());

            $installed_slugs = array();
            $active_slugs    = array();
            $activate_urls   = array();
            foreach ($atlas_basenames as $slug => $basename) {
                if (in_array($basename, $all_plugins, true)) {
                    $installed_slugs[] = $slug;
                    if (!in_array($basename, $active_plugins, true)) {
                        $activate_urls[$slug] = html_entity_decode(wp_nonce_url(
                            admin_url('plugins.php?action=activate&plugin=' . urlencode($basename)),
                            'activate-plugin_' . $basename
                        ));
                    }
                }
                if (in_array($basename, $active_plugins, true)) {
                    $active_slugs[] = $slug;
                }
            }

            // Fetch WP.org info (ratings, installs) — cached.
            $wporg_info = self::get_wporg_info($atlas_plugins);

            // Detect Pro plugin install/active status.
            $pro_status = self::detect_pro_status($atlas_plugins, $all_plugins, $active_plugins);

            // Find the current plugin's display name for the banner.
            // Prefer the canonical WP.org plugin title when available so the
            // banner stays in sync with the directory listing.
            $current_plugin_name = '';
            foreach ($atlas_plugins as $p) {
                if (!empty($p['slug']) && $p['slug'] === $plugin_slug) {
                    if (!empty($wporg_info[$plugin_slug]['name'])) {
                        $current_plugin_name = $wporg_info[$plugin_slug]['name'];
                    } else {
                        $current_plugin_name = $p['name'];
                    }
                    break;
                }
            }

            wp_localize_script('atlas-plugins', 'atlasPluginsData', array(
                'current_plugin_slug' => $plugin_slug,
                'current_plugin_name' => $current_plugin_name,
                'plugins'             => $atlas_plugins,
                'installed_plugins'   => $installed_slugs,
                'active_plugins'      => $active_slugs,
                'activate_urls'       => (object) $activate_urls,
                'wporg_info'          => (object) $wporg_info,
                'pro_installed'       => $pro_status['pro_installed'],
                'pro_active'          => $pro_status['pro_active'],
                'admin_url'           => admin_url(),
                'ajax_url'            => admin_url('admin-ajax.php'),
                'refresh_nonce'       => wp_create_nonce('atlas_plugins_refresh'),
            ));
        }
        add_submenu_page(
            'ar-vr-3d-model-try-on',
            __('Plugins', 'ar-vr-3d-model-try-on'),
            __('Plugins', 'ar-vr-3d-model-try-on'),
            'manage_options',
            $menu_slug,
            array($this, 'atlas_plugins_page'),
            34
        );
    }

    /**
     * AJAX handler to refresh plugin metadata.
     *
     * Clears both transients and re-fetches:
     *   - the AtlasAiDev plugin manifest (raw.githubusercontent.com),
     *   - the WP.org info cache (api.wordpress.org).
     */
    public function ajax_refresh_plugins() {
        check_ajax_referer('atlas_plugins_refresh', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized', 403);
        }

        delete_transient(self::ATLAS_PLUGINS_TRANSIENT);
        delete_transient(self::ATLAS_PLUGINS_WPORG_TRANSIENT);
        $plugins    = self::get_atlas_plugins();
        $wporg_info = self::get_wporg_info($plugins);

        wp_send_json_success(array(
            'plugins'    => $plugins,
            'wporg_info' => $wporg_info,
        ));
    }

    /**
     * Atlas Plugins page callback.
     *
     * Renders a visible disclosure block at the top of the page
     * (AR-61 §2.1 / §4.9), followed by the React mount point that the
     * cross-promo JS hydrates with the "You're using …" header and
     * the plugin grid. Visiting this page triggers the cached fetch
     * in {@see self::get_atlas_plugins()} which contacts
     * raw.githubusercontent.com for the AtlasAiDev plugin manifest;
     * no site or user data is sent in that request.
     *
     * Important: the disclosure deliberately does NOT use the
     * `.notice` admin class. WordPress hoists `.notice` elements to
     * sit right after the first H1/H2 on the page, which would push
     * the disclosure underneath the JS-rendered "You're using …"
     * header. Using a plain styled div keeps it where it belongs —
     * above the header.
     */
    public function atlas_plugins_page()
    {
        $readme_url = self_admin_url( 'plugin-install.php?tab=plugin-information&plugin=ar-vr-3d-model-try-on&section=external_services' );

        echo '<div class="wrap">';
        echo '<div class="atlas-cross-promo-disclosure" style="background:#fff;border:1px solid #c3c4c7;border-left:4px solid #2271b1;padding:12px 16px;margin:16px 20px 16px 0;max-width:1200px;border-radius:4px;">';
        echo '<p style="margin:0;font-size:13px;line-height:1.5;color:#1d2327;">';
        echo esc_html__( 'Heads up: this page fetches the latest AtlasAiDev plugin list from a public GitHub file. No site or user data is sent — see "External services" in the readme for details.', 'ar-vr-3d-model-try-on' );
        echo ' <a href="' . esc_url( $readme_url ) . '" target="_blank" rel="noopener noreferrer">';
        echo esc_html__( 'View readme', 'ar-vr-3d-model-try-on' );
        echo '</a>';
        echo '</p>';
        echo '</div>';
        echo '<div id="atlas_plugins_container"></div>';
        echo '</div>';
    }


}
