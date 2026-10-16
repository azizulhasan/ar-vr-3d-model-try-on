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
				$ok = false !== strpos( ltrim( $head ), '{' ) && false !== strpos( (string) self::read_head( $path, 4096 ), '"asset"' );
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
				$ok = 0 === strncmp( $head, 'Kaydara FBX Binary', 18 ) || false !== strpos( $head, 'FBX' ) || ! preg_match( '/[\x00-\x08]/', $head );
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
			$name = isset( $upload['name'] ) ? sanitize_file_name( (string) $upload['name'] ) : '';
			$tmp  = isset( $upload['tmp_name'] ) ? (string) $upload['tmp_name'] : '';
			$kind = self::kind_of( $name );
			if ( '' === $kind ) {
				$results[] = array( 'name' => $name, 'error' => __( 'Not a 3D, iPhone AR or poster file.', 'ar-vr-3d-model-try-on' ) );
				continue;
			}
			$check = self::check_content( $tmp, $name );
			if ( is_wp_error( $check ) ) {
				$results[] = array( 'name' => $name, 'error' => $check->get_error_message() );
				continue;
			}
			$base = strtolower( pathinfo( $name, PATHINFO_FILENAME ) );
			$id   = isset( $made[ $base ] ) ? $made[ $base ] : self::create( self::title_from( $base ) );
			if ( is_wp_error( $id ) ) {
				$results[] = array( 'name' => $name, 'error' => $id->get_error_message() );
				continue;
			}
			$made[ $base ] = $id;
			$saved         = self::store_file( $id, $kind, $tmp, $name );
			$results[]     = is_wp_error( $saved )
				? array( 'name' => $name, 'error' => $saved->get_error_message() )
				: array( 'name' => $name, 'kind' => $kind, 'model_id' => $id );
		}
		return $results;
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
		$name   = wp_unique_filename( $dir, sanitize_file_name( $name ) );
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
	 * @param int $id
	 * @return array|null
	 */
	public static function get( $id ) {
		$post = get_post( $id );
		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}
		$files = array();
		foreach ( self::raw_files( $id ) as $kind => $entry ) {
			$files[ $kind ] = self::file_entry( $entry );
		}
		$used = self::used_by( $id );
		return array(
			'id'      => (int) $id,
			'name'    => get_the_title( $post ),
			'files'   => $files,
			'size'    => array_sum( wp_list_pluck( $files, 'size' ) ),
			'missing' => array_values( array_diff( array( 'glb', 'usdz', 'poster' ), array_keys( $files ) ) ),
			'used_by' => $used,
		);
	}

	/**
	 * Models, newest first.
	 *
	 * @param array $args search, paged, per_page
	 * @return array [ items, total ]
	 */
	public static function query( array $args = array() ) {
		$q = new \WP_Query(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'publish',
				's'              => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
				'posts_per_page' => isset( $args['per_page'] ) ? max( 1, min( 100, (int) $args['per_page'] ) ) : 40,
				'paged'          => isset( $args['paged'] ) ? max( 1, (int) $args['paged'] ) : 1,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'fields'         => 'ids',
				'no_found_rows'  => false,
			)
		);
		return array(
			'items' => array_values( array_filter( array_map( array( __CLASS__, 'get' ), $q->posts ) ) ),
			'total' => (int) $q->found_posts,
		);
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
