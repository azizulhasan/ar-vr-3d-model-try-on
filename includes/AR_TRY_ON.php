<?php

namespace AR_TRY_ON;

use AR_TRY_ON_Admin\AR_TRY_ON_Admin;
use AR_TRY_ON_Public\AR_TRY_ON_Public;

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       http://azizulhasan.com
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes
 * @author     Azizul Hasan <azizulhasan.cr@gmail.com>
 */
class AR_TRY_ON {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      AR_TRY_ON_Loader $loader Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_name The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $version The current version of the plugin.
	 */
	protected $version;

	/**
	 * The unique prefix of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_prefix The string used to uniquely prefix technical functions of this plugin.
	 */
	protected $plugin_prefix;
	/**
	 * plugin public object
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      AR_TRY_ON_Public $plugin_public The string used to uniquely prefix technical functions of this plugin.
	 */
	protected $plugin_public;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'ATLAS_AR_VERSION' ) ) {
			$this->version = ATLAS_AR_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name   = 'ar-vr-3d-model-try-on';
		$this->plugin_prefix = 'atlas_ar_';


		$this->load_dependencies();
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_wc_hooks();


	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		require_once ATLAS_AR_PLUGIN_PATH . '/includes/AR_TRY_ON_Constants.php';
        require_once ATLAS_AR_PLUGIN_PATH . '/includes/AR_TRY_ON_Hooks.php';

		$this->loader = new AR_TRY_ON_Loader();

	}


	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new AR_TRY_ON_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles', 999999 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts', 99999 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_preview', 99999 );


        /**
         * Adds support for Android `.glb` and iOS `.usdz` file types by defining their extensions and mime types.
         * The function `ar_model_viewer_for_woocommerce_file_and_ext` checks the file type during upload and processing.
         * This ensures that the file types are correctly identified in WordPress.
         * It hooks into the `wp_check_filetype_and_ext` filter, with a priority of 10 and passes 4 arguments.
         */
        // Allow Android (.glb) and iOS (.usdz) files to be uploaded by adding them to the allowed MIME types.
        $this->loader->add_filter( 'upload_mimes', $plugin_admin, 'mime_types' );

		/**
		 * Enqueues the admin scripts for the WordPress admin dashboard.
		 * The function `enqueue_scripts` in `$plugin_admin` will include the necessary JavaScript files for the plugin.
		 */
		// Set the extension and mime type for Android (.glb) and iOS (.usdz) files.
        global $wp_version;
        if (version_compare($wp_version, '5.1') >= 0) {
            $this->loader->add_filter(
                'wp_check_filetype_and_ext',
                $plugin_admin,
                'allowed_file_and_ext',
                10,
                5
            );
        } else {
            $this->loader->add_filter(
                'wp_check_filetype_and_ext',
                $plugin_admin,
                'allowed_file_and_ext',
                10,
                4
            );
        }



		$this->loader->add_action( 'admin_menu', $plugin_admin, 'atlas_ar_menu' );
	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$this->plugin_public = new AR_TRY_ON_Public( $this->get_plugin_name(), $this->get_plugin_prefix(), $this->get_version() );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_styles', 99999 );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_scripts', 99999 );

	}

	public function define_wc_hooks() {

		$settings = (array) get_option( 'ar_try_on_settings' );

		$wc_hook_id = isset( $settings['ar_try_on_wc_hook_position'] ) ? $settings['ar_try_on_wc_hook_position'] : false;
		switch ( $wc_hook_id ) {
			case 1:
				$this->loader->add_action( 'woocommerce_before_single_product_summary', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 2:
				$this->loader->add_action( 'woocommerce_after_single_product_summary', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 3:
				$this->loader->add_action( 'woocommerce_before_single_product', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 4:
				$this->loader->add_action( 'woocommerce_after_single_product', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 5:
				$this->loader->add_action( 'woocommerce_after_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
			case 6:
				$this->loader->add_action( 'woocommerce_before_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 99999999 );
				break;
            case 7:
				$this->loader->add_action( 'woocommerce_product_thumbnails', $this, 'add_3d_file_as_product_gallery_item', 99999999 );
                break;
		}

		$this->loader->add_filter( 'the_content', $this->plugin_public, 'atlas_ar_button', 99999999 );


		if ( isset( $settings['ar_try_on_single_product_tabs'] ) ) {
			if ( $settings['ar_try_on_single_product_tabs'] == 'yes' ) {
				$this->loader->add_filter( 'woocommerce_product_tabs', $this->plugin_public, 'atlas_ar_woocommerce_tab' );
			}
		}

    }

    /**
     * @return void
     */
    public function add_3d_file_as_product_gallery_item() {
        global $product;
        $product_id = $product->get_id();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            return;
        }
        $attachment_id = get_post_thumbnail_id( $product_id );
        $gallery_thumbnail = wc_get_image_size( 'gallery_thumbnail' );
        $thumbnail_size    = apply_filters( 'woocommerce_gallery_thumbnail_size', array( $gallery_thumbnail['width'], $gallery_thumbnail['height'] ) );
        $thumbnail_sizes   = wp_get_attachment_image_sizes( $attachment_id, $thumbnail_size );

        ob_start();
        ?>

        <div id="atlas_ar-3d-gallery-item"
             data-thumb=""
             data-thumb-alt=""
             class="woocommerce-product-gallery__image"
             style="width: 500px; margin-right: 0; float: left; display: block;"
             data-thumb-srcset=""
             data-thumb-sizes="<?php echo $thumbnail_sizes ?>"
        >
            <?php echo  AR_TRY_ON_Helper::create_shortcode( [], '' ); ?>
        </div>
        <script>
            (function() {
                let atlas_ar_product_id = "<?php echo $product_id; ?>";

                function getPosterByProductId(productId) {
                    const data = sessionStorage.getItem('atlas_ar_model_data');
                    if (!data) return null;

                    try {
                        const parsed = JSON.parse(data);
                        let poster_data = {}
                        poster_data['url'] =  parsed.models?.[productId]?.poster || '';
                        poster_data['sizes'] =  parsed.models?.[productId]?.sizes || {};
                        poster_data['alt'] =  parsed.models?.[productId]?.alt || '';
                        return  poster_data;
                    } catch (e) {
                        console.error('Error parsing model data:', e);
                        return null;
                    }
                }

                const poster_data = getPosterByProductId(atlas_ar_product_id);
                if (poster_data) {
                    const div = document.getElementById('atlas_ar-3d-gallery-item');
                    div.setAttribute('data-thumb', poster_data.url);
                    div.setAttribute('data-thumb-alt', poster_data.alt);
                    let srcset = null;

                    if(poster_data.sizes?.thumbnail?.url) {
                        srcset = `${poster_data.sizes.thumbnail.url} ${poster_data.sizes.thumbnail.width}w, `;
                    }

                    if(poster_data.sizes?.medium?.url) {
                        srcset += `${poster_data.sizes.medium.url} ${poster_data.sizes.medium.width}w, `;
                    }

                    if(poster_data.sizes?.large?.url) {
                        srcset += `${poster_data.sizes.large.url} ${poster_data.sizes.large.width}w`;
                    }

                    if(srcset) {
                        div.setAttribute('data-thumb-srcset', srcset);
                    }

                    if(!srcset){
                        var default_images = "<?php  echo  ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_100x100.webp 100w, ' ?>"
                            default_images += "<?php  echo  ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_150x150.webp 150w, ' ?>"
                            default_images += "<?php  echo  ATLAS_AR_ADMIN_PATH . 'images/NeilArmstrong_300x300.webp 300w' ?>"
                        div.setAttribute('data-thumb-srcset', default_images);
                    }

                } else {
                    console.warn('Poster not found for this product.');
                }
            })();
        </script>

        <?php
        $image  = ob_get_clean();

        echo $image;
    }

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @return    string    The name of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @return    AR_TRY_ON_Loader    Orchestrates the hooks of the plugin.
	 * @since     1.0.0
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return    string    The version number of the plugin.
	 * @since     1.0.0
	 */
	public function get_version() {
		return $this->version;
	}

	/**
	 * The unique prefix of the plugin used to uniquely prefix technical functions.
	 *
	 * @return    string    The prefix of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_prefix() {
		return $this->plugin_prefix;
	}

}
