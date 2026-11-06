<?php
/**
 * AR-176: product cards — what a card shows (decide), the button, the picture, the blocks, the
 * shortcode and the Pro filter. Integration tests on a local site (tests/bootstrap.php).
 *
 * @package AR_TRY_ON
 */

use AR_TRY_ON\AR_TRY_ON_Cards;
use AR_TRY_ON\AR_TRY_ON_Library;
use AR_TRY_ON\AR_TRY_ON_Product;
use AR_TRY_ON\AR_TRY_ON_Settings;
use PHPUnit\Framework\TestCase;

final class CardsTest extends TestCase {

	/** @var array the site's settings before the test */
	private $saved_settings;

	/** @var int[] posts to delete */
	private $posts = array();

	protected function setUp(): void {
		$this->saved_settings = AR_TRY_ON_Settings::all();
		// A known start whatever the site has: the card settings at their defaults (all off).
		AR_TRY_ON_Settings::update( array( 'cards' => AR_TRY_ON_Settings::defaults()['cards'], 'general' => array( 'post_types' => array( 'product' ) ), 'tryon' => array( 'enabled' => true ) ) );
		AR_TRY_ON_Cards::forget();
	}

	protected function tearDown(): void {
		foreach ( $this->posts as $id ) {
			wp_delete_post( $id, true );
		}
		$this->posts = array();
		AR_TRY_ON_Settings::update( $this->saved_settings ); // every field back (and the request cache cleared)
		AR_TRY_ON_Cards::forget();
	}

	/* ------------------------------------------------------------------ helpers */

	/** A 3D Library model with a GLB and a poster entry (the files need not exist for the markup). */
	private function model() {
		$id = wp_insert_post( array( 'post_type' => AR_TRY_ON_Library::POST_TYPE, 'post_title' => 'AR-176 test model', 'post_status' => 'publish' ) );
		update_post_meta( $id, AR_TRY_ON_Library::FILES_META, array( 'glb' => array( 'file' => 'atlasar/ar176/cube.glb', 'size' => 1200 ), 'poster' => array( 'file' => 'atlasar/ar176/cube.png', 'size' => 30 ) ) );
		$this->posts[] = $id;
		return $id;
	}

	/** A product, with a model unless $model is 0; $data = AtlasAR product fields. */
	private function product( $model = null, array $data = array(), $type = 'product' ) {
		$id = wp_insert_post( array( 'post_type' => $type, 'post_title' => 'AR-176 test chair', 'post_status' => 'publish' ) );
		$this->posts[] = $id;
		if ( 'product' === $type ) {
			wp_set_object_terms( $id, 'simple', 'product_type' );
		}
		$data['model_id'] = null === $model ? $this->model() : (int) $model;
		AR_TRY_ON_Product::update( $id, $data );
		AR_TRY_ON_Cards::forget();
		return $id;
	}

	private function cards( array $cards ) {
		AR_TRY_ON_Settings::update( array( 'cards' => $cards ) );
		AR_TRY_ON_Cards::forget();
	}

	private function block( $post_id ) {
		return (object) array( 'context' => array( 'postId' => $post_id ) );
	}

	/* -------------------------------------------------------------------- tests */

	public function test_nothing_shows_until_the_setting_is_on(): void {
		$id = $this->product();
		$d  = AR_TRY_ON_Cards::decide( $id );
		$this->assertFalse( $d['button'] );
		$this->assertSame( 'image', $d['media'] );
		$this->assertFalse( $d['badge'] );
		$this->assertSame( '', AR_TRY_ON_Cards::button( $id ) );
		$this->assertSame( '<img src="x">', AR_TRY_ON_Cards::media( $id, '<img src="x">' ) );
		$this->assertSame( '<div>cart</div>', AR_TRY_ON_Cards::block_button( '<div>cart</div>', array(), $this->block( $id ) ) );
	}

