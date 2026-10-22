<?php
/**
 * AR-116: one product's (or post's) AtlasAR data — product meta `_atlas_ar`, plus the 3D Library
 * model it shows (`_atlas_ar_model_id`, kept apart so the library can find the products using a
 * model).
 *
 * Empty / "site" values mean "use the site settings" (AR_TRY_ON_Settings). Pro adds its fields
 * (hotspots, sizes, variations, several models, calibration) with `atlas_ar_product_schema`.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Product {

	const META = '_atlas_ar';

	/** @return array the fields (same shape as an AR_TRY_ON_Settings group) */
	public static function schema() {
		$schema = array(
			'use_site'     => array( 'type' => 'bool', 'default' => true ),
			'background'   => array( 'type' => 'color', 'default' => '#ffffff' ),
			'placement'    => array( 'type' => 'enum', 'default' => 'site', 'options' => array( 'site', 'gallery', 'gallery3d', 'button', 'tab', 'slide' ) ),
			'ar_placement' => array( 'type' => 'enum', 'default' => 'floor', 'options' => array( 'floor', 'wall' ) ),
			'ar_scale'     => array( 'type' => 'enum', 'default' => 'auto', 'options' => array( 'auto', 'fixed' ) ),
			'tryon'        => array( 'type' => 'enum', 'default' => '', 'options' => array( '', 'glasses', 'hat' ) ),
			'tryon_viewer' => array( 'type' => 'bool', 'default' => true ),
			// Try-on from a photo: a front picture (Media Library id) used when the product has no 3D model.
			'tryon_image'  => array( 'type' => 'number', 'default' => 0, 'min' => 0, 'max' => 2147483647 ),
			// AR-156: this product only (0 / empty = the site's setting).
			'height'       => array( 'type' => 'number', 'default' => 0, 'min' => 0, 'max' => 1200 ),
			'ar_text'      => array( 'type' => 'text', 'default' => '', 'max' => 60 ),
			'load'         => array( 'type' => 'enum', 'default' => '', 'options' => array( '', 'scroll', 'click' ) ),
		);

		/**
		 * Add product fields (AtlasAR Pro adds hotspots, sizes, variations, several models, fit).
		 *
		 * @param array $schema field => type, default, options / min / max
		 */
		return (array) apply_filters( 'atlas_ar_product_schema', $schema );
	}

	/**
	 * The product's data, complete (defaults fill what is missing), plus its model id.
	 *
	 * @param int $post_id
	 * @return array
	 */
	public static function get( $post_id ) {
		$saved = get_post_meta( (int) $post_id, self::META, true );
		$saved = is_array( $saved ) ? $saved : array();
		$out   = array();
		foreach ( self::schema() as $key => $field ) {
			$default     = isset( $field['default'] ) ? $field['default'] : null;
			$out[ $key ] = array_key_exists( $key, $saved ) ? AR_TRY_ON_Settings::clean_field( $saved[ $key ], $field, $default ) : $default;
		}
		$out['model_id'] = self::model_id( $post_id );
		return $out;
	}

	/** @return int the 3D Library model shown on this product (0: none) */
	public static function model_id( $post_id ) {
		$id = (int) get_post_meta( (int) $post_id, AR_TRY_ON_Library::PRODUCT_KEY, true );
		return $id && get_post_type( $id ) === AR_TRY_ON_Library::POST_TYPE ? $id : 0;
	}

	/** @return bool has a 3D model */
	public static function has_model( $post_id ) {
		return self::model_id( $post_id ) > 0;
	}

	/**
	 * Save changes (only known fields, each cleaned). `model_id` links a 3D Library model (0 unlinks).
	 *
	 * @param int   $post_id
	 * @param array $input
	 * @return array the saved data
	 */
	public static function update( $post_id, array $input ) {
		$current = self::get( $post_id );
		$clean   = array();
		foreach ( self::schema() as $key => $field ) {
			$clean[ $key ] = array_key_exists( $key, $input )
				? AR_TRY_ON_Settings::clean_field( $input[ $key ], $field, $current[ $key ] )
				: $current[ $key ];
		}
		update_post_meta( (int) $post_id, self::META, $clean );

		if ( array_key_exists( 'model_id', $input ) ) {
			$model = (int) $input['model_id'];
			if ( $model && get_post_type( $model ) === AR_TRY_ON_Library::POST_TYPE ) {
				update_post_meta( (int) $post_id, AR_TRY_ON_Library::PRODUCT_KEY, $model );
			} else {
				delete_post_meta( (int) $post_id, AR_TRY_ON_Library::PRODUCT_KEY );
			}
		}
		return self::get( $post_id );
	}
}
