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
		 * Enqueues the admin scripts for the WordPress admin dashboard.
		 * The function `enqueue_scripts` in `$plugin_admin` will include the necessary JavaScript files for the plugin.
		 */
		// Set the extension and mime type for Android (.glb) and iOS (.usdz) files.
		$this->loader->add_filter(
			'wp_check_filetype_and_ext',
			$plugin_admin,
			'ATLAS_AR_for_woocommerce_file_and_ext',
			10,
			4
		);
		/**
		 * Adds support for Android `.glb` and iOS `.usdz` file types by defining their extensions and mime types.
		 * The function `ar_model_viewer_for_woocommerce_file_and_ext` checks the file type during upload and processing.
		 * This ensures that the file types are correctly identified in WordPress.
		 * It hooks into the `wp_check_filetype_and_ext` filter, with a priority of 10 and passes 4 arguments.
		 */
		// Allow Android (.glb) and iOS (.usdz) files to be uploaded by adding them to the allowed MIME types.
		$this->loader->add_filter( 'upload_mimes', $plugin_admin, 'atlas_ar_for_woocommerce_mime_types' );


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
		}

		$this->loader->add_filter( 'the_content', $this->plugin_public, 'atlas_ar_button', 99999999 );


		if ( isset( $settings['ar_try_on_single_product_tabs'] ) ) {
			if ( $settings['ar_try_on_single_product_tabs'] == 'yes' ) {
				$this->loader->add_filter( 'woocommerce_product_tabs', $this->plugin_public, 'atlas_ar_woocommerce_tab' );
			}
		}

        add_action( 'woocommerce_product_thumbnails', [$this, 'add_3d_file_as_product_gallery_item'], 20 );
