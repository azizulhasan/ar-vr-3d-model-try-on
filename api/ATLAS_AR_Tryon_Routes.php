<?php

namespace ATLAS_AR_API;

/**
 * REST routes for the virtual try-on feature.
 *
 * Namespace: ar_try_on/v1
 *  POST /tryon/glb-anatomy/{id} — persist runtime-computed GLB anatomy
 *                                  to product post-meta (admin only).
 *
 * The snapshot endpoint was removed in v1.9.3 — snapshots are now
 * generated entirely client-side and downloaded directly to the
 * customer's device. No PNG ever lands on the merchant's server.
 *
 * Settings + config are read/written via the existing `/settings` route
 * (shared `ar_try_on_settings` option) and delivered to JS through
 * `wp_localize_script`. There is no separate `/tryon/config` or
 * `/tryon/settings` route — single source of truth.
 *
 * @package ATLAS_AR
 */
class ATLAS_AR_Tryon_Routes {

	protected $namespace = 'ar_try_on/v1';

	public function register_routes() {
		// Snapshot REST endpoint and `atlas_ar_tryon_session_recorded`
		// action were removed in v1.9.3 — snapshots are now generated
		// entirely client-side and downloaded directly to the customer's
		// device. No PNG ever lands on the merchant's server, no
		// uploads/ row, no third-party data collection from the
		// customer's webcam frame. Privacy-by-default.

		register_rest_route(
			$this->namespace,
			'/tryon/glb-anatomy/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'save_glb_anatomy' ),
				'permission_callback' => array( $this, 'can_edit_post' ),
				'args'                => array(
					'id' => array(
						'validate_callback' => function( $v ) { return is_numeric( $v ); },
					),
				),
			)
		);
	}

	/**
	 * Admin-only gate for the GLB-anatomy cache write. Non-admin visitors
	 * compute anatomy in their session but never persist — that prevents
	 * an attacker from feeding bogus geometry that would mis-place every
	 * future customer's accessory.
	 */
	public function can_edit_post( $request ) {
		$id = absint( $request['id'] );
		return $id > 0 && current_user_can( 'edit_post', $id );
	}

	/**
	 * Persist runtime-computed GLB anatomy into the existing
	 * `ar_try_on_product_settings` post-meta so every subsequent visitor
	 * reads the values directly from PHP localization (no compute).
	 *
	 * Body: { anatomy: { version, bbox_min, bbox_max, silhouette_w, ... } }
	 */
	public function save_glb_anatomy( $request ) {
		$post_id = absint( $request['id'] );
		if ( $post_id <= 0 ) {
			return new \WP_Error( 'invalid_id', 'Bad post id', array( 'status' => 400 ) );
		}
		$anatomy = $request->get_param( 'anatomy' );
		if ( ! is_array( $anatomy ) ) {
			return new \WP_Error( 'invalid_anatomy', 'Anatomy payload missing', array( 'status' => 400 ) );
		}

		// Sanitize: only allow scalars / numeric arrays we expect, drop
		// anything else so a tampered payload can't inject HTML / objects.
		$clean = $this->sanitize_anatomy( $anatomy );
		if ( empty( $clean ) ) {
			return new \WP_Error( 'invalid_anatomy', 'Anatomy schema rejected', array( 'status' => 400 ) );
		}
		$clean['computed_at'] = time();

		$settings = get_post_meta( $post_id, 'ar_try_on_product_settings', true );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}
		$settings['glb_anatomy'] = $clean;
		update_post_meta( $post_id, 'ar_try_on_product_settings', $settings );

		return rest_ensure_response( array(
			'status'  => true,
			'anatomy' => $clean,
		) );
	}

	/**
	 * Schema-driven sanitizer. Numeric scalars + nested numeric arrays
	 * only; everything else is dropped.
	 */
	protected function sanitize_anatomy( $a ) {
		$clean = array();
		if ( isset( $a['version'] ) )      $clean['version']      = (int) $a['version'];
		if ( isset( $a['computed_by'] ) )  $clean['computed_by']  = sanitize_text_field( $a['computed_by'] );
		foreach ( array( 'bbox_min', 'bbox_max' ) as $k ) {
			if ( isset( $a[ $k ] ) && is_array( $a[ $k ] ) ) {
				$clean[ $k ] = array_values( array_map( 'floatval', array_slice( $a[ $k ], 0, 3 ) ) );
			}
		}
		foreach ( array( 'silhouette_w', 'silhouette_h' ) as $k ) {
			if ( isset( $a[ $k ] ) && is_numeric( $a[ $k ] ) ) {
				$clean[ $k ] = (float) $a[ $k ];
			}
		}
		if ( isset( $a['hat'] ) && is_array( $a['hat'] ) ) {
			$h = array();
			foreach ( array( 'crown_opening_y', 'brim_depth_z', 'inner_radius' ) as $k ) {
				if ( isset( $a['hat'][ $k ] ) && is_numeric( $a['hat'][ $k ] ) ) {
					$h[ $k ] = (float) $a['hat'][ $k ];
				}
			}
			if ( ! empty( $h ) ) $clean['hat'] = $h;
		}
		if ( isset( $a['glasses'] ) && is_array( $a['glasses'] ) ) {
			$g = array();
			if ( isset( $a['glasses']['lens_center'] ) && is_array( $a['glasses']['lens_center'] ) ) {
				$g['lens_center'] = array_values( array_map( 'floatval', array_slice( $a['glasses']['lens_center'], 0, 3 ) ) );
			}
			foreach ( array( 'temple_span_x', 'bridge_z' ) as $k ) {
				if ( isset( $a['glasses'][ $k ] ) && is_numeric( $a['glasses'][ $k ] ) ) {
					$g[ $k ] = (float) $a['glasses'][ $k ];
				}
			}
			if ( ! empty( $g ) ) $clean['glasses'] = $g;
		}
		return $clean;
	}

}
