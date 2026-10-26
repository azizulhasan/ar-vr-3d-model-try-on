import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import notify from "../../context/Notify";
import { formatBytes } from "../../context/cloud";
import { isDemoAsset } from "../../context/utilities";

/**
 * AR-98: "Flat product" tab — wall art, posters, canvases, framed prints, rugs and tiles.
 *
 * Runs entirely in the browser: no AtlasAR Cloud account, no allowance used, the image never leaves
 * this site. three.js is loaded only when the merchant clicks "Make 3D model". The GLB (Android / web)
 * and the USDZ (iPhone) are saved as new Media Library files and become this item's model.
 */
const KIND_LABELS = () => ({
    canvas: __("Canvas print", "ar-vr-3d-model-try-on"),
    poster: __("Poster / paper print", "ar-vr-3d-model-try-on"),
    framed: __("Framed picture", "ar-vr-3d-model-try-on"),
    rug: __("Rug / mat", "ar-vr-3d-model-try-on"),
    tile: __("Tile / panel", "ar-vr-3d-model-try-on"),
});
const DEFAULT_DEPTH = { canvas: 20, poster: 1, framed: 25, rug: 10, tile: 8 };

const ERRORS = () => ({
    invalid_image: __("Choose a JPEG, PNG or WebP image.", "ar-vr-3d-model-try-on"),
    image_too_large: __("The image is too large (over 25 MB or 40 megapixels).", "ar-vr-3d-model-try-on"),
    invalid_size: __("Width and height must be 1–1000 cm, thickness 0.5–200 mm.", "ar-vr-3d-model-try-on"),
});

const loadGenerator = () => import(/* webpackChunkName: "atlas-ar-flat-generator" */ "../flat/flatGenerator.js");

/** Upload one generated file to the Media Library (core REST route, the editor's own nonce). */
async function uploadToMedia(bytes, filename, type, postId) {
    const base = window?.ar_try_on?.api_url || "/wp-json/";
    const form = new FormData();
    form.append("file", new File([bytes], filename, { type }));
    if (postId) form.append("post", String(postId));
    const response = await fetch(`${base}wp/v2/media`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-WP-Nonce": window?.ar_try_on?.rest_nonce || "" },
        body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.source_url) {
        throw new Error(data?.message || __("The file could not be saved to the Media Library.", "ar-vr-3d-model-try-on"));
    }
    return data;
}

