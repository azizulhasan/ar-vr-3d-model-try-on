<?php
/**
 * AR-120: REST routes of the AtlasAR dashboard, setup wizard and product panel (ar_try_on/v1).
 *
 *   GET  /config                 settings + their options, Cloud status, site facts
 *   POST /config                 save settings (any part)        { settings }
 *   POST /config/reset           back to the defaults
 *   GET  /items                  posts / products with their 3D status (search, filter, page)
 *   GET  /items/<id>             one product's AtlasAR data and model
 *   POST /items/<id>             save it                         { data }
 *   GET  /cloud                  Cloud status (fresh=1 asks the service)
 *   POST /cloud/connect          free account for this site      { email, consent }
 *   POST /cloud/key              use an existing key             { key }
 *   DELETE /cloud                forget the key on this site
 *   GET  /check                  site check for Help
 *   POST /tracker                download the try-on files to this site
 *   DELETE /tracker              remove them (back to the CDN)
 *
 * Settings, Cloud and the try-on files need manage_options; product data needs edit_post.
 *
 * @package AR_TRY_ON
 */

namespace ATLAS_AR_API;

use AR_TRY_ON\AR_TRY_ON_Cloud;
use AR_TRY_ON\AR_TRY_ON_Library;
use AR_TRY_ON\AR_TRY_ON_Product;
use AR_TRY_ON\AR_TRY_ON_Settings;
use AR_TRY_ON\AR_TRY_ON_Tracker_Files;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Admin_Routes {

	const NS = 'ar_try_on/v1';

	public static function register() {
		$admin = array( __CLASS__, 'can_manage' );
		$id    = array( 'id' => self::arg( 'integer', 'The product, post or page ID (a post type AtlasAR is on for).', array( 'required' => true, 'sanitize_callback' => 'absint' ) ) );
		$routes = array(
			'/config'            => array(
				array(
					'GET', 'get_config', $admin,
					__( 'Get AtlasAR settings', 'ar-vr-3d-model-try-on' ),
					__( 'All AtlasAR settings (placement, look, try-on, general) with the choices each field allows, the AtlasAR Cloud status, the try-on files status, the post types AtlasAR can be on, and counts of 3D models.', 'ar-vr-3d-model-try-on' ),
				),
				array(
					'POST', 'save_config', $admin,
					__( 'Change AtlasAR settings', 'ar-vr-3d-model-try-on' ),
					__( 'Saves any part of the settings, e.g. {"settings":{"placement":{"mode":"button"}}}. Unknown fields are ignored; every value is cleaned by its type (enums keep their allowed values, numbers stay in range). Returns all settings.', 'ar-vr-3d-model-try-on' ),
					array( 'settings' => self::arg( 'object', 'Settings to change, by group: placement { mode: gallery|gallery3d|button|tab|slide, button_position: after_cart|before_cart|after_summary|under_images, product_tab, qr }, look { background, lighting: neutral|bright|custom, environment_url, exposure 0.5–2, shadow 0–2, auto_rotate, zoom, ar_button: default|custom, ar_text, ar_color, load: scroll|click }, tryon { enabled, label, consent, snapshot, tracker: cdn|self }, general { post_types, auto_optimise, telemetry, remove_data }.', array( 'required' => true ) ) ),
				),
			),
			'/config/reset'      => array(
				array( 'POST', 'reset_config', $admin, __( 'Reset AtlasAR settings', 'ar-vr-3d-model-try-on' ), __( 'Puts every AtlasAR setting back to its default (the setup wizard stays done). Products and 3D models are not changed.', 'ar-vr-3d-model-try-on' ) ),
			),
			'/items'             => array(
				array(
					'GET', 'list_items', array( __CLASS__, 'can_list' ),
					__( 'List products with their 3D status', 'ar-vr-3d-model-try-on' ),
					__( 'Products, posts and pages AtlasAR is on for, newest change first, with their 3D model (name, size, iPhone file), try-on type and edit link. The total count is in the X-WP-Total header.', 'ar-vr-3d-model-try-on' ),
					array(
						'search'   => self::arg( 'string', 'Only items whose title contains this text.', array( 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ) ),
						'filter'   => self::arg( 'string', 'all; with = shows a 3D model; without = no 3D model yet; tryon = glasses or cap try-on is on.', array( 'default' => 'all', 'enum' => array( 'all', 'with', 'without', 'tryon' ) ) ),
						'page'     => self::arg( 'integer', 'Page of results (1 = first).', array( 'default' => 1, 'minimum' => 1, 'sanitize_callback' => 'absint' ) ),
						'per_page' => self::arg( 'integer', 'Items per page (1–100).', array( 'default' => 20, 'minimum' => 1, 'maximum' => 100, 'sanitize_callback' => 'absint' ) ),
					),
				),
			),
			'/items/(?P<id>\d+)' => array(
				array( 'GET', 'get_item', array( __CLASS__, 'can_edit_item' ), __( 'Get a product’s 3D settings', 'ar-vr-3d-model-try-on' ), __( 'A product’s AtlasAR data (its 3D model, placement, AR and try-on settings) and the full 3D Library model it shows.', 'ar-vr-3d-model-try-on' ), $id ),
				array(
					'POST', 'save_item', array( __CLASS__, 'can_edit_item' ),
					__( 'Change a product’s 3D settings', 'ar-vr-3d-model-try-on' ),
					__( 'Saves a product’s AtlasAR fields; fields not given keep their value. To change its 3D model use POST /products/<id>/model.', 'ar-vr-3d-model-try-on' ),
					$id + array( 'data' => self::arg( 'object', 'Fields: use_site (bool, use the site look), background (#hex), placement (site|gallery|gallery3d|button|tab|slide), ar_placement (floor|wall), ar_scale (auto = shoppers can resize | fixed), tryon ("" | glasses | hat), tryon_viewer (bool, also show the 3D view on a try-on product).', array( 'required' => true ) ) ),
				),
			),
			'/cloud'             => array(
				array(
					'GET', 'cloud_status', $admin,
					__( 'AtlasAR Cloud status', 'ar-vr-3d-model-try-on' ),
					__( 'Whether AtlasAR Cloud is available and connected, the key prefix (never the key), plan, approval and this month’s usage.', 'ar-vr-3d-model-try-on' ),
					array( 'fresh' => self::arg( 'boolean', 'Ask the service now instead of the 10-minute cache.', array( 'default' => false ) ) ),
				),
				array( 'DELETE', 'cloud_disconnect', $admin, __( 'Disconnect AtlasAR Cloud', 'ar-vr-3d-model-try-on' ), __( 'Forgets the AtlasAR Cloud key on this site. The account and its hosted models stay on AtlasAR Cloud.', 'ar-vr-3d-model-try-on' ) ),
			),
			'/cloud/connect'     => array(
				array(
					'POST', 'cloud_connect', $admin,
					__( 'Connect AtlasAR Cloud (free account)', 'ar-vr-3d-model-try-on' ),
					__( 'Makes a free AtlasAR Cloud account for this site, or adds the site to the account of that email (then the owner approves it by email). Sends the site address and the email to AtlasAR Cloud.', 'ar-vr-3d-model-try-on' ),
					array(
						'email'   => self::arg( 'string', 'The email for the AtlasAR Cloud account.', array( 'required' => true, 'format' => 'email', 'sanitize_callback' => 'sanitize_email' ) ),
						'consent' => self::arg( 'boolean', 'Must be true: the site owner agrees that a model is sent to AtlasAR Cloud only when asked, and accepts its terms and privacy policy.', array( 'required' => true ) ),
						'news'    => self::arg( 'boolean', 'Optional, separate opt-in: email tips, new features and offers about AtlasAR (a new account only; unsubscribe any time). Default false.', array( 'default' => false ) ),
					),
				),
			),
			// Public on purpose: AtlasAR Cloud's events are signed (HMAC with this site's secret) and checked in the callback.
			'/cloud/webhook'     => array(
				array(
					'POST', 'cloud_webhook', '__return_true',
					__( 'AtlasAR Cloud event (webhook)', 'ar-vr-3d-model-try-on' ),
					__( 'Called by AtlasAR Cloud, not by people: model.ready / model.failed for this site, signed with the site’s webhook secret (AtlasAR-Signature: t=…,v1=HMAC-SHA256 of "<t>.<body>"). A finished "Optimise on AtlasAR Cloud" model is then stored at once. Unsigned or old requests get 401.', 'ar-vr-3d-model-try-on' ),
				),
			),
			'/cloud/takeover'    => array(
				array(
					'POST', 'cloud_takeover', $admin,
					__( 'Move this site to another AtlasAR Cloud email', 'ar-vr-3d-model-try-on' ),
					__( 'For a site already registered with another email (a former owner, an old address): proves this site is yours (AtlasAR Cloud reads a one-time code from the site’s public address), then moves it to this email. The old key stops working, the old owner is told; the new key may wait for approval when the email already has an account. The site must be public.', 'ar-vr-3d-model-try-on' ),
					array(
						'email'   => self::arg( 'string', 'The email the site moves to.', array( 'required' => true, 'format' => 'email', 'sanitize_callback' => 'sanitize_email' ) ),
						'consent' => self::arg( 'boolean', 'Must be true (as for connect).', array( 'required' => true ) ),
					),
				),
			),
			'/cloud/key'         => array(
				array(
					'POST', 'cloud_key', $admin,
					__( 'Use an AtlasAR Cloud key', 'ar-vr-3d-model-try-on' ),
					__( 'Uses a key made in the AtlasAR Cloud dashboard; it is checked with the service before it is kept.', 'ar-vr-3d-model-try-on' ),
					array( 'key' => self::arg( 'string', 'The key (ar_live_…).', array( 'required' => true ) ) ),
				),
			),
			'/check'             => array(
				array( 'GET', 'site_check', $admin, __( 'Check the site for AtlasAR', 'ar-vr-3d-model-try-on' ), __( 'A quick check of what AtlasAR needs: HTTPS, writable uploads, WooCommerce, PHP version, a product with 3D, upload size limit. Each item: ok and a sentence.', 'ar-vr-3d-model-try-on' ) ),
			),
			'/tracker'           => array(
				array( 'POST', 'tracker_download', $admin, __( 'Download the try-on files to this site', 'ar-vr-3d-model-try-on' ), __( 'Downloads the try-on’s face-tracking files (about 15 MB, MediaPipe) into the uploads folder and uses them instead of the public CDN.', 'ar-vr-3d-model-try-on' ) ),
				array( 'DELETE', 'tracker_remove', $admin, __( 'Remove the try-on files from this site', 'ar-vr-3d-model-try-on' ), __( 'Deletes the face-tracking files from the uploads folder; the try-on uses the public CDN again.', 'ar-vr-3d-model-try-on' ) ),
			),
		);
		foreach ( $routes as $path => $methods ) {
			$defs = array();
			foreach ( $methods as $m ) {
				$defs[] = array(
					'methods'             => $m[0],
					'callback'            => array( __CLASS__, $m[1] ),
					'permission_callback' => $m[2],
					'label'               => $m[3],
					'description'         => $m[4],
					'args'                => isset( $m[5] ) ? $m[5] : array(),
				);
			}
			register_rest_route( self::NS, $path, $defs );
		}
	}

	/** An argument: type, description and the rest. */
	private static function arg( $type, $description, array $more = array() ) {
		return array( 'type' => $type, 'description' => $description ) + $more;
	}

	/* ------------------------------------------------------------------ permissions */

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	public static function can_list() {
		return current_user_can( 'edit_posts' );
	}

	public static function can_edit_item( \WP_REST_Request $r ) {
		$id = (int) $r['id'];
		return $id && self::enabled_type( get_post_type( $id ) ) && current_user_can( 'edit_post', $id );
	}

	private static function enabled_type( $type ) {
		return $type && in_array( $type, (array) AR_TRY_ON_Settings::get( 'general.post_types', array( 'product' ) ), true );
	}

	/* ---------------------------------------------------------------------- config */

	/** Everything the dashboard and the wizard start from. */
	public static function boot() {
		$types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			if ( 'attachment' !== $type->name ) {
				$types[] = array( 'name' => $type->name, 'label' => $type->labels->name );
			}
		}
		$settings                         = AR_TRY_ON_Settings::all();
		$settings['general']['telemetry'] = self::tracking_allowed();
		$data                             = array(
			'settings'   => $settings,
			'schema'     => self::schema_for_js(),
			'cloud'      => AR_TRY_ON_Cloud::status(),
			'tracker'    => AR_TRY_ON_Tracker_Files::status(),
			'postTypes'  => $types,
			'woo'        => class_exists( 'WooCommerce' ),
			'counts'     => array(
				'models'   => (int) wp_count_posts( AR_TRY_ON_Library::POST_TYPE )->publish,
				'with3d'   => self::count_with_model(),
			),
			'version'    => defined( 'ATLAS_AR_VERSION' ) ? ATLAS_AR_VERSION : '',
			'brand'      => \AR_TRY_ON_Admin\AR_TRY_ON_Admin::brand(), // AR-138: "AtlasAR Pro" with Pro
			'demoModel'  => self::demo_model(),
		);

		/**
		 * Data the AtlasAR dashboard starts with (AtlasAR Pro adds its own part).
		 *
		 * @param array $data
		 */
		return (array) apply_filters( 'atlas_ar_admin_boot', $data );
	}

	public static function get_config() {
		return self::boot();
	}

	public static function save_config( \WP_REST_Request $r ) {
		$input = $r->get_param( 'settings' );
		$input = is_array( $input ) ? $input : array();
		if ( isset( $input['general']['telemetry'] ) ) {
			self::set_tracking( rest_sanitize_boolean( $input['general']['telemetry'] ) );
		}
		$saved                         = AR_TRY_ON_Settings::update( $input );
		$saved['general']['telemetry'] = self::tracking_allowed();
		return array( 'settings' => $saved );
	}

	/** The usage-data opt-in is the AtlasAiDev library's own (one switch, the one it reads). */
	private static function tracking_allowed() {
		$lib = \AR_TRY_ON\AR_TRY_ON_Lib_AtlasAiDev::instance();
		try {
			return (bool) $lib->is_tracking_allowed();
		} catch ( \Throwable $e ) {
			return false;
		}
	}

	private static function set_tracking( $on ) {
		if ( $on === self::tracking_allowed() ) {
			return;
		}
		$lib = \AR_TRY_ON\AR_TRY_ON_Lib_AtlasAiDev::instance();
		try {
			if ( $on ) {
				$lib->trackerOptIn();
			} else {
				$lib->trackerOptOut();
			}
		} catch ( \Throwable $e ) {
			return;
		}
	}

	public static function reset_config() {
		$wizard = AR_TRY_ON_Settings::get( 'general.wizard_done' );
		AR_TRY_ON_Settings::reset();
		AR_TRY_ON_Settings::update( array( 'general' => array( 'wizard_done' => (bool) $wizard ) ) );
		return array( 'settings' => AR_TRY_ON_Settings::all() );
	}

	/** Field options the screens need (enum choices, number ranges). */
	private static function schema_for_js() {
		$out = array();
		foreach ( AR_TRY_ON_Settings::schema() as $group => $fields ) {
			foreach ( (array) $fields as $key => $f ) {
				$out[ $group ][ $key ] = array_intersect_key( $f, array_flip( array( 'type', 'options', 'min', 'max', 'default' ) ) );
			}
		}
		return $out;
	}

	/* ----------------------------------------------------------------------- items */

	/**
	 * @param \WP_REST_Request $r
	 * @param bool             $check_user only posts the current user may edit (false: WP-CLI)
	 */
	public static function list_items( \WP_REST_Request $r, $check_user = true ) {
		$types = array_values( array_filter( (array) AR_TRY_ON_Settings::get( 'general.post_types', array( 'product' ) ), 'post_type_exists' ) );
		if ( ! $types ) {
			return rest_ensure_response( array() );
		}
		$args = array(
			'post_type'      => $types,
			'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
			's'              => $r['search'],
			'posts_per_page' => $r['per_page'],
			'paged'          => $r['page'],
			'orderby'        => 'modified',
			'order'          => 'DESC',
		);
		// phpcs:disable WordPress.DB.SlowDBQuery.slow_query_meta_query -- the dashboard's product list only.
		if ( 'with' === $r['filter'] ) {
			$args['meta_query'] = array( array( 'key' => AR_TRY_ON_Library::PRODUCT_KEY, 'compare' => 'EXISTS' ) );
		} elseif ( 'without' === $r['filter'] ) {
			$args['meta_query'] = array( array( 'key' => AR_TRY_ON_Library::PRODUCT_KEY, 'compare' => 'NOT EXISTS' ) );
		} elseif ( 'tryon' === $r['filter'] ) {
			$args['meta_query'] = array( array( 'key' => AR_TRY_ON_Product::META, 'value' => '"tryon";s:[1-9]', 'compare' => 'REGEXP' ) );
		}
		// phpcs:enable
		$q   = new \WP_Query( $args );
		$out = array();
		foreach ( $q->posts as $post ) {
			if ( $check_user && ! current_user_can( 'edit_post', $post->ID ) ) {
				continue;
			}
			$data  = AR_TRY_ON_Product::get( $post->ID );
			$model = $data['model_id'] ? AR_TRY_ON_Library::get( $data['model_id'] ) : null;
			$out[] = array(
				'id'       => (int) $post->ID,
				'title'    => get_the_title( $post ),
				'type'     => $post->post_type,
				'status'   => $post->post_status,
				'edit_url' => get_edit_post_link( $post->ID, 'raw' ),
				'view_url' => 'publish' === $post->post_status ? get_permalink( $post->ID ) : get_preview_post_link( $post ), // AR-148
				'thumb'    => (string) get_the_post_thumbnail_url( $post->ID, 'thumbnail' ),
				'tryon'    => $data['tryon'],
				'model'    => $model ? array(
					'id'      => $model['id'],
					'name'    => $model['name'],
					'size'    => isset( $model['files']['glb'] ) ? $model['files']['glb']['size'] : 0,
					'file'    => isset( $model['files']['glb'] ) ? $model['files']['glb']['name'] : '',
					'usdz'    => isset( $model['files']['usdz'] ),
					'poster'  => isset( $model['files']['poster'] ) ? $model['files']['poster']['url'] : '',
					'large'   => $model['large'],
				) : null,
			);
		}
		$res = rest_ensure_response( $out );
		$res->header( 'X-WP-Total', (string) $q->found_posts );
		$res->header( 'X-WP-TotalPages', (string) $q->max_num_pages );
		return $res;
	}

	public static function get_item( \WP_REST_Request $r ) {
		return self::item( (int) $r['id'] );
	}

	public static function save_item( \WP_REST_Request $r ) {
		$data = $r->get_param( 'data' );
		AR_TRY_ON_Product::update( (int) $r['id'], is_array( $data ) ? $data : array() );
		return self::item( (int) $r['id'] );
	}

	/** A product's AtlasAR data and its model (also printed into the product panel). */
	public static function item( $id ) {
		$data = AR_TRY_ON_Product::get( $id );
		return array(
			'id'    => (int) $id,
			'title' => get_the_title( $id ),
			'thumb' => (string) get_the_post_thumbnail_url( $id, 'large' ),
			'data'  => $data,
			'model' => $data['model_id'] ? AR_TRY_ON_Library::get( $data['model_id'] ) : null,
		);
	}

	/* ----------------------------------------------------------------------- cloud */

	public static function cloud_status( \WP_REST_Request $r ) {
		return AR_TRY_ON_Cloud::status( (bool) $r->get_param( 'fresh' ) );
	}

	public static function cloud_connect( \WP_REST_Request $r ) {
		if ( true !== $r['consent'] ) {
			return new \WP_Error( 'atlas_ar_consent', __( 'Please tick the box to agree first.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		return self::cloud_answer( AR_TRY_ON_Cloud::register( $r['email'], true === $r['news'] ) );
	}

	public static function cloud_takeover( \WP_REST_Request $r ) {
		if ( true !== $r['consent'] ) {
			return new \WP_Error( 'atlas_ar_consent', __( 'Please tick the box to agree first.', 'ar-vr-3d-model-try-on' ), array( 'status' => 400 ) );
		}
		return self::cloud_answer( AR_TRY_ON_Cloud::take_over( $r['email'] ) );
	}

	/** AR-134: AtlasAR Cloud's signed events (checked in AR_TRY_ON_Cloud::receive()). */
	public static function cloud_webhook( \WP_REST_Request $r ) {
		return AR_TRY_ON_Cloud::receive( $r );
	}

	public static function cloud_key( \WP_REST_Request $r ) {
		return self::cloud_answer( AR_TRY_ON_Cloud::use_key( (string) $r['key'] ) );
	}

	public static function cloud_disconnect() {
		return AR_TRY_ON_Cloud::disconnect();
	}

	private static function cloud_answer( $res ) {
		if ( is_wp_error( $res ) ) {
			// owner_hint + takeover (project_exists) let the screen offer to move the site.
			$data = (array) $res->get_error_data();
			return new \WP_Error( $res->get_error_code(), $res->get_error_message(), array( 'status' => 400 ) + array_intersect_key( $data, array( 'owner_hint' => 1, 'takeover' => 1 ) ) );
		}
		return $res;
	}

	/* ------------------------------------------------------------------- try-on files */

	public static function tracker_download() {
		$res = AR_TRY_ON_Tracker_Files::download();
		if ( is_wp_error( $res ) ) {
			return new \WP_Error( $res->get_error_code(), $res->get_error_message(), array( 'status' => 502 ) );
		}
		AR_TRY_ON_Settings::update( array( 'tryon' => array( 'tracker' => 'self' ) ) );
		return array( 'tracker' => $res, 'settings' => AR_TRY_ON_Settings::all() );
	}

	public static function tracker_remove() {
		AR_TRY_ON_Settings::update( array( 'tryon' => array( 'tracker' => 'cdn' ) ) );
		return array( 'tracker' => AR_TRY_ON_Tracker_Files::remove(), 'settings' => AR_TRY_ON_Settings::all() );
	}

	/* ----------------------------------------------------------------------- check */

	/** A quick check of the things AtlasAR needs; each: ok, text. */
	public static function site_check() {
		$up     = wp_upload_dir( null, false );
		$checks = array(
			array( is_ssl() || 0 === strpos( home_url(), 'https://' ), __( 'The site uses HTTPS (AR and the camera need it).', 'ar-vr-3d-model-try-on' ), __( 'The site does not use HTTPS: AR and try-on need it on phones.', 'ar-vr-3d-model-try-on' ) ),
			array( wp_is_writable( $up['basedir'] ), __( 'The uploads folder can be written (the 3D Library keeps files there).', 'ar-vr-3d-model-try-on' ), __( 'The uploads folder cannot be written: models cannot be added.', 'ar-vr-3d-model-try-on' ) ),
			array( class_exists( 'WooCommerce' ), __( 'WooCommerce is active: 3D views show on product pages.', 'ar-vr-3d-model-try-on' ), __( 'WooCommerce is not active: use the block or the shortcode on posts and pages.', 'ar-vr-3d-model-try-on' ) ),
			array( version_compare( PHP_VERSION, '7.4', '>=' ), sprintf( /* translators: %s: PHP version */ __( 'PHP %s', 'ar-vr-3d-model-try-on' ), PHP_VERSION ), __( 'PHP is older than 7.4.', 'ar-vr-3d-model-try-on' ) ),
			array( self::count_with_model() > 0, __( 'At least one product shows a 3D model.', 'ar-vr-3d-model-try-on' ), __( 'No product shows a 3D model yet.', 'ar-vr-3d-model-try-on' ) ),
			array( wp_max_upload_size() >= 16 * MB_IN_BYTES, sprintf( /* translators: %s: size */ __( 'Files up to %s can be uploaded.', 'ar-vr-3d-model-try-on' ), size_format( wp_max_upload_size() ) ), sprintf( /* translators: %s: size */ __( 'Only files up to %s can be uploaded; many 3D models are bigger. Ask your host to raise upload_max_filesize.', 'ar-vr-3d-model-try-on' ), size_format( wp_max_upload_size() ) ) ),
		);
		return array_map(
			function ( $c ) {
				return array( 'ok' => (bool) $c[0], 'text' => $c[0] ? $c[1] : $c[2] );
			},
			$checks
		);
	}

	private static function count_with_model() {
		$q = new \WP_Query(
			array(
				'post_type'      => 'any',
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => AR_TRY_ON_Library::PRODUCT_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key -- dashboard count.
			)
		);
		return (int) $q->found_posts;
	}

	/** A model for the Appearance preview: the newest library model, else the bundled demo box. */
	private static function demo_model() {
		$ids = get_posts( array( 'post_type' => AR_TRY_ON_Library::POST_TYPE, 'posts_per_page' => 5, 'fields' => 'ids' ) );
		foreach ( $ids as $id ) {
			$m = AR_TRY_ON_Library::get( $id );
			if ( $m && ! empty( $m['files']['glb'] ) ) {
				return array( 'src' => $m['files']['glb']['url'], 'poster' => isset( $m['files']['poster'] ) ? $m['files']['poster']['url'] : '', 'name' => $m['name'] );
			}
		}
		return array( 'src' => ATLAS_AR_PLUGIN_URL . 'admin/images/atlas-ar-demo.glb', 'poster' => '', 'name' => __( 'Demo box', 'ar-vr-3d-model-try-on' ) );
	}
}
