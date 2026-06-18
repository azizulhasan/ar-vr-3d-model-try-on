/**
 * Try-On overlay button placement (toggle-mode / overlay-only products).
 *
 * Previously an inline <script> emitted by
 * AR_TRY_ON_Tryon::render_button_overlay(). Moved to this enqueued file so no
 * inline script ships in the page body.
 *
 * The per-product button lives in a <template id="atlas_ar-tryon-overlay-source">
 * (rendered by PHP with per-attribute escaping). This script clones it into the
 * WooCommerce gallery image container, reusing the cube toggle's container when
 * present so the Try-On button sits beside the cube. No PHP-injected values —
 * the template carries all per-product data.
 */
( function () {
	'use strict';

	function place() {
		var img = document.querySelector( '.woocommerce-product-gallery__image' );
		if ( ! img || img.dataset.atlasArTryonOverlayPlaced === '1' ) {
			return;
		}
		var tpl = document.getElementById( 'atlas_ar-tryon-overlay-source' );
		if ( ! tpl || ! tpl.content ) {
			return;
		}
		if ( getComputedStyle( img ).position === 'static' ) {
			img.style.position = 'relative';
		}
		// Reuse the cube's existing container if it's already there
		// (cube toggle script adds .atlas-ar-toggle-container) — that way the
		// Try-On button sits visually adjacent to the cube.
		var container = img.querySelector( '.atlas-ar-toggle-container' );
		if ( ! container ) {
			container = document.createElement( 'div' );
			container.className = 'atlas-ar-toggle-container';
			img.appendChild( container );
		}
		var btn = tpl.content.firstElementChild.cloneNode( true );
		container.appendChild( btn );
		img.dataset.atlasArTryonOverlayPlaced = '1';
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', place );
	} else {
		place();
	}
	// Cube toggle JS may run later (it also targets the same gallery element).
	// Re-run after a short delay so we land beside it.
	setTimeout( place, 250 );
	setTimeout( place, 1000 );
} )();
