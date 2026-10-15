/**
 * AR-98: copy of the AtlasAR Cloud flat-product generator (apps/atlasar/client/flatGenerator.js).
 * Keep the two in step. Loaded only as a lazy chunk when the merchant clicks "Make 3D model".
 */
import {
    Box3, BoxGeometry, CanvasTexture, Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Scene, SRGBColorSpace,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

export const LIMITS = { maxFileBytes: 25 * 1024 * 1024, maxPixels: 40_000_000, textureMaxPx: 2048 };

/** Kinds: thickness default (mm), whether it lies on the floor, and the AR placement. */
export const KINDS = {
    canvas: { label: 'Canvas print', depthMm: 20, floor: false, edge: 'wrap' },
    poster: { label: 'Poster / paper print', depthMm: 1, floor: false, edge: 'white' },
    framed: { label: 'Framed picture', depthMm: 25, floor: false, edge: 'frame', frame: true },
    rug: { label: 'Rug / mat', depthMm: 10, floor: true, edge: 'sample' },
    tile: { label: 'Tile / panel', depthMm: 8, floor: false, edge: 'sample' },
};

export class FlatGeneratorError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

/**
 * Decode a user image safely and downscale it to the texture limit (keeps the GLB light).
 * Returns { canvas, width, height } where width/height are the original pixel size.
 */
export async function loadImage(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        throw new FlatGeneratorError('invalid_image', 'Choose a JPEG, PNG or WebP image.');
    }
    if (file.size > LIMITS.maxFileBytes) {
        throw new FlatGeneratorError('image_too_large', 'The image is larger than 25 MB.');
    }
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new FlatGeneratorError('invalid_image', 'This image could not be read.');
    }
    const { width, height } = bitmap;
    if (width * height > LIMITS.maxPixels) {
        bitmap.close();
        throw new FlatGeneratorError('image_too_large', `The image has more than ${LIMITS.maxPixels / 1e6} megapixels.`);
    }
    const scale = Math.min(1, LIMITS.textureMaxPx / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    // Drawing to a canvas also drops EXIF / GPS: only pixels go into the model.
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return { canvas, width, height };
}

/** Average colour of the image's outer border, for rug/tile edges. */
function borderColor(canvas) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const strips = [ctx.getImageData(0, 0, w, 1), ctx.getImageData(0, h - 1, w, 1), ctx.getImageData(0, 0, 1, h), ctx.getImageData(w - 1, 0, 1, h)];
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const { data } of strips) {
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
        }
    }
    return new Color(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
}

/** Validate user sizes (cm / mm) and return metres. */
export function checkSize({ widthCm, heightCm, depthMm }) {
    const w = Number(widthCm);
    const h = Number(heightCm);
    const d = Number(depthMm);
    if (!(w >= 1 && w <= 1000) || !(h >= 1 && h <= 1000)) throw new FlatGeneratorError('invalid_size', 'Width and height must be 1–1000 cm.');
    if (!(d >= 0.5 && d <= 200)) throw new FlatGeneratorError('invalid_size', 'Thickness must be 0.5–200 mm.');
    return { w: w / 100, h: h / 100, d: d / 1000 };
}

/**
 * Build the model. Wall items stand upright with the image facing +Z and the back at z = 0 (so
 * model-viewer's wall placement puts the back on the wall); floor items lie flat with the base at y = 0.
 */
export function buildModel(image, { kind = 'canvas', widthCm, heightCm, depthMm, frameColor = '#2b2b2b', frameWidthCm = 3, name = 'Flat product' } = {}) {
    const spec = KINDS[kind];
    if (!spec) throw new FlatGeneratorError('invalid_kind', 'Unknown product type.');
    const { w, h, d } = checkSize({ widthCm, heightCm, depthMm: depthMm ?? spec.depthMm });

    const texture = new CanvasTexture(image.canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.userData.mimeType = 'image/jpeg'; // photos compress far better as JPEG than PNG
    const front = new MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0, name: 'front' });
    const edgeColor = spec.edge === 'white' ? new Color('#f4f4f4') : spec.edge === 'frame' ? new Color(frameColor) : borderColor(image.canvas);
    const edge = new MeshStandardMaterial({ color: edgeColor, roughness: 0.9, metalness: 0, name: 'edge' });

    const group = new Group();
    group.name = String(name).slice(0, 120) || 'Flat product';
    // One material per mesh: the USDZ exporter silently skips multi-material meshes (an earlier
    // version exported a 669-byte, empty USDZ). Body = box in the edge colour; image = a plane on
    // the front face, a hair in front so it never z-fights with the box.
    const body = new Mesh(new BoxGeometry(w, h, d), edge);
    body.name = 'body';
    const face = new Mesh(new PlaneGeometry(w, h), front);
    face.name = 'image';
    face.position.z = d / 2 + 0.0001;
    group.add(body, face);

    if (spec.frame) {
        const fw = Math.min(Number(frameWidthCm) / 100 || 0.03, Math.min(w, h) / 4);
        const fd = d * 1.2;
        const frameMat = new MeshStandardMaterial({ color: new Color(frameColor), roughness: 0.6, metalness: 0.1, name: 'frame' });
        const bars = [
            [w + 2 * fw, fw, 0, h / 2 + fw / 2], [w + 2 * fw, fw, 0, -h / 2 - fw / 2],
            [fw, h, -w / 2 - fw / 2, 0], [fw, h, w / 2 + fw / 2, 0],
        ];
        for (const [bw, bh, x, y] of bars) {
            const bar = new Mesh(new BoxGeometry(bw, bh, fd), frameMat);
            bar.position.set(x, y, (fd - d) / 2);
            group.add(bar);
        }
    }

    if (spec.floor) {
        group.rotation.x = -Math.PI / 2; // image faces up
        group.position.y = d / 2;
    } else {
        group.position.set(0, h / 2, d / 2); // back on the wall plane, bottom edge at y = 0
    }
    const root = new Group();
    root.add(group);
    root.userData.arPlacement = spec.floor ? 'floor' : 'wall';
    return root;
}

/**
 * Real vertical extent in cm (includes a frame; for floor items it is the thickness). The service
 * scales hosted models to this height, so the art itself keeps its true size.
 */
export function modelHeightCm(root) {
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root);
    return Math.round((box.max.y - box.min.y) * 100 * 100) / 100;
}

/** GLB as an ArrayBuffer. */
export async function exportGLB(root) {
    const scene = new Scene();
    scene.add(root);
    const exporter = new GLTFExporter();
    return exporter.parseAsync(scene, { binary: true, maxTextureSize: LIMITS.textureMaxPx, onlyVisible: true });
}

/** USDZ (for iPhone/iPad Quick Look) as a Uint8Array. */
export async function exportUSDZ(root) {
    const scene = new Scene();
    scene.add(root.clone(true));
    return new USDZExporter().parseAsync(scene); // three r0.182: parse() is callback-based
}

/** Same page-weight budget as the service (plan §13): pass ≤ 3 MB, warn ≤ 5 MB, fail above. */
export function gradeSize(bytes) {
    const mb = bytes / 1024 ** 2;
    return { mb: Number(mb.toFixed(2)), budget: mb <= 3 ? 'pass' : mb <= 5 ? 'warn' : 'fail' };
}
