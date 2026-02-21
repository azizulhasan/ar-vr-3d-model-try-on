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

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles', 10 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts', 10 );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_preview', 10 );

		// Add defer attribute to admin scripts for better performance
//		$this->loader->add_filter( 'script_loader_tag', $plugin_admin, 'add_defer_attribute', 10, 3 );

		// Add version to assets for cache busting
		$this->loader->add_filter( 'script_loader_src', $plugin_admin, 'add_version_to_assets', 10, 2 );
		$this->loader->add_filter( 'style_loader_src', $plugin_admin, 'add_version_to_assets', 10, 2 );

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

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_styles', 10 );

		$this->loader->add_action( 'wp_enqueue_scripts', $this->plugin_public, 'enqueue_scripts', 10 );

		// Add defer attribute to frontend scripts for better performance
		$this->loader->add_filter( 'script_loader_tag', $this->plugin_public, 'add_defer_attribute', 10, 3 );

	}

	public function define_wc_hooks() {

		$settings = AR_TRY_ON_Helper::get_settings();

		$wc_hook_id = isset( $settings['ar_try_on_wc_hook_position'] ) ? $settings['ar_try_on_wc_hook_position'] : 'product_image';

		switch ( $wc_hook_id ) {
			case 1:
				$this->loader->add_action( 'woocommerce_before_single_product_summary', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 2:
				$this->loader->add_action( 'woocommerce_after_single_product_summary', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 3:
				$this->loader->add_action( 'woocommerce_before_single_product', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 4:
				$this->loader->add_action( 'woocommerce_after_single_product', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 5:
				$this->loader->add_action( 'woocommerce_after_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 6:
				$this->loader->add_action( 'woocommerce_before_add_to_cart_form', $this->plugin_public, 'atlas_ar_button', 20 );
				break;
			case 7:
				$this->loader->add_action( 'woocommerce_product_thumbnails', $this, 'add_3d_file_as_product_gallery_item', 20 );
				break;
			case 'product_image':
			case '3d_viewer':
				// Add toggle functionality - output in footer to overlay on featured image
				$this->loader->add_action( 'wp_footer', $this, 'add_image_3d_toggle_to_gallery', 20 );
				break;
		}

		$this->loader->add_filter( 'the_content', $this->plugin_public, 'atlas_ar_button', 20 );


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
     * Add image/3D toggle functionality to product gallery
     * Places toggle button on top of the featured image as overlay
     *
     * @since 1.8.2
     * @return void
     */
    public function add_image_3d_toggle_to_gallery() {
        // Only run on single product pages
        if ( ! function_exists( 'is_product' ) || ! is_product() ) {
            return;
        }

        global $product;
        if ( ! $product ) {
            return;
        }

        $product_id = $product->get_id();

        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            return;
        }

        // Check if product has 3D model
        if ( ! AR_TRY_ON_Helper::has_3d_model( $product_id ) ) {
            return;
        }

        // Get the effective display mode for this product
        $display_mode = AR_TRY_ON_Helper::get_effective_show_button_in( $product_id );

        // Only proceed if toggle mode
        if ( ! AR_TRY_ON_Helper::is_toggle_display_mode( $display_mode ) ) {
            return;
        }

        ob_start();
        ?>
        <!-- 3D Viewer Container for Toggle (hidden initially, inserted via JS) -->
        <div id="atlas_ar-toggle-3d-container" style="display: none;">
            <?php echo AR_TRY_ON_Helper::create_shortcode( ['height' => '100%', 'width' => '100%'], '' ); ?>
        </div>

        <script>
            (function() {
                'use strict';

                const atlas_ar_product_id = "<?php echo esc_js( $product_id ); ?>";
                const atlas_ar_display_mode = "<?php echo esc_js( $display_mode ); ?>";

                // SVG Icons
                const icon3D = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
                </svg>`;

                const iconImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>`;

                const iconFullscreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>`;

                const iconClose = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>`;

                function initToggle() {
                    // Find the main featured image container
                    const mainImageContainer = document.querySelector('.woocommerce-product-gallery__image');
                    const viewer3DSource = document.getElementById('atlas_ar-toggle-3d-container');

                    if (!mainImageContainer || !viewer3DSource) {
                        return;
                    }

                    // Get the actual image element inside
                    const mainImage = mainImageContainer.querySelector('a, img');

                    if (!mainImage) {
                        return;
                    }

                    // Make the main image container position relative for overlay
                    mainImageContainer.style.position = 'relative';

                    // Create the 3D viewer container inside the main image container
                    const viewer3DContainer = document.createElement('div');
                    viewer3DContainer.id = 'atlas_ar-3d-viewer-overlay';
                    viewer3DContainer.className = 'atlas-ar-3d-viewer-overlay';
                    viewer3DContainer.innerHTML = viewer3DSource.innerHTML;
                    viewer3DContainer.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; background: #f5f5f5;';

                    // Insert the 3D viewer container inside the main image container
                    mainImageContainer.appendChild(viewer3DContainer);

                    // Remove the source container from footer
                    viewer3DSource.remove();

                    // Create toggle button container
                    const toggleContainer = document.createElement('div');
                    toggleContainer.className = 'atlas-ar-toggle-container';

                    // Create fullscreen button (hidden initially, shown when 3D is active)
                    const fullscreenBtn = document.createElement('button');
                    fullscreenBtn.type = 'button';
                    fullscreenBtn.className = 'atlas-ar-toggle-btn atlas-ar-fullscreen-btn';
                    fullscreenBtn.setAttribute('aria-label', 'View 3D model in fullscreen');
                    fullscreenBtn.innerHTML = iconFullscreen;
                    fullscreenBtn.title = 'Fullscreen';
                    fullscreenBtn.style.display = 'none'; // Hidden initially

                    // Create toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.type = 'button';
                    toggleBtn.className = 'atlas-ar-toggle-btn';
                    toggleBtn.setAttribute('aria-label', 'Toggle between product image and 3D viewer');

                    // Track current view state
                    let currentView = atlas_ar_display_mode; // 'product_image' or '3d_viewer'
                    let model3DLoaded = false;

                    // Create fullscreen overlay container
                    const fullscreenOverlay = document.createElement('div');
                    fullscreenOverlay.id = 'atlas_ar-fullscreen-overlay';
                    fullscreenOverlay.className = 'atlas-ar-fullscreen-overlay';
                    fullscreenOverlay.style.display = 'none';

                    // Create close button for fullscreen
                    const closeBtn = document.createElement('button');
                    closeBtn.type = 'button';
                    closeBtn.className = 'atlas-ar-fullscreen-close-btn';
                    closeBtn.setAttribute('aria-label', 'Close fullscreen');
                    closeBtn.innerHTML = iconClose;
                    closeBtn.title = 'Close';

                    // Create fullscreen 3D viewer container
                    const fullscreen3DContainer = document.createElement('div');
                    fullscreen3DContainer.className = 'atlas-ar-fullscreen-viewer';

                    fullscreenOverlay.appendChild(closeBtn);
                    fullscreenOverlay.appendChild(fullscreen3DContainer);
                    document.body.appendChild(fullscreenOverlay);

                    // Set initial state based on display mode
                    if (currentView === '3d_viewer') {
                        // Show 3D viewer first
                        toggleBtn.innerHTML = iconImage;
                        toggleBtn.title = 'View Product Image';
                        mainImage.style.visibility = 'hidden';
                        viewer3DContainer.style.display = 'block';
                        fullscreenBtn.style.display = 'flex'; // Show fullscreen button
                        load3DModel();
                    } else {
                        // Show product image first (default)
                        toggleBtn.innerHTML = icon3D;
                        toggleBtn.title = 'View in 3D';
                        mainImage.style.visibility = 'visible';
                        viewer3DContainer.style.display = 'none';
                        fullscreenBtn.style.display = 'none'; // Hide fullscreen button
                    }

                    // Toggle click handler
                    toggleBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (currentView === 'product_image') {
                            // Switch to 3D viewer
                            mainImage.style.visibility = 'hidden';
                            viewer3DContainer.style.display = 'block';
                            toggleBtn.innerHTML = iconImage;
                            toggleBtn.title = 'View Product Image';
                            fullscreenBtn.style.display = 'flex'; // Show fullscreen button
                            currentView = '3d_viewer';

                            if (!model3DLoaded) {
                                load3DModel();
                            }
                        } else {
                            // Switch to product image
                            mainImage.style.visibility = 'visible';
                            viewer3DContainer.style.display = 'none';
                            toggleBtn.innerHTML = icon3D;
                            toggleBtn.title = 'View in 3D';
                            fullscreenBtn.style.display = 'none'; // Hide fullscreen button
                            currentView = 'product_image';
                        }
                    });

                    // Fullscreen click handler
                    fullscreenBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        openFullscreen();
                    });

                    // Close fullscreen click handler
                    closeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        closeFullscreen();
                    });

                    // Close fullscreen on escape key
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape' && fullscreenOverlay.style.display === 'flex') {
                            closeFullscreen();
                        }
                    });

                    // Add buttons to container (toggle on left, fullscreen on right - horizontal layout)
                    toggleContainer.appendChild(toggleBtn);
                    toggleContainer.appendChild(fullscreenBtn);

                    // Append toggle button to the main image container (on top of featured image)
                    mainImageContainer.appendChild(toggleContainer);

                    function load3DModel() {
                        if (model3DLoaded) return;

                        const modelViewer = viewer3DContainer.querySelector('model-viewer');
                        if (modelViewer && window.AtlasAR) {
                            const atlasAR = new window.AtlasAR();
                            const modelId = modelViewer.id ? '#' + modelViewer.id : '.atlas_ar_model_viewer';
                            atlasAR.fetchModelData(atlas_ar_product_id, modelId, 'normal');
                            model3DLoaded = true;
                        }
                    }

                    function openFullscreen() {
                        // Clone the 3D viewer content into fullscreen container
                        fullscreen3DContainer.innerHTML = viewer3DContainer.innerHTML;
                        fullscreenOverlay.style.display = 'flex';
                        document.body.style.overflow = 'hidden'; // Prevent scrolling

                        // Load model in fullscreen viewer
                        const fullscreenModelViewer = fullscreen3DContainer.querySelector('model-viewer');
                        if (fullscreenModelViewer && window.AtlasAR) {
                            const atlasAR = new window.AtlasAR();
                            const modelId = fullscreenModelViewer.id ? '#' + fullscreenModelViewer.id : '.atlas_ar_model_viewer';
                            atlasAR.fetchModelData(atlas_ar_product_id, modelId, 'normal');
                        }
                    }

                    function closeFullscreen() {
                        fullscreenOverlay.style.display = 'none';
                        document.body.style.overflow = ''; // Restore scrolling
                        fullscreen3DContainer.innerHTML = ''; // Clear content
                    }
                }

                // Initialize when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initToggle);
                } else {
                    initToggle();
                }
            })();
        </script>
        <?php
        echo ob_get_clean();
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
