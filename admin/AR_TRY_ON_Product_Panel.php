<?php
/**
 * AR-120: the "AtlasAR — 3D, AR and try-on" box on the edit screen of the post types chosen in
 * Settings. The app (atlas-ar-product.js) saves through REST; the hidden field below also saves
 * the panel when the product itself is updated.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON_Admin; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

use AR_TRY_ON\AR_TRY_ON_Library;
use AR_TRY_ON\AR_TRY_ON_Product;
use AR_TRY_ON\AR_TRY_ON_Settings;
use AR_TRY_ON\AR_TRY_ON_Viewer;
use ATLAS_AR_API\AR_TRY_ON_Admin_Routes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Product_Panel {

	const HANDLE = 'atlas-ar-product';
	const FIELD  = 'atlas_ar_panel';
	const NONCE  = 'atlas_ar_panel_nonce';

	public static function init() {
		add_action( 'add_meta_boxes', array( __CLASS__, 'add' ), 10, 2 );
		add_action( 'save_post', array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	private static function types() {
		return AR_TRY_ON_Settings::enabled_post_types(); // AR-154
	}

	public static function add( $post_type, $post = null ) {
		if ( ! in_array( $post_type, self::types(), true ) ) {
			return;
		}
		add_meta_box( 'atlas-ar-panel', __( 'AtlasAR — 3D, AR and try-on', 'ar-vr-3d-model-try-on' ), array( __CLASS__, 'render' ), $post_type, 'normal', 'high' );
	}

	public static function render( $post ) {
		wp_nonce_field( 'atlas_ar_panel_' . $post->ID, self::NONCE );
		echo '<input type="hidden" id="atlas-ar-panel-data" name="' . esc_attr( self::FIELD ) . '" value="" />';
		echo '<div id="atlas-ar-panel-root"><p class="description">' . esc_html__( 'Loading…', 'ar-vr-3d-model-try-on' ) . '</p></div>';
	}

	public static function enqueue( $hook ) {
		if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}
		$screen = get_current_screen();
		$post   = get_post();
		if ( ! $screen || ! $post || ! in_array( $screen->post_type, self::types(), true ) ) {
			return;
		}
		wp_register_script( self::HANDLE, ATLAS_AR_PLUGIN_URL . 'admin/js/atlas-ar-product.js', array( AR_TRY_ON_Dashboard::UI, AR_TRY_ON_Library_Page::HANDLE ), (string) filemtime( ATLAS_AR_PLUGIN_PATH . 'admin/js/atlas-ar-product.js' ), true );
		wp_set_script_translations( self::HANDLE, 'ar-vr-3d-model-try-on' );
		$tryon = AR_TRY_ON_Settings::get( 'tryon' );
		wp_localize_script(
			self::HANDLE,
			'atlasArProduct',
			array(
				'item'          => AR_TRY_ON_Admin_Routes::item( $post->ID ),
				'look'          => AR_TRY_ON_Settings::get( 'look' ),
				'qr'            => (bool) AR_TRY_ON_Settings::get( 'placement.qr' ),
				'tryonEnabled'  => (bool) $tryon['enabled'],
				'tryon'         => array(
					'tryonLabel'    => $tryon['label'],
					'tryonConsent'  => $tryon['consent'],
					'tryonSnapshot' => (bool) $tryon['snapshot'],
					'tryonModels'   => AR_TRY_ON_Viewer::tracker_files( $tryon['tracker'] ),
				),
				'libraryUrl'    => admin_url( 'admin.php?page=' . AR_TRY_ON_Library_Page::SLUG ),
				// AR-167: "Make a 3D model from a photo" starts with the featured image (large size: enough
				// for a sharp texture, small enough for AR).
				'photo'         => self::photo( $post->ID ),
				'accept'        => '.' . implode( ',.', array_unique( array_merge( ...array_values( AR_TRY_ON_Library::KINDS ) ) ) ),
			)
		);
		wp_localize_script( AR_TRY_ON_Dashboard::UI, 'atlasArAdmin', array( 'version' => ATLAS_AR_VERSION ) );
		wp_enqueue_media(); // AR-167: choose the photo from the Media Library
		wp_enqueue_script( self::HANDLE );
		wp_enqueue_style( AR_TRY_ON_Dashboard::UI );
		/** Lets AtlasAR Pro add its product panel tabs (wp.hooks atlasAr.product.tabs). */
		do_action( 'atlas_ar_product_panel_enqueue', $post );
	}

	/** Save the panel with the product (the REST save covers "Save 3D settings"). */
	public static function save( $post_id, $post ) {
		// phpcs:disable WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON decoded below, then every field is cleaned by AR_TRY_ON_Product::update().
		if ( ! isset( $_POST[ self::NONCE ], $_POST[ self::FIELD ] ) ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE ] ) ), 'atlas_ar_panel_' . $post_id ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) || ! in_array( $post->post_type, self::types(), true ) ) {
			return;
		}
		$data = json_decode( wp_unslash( $_POST[ self::FIELD ] ), true );
		// phpcs:enable
		if ( is_array( $data ) ) {
			unset( $data['model_id'] ); // the model is linked by the panel's own route only
			AR_TRY_ON_Product::update( $post_id, $data );
		}
	}

	/**
	 * AR-167: the featured image for "Make a 3D model from a photo", or null.
	 *
	 * @return array|null { id, url, name }
	 */
	private static function photo( $post_id ) {
		$id = (int) get_post_thumbnail_id( $post_id );
		if ( ! $id || ! in_array( get_post_mime_type( $id ), array( 'image/jpeg', 'image/png', 'image/webp' ), true ) ) {
			return null;
		}
		$src = wp_get_attachment_image_src( $id, 'large' );
		return $src ? array( 'id' => $id, 'url' => $src[0], 'name' => get_the_title( $id ) ) : null;
	}
}

