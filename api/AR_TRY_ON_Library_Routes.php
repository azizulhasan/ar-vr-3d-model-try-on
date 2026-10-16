<?php
/**
 * AR-119: REST routes of the 3D Library (ar_try_on/v1/library…) for the 3D Library page and the
 * model picker in the product editor.
 *
 *   GET    /library                       list (search, filter, page, per_page)
 *   POST   /library                       upload files (files[]); same names join one model
 *   GET    /library/<id>                  one model
 *   POST   /library/<id>                  rename { name }
 *   DELETE /library/<id>                  delete (refused while products use it)
 *   POST   /library/<id>/files            add or replace one file (file)
 *   DELETE /library/<id>/files/<kind>     remove the iPhone file, poster or waiting source file
 *   POST   /products/<id>/model           show a model on a product / post { model_id } (0 = none)
 *   POST   /library/<id>/optimised        an optimised GLB made in the browser (file); keeps the original
 *   POST   /library/<id>/restore          back to the original GLB
 *   POST   /library/<id>/cloud            optimise on AtlasAR Cloud { height_cm }; GET = check / fetch it
 *
 * Every route needs a logged-in user with the right capability; WordPress checks the REST nonce.
 *
 * @package AR_TRY_ON
 */

namespace ATLAS_AR_API;

