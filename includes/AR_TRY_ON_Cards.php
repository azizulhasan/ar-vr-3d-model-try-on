<?php
/**
 * AR-176: AtlasAR on product cards — the shop and category pages, related products, the
 * Product Collection block and any other product loop.
 *
 *   - A "View in 3D and AR" button on every card whose product has a 3D model (or a try-on). It
 *     opens the same popup as the product page (AR on phones, the QR code on computers); a
 *     glasses or cap product gets the try-on button instead; wall art opens with wall placement.
 *     The button uses the theme's own button styles (wp-element-button / wp-block-button__link in
 *     block themes, WooCommerce's .button in classic themes) and sits in one row with the card's
 *     other buttons.
 *   - The card picture: the featured image with a small 3D badge, or the 3D view first (its
 *     poster; the model loads only when the shopper clicks).
 *
 * Settings › Placement › Product cards (site-wide). AtlasAR Pro adds per-product choices through
 * the `atlas_ar_card` filter and the product schema. Nothing loads before the shopper clicks: the
 * cards carry only the viewer's options; the popup is built on the first click.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Cards {

	/** What the card button opens. */
	const KINDS = array( '3d', 'wall', 'glasses', 'hat' );

	/**
	 * Whether this site met the card feature yet: 'done' (a new install: the button is on) or
	 * 'notice' (a site updated to it: nothing changed, a one-time notice points to the setting).
	 */
	const INTRO_OPTION = 'atlas_ar_cards_intro';

	/** @var array decision per post for this request */
	private static $decided = array();

	/** @var int the product of the classic loop card being printed (0: none) */
	private static $current = 0;

	/** @var bool link hooks moved to the title for the current classic card */
	private static $moved_link = false;

	/** @var array post id => true when the Product Button block already placed the button */
	private static $block_done = array();

	/** @var array post id => true when the Product Image block already changed the picture */
	private static $media_done = array();

	/** Called on `init` (atlas_ar_run). */
	public static function init() {
		// Classic loops (Storefront and other classic themes, [products] shortcodes, related products).
		add_action( 'woocommerce_before_shop_loop_item', array( __CLASS__, 'card_start' ), 1 );
		add_action( 'woocommerce_after_shop_loop_item', array( __CLASS__, 'loop_badge' ), 6 );   // right after the link around the picture closes (5)
		add_action( 'woocommerce_after_shop_loop_item', array( __CLASS__, 'actions_open' ), 9 );  // the "Add to cart" link prints at 10
		add_action( 'woocommerce_after_shop_loop_item', array( __CLASS__, 'actions_close' ), 11 );
		add_action( 'woocommerce_after_shop_loop_item', array( __CLASS__, 'card_end' ), 99 );
		add_filter( 'woocommerce_product_get_image', array( __CLASS__, 'loop_image' ), 10, 2 );
		// Block loops (Product Collection, Products, related products in block themes).
		add_filter( 'render_block_woocommerce/product-button', array( __CLASS__, 'block_button' ), 10, 3 );
		add_filter( 'render_block_woocommerce/product-image', array( __CLASS__, 'block_image' ), 10, 3 );
		// Any card a theme or page builder draws itself.
		add_shortcode( 'atlas_ar_button', array( __CLASS__, 'shortcode' ) );
		// New installs get the button; sites that update keep their shop as it is and get a notice.
		add_action( 'admin_init', array( __CLASS__, 'intro' ), 5 );
		add_action( 'admin_init', array( __CLASS__, 'register_intro_notice' ), 6 );
	}

	/* ------------------------------------------------------------ first contact */

	/**
	 * Once per site (owner's decision, AR-176): a new install gets the card button on (the setup
	 * wizard shows the choice); a site that updates to this version changes nothing and gets the
	 * one-time notice below. A site is new when it has neither 3.x nor 2.x settings yet.
	 */
	public static function intro() {
		if ( false !== get_option( self::INTRO_OPTION ) ) {
			return;
		}
		$fresh = false === get_option( AR_TRY_ON_Settings::OPTION ) && false === get_option( 'ar_try_on_settings' );
		if ( $fresh ) {
			AR_TRY_ON_Settings::update( array( 'cards' => array( 'button' => true ) ) );
			update_option( self::INTRO_OPTION, 'done', true );
		} else {
			update_option( self::INTRO_OPTION, 'notice', true );
		}
	}

	/** The one-time, dismissible notice for sites that updated (admins; gone once the button is on). */
	public static function register_intro_notice() {
		if ( 'notice' !== get_option( self::INTRO_OPTION ) || ! class_exists( __NAMESPACE__ . '\AR_TRY_ON_Admin_Notice' ) ) {
			return;
		}
		AR_TRY_ON_Admin_Notice::instance()->register_notice(
			array(
				'id'          => 'cards_intro',
				'title'       => __( 'New: 3D on your product cards', 'ar-vr-3d-model-try-on' ),
				'message'     => sprintf(
					/* translators: %s: link to AtlasAR › Placement */
					__( 'Shoppers can now open the 3D view, AR or the try-on straight from the shop and category pages: a "View in 3D and AR" button on every product card that has a 3D model, in your theme\'s button style, and a small 3D badge on the product image. Nothing has changed on your shop yet: turn it on under %s.', 'ar-vr-3d-model-try-on' ),
					'<a href="' . esc_url( admin_url( 'admin.php?page=ar-vr-3d-model-try-on#placement' ) ) . '">' . esc_html__( 'AtlasAR › Placement › Product cards', 'ar-vr-3d-model-try-on' ) . '</a>'
				),
				'type'        => 'info',
				'icon'        => '🧊',
				'dismissible' => true,
				'condition'   => function () {
					return current_user_can( 'manage_options' ) && ! AR_TRY_ON_Settings::get( 'cards.button' );
				},
			)
		);
	}

	/* ------------------------------------------------------------------ decision */

	/**
	 * What this product's card shows: the button (and which), the picture or the 3D view.
	 *
	 * @param int  $post_id
	 * @param bool $forced the shortcode: the button shows even when the site setting is off
	 * @return array {
	 *   button  bool    show the card button
	 *   kind    string  3d | wall | glasses | hat
	 *   action  string  popup | tryon
	 *   label   string  the button text
	 *   media   string  image | 3d  what the card picture is
	 *   badge   bool    the 3D badge on the picture (media = image)
	 * }
	 */
	public static function decide( $post_id, $forced = false ) {
		$post_id = (int) $post_id;
		$key     = $post_id . ( $forced ? ':f' : '' );
		if ( isset( self::$decided[ $key ] ) ) {
			return self::$decided[ $key ];
		}
		$cards = AR_TRY_ON_Settings::get( 'cards' );
		$off   = array( 'button' => false, 'kind' => '3d', 'action' => 'popup', 'label' => '', 'media' => 'image', 'badge' => false );
		if ( ! $post_id || ! in_array( get_post_type( $post_id ), AR_TRY_ON_Settings::enabled_post_types(), true ) ) {
			return self::$decided[ $key ] = $off; // phpcs:ignore Squiz.PHP.DisallowMultipleAssignments.Found
		}
		$product = AR_TRY_ON_Product::get( $post_id );
		$model   = AR_TRY_ON_Product::has_model( $post_id );
		$tryon   = AR_TRY_ON_Settings::get( 'tryon' );
		$photo   = '' !== $product['tryon'] && (int) $product['tryon_image'] > 0;
		if ( ! $model && ! $photo ) {
			return self::$decided[ $key ] = $off; // phpcs:ignore Squiz.PHP.DisallowMultipleAssignments.Found
		}
		$kind   = '' !== $product['tryon'] ? $product['tryon'] : ( 'wall' === $product['ar_placement'] ? 'wall' : '3d' );
		$action = '' !== $product['tryon'] && $tryon['enabled'] ? 'tryon' : 'popup';
		if ( 'popup' === $action && ! $model ) {
			return self::$decided[ $key ] = $off; // phpcs:ignore Squiz.PHP.DisallowMultipleAssignments.Found -- a photo try-on with try-on switched off: nothing to open
		}
		$decision = array(
			'button' => $forced || (bool) $cards['button'],
			'kind'   => $kind,
			'action' => $action,
			'label'  => 'tryon' === $action ? $tryon['label'] : $cards['button_text'],
			'media'  => $model && '3d' === $cards['media'] ? '3d' : 'image',
			'badge'  => (bool) $cards['badge'],
		);

		/**
		 * Change what a product's card shows (AtlasAR Pro: per-product button, text and picture).
		 *
		 * @param array $decision button, kind, action, label, media, badge
		 * @param int   $post_id
		 * @param array $product  the product's AtlasAR data
		 */
		$decision = (array) apply_filters( 'atlas_ar_card', $decision, $post_id, $product );
		$decision = wp_parse_args( $decision, $off );
		if ( ! in_array( $decision['kind'], self::KINDS, true ) ) {
			$decision['kind'] = '3d';
		}
		$decision['action'] = 'tryon' === $decision['action'] ? 'tryon' : 'popup';
		$decision['media']  = '3d' === $decision['media'] && $model ? '3d' : 'image';
		$decision['label']  = '' !== trim( (string) $decision['label'] ) ? (string) $decision['label'] : ( 'tryon' === $decision['action'] ? $tryon['label'] : __( 'View in 3D and AR', 'ar-vr-3d-model-try-on' ) );
		return self::$decided[ $key ] = $decision; // phpcs:ignore Squiz.PHP.DisallowMultipleAssignments.Found
	}

	/* -------------------------------------------------------------------- button */

	/**
	 * The card button for a product (empty when the card shows none).
	 *
	 * @param int  $post_id
	 * @param bool $forced see decide()
	 * @return string HTML, through wp_kses()
	 */
	public static function button( $post_id, $forced = false ) {
		$d = self::decide( $post_id, $forced );
		if ( ! $d['button'] ) {
			return '';
		}
		$data = self::action_attributes( $post_id, $d );
		if ( '' === $data ) {
			return '';
		}
		$cards = AR_TRY_ON_Settings::get( 'cards' );
		$block = wp_is_block_theme();
		$style = 'fill' === $cards['button_style'] ? 'fill' : 'outline';
		// Block themes: the theme's button (and its outline / fill style); classic themes: WooCommerce's .button.
		$class = $block ? 'wp-block-button__link wp-element-button' : 'button';
		$inner = sprintf(
			'<button type="button" class="%1$s atlas-ar-card-button atlas-ar-card-button--%2$s"%3$s%4$s>%5$s<span class="atlas-ar-card-button-text">%6$s</span></button>',
			esc_attr( $class ),
			esc_attr( $d['kind'] ),
			$data,
			AR_TRY_ON_Stats::button_attributes( $post_id ), // escaped there
			self::icon( $d['kind'] ),
			esc_html( $d['label'] )
		);
		$where = 'before' === $cards['button_position'] ? ' atlas-ar-card-button-wrap--before' : '';
		$html  = '<div class="atlas-ar-card-button-wrap' . $where . ( $block ? ' wp-block-button is-style-' . $style : '' ) . '">' . $inner . '</div>';
		if ( $block && class_exists( '\WP_Block_Type_Registry' ) && \WP_Block_Type_Registry::get_instance()->is_registered( 'core/button' ) ) {
			// A real Buttons block: WordPress then applies the theme's own outline / fill style
			// (theme.json block style variations) exactly as it does for the theme's buttons.
			$rendered = render_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => array( 'className' => 'is-style-' . $style, 'tagName' => 'button' ),
					'innerBlocks'  => array(),
					'innerHTML'    => $html,
					'innerContent' => array( $html ),
				)
			);
			if ( '' !== trim( (string) $rendered ) ) {
				$html = $rendered;
			}
		}

		/**
		 * The card button's HTML.
		 *
		 * @param string $html
		 * @param int    $post_id
		 * @param array  $decision see decide()
		 */
		$html = (string) apply_filters( 'atlas_ar_card_button_html', $html, $post_id, $d );
		AR_TRY_ON_Viewer::mark_used();
		if ( $block && wp_style_is( 'wp-block-button', 'registered' ) ) {
			wp_enqueue_style( 'wp-block-button' ); // the outline / fill styles, on pages without a button block
		}
		return wp_kses( $html, self::allowed_html() );
	}

	/** Forget this request's decisions (tests, or after settings change in the same request). */
	public static function forget() {
		self::$decided = array();
	}

	/**
	 * The attributes that tell atlas-ar-front.js what to open: the popup (the viewer's options,
	 * ready as element attributes) or the try-on. Empty when there is nothing to open.
	 */
	private static function action_attributes( $post_id, array $d ) {
		if ( 'tryon' === $d['action'] ) {
			$opts = AR_TRY_ON_Viewer::tryon_options( $post_id );
			return $opts ? ' data-atlas-ar-card="tryon" data-atlas-ar-tryon="' . esc_attr( wp_json_encode( $opts ) ) . '"' : '';
		}
		$opts = AR_TRY_ON_Viewer::options( $post_id, 'popup' );
		if ( ! $opts ) {
			return '';
		}
		$opts['arPlacement'] = 'wall' === $d['kind'] ? 'wall' : $opts['arPlacement'];
		$attrs               = AR_TRY_ON_Viewer::attribute_map( $opts );
		return ' data-atlas-ar-card="popup" aria-haspopup="dialog" data-atlas-ar-popup="' . esc_attr( wp_json_encode( $attrs ) ) . '"';
	}

	/** The icon for a kind (inline SVG, decorative). */
	public static function icon( $kind ) {
		$paths = array(
			'3d'      => '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
			'wall'    => '<path d="M4 5h16v14H4zM7 8h10v8H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
			'glasses' => '<path d="M2.5 13.5 4 8.5h16l1.5 5M9.5 13.5h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="6.5" cy="14.5" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="14.5" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
			'hat'     => '<path d="M5 14a7 7 0 0 1 14 0M3 14h18l-2 3H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
		);
		$path  = isset( $paths[ $kind ] ) ? $paths[ $kind ] : $paths['3d'];
		return '<svg class="atlas-ar-card-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' . $path . '</svg>';
	}

	/* --------------------------------------------------------------- classic loops */

	/** A classic card starts: remember its product; a 3D-first card gets the link on its title only. */
	public static function card_start() {
		$post_id       = (int) get_the_ID();
		self::$current = $post_id;
		$d             = self::decide( $post_id );
		if ( '3d' !== $d['media'] ) {
			return;
		}
		// The 3D view must not sit inside the link around the picture and title (a viewer in a link
		// is not valid HTML and every tap would open the product): the link moves to the title.
		if ( false !== has_action( 'woocommerce_before_shop_loop_item', 'woocommerce_template_loop_product_link_open' ) ) {
			remove_action( 'woocommerce_before_shop_loop_item', 'woocommerce_template_loop_product_link_open', 10 );
			remove_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_product_link_close', 5 );
			add_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_link_open', 9 );
			add_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_link_close', 11 );
			self::$moved_link = true;
		}
	}

	/** The classic card ends: put the link hooks back for the next card. */
	public static function card_end() {
		if ( self::$moved_link ) {
			remove_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_link_open', 9 );
			remove_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_link_close', 11 );
			add_action( 'woocommerce_before_shop_loop_item', 'woocommerce_template_loop_product_link_open', 10 );
			add_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_product_link_close', 5 );
			self::$moved_link = false;
		}
		self::$current = 0;
	}

	/**
	 * Classic loops: the button right before the "Add to cart" link (printed at priority 10) when
	 * it goes first. No wrapper of our own: themes close their own boxes between these hooks
	 * (Astra), so the row is made with CSS next to the link instead.
	 * WooCommerce's block templates fire these classic hooks too (for compatibility): a card whose
	 * Product Button block already carries the button gets nothing here.
	 */
	public static function actions_open() {
		if ( 'before' === AR_TRY_ON_Settings::get( 'cards.button_position' ) ) {
			self::print_loop_button();
		}
	}

	/** Classic loops: the button right after the "Add to cart" link when it goes last. */
	public static function actions_close() {
		if ( 'before' !== AR_TRY_ON_Settings::get( 'cards.button_position' ) ) {
			self::print_loop_button();
		}
	}

	private static function print_loop_button() {
		$post_id = (int) get_the_ID();
		$button  = empty( self::$block_done[ $post_id ] ) ? self::button( $post_id ) : '';
		if ( '' !== $button ) {
			echo $button; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_kses() in button()
		}
	}

	/**
	 * The picture of a classic card: the 3D view instead of it when the card shows 3D first
	 * (WooCommerce prints $product->get_image() inside the card; nowhere else in a card). The
	 * badge is not put here: the picture sits inside the card's link, and a button inside a link
	 * is not valid HTML — loop_badge() prints it next to the link instead.
	 *
	 * @param string      $image   the <img>
	 * @param \WC_Product $product
	 * @return string
	 */
	public static function loop_image( $image, $product ) {
		if ( ! self::$current || ! is_object( $product ) || (int) $product->get_id() !== self::$current ) {
			return $image;
		}
		$d = self::decide( self::$current );
		return '3d' === $d['media'] ? self::media( self::$current, (string) $image ) : $image;
	}

	/**
	 * Classic loops: the badge, printed after the link around the picture has closed and pinned
	 * to the top-right corner of the card's picture by CSS (WooCommerce's sale badge is top left).
	 */
	public static function loop_badge() {
		$post_id = (int) get_the_ID();
		if ( ! $post_id || ! empty( self::$media_done[ $post_id ] ) ) {
			return; // a block card: the Product Image block did it
		}
		$d = self::decide( $post_id );
		if ( '3d' === $d['media'] || ! $d['badge'] ) {
			return;
		}
		$badge = self::badge_html( $post_id, $d, true );
		if ( '' !== $badge ) {
			AR_TRY_ON_Viewer::mark_used();
			echo wp_kses( $badge, self::allowed_html() );
		}
	}

	/**
	 * The badge button that opens the 3D view or the try-on.
	 *
	 * @param int   $post_id
	 * @param array $d      see decide()
	 * @param bool  $corner pinned to the card's corner (classic loops) rather than inside the picture box
	 * @return string HTML (not yet through wp_kses), empty when there is nothing to open
	 */
	private static function badge_html( $post_id, array $d, $corner = false ) {
		$data = self::action_attributes( $post_id, $d );
		if ( '' === $data ) {
			return '';
		}
		$names = array(
			'3d'      => __( 'View %s in 3D and AR', 'ar-vr-3d-model-try-on' ),
			'wall'    => __( 'View %s in 3D and on your wall', 'ar-vr-3d-model-try-on' ),
			'glasses' => __( 'Try %s on', 'ar-vr-3d-model-try-on' ),
			'hat'     => __( 'Try %s on', 'ar-vr-3d-model-try-on' ),
		);
		return sprintf(
			'<button type="button" class="atlas-ar-card-badge atlas-ar-card-badge--%1$s%6$s" aria-label="%2$s" title="%2$s"%3$s%4$s>%5$s</button>',
			esc_attr( $d['kind'] ),
			esc_attr( sprintf( $names[ $d['kind'] ], get_the_title( $post_id ) ) ),
			$data,
			AR_TRY_ON_Stats::button_attributes( $post_id ),
			self::icon( $d['kind'] ),
			$corner ? ' atlas-ar-card-badge--corner' : ''
		);
	}

	/* ----------------------------------------------------------------- block loops */

	/**
	 * The Product Button block of a card: our button joins it in one row.
	 *
	 * @param string    $html
	 * @param array     $parsed
	 * @param \WP_Block $block
	 * @return string
	 */
	public static function block_button( $html, $parsed, $block ) {
		// WooCommerce renders the block through an inner block of the same name: this filter then
		// runs twice (inside, then around). The button goes in once.
		if ( false !== strpos( (string) $html, 'atlas-ar-card-actions' ) ) {
			return $html;
		}
		$post_id = self::block_post( $block );
		$button  = $post_id ? self::button( $post_id ) : '';
		if ( '' === $button ) {
			return $html;
		}
		self::$block_done[ $post_id ] = true;
		$before                       = 'before' === AR_TRY_ON_Settings::get( 'cards.button_position' );
		return '<div class="atlas-ar-card-actions">' . ( $before ? $button . $html : $html . $button ) . '</div>';
	}

	/**
	 * The Product Image block of a card: the badge, or the 3D view instead of the picture.
	 *
	 * @param string    $html
	 * @param array     $parsed
	 * @param \WP_Block $block
	 * @return string
	 */
	public static function block_image( $html, $parsed, $block ) {
		if ( false !== strpos( (string) $html, 'atlas-ar-card-media' ) ) {
			return $html; // already done (see block_button)
		}
		$post_id = self::block_post( $block );
		if ( ! $post_id ) {
			return $html;
		}
		$d = self::decide( $post_id );
		if ( '3d' === $d['media'] ) {
			// The block's link (around the picture) goes: the 3D view is not a link (the title is).
			$html = (string) preg_replace( '#<a\b[^>]*>(.*?)</a>#s', '$1', $html, 1 );
		}
		$out = self::media( $post_id, $html );
		if ( $out !== $html ) {
			self::$media_done[ $post_id ] = true;
		}
		return $out;
	}

	/** The product a card block is for. */
	private static function block_post( $block ) {
		if ( is_object( $block ) && isset( $block->context['postId'] ) ) {
			return (int) $block->context['postId'];
		}
		return (int) get_the_ID();
	}

	/* ---------------------------------------------------------------------- media */

	/**
	 * The card picture: the image with a badge, or the 3D view (poster first; the model loads on a
	 * click). Both open the same popup / try-on as the button.
	 *
	 * @param int    $post_id
	 * @param string $image the picture's HTML
	 * @return string
	 */
	public static function media( $post_id, $image ) {
		$d = self::decide( $post_id );
		if ( '3d' === $d['media'] ) {
			$extra = array( 'load' => 'interaction', 'height' => '100%', 'width' => '100%', 'qr' => false ); // the QR button is for the product page, not a card
			// A model without a poster shows the product's own picture until the shopper clicks.
			$model = AR_TRY_ON_Library::get( AR_TRY_ON_Product::model_id( $post_id ) );
			$thumb = get_the_post_thumbnail_url( $post_id, 'woocommerce_thumbnail' );
			if ( $thumb && ( ! $model || empty( $model['files']['poster']['url'] ) ) ) {
				$extra['poster'] = $thumb;
			}
			$viewer = AR_TRY_ON_Viewer::render( $post_id, 'card', $extra );
			if ( '' !== $viewer ) {
				$viewer = (string) apply_filters( 'atlas_ar_card_media_html', '<div class="atlas-ar-card-media atlas-ar-card-media--3d">' . $viewer . '</div>', $post_id, $d );
				return wp_kses( $viewer, self::allowed_html() );
			}
		}
		if ( ! $d['badge'] ) {
			return $image;
		}
		$badge = self::badge_html( $post_id, $d );
		if ( '' === $badge ) {
			return $image;
		}
		AR_TRY_ON_Viewer::mark_used();
		/** @see atlas_ar_card_media_html */
		$html = (string) apply_filters( 'atlas_ar_card_media_html', '<div class="atlas-ar-card-media atlas-ar-card-media--image">' . $image . $badge . '</div>', $post_id, $d );
		return wp_kses( $html, self::allowed_html() );
	}

	/* ------------------------------------------------------------------ shortcode */

	/**
	 * [atlas_ar_button id="123" label="…"] — the card button for any product, for cards a theme or
	 * page builder draws itself. Shows whenever the product has a 3D model or a try-on.
	 */
	public static function shortcode( $atts ) {
		$atts    = shortcode_atts( array( 'id' => 0, 'label' => '' ), (array) $atts, 'atlas_ar_button' );
		$post_id = (int) $atts['id'] ? (int) $atts['id'] : AR_TRY_ON_Helper::current_post_id();
		if ( ! $post_id ) {
			return '';
		}
		if ( '' !== $atts['label'] ) {
			$label = sanitize_text_field( $atts['label'] );
			$set   = function ( $d, $id ) use ( $post_id, $label ) {
				if ( (int) $id === $post_id ) {
					$d['label'] = $label;
				}
				return $d;
			};
			add_filter( 'atlas_ar_card', $set, 20, 2 );
			unset( self::$decided[ $post_id . ':f' ] );
			$html = self::button( $post_id, true );
			remove_filter( 'atlas_ar_card', $set, 20 );
			unset( self::$decided[ $post_id . ':f' ] );
			return $html;
		}
		return self::button( $post_id, true );
	}

	/* ----------------------------------------------------------------------- kses */

	/** What this class prints, for wp_kses(): the viewer's HTML plus the button, badge and icon. */
	public static function allowed_html() {
		$allowed = AR_TRY_ON_Viewer::allowed_html();
		$button  = array( 'type' => true, 'class' => true, 'aria-label' => true, 'aria-haspopup' => true, 'title' => true, 'data-atlas-ar-card' => true, 'data-atlas-ar-popup' => true, 'data-atlas-ar-tryon' => true, 'data-atlasar-analytics' => true, 'data-atlasar-analytics-id' => true );
		$allowed['button'] = array_merge( isset( $allowed['button'] ) ? $allowed['button'] : array(), $button );
		$allowed['div']    = array_merge( isset( $allowed['div'] ) ? $allowed['div'] : array(), array( 'class' => true ) );
		$allowed['svg']    = array( 'class' => true, 'viewbox' => true, 'width' => true, 'height' => true, 'aria-hidden' => true, 'focusable' => true );
		$allowed['path']   = array( 'd' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linejoin' => true, 'stroke-linecap' => true );
		$allowed['circle'] = array( 'cx' => true, 'cy' => true, 'r' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true );
		// The picture WooCommerce or the block printed (kept as it came).
		$allowed['a']   = array( 'href' => true, 'class' => true, 'aria-label' => true, 'aria-hidden' => true, 'tabindex' => true, 'data-wp-on--click' => true );
		$allowed['img'] = array( 'src' => true, 'srcset' => true, 'sizes' => true, 'alt' => true, 'class' => true, 'width' => true, 'height' => true, 'loading' => true, 'decoding' => true, 'fetchpriority' => true, 'data-src' => true, 'data-srcset' => true, 'data-sizes' => true, 'style' => true );
		$allowed['span'] = array_merge( isset( $allowed['span'] ) ? $allowed['span'] : array(), array( 'class' => true, 'aria-hidden' => true ) );
		return $allowed;
	}
}
