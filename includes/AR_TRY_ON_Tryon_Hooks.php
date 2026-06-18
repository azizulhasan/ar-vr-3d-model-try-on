<?php

namespace AR_TRY_ON; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedNamespaceFound -- Stable internal namespace; renaming risks a Free/Pro update-window fatal (see plan/AR-66).

/**
 * Documentation-only registry of filter/action hooks the Free try-on layer
 * exposes to the Pro plugin and third-party addons.
 *
 * Pro Phase 2+ wires real implementations against these hook names. Free does
 * NOT call apply_filters() here — those calls live in {@see AR_TRY_ON_Tryon}
 * and the JS controller. This class is a single source of truth for hook
 * contracts so both plugins stay in sync.
 *
 * @package AR_TRY_ON
 */
class AR_TRY_ON_Tryon_Hooks {

	/**
	 * Filter — extend the list of available tracking modes.
	 *
	 * @param string[] $modes Default ['face'].
	 * @return string[]       Pro adds 'hand', 'pose', 'makeup'.
	 */
	const FILTER_MODES = 'atlas_ar_tryon_modes';

	/**
	 * Filter — register additional MediaPipe model URLs.
	 *
	 * @param array<string,string> $models { face: url, wasm_base: url, ... }
	 */
	const FILTER_MODELS = 'atlas_ar_tryon_models';

	/**
	 * Filter — per-product anchor calibration overrides.
	 *
	 * @param array $strategy
	 * @param int   $product_id
	 */
	const FILTER_ANCHOR_STRATEGY = 'atlas_ar_tryon_anchor_strategy';

	/**
	 * Action — runs in JS bootstrap before <model-viewer> hotspots are written.
	 * Pro injects calibration handles, blendshape overlays.
	 *
	 * @param int    $product_id
	 * @param string $mode
	 */
	const ACTION_PRE_RENDER = 'atlas_ar_tryon_pre_render';

	/**
	 * Action — after render. Pro adds analytics beacon, snapshot watermark.
	 *
	 * @param int    $product_id
	 * @param string $mode
	 */
	const ACTION_POST_RENDER = 'atlas_ar_tryon_post_render';

	/**
	 * Filter — map WC product → tracking mode based on category (Pro).
	 *
	 * @param string $mode
	 * @param int    $product_id
	 */
	const FILTER_WC_MODE = 'atlas_ar_tryon_woocommerce_mode_for_product';

	/**
	 * Filter — swap the default landmark→hotspot mapping pipeline.
	 *
	 * @param array $pipeline
	 * @param string $mode
	 */
	const FILTER_LANDMARK_PIPELINE = 'atlas_ar_tryon_landmark_pipeline';

	/**
	 * Filter — enable selfie segmentation overlay (Pro).
	 *
	 * @param bool $enabled
	 */
	const FILTER_SEGMENTATION = 'atlas_ar_tryon_segmentation_enabled';

	/**
	 * Filter — additional snapshot export formats (e.g. Pro adds GIF + watermark).
	 *
	 * @param string[] $formats
	 */
	const FILTER_EXPORT_FORMATS = 'atlas_ar_tryon_export_formats';

	/**
	 * Action — fired after a try-on session is recorded (Pro analytics).
	 *
	 * @param array $session_meta
	 */
	const ACTION_SESSION_RECORDED = 'atlas_ar_tryon_session_recorded';
}
