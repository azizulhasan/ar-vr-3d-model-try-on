/**
 * GLB anatomy analyzer.
 *
 * Walks a loaded GLB scene and extracts the geometric facts the
 * Try-On renderer needs to place the accessory anatomically correctly
 * on a customer's face — without any merchant calibration for typical
 * models. Output schema matches the `ar_try_on_product_settings.glb_anatomy`
 * post-meta the REST endpoint persists.
 *
 * All values are in the GLB's native units (typically meters).
 *
 * Usage:
 *   import { computeGlbAnatomy } from './glb-anatomy.js';
 *   const anatomy = computeGlbAnatomy( gltfScene, 'face-hat', THREE );
 *
 * `THREE` is passed in so this module doesn't import three.js itself —
 * Pro loads three.js from CDN, Free uses model-viewer's bundled three.
 */

const VERSION = 2; // bump when output schema changes — older cached values are rejected
export const SUPPORTED_VERSION = VERSION;

/**
 * Visible-mesh bbox traversal. Ignores hidden / zero-vertex meshes
 * that would inflate the bounding box (LOD slots, armature helpers).
 */
function computeVisibleBox( root, THREE ) {
	const box = new THREE.Box3();
	box.makeEmpty();
	root.updateMatrixWorld( true );
	root.traverse( ( obj ) => {
		if ( ! obj.visible || ! obj.isMesh ) return;
		const geom = obj.geometry;
		if ( ! geom || ! geom.attributes || ! geom.attributes.position ) return;
		if ( geom.attributes.position.count === 0 ) return;
		if ( ! geom.boundingBox ) geom.computeBoundingBox();
		const meshBox = geom.boundingBox.clone().applyMatrix4( obj.matrixWorld );
		box.union( meshBox );
	} );
	return box;
}

/**
 * For a hat: the "crown opening" is the bottom plane where the head
 * goes in. We approximate it as `bbox.min.y + crown_height_factor *
 * (bbox.max.y - bbox.min.y)`, then refine by finding the Y where the
 * mesh slices have their widest XZ footprint (= the brim level).
 *
 * For most uploaded hat GLBs the wider section near the bottom IS the
 * brim, so the widest slice ≈ the brim plane. We then take a few cm
 * above that as the crown opening (where the inside band rests on the
 * head).
 */
function analyzeHat( root, box, THREE ) {
	const size = box.getSize( new THREE.Vector3() );
	const center = box.getCenter( new THREE.Vector3() );
	const SLICES = 16;
	// Bucket-scan vertex positions by Y to find the widest XZ slice.
	const buckets = new Array( SLICES ).fill( 0 ).map( () => ( {
		minX:  Infinity, maxX: -Infinity,
		minZ:  Infinity, maxZ: -Infinity,
		count: 0,
	} ) );
	const yMin = box.min.y;
	const yRange = Math.max( size.y, 1e-6 );
	const vec = new THREE.Vector3();

	root.traverse( ( obj ) => {
		if ( ! obj.visible || ! obj.isMesh ) return;
		const geom = obj.geometry;
		const pos = geom && geom.attributes && geom.attributes.position;
		if ( ! pos ) return;
		obj.updateMatrixWorld( true );
		for ( let i = 0; i < pos.count; i++ ) {
			vec.fromBufferAttribute( pos, i );
			vec.applyMatrix4( obj.matrixWorld );
			const t = ( vec.y - yMin ) / yRange;
			const idx = Math.min( SLICES - 1, Math.max( 0, Math.floor( t * SLICES ) ) );
			const b = buckets[ idx ];
			if ( vec.x < b.minX ) b.minX = vec.x;
			if ( vec.x > b.maxX ) b.maxX = vec.x;
			if ( vec.z < b.minZ ) b.minZ = vec.z;
			if ( vec.z > b.maxZ ) b.maxZ = vec.z;
			b.count++;
		}
	} );

	// Widest slice in Y. For hats this is usually the brim.
	let widestIdx  = 0;
	let widestSize = 0;
	for ( let i = 0; i < SLICES; i++ ) {
		const b = buckets[ i ];
		if ( ! b.count ) continue;
		const w = Math.max( b.maxX - b.minX, b.maxZ - b.minZ );
		if ( w > widestSize ) { widestSize = w; widestIdx = i; }
	}
	const brimY = yMin + ( ( widestIdx + 0.5 ) / SLICES ) * yRange;

	// Crown opening sits a hair ABOVE the brim plane (where the inner
	// band wraps the head). For top hats the brim IS the opening (no
	// inner band visible) so we keep it at the brim Y. Reported
	// relative to the bbox CENTER (so the renderer can apply it
	// directly after centering the GLB about its bbox).
	const crownOpeningY = brimY - center.y;
	// Brim depth: how far the front edge of the brim extends past the
	// crown center in -Z. Estimate from the widest-slice depth.
	const brimDepth = Math.max(
		buckets[ widestIdx ].maxZ - buckets[ widestIdx ].minZ,
		0
	) * 0.5;
	// Inner-band radius (rough head circumference / 2π for the inside
	// of the hat). Use the slice just above the brim.
	const innerIdx = Math.min( SLICES - 1, widestIdx + 1 );
	const innerB = buckets[ innerIdx ];
	const innerRadius = innerB.count
		? Math.max( innerB.maxX - innerB.minX, innerB.maxZ - innerB.minZ ) * 0.5
		: ( buckets[ widestIdx ].maxX - buckets[ widestIdx ].minX ) * 0.4;

	return {
		crown_opening_y: crownOpeningY,
		brim_depth_z:    brimDepth,
		inner_radius:    innerRadius,
	};
}

