<?php
/**
 * AR-161: shopper analytics, kept on this site.
 *
 * The viewer SDK counts what shoppers do (analytics.js: 3D view seen, turned, popup opened, AR,
 * try-on, sample face, snapshot; AtlasAR Pro adds hotspots, other models, variants) and sends
 * totals to POST /wp-json/ar_try_on/v1/stats. Stored here as daily totals per product and event
 * in {prefix}atlas_ar_stats: no cookies, no IP address, no visitor or device data, nothing sent
 * to any other service. Totals older than 400 days are removed. Off with Settings › "Count how
 * shoppers use the 3D view".
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Stats {

	const TABLE      = 'atlas_ar_stats';
	const DB_VERSION = 'atlas_ar_stats_db';
	const PRUNE      = 'atlas_ar_stats_prune';
	const KEEP_DAYS  = 400;
	/** Most products in one request, and most counts of one event (the SDK's own limit is 20). */
	const MAX_IDS   = 20;
	const MAX_COUNT = 20;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_action( 'admin_init', array( __CLASS__, 'install' ) );
		add_action( self::PRUNE, array( __CLASS__, 'prune' ) );
		add_filter( 'atlas_ar_viewer_options', array( __CLASS__, 'viewer_options' ), 5, 2 );
		add_action( 'admin_init', array( __CLASS__, 'privacy_text' ) );
	}

	/** @return bool counting is on (Settings) */
	public static function enabled() {
		return (bool) AR_TRY_ON_Settings::get( 'general.stats', true );
	}

	/** @return string the table name */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * The events counted, with their labels. AtlasAR Pro and add-ons add theirs.
	 *
	 * @return array key => label
	 */
	public static function events() {
		$events = array(
			'view'         => __( '3D views', 'ar-vr-3d-model-try-on' ),
			'turn'         => __( 'Turned or zoomed', 'ar-vr-3d-model-try-on' ),
			'open'         => __( 'Popup opened', 'ar-vr-3d-model-try-on' ),
			'ar'           => __( 'Seen in AR', 'ar-vr-3d-model-try-on' ),
			'tryon'        => __( 'Try-on opened', 'ar-vr-3d-model-try-on' ),
			'tryon_sample' => __( 'Tried on the sample face', 'ar-vr-3d-model-try-on' ),
			'snapshot'     => __( 'Try-on photos', 'ar-vr-3d-model-try-on' ),
		);

		/**
		 * Events the stats endpoint takes (the viewer SDK's analytics names: a-z, 0-9, _).
		 *
		 * @param array $events key => label
		 */
		$events = (array) apply_filters( 'atlas_ar_stats_events', $events );
		return array_filter( $events, function ( $k ) {
			return (bool) preg_match( '/^[a-z][a-z0-9_]{0,31}$/', (string) $k );
		}, ARRAY_FILTER_USE_KEY );
	}

	/** Create or update the table (also after an update, which runs no activation). */
	public static function install() {
		if ( '1' === get_option( self::DB_VERSION ) ) {
			return;
		}
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		dbDelta(
			'CREATE TABLE ' . self::table() . " (
				day date NOT NULL,
				post_id bigint(20) unsigned NOT NULL,
				event varchar(32) NOT NULL,
				n int(10) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (day,post_id,event),
				KEY post_day (post_id,day)
			) {$charset};"
		);
		update_option( self::DB_VERSION, '1', true );
		if ( ! wp_next_scheduled( self::PRUNE ) ) {
			wp_schedule_event( time() + DAY_IN_SECONDS, 'daily', self::PRUNE );
		}
	}

	/** Remove totals older than KEEP_DAYS. */
	public static function prune() {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- the plugin's own table.
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE day < %s', gmdate( 'Y-m-d', time() - self::KEEP_DAYS * DAY_IN_SECONDS ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter -- the plugin's own table (name from $wpdb->prefix), old days removed.
	}

	/** The viewer counts for this product (SDK options analytics + analyticsId). */
	public static function viewer_options( $opts, $post_id ) {
		if ( self::enabled() && '1' === get_option( self::DB_VERSION ) ) {
			$opts['analytics']   = rest_url( 'ar_try_on/v1/stats' );
			$opts['analyticsId'] = (string) (int) $post_id;
		}
		return $opts;
	}

	/** data-atlasar-analytics attributes for a page's own try-on button ('' when off). */
	public static function button_attributes( $post_id ) {
		if ( ! self::enabled() || '1' !== get_option( self::DB_VERSION ) ) {
			return '';
		}
		return sprintf( ' data-atlasar-analytics="%1$s" data-atlasar-analytics-id="%2$d"', esc_url( rest_url( 'ar_try_on/v1/stats' ) ), (int) $post_id );
	}

	public static function routes() {
		register_rest_route(
			'ar_try_on/v1',
			'/stats',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'collect' ),
					// Public on purpose: shoppers' browsers send counts. Only known events for
					// products that show a 3D model are taken, each count capped.
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'report' ),
					'permission_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
					'args'                => array(
						'days' => array( 'type' => 'integer', 'default' => 30, 'enum' => array( 7, 30, 90, 365 ), 'description' => 'The last 7, 30, 90 or 365 days.' ),
						'page' => array( 'type' => 'integer', 'default' => 1, 'minimum' => 1, 'sanitize_callback' => 'absint', 'description' => 'Page of the product list (20 a page).' ),
					),
				),
			)
		);
	}

	/** POST: { v: 1, counts: { "<post id>": { "<event>": n } } } (sent as text/plain). */
	public static function collect( \WP_REST_Request $r ) {
		if ( ! self::enabled() ) {
			return new \WP_REST_Response( null, 204 );
		}
		$body = $r->get_body();
		if ( strlen( $body ) > 8192 ) {
			return new \WP_REST_Response( null, 413 );
		}
		$data = json_decode( $body, true );
		if ( ! is_array( $data ) || empty( $data['counts'] ) || ! is_array( $data['counts'] ) ) {
			return new \WP_REST_Response( null, 400 );
		}
		$events = self::events();
		$types  = AR_TRY_ON_Settings::enabled_post_types();
		$rows   = array();
		foreach ( array_slice( $data['counts'], 0, self::MAX_IDS, true ) as $id => $counts ) {
			$id = absint( $id );
			if ( ! $id || ! is_array( $counts ) || 'publish' !== get_post_status( $id ) || ! in_array( get_post_type( $id ), $types, true ) || ! AR_TRY_ON_Product::has_model( $id ) ) {
				continue;
			}
			foreach ( $counts as $event => $n ) {
				$n = (int) $n;
				if ( isset( $events[ $event ] ) && $n > 0 ) {
					$rows[] = array( $id, (string) $event, min( $n, self::MAX_COUNT ) );
				}
			}
		}
		if ( $rows ) {
			self::add( $rows );
		}
		return new \WP_REST_Response( null, 204 );
	}

	/** Add counts to today's totals: rows of [ post_id, event, n ]. One query. */
	public static function add( array $rows ) {
		global $wpdb;
		$day    = current_time( 'Y-m-d' );
		$values = array();
		$args   = array();
		foreach ( $rows as $row ) {
			$values[] = '(%s, %d, %s, %d)';
			array_push( $args, $day, (int) $row[0], (string) $row[1], (int) $row[2] );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, PluginCheck.Security.DirectDB.UnescapedDBParameter -- the plugin's own table; placeholders built above.
		$wpdb->query( $wpdb->prepare( 'INSERT INTO ' . self::table() . ' (day, post_id, event, n) VALUES ' . implode( ', ', $values ) . ' ON DUPLICATE KEY UPDATE n = n + VALUES(n)', $args ) );
	}

	/**
	 * GET: totals of the last N days, a day-by-day line for each event, and the products (most
	 * 3D views first, 20 a page).
	 */
	public static function report( \WP_REST_Request $r ) {
		global $wpdb;
		$days   = (int) $r->get_param( 'days' );
		$page   = max( 1, (int) $r->get_param( 'page' ) );
		$from   = gmdate( 'Y-m-d', strtotime( current_time( 'Y-m-d' ) ) - ( $days - 1 ) * DAY_IN_SECONDS );
		$events = self::events();
		$table  = self::table();
		$out    = array( 'days' => $days, 'from' => $from, 'events' => $events, 'totals' => array(), 'series' => array(), 'products' => array(), 'total' => 0, 'enabled' => self::enabled() );
		if ( '1' !== get_option( self::DB_VERSION ) ) {
			return $out;
		}
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- the plugin's own table (name from $wpdb->prefix); small grouped reads.
		foreach ( (array) $wpdb->get_results( $wpdb->prepare( "SELECT event, SUM(n) AS n FROM {$table} WHERE day >= %s GROUP BY event", $from ), ARRAY_A ) as $row ) {
			$out['totals'][ $row['event'] ] = (int) $row['n'];
		}
		foreach ( (array) $wpdb->get_results( $wpdb->prepare( "SELECT day, event, SUM(n) AS n FROM {$table} WHERE day >= %s GROUP BY day, event", $from ), ARRAY_A ) as $row ) {
			$out['series'][ $row['event'] ][ $row['day'] ] = (int) $row['n'];
		}
		$out['total'] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(DISTINCT post_id) FROM {$table} WHERE day >= %s", $from ) );
		$ids          = array_map(
			'intval',
			(array) $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$table} WHERE day >= %s GROUP BY post_id ORDER BY SUM(CASE WHEN event = 'view' THEN n ELSE 0 END) DESC, post_id DESC LIMIT %d OFFSET %d", $from, 20, ( $page - 1 ) * 20 ) )
		);
		if ( $ids ) {
			$in   = implode( ',', $ids ); // integers only
			$rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT post_id, event, SUM(n) AS n FROM {$table} WHERE day >= %s AND post_id IN ({$in}) GROUP BY post_id, event", $from ), ARRAY_A );
			$by   = array();
			foreach ( $rows as $row ) {
				$by[ (int) $row['post_id'] ][ $row['event'] ] = (int) $row['n'];
			}
			_prime_post_caches( $ids, false, false );
			foreach ( $ids as $id ) {
				$out['products'][] = array(
					'id'       => $id,
					'title'    => get_post( $id ) ? html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' ) : sprintf( /* translators: %d: post ID */ __( 'Deleted (#%d)', 'ar-vr-3d-model-try-on' ), $id ),
					'edit_url' => get_post( $id ) && current_user_can( 'edit_post', $id ) ? get_edit_post_link( $id, 'raw' ) : '',
					'counts'   => isset( $by[ $id ] ) ? $by[ $id ] : array(),
				);
			}
		}
		// phpcs:enable
		return $out;
	}

	/** The privacy policy guide (Settings › Privacy): what AtlasAR counts. */
	public static function privacy_text() {
		if ( function_exists( 'wp_add_privacy_policy_content' ) ) {
			wp_add_privacy_policy_content(
				'AtlasAR',
				'<p>' . esc_html__( 'When a visitor uses a 3D view (turns the model, opens it in AR, uses the virtual try-on), the AtlasAR plugin adds one to a daily total for that product on this website. No cookies are set and no personal data is stored: no IP address, no visitor or device information. The try-on camera picture never leaves the visitor’s device.', 'ar-vr-3d-model-try-on' ) . '</p>'
			);
		}
	}
}
