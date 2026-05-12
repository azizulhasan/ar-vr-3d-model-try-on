/**
 * Map MediaPipe Face Landmarker output to a 2D anchor (position, scale,
 * rotation) on the preview canvas. Phase-1 anchors: glasses (nose-bridge,
 * eye-line) and hats (forehead-top, head transform).
 *
 * Pro overrides this via the `atlas_ar_tryon_landmark_pipeline` filter (PHP)
 * by injecting a JS hook before this module runs. For now Free implements
 * static defaults.
 *
 * MediaPipe face mesh landmark index reference (subset):
 *   168 — nose bridge (between eyebrows)
 *   1   — nose tip
 *   33  — right eye outer corner
 *   263 — left eye outer corner
 *   10  — forehead top center
 *   152 — chin
 */

const IDX = {
	noseBridge: 168,
	noseTip: 1,
	eyeRight: 33,
	eyeLeft: 263,
	foreheadTop: 10,
	chin: 152,
};

/**
 * @param {Array<{x:number,y:number,z:number}>} landmarks Normalized 0..1.
 * @param {string} mode 'face' (default), 'face-glasses', 'face-hat'.
 * @param {{width:number,height:number}} canvas
 * @returns {{x:number,y:number,width:number,rotation:number}|null}
 */
export function computeAnchor( landmarks, mode, canvas, accessory = 'glasses' ) {
	if ( ! landmarks || landmarks.length < 200 ) return null;

	const eyeR = landmarks[ IDX.eyeRight ];
	const eyeL = landmarks[ IDX.eyeLeft ];
	if ( ! eyeR || ! eyeL ) return null;

	const eyeRx = eyeR.x * canvas.width;
	const eyeRy = eyeR.y * canvas.height;
	const eyeLx = eyeL.x * canvas.width;
	const eyeLy = eyeL.y * canvas.height;

	const eyeDistance = Math.hypot( eyeLx - eyeRx, eyeLy - eyeRy );
	const rotation = Math.atan2( eyeLy - eyeRy, eyeLx - eyeRx );

	if ( accessory === 'hat' ) {
		const forehead = landmarks[ IDX.foreheadTop ];
		if ( ! forehead ) return null;
		// Hat sits above forehead, centered on head, ~2.4× eye-distance
		// wide as a sensible default. Merchants tune per-product via
		// the live calibration panel (Pro) — that's the canonical fix.
		return {
			x: forehead.x * canvas.width,
			y: forehead.y * canvas.height - eyeDistance * 0.7,
			width: eyeDistance * 2.4,
			rotation,
		};
	}

	// Glasses sit on the nose-bridge, ~2.0× eye-distance wide.
	const bridge = landmarks[ IDX.noseBridge ];
	if ( ! bridge ) return null;
	return {
		x: bridge.x * canvas.width,
		y: bridge.y * canvas.height,
		width: eyeDistance * 2.0,
		rotation,
	};
}

export function detectAccessoryFromMode( mode ) {
	if ( mode === 'face-hat' || mode === 'hat' ) return 'hat';
	// face, face-glasses, glasses, anything else → glasses (default)
	return 'glasses';
}