/**
 * For glasses: detect the X-extent of the lens area (widest XZ in the
 * upper-front quadrant of the bbox) and the Z of the bridge (frontmost
 * Z near the centerline).
 */
function analyzeGlasses( root, box, THREE ) {
	const size = box.getSize( new THREE.Vector3() );
	const center = box.getCenter( new THREE.Vector3() );
	let lensMinX =  Infinity;
	let lensMaxX = -Infinity;
	let lensCenterY = 0;
	let lensCenterZ = 0;
	let lensCount = 0;
	let bridgeZ = box.max.z;
	const vec = new THREE.Vector3();

	root.traverse( ( obj ) => {
		if ( ! obj.visible || ! obj.isMesh ) return;
		const geom = obj.geometry;
		const pos = geom && geom.attributes && geom.attributes.position;
		if ( ! pos ) return;
		obj.updateMatrixWorld( true );
		for ( let i = 0; i < pos.count; i++ ) {
			vec.fromBufferAttribute( pos, i );
			vec.applyMatrix4( obj.matrixWorld );
			// Lens loops are in the front half of the bbox (Z > center.z)
			// and within ~40% of bbox height of the vertical center.
			if ( vec.z >= center.z && Math.abs( vec.y - center.y ) < size.y * 0.4 ) {
				if ( vec.x < lensMinX ) lensMinX = vec.x;
				if ( vec.x > lensMaxX ) lensMaxX = vec.x;
				lensCenterY += vec.y;
				lensCenterZ += vec.z;
				lensCount++;
			}
			// Bridge: frontmost Z near the centerline (small |X|).
			if ( Math.abs( vec.x - center.x ) < size.x * 0.08 && vec.z < bridgeZ ) {
				bridgeZ = vec.z;
			}
		}
	} );

	// Report values relative to the bbox CENTER so the renderer can
	// apply them directly after the standard centering step.
	if ( lensCount === 0 ) {
		return {
			lens_center:   [ 0, 0, 0 ],
			temple_span_x: size.x,
			bridge_z:      box.min.z - center.z,
		};
	}
	return {
		lens_center:   [
			( lensMinX + lensMaxX ) * 0.5 - center.x,
			lensCenterY / lensCount         - center.y,
			lensCenterZ / lensCount         - center.z,
		],
		temple_span_x: lensMaxX - lensMinX,
		bridge_z:      bridgeZ - center.z,
	};
}

/**
 * Public entry point.
 *
 * @param {THREE.Object3D} gltfScene  Root scene from GLTFLoader.
 * @param {string}         mode       'face-hat' | 'face-glasses'.
 * @param {typeof THREE}   THREE      Three.js module (passed in to avoid double-loading).
 * @returns {object} Anatomy object matching the post-meta schema.
 */
export function computeGlbAnatomy( gltfScene, mode, THREE ) {
	if ( ! gltfScene || ! THREE ) return null;
	const t0 = ( typeof performance !== 'undefined' && performance.now ) ? performance.now() : 0;

	// Analyze in the GLB's LOCAL space — independent of any parent
	// scene-graph transform the caller may have applied (per-frame
	// glbRoot scaling, centering offsets, etc). We snapshot the current
	// scene matrices, temporarily detach the scene to a fresh root, run
	// the analysis, then restore.
	const originalParent = gltfScene.parent;
	const originalPos    = gltfScene.position.clone();
	const originalRot    = gltfScene.rotation.clone();
	const originalScale  = gltfScene.scale.clone();
	if ( originalParent ) originalParent.remove( gltfScene );
	const tempRoot = new THREE.Group();
	tempRoot.add( gltfScene );
	gltfScene.position.set( 0, 0, 0 );
	gltfScene.rotation.set( 0, 0, 0 );
	gltfScene.scale.set( 1, 1, 1 );
	tempRoot.updateMatrixWorld( true );

	let anatomy = null;
	try {
		const box = computeVisibleBox( gltfScene, THREE );
		if ( ! box.isEmpty() ) {
			const size = box.getSize( new THREE.Vector3() );
			anatomy = {
				version:      VERSION,
				computed_by:  'client-v1',
				bbox_min:     [ box.min.x, box.min.y, box.min.z ],
				bbox_max:     [ box.max.x, box.max.y, box.max.z ],
				silhouette_w: Math.max( size.x, size.z ),
				silhouette_h: size.y,
			};
			if ( mode === 'face-hat' || mode === 'hat' ) {
				anatomy.hat = analyzeHat( gltfScene, box, THREE );
			} else {
				anatomy.glasses = analyzeGlasses( gltfScene, box, THREE );
			}
		}
	} finally {
		// Restore the caller's scene graph exactly as we found it.
		tempRoot.remove( gltfScene );
		gltfScene.position.copy( originalPos );
		gltfScene.rotation.copy( originalRot );
		gltfScene.scale.copy( originalScale );
		if ( originalParent ) originalParent.add( gltfScene );
	}

	if ( anatomy && t0 ) anatomy.compute_ms = Math.round( performance.now() - t0 );
	return anatomy;
}

/**
 * POST anatomy to the WordPress REST endpoint (admin-only). Silent
 * no-op when the user can't write — the renderer still uses the
 * computed value for the current session.
 */
export async function persistGlbAnatomy( productId, anatomy, restUrl, restNonce ) {
	if ( ! productId || ! anatomy || ! restUrl ) return false;
	try {
		const res = await fetch( restUrl + '/tryon/glb-anatomy/' + encodeURIComponent( productId ), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce':   restNonce || '',
			},
			body: JSON.stringify( { anatomy } ),
		} );
		return res.ok;
	} catch ( e ) {
		return false;
	}
}
