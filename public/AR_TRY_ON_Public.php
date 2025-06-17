<?php

namespace AR_TRY_ON_Public;

use AR_TRY_ON\AR_TRY_ON_Helper;

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
			'nonce'         => wp_create_nonce( AR_TRY_ON_NONCE ),
			'plugin_name'   => AR_TRY_ON_PLUGIN_NAME,
			'rest_nonce'    => wp_create_nonce( 'wp_rest' ),
			'VERSION'       => AR_TRY_ON_VERSION,
			'is_pro_active' => is_plugin_active( 'ar-vr-3d-model-try-on-premium/ar-vr-3d-model-try-on-premium.php' ),
		];


		// Add "type=module" attribute
		add_filter( 'script_loader_tag', function ( $tag, $handle, $src ) {
			if ( 'ar-try-on-google-model-viewer' === $handle ) {
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
			wp_enqueue_style( 'ar-vr-3d-model-try-on', AR_TRY_ON_PLUGIN_URL . '/public/css/ar-try-on.css', array(), $this->version, 'all' );
		}
		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_style( 'alertify', AR_TRY_ON_PLUGIN_URL . 'public/css/alertifyjs/alertify.css', array(), $this->version, 'all' );
			wp_enqueue_style( 'alertify-default', AR_TRY_ON_PLUGIN_URL . 'public/css/alertifyjs/themes/default.css', array( 'alertify' ), $this->version, 'all' );
			wp_enqueue_style( $this->plugin_name, AR_TRY_ON_PLUGIN_URL . 'public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );
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
//				wp_enqueue_script( 'ar-try-on-google-model-viewer', AR_TRY_ON_PLUGIN_URL . 'public/js/google-model-viewer.js', array(), $this->version, true );
//			}
            // TODO:: enqueue base on model setup/settings
			wp_enqueue_script( 'ar-try-on-google-model-viewer', AR_TRY_ON_PLUGIN_URL . 'public/js/google-model-viewer.js', array(), $this->version, true );
			wp_enqueue_script( $this->plugin_name, AR_TRY_ON_PLUGIN_URL . 'public/js/ar-vr-3d-model-try-on-public-dist.js', array(  ), $this->version, true );
			wp_localize_script( $this->plugin_name, 'ar_try_on', $this->localize_data );
		}


	}

    public function ar_try_on_button( $content ) {
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
        <button product-id="<?php echo esc_attr( $post_id ) ?>" class="ar_vr_3d_model_try_on">View in 3D</button>
        <?php
        $ar_button_content = ob_get_clean();

        if ( $post->post_type != 'product' ) {
            return $content . $ar_button_content;
        } else {
            echo $ar_button_content;
        }
    }


	public function ar_try_on_button_tab( $content ) {
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

            /**
             * Post data method.
             * @param {url} url api url
             * @param {method} method request type
             * @returns
             */
            async function  postWithoutImage(url = "", data = {})  {
                // Default options are marked with *
                const response = await fetch(url, {
                    // headers: {
                    //   "Content-Type": "application/json",
                    // },
                    method: "POST", // *GET, POST, PUT, DELETE, etc.
                    body: data, // body data type must match "Content-Type" header
                    headers: {
                        'X-WP-Nonce': ar_try_on.rest_nonce
                    },
                });
                const responseData = await response.json(); // parses JSON response into native JavaScript objects

                return responseData;
            };

            /**
             *
             * @param endpoint
             * @returns {string}
             */
            function getURL(endpoint = '') {
                return ar_try_on.api_url + ar_try_on.api_namespace + '/' + ar_try_on.api_version + '/' + endpoint;
            }
            document.addEventListener("DOMContentLoaded", async function  () {
                let product_id = "<?php echo esc_attr($post_id) ?>";
                const htmlContent = `
                        <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <model-viewer
                                id="model_viewer_${product_id}"
                                src=""
                                alt=""
                                poster=""
                                reveal=""
                                loading=""
                                ar
                                ar-modes=""
                                camera-controls
                                ar-scale="auto"
                                xr-environment
                                style="width: 100%; max-width: 600px; height: 400px;"
                            ></model-viewer>
                        </div>`;

                let current_product = document.getElementById('atlas_ar_' + product_id);
                let tab = document.getElementById('tab-title-ar_try_on_3d_view');
                let modelLoaded = false;
                tab.addEventListener('click', async function() {
                    if(!modelLoaded) {
                        current_product.innerHTML = '<h1>3D File Is Loading</h1>'
                    }
                    setTimeout(async  function(){
                        if (tab.classList.contains('active') && current_product && !modelLoaded) {
                            current_product.innerHTML = htmlContent; // Insert model-viewer HTML
                            let formData = new FormData();
                            formData.append('product_id', product_id);
                            await postWithoutImage(getURL('get_model_and_settings'), formData)
                                .then((response) => {
                                    if (response.success) {
                                        const data = response.data;
                                        // Check if the data exists before assigning it to model-viewer
                                        if (data) {
                                            const modelViewer = document.getElementById("model_viewer_"+product_id);
                                            if (modelViewer) {
                                                console.log({modelViewer})
                                                modelViewer.setAttribute('src', data.model_3d_file || '');
                                                modelViewer.setAttribute('ios-src', data.model_ios_file || '');
                                                modelViewer.setAttribute('alt', data.model_alt || '');
                                                modelViewer.setAttribute('poster', data.model_poster || '');
                                                modelViewer.setAttribute('reveal', data.reveal || 'auto');
                                                modelViewer.setAttribute('loading', data.loading || 'auto');
                                                modelViewer.setAttribute('ar-modes', (data.ar_modes || []).join(' '));
                                                modelViewer.setAttribute('ar-placement', (data.ar_placement || 'floor'));
                                                modelViewer.style.backgroundColor = data.poster_color || 'rgba(255,255,255,0)';
                                                const scale = data.scale || 'auto'; // Default value if not defined
                                                modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
                                                if (data.ar === "deactivate") {
                                                    modelViewer.removeAttribute('ar');
                                                }
                                                if (data.xr_environment === "deactivate") {
                                                    modelViewer.removeAttribute('xr-environment');
                                                }

                                                if(data.custom_button === "activate") {
                                                    modelViewer.innerHTML =  `<button> ${data.custom_button_text || 'Activate Ar'} </button>` ;
                                                }

                                                modelLoaded = true;
                                            }
                                        }
                                    }
                                })
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
	public function ar_try_on_woocommerce_tab( $tabs ) {

		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			return $tabs;
		}

		$tabs['ar_try_on_3d_view'] = array(
			'title'    => __( 'AR Try On Product View', 'woocommerce' ),
			'priority' => 50,
			'callback' => array( $this, 'ar_try_on_button_tab' ),
		);

		return $tabs;
	}


}
