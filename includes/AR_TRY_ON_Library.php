<?php
/**
 * AR-116: the 3D Library — AtlasAR's own place for 3D models, kept apart from the Media Library.
 *
 * One model = one hidden post of type `atlas_ar_model` (its title is the model's name) plus its
 * files in `wp_upload_dir()/atlasar/<model id>/`:
 *   glb     the 3D model shown everywhere (also .gltf)
 *   usdz    the iPhone AR file (optional; iPhones can open AR from the GLB)
 *   poster  the picture shown before the 3D view loads (optional)
 *   source  an OBJ / FBX file waiting to be turned into a GLB by AtlasAR Cloud
 *
 * Uploads are checked by their content, not only their name. A product points at a model by id
 * (product meta `_atlas_ar_model_id`), so one model can serve several products and a model in use
 * cannot be deleted.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Library {

	const POST_TYPE   = 'atlas_ar_model';
	const FILES_META  = '_atlas_ar_files';
	const PRODUCT_KEY = '_atlas_ar_model_id';
	const DIR         = 'atlasar';

	/** Kinds of file a model holds, and the extensions accepted for each. */
	const KINDS = array(
		'glb'    => array( 'glb', 'gltf' ),
		'usdz'   => array( 'usdz' ),
		'poster' => array( 'jpg', 'jpeg', 'png', 'webp' ),
		'source' => array( 'obj', 'fbx' ),
	);

	/** Register the post type (no admin screens of its own: the 3D Library page lists it). */
	public static function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'label'           => __( '3D models', 'ar-vr-3d-model-try-on' ),
				'public'          => false,
				'show_ui'         => false,
				'show_in_rest'    => false,
				'rewrite'         => false,
				'query_var'       => false,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			)
		);
	}

	/**
	 * The kind of file from its name, or '' when the 3D Library does not take it.
	 *
	 * @param string $name
	 * @return string glb | usdz | poster | source | ''
	 */
	public static function kind_of( $name ) {
		$ext = strtolower( pathinfo( (string) $name, PATHINFO_EXTENSION ) );
		foreach ( self::KINDS as $kind => $exts ) {
			if ( in_array( $ext, $exts, true ) ) {
				return $kind;
			}
		}
		return '';
	}

	/**
	 * Is the file's content what its name says? (A renamed file is refused.)
	 *
	 * @param string $path temporary upload path
	 * @param string $name original file name
	 * @return true|\WP_Error
	 */
	public static function check_content( $path, $name ) {
		$ext  = strtolower( pathinfo( (string) $name, PATHINFO_EXTENSION ) );
		$head = self::read_head( $path, 64 );
		if ( '' === $head ) {
			return new \WP_Error( 'atlas_ar_empty', __( 'The file is empty or could not be read.', 'ar-vr-3d-model-try-on' ) );
		}
		$ok = true;
		switch ( $ext ) {
			case 'glb':
				$ok = 0 === strncmp( $head, 'glTF', 4 );
				break;
			case 'gltf':
				$ok = self::gltf_is_self_contained( $path );
				if ( is_wp_error( $ok ) ) {
					return $ok;
				}
				break;
			case 'usdz':
				$ok = 0 === strncmp( $head, "PK\x03\x04", 4 );
				break;
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'webp':
				$info = function_exists( 'wp_getimagesize' ) ? wp_getimagesize( $path ) : @getimagesize( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- an unreadable image is answered below.
				$ok   = is_array( $info ) && in_array( $info['mime'], array( 'image/jpeg', 'image/png', 'image/webp' ), true );
				break;
			case 'obj':
				$ok = ! preg_match( '/[\x00-\x08\x0E-\x1F]/', $head ); // text
				break;
			case 'fbx':
				// Binary FBX starts with its signature; text FBX has its header block near the top.
				$ok = 0 === strncmp( $head, 'Kaydara FBX Binary', 18 ) || false !== strpos( (string) self::read_head( $path, 4096 ), 'FBXHeaderExtension' );
				break;
			default:
				$ok = false;
		}
		return $ok ? true : new \WP_Error( 'atlas_ar_content', sprintf( /* translators: %s: file name */ __( '%s does not look like the file type its name says.', 'ar-vr-3d-model-try-on' ), $name ) );
	}

	/**
	 * Add uploaded files: files with the same base name join one model (chair.glb + chair.usdz +
	 * chair.jpg), a new model is made for a name not yet in the library.
	 *
	 * @param array $uploads list of [ 'tmp_name' => path, 'name' => original name ]
	 * @return array one result per file: [ name, kind, model_id ] or [ name, error ]
	 */
	public static function add_uploads( array $uploads ) {
		$results = array();
		$made    = array(); // base name → model id in this batch
		foreach ( $uploads as $upload ) {
			$file = self::check_upload( $upload );
			if ( is_wp_error( $file ) ) {
				$results[] = array( 'name' => self::upload_name( $upload ), 'error' => $file->get_error_message() );
				continue;
			}
			$base = strtolower( pathinfo( $file['name'], PATHINFO_FILENAME ) );
			$id   = isset( $made[ $base ] ) ? $made[ $base ] : self::create( self::title_from( $base ) );
			if ( is_wp_error( $id ) ) {
				$results[] = array( 'name' => $file['name'], 'error' => $id->get_error_message() );
				continue;
			}
			$made[ $base ] = $id;
			$saved         = self::store_file( $id, $file['kind'], $file['tmp'], $file['name'] );
			$results[]     = is_wp_error( $saved )
				? array( 'name' => $file['name'], 'error' => $saved->get_error_message() )
				: array( 'name' => $file['name'], 'kind' => $file['kind'], 'model_id' => $id );
		}
		return $results;
	}

	/**
	 * Add or replace one file of an existing model (its kind comes from the file).
	 *
	 * @param int   $id
	 * @param array $upload [ 'tmp_name', 'name' ]
	 * @return array|\WP_Error the model
	 */
	public static function add_file( $id, array $upload ) {
		if ( get_post_type( $id ) !== self::POST_TYPE ) {
			return new \WP_Error( 'atlas_ar_model', __( 'Unknown model.', 'ar-vr-3d-model-try-on' ) );
		}
		$file = self::check_upload( $upload );
		if ( is_wp_error( $file ) ) {
			return $file;
		}
		$saved = self::store_file( $id, $file['kind'], $file['tmp'], $file['name'] );
		return is_wp_error( $saved ) ? $saved : self::get( $id );
	}

	/**
	 * One upload checked: a kind the library takes, within the size limit, content matching the name.
	 *
	 * @return array|\WP_Error [ name, kind, tmp ]
	 */
	private static function check_upload( array $upload ) {
		$name = self::upload_name( $upload );
		$tmp  = isset( $upload['tmp_name'] ) ? (string) $upload['tmp_name'] : '';
		$kind = self::kind_of( $name );
		if ( '' === $kind ) {
			return new \WP_Error( 'atlas_ar_kind', __( 'Not a 3D, iPhone AR or poster file.', 'ar-vr-3d-model-try-on' ) );
		}
		$size = is_readable( $tmp ) ? (int) filesize( $tmp ) : 0;
		if ( $size > self::max_bytes() ) {
			/* translators: %s: size like "64 MB" */
			return new \WP_Error( 'atlas_ar_size', sprintf( __( 'The file is larger than %s.', 'ar-vr-3d-model-try-on' ), size_format( self::max_bytes() ) ) );
		}
		$check = self::check_content( $tmp, $name );
		if ( is_wp_error( $check ) ) {
			return $check;
		}
		return array( 'name' => $name, 'kind' => $kind, 'tmp' => $tmp );
	}

	private static function upload_name( array $upload ) {
		return isset( $upload['name'] ) ? sanitize_file_name( (string) $upload['name'] ) : '';
	}

	/**
	 * New, empty model.
	 *
	 * @param string $title
	 * @return int|\WP_Error
	 */
	public static function create( $title ) {
		$id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => sanitize_text_field( $title ),
			),
			true
		);
		return $id;
	}

	/**
	 * Put a file into a model's folder, replacing the file of the same kind.
	 *
	 * @param int    $id
	 * @param string $kind glb | usdz | poster | source
	 * @param string $tmp  source path (a temporary upload, or a file AtlasAR made)
	 * @param string $name file name to keep
	 * @return array|\WP_Error the stored file's entry
	 */
	public static function store_file( $id, $kind, $tmp, $name ) {
		if ( ! isset( self::KINDS[ $kind ] ) || get_post_type( $id ) !== self::POST_TYPE ) {
			return new \WP_Error( 'atlas_ar_model', __( 'Unknown model or file kind.', 'ar-vr-3d-model-try-on' ) );
		}
		$fs = self::filesystem();
		if ( ! $fs ) {
			return new \WP_Error( 'atlas_ar_fs', __( 'The uploads folder cannot be written.', 'ar-vr-3d-model-try-on' ) );
		}
		$dir = self::dir( $id );
		if ( ! wp_mkdir_p( $dir ) ) {
			return new \WP_Error( 'atlas_ar_fs', __( 'The uploads folder cannot be written.', 'ar-vr-3d-model-try-on' ) );
		}
		$name   = wp_unique_filename( $dir, self::safe_name( $name ) );
		$target = trailingslashit( $dir ) . $name;
		if ( ! $fs->copy( $tmp, $target, true, FS_CHMOD_FILE ) ) {
			return new \WP_Error( 'atlas_ar_fs', __( 'The file could not be saved.', 'ar-vr-3d-model-try-on' ) );
		}
		$files = self::raw_files( $id );
		if ( ! empty( $files[ $kind ]['file'] ) ) {
			self::delete_path( $files[ $kind ]['file'] ); // the replaced file
		}
		$files[ $kind ] = array(
			'file' => self::DIR . '/' . (int) $id . '/' . $name,
			'size' => (int) filesize( $target ),
			'time' => time(),
		);
		update_post_meta( $id, self::FILES_META, $files );
		return self::file_entry( $files[ $kind ] );
	}

	/**
	 * A model for the dashboard and the product panel.
	 *
	 * @param int        $id
	 * @param array|null $usage usage_map() result, when listing many models (saves a query each)
	 * @return array|null
	 */
	public static function get( $id, $usage = null ) {
		$post = get_post( $id );
		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}
		$files = array();
		foreach ( self::raw_files( $id ) as $kind => $entry ) {
			$files[ $kind ] = self::file_entry( $entry );
		}
		$used = is_array( $usage ) ? ( isset( $usage[ (int) $id ] ) ? $usage[ (int) $id ] : array() ) : self::used_by( $id );
		return array(
			'id'      => (int) $id,
			'name'    => get_the_title( $post ),
			'files'   => $files,
			'size'    => array_sum( wp_list_pluck( $files, 'size' ) ),
			'missing' => array_values( array_diff( array( 'glb', 'usdz', 'poster' ), array_keys( $files ) ) ),
			'large'   => isset( $files['glb'] ) && $files['glb']['size'] > self::large_bytes(),
			'used_by' => $used,
			'date'    => get_post_time( 'c', true, $post ),
		);
	}

	/**
	 * Models, newest first, with a filter.
	 *
	 * @param array $args search, filter (all | used | unused | missing | large), paged, per_page
	 * @return array [ items, total ]
	 */
	public static function query( array $args = array() ) {
		$ids = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'publish',
				's'              => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
				'posts_per_page' => 500, // a shop's 3D Library; the page below is cut in PHP after the filter
				'orderby'        => 'date',
				'order'          => 'DESC',
				'fields'         => 'ids',
			)
		);
		$usage  = self::usage_map();
		$filter = isset( $args['filter'] ) ? (string) $args['filter'] : 'all';
		$items  = array();
		foreach ( $ids as $id ) {
			$m = self::get( $id, $usage );
			if ( ! $m ) {
				continue;
			}
			$keep = 'used' === $filter ? (bool) $m['used_by']
				: ( 'unused' === $filter ? ! $m['used_by']
				: ( 'missing' === $filter ? (bool) $m['missing']
				: ( 'large' === $filter ? $m['large'] : true ) ) );
			if ( $keep ) {
				$items[] = $m;
			}
		}
		$per  = isset( $args['per_page'] ) ? max( 1, min( 100, (int) $args['per_page'] ) ) : 40;
		$page = isset( $args['paged'] ) ? max( 1, (int) $args['paged'] ) : 1;
		return array(
			'items' => array_slice( $items, ( $page - 1 ) * $per, $per ),
			'total' => count( $items ),
		);
	}

	/**
	 * Which posts show which model, in one query: [ model id => [ [ id, title ], … ] ].
	 *
	 * @return array
	 */
	public static function usage_map() {
		$q   = new \WP_Query(
			array(
				'post_type'              => 'any',
				'post_status'            => 'any',
				'posts_per_page'         => 2000,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_term_cache' => false,
				'meta_key'               => self::PRODUCT_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- one indexed lookup on the 3D Library page.
			)
		);
		$map = array();
		foreach ( $q->posts as $pid ) {
			$model = (int) get_post_meta( $pid, self::PRODUCT_KEY, true ); // from the meta cache the query filled
			if ( $model ) {
				$map[ $model ][] = array( 'id' => (int) $pid, 'title' => get_the_title( $pid ) );
			}
		}
		return $map;
	}

	/**
	 * Products (and posts) that show this model.
	 *
	 * @param int $id
	 * @return array [ id, title ]
	 */
	public static function used_by( $id ) {
		$ids = get_posts(
			array(
				'post_type'      => 'any',
				'post_status'    => 'any',
				'posts_per_page' => 50,
				'fields'         => 'ids',
				'meta_key'       => self::PRODUCT_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- small, indexed lookup on the dashboard only.
				'meta_value'     => (int) $id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_value
			)
		);
		return array_map(
			function ( $pid ) {
				return array( 'id' => (int) $pid, 'title' => get_the_title( $pid ) );
			},
			$ids
		);
	}

	/**
	 * Rename a model.
	 *
	 * @return array|\WP_Error the model
	 */
	public static function rename( $id, $name ) {
		$name = trim( sanitize_text_field( (string) $name ) );
		if ( get_post_type( $id ) !== self::POST_TYPE || '' === $name ) {
			return new \WP_Error( 'atlas_ar_model', __( 'Give the model a name.', 'ar-vr-3d-model-try-on' ) );
		}
		wp_update_post( array( 'ID' => (int) $id, 'post_title' => mb_substr( $name, 0, 120 ) ) );
		return self::get( $id );
	}

	/**
	 * Remove one optional file (iPhone file, poster or waiting source) from a model. The GLB stays:
	 * replace it instead.
	 *
	 * @return array|\WP_Error the model
	 */
	public static function remove_file( $id, $kind ) {
		if ( get_post_type( $id ) !== self::POST_TYPE || ! in_array( $kind, array( 'usdz', 'poster', 'source' ), true ) ) {
			return new \WP_Error( 'atlas_ar_model', __( 'This file cannot be removed.', 'ar-vr-3d-model-try-on' ) );
		}
		$files = self::raw_files( $id );
		if ( ! empty( $files[ $kind ]['file'] ) ) {
			self::delete_path( $files[ $kind ]['file'] );
		}
		unset( $files[ $kind ] );
		update_post_meta( $id, self::FILES_META, $files );
		return self::get( $id );
	}

	/** A GLB above this size is marked "Large file" (default 5 MB). */
	public static function large_bytes() {
		return (int) apply_filters( 'atlas_ar_library_large_bytes', 5 * MB_IN_BYTES );
	}

	/**
	 * Delete a model and its files — refused while a product uses it.
	 *
	 * @param int $id
	 * @return true|\WP_Error
	 */
	public static function delete( $id ) {
		if ( get_post_type( $id ) !== self::POST_TYPE ) {
			return new \WP_Error( 'atlas_ar_model', __( 'Unknown model.', 'ar-vr-3d-model-try-on' ) );
		}
		if ( self::used_by( $id ) ) {
			return new \WP_Error( 'atlas_ar_in_use', __( 'This model is used by products. Choose another model for them first.', 'ar-vr-3d-model-try-on' ) );
		}
		foreach ( self::raw_files( $id ) as $entry ) {
			if ( ! empty( $entry['file'] ) ) {
				self::delete_path( $entry['file'] );
			}
		}
		$fs = self::filesystem();
		if ( $fs && $fs->is_dir( self::dir( $id ) ) ) {
			$fs->rmdir( self::dir( $id ), true );
		}
		wp_delete_post( $id, true );
		return true;
	}

	/** @return string the model's folder (absolute path) */
	public static function dir( $id ) {
		$up = wp_upload_dir( null, false );
		return trailingslashit( $up['basedir'] ) . self::DIR . '/' . (int) $id;
	}

	/** @return array the stored file entries (relative paths) */
	private static function raw_files( $id ) {
		$files = get_post_meta( $id, self::FILES_META, true );
		return is_array( $files ) ? array_intersect_key( $files, self::KINDS ) : array();
	}

	/** A stored entry with its URL and name. */
	private static function file_entry( array $entry ) {
		$up   = wp_upload_dir( null, false );
		$file = isset( $entry['file'] ) ? (string) $entry['file'] : '';
		return array(
			'name' => wp_basename( $file ),
			'url'  => $file ? trailingslashit( $up['baseurl'] ) . str_replace( '%2F', '/', rawurlencode( $file ) ) : '',
			'size' => isset( $entry['size'] ) ? (int) $entry['size'] : 0,
		);
	}

	/** Delete a stored file, only inside the 3D Library folder. */
	private static function delete_path( $relative ) {
		$up   = wp_upload_dir( null, false );
		$root = realpath( trailingslashit( $up['basedir'] ) . self::DIR );
		$path = realpath( trailingslashit( $up['basedir'] ) . ltrim( (string) $relative, '/\\' ) );
		if ( $root && $path && 0 === strpos( $path, $root . DIRECTORY_SEPARATOR ) && is_file( $path ) ) {
			wp_delete_file( $path );
		}
	}

	/**
	 * Largest file the 3D Library takes (default: the site's upload limit).
	 *
	 * @return int bytes
	 */
	public static function max_bytes() {
		return (int) apply_filters( 'atlas_ar_library_max_bytes', wp_max_upload_size() );
	}

	/**
	 * The stored file name: "Summer Chair v2.php.GLB" → "summer-chair-v2-php.glb". Only the slug of
	 * the name and its (already checked) extension are kept, so no second extension survives.
	 */
	private static function safe_name( $name ) {
		$ext  = strtolower( pathinfo( (string) $name, PATHINFO_EXTENSION ) );
		$base = sanitize_title( pathinfo( (string) $name, PATHINFO_FILENAME ) );
		return ( '' !== $base ? $base : 'model' ) . '.' . $ext;
	}

	/**
	 * A .gltf is taken only when it carries everything inside it (data: URIs): a .gltf that points
	 * at other files would load them from wherever it says. Such models go in as one .glb file.
	 *
	 * @return true|\WP_Error
	 */
	private static function gltf_is_self_contained( $path ) {
		$size = is_readable( $path ) ? (int) filesize( $path ) : 0;
		$json = $size > 0 && $size <= self::max_bytes() ? json_decode( self::read_head( $path, $size ), true ) : null;
		if ( ! is_array( $json ) || empty( $json['asset'] ) ) {
			return new \WP_Error( 'atlas_ar_content', __( 'This .gltf file could not be read.', 'ar-vr-3d-model-try-on' ) );
		}
		foreach ( array( 'buffers', 'images' ) as $list ) {
			$items = isset( $json[ $list ] ) && is_array( $json[ $list ] ) ? $json[ $list ] : array();
			foreach ( $items as $item ) {
				if ( isset( $item['uri'] ) && 0 !== strpos( (string) $item['uri'], 'data:' ) ) {
					return new \WP_Error( 'atlas_ar_gltf_external', __( 'This .gltf file uses separate files (.bin or textures). Upload the model as one .glb file instead.', 'ar-vr-3d-model-try-on' ) );
				}
			}
		}
		return true;
	}

	/** The first bytes of a file. */
	private static function read_head( $path, $bytes ) {
		if ( ! is_string( $path ) || '' === $path || ! is_readable( $path ) ) {
			return '';
		}
		// Only the first bytes of a local upload (WP_Filesystem would read the whole model).
		$head = file_get_contents( $path, false, null, 0, (int) $bytes ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local temporary upload, header bytes only.
		return is_string( $head ) ? $head : '';
	}

	/** "summer-chair_v2" → "Summer chair v2" */
	private static function title_from( $base ) {
		return ucfirst( trim( preg_replace( '/[-_]+/', ' ', (string) $base ) ) );
	}

	/** @return \WP_Filesystem_Base|null */
	private static function filesystem() {
		global $wp_filesystem;
		if ( ! $wp_filesystem ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			WP_Filesystem();
		}
		return $wp_filesystem ? $wp_filesystem : null;
	}
}
