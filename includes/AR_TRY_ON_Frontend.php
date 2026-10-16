<?php
/**
 * AR-116: where the 3D view appears on the shop — WooCommerce placements, the product tab, posts and
 * pages, the [atlas_ar] shortcode — and loading the viewer SDK only on pages that show one.
 *
 * Placements (Settings › Placement, a product may override):
 *   gallery    in the product gallery, the photo first (a 3D button switches)
 *   gallery3d  in the product gallery, the 3D view first
 *   button     a "View in 3D" button that opens the 3D view in a popup
 *   tab        only in the "3D view" product tab
 *   slide      one more slide among the product images
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Frontend {

	const SDK_HANDLE   = 'atlas-ar-sdk';
	const FRONT_HANDLE = 'atlas-ar-front';

	/** WooCommerce hook and priority for each button position. */
	const BUTTON_HOOKS = array(
		'after_cart'    => array( 'woocommerce_after_add_to_cart_form', 15 ),
		'before_cart'   => array( 'woocommerce_before_add_to_cart_form', 15 ),
		'after_summary' => array( 'woocommerce_single_product_summary', 45 ),
		'under_images'  => array( 'woocommerce_product_thumbnails', 30 ),
	);

	/** @var bool the try-on button was printed for this product */
	private static $tryon_done = array();

	/** Called on `init` (atlas_ar_run). */
	public static function init() {
		self::register_shortcode();
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ), 5 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'quiet_old_pro' ), 6 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'drop_old_pro_scripts' ), 21 );
		add_action( 'wp_footer', array( __CLASS__, 'enqueue_if_used' ), 1 );
		add_filter( 'script_loader_tag', array( __CLASS__, 'no_optimize' ), 10, 2 );
		add_action( 'wp', array( __CLASS__, 'place' ) );
		add_filter( 'the_content', array( __CLASS__, 'content' ), 20 );
	}

	/** Register (not load) the SDK and the small shop script; they load only when a viewer prints. */
	public static function register_assets() {
		$sdk = ATLAS_AR_PLUGIN_PATH . 'public/js/atlasar-sdk/atlasar.js';
		if ( ! file_exists( $sdk ) ) {
			return; // no SDK build in this copy: nothing to show, never an error
		}
		wp_register_script( self::SDK_HANDLE, ATLAS_AR_PLUGIN_URL . 'public/js/atlasar-sdk/atlasar.js', array(), (string) filemtime( $sdk ), array( 'in_footer' => true, 'strategy' => 'defer' ) );
		$front = ATLAS_AR_PLUGIN_PATH . 'public/js/atlas-ar-front.js';
		wp_register_script( self::FRONT_HANDLE, ATLAS_AR_PLUGIN_URL . 'public/js/atlas-ar-front.js', array( self::SDK_HANDLE ), (string) filemtime( $front ), array( 'in_footer' => true, 'strategy' => 'defer' ) );
		$css = ATLAS_AR_PLUGIN_PATH . 'public/css/atlas-ar-front.css';
		wp_register_style( self::FRONT_HANDLE, ATLAS_AR_PLUGIN_URL . 'public/css/atlas-ar-front.css', array(), (string) filemtime( $css ) );
	}

	/**
	 * AtlasAR Pro 3.x adds its old variation script (for the old viewer) and makes it need the
	 * removed `AtlasAR` script; WordPress 6.9.1+ warns about that missing dependency at once. The
	 * SDK viewer switches variations itself (atlas-ar-front.js), so the old script has nothing to
	 * do: an empty `AtlasAR` handle (no file, no code) keeps WordPress quiet, then the old script
	 * is dropped. Only while Pro 3.x is active; Pro 4 (ATLAS_AR_PRO_SDK) needs neither.
	 */
	public static function quiet_old_pro() {
		if ( self::old_pro() && ! wp_script_is( 'AtlasAR', 'registered' ) ) {
			wp_register_script( 'AtlasAR', false, array(), ATLAS_AR_VERSION, true );
		}
	}

	public static function drop_old_pro_scripts() {
		if ( self::old_pro() ) {
			wp_dequeue_script( 'atlas-ar-variation-handler' );
			wp_deregister_script( 'atlas-ar-variation-handler' );
		}
	}

	/** AtlasAR Pro 3.x (the old viewer's Pro) is active: Pro 4 defines ATLAS_AR_PRO_SDK. */
	private static function old_pro() {
		return defined( 'AR_TRY_ON_PRO_VERSION' ) && ! defined( 'ATLAS_AR_PRO_SDK' );
	}

	/**
	 * Caching / optimisation plugins must not combine or delay the viewer SDK: it loads its own
	 * files (model-viewer, decoders, try-on) from next to itself.
	 */
	public static function no_optimize( $tag, $handle ) {
		if ( self::SDK_HANDLE === $handle && false === strpos( $tag, 'data-no-optimize' ) ) {
			$tag = str_replace( ' src=', ' data-no-optimize="1" data-no-minify="1" data-cfasync="false" data-wpmeteor-nooptimize="true" src=', $tag );
		}
		return $tag;
	}

	/** Load the scripts in the footer when something on the page used them. */
	public static function enqueue_if_used() {
		if ( AR_TRY_ON_Viewer::used() && wp_script_is( self::SDK_HANDLE, 'registered' ) ) {
			wp_enqueue_script( self::FRONT_HANDLE );
			wp_enqueue_style( self::FRONT_HANDLE );
		}
	}

	/** On a single product with a model: hook the chosen placement in. */
	public static function place() {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}
		$post_id = (int) get_queried_object_id();
		if ( ! self::enabled_for( $post_id ) ) {
			return;
		}
		$product = AR_TRY_ON_Product::get( $post_id );
		$mode    = 'site' === $product['placement'] ? AR_TRY_ON_Settings::get( 'placement.mode' ) : $product['placement'];
		if ( 'slide' === $mode && ! self::has_photos( $post_id ) ) {
			$mode = 'gallery3d'; // no photos = no slider: the 3D view takes the placeholder's place
		}
		$show_3d = '' === $product['tryon'] || $product['tryon_viewer'];

		if ( $show_3d ) {
			switch ( $mode ) {
				case 'gallery':
				case 'gallery3d':
					// Printed after the gallery; atlas-ar-front.js moves it over the main image.
					add_action(
						'woocommerce_before_single_product_summary',
						function () use ( $post_id, $mode ) {
							$html = AR_TRY_ON_Viewer::render( $post_id, 'gallery' );
							if ( $html ) {
								AR_TRY_ON_Viewer::print_html( '<div class="atlas-ar-gallery" data-atlas-ar-start="' . esc_attr( 'gallery3d' === $mode ? '3d' : 'image' ) . '" hidden>' . $html . '</div>' );
							}
						},
						25
					);
					break;
				case 'slide':
					add_action(
						'woocommerce_product_thumbnails',
						function () use ( $post_id ) {
							$html = AR_TRY_ON_Viewer::render( $post_id, 'slide' );
							if ( $html ) {
								AR_TRY_ON_Viewer::print_html( '<div class="woocommerce-product-gallery__image atlas-ar-slide" data-thumb="' . esc_url( self::thumb( $post_id ) ) . '">' . $html . '</div>' );
							}
						},
						5
					);
					break;
				case 'button':
					$hook = AR_TRY_ON_Settings::get( 'placement.button_position' );
					$hook = isset( self::BUTTON_HOOKS[ $hook ] ) ? self::BUTTON_HOOKS[ $hook ] : self::BUTTON_HOOKS['after_cart'];
					add_action(
						$hook[0],
						function () use ( $post_id ) {
							AR_TRY_ON_Viewer::print_html( AR_TRY_ON_Viewer::render( $post_id, 'popup', array( 'buttonLabel' => __( 'View in 3D', 'ar-vr-3d-model-try-on' ) ) ) );
						},
						$hook[1]
					);
					break;
			}
			if ( 'tab' === $mode || AR_TRY_ON_Settings::get( 'placement.product_tab' ) ) {
				add_filter( 'woocommerce_product_tabs', array( __CLASS__, 'add_tab' ) );
			}
		}

		// Try-on button under "Add to cart" (also for products that show no 3D view).
		add_action(
			'woocommerce_after_add_to_cart_form',
			function () use ( $post_id ) {
				self::print_tryon( $post_id );
			},
			20
		);
	}

	/** The "3D view" product tab. */
	public static function add_tab( $tabs ) {
		$tabs['atlas_ar'] = array(
			'title'    => __( '3D view', 'ar-vr-3d-model-try-on' ),
			'priority' => 15,
			'callback' => function () {
				AR_TRY_ON_Viewer::print_html( AR_TRY_ON_Viewer::render( (int) get_queried_object_id(), 'tab' ) );
			},
		);
		return $tabs;
	}

	/**
	 * Posts and pages (the post types chosen in Settings): the 3D view after the content, unless the
	 * content places it with the shortcode or the block.
	 */
	public static function content( $content ) {
		if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}
		$post_id = (int) get_the_ID();
		if ( 'product' === get_post_type( $post_id ) || ! self::enabled_for( $post_id ) || has_shortcode( (string) $content, 'atlas_ar' ) ) {
			return $content;
		}
		$product = AR_TRY_ON_Product::get( $post_id );
		$extra   = '' === $product['tryon'] || $product['tryon_viewer'] ? AR_TRY_ON_Viewer::render( $post_id, 'inline' ) : '';
		$extra  .= AR_TRY_ON_Viewer::tryon_button( $post_id );
		return $content . ( $extra ? wp_kses( '<div class="atlas-ar-after-content">' . $extra . '</div>', AR_TRY_ON_Viewer::allowed_html() ) : '' );
	}

	public static function register_shortcode() {
		add_shortcode( 'atlas_ar', array( __CLASS__, 'shortcode' ) );
	}

	/**
	 * [atlas_ar] — the current post's 3D view; `id` shows any 3D Library model's product instead.
	 * Attributes: width, height, aspect_ratio, padding, margin, reveal="false" (a button that opens
	 * a popup), button_label, position="after" (wrapped text goes after the 3D view, else before).
	 * Unknown or old attributes are ignored; text wrapped in [atlas_ar]…[/atlas_ar] is always kept.
	 */
	public static function shortcode( $atts, $content = '' ) {
		$inner = '' !== (string) $content ? do_shortcode( (string) $content ) : '';
		$after = is_array( $atts ) && isset( $atts['position'] ) && 'after' === $atts['position'];
		$html  = self::shortcode_viewer( $atts );
		return $after ? $html . $inner : $inner . $html;
	}

	/** The [atlas_ar] 3D view itself (without the wrapped text). */
	private static function shortcode_viewer( $atts ) {
		$atts    = shortcode_atts(
			array(
				'id'           => 0,
				'width'        => '100%',
				'height'       => '420px',
				'aspect_ratio' => '',
				'padding'      => '',
				'margin'       => '',
				'reveal'       => 'true',
				'button_label' => '',
			),
			(array) $atts,
			'atlas_ar'
		);
		$post_id = (int) $atts['id'] ? (int) $atts['id'] : AR_TRY_ON_Helper::current_post_id();
		if ( ! $post_id || ! AR_TRY_ON_Product::has_model( $post_id ) ) {
			return '';
		}
		$reveal = filter_var( $atts['reveal'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
		if ( false === $reveal ) {
			$label = '' !== $atts['button_label'] ? sanitize_text_field( $atts['button_label'] ) : __( 'View in 3D', 'ar-vr-3d-model-try-on' );
			return wp_kses( AR_TRY_ON_Viewer::render( $post_id, 'popup', array( 'buttonLabel' => $label ) ) . AR_TRY_ON_Viewer::tryon_button( $post_id ), AR_TRY_ON_Viewer::allowed_html() );
		}
		$box = array();
		foreach ( array( 'width', 'padding', 'margin' ) as $k ) {
			if ( '' !== $atts[ $k ] ) {
				$box[] = $k . ':' . AR_TRY_ON_Helper::sanitize_css_value( $atts[ $k ] );
			}
		}
		$box[] = '' !== $atts['aspect_ratio'] ? 'aspect-ratio:' . AR_TRY_ON_Helper::sanitize_css_value( $atts['aspect_ratio'] ) : 'height:' . AR_TRY_ON_Helper::sanitize_css_value( $atts['height'] );
		$html  = AR_TRY_ON_Viewer::render( $post_id, 'inline', array( 'height' => '100%' ) );
		return wp_kses( '<div class="atlas-ar-shortcode" style="' . esc_attr( implode( ';', $box ) ) . '">' . $html . '</div>' . AR_TRY_ON_Viewer::tryon_button( $post_id ), AR_TRY_ON_Viewer::allowed_html() );
	}

	/** Print the try-on button once per product. */
	private static function print_tryon( $post_id ) {
		if ( ! empty( self::$tryon_done[ $post_id ] ) ) {
			return;
		}
		$html = AR_TRY_ON_Viewer::tryon_button( $post_id );
		if ( $html ) {
			self::$tryon_done[ $post_id ] = true;
			AR_TRY_ON_Viewer::print_html( $html );
		}
	}

	/** AtlasAR is on for this post type and the post has a model. */
	private static function enabled_for( $post_id ) {
		$types = (array) AR_TRY_ON_Settings::get( 'general.post_types', array( 'product' ) );
		return $post_id && in_array( get_post_type( $post_id ), $types, true ) && AR_TRY_ON_Product::has_model( $post_id );
	}

	/** The product has a main image or gallery images. */
	private static function has_photos( $post_id ) {
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $post_id ) : null;
		return $product && ( $product->get_image_id() || $product->get_gallery_image_ids() );
	}

	/** Thumbnail for the gallery slide: the model's poster, else the product image. */
	private static function thumb( $post_id ) {
		$model = AR_TRY_ON_Library::get( AR_TRY_ON_Product::model_id( $post_id ) );
		if ( $model && ! empty( $model['files']['poster']['url'] ) ) {
			return $model['files']['poster']['url'];
		}
		$img = get_the_post_thumbnail_url( $post_id, 'woocommerce_gallery_thumbnail' );
		return $img ? $img : '';
	}
}
