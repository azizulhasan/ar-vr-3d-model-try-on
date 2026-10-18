<?php
/**
 * AR-160: the one-time move from AtlasAR 2.x data to the 3D Library.
 *
 * 2.x kept everything as URLs: the site settings in the option `ar_try_on_settings`, each
 * product's model in the post meta `ar_try_on_product_settings` (src, ios_src, poster…).
 * This moves them over once, in small WP-Cron batches:
 * - Settings: mapped only on a site that has no AtlasAR 3 settings yet.
 * - Products: each model becomes a 3D Library model (its files are copied: the old files and
 *   the old data stay as they are), linked to the product, with its AR placement, try-on and
 *   loading choice. Products that already have a 3D Library model are left alone.
 * - Action `atlas_ar_migrate_product` lets AtlasAR Pro move its own part (hotspots, sizes, more
 *   models, variations, the try-on fit); model_from_urls() is the one way to turn a URL into a
 *   3D Library model.
 * Nothing here can stop a page: every product is tried on its own, errors are counted.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Migration {

	/** { status: running|done, after: last post id, moved, skipped, failed, settings, started, finished } */
	const STATE        = 'atlas_ar_migration';
	const HOOK         = 'atlas_ar_migrate_tick';
	const LOCK         = 'atlas_ar_migrate_lock';
	const OLD_SETTINGS = 'ar_try_on_settings';
	const OLD_PRODUCT  = 'ar_try_on_product_settings';
	/** md5 of the 2.x GLB URL, on the 3D Library model it became (one model for a URL used twice). */
	const LEGACY_SRC = '_atlas_ar_legacy_src';
	/** Products a batch (each may copy a few files). */
	const BATCH = 10;
	/** The demo model 2.x put on a post at activation: not a shop's own model. */
	const DEMO = 'modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

	public static function init() {
		add_action( self::HOOK, array( __CLASS__, 'tick' ) );
		add_action( 'admin_init', array( __CLASS__, 'maybe_start' ) );
	}

	/** @return array the state (empty before the first check) */
	public static function state() {
		$state = get_option( self::STATE );
		return is_array( $state ) ? $state : array();
	}

	/** First admin page after the update: start once, or keep a stalled run going. */
	public static function maybe_start() {
		$state = self::state();
		if ( isset( $state['status'] ) && 'done' === $state['status'] ) {
			return;
		}
		if ( isset( $state['status'] ) && 'running' === $state['status'] ) {
			if ( ! wp_next_scheduled( self::HOOK ) ) {
				wp_schedule_single_event( time(), self::HOOK );
			}
			return;
		}
		self::start();
	}

	/** Look for 2.x data; map the settings and queue the products. */
	public static function start() {
		$old_settings = get_option( self::OLD_SETTINGS );
		$has_products = (bool) self::next_ids( 0, 1 );
		$state        = array(
			'status'   => $has_products ? 'running' : 'done',
			'after'    => 0,
			'moved'    => 0,
			'skipped'  => 0,
			'failed'   => 0,
			'settings' => false,
			'started'  => time(),
			'finished' => $has_products ? 0 : time(),
		);
		// Only on a site that never saved AtlasAR 3 settings: never over the shop's new choices.
		if ( is_array( $old_settings ) && false === get_option( AR_TRY_ON_Settings::OPTION ) ) {
			try {
				AR_TRY_ON_Settings::update( self::map_settings( $old_settings ) );
				$state['settings'] = true;
			} catch ( \Throwable $e ) {
				$state['settings'] = false;
			}
		}
		update_option( self::STATE, $state, false );
		if ( $has_products && ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_single_event( time(), self::HOOK );
		}
		return $state;
	}

	/** One batch (WP-Cron, or `wp atlas-ar migrate`). @return array the state */
	public static function tick() {
		$state = self::state();
		if ( ! isset( $state['status'] ) || 'running' !== $state['status'] ) {
			return $state;
		}
		if ( ! add_option( self::LOCK, time(), '', false ) ) {
			$since = (int) get_option( self::LOCK );
			if ( $since > time() - 10 * MINUTE_IN_SECONDS ) {
				return $state; // another batch is running
			}
			update_option( self::LOCK, time(), false ); // a batch that died long ago
		}
		try {
			$ids = self::next_ids( (int) $state['after'], self::BATCH );
			foreach ( $ids as $id ) {
				$state['after'] = $id;
				try {
					$result = self::migrate_post( $id );
				} catch ( \Throwable $e ) {
					$result = 'failed';
				}
				++$state[ $result ];
				update_option( self::STATE, $state, false ); // progress survives a timeout
			}
			if ( count( $ids ) < self::BATCH ) {
				$state['status']   = 'done';
				$state['finished'] = time();
			}
			update_option( self::STATE, $state, false );
		} finally {
			delete_option( self::LOCK );
		}
		if ( 'running' === $state['status'] ) {
			wp_schedule_single_event( time() + 5, self::HOOK );
		}
		return $state;
	}

	/** @return int[] posts with 2.x data, after this id */
	private static function next_ids( $after, $limit ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- one-time batches on the indexed meta_key, nothing to cache.
		return array_map( 'intval', (array) $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND post_id > %d ORDER BY post_id ASC LIMIT %d", self::OLD_PRODUCT, (int) $after, (int) $limit ) ) );
	}

	/**
	 * Move one product.
	 *
	 * @return string moved | skipped | failed
	 */
	public static function migrate_post( $post_id ) {
		if ( ! get_post( $post_id ) || AR_TRY_ON_Product::model_id( $post_id ) ) {
			return 'skipped'; // gone, or already has a 3D Library model (never changed)
		}
		$old = self::old_product( $post_id );
		if ( '' === $old['src'] || false !== strpos( $old['src'], self::DEMO ) ) {
			return 'skipped';
		}
		$model = self::model_from_urls( $old['src'], $old['ios_src'], $old['poster'], get_the_title( $post_id ) );
		if ( is_wp_error( $model ) ) {
			return 'failed';
		}
		AR_TRY_ON_Product::update( $post_id, self::map_product( $old ) + array( 'model_id' => $model ) );

		/**
		 * A 2.x product was moved to the 3D Library: add-ons move their own part.
		 *
		 * @param int   $post_id
		 * @param array $old      the 2.x product data (old key names already renamed)
		 * @param int   $model_id the product's 3D Library model
		 */
		do_action( 'atlas_ar_migrate_product', $post_id, $old, $model );
		return 'moved';
	}

	/** @return array the 2.x product data, with its old key names renamed as 2.x did */
	public static function old_product( $post_id ) {
		$old = get_post_meta( $post_id, self::OLD_PRODUCT, true );
		$old = is_array( $old ) ? $old : array();
		$renames = array(
			'ar_try_on_file_android' => 'src',
			'ar_try_on_file_ios'     => 'ios_src',
			'ar_try_on_file_poster'  => 'poster',
			'ar_try_on_file_alt'     => 'alt',
			'ar_try_on_ar_placement' => 'ar_placement',
		);
		foreach ( $renames as $from => $to ) {
			if ( ! empty( $old[ $from ] ) ) {
				$old[ $to ] = $old[ $from ]; // 2.x let the old key win
			}
		}
		foreach ( array( 'src', 'ios_src', 'poster' ) as $k ) {
			$old[ $k ] = isset( $old[ $k ] ) && is_string( $old[ $k ] ) ? trim( $old[ $k ] ) : '';
		}
		return $old;
	}

	/**
	 * A 3D Library model for 2.x URLs (the same GLB URL always gives the same model).
	 *
	 * @param string $glb    GLB / glTF URL
	 * @param string $usdz   iPhone file URL ('' for none)
	 * @param string $poster image URL ('' for none)
	 * @param string $title
	 * @return int|\WP_Error the model id
	 */
	public static function model_from_urls( $glb, $usdz = '', $poster = '', $title = '' ) {
		$glb = trim( (string) $glb );
		if ( '' === $glb ) {
			return new \WP_Error( 'atlas_ar_migrate', 'no model' );
		}
		$found = get_posts(
			array(
				'post_type'              => AR_TRY_ON_Library::POST_TYPE,
				'post_status'            => 'any',
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_term_cache' => false,
				'meta_key'               => self::LEGACY_SRC, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- one-time move, one row.
				'meta_value'             => md5( $glb ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_value -- as above.
			)
		);
		if ( $found ) {
			return (int) $found[0];
		}
		$name = self::file_name( $glb );
		if ( 'glb' !== AR_TRY_ON_Library::kind_of( $name ) ) {
			return new \WP_Error( 'atlas_ar_migrate', 'not a GLB / glTF' );
		}
		$id = AR_TRY_ON_Library::create( $title ? $title : pathinfo( $name, PATHINFO_FILENAME ) );
		if ( is_wp_error( $id ) || ! $id ) {
			return is_wp_error( $id ) ? $id : new \WP_Error( 'atlas_ar_migrate', 'model not created' );
		}
		$stored = self::store( $id, 'glb', $glb );
		if ( is_wp_error( $stored ) ) {
			wp_delete_post( $id, true );
			return $stored;
		}
		if ( '' !== $usdz ) {
			self::store( $id, 'usdz', $usdz ); // optional: the model works without it
		}
		if ( '' !== $poster ) {
			self::store( $id, 'poster', $poster );
		}
		update_post_meta( $id, self::LEGACY_SRC, md5( $glb ) );
		return (int) $id;
	}

	/** Copy one file (from this site's uploads, or downloaded) into the model. */
	private static function store( $id, $kind, $url ) {
		$name = self::file_name( $url );
		if ( AR_TRY_ON_Library::kind_of( $name ) !== $kind ) {
			return new \WP_Error( 'atlas_ar_migrate', 'wrong file type' );
		}
		$path = self::local_path( $url );
		$temp = '';
		if ( '' === $path ) {
			if ( ! wp_http_validate_url( $url ) ) {
				return new \WP_Error( 'atlas_ar_migrate', 'not a file of this site, nor a web address' );
			}
			require_once ABSPATH . 'wp-admin/includes/file.php';
			$temp = download_url( $url, 60 ); // the shop's own model, shown by 2.x from this address
			if ( is_wp_error( $temp ) ) {
				return $temp;
			}
			$path = $temp;
		}
		try {
			if ( filesize( $path ) > AR_TRY_ON_Library::max_bytes() ) {
				return new \WP_Error( 'atlas_ar_migrate', 'too large' );
			}
			$ok = AR_TRY_ON_Library::check_content( $path, $name );
			if ( is_wp_error( $ok ) ) {
				return $ok;
			}
			return AR_TRY_ON_Library::store_file( $id, $kind, $path, $name );
		} finally {
			if ( $temp ) {
				wp_delete_file( $temp );
			}
		}
	}

	/** @return string the file's path when the URL is in this site's uploads, else '' */
	private static function local_path( $url ) {
		$up   = wp_upload_dir( null, false );
		$base = preg_replace( '#^https?:#i', '', untrailingslashit( $up['baseurl'] ) );
		$bare = preg_replace( '#^https?:#i', '', strtok( (string) $url, '?#' ) );
		if ( 0 !== strpos( $bare, $base . '/' ) ) {
			return '';
		}
		$root = realpath( $up['basedir'] );
		$path = realpath( $up['basedir'] . '/' . rawurldecode( substr( $bare, strlen( $base ) + 1 ) ) );
		return $root && $path && 0 === strpos( $path, $root . DIRECTORY_SEPARATOR ) && is_file( $path ) ? $path : '';
	}

	private static function file_name( $url ) {
		return sanitize_file_name( rawurldecode( wp_basename( (string) strtok( (string) $url, '?#' ) ) ) );
	}

	/** 2.x places → [ mode, button position ]. */
	private static function placement( $old ) {
		$map = array(
			'product_image' => array( 'gallery', '' ),
			'3d_viewer'     => array( 'gallery3d', '' ),
			'1'             => array( 'gallery3d', '' ),            // before the summary (next to the images)
			'3'             => array( 'gallery3d', '' ),            // before the product
			'2'             => array( 'button', 'after_summary' ),  // after the summary
			'4'             => array( 'button', 'after_summary' ),  // after the product
			'5'             => array( 'button', 'after_cart' ),
			'6'             => array( 'button', 'before_cart' ),
			'7'             => array( 'slide', '' ),                // among the thumbnails
		);
		return isset( $map[ (string) $old ] ) ? $map[ (string) $old ] : array( '', '' );
	}

	/** @return array AtlasAR 3 settings from the 2.x option (only what 2.x had set). */
	public static function map_settings( array $o ) {
		$yes = function ( $k, $on = 'yes' ) use ( $o ) {
			return isset( $o[ $k ] ) ? $on === $o[ $k ] : null;
		};
		$in = array( 'placement' => array(), 'look' => array(), 'tryon' => array(), 'general' => array() );

		if ( isset( $o['ar_try_on_allowed_post_types'] ) && is_array( $o['ar_try_on_allowed_post_types'] ) ) {
			$types = array_map( 'sanitize_key', $o['ar_try_on_allowed_post_types'] );
			if ( class_exists( 'WooCommerce' ) ) {
				$types[] = 'product';
			}
			$in['general']['post_types'] = array_values( array_unique( $types ) );
		}
		list( $mode, $position ) = self::placement( isset( $o['ar_try_on_wc_hook_position'] ) ? $o['ar_try_on_wc_hook_position'] : '' );
		if ( $mode ) {
			$in['placement']['mode'] = $mode;
		}
		if ( $position ) {
			$in['placement']['button_position'] = $position;
		}
		if ( null !== $yes( 'ar_try_on_single_product_tabs' ) ) {
			$in['placement']['product_tab'] = $yes( 'ar_try_on_single_product_tabs' );
		}
		if ( null !== $yes( 'ar_try_on_enable_qr_code' ) ) {
			$in['placement']['qr'] = $yes( 'ar_try_on_enable_qr_code' );
		}
		if ( null !== $yes( 'ar_try_on_ar', 'activate' ) ) {
			$in['look']['ar'] = $yes( 'ar_try_on_ar', 'activate' );
		}
		if ( null !== $yes( 'ar_try_on_xr_environment', 'activate' ) ) {
			$in['look']['xr_environment'] = $yes( 'ar_try_on_xr_environment', 'activate' );
		}
		if ( $yes( 'ar_try_on_ar_button', 'activate' ) ) {
			$in['look']['ar_button'] = 'custom';
			foreach ( array( 'ar_try_on_ar_button_background_color' => 'ar_color', 'ar_try_on_ar_button_text_color' => 'ar_text_color' ) as $from => $to ) {
				if ( ! empty( $o[ $from ] ) ) {
					$in['look'][ $to ] = $o[ $from ];
				}
			}
			if ( ! empty( $o['ar_try_on_ar_button_text'] ) ) {
				$in['look']['ar_text'] = $o['ar_try_on_ar_button_text'];
			}
		} elseif ( ! empty( $o['ar_try_on_view_in_ar_label'] ) && 'View in AR' !== $o['ar_try_on_view_in_ar_label'] ) {
			$in['look']['ar_text'] = $o['ar_try_on_view_in_ar_label']; // a label the shop wrote
		}
		if ( isset( $o['ar_try_on_interaction_prompt'] ) ) {
			$in['look']['prompt'] = 'none' !== $o['ar_try_on_interaction_prompt'];
		}
		if ( isset( $o['model_load_strategy'] ) ) {
			$in['look']['load'] = 'interaction' === $o['model_load_strategy'] ? 'click' : 'scroll';
		}
		// Only texts the shop changed (2.x's own defaults give way to AtlasAR 3's).
		$defaults = array(
			'tryon_button_label' => 'Try it on',
			'tryon_consent_text' => 'Allow camera access to try this product on virtually. Video stays on your device.',
		);
		foreach ( array( 'tryon_button_label' => 'label', 'tryon_consent_text' => 'consent' ) as $from => $to ) {
			if ( ! empty( $o[ $from ] ) && is_string( $o[ $from ] ) && $defaults[ $from ] !== $o[ $from ] ) {
				$in['tryon'][ $to ] = $o[ $from ];
			}
		}
		if ( isset( $o['tryon_snapshot'] ) ) {
			$in['tryon']['snapshot'] = (bool) $o['tryon_snapshot'];
		}
		if ( ! empty( $o['tryon_self_host'] ) ) {
			$in['tryon']['tracker'] = 'self';
		}
		return array_filter( $in );
	}

	/** @return array AtlasAR 3 product data from the 2.x product. */
	public static function map_product( array $old ) {
		$out = array();
		$at  = isset( $old['ar_placement'] ) ? (string) $old['ar_placement'] : '';
		if ( 'wall' === $at ) {
			$out['ar_placement'] = 'wall';
		} elseif ( 'face-glasses' === $at || 'face-hat' === $at ) {
			$out['tryon']        = 'face-glasses' === $at ? 'glasses' : 'hat';
			$out['tryon_viewer'] = ! empty( $old['show_static_viewer_for_tryon'] );
		}
		if ( isset( $old['model_load_strategy'] ) && in_array( $old['model_load_strategy'], array( 'auto', 'interaction' ), true ) ) {
			$out['load'] = 'interaction' === $old['model_load_strategy'] ? 'click' : 'scroll';
		}
		if ( ! empty( $old['view_in_ar_label'] ) && is_string( $old['view_in_ar_label'] ) ) {
			$out['ar_text'] = $old['view_in_ar_label'];
		}
		if ( isset( $old['canvas_height'] ) && preg_match( '/^\s*(\d{2,4})\s*px\s*$/i', (string) $old['canvas_height'], $m ) && 400 !== (int) $m[1] ) {
			$out['height'] = (int) $m[1]; // 400px was 2.x's default: keep the site's height
		}
		if ( ! empty( $old['show_button_in'] ) && 'global' !== $old['show_button_in'] ) {
			list( $mode ) = self::placement( $old['show_button_in'] );
			if ( $mode ) {
				$out['placement'] = $mode;
			}
		}
		return $out;
	}
}
