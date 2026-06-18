/**
 * Inline `[atlas_ar]` shortcode model-viewer reveal.
 *
 * Previously emitted as an inline <script type="module"> inside the
 * shortcode markup built by AR_TRY_ON_Helper::create_shortcode(). Moved to
 * this enqueued file so the shortcode markup is plain HTML that can pass
 * through wp_kses() (the wp.org reviewer asked us to drop the phcs:ignore
 * escapes and not ship inline scripts).
 *
 * The shortcode now renders an empty placeholder:
 *
 *     <div class="atlas-ar-shortcode-reveal"
 *          id="atlas_ar_shortcode_<post_id>"
 *          data-atlas-product-id="<post_id>"></div>
 *
 * NOTE: the id is intentionally NOT `data-product-id` — AtlasAR.fetchModelData
 * queries `[data-product-id]` to find a loading-indicator button and would
 * overwrite this placeholder's contents, wiping the injected model-viewer.
 *
 * For each such placeholder this script injects the AtlasAR model-viewer
 * skeleton and kicks off the REST fetch — exactly what the old inline
 * module did, one element at a time.
 */
( function () {
	'use strict';

	function reveal( el ) {
		if ( ! window.AtlasAR ) {
			return;
		}
		var productId = el.getAttribute( 'data-atlas-product-id' );
		if ( ! productId ) {
			return;
		}
		// Guard against double-reveal if this runs more than once.
		if ( el.dataset.atlasArRevealed === '1' ) {
			return;
		}
		el.dataset.atlasArRevealed = '1';

		var atlasAR = new window.AtlasAR();
		var skeletonId = 'model_viewer_shortcode_' + productId;

		el.innerHTML = '<h1>3D File Is Loading</h1>';
		el.innerHTML = atlasAR.getModelSkeleton( skeletonId );

		atlasAR.fetchModelData( productId, '#' + skeletonId );
	}

	function run() {
		var nodes = document.querySelectorAll( '.atlas-ar-shortcode-reveal[data-atlas-product-id]' );
		for ( var i = 0; i < nodes.length; i++ ) {
			reveal( nodes[ i ] );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', run );
	} else {
		run();
	}
} )();
