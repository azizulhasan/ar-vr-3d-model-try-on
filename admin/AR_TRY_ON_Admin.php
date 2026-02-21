<?php

namespace AR_TRY_ON_Admin;

use AR_TRY_ON\AR_TRY_ON_Helper;

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
	 * Plugin's localize data.
	 *
	 * @since    1.3.14
	 * @access   private
	 * @var      string $localize_data Plugin's localize data.
	 */
	public $localize_data;

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

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'wp_is_mobile' ) ) {
			require_once ABSPATH . 'wp-includes/vars.php';
		}

		$this->localize_data = [
			'api_url'       => esc_url_raw( rest_url() ),
			'api_namespace' => 'ar_try_on',
			'api_version'   => 'v1',
			'plugin_name'   => ATLAS_AR_PLUGIN_NAME,
			'rest_nonce'    => wp_create_nonce( 'wp_rest' ),
			'VERSION'       => ATLAS_AR_VERSION,
			'plugin_url'    => ATLAS_AR_PLUGIN_URL,
			'post_types'    => AR_TRY_ON_Helper::get_post_types(),
			'is_wc_active'  => is_plugin_active( 'woocommerce/woocommerce.php' ),
			'is_pro_active' => AR_TRY_ON_Helper::is_pro_active(),
			'is_admin' => is_admin(),

		];
	}


	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( AR_TRY_ON_Helper::is_atlas_ar_page() || AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_style( 'ar-vr-3d-model-try-on', ATLAS_AR_PLUGIN_URL . 'public/css/ar-try-on.css', array(), $this->version, 'all' );

            wp_enqueue_style( 'ar-vr-3d-model-try-on-public', ATLAS_AR_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );

        }
        wp_enqueue_style( 'atlas_ar_toastify', ATLAS_AR_PLUGIN_URL . 'admin/css/atlas_ar_toastify.css', array(), $this->version, 'all' );

		wp_enqueue_style( 'ar-vr-3d-model-try-on-admin', ATLAS_AR_PLUGIN_URL . 'admin/css/ar-try-on-admin.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		/**
		 * Looad script
		 */

		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		do_action( 'atlas_ar_enqueue_pro_dashboard_scripts' );


		if ( AR_TRY_ON_Helper::is_atlas_ar_page() ) {
			/* Load react js */
			wp_enqueue_script( 'ar-try-on-dashboard-ui', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-dashboard-ui.min.js', array(), $this->version, true );
			wp_localize_script( 'ar-try-on-dashboard-ui', 'ar_try_on', $this->localize_data );
		}

		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_media(); // Enqueue the WordPress media uploader
			wp_enqueue_script( 'ar-try-on-metabox-ui', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-metabox-ui.min.js', array( 'wp-hooks' ), $this->version, true );

			// Add WooCommerce product variation data if on product edit page
			$metabox_localize_data = $this->localize_data;
			$metabox_localize_data['wc_product'] = $this->get_wc_product_data();

			wp_localize_script( 'ar-try-on-metabox-ui', 'ar_try_on', $metabox_localize_data );

			wp_enqueue_script(
				'ar-try-on-media-library',
				ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-try-on-media-library.min.js', // Path to your JS file
				['ar-try-on-metabox-ui'], // Dependencies
				$this->version,
				true
			);

			// Enqueue compression client script
			wp_enqueue_script(
				'ar-compression-client',
				ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-compression-client.min.js',
				array('ar-try-on-metabox-ui'),
				$this->version,
				true
			);
		}
        // JS
        wp_enqueue_script(
            'atlas-ar-block',
            ATLAS_AR_PLUGIN_URL . 'blocks/atlas-ar-block.js',
            array( 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-editor', 'wp-block-editor' ),
            $this->version,
            true
        );

        // CSS (editor only)
        wp_enqueue_style(
            'atlas-ar-block-editor',
            ATLAS_AR_PLUGIN_URL . 'blocks/atlas-ar-block-editor.css',
            array( 'wp-edit-blocks' ),
            $this->version,
            'all'
        );
	}

	public function enqueue_preview() {

		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
//
//			wp_enqueue_style( 'alertify', ATLAS_AR_PLUGIN_URL . 'public/css/alertifyjs/alertify.css', array(), $this->version, 'all' );
//			wp_enqueue_style( 'alertify-default', ATLAS_AR_PLUGIN_URL . 'public/css/alertifyjs/themes/default.css', array( 'alertify' ), $this->version, 'all' );
//			wp_enqueue_style( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );


			// TODO:: enqueue base on model setup/settings
			wp_enqueue_script( 'ar-try-on-google-model-viewer', ATLAS_AR_PLUGIN_URL . 'public/js/google-model-viewer.js', array('ar-try-on-metabox-ui'), $this->version, true );
			wp_enqueue_script( $this->plugin_name . '-preview', ATLAS_AR_PLUGIN_URL . 'admin/js/build/ar-vr-3d-model-try-on-preview.min.js', array('ar-try-on-google-model-viewer'), $this->version, true );
			wp_localize_script( $this->plugin_name . '-preview', 'ar_try_on_preview', $this->localize_data );
		}
	}

	/**
	 * Add Menu and Submenu page
	 */

	public function atlas_ar_menu() {
		add_menu_page(
			'AtlasAR',
			'AtlasAR',
			'manage_options',
			'ar-vr-3d-model-try-on',
			array( $this, "ar_try_on_settings" ),
			ATLAS_AR_PLUGIN_URL . 'admin/images/ar-try-on-logo-resized-30x34.png',
			20
		);

        $this->atlasaidev_plugins('atlas-ar-other-plugins');

        do_action( 'atlas_ar_menu', $this );

    }

	public function ar_try_on_settings() {
		echo wp_kses( "<div class='wpwrap'><div id='ar_try_on_dashboard_ui'></div></div>", array(
			'div' => array(
				'id'    => array(),
				'class' => array(),
			)
		) );
	}

	/**
	 * Get WooCommerce product data for the metabox
	 * Returns variation and attribute data for variable products
	 *
	 * @since 1.8.3
	 * @return array WooCommerce product data
	 */
	public function get_wc_product_data() {
		$product_data = array(
			'is_variable' => false,
			'variations'  => array(),
			'attributes'  => array(),
		);

		// Check if WooCommerce is active
		if ( ! class_exists( 'WooCommerce' ) ) {
			return $product_data;
		}

		// Get current post ID
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id ) {
			return $product_data;
		}

		// Get the product
		$product = wc_get_product( $post_id );
		if ( ! $product ) {
			return $product_data;
		}

		// Check if variable product
		if ( ! $product->is_type( 'variable' ) ) {
			return $product_data;
		}

		$product_data['is_variable'] = true;

		// Get variations
		$variations = $product->get_available_variations();
		$product_data['variations'] = array_map( function( $variation ) {
			return array(
				'variation_id' => $variation['variation_id'],
				'attributes'   => $variation['attributes'],
//				'image'        => isset( $variation['image'] ) ? $variation['image'] : array(),
			);
		}, $variations );

		// Get product attributes that are used for variations
		$attributes = $product->get_variation_attributes();
		foreach ( $attributes as $attribute_name => $options ) {
			// Clean up attribute name (remove 'pa_' prefix if present)
			$clean_name = str_replace( 'pa_', '', $attribute_name );
			$clean_name = wc_attribute_label( $attribute_name, $product );

			$product_data['attributes'][] = array(
				'name'    => $clean_name,
				'slug'    => $attribute_name,
				'options' => array_values( $options ),
			);
		}

		return $product_data;
	}

	/**
	 * Add defer attribute to plugin scripts for better performance
	 *
	 * @param string $tag The script tag HTML
	 * @param string $handle The script handle
	 * @param string $src The script source URL
	 * @return string Modified script tag
	 */
	public function add_defer_attribute( $tag, $handle, $src ) {
		// List of plugin scripts that should be deferred
		$defer_scripts = array(
			'ar-try-on-dashboard-ui',
			'ar-try-on-metabox-ui',
			'ar-try-on-media-library',
			'atlas-ar-block',
			$this->plugin_name . '-preview'
		);

		// Add defer attribute if this is one of our scripts
		if ( in_array( $handle, $defer_scripts, true ) ) {
			// Only add defer if not already present
			if ( strpos( $tag, ' defer' ) === false ) {
				$tag = str_replace( ' src=', ' defer src=', $tag );
			}
		}

		return $tag;
	}

	/**
	 * Add version query string to assets for cache busting
	 * This ensures users get the latest version after plugin updates
	 *
	 * @since 1.7.9
	 * @param string $src The source URL
	 * @param string $handle The script/style handle
	 * @return string Modified source URL with version
	 */
	public function add_version_to_assets( $src, $handle ) {
		// List of our plugin handles
		$plugin_handles = array(
			'ar-try-on-dashboard-ui',
			'ar-try-on-metabox-ui',
			'ar-try-on-media-library',
			'atlas-ar-block',
			$this->plugin_name . '-preview',
			$this->plugin_name,
			'ar-try-on-admin',
			'atlas_ar_toastify'
		);

		if ( in_array( $handle, $plugin_handles, true ) ) {
			// Add version as query parameter for cache busting
			if ( strpos( $src, 'ver=' ) === false ) {
				$src = add_query_arg( 'ver', $this->version, $src );
			}
		}

		return $src;
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
            'gltf' => 'model/gltf-binary',
            'usdz' => 'model/vnd.pixar.usd',
        ];

        if(AR_TRY_ON_Helper::is_pro_active()) {
            $mimes += [
                'obj' => 'model/obj',
                '3ds' => 'application/x-3ds',
                'step' => 'application/step',
                'stl' => 'application/vnd.ms-pki.stl',
                'fbx' => 'application/octet-stream',
                '3dml' => 'text/vnd.in3d.3dml',
                'dae' => 'application/collada+xml',
                'wrl' => 'model/vrml',
                '3mf' => 'application/vnd.ms-3mfdocument',
                'mtl' => 'model/mtl',
                'bin' => 'application/octet-stream',
                'hdr' => 'image/vnd.radiance',
            ];
        }

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

    public function atlasaidev_plugins($menu_slug = 'atlasvoice-other-plugins') {
        // Atlas Plugins submenu
        if (!empty($_REQUEST['page']) && $_REQUEST['page'] === $menu_slug) {
            wp_enqueue_script(
                'atlas-plugins',
                plugin_dir_url(__FILE__) . 'js/atlas-plugins.js',
                array('wp-i18n', 'updates'),
                $this->version,
                true
            );
            wp_set_script_translations(
                'atlas-plugins',
                'ar-vr-3d-model-try-on',
                plugin_dir_path(dirname(__FILE__)) . 'languages'
            );
            // Determine installed and active plugin statuses.
            $atlas_basenames = array(
                'text-to-audio' => 'text-to-audio/text-to-audio.php',
                'ar-vr-3d-model-try-on' => 'ar-vr-3d-model-try-on/ar-vr-3d-model-try-on.php',
                'ai-workflow-automation-ai-agent-hub' => 'ai-workflow-automation-ai-agent-hub/ai-workflow-automation-ai-agent-hub.php',
            );
            if (!function_exists('get_plugins')) {
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
            }
            $all_plugins = array_keys(get_plugins());
            $active_plugins = (array)get_option('active_plugins', array());

            $installed_slugs = array();
            $active_slugs = array();
            $activate_urls = array();
            foreach ($atlas_basenames as $slug => $basename) {
                if (in_array($basename, $all_plugins, true)) {
                    $installed_slugs[] = $slug;
                    // Build activate URL for installed-but-not-active plugins.
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

            wp_localize_script('atlas-plugins', 'atlasPluginsData', array(
                'current_plugin_slug' => 'ar-vr-3d-model-try-on',
                'installed_plugins' => $installed_slugs,
                'active_plugins' => $active_slugs,
                'activate_urls' => (object)$activate_urls,
            ));
        }
        add_submenu_page(
            'ar-vr-3d-model-try-on',
            __('Plugins', 'text-to-audio'),
            __('Plugins', 'text-to-audio'),
            'manage_options',
            $menu_slug,
            array($this, 'atlas_plugins_page'),
            34
        );
    }

    /**
     * Atlas Plugins page callback.
     */
    public function atlas_plugins_page()
    {
        echo '<div class="wrap"><div id="atlas_plugins_container"></div></div>';
    }


}
