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

	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if ( AR_TRY_ON_Helper::is_product_page() ) {
			wp_enqueue_style( 'ar-vr-3d-try-on-for-wordpress', plugin_dir_url( __FILE__ ) . 'css/ar-try-on.css', array(), $this->version, 'all' );
			wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/ar-vr-3d-try-on-for-wordpress-public.css', array(), $this->version, 'all' );
			wp_enqueue_style( 'jquery-ui-theme', plugin_dir_url( __FILE__ ) . 'css/jquery-ui.min.css', array(), $this->version, 'all' );
		}
	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		if ( AR_TRY_ON_Helper::is_product_page() ) {
			wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/ar-vr-3d-try-on-for-wordpress-public-dist.js', array( 'jquery' ), $this->version, true );
			wp_enqueue_script( 'jquery-ui-dialog' );
		}
	}


	public function ar_try_on_for_wordpress_button() {
		// Global product variable
		global $product;
		$get_poster       = '';
		$get_alt          = '';
		$get_ios_file     = '';
		$get_android_file = '';

		$product_settings = (array) get_post_meta( $product->get_id(), 'ar_try_on_product_settings', true );

		//Get the file url for android
		if ( isset( $product_settings['ar_try_on_for_wordpress_file_android'] ) && $product_settings['ar_try_on_for_wordpress_file_android'] ) {
			$get_android_file = $product_settings['ar_try_on_for_wordpress_file_android'];
		}

		//Get the fiel url for IOS
		if ( isset( $product_settings['ar_try_on_for_wordpress_file_ios'] ) && $product_settings['ar_try_on_for_wordpress_file_ios'] ) {
			$get_ios_file = $product_settings['ar_try_on_for_wordpress_file_ios'];
		}

		//Get the alt for web accessibility
		if ( isset( $product_settings['ar_try_on_for_wordpress_file_alt'] ) && $product_settings['ar_try_on_for_wordpress_file_alt'] ) {
			$get_alt = $product_settings['ar_try_on_for_wordpress_file_alt'];
		}

		//Get the Poster
		if ( isset( $product_settings['ar_try_on_for_wordpress_file_poster'] ) && $product_settings['ar_try_on_for_wordpress_file_poster'] ) {
			$get_poster = $product_settings['ar_try_on_for_wordpress_file_poster'];
		}

		// Check if the customs fields has a value.
		if ( ! empty( $get_android_file ) ) {
			$android_file_url = $get_android_file;
		}
		if ( ! empty( $get_ios_file ) ) {
			$ios_file_url = $get_ios_file;
		}
		if ( ! empty( $get_alt ) ) {
			$alt_description = sanitize_text_field( $get_alt );
		} else {
			$alt_description = $product->get_name();
		}
		if ( ! empty( $get_poster ) ) {
			$poster_file_url = $get_poster;
		} else {
			$poster_file_url = wp_get_attachment_url( $product->get_image_id() );
		}

		/**
		 * If product not have a 3D Model - Hide the button
		 */
		if ( ! empty( $android_file_url ) & ! empty( $ios_file_url ) ) {
			/**
			 * Get the CMB2 Options or plugin options
			 */
			$ar_try_on_settings = (array) get_option( 'ar_try_on_for_wordpress_settings' );

			/**
			 * Get the Loading Type from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-loading-attributes-loading
			 */
			$loading_type = $ar_try_on_settings['ar_try_on_for_wordpress_loading'];
			/**
			 * Check the value of $loading_type and return the $loading_type
			 *
			 * @param string $loading_type
			 */
			$loading_type = $this->ar_try_on_for_wordpress_loading_type( $loading_type );

			/**
			 * Get th Reveal Type from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-loading-attributes-reveal
			 */
			$reveal_type = $ar_try_on_settings['ar_try_on_for_wordpress_reveal'];
			/**
			 * Check the value of $reveal_type and return the $reveal_type
			 *
			 * @param string $reveal_type
			 */
			$reveal_type = $this->ar_try_on_for_wordpress_reveal_type( $reveal_type );

			/**
			 * Get the --poster-color from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-loading-attributes-reveal
			 */
			$poster_color_type = $ar_try_on_settings['ar_try_on_for_wordpress_poster_color'];
			/**
			 * Check the value of $poster_color_type and return the $poster_color_type
			 *
			 * @param string $poster_color_type
			 */
			$poster_color_type = $this->ar_try_on_for_wordpress_poster_color( $poster_color_type );

			/**
			 * AR Settings
			 */

			/**
			 * Get the --poster-color from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-augmentedreality-attributes-ar
			 */
			$ar_active = $ar_try_on_settings['ar_try_on_for_wordpress_ar'];
			/**
			 * Check the value of $ar_active and return the $ar_active
			 *
			 * @param string $ar_active
			 */
			$ar_active = $this->ar_try_on_for_wordpress_ar( $ar_active );

			/**
			 * Get the ar-modes from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-augmentedreality-attributes-arModes
			 */
			$ar_mode = $ar_try_on_settings['ar_try_on_for_wordpress_ar_modes'];
			/**
			 * Check the value of $ar_active and return the $ar_active
			 *
			 * @param string $ar_active
			 */
			$ar_mode = $this->ar_try_on_for_wordpress_ar_modes( $ar_mode );

			/**
			 * Get the ar scale from plugin settings
			 * @see: https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-attributes-arScale
			 */
			$ar_scale = $ar_try_on_settings['ar_try_on_for_wordpress_ar_scale'];
			/**
			 * Check the value of $ar_scale and return the $ar_scale
			 *
			 * @param string $ar_scale
			 */
			$ar_scale = $this->ar_try_on_for_wordpress_ar_scale( $ar_scale );

			/**
			 * Get the ar placement from plugin settings
			 * @see: https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-attributes-arPlacement
			 */
			$ar_placement = $ar_try_on_settings['ar_try_on_for_wordpress_ar_placement'];
			/**
			 * Check the value of $ar_placement and return the $ar_placement
			 *
			 * @param string $ar_placement
			 */
			$ar_placement = $this->ar_try_on_for_wordpress_ar_placement( $ar_placement );

			/**
			 * Get the xr_enviroment from plugin settings
			 * @see: https://modelviewer.dev/docs/index.html#entrydocs-augmentedreality-attributes-xrEnvironment
			 */
			$xr_enviroment = $ar_try_on_settings['ar_try_on_for_wordpress_xr_environment'];
			/**
			 * Check the value of xr_enviroment and return the $xr_enviroment
			 *
			 * @param string $xr_enviroment
			 */
			$xr_enviroment = $this->ar_try_on_for_wordpress_ar_xr_environment( $xr_enviroment );

			/**
			 * AR Button Settings
			 */

			/**
			 * Get the custom btn option from plugin settings
			 * @see: https://modelviewer.dev/docs/#entrydocs-augmentedreality-slots-arButton
			 */
			$ar_btn_custom = $ar_try_on_settings['ar_try_on_for_wordpress_ar_button'];
			/**
			 * Check ar button custom is active
			 */
			$ar_btn_custom = $this->ar_try_on_for_wordpress_ar_btn_custom( $ar_btn_custom );

			// Get the custom text btn
			$ar_btn_custom_text = $ar_try_on_settings['ar_try_on_for_wordpress_ar_button_text'];
			// Get the custom backgrund btn
			$ar_btn_custom_background = $ar_try_on_settings['ar_try_on_for_wordpress_ar_button_background_color'];
			// Get the custom text color btn
			$ar_btn_custom_text_color = $ar_try_on_settings['ar_try_on_for_wordpress_ar_button_text_color'];

			//Include the HTML for display the modal and the HTML content with a little bit PHP
			/**
			 * Provide a public-facing view for the plugin
			 *
			 * This file is used to markup the public-facing aspects of the plugin.
			 *
			 * @link       https://racmanuel.dev
			 * @since      1.0.0
			 *
			 * @package    AR_TRY_ON
			 * @subpackage AR_TRY_ON/public/partials
			 */
			?>
            <!-- This file should primarily consist of HTML with a little bit of PHP. -->
            <button id="ar_try_on_for_wordpress_btn">View in 3D</button>

            <div id="dialog" title="<?php echo esc_attr( $product->get_name() ) ?>">
                <!-- AR Model Viewer for wordpress - Styles -->
                <style type="text/css">
                    model-viewer#reveal {
                        --poster-color: <?php echo esc_js($this->ar_try_on_for_wordpress_poster_color($poster_color_type));
                ?>;
                    }
                </style>
                <!-- AR Model Viewer for Wordpress - Styles -->

                <!-- AR Model Viewer for Wordpress - HTML -->
                <model-viewer id="reveal"
                              alt="<?php echo esc_attr( $alt_description ) ?>"
                              src="<?php echo esc_url( $android_file_url ); ?>"
                              ios-src="<?php echo esc_url( $ios_file_url ); ?>"
                              poster="<?php echo esc_url( $poster_file_url ); ?>"
					<?php echo esc_attr( $loading_type ); ?>
					<?php echo esc_attr( $reveal_type ); ?>
					<?php echo esc_attr( $ar_active ); ?>
                              ar-modes="<?php echo esc_attr( $ar_mode ); ?>"
					<?php echo esc_attr( $ar_scale ); ?>
					<?php echo esc_attr( $ar_placement ); ?>
					<?php echo esc_attr( $xr_enviroment ); ?>
                              seamless-poster
                              camera-controls
                              enable-pan>
                </model-viewer>
                <!-- AR Model Viewer for Wordpress - HTML -->

                <!-- AR Custom Button -->
				<?php if ( esc_html( $ar_btn_custom ) == true ): ?>
                    <button slot="ar-button"
                            style="background-color: <?php echo esc_attr( $ar_btn_custom_background ); ?>; color: <?php echo esc_attr( $ar_btn_custom_text_color ); ?>; border-radius: 4px; border: none; position: absolute; top: 16px; right: 16px; ">
						<?php echo esc_html( $ar_btn_custom_text ); ?>
                    </button>
				<?php endif; ?>
                <!-- AR Custom Button -->
            </div>
			<?php
		}
	}


	private function display_button() {
		?>


		<?php
	}

	public function ar_try_on_for_wordpress_loading_type( $loading ) {
		switch ( $loading ) {
			case 1:
				# code...
				return 'loading="auto"';
				break;
			case 2:
				# code...
				return 'loading="lazy"';
				break;
			case 3:
				# code...
				return 'loading="eager"';
				break;
			default:
				# code...
				$loading = '';

				return $loading;
				break;
		}
	}

	public function ar_try_on_for_wordpress_reveal_type( $reveal ) {
		switch ( $reveal ) {
			case 1:
				# code...
				return 'reveal="auto"';
				break;
			case 2:
				# code...
				return 'reveal="interaction"';
				break;
			case 3:
				# code...
				return 'reveal="manual"';
				break;
			default:
				# code...
				return $reveal;
				break;
		}
	}

	public function ar_try_on_for_wordpress_poster_color( $poster_color ) {
		if ( isset( $poster_color ) ) {
			return $poster_color;
		} else {
			$poster_color = 'transparent';

			return $poster_color;
		}
	}

	public function ar_try_on_for_wordpress_ar( $ar ) {
		if ( isset( $ar ) & $ar == 1 ) {
			return 'ar';
		} else {
			return '';
		}
	}

	public function ar_try_on_for_wordpress_ar_modes( $ar_mode ) {
		foreach ( $ar_mode as $mode_for_ar ) {
			$mode = $mode_for_ar;
			if ( $mode == 1 ) {
				$mode_webxr = 'webxr';
			}
			if ( $mode == 2 ) {
				$mode_scene = 'scene-viewer';
			}
			if ( $mode == 3 ) {
				$mode_quick = 'quick-look';
			}
		}
		$ar_mode = $mode_webxr . ' ' . $mode_scene . ' ' . $mode_quick;

		return $ar_mode;
	}

	public function ar_try_on_for_wordpress_ar_scale( $scale ) {
		switch ( $scale ) {
			case 1:
				# code...
				return 'ar-scale="auto"';
				break;
			case 2:
				# code...
				return 'ar-scale="fixed"';
				break;
			default:
				# code...
				return $scale;
				break;
		}
	}

	public function ar_try_on_for_wordpress_ar_placement( $placement ) {
		switch ( $placement ) {
			case 1:
				# code...
				return 'ar-placement="floor"';
				break;
			case 2:
				return 'ar-placement="wall"';
				break;
			default:
				# code...
				return $placement;
				break;
		}
	}

	public function ar_try_on_for_wordpress_ar_xr_environment( $xr ) {
		switch ( $xr ) {
			case 1:
				# code...
				return 'xr-environment';
				break;
			case 2:
				# code...
				return '';
				break;
			default:
				# code...
				return $xr;
				break;
		}
	}

	public function ar_try_on_for_wordpress_ar_btn_custom( $btn_custom ) {
		if ( $btn_custom == 1 ) {
			return true;
		} else {
			return false;
		}
	}


}
