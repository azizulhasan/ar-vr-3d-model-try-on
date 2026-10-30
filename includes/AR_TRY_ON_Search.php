<?php
/**
 * Products in Google's 3D results: the 3D model of a product, told to search engines and shopping feeds.
 *
 * - Search: WooCommerce's own Product structured data (JSON-LD) gets `subjectOf` = a 3DModel with
 *   the GLB (and the USDZ for iPhone) as encodings, so the product page says "this product has a
 *   3D model". Added to WooCommerce's markup, never a second Product.
 * - Shopping: Google Merchant Center's `virtual_model_link` wants a public GLB of 15 MB or less.
 *   Feed plugins read it as the custom field `atlas_ar_virtual_model_link` (worked out when read,
 *   never stored, so it always follows the product's current model), or with
 *   AR_TRY_ON_Search::virtual_model_link( $product_id ).
 *
 * Nothing is sent anywhere; whether Google shows a 3D result is Google's decision.
 * Off: add_filter( 'atlas_ar_structured_data', '__return_false' ).
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Search {

	/** The custom field feed plugins can map to Merchant Center's virtual_model_link. */
	const FEED_FIELD = 'atlas_ar_virtual_model_link';
	/** Google Merchant Center's limit for virtual_model_link files. */
	const FEED_MAX_BYTES = 15728640;

	public static function init() {
		add_filter( 'woocommerce_structured_data_product', array( __CLASS__, 'product_markup' ), 20, 2 );
		// SEO plugins that print their own Product markup instead of WooCommerce's.
		add_filter( 'rank_math/snippet/rich_snippet_product_entity', array( __CLASS__, 'seo_plugin_product' ), 20 );
		add_filter( 'wpseo_schema_product', array( __CLASS__, 'seo_plugin_product' ), 20 );
		add_filter( 'get_post_metadata', array( __CLASS__, 'feed_field' ), 10, 4 );
	}

	/** @return bool the 3D model is added to structured data and feeds (filter atlas_ar_structured_data) */
	public static function enabled() {
		return (bool) apply_filters( 'atlas_ar_structured_data', true );
	}

	/**
	 * The product's model, or null.
	 *
	 * @param int $post_id
	 * @return array|null AR_TRY_ON_Library::get() shape
	 */
	private static function model( $post_id ) {
		$product = AR_TRY_ON_Product::get( $post_id );
		if ( empty( $product['model_id'] ) ) {
			return null;
		}
		$model = AR_TRY_ON_Library::get( $product['model_id'] );
		return $model && ! empty( $model['files']['glb']['url'] ) ? $model : null;
	}

	/**
	 * The 3DModel node for a product (schema.org), or null.
	 *
	 * @param int $post_id
	 * @return array|null
	 */
	public static function model_node( $post_id ) {
		$model = self::model( $post_id );
		if ( ! $model ) {
			return null;
		}
		$files    = $model['files'];
		$encoding = array(
			array(
				'@type'          => 'MediaObject',
				'contentUrl'     => esc_url_raw( $files['glb']['url'] ),
				'encodingFormat' => 'model/gltf-binary',
				'contentSize'    => size_format( (int) $files['glb']['size'], 1 ),
			),
		);
		if ( ! empty( $files['usdz']['url'] ) ) {
			$encoding[] = array(
				'@type'          => 'MediaObject',
				'contentUrl'     => esc_url_raw( $files['usdz']['url'] ),
				'encodingFormat' => 'model/vnd.usdz+zip',
				'contentSize'    => size_format( (int) $files['usdz']['size'], 1 ),
			);
		}
		$node = array(
			'@type'    => '3DModel',
			'@id'      => get_permalink( $post_id ) . '#3d-model',
			'name'     => get_the_title( $post_id ),
			'encoding' => $encoding,
		);
		if ( ! empty( $files['poster']['url'] ) ) {
			$node['image'] = esc_url_raw( $files['poster']['url'] );
		}
		/**
		 * Change the 3DModel node added to a product's structured data.
		 *
		 * @param array $node
		 * @param int   $post_id
		 */
		return (array) apply_filters( 'atlas_ar_model_structured_data', $node, (int) $post_id );
	}

	/**
	 * WooCommerce's Product markup + the product's 3D model.
	 *
	 * @param array       $markup
	 * @param \WC_Product $product
	 * @return array
	 */
	public static function product_markup( $markup, $product ) {
		if ( ! is_array( $markup ) || ! is_object( $product ) || ! method_exists( $product, 'get_id' ) || ! self::enabled() ) {
			return $markup;
		}
		$node = self::model_node( $product->get_id() );
		if ( $node && empty( $markup['subjectOf'] ) ) {
			$markup['subjectOf'] = $node;
		}
		return $markup;
	}

	/**
	 * Rank Math's and Yoast WooCommerce SEO's Product piece + the product's 3D model (the product page being shown).
	 *
	 * @param array $entity
	 * @return array
	 */
	public static function seo_plugin_product( $entity ) {
		if ( ! is_array( $entity ) || ! self::enabled() || ! function_exists( 'is_product' ) || ! is_product() ) {
			return $entity;
		}
		$node = self::model_node( get_queried_object_id() );
		if ( $node && empty( $entity['subjectOf'] ) ) {
			$entity['subjectOf'] = $node;
		}
		return $entity;
	}

	/**
	 * The GLB address for Merchant Center's virtual_model_link: public, 15 MB or less, else ''.
	 *
	 * @param int $post_id product (or variation: its product's model)
	 * @return string
	 */
	public static function virtual_model_link( $post_id ) {
		if ( ! self::enabled() ) {
			return '';
		}
		$post_id = (int) $post_id;
		$parent  = (int) wp_get_post_parent_id( $post_id );
		if ( $parent && 'product_variation' === get_post_type( $post_id ) ) {
			$post_id = $parent;
		}
		$model = self::model( $post_id );
		if ( ! $model || (int) $model['files']['glb']['size'] > self::FEED_MAX_BYTES ) {
			return '';
		}
		return esc_url_raw( $model['files']['glb']['url'] );
	}

	/**
	 * get_post_meta( $id, 'atlas_ar_virtual_model_link', true ) for feed plugins: worked out on read.
	 *
	 * @param mixed  $value
	 * @param int    $object_id
	 * @param string $meta_key
	 * @param bool   $single
	 * @return mixed
	 */
	public static function feed_field( $value, $object_id, $meta_key, $single ) {
		if ( self::FEED_FIELD !== $meta_key ) {
			return $value;
		}
		$type = get_post_type( $object_id );
		if ( 'product' !== $type && 'product_variation' !== $type ) {
			return $value;
		}
		$link = self::virtual_model_link( $object_id );
		return $single ? $link : array( $link );
	}
}
