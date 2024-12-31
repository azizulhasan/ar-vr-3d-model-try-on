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
			wp_enqueue_style( $this->plugin_name, AR_TRY_ON_PLUGIN_URL . '/public/css/ar-vr-3d-model-try-on-public.css', array(), $this->version, 'all' );

		}

	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		if ( AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			wp_enqueue_script( 'ar-try-on-google-model-viewer', AR_TRY_ON_PLUGIN_URL . '/public/js/google-model-viewer.js', array(), $this->version, true );
			wp_enqueue_script( $this->plugin_name, AR_TRY_ON_PLUGIN_URL . '/public/js/ar-vr-3d-model-try-on-public-dist.js', array( 'ar-try-on-google-model-viewer' ), $this->version, true );
			wp_localize_script( $this->plugin_name, 'ar_try_on', $this->localize_data );
		}


	}


	public function ar_try_on_button( $content ) {
		if ( ! AR_TRY_ON_Helper::is_ar_supported_post_type() ) {
			if ( current_filter() === 'the_content' ) {
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
        <button product-id="<?php echo esc_attr( $post_id ) ?>" id="ar_vr_3d_model_try_on">View in 3D</button>
		<?php
		$ar_button_content = ob_get_clean();

		if ( $post->post_type != 'product' ) {
			return $content . $ar_button_content;
		} else {
			echo $ar_button_content;
		}
	}


}