	public function test_the_button_opens_the_popup_with_the_viewer_options(): void {
		$this->cards( array( 'button' => true ) );
		$id = $this->product();
		$d  = AR_TRY_ON_Cards::decide( $id );
		$this->assertTrue( $d['button'] );
		$this->assertSame( '3d', $d['kind'] );
		$this->assertSame( 'popup', $d['action'] );
		$this->assertSame( 'View in 3D and AR', $d['label'] );

		$html = AR_TRY_ON_Cards::button( $id );
		$this->assertStringContainsString( 'data-atlas-ar-card="popup"', $html );
		$this->assertStringContainsString( 'aria-haspopup="dialog"', $html );
		$this->assertStringContainsString( 'atlas-ar-card-button--3d', $html );
		$this->assertStringContainsString( '>View in 3D and AR<', $html );
		$this->assertStringContainsString( wp_is_block_theme() ? 'wp-element-button' : 'class="button atlas-ar-card-button', $html );
		$this->assertMatchesRegularExpression( '/data-atlas-ar-popup="([^"]+)"/', $html );
		preg_match( '/data-atlas-ar-popup="([^"]+)"/', $html, $m );
		$attrs = json_decode( html_entity_decode( $m[1], ENT_QUOTES ), true );
		$this->assertIsArray( $attrs );
		$this->assertStringEndsWith( 'atlasar/ar176/cube.glb', $attrs['src'] );
		$this->assertSame( 'popup', $attrs['display'] );
		$this->assertSame( 'floor', $attrs['ar-placement'] );
		$this->assertStringNotContainsString( '<atlasar-viewer', $html, 'the card holds no viewer: the popup is built on the first click' );
	}

	public function test_wall_art_opens_on_the_wall(): void {
		$this->cards( array( 'button' => true ) );
		$id   = $this->product( null, array( 'ar_placement' => 'wall' ) );
		$this->assertSame( 'wall', AR_TRY_ON_Cards::decide( $id )['kind'] );
		$html = AR_TRY_ON_Cards::button( $id );
		$this->assertStringContainsString( 'atlas-ar-card-button--wall', $html );
		$this->assertStringContainsString( 'ar-placement&quot;:&quot;wall', $html );
	}

	public function test_glasses_get_the_try_on_button(): void {
		$this->cards( array( 'button' => true, 'button_text' => 'See it in 3D' ) );
		$id = $this->product( null, array( 'tryon' => 'glasses' ) );
		$d  = AR_TRY_ON_Cards::decide( $id );
		$this->assertSame( 'glasses', $d['kind'] );
		$this->assertSame( 'tryon', $d['action'] );
		$this->assertSame( AR_TRY_ON_Settings::get( 'tryon.label' ), $d['label'], 'try-on products use the try-on label, not the card text' );
		$html = AR_TRY_ON_Cards::button( $id );
		$this->assertStringContainsString( 'data-atlas-ar-card="tryon"', $html );
		$this->assertStringContainsString( 'data-atlas-ar-tryon="', $html );
		$this->assertStringContainsString( '&quot;tryon&quot;:&quot;glasses&quot;', $html );
	}

	public function test_a_cap_with_try_on_off_falls_back_to_the_popup(): void {
		$this->cards( array( 'button' => true ) );
		AR_TRY_ON_Settings::update( array( 'tryon' => array( 'enabled' => false ) ) );
		AR_TRY_ON_Cards::forget();
		$id = $this->product( null, array( 'tryon' => 'hat' ) );
		$d  = AR_TRY_ON_Cards::decide( $id );
		$this->assertSame( 'hat', $d['kind'] );
		$this->assertSame( 'popup', $d['action'] );
		$this->assertStringContainsString( 'data-atlas-ar-card="popup"', AR_TRY_ON_Cards::button( $id ) );
	}

	public function test_no_model_no_button(): void {
		$this->cards( array( 'button' => true ) );
		$id = $this->product( 0 );
		$this->assertFalse( AR_TRY_ON_Cards::decide( $id )['button'] );
		$this->assertSame( '', AR_TRY_ON_Cards::button( $id ) );
	}

	public function test_a_post_type_atlasar_is_off_for_gets_nothing(): void {
		$this->cards( array( 'button' => true, 'badge' => true ) );
		$id = $this->product( null, array(), 'post' );
		$this->assertFalse( AR_TRY_ON_Cards::decide( $id )['button'] );
		$this->assertSame( '', AR_TRY_ON_Cards::button( $id ) );
		$this->assertSame( '<img src="x">', AR_TRY_ON_Cards::media( $id, '<img src="x">' ) );
	}

