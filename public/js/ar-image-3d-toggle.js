/**
 * Product-gallery image ⇄ 3D toggle.
 *
 * Previously emitted as a large inline <script> by
 * AR_TRY_ON::add_image_3d_toggle_to_gallery(). Moved to this enqueued file so
 * no inline script ships in the page body (wp.org reviewer item: drop the
 * phcs:ignore escapes / inline scripts).
 *
 * Per-product config is read from the source container's data attributes:
 *
 *     <div id="atlas_ar-toggle-3d-container"
 *          data-atlas-product-id="<id>"
 *          data-atlas-display-mode="product_image|3d_viewer"> … </div>
 *
 * The 3D model-viewer skeleton inside that container is injected separately by
 * ar-shortcode-reveal.js (this script is enqueued with that as a dependency so
 * the reveal runs first, exactly as the two inline scripts used to order).
 */
( function () {
	'use strict';

	// SVG Icons
	var icon3D = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/></svg>';
	var iconImage = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
	var iconFullscreen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
	var iconClose = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

	function initToggle() {
		var viewer3DSource = document.getElementById( 'atlas_ar-toggle-3d-container' );
		var mainImageContainer = document.querySelector( '.woocommerce-product-gallery__image' );

		if ( ! mainImageContainer || ! viewer3DSource ) {
			return;
		}

		// Per-product config (set by the PHP container markup).
		var atlas_ar_product_id = viewer3DSource.getAttribute( 'data-atlas-product-id' ) || '';
		var atlas_ar_display_mode = viewer3DSource.getAttribute( 'data-atlas-display-mode' ) || 'product_image';

		// AR-67: when the model-load strategy is 'interaction' (global setting or
		// per-product metabox override, resolved in AR_TRY_ON_Helper and shared
		// via ar_try_on.model_load_strategy), never auto-show the 3D viewer in
		// the gallery. Default to the product image so the ~956 KB
		// google-model-viewer library loads only when the shopper clicks this
		// gallery's own "View in 3D" toggle (load3DModel runs on that click).
		// This reuses the gallery-native toggle button — which has a real event
		// listener and is not a flexslider clone — instead of any overlay.
		if ( typeof ar_try_on !== 'undefined' && ar_try_on && ar_try_on.model_load_strategy === 'interaction' ) {
			atlas_ar_display_mode = 'product_image';
		}

		// Get the actual image element inside
		var mainImage = mainImageContainer.querySelector( 'a, img' );

		if ( ! mainImage ) {
			return;
		}

		// Make the main image container position relative for overlay
		mainImageContainer.style.position = 'relative';

		// Create the 3D viewer container inside the main image container
		var viewer3DContainer = document.createElement( 'div' );
		viewer3DContainer.id = 'atlas_ar-3d-viewer-overlay';
		viewer3DContainer.className = 'atlas-ar-3d-viewer-overlay';
		viewer3DContainer.innerHTML = viewer3DSource.innerHTML;
		viewer3DContainer.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; background: #f5f5f5;';

		// Insert the 3D viewer container inside the main image container
		mainImageContainer.appendChild( viewer3DContainer );

		// Remove the source container from footer
		viewer3DSource.remove();

		// Create toggle button container
		var toggleContainer = document.createElement( 'div' );
		toggleContainer.className = 'atlas-ar-toggle-container';

		// Create fullscreen button (hidden initially, shown when 3D is active)
		var fullscreenBtn = document.createElement( 'button' );
		fullscreenBtn.type = 'button';
		fullscreenBtn.className = 'atlas-ar-toggle-btn atlas-ar-fullscreen-btn';
		fullscreenBtn.setAttribute( 'aria-label', 'View 3D model in fullscreen' );
		fullscreenBtn.innerHTML = iconFullscreen;
		fullscreenBtn.title = 'Fullscreen';
		fullscreenBtn.style.display = 'none'; // Hidden initially

		// Create toggle button
		var toggleBtn = document.createElement( 'button' );
		toggleBtn.type = 'button';
		toggleBtn.className = 'atlas-ar-toggle-btn';
		toggleBtn.setAttribute( 'aria-label', 'Toggle between product image and 3D viewer' );

		// Track current view state
		var currentView = atlas_ar_display_mode; // 'product_image' or '3d_viewer'
		var model3DLoaded = false;

		// Create fullscreen overlay container
		var fullscreenOverlay = document.createElement( 'div' );
		fullscreenOverlay.id = 'atlas_ar-fullscreen-overlay';
		fullscreenOverlay.className = 'atlas-ar-fullscreen-overlay';
		fullscreenOverlay.style.display = 'none';

		// Create close button for fullscreen
		var closeBtn = document.createElement( 'button' );
		closeBtn.type = 'button';
		closeBtn.className = 'atlas-ar-fullscreen-close-btn';
		closeBtn.setAttribute( 'aria-label', 'Close fullscreen' );
		closeBtn.innerHTML = iconClose;
		closeBtn.title = 'Close';

		// Create fullscreen 3D viewer container
		var fullscreen3DContainer = document.createElement( 'div' );
		fullscreen3DContainer.className = 'atlas-ar-fullscreen-viewer';

		fullscreenOverlay.appendChild( closeBtn );
		fullscreenOverlay.appendChild( fullscreen3DContainer );
		document.body.appendChild( fullscreenOverlay );

		// Set initial state based on display mode
		if ( currentView === '3d_viewer' ) {
			// Show 3D viewer first
			toggleBtn.innerHTML = iconImage;
			toggleBtn.title = 'View Product Image';
			mainImage.style.visibility = 'hidden';
			viewer3DContainer.style.display = 'block';
			fullscreenBtn.style.display = 'flex'; // Show fullscreen button
			load3DModel();
		} else {
			// Show product image first (default)
			toggleBtn.innerHTML = icon3D;
			toggleBtn.title = 'View in 3D';
			mainImage.style.visibility = 'visible';
			viewer3DContainer.style.display = 'none';
			fullscreenBtn.style.display = 'none'; // Hide fullscreen button
		}

		// Toggle click handler
		toggleBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			e.stopPropagation();

			if ( currentView === 'product_image' ) {
				// Switch to 3D viewer
				mainImage.style.visibility = 'hidden';
				viewer3DContainer.style.display = 'block';
				toggleBtn.innerHTML = iconImage;
				toggleBtn.title = 'View Product Image';
				fullscreenBtn.style.display = 'flex'; // Show fullscreen button
				currentView = '3d_viewer';

				if ( ! model3DLoaded ) {
					load3DModel();
				}
			} else {
				// Switch to product image
				mainImage.style.visibility = 'visible';
				viewer3DContainer.style.display = 'none';
				toggleBtn.innerHTML = icon3D;
				toggleBtn.title = 'View in 3D';
				fullscreenBtn.style.display = 'none'; // Hide fullscreen button
				currentView = 'product_image';
			}
		} );

		// Fullscreen click handler
		fullscreenBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
			openFullscreen();
		} );

		// Close fullscreen click handler
		closeBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			e.stopPropagation();
			closeFullscreen();
		} );

		// Close fullscreen on escape key
		document.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' && fullscreenOverlay.style.display === 'flex' ) {
				closeFullscreen();
			}
		} );

		// Add buttons to container (toggle on left, fullscreen on right - horizontal layout)
		toggleContainer.appendChild( toggleBtn );
		toggleContainer.appendChild( fullscreenBtn );

		// Append toggle button to the main image container (on top of featured image)
		mainImageContainer.appendChild( toggleContainer );

		function load3DModel() {
			if ( model3DLoaded ) return;

			var modelViewer = viewer3DContainer.querySelector( 'model-viewer' );
			if ( modelViewer && window.AtlasAR ) {
				// The <model-viewer> skeleton is pre-injected (hidden) at init,
				// so revealing it here adds no new node for the lazy loader's
				// MutationObserver to catch. Explicitly ask the loader to fetch
				// google-model-viewer.js now — this IS the user gesture in
				// 'interaction' mode, and it's idempotent in 'auto' mode (the
				// library may already be loading from the viewport observer).
				if ( typeof window.atlasARLoadModelViewer === 'function' ) {
					window.atlasARLoadModelViewer();
				}
				var atlasAR = new window.AtlasAR();
				var modelId = modelViewer.id ? '#' + modelViewer.id : '.atlas_ar_model_viewer';
				atlasAR.fetchModelData( atlas_ar_product_id, modelId, 'normal' );
				model3DLoaded = true;
			}
		}

		function openFullscreen() {
			// Clone the 3D viewer content into fullscreen container
			fullscreen3DContainer.innerHTML = viewer3DContainer.innerHTML;
			fullscreenOverlay.style.display = 'flex';
			document.body.style.overflow = 'hidden'; // Prevent scrolling

			// Load model in fullscreen viewer
			var fullscreenModelViewer = fullscreen3DContainer.querySelector( 'model-viewer' );
			if ( fullscreenModelViewer && window.AtlasAR ) {
				var atlasAR = new window.AtlasAR();
				var modelId = fullscreenModelViewer.id ? '#' + fullscreenModelViewer.id : '.atlas_ar_model_viewer';
				atlasAR.fetchModelData( atlas_ar_product_id, modelId, 'normal' );
			}
		}

		function closeFullscreen() {
			fullscreenOverlay.style.display = 'none';
			document.body.style.overflow = ''; // Restore scrolling
			fullscreen3DContainer.innerHTML = ''; // Clear content
		}
	}

	// Initialize when DOM is ready
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initToggle );
	} else {
		initToggle();
	}
} )();
