<?php
/**
 * AR-120: the face-tracking files of the try-on (MediaPipe), served from this site instead of the
 * public CDN when the site owner chooses so (Try-on › "From this site"). They are downloaded once,
 * on the owner's click, into uploads/atlasar/mediapipe/.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Tracker_Files {

	/** File → where it comes from, and the smallest size a real copy has (bytes). */
	public static function files() {
		$cdn = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' . AR_TRY_ON_Viewer::MEDIAPIPE . '/wasm/';
		return array(
			'face_landmarker.task'               => array( 'url' => AR_TRY_ON_Viewer::FACE_MODEL_URL, 'min' => 1000000 ),
			'wasm/vision_wasm_module_internal.js'   => array( 'url' => $cdn . 'vision_wasm_module_internal.js', 'min' => 100000 ),
			'wasm/vision_wasm_module_internal.wasm' => array( 'url' => $cdn . 'vision_wasm_module_internal.wasm', 'min' => 5000000 ),
		);
	}

	/** @return string folder (absolute) */
	public static function dir() {
		$up = wp_upload_dir( null, false );
		return trailingslashit( $up['basedir'] ) . AR_TRY_ON_Library::DIR . '/mediapipe/';
	}

	/** @return bool all files are on this site */
	public static function present() {
		foreach ( self::files() as $name => $f ) {
			$path = self::dir() . $name;
			if ( ! is_file( $path ) || filesize( $path ) < $f['min'] ) {
				return false;
			}
		}
		return true;
	}

	/** @return array [ present, size (bytes) ] */
	public static function status() {
		$size = 0;
		foreach ( array_keys( self::files() ) as $name ) {
			$path  = self::dir() . $name;
			$size += is_file( $path ) ? (int) filesize( $path ) : 0;
		}
		return array( 'present' => self::present(), 'size' => $size, 'version' => AR_TRY_ON_Viewer::MEDIAPIPE );
	}

	/**
	 * Download every file (owner's click). Each is checked before it replaces the old copy.
	 *
	 * @return array|\WP_Error status()
	 */
	public static function download() {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		global $wp_filesystem;
		if ( ! $wp_filesystem ) {
			WP_Filesystem();
		}
		if ( ! $wp_filesystem || ! wp_mkdir_p( self::dir() . 'wasm' ) ) {
			return new \WP_Error( 'atlas_ar_fs', __( 'The uploads folder cannot be written.', 'ar-vr-3d-model-try-on' ) );
		}
		foreach ( self::files() as $name => $f ) {
			$tmp = download_url( $f['url'], 120 );
			if ( is_wp_error( $tmp ) ) {
				/* translators: %s: file name */
				return new \WP_Error( 'atlas_ar_download', sprintf( __( '%s could not be downloaded. Please try again later.', 'ar-vr-3d-model-try-on' ), wp_basename( $name ) ) );
			}
			$ok = filesize( $tmp ) >= $f['min'];
			if ( $ok && '.wasm' === substr( $name, -5 ) ) {
				$ok = "\0asm" === (string) file_get_contents( $tmp, false, null, 0, 4 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- 4 header bytes of a local temp file.
			}
			if ( ! $ok || ! $wp_filesystem->move( $tmp, self::dir() . $name, true ) ) {
				wp_delete_file( $tmp );
				/* translators: %s: file name */
				return new \WP_Error( 'atlas_ar_download', sprintf( __( '%s did not download correctly. Please try again.', 'ar-vr-3d-model-try-on' ), wp_basename( $name ) ) );
			}
		}
		return self::status();
	}

	/** Remove the files (back to the CDN). */
	public static function remove() {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		global $wp_filesystem;
		if ( ! $wp_filesystem ) {
			WP_Filesystem();
		}
		if ( $wp_filesystem && $wp_filesystem->is_dir( self::dir() ) ) {
			$wp_filesystem->rmdir( self::dir(), true );
		}
		return self::status();
	}
}
