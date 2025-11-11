<?php

namespace AR_TRY_ON_Public;

use AR_TRY_ON\AR_TRY_ON_Helper;
use AR_TRY_ON\AR_TRY_ON_Cache;

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://racmanuel.dev
 * @since      1.0.0
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two hooks to
 * enqueue the public-facing stylesheet and JavaScript.
 * As you add hooks and methods, update this description.
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/public
 * @author     Manuel Ramirez Coronel <ra_cm@outlook.com>
 */
class AR_TRY_ON_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_name The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The unique prefix of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $plugin_prefix The string used to uniquely prefix technical functions of this plugin.
	 */
	private $plugin_prefix;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	private $localize_data = [];

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $plugin_name The name of the plugin.
	 * @param string $plugin_prefix The unique prefix of this plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 */
	public function __construct( $plugin_name, $plugin_prefix, $version ) {

		$this->plugin_name   = $plugin_name;
		$this->plugin_prefix = $plugin_prefix;
		$this->version       = $version;


		$this->localize_data = [
			'api_url'       => esc_url_raw( rest_url() ),
			'api_namespace' => 'ar_try_on',
			'api_version'   => 'v1',
			'nonce'         => wp_create_nonce( ATLAS_AR_NONCE ),
			'plugin_name'   => ATLAS_AR_PLUGIN_NAME,
			'rest_nonce'    => wp_create_nonce( 'wp_rest' ),
			'VERSION'       => ATLAS_AR_VERSION,
			'is_pro_active' => is_plugin_active( 'ar-vr-3d-model-try-on-premium/ar-vr-3d-model-try-on-premium.php' ),
            'cached_ids'    => AR_TRY_ON_Helper::update_cache_data(false),
            'img'    => 'http://localhost/azizulhasan/tts/wp-content/uploads/2025/10/167113823-3f0757ff-c7c2-44d0-a1e9-0b006772b39a-300x300.jpeg',
		];


		// Add "type=module" attribute
		add_filter( 'script_loader_tag', function ( $tag, $handle, $src ) {
			if ( 'ar-try-on-google-model-viewer' === $handle || 'AtlasAR' === $handle ) {
				$tag = '<script type="module" src="' . esc_url( $src ) . '"></script>';
			}

			return $tag;
		}, 10, 3 );

	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( is_admin() && AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_style( 'ar-vr-3d-model-try-on', ATLAS_AR_PLUGIN_URL . '/public/css/ar-try-on.css', array(), $this->version, 'all' );
			
			
		}
		
		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			
			wp_enqueue_style( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );
			wp_enqueue_style( 'atlas_ar_modal', ATLAS_AR_PLUGIN_URL . 'public/css/atlas_ar_modal.css', array(), $this->version, 'all' );
		}

		

	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
