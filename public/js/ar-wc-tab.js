/**
 * WooCommerce "3D View" product-tab viewer.
 *
 * Previously an inline <script type="module"> emitted by
 * AR_TRY_ON_Public::atlas_ar_button_tab(). Moved to this enqueued file so the
 * tab markup is plain HTML (wp.org reviewer item: drop inline scripts /
 * phcs:ignore escapes).
 *
 * The tab panel renders an empty container:
 *
 *     <div class="atlas-ar-wc-tab-viewer" id="atlas_ar_<post_id>"
 *          data-atlas-product-id="<post_id>"></div>
 *
 * When the "3D View" tab is clicked this injects the AtlasAR model-viewer
 * skeleton and fetches the model — lazily, so the model only loads once the
 * shopper opens the tab.
 */
( function () {
	'use strict';

	function init() {
		var container = document.querySelector( '.atlas-ar-wc-tab-viewer[data-atlas-product-id]' );
		if ( ! container || ! window.AtlasAR ) {
			return;
		}

		var tab = document.getElementById( 'tab-title-atlas_ar_3d_view' );
		if ( ! tab ) {
			return;
		}

		var productId = container.getAttribute( 'data-atlas-product-id' );
		var atlasAR = new window.AtlasAR();
		var skeletonId = 'model_viewer_' + productId;
		var htmlContent = atlasAR.getModelSkeleton( skeletonId );
		var modelLoaded = false;

		tab.addEventListener( 'click', function () {
			if ( ! modelLoaded ) {
				container.innerHTML = '<h1>3D File Is Loading</h1>';
			}
			setTimeout( function () {
				if ( tab.classList.contains( 'active' ) && container && ! modelLoaded ) {
					container.innerHTML = htmlContent; // Insert model-viewer HTML
					atlasAR.fetchModelData( productId, '#' + skeletonId );
				}
			}, 500 );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
