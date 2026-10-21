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
 *   GET    /library/free                  AR-144: search the free 3D model library on AtlasAR Cloud (q, category, page)
 *   POST   /library/free/<lib_…>          download a free library model into the 3D Library
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
		$id     = array( 'id' => self::arg( 'integer', 'The 3D Library model ID.', array( 'required' => true, 'sanitize_callback' => 'absint' ) ) );
		// AR-162: how far Optimise goes ('' = the site's setting).
		$level  = array( 'level' => self::arg( 'string', 'Optimisation level: maximum, high (recommended), balanced, low or minimum; empty = the site’s setting (Settings › Optimisation).', array( 'default' => '', 'enum' => array( '', 'maximum', 'high', 'balanced', 'low', 'minimum' ) ) ) );
		$height = array( 'height_cm' => self::arg( 'number', 'The product’s real height in centimetres (0.5–1000); the model is scaled to it with its base on the floor. 0 keeps the model’s own size (in the browser only: AtlasAR Cloud needs the real height).', array( 'default' => 0, 'minimum' => 0, 'maximum' => 1000 ) ) );
		$model  = array( __CLASS__, 'model_schema' );

		self::route(
			'/library',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'list_models' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
					'label'               => __( 'List 3D models', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Lists the models in the AtlasAR 3D Library (newest first) with their files (GLB, iPhone USDZ, poster), size, missing files and the products that show them. The total count is in the X-WP-Total header.', 'ar-vr-3d-model-try-on' ),
					'args'                => array(
						'search'   => self::arg( 'string', 'Only models whose name contains this text.', array( 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ) ),
						'filter'   => self::arg( 'string', 'all = every model; used = shown by at least one product; unused = not shown anywhere; missing = without an iPhone file or poster; large = GLB over the "large file" size (5 MB).', array( 'default' => 'all', 'enum' => array( 'all', 'used', 'unused', 'missing', 'large' ) ) ),
						'page'     => self::arg( 'integer', 'Page of results (1 = first).', array( 'default' => 1, 'minimum' => 1, 'sanitize_callback' => 'absint' ) ),
						'per_page' => self::arg( 'integer', 'Models per page (1–100).', array( 'default' => 40, 'minimum' => 1, 'maximum' => 100, 'sanitize_callback' => 'absint' ) ),
					),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'upload' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
					'label'               => __( 'Add 3D model files', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Adds model files to the 3D Library: either uploaded files (multipart field files[]) or one file from a public https URL. Files with the same base name join one model (chair.glb + chair.usdz + chair.jpg). Accepted: .glb, a self-contained .gltf, .usdz, .jpg/.png/.webp posters, .obj/.fbx (converted to GLB in the browser). Every file is checked by its content.', 'ar-vr-3d-model-try-on' ),
					'args'                => array(
						'url'  => self::arg( 'string', 'A public https URL of one model, iPhone or poster file to add (instead of uploading files).', array( 'format' => 'uri' ) ),
						'name' => self::arg( 'string', 'With url: the file name to keep, e.g. chair.glb (default: from the URL).', array( 'sanitize_callback' => 'sanitize_file_name' ) ),
					),
				),
				'schema' => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_model' ),
					'permission_callback' => array( __CLASS__, 'can_use' ),
					'label'               => __( 'Get a 3D model', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'One 3D Library model: its name, files with URLs and sizes, missing files, whether it was optimised, and the products that show it.', 'ar-vr-3d-model-try-on' ),
					'args'                => $id,
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'rename' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'label'               => __( 'Rename a 3D model', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Changes the name of a 3D Library model (shown in the library and as the viewer’s alt text default).', 'ar-vr-3d-model-try-on' ),
					'args'                => $id + array( 'name' => self::arg( 'string', 'The new name (1–120 characters, plain text).', array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ) ) ),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'delete_model' ),
					'permission_callback' => array( __CLASS__, 'can_delete' ),
					'label'               => __( 'Delete a 3D model', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Deletes a 3D Library model and all its files. Refused (HTTP 409) while a product shows it: link those products to another model first.', 'ar-vr-3d-model-try-on' ),
					'args'                => $id,
				),
				'schema' => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)/files',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'add_file' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'label'               => __( 'Add or replace a model file', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Adds one file to a model, or replaces the file of the same kind: the GLB, the iPhone USDZ, the poster or an OBJ / FBX source. Upload it (multipart field file) or give a public https URL.', 'ar-vr-3d-model-try-on' ),
				'args'                => $id + array(
					'url'  => self::arg( 'string', 'A public https URL of the file (instead of uploading it).', array( 'format' => 'uri' ) ),
					'name' => self::arg( 'string', 'With url: the file name to keep, e.g. chair.usdz (default: from the URL).', array( 'sanitize_callback' => 'sanitize_file_name' ) ),
				),
				'schema'              => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)/files/(?P<kind>usdz|poster|source)',
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( __CLASS__, 'remove_file' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'label'               => __( 'Remove a model file', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Removes the iPhone file (usdz), the poster or the OBJ / FBX source from a model. The GLB cannot be removed; replace it instead.', 'ar-vr-3d-model-try-on' ),
				'args'                => $id + array( 'kind' => self::arg( 'string', 'Which file: usdz, poster or source.', array( 'required' => true, 'enum' => array( 'usdz', 'poster', 'source' ) ) ) ),
				'schema'              => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)/optimised',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'put_optimised' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'label'               => __( 'Store an optimised GLB', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Stores a GLB optimised in the browser (multipart field file, from AtlasAR.tools.optimise) as the model’s GLB. The GLB it replaces is kept as the original and can be restored.', 'ar-vr-3d-model-try-on' ),
				'args'                => $id + $height + $level + array(
					'triangles' => self::arg( 'integer', 'Triangles in the optimised model (for the record shown in the library).', array( 'default' => 0, 'minimum' => 0, 'sanitize_callback' => 'absint' ) ),
					'budget'    => self::arg( 'string', 'The page-weight grade of the result: pass (≤ 3 MB), warn (≤ 5 MB) or fail.', array( 'default' => '', 'enum' => array( '', 'pass', 'warn', 'fail' ) ) ),
				),
				'schema'              => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)/restore',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'restore' ),
				'permission_callback' => array( __CLASS__, 'can_edit' ),
				'label'               => __( 'Restore the original GLB', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Puts back the GLB as it was uploaded, before it was optimised; the optimised file is deleted.', 'ar-vr-3d-model-try-on' ),
				'args'                => $id,
				'schema'              => $model,
			)
		);
		// AR-144: the free 3D model library of AtlasAR Cloud (a connected site, any plan; nothing is used).
		self::route(
			'/library/free',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'free_search' ),
				'permission_callback' => array( __CLASS__, 'can_use' ),
				'label'               => __( 'Search the free 3D model library', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Searches AtlasAR Cloud’s free 3D model library (needs a connected AtlasAR Cloud account, any plan; nothing is used). Only the search words, category and page are sent.', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'q'        => self::arg( 'string', 'Search words (name, tags, description).', array( 'default' => '' ) ),
					'category' => self::arg( 'string', 'A category key (from the answer’s categories).', array( 'default' => '' ) ),
					'page'     => self::arg( 'integer', 'Page of results (24 a page).', array( 'default' => 1, 'minimum' => 1, 'sanitize_callback' => 'absint' ) ),
				),
			)
		);
		self::route(
			'/library/free/(?P<lib>lib_[A-Za-z0-9]{22})',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'free_import' ),
				'permission_callback' => array( __CLASS__, 'can_use' ),
				'label'               => __( 'Download a free library model', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Downloads a free 3D model from AtlasAR Cloud’s library into this site’s 3D Library, with its picture as the poster. A model the site has already is returned instead.', 'ar-vr-3d-model-try-on' ),
				'args'                => array( 'lib' => self::arg( 'string', 'The free model’s ID (lib_…).', array( 'required' => true ) ) ),
				'schema'              => $model,
			)
		);
		self::route(
			'/library/(?P<id>\d+)/cloud',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'cloud_start' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'label'               => __( 'Optimise a model on AtlasAR Cloud', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Sends the model’s original GLB (up to 50 MB) to AtlasAR Cloud to optimise; needs a connected AtlasAR Cloud account and uses one model of its monthly plan. Then call GET on this route until status is ready.', 'ar-vr-3d-model-try-on' ),
					'args'                => $id + $height + $level,
				),
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'cloud_poll' ),
					'permission_callback' => array( __CLASS__, 'can_edit' ),
					'label'               => __( 'Check an AtlasAR Cloud optimise', 'ar-vr-3d-model-try-on' ),
					'description'         => __( 'Checks the AtlasAR Cloud job of a model: status queued / processing / ready. When ready, the optimised GLB has replaced the model’s GLB (the original is kept) and the model is returned.', 'ar-vr-3d-model-try-on' ),
					'args'                => $id,
				),
			)
		);
		self::route(
			'/products/(?P<id>\d+)/model',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'link' ),
				'permission_callback' => array( __CLASS__, 'can_edit_product' ),
				'label'               => __( 'Show a 3D model on a product', 'ar-vr-3d-model-try-on' ),
				'description'         => __( 'Links a 3D Library model to a product, post or page, so its 3D view, AR and try-on use it. model_id 0 removes the 3D model from it.', 'ar-vr-3d-model-try-on' ),
				'args'                => array(
					'id'       => self::arg( 'integer', 'The product, post or page ID.', array( 'required' => true, 'sanitize_callback' => 'absint' ) ),
					'model_id' => self::arg( 'integer', 'The 3D Library model ID, or 0 for none.', array( 'required' => true, 'minimum' => 0, 'sanitize_callback' => 'absint' ) ),
				),
			)
		);
	}

	/** register_rest_route() with the response schema at the route level (also for one endpoint). */
	private static function route( $path, array $def ) {
		$schema = isset( $def['schema'] ) ? $def['schema'] : null;
		unset( $def['schema'] );
		if ( isset( $def['callback'] ) ) {
			$def = array( $def );
		}
		if ( $schema ) {
			$def['schema'] = $schema;
		}
		register_rest_route( self::NS, $path, $def );
	}

	/** An argument: type, description and the rest. */
	private static function arg( $type, $description, array $more = array() ) {
		return array( 'type' => $type, 'description' => $description ) + $more;
	}

	/** JSON schema of a 3D Library model (the answer of most routes here). */
	public static function model_schema() {
		$file = array(
			'type'       => 'object',
			'properties' => array(
				'name' => array( 'type' => 'string', 'description' => 'File name.' ),
				'url'  => array( 'type' => 'string', 'format' => 'uri', 'description' => 'Public URL of the file.' ),
				'size' => array( 'type' => 'integer', 'description' => 'Size in bytes.' ),
			),
		);
		return array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'atlas_ar_model',
			'type'       => 'object',
			'properties' => array(
				'id'        => array( 'type' => 'integer', 'description' => 'Model ID.' ),
				'name'      => array( 'type' => 'string', 'description' => 'Model name.' ),
				'files'     => array(
					'type'        => 'object',
					'description' => 'The model’s files by kind: glb (shown everywhere), usdz (iPhone AR), poster, source (OBJ / FBX), original (the GLB before Optimise).',
					'properties'  => array( 'glb' => $file, 'usdz' => $file, 'poster' => $file, 'source' => $file, 'original' => $file ),
				),
				'size'      => array( 'type' => 'integer', 'description' => 'Total size of the files in bytes (without the original).' ),
				'missing'   => array( 'type' => 'array', 'items' => array( 'type' => 'string', 'enum' => array( 'glb', 'usdz', 'poster' ) ), 'description' => 'Files the model does not have yet.' ),
				'large'     => array( 'type' => 'boolean', 'description' => 'The GLB is over the "large file" size (5 MB by default).' ),
				'used_by'   => array(
					'type'        => 'array',
					'description' => 'Products and posts that show this model.',
					'items'       => array( 'type' => 'object', 'properties' => array( 'id' => array( 'type' => 'integer' ), 'title' => array( 'type' => 'string' ) ) ),
				),
				'date'      => array( 'type' => 'string', 'format' => 'date-time', 'description' => 'When the model was added (UTC).' ),
				'optimised' => array(
					'type'        => array( 'object', 'null' ),
					'description' => 'How it was optimised: by (browser | cloud), before / after size in bytes, triangles, budget, height_cm; null when not optimised.',
				),
			),
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
		$temp    = null;
		if ( ! $uploads && $r['url'] ) {
			$temp = self::from_url( (string) $r['url'], (string) $r['name'] );
			if ( is_wp_error( $temp ) ) {
				return $temp;
			}
			$uploads = array( $temp );
		}
		if ( ! $uploads ) {
			return new \WP_Error( 'atlas_ar_no_files', __( 'Choose one or more files, or give a url.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		$results = AR_TRY_ON_Library::add_uploads( $uploads );
		if ( $temp ) {
			wp_delete_file( $temp['tmp_name'] );
		}
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
		if ( ! $uploads && $r['url'] ) {
			$temp = self::from_url( (string) $r['url'], (string) $r['name'] );
			if ( is_wp_error( $temp ) ) {
				return $temp;
			}
			$res = AR_TRY_ON_Library::add_file( (int) $r['id'], $temp );
			wp_delete_file( $temp['tmp_name'] );
			return self::answer( $res );
		}
		if ( ! $uploads ) {
			return new \WP_Error( 'atlas_ar_no_files', __( 'Choose a file, or give a url.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		return self::answer( AR_TRY_ON_Library::add_file( (int) $r['id'], $uploads[0] ) );
	}

	/**
	 * Fetch one file from a public https URL into a temporary file (WordPress's safe request:
	 * no private / local addresses; at most the 3D Library's size limit).
	 *
	 * @return array|\WP_Error [ tmp_name, name ]
	 */
	private static function from_url( $url, $name ) {
		$url = esc_url_raw( trim( $url ), array( 'https' ) );
		if ( '' === $url || ! wp_http_validate_url( $url ) ) {
			return new \WP_Error( 'atlas_ar_url', __( 'Give a public https URL.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		$name = '' !== $name ? sanitize_file_name( $name ) : sanitize_file_name( wp_basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ) );
		if ( '' === AR_TRY_ON_Library::kind_of( $name ) ) {
			return new \WP_Error( 'atlas_ar_kind', __( 'Not a 3D, iPhone AR or poster file (check the file name).', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		$limit = function ( $args ) {
			$args['limit_response_size'] = AR_TRY_ON_Library::stored_max_bytes() + 1; // fetched by the site: not PHP's upload limit
			return $args;
		};
		add_filter( 'http_request_args', $limit );
		require_once ABSPATH . 'wp-admin/includes/file.php';
		$tmp = download_url( $url, 60 );
		remove_filter( 'http_request_args', $limit );
		if ( is_wp_error( $tmp ) ) {
			return new \WP_Error( 'atlas_ar_url', __( 'The file could not be downloaded from that URL.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		if ( filesize( $tmp ) > AR_TRY_ON_Library::stored_max_bytes() ) { // cut at the limit: refused, never stored half
			wp_delete_file( $tmp );
			/* translators: %s: size like "64 MB" */
			return new \WP_Error( 'atlas_ar_size', sprintf( __( 'The file is larger than %s.', 'ar-vr-3d-model-try-on' ), size_format( AR_TRY_ON_Library::stored_max_bytes(), 1 ) ), array( 'status' => 400 ) );
		}
		return array( 'tmp_name' => $tmp, 'name' => $name );
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
				array( 'by' => 'browser', 'triangles' => $r['triangles'], 'budget' => $r['budget'], 'height_cm' => $r['height_cm'], 'level' => $r['level'] )
			)
		);
	}

	public static function restore( \WP_REST_Request $r ) {
		return self::answer( AR_TRY_ON_Library::restore_original( (int) $r['id'] ) );
	}

	public static function cloud_start( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::optimise_start( (int) $r['id'], (float) $r['height_cm'], (string) $r['level'] ) );
	}

	public static function cloud_poll( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::optimise_poll( (int) $r['id'] ) );
	}

	public static function free_search( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::library_search( (string) $r['q'], (string) $r['category'], (int) $r['page'] ) );
	}

	public static function free_import( \WP_REST_Request $r ) {
		return self::answer( \AR_TRY_ON\AR_TRY_ON_Cloud::library_import( (string) $r['lib'] ) );
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
