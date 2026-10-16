<?php
/**
 * AR-116: the shop-page viewer — site settings + product data + its 3D Library model, turned into
 * the AtlasAR viewer SDK's options and printed as an `<atlasar-viewer>` element.
 *
 * Options go into the element's attributes (the SDK reads them), so the page needs no extra
 * request per viewer and a copy of the element (a gallery slider cloning slides) still works.
 * AtlasAR Pro adds its data (hotspots, sizes, variations, several models, try-on fit) with the
 * `atlas_ar_viewer_options` filter.
 *
 * @package AR_TRY_ON
 */

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace (see AR-66).

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AR_TRY_ON_Viewer {

	/** MediaPipe version the SDK's face tracker is built for (the files must match it). */
	const MEDIAPIPE = '0.10.35';

	/** Google's face model for MediaPipe (listed under External services in the readme). */
	const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

	/** @var bool a viewer or try-on button was printed on this page */
	private static $used = false;

	/** @return bool something on this page needs the SDK */
	public static function used() {
		return self::$used;
	}

	/**
	 * The SDK options for a post's 3D view.
	 *
	 * @param int    $post_id
	 * @param string $context gallery | popup | tab | inline | slide
	 * @return array|null null when the post has no 3D model
	 */
	public static function options( $post_id, $context = 'inline' ) {
		$product = AR_TRY_ON_Product::get( $post_id );
		$model   = $product['model_id'] ? AR_TRY_ON_Library::get( $product['model_id'] ) : null;
		if ( ! $model || empty( $model['files']['glb']['url'] ) ) {
			return null;
		}
		$look = AR_TRY_ON_Settings::get( 'look' );
		$opts = array(
			'src'             => $model['files']['glb']['url'],
			'iosSrc'          => isset( $model['files']['usdz']['url'] ) ? $model['files']['usdz']['url'] : '',
			'poster'          => isset( $model['files']['poster']['url'] ) ? $model['files']['poster']['url'] : '',
			'alt'             => get_the_title( $post_id ),
			'title'           => get_the_title( $post_id ),
			'background'      => $product['use_site'] ? $look['background'] : $product['background'],
			'environmentImage' => self::environment( $look ),
			'exposure'        => (float) $look['exposure'],
			'shadowIntensity' => (float) $look['shadow'],
			'autoRotate'      => (bool) $look['auto_rotate'],
			'disableZoom'     => ! $look['zoom'],
			'arButton'        => 'custom' === $look['ar_button'] ? 'custom' : 'default',
			'arButtonText'    => $look['ar_text'],
			'arButtonBackground' => $look['ar_color'],
			'arPlacement'     => $product['ar_placement'],
			'arScale'         => $product['ar_scale'],
			'qr'              => (bool) AR_TRY_ON_Settings::get( 'placement.qr' ),
			// Opened by a click (popup, tab, gallery) → load at once; else when scrolled into view.
			'load'            => in_array( $context, array( 'popup' ), true ) ? 'immediate' : ( 'click' === $look['load'] ? 'interaction' : 'visible' ),
			'display'         => 'popup' === $context ? 'popup' : 'inline',
			'width'           => '100%',
			'height'          => in_array( $context, array( 'gallery', 'slide' ), true ) ? '100%' : '420px',
			'viewerClass'     => 'atlas-ar-viewer-model',
		);

		/**
		 * Change or add viewer options (AtlasAR Pro adds hotspots, dimensions, items, variants).
		 *
		 * @param array  $opts    SDK options (camelCase)
		 * @param int    $post_id
		 * @param string $context gallery | popup | tab | inline | slide
		 */
		return (array) apply_filters( 'atlas_ar_viewer_options', $opts, (int) $post_id, $context );
	}

	/**
	 * The `<atlasar-viewer>` element for a post (empty string when it has no model).
	 *
	 * @param int    $post_id
	 * @param string $context
	 * @param array  $extra   more options (e.g. buttonLabel for a popup button)
	 * @return string HTML
	 */
	public static function render( $post_id, $context = 'inline', array $extra = array() ) {
		$opts = self::options( $post_id, $context );
		if ( ! $opts ) {
			return '';
		}
		self::$used = true;
		$opts       = array_merge( $opts, $extra );
		return '<atlasar-viewer class="atlas-ar-viewer atlas-ar-viewer--' . esc_attr( $context ) . '" data-atlas-ar-post="' . (int) $post_id . '"' . self::attributes( $opts ) . '></atlasar-viewer>';
	}

	/**
	 * The "Try it on" button for a try-on product (empty when try-on is off for it).
	 *
	 * @param int $post_id
	 * @return string HTML
	 */
	public static function tryon_button( $post_id ) {
		$product = AR_TRY_ON_Product::get( $post_id );
		$tryon   = AR_TRY_ON_Settings::get( 'tryon' );
		if ( ! $tryon['enabled'] || '' === $product['tryon'] ) {
			return '';
		}
		$model = $product['model_id'] ? AR_TRY_ON_Library::get( $product['model_id'] ) : null;
		if ( ! $model || empty( $model['files']['glb']['url'] ) ) {
			return '';
		}
		self::$used = true;
		$opts       = array(
			'src'               => $model['files']['glb']['url'],
			'tryon'             => $product['tryon'],
			'tryonLabel'        => $tryon['label'],
			'tryonConsent'      => $tryon['consent'],
			'tryonSnapshot'     => (bool) $tryon['snapshot'],
			'tryonSnapshotName' => sanitize_title( get_the_title( $post_id ) ),
			'tryonModels'       => self::tracker_files( $tryon['tracker'] ),
			'tryonAccent'       => AR_TRY_ON_Settings::get( 'look.ar_color' ),
		);

		/** @see atlas_ar_viewer_options — the same for the try-on (Pro adds the saved fit). */
		$opts = (array) apply_filters( 'atlas_ar_tryon_options', $opts, (int) $post_id );

		return sprintf(
			'<button type="button" class="button atlas-ar-tryon-button" data-atlas-ar-tryon="%1$s"><span class="atlas-ar-tryon-icon" aria-hidden="true"></span>%2$s</button>',
			esc_attr( wp_json_encode( $opts ) ),
			esc_html( $tryon['label'] )
		);
	}

	/**
	 * Where the face tracker files come from: the public CDN (default, listed under External
	 * services) or this site's uploads folder.
	 *
	 * @param string $source cdn | self
	 * @return array { face, wasmBase }
	 */
	public static function tracker_files( $source ) {
		// "From this site" only once the files are there; until then the CDN keeps try-on working.
		if ( 'self' === $source && AR_TRY_ON_Tracker_Files::present() ) {
			$up   = wp_upload_dir( null, false );
			$base = trailingslashit( $up['baseurl'] ) . AR_TRY_ON_Library::DIR . '/mediapipe/';
			return array( 'face' => $base . 'face_landmarker.task', 'wasmBase' => $base . 'wasm' );
		}
		return array(
			'face'     => self::FACE_MODEL_URL,
			'wasmBase' => 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' . self::MEDIAPIPE . '/wasm',
		);
	}

	/**
	 * Options as element attributes: camelCase → kebab-case; booleans "true"/"false"; arrays and
	 * objects as JSON. Every value is escaped.
	 *
	 * @param array $opts
	 * @return string ' name="value" …'
	 */
	public static function attributes( array $opts ) {
		$out = '';
		foreach ( $opts as $key => $value ) {
			if ( null === $value || '' === $value || array() === $value ) {
				continue;
			}
			$name = strtolower( preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', (string) $key ) );
			if ( ! preg_match( '/^[a-z][a-z0-9-]*$/', $name ) ) {
				continue;
			}
			if ( is_bool( $value ) ) {
				$value = $value ? 'true' : 'false';
			} elseif ( is_array( $value ) || is_object( $value ) ) {
				$value = wp_json_encode( $value );
			}
			$out .= ' ' . $name . '="' . esc_attr( (string) $value ) . '"';
		}
		return $out;
	}

	/**
	 * The HTML this class prints, for wp_kses(): the viewer element with the SDK's attributes, the
	 * try-on button and the wrappers around them.
	 *
	 * @return array
	 */
	public static function allowed_html() {
		$viewer = array( 'class' => true, 'data-atlas-ar-post' => true );
		foreach ( self::SDK_ATTRIBUTES as $name ) {
			$viewer[ $name ] = true;
		}
		/** Pro adds the attributes of its options (hotspots, dimensions, items, variants…). */
		$viewer = (array) apply_filters( 'atlas_ar_viewer_allowed_attributes', $viewer );
		$box    = array( 'class' => true, 'style' => true, 'hidden' => true, 'data-atlas-ar-start' => true, 'data-thumb' => true );
		return array(
			'atlasar-viewer' => $viewer,
			'div'            => $box,
			'span'           => array( 'class' => true, 'aria-hidden' => true ),
			'button'         => array( 'type' => true, 'class' => true, 'data-atlas-ar-tryon' => true ),
		);
	}

	/** Print HTML made by this class, through its allow-list. */
	public static function print_html( $html ) {
		echo wp_kses( (string) $html, self::allowed_html() );
	}

	/** Attributes of `<atlasar-viewer>` this plugin may print (the SDK's option names, kebab-case). */
	const SDK_ATTRIBUTES = array(
		'src', 'ios-src', 'poster', 'alt', 'title', 'background', 'environment-image', 'skybox-image', 'tone-mapping',
		'exposure', 'shadow-intensity', 'auto-rotate', 'camera-orbit', 'camera-controls', 'disable-zoom', 'disable-tap',
		'interaction-prompt', 'ar', 'ar-modes', 'ar-placement', 'ar-scale', 'xr-environment', 'ar-button',
		'ar-button-text', 'ar-button-background', 'ar-button-color', 'qr', 'qr-url', 'load', 'loading', 'reveal',
		'display', 'button-label', 'width', 'height', 'align', 'margin', 'padding', 'viewer-id', 'viewer-class',
		'hotspots', 'dimensions', 'items', 'variants', 'variant',
	);

	/** The SDK's environment image for the lighting setting. */
	private static function environment( array $look ) {
		if ( 'custom' === $look['lighting'] && $look['environment_url'] ) {
			return $look['environment_url'];
		}
		return 'bright' === $look['lighting'] ? 'legacy' : 'neutral';
	}
}