//			if ( ! $this->localize_data['is_pro_active'] ) {
//				wp_enqueue_script( 'ar-try-on-google-model-viewer', ATLAS_AR_PLUGIN_URL . 'public/js/google-model-viewer.js', array(), $this->version, true );
//			}
            // TODO:: enqueue base on model setup/settings
			wp_enqueue_script( 'ar-try-on-google-model-viewer', ATLAS_AR_PLUGIN_URL . 'public/js/google-model-viewer.js', array(), $this->version, true );
            wp_enqueue_script( 'AtlasAR', ATLAS_AR_PLUGIN_URL . 'public/js/AtlasAR.dist.js', array(), $this->version, false );
            wp_enqueue_script( $this->plugin_name, ATLAS_AR_PLUGIN_URL . 'public/js/ar-vr-3d-model-try-on-public-dist.js', array(), $this->version, true );

			if(AR_TRY_ON_Helper::is_qr_code_enabled()){
				wp_enqueue_script( 'ar-try-on-qr-generator', ATLAS_AR_PLUGIN_URL . 'public/js/ar-try-on-qr-generator.min.js', array(), $this->version, false );
			}

            if ( function_exists( 'is_product' ) || is_product() ) {
//                wp_enqueue_script( 'atlas_ar-single-product', ATLAS_AR_PLUGIN_URL . 'public/js/single-product.js', array('jquery'), '1.0', true );
            }

            wp_localize_script( $this->plugin_name, 'ar_try_on', $this->localize_data );
            wp_localize_script( 'atlas_ar-single-product', 'ar_try_on', $this->localize_data );

        }


	}

    public function atlas_ar_button( $content ) {
        $current_filter = current_filter();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            if ( $current_filter === 'the_content' ) {
                return $content;
            }

            return;
        }

        // Global product variable
        global $product;
        global $post;
        if ( $product ) {
            $post_id = $product->get_id();
        } else {
            $post_id = $post->ID;
        }
		
        $ar_button_content = '';
		/**
		 * AR-27: Cache system is  giving empty value.
		 */
		$settings   = (array) get_option( 'ar_try_on_settings' );
		$ar_button_content = AR_TRY_ON_Helper::get_qr_code($settings);
		

        $should_add_ar_button = false;
        if ( isset( $settings['ar_try_on_display_button_automatically'] ) && $settings['ar_try_on_display_button_automatically'] == 'yes' ) {
            $should_add_ar_button = true;
        }

        if( !has_shortcode($post->post_content, 'atlas_ar') && $should_add_ar_button ) {
            ob_start();
            ?>
            <button product-id="<?php echo esc_attr( $post_id ) ?>" class="ar_vr_3d_model_try_on">View in AR</button>
            <?php
            $ar_button_content .= ob_get_clean();
        }

        if ( $post->post_type != 'product' ) {
            return $content . $ar_button_content;
        } else {
            echo $ar_button_content;
        }
    }


	public function atlas_ar_button_tab( $content ) {
		$current_filter = current_filter();
        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
            if ( $current_filter === 'the_content' ) {
				return $content;
			}

			return;
		}

        // Global product variable
		global $product;
		global $post;
		if ( $product ) {
			$post_id = $product->get_id();
		} else {
			$post_id = $post->ID;
		}
        ob_start();
        ?>
        <div  id="atlas_ar_<?php echo esc_attr($post_id) ?>"></div>
        <script type="module">
            document.addEventListener("DOMContentLoaded", async function  () {
                let atlasAR = new window.AtlasAR()
                let product_id = "<?php echo esc_attr($post_id) ?>";
                const htmlContent = atlasAR.getModelSkeleton(`model_viewer_${product_id}`);

                let current_product = document.getElementById('atlas_ar_' + product_id);
                let tab = document.getElementById('tab-title-atlas_ar_3d_view');
                let modelLoaded = false;
                tab.addEventListener('click', async function() {
                    if(!modelLoaded) {
                        current_product.innerHTML = '<h1>3D File Is Loading</h1>'
                    }
                    setTimeout(async  function(){
                        if (tab.classList.contains('active') && current_product && !modelLoaded) {
                            current_product.innerHTML = htmlContent; // Insert model-viewer HTML
                            atlasAR.fetchModelData(product_id, "#model_viewer_"+product_id )
                        }
                    }, 500)
                })

            });
        </script>
        <?php
        $ar_button_content = ob_get_clean();


		if ( $post->post_type != 'product' ) {
			return $content . $ar_button_content;
		} else {
			echo $ar_button_content;
		}
	}


	/**
	 * Adds a custom tab to the WooCommerce product page for viewing the product in 3D.
	 *
	 * @param array $tabs An associative array of the existing WooCommerce product tabs.
	 *
	 * @return array Modified array.
	 * @since 1.0.3
	 *
	 */
	public function atlas_ar_woocommerce_tab( $tabs ) {

		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return $tabs;
		}

		$tabs['atlas_ar_3d_view'] = array(
			'title'    => __( 'AtlasAR Product View', 'woocommerce' ),
			'priority' => 50,
			'callback' => array( $this, 'atlas_ar_button_tab' ),
		);

		return $tabs;
	}


}
