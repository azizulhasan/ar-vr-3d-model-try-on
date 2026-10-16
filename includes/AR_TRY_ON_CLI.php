<?php
/**
 * AR-126: `wp atlas-ar …` — manage AtlasAR from WP-CLI. Every command uses the same classes as
 * the dashboard and the REST API, so the same checks and cleaning apply.
 *
 *   wp atlas-ar settings get [<path>] | set <path> <value> | reset | export | import <file>
 *   wp atlas-ar library list | get <id> | add <file>… | add-file <id> <file> | rename <id> <name>
 *                       | remove-file <id> <kind> | restore <id> | delete <id>
 *   wp atlas-ar product list | get <id> | set <id> --<field>=<value>… | link <id> <model> | unlink <id>
 *   wp atlas-ar cloud status | connect <email> --agree | key <key> | disconnect | optimise <model>
 *   wp atlas-ar tryon-files status | download | remove
 *   wp atlas-ar check
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

use ATLAS_AR_API\AR_TRY_ON_Admin_Routes;
use WP_CLI;
use WP_CLI\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_CLI {

	public static function register() {
		WP_CLI::add_command( 'atlas-ar settings', array( __CLASS__, 'settings' ), array( 'shortdesc' => 'Read or change AtlasAR settings.' ) );
		WP_CLI::add_command( 'atlas-ar library', array( __CLASS__, 'library' ), array( 'shortdesc' => 'Manage the 3D Library (models and their files).' ) );
		WP_CLI::add_command( 'atlas-ar product', array( __CLASS__, 'product' ), array( 'shortdesc' => 'Read or change a product’s (or post’s) AtlasAR data.' ) );
		WP_CLI::add_command( 'atlas-ar cloud', array( __CLASS__, 'cloud' ), array( 'shortdesc' => 'Connect to and use AtlasAR Cloud.' ) );
		WP_CLI::add_command( 'atlas-ar tryon-files', array( __CLASS__, 'tryon_files' ), array( 'shortdesc' => 'Face-tracking files of the try-on on this site.' ) );
		WP_CLI::add_command( 'atlas-ar check', array( __CLASS__, 'check' ), array( 'shortdesc' => 'Check what AtlasAR needs on this site.' ) );
	}

	/**
	 * Read or change AtlasAR settings.
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : get | set | reset | export | import
	 *
	 * [<path>]
	 * : get / set: a group or group.field, e.g. placement.mode (see `wp atlas-ar settings get`).
	 *   import: a JSON file made by export.
	 *
	 * [<value>]
	 * : set: the new value (JSON is read: true, 1.5, ["product","post"]).
	 *
	 * [--format=<format>]
	 * : get: json or yaml.
	 * ---
	 * default: json
	 * options:
	 *   - json
	 *   - yaml
	 * ---
	 *
	 * [--yes]
	 * : reset: do not ask.
	 *
	 * ## EXAMPLES
	 *
	 *     wp atlas-ar settings get placement
	 *     wp atlas-ar settings set placement.mode button
	 *     wp atlas-ar settings set general.post_types '["product","page"]'
	 *     wp atlas-ar settings export > atlasar.json && wp atlas-ar settings import atlasar.json
	 */
	public static function settings( $args, $assoc ) {
		$action = isset( $args[0] ) ? $args[0] : 'get';
		switch ( $action ) {
			case 'get':
				$value = isset( $args[1] ) ? AR_TRY_ON_Settings::get( $args[1] ) : AR_TRY_ON_Settings::all();
				if ( null === $value ) {
					WP_CLI::error( "Unknown setting: {$args[1]}" );
				}
				self::print_value( $value, Utils\get_flag_value( $assoc, 'format', 'json' ) );
				return;
			case 'set':
				if ( count( $args ) < 3 || false === strpos( $args[1], '.' ) ) {
					WP_CLI::error( 'Usage: wp atlas-ar settings set <group.field> <value>' );
				}
				list( $group, $field ) = explode( '.', $args[1], 2 );
				$schema                = AR_TRY_ON_Settings::schema();
				if ( ! isset( $schema[ $group ][ $field ] ) ) {
					WP_CLI::error( "Unknown setting: {$args[1]}" );
				}
				$decoded = json_decode( $args[2], true );
				$value   = null === $decoded && 'null' !== $args[2] ? $args[2] : $decoded;
				$saved   = AR_TRY_ON_Settings::update( array( $group => array( $field => $value ) ) );
				WP_CLI::success( "{$args[1]} = " . wp_json_encode( $saved[ $group ][ $field ] ) );
				return;
			case 'reset':
				WP_CLI::confirm( 'Reset every AtlasAR setting to its default?', $assoc );
				AR_TRY_ON_Settings::reset();
				WP_CLI::success( 'Settings reset.' );
				return;
			case 'export':
				WP_CLI::line( wp_json_encode( array( 'atlasar' => 1, 'settings' => AR_TRY_ON_Settings::all() ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
				return;
			case 'import':
				$file = isset( $args[1] ) ? $args[1] : '';
				$data = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file given on the command line.
				if ( ! is_array( $data ) || empty( $data['settings'] ) || ! is_array( $data['settings'] ) ) {
					WP_CLI::error( 'Give a JSON file made by `wp atlas-ar settings export`.' );
				}
				AR_TRY_ON_Settings::update( $data['settings'] );
				WP_CLI::success( 'Settings imported.' );
				return;
		}
		WP_CLI::error( "Unknown action: {$action}" );
	}

	/**
	 * Manage the 3D Library.
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : list | get | add | add-file | rename | remove-file | restore | delete
	 *
	 * [<args>...]
	 * : get / restore / delete: <id>. add: <file>… (same names join one model).
	 *   add-file: <id> <file>. rename: <id> <name>. remove-file: <id> <usdz|poster|source>.
	 *
	 * [--filter=<filter>]
	 * : list: which models.
	 * ---
	 * default: all
	 * options:
	 *   - all
	 *   - used
	 *   - unused
	 *   - missing
	 *   - large
	 * ---
	 *
	 * [--search=<text>]
	 * : list: models whose name has this text.
	 *
	 * [--format=<format>]
	 * : list: table, json, csv, ids or count.
	 * ---
	 * default: table
	 * ---
	 *
	 * [--yes]
	 * : delete: do not ask.
	 *
	 * ## EXAMPLES
	 *
	 *     wp atlas-ar library list --filter=large
	 *     wp atlas-ar library add chair.glb chair.usdz chair.jpg
	 *     wp atlas-ar library rename 12 "Oak armchair"
	 *     wp atlas-ar library delete 12 --yes
	 */
	public static function library( $args, $assoc ) {
		$action = array_shift( $args );
		$id     = isset( $args[0] ) ? absint( $args[0] ) : 0;
		switch ( $action ) {
			case 'list':
				$res  = AR_TRY_ON_Library::query( array( 'filter' => Utils\get_flag_value( $assoc, 'filter', 'all' ), 'search' => Utils\get_flag_value( $assoc, 'search', '' ), 'per_page' => 100 ) );
				$rows = array_map(
					function ( $m ) {
						return array(
							'id'      => $m['id'],
							'name'    => $m['name'],
							'files'   => implode( ',', array_keys( $m['files'] ) ),
							'size'    => size_format( $m['size'] ),
							'used_by' => count( $m['used_by'] ),
							'missing' => implode( ',', $m['missing'] ),
						);
					},
					$res['items']
				);
				Utils\format_items( Utils\get_flag_value( $assoc, 'format', 'table' ), $rows, array( 'id', 'name', 'files', 'size', 'used_by', 'missing' ) );
				return;
			case 'get':
				self::print_value( self::need( AR_TRY_ON_Library::get( $id ), 'Unknown model.' ), 'json' );
				return;
			case 'add':
				if ( ! $args ) {
					WP_CLI::error( 'Give one or more files.' );
				}
				$uploads = array();
				foreach ( $args as $file ) {
					if ( ! is_readable( $file ) ) {
						WP_CLI::error( "Cannot read {$file}" );
					}
					$uploads[] = array( 'tmp_name' => $file, 'name' => wp_basename( $file ) );
				}
				foreach ( AR_TRY_ON_Library::add_uploads( $uploads ) as $r ) {
					if ( empty( $r['error'] ) ) {
						WP_CLI::log( "{$r['name']}: added to model {$r['model_id']} ({$r['kind']})" );
					} else {
						WP_CLI::warning( "{$r['name']}: {$r['error']}" );
					}
				}
				return;
			case 'add-file':
				$file = isset( $args[1] ) ? $args[1] : '';
				if ( ! is_readable( $file ) ) {
					WP_CLI::error( 'Usage: wp atlas-ar library add-file <id> <file>' );
				}
				self::done( AR_TRY_ON_Library::add_file( $id, array( 'tmp_name' => $file, 'name' => wp_basename( $file ) ) ), 'File added.' );
				return;
			case 'rename':
				self::done( AR_TRY_ON_Library::rename( $id, isset( $args[1] ) ? $args[1] : '' ), 'Renamed.' );
				return;
			case 'remove-file':
				self::done( AR_TRY_ON_Library::remove_file( $id, isset( $args[1] ) ? $args[1] : '' ), 'File removed.' );
				return;
			case 'restore':
				self::done( AR_TRY_ON_Library::restore_original( $id ), 'The original GLB is back.' );
				return;
			case 'delete':
				$m = self::need( AR_TRY_ON_Library::get( $id ), 'Unknown model.' );
				WP_CLI::confirm( "Delete “{$m['name']}” and its files?", $assoc );
				self::done( AR_TRY_ON_Library::delete( $id ), 'Deleted.' );
				return;
		}
		WP_CLI::error( 'Unknown action. See: wp help atlas-ar library' );
	}

	/**
	 * Read or change a product’s (or post’s) AtlasAR data.
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : list | get | set | link | unlink
	 *
	 * [<id>]
	 * : The product or post ID (get, set, link, unlink).
	 *
	 * [<model>]
	 * : link: the 3D Library model ID.
	 *
	 * [--filter=<filter>]
	 * : list: all, with (3D), without (3D) or tryon.
	 * ---
	 * default: all
	 * ---
	 *
	 * [--search=<text>]
	 * : list: products whose title has this text.
	 *
	 * [--format=<format>]
	 * : list: table, json, csv, ids or count.
	 * ---
	 * default: table
	 * ---
	 *
	 * [--<field>=<value>]
	 * : set: any product field (use_site, background, placement, ar_placement, ar_scale, tryon,
	 *   tryon_viewer); see `wp atlas-ar product get <id>`.
	 *
	 * ## EXAMPLES
	 *
	 *     wp atlas-ar product list --filter=without
	 *     wp atlas-ar product link 183 12
	 *     wp atlas-ar product set 183 --placement=button --tryon=glasses
	 */
	public static function product( $args, $assoc ) {
		$action = isset( $args[0] ) ? $args[0] : 'list';
		$id     = isset( $args[1] ) ? absint( $args[1] ) : 0;
		if ( 'list' === $action ) {
			$req = new \WP_REST_Request( 'GET', '/ar_try_on/v1/items' );
			foreach ( array( 'filter' => 'all', 'search' => '', 'page' => 1, 'per_page' => 100 ) as $k => $d ) {
				$req->set_param( $k, Utils\get_flag_value( $assoc, $k, $d ) );
			}
			$items = AR_TRY_ON_Admin_Routes::list_items( $req, false )->get_data();
			$rows  = array_map(
				function ( $i ) {
					return array( 'id' => $i['id'], 'title' => $i['title'], 'type' => $i['type'], 'model' => $i['model'] ? $i['model']['id'] . ' ' . $i['model']['name'] : '', 'tryon' => $i['tryon'] );
				},
				$items
			);
			Utils\format_items( Utils\get_flag_value( $assoc, 'format', 'table' ), $rows, array( 'id', 'title', 'type', 'model', 'tryon' ) );
			return;
		}
		if ( ! $id || ! get_post( $id ) ) {
			WP_CLI::error( 'Give a product or post ID.' );
		}
		switch ( $action ) {
			case 'get':
				self::print_value( AR_TRY_ON_Admin_Routes::item( $id ), 'json' );
				return;
			case 'set':
				$fields = array_intersect_key( $assoc, AR_TRY_ON_Product::schema() );
				if ( ! $fields ) {
					WP_CLI::error( 'Give one or more fields, e.g. --placement=button' );
				}
				foreach ( $fields as $k => $v ) {
					$j            = json_decode( (string) $v, true );
					$fields[ $k ] = null === $j ? $v : $j;
				}
				$saved = AR_TRY_ON_Product::update( $id, $fields );
				WP_CLI::success( wp_json_encode( array_intersect_key( $saved, $fields ) ) );
				return;
			case 'link':
				$model = isset( $args[2] ) ? absint( $args[2] ) : 0;
				self::need( AR_TRY_ON_Library::get( $model ), 'Unknown model.' );
				AR_TRY_ON_Product::update( $id, array( 'model_id' => $model ) );
				WP_CLI::success( "Post {$id} shows model {$model}." );
				return;
			case 'unlink':
				AR_TRY_ON_Product::update( $id, array( 'model_id' => 0 ) );
				WP_CLI::success( "Post {$id} shows no 3D model." );
				return;
		}
		WP_CLI::error( 'Unknown action. See: wp help atlas-ar product' );
	}

	/**
	 * Connect to and use AtlasAR Cloud (optional).
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : status | connect | key | disconnect | optimise
	 *
	 * [<value>]
	 * : connect: your email. key: an AtlasAR Cloud key (ar_live_…). optimise: a 3D Library model ID.
	 *
	 * [--agree]
	 * : connect: you agree that a model is sent to AtlasAR Cloud only when you ask, and accept its
	 *   terms and privacy policy.
	 *
	 * [--height=<cm>]
	 * : optimise: the product's real height in cm.
	 *
	 * [--fresh]
	 * : status: ask the service now (not the 10-minute cache).
	 *
	 * ## EXAMPLES
	 *
	 *     wp atlas-ar cloud connect owner@example.com --agree
	 *     wp atlas-ar cloud optimise 12 --height=45
	 */
	public static function cloud( $args, $assoc ) {
		$action = isset( $args[0] ) ? $args[0] : 'status';
		$value  = isset( $args[1] ) ? $args[1] : '';
		switch ( $action ) {
			case 'status':
				self::print_value( AR_TRY_ON_Cloud::status( (bool) Utils\get_flag_value( $assoc, 'fresh', false ) ), 'json' );
				return;
			case 'connect':
				if ( ! Utils\get_flag_value( $assoc, 'agree', false ) ) {
					WP_CLI::error( 'Add --agree: a model is sent to AtlasAR Cloud only when you ask, and you accept its terms and privacy policy.' );
				}
				self::done( AR_TRY_ON_Cloud::register( $value ), 'Connected.' );
				return;
			case 'key':
				self::done( AR_TRY_ON_Cloud::use_key( $value ), 'Key saved.' );
				return;
			case 'disconnect':
				AR_TRY_ON_Cloud::disconnect();
				WP_CLI::success( 'Disconnected (the account and its hosted models stay on AtlasAR Cloud).' );
				return;
			case 'optimise':
				$id    = absint( $value );
				$start = AR_TRY_ON_Cloud::optimise_start( $id, (float) Utils\get_flag_value( $assoc, 'height', 0 ) );
				if ( is_wp_error( $start ) ) {
					WP_CLI::error( $start->get_error_message() );
				}
				WP_CLI::log( 'Sent to AtlasAR Cloud; waiting…' );
				for ( $i = 0; $i < 120; $i++ ) {
					sleep( 5 );
					$res = AR_TRY_ON_Cloud::optimise_poll( $id );
					if ( is_wp_error( $res ) ) {
						WP_CLI::error( $res->get_error_message() );
					}
					if ( 'ready' === $res['status'] ) {
						$o = $res['model']['optimised'];
						WP_CLI::success( sprintf( 'Optimised: %s → %s', size_format( $o['before'] ), size_format( $o['after'] ) ) );
						return;
					}
				}
				WP_CLI::warning( 'Still working. Run the command again later to fetch the result.' );
				return;
		}
		WP_CLI::error( 'Unknown action. See: wp help atlas-ar cloud' );
	}

	/**
	 * The try-on's face-tracking files on this site (instead of the public CDN).
	 *
	 * ## OPTIONS
	 *
	 * <action>
	 * : status | download (and use them) | remove (back to the CDN)
	 */
	public static function tryon_files( $args ) {
		$action = isset( $args[0] ) ? $args[0] : 'status';
		if ( 'download' === $action ) {
			$res = AR_TRY_ON_Tracker_Files::download();
			if ( is_wp_error( $res ) ) {
				WP_CLI::error( $res->get_error_message() );
			}
			AR_TRY_ON_Settings::update( array( 'tryon' => array( 'tracker' => 'self' ) ) );
			WP_CLI::success( 'Downloaded (' . size_format( $res['size'] ) . '); the try-on uses them now.' );
			return;
		}
		if ( 'remove' === $action ) {
			AR_TRY_ON_Tracker_Files::remove();
			AR_TRY_ON_Settings::update( array( 'tryon' => array( 'tracker' => 'cdn' ) ) );
			WP_CLI::success( 'Removed; the try-on uses the public CDN.' );
			return;
		}
		self::print_value( AR_TRY_ON_Tracker_Files::status() + array( 'used' => AR_TRY_ON_Settings::get( 'tryon.tracker' ) ), 'json' );
	}

	/**
	 * Check what AtlasAR needs on this site (HTTPS, uploads, WooCommerce, PHP, upload size).
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : table or json.
	 * ---
	 * default: table
	 * ---
	 */
	public static function check( $args, $assoc ) {
		$rows = array_map(
			function ( $c ) {
				return array( 'ok' => $c['ok'] ? 'yes' : 'NO', 'check' => $c['text'] );
			},
			AR_TRY_ON_Admin_Routes::site_check()
		);
		Utils\format_items( Utils\get_flag_value( $assoc, 'format', 'table' ), $rows, array( 'ok', 'check' ) );
	}

	/* --------------------------------------------------------------------- helpers */

	private static function print_value( $value, $format ) {
		if ( 'yaml' === $format && class_exists( '\Mustangostang\Spyc' ) ) {
			WP_CLI::line( \Mustangostang\Spyc::YAMLDump( $value ) );
			return;
		}
		WP_CLI::line( is_scalar( $value ) ? (string) $value : wp_json_encode( $value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	}

	private static function need( $value, $message ) {
		if ( ! $value ) {
			WP_CLI::error( $message );
		}
		return $value;
	}

	private static function done( $result, $message ) {
		if ( is_wp_error( $result ) ) {
			WP_CLI::error( $result->get_error_message() );
		}
		WP_CLI::success( $message );
	}
}
