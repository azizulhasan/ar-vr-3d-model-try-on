/**
 * Try-On controller. Coordinates webcam → worker (MediaPipe) → 2D canvas
 * compositor. Implements Pattern 1.5 from the integration plan: render the
 * 3D product GLB to a sprite via <model-viewer>.toBlob(), then draw that
 * sprite on the live webcam canvas at landmark-derived anchor positions.
 *
 * Pattern 2 (parallel three.js overlay) is reserved for Pro phases that
 * need depth ordering (clothing, occlusion).
 */

import { createUI } from './tryon-ui.js';
import { computeAnchor, detectAccessoryFromMode } from './tryon-anchors.js';

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

export async function startTryOn( { productId, mode, glbSrc, config, onClose } ) {
	const ui = createUI( { config, productId } );
	document.body.appendChild( ui.root );
	ui.canvas.width = VIDEO_WIDTH;
	ui.canvas.height = VIDEO_HEIGHT;

	const accessory = detectAccessoryFromMode( mode );

	const granted = await ui.askConsent();
	if ( ! granted ) {
		ui.close();
		return null;
	}

	let stream;
	try {
		stream = await navigator.mediaDevices.getUserMedia( {
			video: {
				facingMode: 'user',
				width: { ideal: VIDEO_WIDTH },
				height: { ideal: VIDEO_HEIGHT },
			},
			audio: false,
		} );
	} catch ( err ) {
		ui.showError( 'Camera permission denied. Please grant access to use Try It On.' );
		console.error( '[AtlasAR] getUserMedia failed:', err );
		return null;
	}

	ui.video.srcObject = stream;
	await ui.video.play();
	ui.showStage();
	ui.setStatus( 'Loading face model…' );

	const overlaySprite = await captureProductSprite( productId, glbSrc );
	console.log( '[AtlasAR Try-On] sprite:', overlaySprite, 'mode:', mode, 'accessory:', accessory );
	if ( ! overlaySprite ) {
		ui.setStatus( 'No 3D model found on page' );
	} else {
		// Expose for debugging.
		window.__tryon_debug = window.__tryon_debug || {};
		window.__tryon_debug.sprite = overlaySprite;
		window.__tryon_debug.mode = mode;
	}

	const worker = new Worker(
		new URL(
			/* webpackChunkName: "tryon-face-worker" */
			'./workers/face-landmarker.worker.js',
			import.meta.url
		),
		{ type: 'module' }
	);

	worker.postMessage( {
		type: 'init',
		modelUrl: config.models && config.models.face,
		wasmBase: config.models && config.models.wasm_base,
	} );

	let lastLandmarks = null;
	let detectInflight = false;
	let frames = 0;
	let lastFpsAt = performance.now();
	let running = true;

	let workerReady = false;
	worker.onmessage = ( ev ) => {
		const msg = ev.data || {};
		console.log( '[AtlasAR Try-On worker→main]', msg.type, msg );
		if ( msg.type === 'boot' ) {
			ui.setStatus( 'Worker booted, loading face model…' );
		} else if ( msg.type === 'ready' ) {
			workerReady = true;
			ui.setStatus( '' );
		} else if ( msg.type === 'result' ) {
			lastLandmarks = msg.landmarks;
			detectInflight = false;
			window.__tryon_debug = window.__tryon_debug || {};
			window.__tryon_debug.landmarks = msg.landmarks;
			window.__tryon_debug.lastResultAt = Date.now();
		} else if ( msg.type === 'error' ) {
			ui.showError( msg.message || 'Face tracker failed' );
			console.error( '[AtlasAR Try-On worker error]', msg.message );
			running = false;
		}
	};
	worker.onerror = ( e ) => {
		console.error( '[AtlasAR Try-On worker.onerror]', e.message, e.filename, e.lineno );
		ui.showError( 'Worker error: ' + e.message );
	};

	const ctx = ui.canvas.getContext( '2d' );

	function tick() {
		if ( ! running || ! ui.isOpen ) return;

		ctx.save();
		// Mirror so user feels natural ("selfie" view).
		ctx.translate( ui.canvas.width, 0 );
		ctx.scale( -1, 1 );
		ctx.drawImage( ui.video, 0, 0, ui.canvas.width, ui.canvas.height );
		ctx.restore();

		if ( lastLandmarks && overlaySprite ) {
			const anchor = computeAnchor( lastLandmarks, mode, ui.canvas, accessory );
			if ( anchor ) {
				// Mirror anchor x because we drew video mirrored.
				const ax = ui.canvas.width - anchor.x;
				const w = anchor.width;
				const h = w * ( overlaySprite.height / overlaySprite.width );
				ctx.save();
				ctx.translate( ax, anchor.y );
				ctx.rotate( -anchor.rotation );
				ctx.drawImage( overlaySprite, -w / 2, -h / 2, w, h );
				ctx.restore();
			}
		}

		// Send next frame to worker if it's idle and ready.
		if ( workerReady && ! detectInflight && ui.video.readyState >= 2 ) {
			detectInflight = true;
			createImageBitmap( ui.video )
				.then( ( bitmap ) => {
					worker.postMessage(
						{ type: 'detect', bitmap, ts: performance.now() },
						[ bitmap ]
					);
				} )
				.catch( () => {
					detectInflight = false;
				} );
		}

		frames += 1;
		const now = performance.now();
		if ( now - lastFpsAt >= 1000 ) {
			ui.setFps( Math.round( ( frames * 1000 ) / ( now - lastFpsAt ) ) );
			frames = 0;
			lastFpsAt = now;
		}

		requestAnimationFrame( tick );
	}
	requestAnimationFrame( tick );

	ui.onSnapshot = async () => {
		const dataUrl = ui.canvas.toDataURL( 'image/png' );
		// Direct download.
		const a = document.createElement( 'a' );
		a.href = dataUrl;
		a.download = `tryon-${ productId }-${ Date.now() }.png`;
		document.body.appendChild( a );
		a.click();
		a.remove();

		// Optional: persist to media library if logged in.
		if ( config.rest_url && config.rest_nonce ) {
			try {
				await fetch( `${ config.rest_url }/tryon/snapshot`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': config.rest_nonce,
					},
					body: JSON.stringify( { image: dataUrl, product_id: productId } ),
				} );
			} catch ( err ) {
				console.warn( '[AtlasAR] Snapshot upload failed:', err );
			}
		}
	};

	ui.onClose = () => {
		running = false;
		stream.getTracks().forEach( ( t ) => t.stop() );
		worker.postMessage( { type: 'dispose' } );
		worker.terminate();
		if ( typeof onClose === 'function' ) onClose();
	};

	return ui;
}