//        add_filter( 'woocommerce_single_product_image_thumbnail_html', [$this, 'replace_woocommerce_single_product_image_thumbnail_html'], 5, 2 );

    }

    public function add_3d_file_as_product_gallery_item() {
        global $product;
        $product_id = $product->get_id();
        $attachment_id = get_post_thumbnail_id( $product_id );
        $html = wc_get_gallery_image_html( $attachment_id );
//        $flexslider        = (bool) apply_filters( 'woocommerce_single_product_flexslider_enabled', get_theme_support( 'wc-product-gallery-slider' ) );
        $gallery_thumbnail = wc_get_image_size( 'gallery_thumbnail' );
        $thumbnail_size    = apply_filters( 'woocommerce_gallery_thumbnail_size', array( $gallery_thumbnail['width'], $gallery_thumbnail['height'] ) );
//        $image_size        = apply_filters( 'woocommerce_gallery_image_size', $flexslider || '' ? 'woocommerce_single' : $thumbnail_size );
//        $full_size         = apply_filters( 'woocommerce_gallery_full_size', apply_filters( 'woocommerce_product_thumbnails_large_size', 'full' ) );
//        $thumbnail_src     = wp_get_attachment_image_src( $attachment_id, $thumbnail_size );
//        $thumbnail_srcset  = wp_get_attachment_image_srcset( $attachment_id, $thumbnail_size );
        $thumbnail_sizes   = wp_get_attachment_image_sizes( $attachment_id, $thumbnail_size );
//        $full_src          = wp_get_attachment_image_src( $attachment_id, $full_size );
//        $alt_text          = trim( wp_strip_all_tags( get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) ) );
//        $alt_text          = ( empty( $alt_text ) && ( $product instanceof WC_Product ) ) ? woocommerce_get_alt_from_product_title_and_position( $product->get_title(), $main_image, $image_index ) : $alt_text;
//    error_log(print_r([
//            '$attachment_id' => $attachment_id,
//            '$thumbnail_size' => $thumbnail_size,
//            '$image_size' => $image_size,
//        '$full_size' => $full_size,
//        '$thumbnail_src' => $thumbnail_src,
//        '$full_src' => $full_src,
//        '$alt_text' => $alt_text,
//        '$thumbnail_srcset' => $thumbnail_srcset,
//        '$thumbnail_sizes' => $thumbnail_sizes,
//
//    ], true));

//        error_log(print_r( $html, true ));
//        echo '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113801-fd8243b7-8465-4f82-86c1-2c54797fe296-100x100.jpeg" data-thumb-alt="Shirt - Green" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113801-fd8243b7-8465-4f82-86c1-2c54797fe296-100x100.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113801-fd8243b7-8465-4f82-86c1-2c54797fe296-150x150.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113801-fd8243b7-8465-4f82-86c1-2c54797fe296-300x300.jpeg 300w"  data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image">
//
//ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp
//</div>';
//        return;
        ob_start();
        ?>

        <div id="atlas-3d-gallery-item"
             data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113801-fd8243b7-8465-4f82-86c1-2c54797fe296-100x100.jpeg"
             data-thumb-alt="3D Model Preview"
             class="woocommerce-product-gallery__image"
             style="width: 112px; margin-right: 0; float: left; display: block;"

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
                        poster_data['url'] =  parsed.models?.[productId]?.poster || null;
                        poster_data['sizes'] =  parsed.models?.[productId]?.sizes || null;
                        return  poster_data;
                    } catch (e) {
                        console.error('Error parsing model data:', e);
                        return null;
                    }
                }

                const poster_data = getPosterByProductId(atlas_ar_product_id);
                if (poster_data) {
                    const div = document.getElementById('atlas-3d-gallery-item');
                    div.setAttribute('data-thumb', poster_data.url);
                    div.setAttribute('data-thumb-srcset', `
                    ${poster_data.sizes.thumbnail.url} ${poster_data.sizes.thumbnail.width}w,
                    ${poster_data.sizes.medium.url} ${poster_data.sizes.medium.width}w,
                    ${poster_data.sizes.large.url} ${poster_data.sizes.large.width}w,

                    `);
                } else {
                    console.warn('Poster not found for this product.');
                }
            })();
        </script>

        <?php
        $image  = ob_get_clean();

        echo $image;

        error_log(print_r( [
            '$html' => $html,
            '$image' => $image,
        ], true ));
    }

    public  function add_3d_file_as_product_gallery_item_old() {
//        echo '<div class="myplugin-after-featured">';
//        echo '<img src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" alt="After Featured Image">';
//        echo '</div>';
        global $product;
        $product_id = $product->get_id();
        ?>
        <script>
            let atlas_ar_product_id = "<?php echo $product_id; ?>";
            function getPosterByProductId(productId) {
                // Get the session data
                const data = sessionStorage.getItem('atlas_ar_model_data');
                if (!data) {
                    console.warn('No session data found for key "atlas_ar_model_data".');
                    return null;
                }

                try {
                    const parsed = JSON.parse(data);

                    // Check if the product ID exists under "models"
                    if (
                        parsed.models &&
                        parsed.models[productId] &&
                        parsed.models[productId].poster
                    ) {
                        return parsed.models[productId].poster;
                    } else {
                        console.warn(`Poster not found for product ID: ${productId}`);
                        return null;
                    }
                } catch (error) {
                    console.error('Failed to parse session data:', error);
                    return null;
                }
            }

            let posterUrl = getPosterByProductId(atlas_ar_product_id);
            console.log(posterUrl);

        </script>
<?php

        $image =  '<div
  data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"
  data-thumb-alt="Hat - Image 3"
  data-thumb-srcset="
    http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w,
    http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w,
    http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w
  "
  data-thumb-sizes="(max-width: 100px) 100vw, 100px"
  class="woocommerce-product-gallery__image"
  style="width: 512px; margin-right: 0px; float: left; display: block;"
>';
        $image .= AR_TRY_ON_Helper::create_shortcode( [], '' );
        $image .= '</div>';
        echo $image;


//        echo AR_TRY_ON_Helper::create_shortcode( [], '' );

        //        $html = '';
//        $html .= '<div class="myplugin-before-gallery">Before Gallery Image/HTML1111111111111111111111111111111</div>';
//        echo $html;
    }

    public  function replace_woocommerce_single_product_image_thumbnail_html($html, $post_thumbnail_id) {
//        echo '<div class="myplugin-after-featured">';
//        echo '<img src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" alt="After Featured Image">';
//        echo '</div>';
//        $html .= '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-thumb-alt="Hat - Image 3" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w" data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image" style="width: 512px; margin-right: 0px; float: left; display: block;"><a href="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"><img width="504" height="757" src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" class="" alt="Hat - Image 3" data-caption="" data-src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image_width="504" data-large_image_height="757" decoding="async" srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 504w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113861-531ebbcd-f9b5-4c18-b5c7-a878d5017ca2-200x300.jpeg 200w" sizes="(max-width: 504px) 100vw, 504px" draggable="false"></a></div>';
//        return $html;
        $current_filter = current_filter();
//        error_log(print_r($current_filter, true));
                return AR_TRY_ON_Helper::create_shortcode( [], '' );

//        $html .= AR_TRY_ON_Helper::create_shortcode( [], '' );
//        return $html;
//        return '<div data-thumb="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-thumb-alt="Hat - Image 3" data-thumb-srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 150w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 300w" data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image" style="width: 512px; margin-right: 0px; float: left; display: block;"><a href="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 100w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg"><img width="504" height="757" src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" class="" alt="Hat - Image 3" data-caption="" data-src="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg" data-large_image_width="504" data-large_image_height="757" decoding="async" srcset="http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg 504w, http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113861-531ebbcd-f9b5-4c18-b5c7-a878d5017ca2-200x300.jpeg 200w" sizes="(max-width: 504px) 100vw, 504px" draggable="false"></a></div>';

        //        $html = '';
//        $html .= '<div class="myplugin-before-gallery">Before Gallery Image/HTML1111111111111111111111111111111</div>';
//        echo $html;
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
