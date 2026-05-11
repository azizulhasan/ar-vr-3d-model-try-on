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
			</div>
			<div class="art-tryon-consent">
				<button type="button" class="art-tryon-consent-allow button button-primary">Allow camera access</button>
				<button type="button" class="art-tryon-consent-deny button" data-action="close">Cancel</button>
			</div>
			<div class="art-tryon-toolbar" hidden>
				<button type="button" class="art-tryon-snapshot button button-primary" ${ config.snapshot ? '' : 'hidden' }>Snapshot</button>
				<span class="art-tryon-fps"></span>
			</div>
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

	let isOpen = true;
	let onCloseCb = null;
	let onSnapshotCb = null;
	let consentResolve = null;

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
	}

	function askConsent() {
		return new Promise( ( resolve ) => {
			consentResolve = resolve;
		} );
	}

	function setFps( fps ) {
		fpsEl.textContent = fps ? `${ fps } fps` : '';
	}

	/**
	 * Surface a shareable URL after a successful snapshot upload.
	 * Adds a small "Copy share link" toast under the toolbar.
	 */
	function showShareLink( url ) {
		if ( ! url ) return;
		let bar = root.querySelector( '.art-tryon-share' );
		if ( ! bar ) {
			bar = document.createElement( 'div' );
			bar.className = 'art-tryon-share';
			toolbar.parentNode.insertBefore( bar, toolbar.nextSibling );
		}
		bar.innerHTML = '';
		const link = document.createElement( 'a' );
		link.href = url;
		link.target = '_blank';
		link.rel = 'noopener';
		link.textContent = 'View saved snapshot';
		const copy = document.createElement( 'button' );
		copy.type = 'button';
		copy.className = 'button';
		copy.textContent = 'Copy link';
		copy.addEventListener( 'click', async () => {
			try {
				await navigator.clipboard.writeText( url );
				copy.textContent = 'Copied!';
				setTimeout( () => { copy.textContent = 'Copy link'; }, 1800 );
			} catch ( e ) { /* clipboard denied */ }
		} );
		bar.appendChild( link );
		bar.appendChild( copy );
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
		showShareLink,
		close,
		set onClose( fn ) { onCloseCb = fn; },
		set onSnapshot( fn ) { onSnapshotCb = fn; },
	};
}