function slug(text) {
    return String(text || "flat-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "flat-product";
}

export default function FlatProductPanel({ postId, productModel, setProductModel }) {
    const [image, setImage] = useState(null); // { url, id, title }
    const [kind, setKind] = useState("canvas");
    const [widthCm, setWidthCm] = useState("60");
    const [heightCm, setHeightCm] = useState("40");
    const [depthMm, setDepthMm] = useState(String(DEFAULT_DEPTH.canvas));
    const [frameColor, setFrameColor] = useState("#2b2b2b");
    const [busy, setBusy] = useState("");
    const [result, setResult] = useState(null);
    const labels = KIND_LABELS();

    const chooseImage = () => {
        if (!window.wp?.media) return;
        const frame = window.wp.media({
            title: __("Choose the product image", "ar-vr-3d-model-try-on"),
            button: { text: __("Use this image", "ar-vr-3d-model-try-on") },
            library: { type: ["image/jpeg", "image/png", "image/webp"] },
            multiple: false,
        });
        frame.on("select", () => {
            const a = frame.state().get("selection").first().toJSON();
            if (!/^image\/(jpeg|png|webp)$/.test(a?.mime || "")) {
                notify(ERRORS().invalid_image, "error");
                return;
            }
            setImage({ url: a.url, id: a.id, title: a.title || "" });
            // Pre-fill the shape from the image so the art is not stretched (the merchant still types the real size).
            if (a.width > 0 && a.height > 0) {
                const w = parseFloat(widthCm) || 60;
                setHeightCm(String(Math.round((w * a.height) / a.width * 10) / 10));
            }
            setResult(null);
        });
        frame.open();
    };

    const changeKind = (next) => {
        setKind(next);
        setDepthMm(String(DEFAULT_DEPTH[next]));
    };

    const generate = async () => {
        if (!image) return;
        const previous = { src: productModel.src, ios_src: productModel.ios_src, ar_placement: productModel.ar_placement, poster: productModel.poster };
        try {
            setBusy(__("Loading the 3D tools…", "ar-vr-3d-model-try-on"));
            const gen = await loadGenerator();
            setBusy(__("Building the model…", "ar-vr-3d-model-try-on"));
            const blob = await fetch(image.url, { credentials: "same-origin" }).then((r) => {
                if (!r.ok) throw new gen.FlatGeneratorError("invalid_image", "");
                return r.blob();
            });
            const picture = await gen.loadImage(new File([blob], "image", { type: blob.type }));
            const options = { kind, widthCm, heightCm, depthMm, frameColor, name: image.title || labels[kind] };
            const glb = await gen.exportGLB(gen.buildModel(picture, options));
            const usdz = await gen.exportUSDZ(gen.buildModel(picture, options));
            const grade = gen.gradeSize(glb.byteLength);

            setBusy(__("Saving to the Media Library…", "ar-vr-3d-model-try-on"));
            const name = `${slug(image.title)}-${kind}-${Math.round(widthCm)}x${Math.round(heightCm)}cm`;
            const glbMedia = await uploadToMedia(glb, `${name}.glb`, "model/gltf-binary", postId);
            const usdzMedia = await uploadToMedia(usdz, `${name}.usdz`, "model/vnd.usdz+zip", postId);

            const placement = gen.KINDS[kind].floor ? "floor" : "wall";
            const next = {
                ...productModel,
                src: glbMedia.source_url,
                ios_src: usdzMedia.source_url,
                ar_placement: placement,
                // The photo is the natural poster; keep one the merchant chose (not the built-in demo).
                poster: !productModel.poster || isDemoAsset(productModel.poster) ? image.url : productModel.poster,
            };
            setProductModel(next);
            window.wp?.hooks?.doAction("atlas_ar_preview_data", next);
            setResult({ glbBytes: glb.byteLength, usdzBytes: usdz.byteLength, grade, previous, placement });
            notify(__("3D model created. Update the item to keep it.", "ar-vr-3d-model-try-on"), "success");
        } catch (error) {
            notify(ERRORS()[error?.code] || error?.message || __("The model could not be created.", "ar-vr-3d-model-try-on"), "error");
        } finally {
            setBusy("");
        }
    };

    const undo = () => {
        if (!result) return;
        const next = { ...productModel, ...result.previous };
        setProductModel(next);
        window.wp?.hooks?.doAction("atlas_ar_preview_data", next);
        setResult(null);
    };

    const field = { width: "100%", maxWidth: "140px", padding: "6px 8px" };
    const label = { display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 };

    return (
        <div className="atlas-ar-flat-product" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
                {__("Turn one photo of wall art, a poster, canvas, framed print, rug or tile into a true-size 3D model for AR. It is made in your browser: free, and the image stays on this site.", "ar-vr-3d-model-try-on")}
            </p>

            <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                {image ? (
                    <img src={image.url} alt="" style={{ width: "96px", height: "96px", objectFit: "cover", border: "1px solid #c3c4c7", borderRadius: "4px" }} />
                ) : null}
                <button type="button" className="button" onClick={chooseImage} disabled={!!busy}>
                    {image ? __("Choose another image", "ar-vr-3d-model-try-on") : __("Choose image", "ar-vr-3d-model-try-on")}
                </button>
            </div>

            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend style={{ fontWeight: 600, fontSize: "13px", marginBottom: "8px" }}>{__("Product type", "ar-vr-3d-model-try-on")}</legend>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="radiogroup">
                    {Object.keys(labels).map((k) => (
                        <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => changeKind(k)} disabled={!!busy}
                            className={kind === k ? "button button-primary" : "button"}>
                            {labels[k]}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={label}>{__("Width (cm)", "ar-vr-3d-model-try-on")}
                    <input type="number" min="1" max="1000" step="0.1" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} style={field} />
                </label>
                <label style={label}>{kind === "rug" ? __("Length (cm)", "ar-vr-3d-model-try-on") : __("Height (cm)", "ar-vr-3d-model-try-on")}
                    <input type="number" min="1" max="1000" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} style={field} />
                </label>
                <label style={label}>{__("Thickness (mm)", "ar-vr-3d-model-try-on")}
                    <input type="number" min="0.5" max="200" step="0.5" value={depthMm} onChange={(e) => setDepthMm(e.target.value)} style={field} />
                </label>
                {kind === "framed" && (
                    <label style={label}>{__("Frame colour", "ar-vr-3d-model-try-on")}
                        <input type="color" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} />
                    </label>
                )}
            </div>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                {kind === "rug"
                    ? __("Shown lying on the floor in AR.", "ar-vr-3d-model-try-on")
                    : __("Shown hanging on a wall in AR. Use the real size of the product, without the frame.", "ar-vr-3d-model-try-on")}
            </p>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="button button-primary" onClick={generate} disabled={!image || !!busy}>
                    {busy || __("Make 3D model", "ar-vr-3d-model-try-on")}
                </button>
                {productModel.src && !result && image && (
                    <span style={{ fontSize: "12px" }}>{__("This replaces the item's current model (you can undo).", "ar-vr-3d-model-try-on")}</span>
                )}
            </div>

            {result && (
                <div role="status" style={{ border: "1px solid #00a32a", background: "#edfaef", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong>{__("Model created and set for this item", "ar-vr-3d-model-try-on")}</strong>
                    <span style={{ fontSize: "13px" }}>
                        {sprintf(
                            /* translators: 1: GLB size, 2: USDZ size */
                            __("GLB %1$s (Android and web) · USDZ %2$s (iPhone and iPad), both in the Media Library.", "ar-vr-3d-model-try-on"),
                            formatBytes(result.glbBytes),
                            formatBytes(result.usdzBytes)
                        )}
                    </span>
                    {result.grade.budget !== "pass" && (
                        <span style={{ fontSize: "13px", color: "#8a2424" }}>{__("The file is large for a product page. A smaller image loads faster.", "ar-vr-3d-model-try-on")}</span>
                    )}
                    <div><button type="button" className="button" onClick={undo}>{__("Undo", "ar-vr-3d-model-try-on")}</button></div>
                </div>
            )}
        </div>
    );
}
