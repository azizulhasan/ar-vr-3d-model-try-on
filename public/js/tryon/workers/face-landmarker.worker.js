/**
 * MediaPipe Face Landmarker Web Worker. Off-main-thread inference so the
 * render loop in tryon-controller.js stays at 60fps.
 *
 * Messages in:
 *   { type: 'init', modelUrl, wasmBase }
 *   { type: 'detect', bitmap, ts }
 *   { type: 'dispose' }
 *
 * Messages out:
 *   { type: 'ready' }
 *   { type: 'result', landmarks, ts }
 *   { type: 'error', message }
 */

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

let landmarker = null;

self.addEventListener( 'error', ( e ) => {
	self.postMessage( { type: 'error', message: 'worker:' + ( e.message || e.error ) } );
} );
self.addEventListener( 'unhandledrejection', ( e ) => {
	self.postMessage( { type: 'error', message: 'worker-rejection:' + ( e.reason && e.reason.message ? e.reason.message : String( e.reason ) ) } );
} );

self.postMessage( { type: 'boot' } );

self.onmessage = async ( evt ) => {
	const data = evt.data || {};
	try {
		if ( data.type === 'init' ) {
			const vision = await FilesetResolver.forVisionTasks( data.wasmBase );
			const opts = data.options || {};
			landmarker = await FaceLandmarker.createFromOptions( vision, {
				baseOptions: {
					modelAssetPath: data.modelUrl,
					delegate: 'GPU',
				},
				runningMode: 'VIDEO',
				numFaces: opts.numFaces || 1,
				outputFaceBlendshapes: !! opts.outputFaceBlendshapes,
				outputFacialTransformationMatrixes: !! opts.outputFacialTransformationMatrixes,
			} );
			self.postMessage( { type: 'ready' } );
			return;
		}

		if ( data.type === 'detect' ) {
			if ( ! landmarker ) {
				if ( data.bitmap && data.bitmap.close ) data.bitmap.close();
				self.postMessage( { type: 'result', landmarks: null, ts: data.ts, notReady: true } );
				return;
			}
			if ( ! data.bitmap ) {
				self.postMessage( { type: 'result', landmarks: null, ts: data.ts } );
				return;
			}
			const result = landmarker.detectForVideo( data.bitmap, data.ts || performance.now() );
			const landmarks = result && result.faceLandmarks && result.faceLandmarks[ 0 ] ? result.faceLandmarks[ 0 ] : null;
			let facialMatrix = null;
			if ( result && result.facialTransformationMatrixes && result.facialTransformationMatrixes[ 0 ] ) {
				const m = result.facialTransformationMatrixes[ 0 ];
				// Marshal to a plain Float32Array for structured-clone safety.
				facialMatrix = m.data ? new Float32Array( m.data ) : null;
			}
			data.bitmap.close && data.bitmap.close();
			self.postMessage( { type: 'result', landmarks, facialMatrix, ts: data.ts } );
			return;
		}

		if ( data.type === 'dispose' && landmarker ) {
			landmarker.close && landmarker.close();
			landmarker = null;
		}
	} catch ( err ) {
		self.postMessage( { type: 'error', message: err && err.message ? err.message : String( err ) } );
	}
};