/**
 * Ensure the <model-viewer> custom element is registered. The plugin lazy-
 * loads google-model-viewer.js when an on-page mv enters viewport, but in
 * the try-on flow the on-page viewer is often hidden behind a toggle so the
 * lazy-loader never fires. We force-load the module ourselves.
 */
async function ensureModelViewerLoaded() {
	if ( window.customElements && window.customElements.get( 'model-viewer' ) ) {
		return true;
	}
	const cfg = window.atlas_ar_tryon || {};
	const base = cfg.plugin_url || '/';
	const src = `${ base }public/js/google-model-viewer.js`;
	await new Promise( ( resolve, reject ) => {
		const existing = document.querySelector( `script[src="${ src }"]` );
		if ( existing ) {
			existing.addEventListener( 'load', resolve, { once: true } );
			existing.addEventListener( 'error', reject, { once: true } );
			return;
		}
		const s = document.createElement( 'script' );
		s.type = 'module';
		s.src = src;
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild( s );
	} );
	if ( window.customElements ) {
		await window.customElements.whenDefined( 'model-viewer' );
	}
	return true;
}

/**
 * Render the product GLB to a sprite via a transient off-screen <model-viewer>.
 *
 * The on-page model-viewer is often lazy-loaded, hidden behind a toggle, or
 * angled to a non-front pose — none of which gives a usable try-on sprite.
 * We read its `src`, build a temporary off-screen instance forced to a
 * front-facing camera-orbit, await load, then snapshot.
 */
async function captureProductSprite( productId, explicitSrc ) {
	let src = '';
	if ( explicitSrc && typeof explicitSrc === 'string' ) {
		src = explicitSrc;
	}
	if ( ! src ) {
		const candidates = [
			document.querySelector( `model-viewer[data-product-id="${ productId }"]` ),
			document.querySelector( `model-viewer[product-id="${ productId }"]` ),
			document.querySelector( 'model-viewer.atlas_ar_model_viewer' ),
			document.querySelector( 'model-viewer' ),
		].filter( Boolean );
		const source = candidates[ 0 ];
		if ( source ) src = source.getAttribute( 'src' ) || '';
	}
	if ( ! src ) return null;

	try {
		await ensureModelViewerLoaded();
	} catch ( err ) {
		console.warn( '[AtlasAR] model-viewer module failed to load', err );
		return null;
	}

	const off = document.createElement( 'model-viewer' );
	// MUST be in viewport AND non-transparent for model-viewer to render frames.
	// clip-path hides visually while leaving the element paintable.
	off.style.cssText = [
		'position:fixed',
		'top:0',
		'right:0',
		'width:512px',
		'height:512px',
		'clip-path:inset(0 0 100% 100%)',
		'pointer-events:none',
		'z-index:1',
	].join( ';' );
	off.setAttribute( 'src', src );
	off.setAttribute( 'camera-orbit', '0deg 90deg auto' );
	off.setAttribute( 'exposure', '1' );
	off.setAttribute( 'shadow-intensity', '0' );
	off.setAttribute( 'environment-image', 'neutral' );
	off.setAttribute( 'disable-zoom', '' );
	off.setAttribute( 'loading', 'eager' );
	off.setAttribute( 'reveal', 'auto' );
	document.body.appendChild( off );

	const loaded = await new Promise( ( resolve ) => {
		let settled = false;
		const finish = ( ok ) => {
			if ( settled ) return;
			settled = true;
			resolve( ok );
		};
		off.addEventListener( 'load', () => finish( true ), { once: true } );
		off.addEventListener( 'error', () => finish( false ), { once: true } );
		setTimeout( () => finish( false ), 10000 );
	} );

	if ( ! loaded || typeof off.toBlob !== 'function' ) {
		off.remove();
		console.warn( '[AtlasAR] Snapshot model-viewer failed to load', src );
		return null;
	}

	// Wait two animation frames so the first paint commits.
	await new Promise( ( resolve ) =>
		requestAnimationFrame( () => requestAnimationFrame( resolve ) )
	);

	try {
		const blob = await off.toBlob( { mimeType: 'image/png', idealAspect: false } );
		off.remove();
		if ( ! blob ) return null;
		return await createImageBitmap( blob );
	} catch ( err ) {
		off.remove();
		console.warn( '[AtlasAR] Failed to snapshot model-viewer:', err );
		return null;
	}
}
