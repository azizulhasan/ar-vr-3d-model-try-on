/**
 * Try-On modal UI. Pure DOM, no React. Handles consent gate,
 * webcam preview, snapshot, error states, close.
 *
 * Returns a controller-friendly handle that the controller wires up.
 */

export function createUI( { config, productId } ) {
	const root = document.createElement( 'div' );
	root.className = 'art-tryon-modal';
	root.setAttribute( 'role', 'dialog' );
	root.setAttribute( 'aria-modal', 'true' );
	root.innerHTML = `
		<div class="art-tryon-backdrop" data-action="close"></div>
		<div class="art-tryon-panel">
			<button class="art-tryon-close" type="button" data-action="close" aria-label="Close try-on">&times;</button>
			<div class="art-tryon-stage">
				<video class="art-tryon-video" autoplay playsinline muted></video>
				<canvas class="art-tryon-canvas"></canvas>
				<div class="art-tryon-status" aria-live="polite">Loading…</div>
				<!--
					Snapshot is rendered as a floating shutter button OVERLAY
					on the canvas (iOS-camera-style) so it doesn't eat
					vertical real estate from the live feed on mobile.
					The SVG is a camera glyph + an outer ring; the inner
					black dot is the "shutter" affordance.
				-->
				<button
					type="button"
					class="art-tryon-snapshot"
					aria-label="Take snapshot"
					hidden
				>
					<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false">
						<circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="3"/>
						<circle cx="32" cy="32" r="18" fill="currentColor"/>
					</svg>
				</button>
				<span class="art-tryon-fps"></span>
			</div>
			<div class="art-tryon-consent">
				<button type="button" class="art-tryon-consent-allow">Allow camera access</button>
				<button type="button" class="art-tryon-consent-deny" data-action="close">Cancel</button>
			</div>
			<div class="art-tryon-toolbar" hidden></div>
			<div class="art-tryon-error" hidden></div>
		</div>
	`;

	const video = root.querySelector( '.art-tryon-video' );
	const canvas = root.querySelector( '.art-tryon-canvas' );
	const statusEl = root.querySelector( '.art-tryon-status' );
	const consentEl = root.querySelector( '.art-tryon-consent' );
	const toolbar = root.querySelector( '.art-tryon-toolbar' );
	const errorEl = root.querySelector( '.art-tryon-error' );
	const snapshotBtn = root.querySelector( '.art-tryon-snapshot' );
	const allowBtn = root.querySelector( '.art-tryon-consent-allow' );
	const fpsEl = root.querySelector( '.art-tryon-fps' );

	// Sample the active theme's actual primary-button color (e.g. the
	// WooCommerce "Add to cart" button) so the modal buttons match the
	// merchant's site instead of a guessed CSS variable. Reads the
	// computed background-color of the most-likely "primary action"
	// element on the page and exports it as a CSS custom property on
	// the modal root.
	(() => {
		try {
			const selectors = [
				'.single_add_to_cart_button',
				'.wc-block-components-button[disabled="false"]',
				'.wp-block-button__link',
				'button[type="submit"].button',
				'.button.alt',
				'.button',
			];
			let probe = null;
			for ( const sel of selectors ) {
				const el = document.querySelector( sel );
				if ( el ) { probe = el; break; }
			}
			if ( ! probe ) return;
			const cs = window.getComputedStyle( probe );
			const bg = cs.backgroundColor;
			const fg = cs.color;
			// Skip if the probe is transparent / unstyled.
			if ( bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' ) {
				root.style.setProperty( '--art-tryon-primary', bg );
			}
			if ( fg ) root.style.setProperty( '--art-tryon-primary-contrast', fg );
		} catch ( e ) { /* best-effort */ }
	})();

	let isOpen = true;
	let onCloseCb = null;
	let onSnapshotCb = null;
	let consentResolve = null;

	// --- Mobile chrome adjustments while the modal is open ---
	// 1. `viewport-fit=cover` makes `env(safe-area-inset-top/bottom)` actually
	//    return non-zero on Chrome / iOS Safari so the close button and
	//    snapshot toolbar don't disappear behind the address bar / nav bar.
	// 2. Body scroll lock prevents the page underneath from scrolling when
	//    the user pans inside the modal on Android Chrome.
	// Both are reverted in `close()` so the host page isn't permanently
	// altered after the customer dismisses Try-On.
	const previousBodyOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';
	let viewportMeta = document.querySelector( 'meta[name="viewport"]' );
	let createdViewportMeta = false;
	const previousViewportContent = viewportMeta ? viewportMeta.getAttribute( 'content' ) : null;
	if ( ! viewportMeta ) {
		viewportMeta = document.createElement( 'meta' );
		viewportMeta.setAttribute( 'name', 'viewport' );
		document.head.appendChild( viewportMeta );
		createdViewportMeta = true;
	}
	const ensureViewportFitCover = ( prev ) => {
		const base = prev || 'width=device-width, initial-scale=1';
		return /viewport-fit\s*=/.test( base ) ? base : base + ', viewport-fit=cover';
	};
	viewportMeta.setAttribute( 'content', ensureViewportFitCover( previousViewportContent ) );

	root.addEventListener( 'click', ( e ) => {
		const action = e.target.dataset && e.target.dataset.action;
		if ( action === 'close' ) close();
	} );
	allowBtn.addEventListener( 'click', () => {
		if ( consentResolve ) consentResolve( true );
	} );
	snapshotBtn.addEventListener( 'click', () => {
		if ( onSnapshotCb ) onSnapshotCb();
	} );
	document.addEventListener( 'keydown', escHandler );

	function escHandler( e ) {
		if ( e.key === 'Escape' && isOpen ) close();
	}

	function close() {
		if ( ! isOpen ) return;
		isOpen = false;
		document.removeEventListener( 'keydown', escHandler );
		// Resolve any pending consent promise as "denied" so the
		// awaiting caller (startTryOn) can proceed to its early-return
		// path. Without this the promise hangs forever, which leaves
		// the Try-On button stuck in disabled/loading state from the
		// bootstrap's `try { await startTryOn(...) } finally { ... }`.
		if ( consentResolve ) {
			const resolve = consentResolve;
			consentResolve = null;
			resolve( false );
		}
		// Restore host-page viewport + scroll state. Idempotent — if
		// another script changed the viewport meta while the modal was
		// open we still revert to whatever we recorded on open.
		document.body.style.overflow = previousBodyOverflow;
		if ( createdViewportMeta ) {
			viewportMeta.remove();
		} else if ( previousViewportContent !== null ) {
			viewportMeta.setAttribute( 'content', previousViewportContent );
		}
		root.remove();
		if ( onCloseCb ) onCloseCb();
	}

	function setStatus( text ) {
		statusEl.textContent = text || '';
		statusEl.hidden = ! text;
	}

	function showError( message ) {
		errorEl.textContent = message;
		errorEl.hidden = false;
	}

	function showStage() {
		consentEl.hidden = true;
		toolbar.hidden = false;
		// Reveal the floating shutter button now that the live camera
		// feed is composited onto the canvas — only when the merchant
		// allows snapshots site-wide (`config.snapshot`).
		if ( snapshotBtn && config.snapshot ) {
			snapshotBtn.hidden = false;
		}
	}

	function askConsent() {
		return new Promise( ( resolve ) => {
			consentResolve = resolve;
		} );
	}

	function setFps( fps ) {
		fpsEl.textContent = fps ? `${ fps } fps` : '';
	}

	function escapeHtml( s ) {
		return String( s ).replace( /[&<>"']/g, ( c ) => ( {
			'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
		} )[ c ] );
	}

	return {
		root,
		video,
		canvas,
		productId,
		get isOpen() { return isOpen; },
		setStatus,
		showError,
		showStage,
		askConsent,
		setFps,
		close,
		set onClose( fn ) { onCloseCb = fn; },
		set onSnapshot( fn ) { onSnapshotCb = fn; },
	};
}