use AR_TRY_ON\AR_TRY_ON_Library;
use AR_TRY_ON\AR_TRY_ON_Product;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Library_Routes {

	const NS = 'ar_try_on/v1';

	public static function register() {
		$id = array(
			'id' => array(
				'type'              => 'integer',
				'required'          => true,
				'sanitize_callback' => 'absint',
			),
		);
		register_rest_route(
			self::NS,
			'/library',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'list_models' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
					'args'                => array(
						'search'   => array( 'type' => 'string', 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ),
						'filter'   => array( 'type' => 'string', 'default' => 'all', 'enum' => array( 'all', 'used', 'unused', 'missing', 'large' ) ),
						'page'     => array( 'type' => 'integer', 'default' => 1, 'minimum' => 1, 'sanitize_callback' => 'absint' ),
						'per_page' => array( 'type' => 'integer', 'default' => 40, 'minimum' => 1, 'maximum' => 100, 'sanitize_callback' => 'absint' ),
					),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'upload' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
				),
			)
		);
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_model' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
					'args'                => $id,
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'rename' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'args'                => $id + array(
						'name' => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'delete_model' ),
					'permission_callback' => array( __CLASS__, 'can_delete' ),
					'args'                => $id,
				),
			)
		);
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)/files',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'add_file' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'args'                => $id,
			)
		);
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)/files/(?P<kind>usdz|poster|source)',
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( __CLASS__, 'remove_file' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'args'                => $id,
			)
		);
		// AR-121: Optimise.
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)/optimised',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'put_optimised' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'args'                => $id + array(
					'triangles' => array( 'type' => 'integer', 'default' => 0, 'minimum' => 0, 'sanitize_callback' => 'absint' ),
					'budget'    => array( 'type' => 'string', 'default' => '', 'enum' => array( '', 'pass', 'warn', 'fail' ) ),
					'height_cm' => array( 'type' => 'number', 'default' => 0, 'minimum' => 0, 'maximum' => 1000 ),
				),
			)
		);
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)/restore',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'restore' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'args'                => $id,
			)
		);
		register_rest_route(
			self::NS,
			'/library/(?P<id>\d+)/cloud',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'cloud_start' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'args'                => $id + array( 'height_cm' => array( 'type' => 'number', 'default' => 0, 'minimum' => 0, 'maximum' => 1000 ) ),
				),
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'cloud_poll' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'args'                => $id,
				),
			)
		);
		register_rest_route(
			self::NS,
			'/products/(?P<id>\d+)/model',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'link' ),
				'permission_callback' => array( __CLASS__, 'can_edit_product' ),
				'args'                => $id + array(
					'model_id' => array( 'type' => 'integer', 'required' => true, 'minimum' => 0, 'sanitize_callback' => 'absint' ),
				),
			)
		);
	}

	/* ------------------------------------------------------------------ permissions */

	/** See and add models: anyone who may upload files. */
	public static function can_use() {
		return current_user_can( 'upload_files' );
	}

	public static function can_edit( \WP_REST_Request $r ) {
		return self::can_use() && self::is_model( $r['id'] ) && current_user_can( 'edit_post', (int) $r['id'] );
	}

	public static function can_delete( \WP_REST_Request $r ) {
		return self::can_use() && self::is_model( $r['id'] ) && current_user_can( 'delete_post', (int) $r['id'] );
	}

	public static function can_edit_product( \WP_REST_Request $r ) {
		$id = (int) $r['id'];
		return $id && get_post( $id ) && AR_TRY_ON_Library::POST_TYPE !== get_post_type( $id ) && current_user_can( 'edit_post', $id );
	}

	private static function is_model( $id ) {
		return AR_TRY_ON_Library::POST_TYPE === get_post_type( (int) $id );
	}

	/* ---------------------------------------------------------------------- routes */

	public static function list_models( \WP_REST_Request $r ) {
		$res = AR_TRY_ON_Library::query(
			array(
				'search'   => $r['search'],
				'filter'   => $r['filter'],
				'paged'    => $r['page'],
				'per_page' => $r['per_page'],
			)
		);
		$out = rest_ensure_response( $res['items'] );
		$out->header( 'X-WP-Total', (string) $res['total'] );
		return $out;
	}

	public static function get_model( \WP_REST_Request $r ) {
		$model = AR_TRY_ON_Library::get( (int) $r['id'] );
		return $model ? $model : new \WP_Error( 'atlas_ar_model', __( 'Unknown model.', 'ar-vr-3d-model-try-on' ), array( 'status' => 404 ) );
	}

	public static function upload( \WP_REST_Request $r ) {
		$uploads = self::uploads( $r, 'files' );
		if ( ! $uploads ) {
			return new \WP_Error( 'atlas_ar_no_files', __( 'Choose one or more files.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		$results = AR_TRY_ON_Library::add_uploads( $uploads );
		$models  = array();
		foreach ( $results as $res ) {
			if ( ! empty( $res['model_id'] ) && ! isset( $models[ $res['model_id'] ] ) ) {
				$models[ $res['model_id'] ] = AR_TRY_ON_Library::get( $res['model_id'] );
			}
		}
		return array(
			'results' => $results,
			'models'  => array_values( array_filter( $models ) ),
		);
	}

	public static function rename( \WP_REST_Request $r ) {
		return self::answer( AR_TRY_ON_Library::rename( (int) $r['id'], $r['name'] ) );
	}

	public static function delete_model( \WP_REST_Request $r ) {
		$done = AR_TRY_ON_Library::delete( (int) $r['id'] );
		return is_wp_error( $done ) ? self::answer( $done ) : array( 'deleted' => true );
	}

	public static function add_file( \WP_REST_Request $r ) {
		$uploads = self::uploads( $r, 'file' );
		if ( ! $uploads ) {
			return new \WP_Error( 'atlas_ar_no_files', __( 'Choose a file.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		return self::answer( AR_TRY_ON_Library::add_file( (int) $r['id'], $uploads[0] ) );
	}

	public static function remove_file( \WP_REST_Request $r ) {
		return self::answer( AR_TRY_ON_Library::remove_file( (int) $r['id'], (string) $r['kind'] ) );
	}

	public static function link( \WP_REST_Request $r ) {
		$model = (int) $r['model_id'];
		if ( $model && ! self::is_model( $model ) ) {
			return new \WP_Error( 'atlas_ar_model', __( 'Unknown model.', 'ar-vr-3d-model-try-on' ), array( 'status' => 404 ) );
		}
		AR_TRY_ON_Product::update( (int) $r['id'], array( 'model_id' => $model ) );
		return array(
			'product' => AR_TRY_ON_Product::get( (int) $r['id'] ),
			'model'   => $model ? AR_TRY_ON_Library::get( $model ) : null,
		);
	}

	public static function put_optimised( \WP_REST_Request $r ) {
		$uploads = self::uploads( $r, 'file' );
		if ( ! $uploads ) {
			return new \WP_Error( 'atlas_ar_no_files', __( 'Choose a file.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		return self::answer(
			AR_TRY_ON_Library::put_optimised(
				(int) $r['id'],
				$uploads[0],
				array( 'by' => 'browser', 'triangles' => $r['triangles'], 'budget' => $r['budget'], 'height_cm' => $r['height_cm'] )
			)
		);
	}

	public static function restore( \WP_REST_Request $r ) {
		return self::answer( AR_TRY_ON_Library::restore_original( (int) $r['id'] ) );
	}

	public static function cloud_start( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::optimise_start( (int) $r['id'], (float) $r['height_cm'] ) );
	}

	public static function cloud_poll( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::optimise_poll( (int) $r['id'] ) );
	}

	/* --------------------------------------------------------------------- helpers */

	/**
	 * The request's uploaded files as [ tmp_name, name ] (single or files[] field). Only files PHP
	 * received in this request, without an upload error.
	 */
	private static function uploads( \WP_REST_Request $r, $field ) {
		$params = $r->get_file_params();
		if ( empty( $params[ $field ] ) || ! is_array( $params[ $field ] ) ) {
			return array();
		}
		$f    = $params[ $field ];
		$list = array();
		if ( is_array( $f['name'] ) ) {
			foreach ( array_keys( $f['name'] ) as $i ) {
				$list[] = array( 'name' => $f['name'][ $i ], 'tmp_name' => $f['tmp_name'][ $i ], 'error' => $f['error'][ $i ] );
			}
		} else {
			$list[] = array( 'name' => $f['name'], 'tmp_name' => $f['tmp_name'], 'error' => $f['error'] );
		}
		$out = array();
		foreach ( array_slice( $list, 0, 50 ) as $u ) {
			if ( UPLOAD_ERR_OK === (int) $u['error'] && is_uploaded_file( (string) $u['tmp_name'] ) ) {
				$out[] = array( 'name' => (string) $u['name'], 'tmp_name' => (string) $u['tmp_name'] );
			}
		}
		return $out;
	}

	/** A model, or the error with an HTTP status (409 for "in use", else 400). */
	private static function answer( $result ) {
		if ( is_wp_error( $result ) ) {
			$code = $result->get_error_code();
			return new \WP_Error( $code, $result->get_error_message(), array( 'status' => 'atlas_ar_in_use' === $code ? 409 : 400 ) );
		}
		return $result;
	}
}
