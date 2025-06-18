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
class AR_TRY_ON_Helper {
	public static function is_ar_try_on_page() {
		// Ensure we are in the admin area
		if ( is_admin() ) {
			if ( ! function_exists( 'get_current_screen' ) ) {
				require_once ABSPATH . 'wp-admin/includes/screen.php';
			}
			// Get the current screen object
			$screen = get_current_screen();
			// Check if we are on the "ar-try-on" page
			if ( $screen && $screen->id === 'toplevel_page_ar-vr-3d-model-try-on' ) {
				return true;
			}

			return false;
		}
	}


	public static function is_product_page() {
		if ( ! function_exists( 'get_current_screen' ) ) {
			require_once ABSPATH . 'wp-admin/includes/screen.php';
		}
		$screen = get_current_screen();

		if ( ( $screen && $screen->post_type == 'product' && $screen->base == 'post' ) || is_singular( 'product' ) ) {
			return true;
		}

		return false;
	}

	public static function get_post_types() {
		$cache_key   = AR_TRY_ON_Cache::get_key( 'get_post_types' );
		$cache_value = AR_TRY_ON_Cache::get( $cache_key );
		if ( $cache_value ) {
			return $cache_value;
		}
		$post_types      = get_post_types( array(
			'public' => 1, // Only get public post types
		), 'array' );
		$final_post_type = [];
		foreach ( $post_types as $post_type ) {
			$final_post_type[ $post_type->name ] = $post_type->name;
		}

		AR_TRY_ON_Cache::set( $cache_key, $final_post_type );

		return apply_filters( 'ar_try_on_get_post_types', $final_post_type );
	}

	public static function ar_try_on_should_load_button( $post_status = '' ) {
		$should_load_button = false;
		global $post;
		// is_home() || is_archive() || is_front_page() || is_category()
		if ( \is_single() || \is_singular() ) {
			$should_load_button = true;
		}

		$settings = (array) get_option( 'ar_try_on_settings' );

		if (
			! isset( $settings['ar_try_on_allowed_post_types'] )
			|| count( $settings['ar_try_on_allowed_post_types'] ) === 0
			|| ! is_array( $settings['ar_try_on_allowed_post_types'] )
			|| ! in_array( self::ar_try_on_post_type(), $settings['ar_try_on_allowed_post_types'] )

		) {
			$should_load_button = false;
		}

		if ( self::is_edit_page() ) {
			$should_load_button = true;
			if (
				! isset( $settings['ar_try_on_allowed_post_types'] )
				|| count( $settings['ar_try_on_allowed_post_types'] ) === 0
				|| ! is_array( $settings['ar_try_on_allowed_post_types'] )
				|| ! in_array( self::ar_try_on_post_type(), $settings['ar_try_on_allowed_post_types'] )
			) {
				$should_load_button = false;
			}
		}

		return apply_filters( 'ar_try_on_should_load_button', $should_load_button, $post );
	}

	/**
	 * Get post type
	 *
	 * @see
	 */

	public static function ar_try_on_post_type() {
		global $post;

		return isset( $post->post_type ) ? $post->post_type : '';
	}


	public static function is_edit_page() {
		global $pagenow;

		// Check if we are in the admin area and on the edit post/page screen
		if ( is_admin() ) {
			if ( $pagenow === 'post.php' || $pagenow === 'post-new.php' ) {
				return true;
			}
		}

		return false;
	}

	public static function is_ar_supported_post_type($call_type = '') {
		global $post;

		if ( ! $post ) {
			return false;
		}

		if ( ! is_admin() && ! ( is_singular() || is_single() ) ) {
			return false; // The current page is singular or single on the frontend
		}

		$settings   = (array) get_option( 'ar_try_on_settings' );
		$post_types = [];
		if ( isset( $settings['ar_try_on_allowed_post_types'] ) && ! empty( $settings['ar_try_on_allowed_post_types'] ) ) {
			$post_types = $settings['ar_try_on_allowed_post_types'];
		}

		$result = in_array( $post->post_type, $post_types );

		if ( $post->post_type == 'product' && in_array( $post->post_type, $post_types ) && $result && ! is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
			$result = false;
		}
		$current_hook = current_filter();
		if ( $post->post_type == 'product'
            && $result
            && $current_hook === 'the_content'
            && $call_type === '' ) {
			$result = false;
		}

		if ( ! is_admin() ) {
			$product_settings = (array) get_post_meta( $post->ID, 'ar_try_on_product_settings', true );

			//Get the file url for android
			if ( ! isset( $product_settings['ar_try_on_file_android'] ) ) {
				$result = false;
			}

			if ( isset( $product_settings['ar_try_on_file_android'] ) && ! $product_settings['ar_try_on_file_android'] ) {
				$result = false;
			}
		}


		return $result;
	}

    public static function create_shortcode( $attr, $content = '' ) {
        $attributes = shortcode_atts( array(
            'height' => '400px',
            'width' => '500px',
            'position' => 'after',
        ), $attr );



        $current_filter = current_filter();

        if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type('shortcode') ) {
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
            if(!$content) {
                $content = $post->post_content;
            }
        } else {
            $post_id = $post->ID;
            if(!$content) {
                $content = $post->post_content;
            }
        }

        ob_start();
        ?>
        <div style="height: <?php echo esc_attr($attributes['height']) ?>;width: <?php echo esc_attr($attributes['width']) ?>;" id="atlas_ar_shortcode_<?php echo esc_attr($post_id) ?>"></div>
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
                                id="model_viewer_shortcode_${product_id}"
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

                let current_product = document.getElementById('atlas_ar_shortcode_' + product_id);
                let modelLoaded = false;
                if(!modelLoaded) {
                    current_product.innerHTML = '<h1>3D File Is Loading</h1>'
                }
                current_product.innerHTML = htmlContent; // Insert model-viewer HTML
                let formData = new FormData();
                formData.append('product_id', product_id);
                await postWithoutImage(getURL('get_model_and_settings'), formData)
                    .then((response) => {
                        if (response.success) {
                            const data = response.data;
                            // Check if the data exists before assigning it to model-viewer
                            if (data) {
                                const modelViewer = document.getElementById("model_viewer_shortcode_"+product_id);
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

            });
        </script>
        <?php
        $ar_button_content = ob_get_clean();

        error_log(print_r( [ $current_filter, $post->post_type], true));


        return $ar_button_content;
    }

}
