/**
 * Try-On bootstrap. Lightweight click handler — defers all heavy work
 * (webcam, MediaPipe, worker) until the user actually presses the
 * existing AR button on a face-* product.
 *
 * Backward-compat: this script is enqueued ONLY on product pages whose
 * `ar_placement` is `face-glasses` or `face-hat`. We bind to the existing
 * `.ar_vr_3d_model_try_on` button (no new button is rendered). On face-*
 * we also rewrite the button label to the configured Try-On label.
 *
 * For non-face products this script is never loaded, so the existing
 * AtlasAR click flow is untouched.
 */

(() => {
	'use strict';

	// Set webpack public path so dynamic chunks (controller + worker) load
	// from the plugin's URL, regardless of the WP install's base path.
	if ( typeof window !== 'undefined' && window.atlas_ar_tryon && window.atlas_ar_tryon.plugin_url ) {
		// eslint-disable-next-line no-undef, camelcase
		__webpack_public_path__ = window.atlas_ar_tryon.plugin_url;
	}

	const cfg = ( typeof window !== 'undefined' && window.atlas_ar_tryon ) || {};
	const TRY_ON_LABEL = cfg.button_label || 'Try it on';

	let activeSession = null;

	function isTryOnButton( el ) {
		if ( ! el || ! el.dataset ) return false;
		const mode = el.dataset.mode || '';
		return mode.indexOf( 'face-' ) === 0;
	}

	function rewriteLabel( btn ) {
		if ( ! btn || btn.dataset.tryonLabelApplied === '1' ) return;
		// Preserve any pre-existing inner HTML structure if present (icons etc.).
		// For the default plain-text "View in AR" we simply replace.
		const trimmed = ( btn.textContent || '' ).trim();
		if ( trimmed === '' || /view\s+in\s+ar/i.test( trimmed ) ) {
			btn.textContent = TRY_ON_LABEL;
		}
		btn.dataset.tryonLabelApplied = '1';
	}

	function rewriteAllLabels() {
		document.querySelectorAll( '.ar_vr_3d_model_try_on' ).forEach( ( btn ) => {
			if ( isTryOnButton( btn ) ) rewriteLabel( btn );
		} );
	}

	async function handleClick( evt ) {
		const btn = evt.target.closest( '.ar_vr_3d_model_try_on' );
		if ( ! btn || ! isTryOnButton( btn ) ) return;
		// Intercept BEFORE AtlasAR's own click handler runs.
		evt.preventDefault();
		evt.stopPropagation();

		if ( activeSession ) return;

		const productId = btn.dataset.productId || btn.getAttribute( 'product-id' ) || '0';
		const mode = btn.dataset.mode || 'face-glasses';
		const glbSrc = btn.dataset.glbSrc || '';

		btn.disabled = true;
		btn.dataset.loading = '1';

		try {
			const mod = await import( /* webpackChunkName: "tryon-controller" */ './tryon-controller.js' );
			activeSession = await mod.startTryOn( {
				productId,
				mode,
				glbSrc,
				config: cfg,
				onClose: () => {
					activeSession = null;
				},
			} );
		} catch ( err ) {
			console.error( '[AtlasAR] Try-On failed to start:', err );
			activeSession = null;
		} finally {
			btn.disabled = false;
			delete btn.dataset.loading;
		}
	}

	// Intercept clicks BEFORE AtlasAR's listener (which uses bubbling phase).
	document.addEventListener( 'click', handleClick, true );

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', rewriteAllLabels, { once: true } );
	} else {
		rewriteAllLabels();
	}
})();