	public function test_the_text_and_the_position_in_the_block(): void {
		$this->cards( array( 'button' => true, 'button_text' => 'See it in 3D', 'button_position' => 'before' ) );
		$id   = $this->product();
		$html = AR_TRY_ON_Cards::block_button( '<div class="wc-block-components-product-button">cart</div>', array(), $this->block( $id ) );
		$this->assertStringStartsWith( '<div class="atlas-ar-card-actions"><div class="atlas-ar-card-button-wrap', $html );
		$this->assertStringContainsString( '>See it in 3D<', $html );
		$this->assertLessThan( strpos( $html, 'product-button">cart' ), strpos( $html, 'atlas-ar-card-button' ), 'before: our button first' );

		$this->cards( array( 'button' => true, 'button_position' => 'after' ) );
		$html = AR_TRY_ON_Cards::block_button( '<div class="wc-block-components-product-button">cart</div>', array(), $this->block( $id ) );
		$this->assertStringStartsWith( '<div class="atlas-ar-card-actions"><div class="wc-block-components-product-button">cart</div>', $html );
		$this->assertStringEndsWith( '</div></div>', $html );
	}

	public function test_the_position_in_a_classic_loop(): void {
		$this->cards( array( 'button' => true, 'button_position' => 'after', 'badge' => true ) );
		$id = $this->product();
		$GLOBALS['post'] = get_post( $id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- the loop's current product, as WooCommerce sets it
		setup_postdata( $GLOBALS['post'] );
		$loop = function () use ( $id ) {
			ob_start();
			AR_TRY_ON_Cards::card_start();
			echo '<a class="woocommerce-LoopProduct-link" href="/p">' . AR_TRY_ON_Cards::loop_image( '<img src="x">', wc_get_product( $id ) ) . '<h2>title</h2></a>';
			AR_TRY_ON_Cards::loop_badge();
			AR_TRY_ON_Cards::actions_open();
			echo '<a class="button">cart</a>';
			AR_TRY_ON_Cards::actions_close();
			AR_TRY_ON_Cards::card_end();
			return ob_get_clean();
		};
		$html = $loop();
		$this->assertSame( 1, substr_count( $html, 'atlas-ar-card-button--3d' ), 'one button' );
		$this->assertStringNotContainsString( 'atlas-ar-card-actions', $html, 'no wrapper of our own in classic loops' );
		$this->assertLessThan( strpos( $html, 'atlas-ar-card-button-wrap' ), strpos( $html, '<a class="button">cart</a>' ), 'after: the link first' );
		// The picture itself is untouched; the badge comes after the link closed, pinned to the corner.
		$this->assertStringContainsString( '<a class="woocommerce-LoopProduct-link" href="/p"><img src="x"><h2>title</h2></a><button type="button" class="atlas-ar-card-badge atlas-ar-card-badge--3d atlas-ar-card-badge--corner"', $html );

		$this->cards( array( 'button' => true, 'button_position' => 'before', 'badge' => false ) );
		$html = $loop();
		$this->assertSame( 1, substr_count( $html, 'atlas-ar-card-button--3d' ) );
		$this->assertStringNotContainsString( 'atlas-ar-card-badge', $html );
		$this->assertLessThan( strpos( $html, '<a class="button">cart</a>' ), strpos( $html, 'atlas-ar-card-button-wrap' ), 'before: our button first' );

		// 3D first: the picture becomes the viewer and the link moves off it (nothing wraps it here).
		$this->cards( array( 'media' => '3d' ) );
		$html = $loop();
		$this->assertStringContainsString( '<a class="woocommerce-LoopProduct-link" href="/p"><div class="atlas-ar-card-media atlas-ar-card-media--3d"><atlasar-viewer', $html );
		wp_reset_postdata();
	}

	public function test_the_badge_on_the_picture(): void {
		$this->cards( array( 'badge' => true ) );
		$id   = $this->product();
		$html = AR_TRY_ON_Cards::media( $id, '<img src="x" alt="">' );
		$this->assertStringStartsWith( '<div class="atlas-ar-card-media atlas-ar-card-media--image"><img src="x" alt="">', $html );
		$this->assertStringContainsString( '<button type="button" class="atlas-ar-card-badge atlas-ar-card-badge--3d" aria-label="View AR-176 test chair in 3D and AR"', $html );
		$this->assertStringContainsString( 'data-atlas-ar-card="popup"', $html );
		$this->assertStringContainsString( '<svg', $html );
		// The block: the badge goes after the block's own markup, outside its link.
		$block = AR_TRY_ON_Cards::block_image( '<div class="wc-block-components-product-image"><a href="/p"><img src="x"></a></div>', array(), $this->block( $id ) );
		$this->assertStringContainsString( '<a href="/p"><img src="x"></a></div><button', $block );
	}

	public function test_the_3d_view_first(): void {
		$this->cards( array( 'media' => '3d', 'badge' => true ) );
		$id   = $this->product();
		$html = AR_TRY_ON_Cards::media( $id, '<img src="x">' );
		$this->assertStringStartsWith( '<div class="atlas-ar-card-media atlas-ar-card-media--3d"><atlasar-viewer', $html );
		$this->assertStringContainsString( 'load="interaction"', $html, 'the model loads only on a click' );
		$this->assertStringContainsString( 'display="inline"', $html );
		$this->assertStringContainsString( 'atlas-ar-viewer--card', $html );
		$this->assertStringNotContainsString( '<img', $html );
		$this->assertStringNotContainsString( 'atlas-ar-card-badge', $html );
		// The block: its link around the picture goes (a 3D view in a link is not a link).
		$block = AR_TRY_ON_Cards::block_image( '<div class="wc-block-components-product-image"><a href="/p"><img src="x"></a></div>', array(), $this->block( $id ) );
		$this->assertStringNotContainsString( '<a ', $block );
		// Without a model the picture stays.
		$plain = $this->product( 0 );
		$this->assertSame( '<img src="x">', AR_TRY_ON_Cards::media( $plain, '<img src="x">' ) );
	}

	public function test_the_shortcode_shows_the_button_whatever_the_setting(): void {
		$id   = $this->product();
		$html = do_shortcode( '[atlas_ar_button id="' . $id . '" label="Open in 3D"]' );
		$this->assertStringContainsString( 'data-atlas-ar-card="popup"', $html );
		$this->assertStringContainsString( '>Open in 3D<', $html );
		$this->assertSame( '', AR_TRY_ON_Cards::button( $id ), 'the site setting is still off for the loops' );
		$this->assertSame( '', do_shortcode( '[atlas_ar_button id="' . $this->product( 0 ) . '"]' ) );
	}

	public function test_the_atlas_ar_card_filter_changes_the_decision(): void {
		$this->cards( array( 'button' => true ) );
		$id = $this->product();
		$f  = function ( $d, $post_id ) use ( $id ) {
			if ( (int) $post_id === $id ) {
				$d['label'] = 'Per product';
				$d['media'] = '3d';
			}
			return $d;
		};
		add_filter( 'atlas_ar_card', $f, 10, 2 );
		AR_TRY_ON_Cards::forget();
		$d = AR_TRY_ON_Cards::decide( $id );
		remove_filter( 'atlas_ar_card', $f, 10 );
		$this->assertSame( 'Per product', $d['label'] );
		$this->assertSame( '3d', $d['media'] );
	}

	public function test_settings_are_cleaned(): void {
		$this->cards( array( 'button' => 'yes', 'button_text' => str_repeat( 'x', 80 ) . '<b>', 'button_position' => 'left', 'media' => 'video', 'button_style' => 'weird' ) );
		$c = AR_TRY_ON_Settings::get( 'cards' );
		$this->assertTrue( $c['button'] );
		$this->assertSame( 60, strlen( $c['button_text'] ) );
		$this->assertSame( 'after', $c['button_position'] );
		$this->assertSame( 'image', $c['media'] );
		$this->assertSame( 'outline', $c['button_style'] );
	}
}
