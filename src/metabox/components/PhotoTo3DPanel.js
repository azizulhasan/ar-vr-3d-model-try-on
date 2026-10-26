import { useEffect, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import notify from "../../context/Notify";
import { cloudRequest, initialCloudStatus } from "../../context/cloud";

const POLL_MS = 3000;
const POLL_LIMIT_MS = 15 * 60 * 1000;
const UNITS = 10; // product.config.js hosting.units.generate

/**
 * AR-97: "Photo to 3D" tab — one product photo becomes a 3D model on AtlasAR Cloud (GPU).
 *
 * A service feature of the Premium plan (an AtlasAR Pro licence seat makes the site Premium): the
 * service decides, this tab only shows the right state. The photo is sent only on click; the
 * finished GLB is saved once as a new Media Library file (webhook or polling, same job as Optimize).
 */
export default function PhotoTo3DPanel({ postId, productModel, setProductModel }) {
    const cloud = initialCloudStatus();
    const [photo, setPhoto] = useState(null); // { id, url }
    const [height, setHeight] = useState("");
    const [busy, setBusy] = useState(false);
    const [job, setJob] = useState(null);
    const [previous, setPrevious] = useState(null);
    const timer = useRef(null);
    const startedAt = useRef(0);

    useEffect(() => () => clearTimeout(timer.current), []);

    // Resume a photo job that was still running when the page was reloaded.
    useEffect(() => {
        if (!cloud.connected || !postId) return;
        cloudRequest("GET", `cloud/optimize/${postId}`)
            .then((data) => {
                if (data.status === "processing" && data.kind === "generate") {
                    setJob(data);
                    setBusy(true);
                    startedAt.current = Date.now();
                    schedule();
                }
            })
            .catch(() => {});
    }, [postId]);

    function schedule() {
        clearTimeout(timer.current);
        timer.current = setTimeout(poll, POLL_MS);
    }

    async function poll() {
        try {
            finish(await cloudRequest("GET", `cloud/optimize/${postId}`));
        } catch (error) {
            if (Date.now() - startedAt.current < POLL_LIMIT_MS) schedule();
            else {
                setBusy(false);
                notify(error.message, "error");
            }
        }
    }

    function apply(values) {
        const next = { ...productModel, ...values };
        setProductModel(next);
        window.wp?.hooks?.doAction("atlas_ar_preview_data", next);
    }

    function finish(data) {
        setJob(data);
        if (data.status === "processing") {
            if (Date.now() - startedAt.current < POLL_LIMIT_MS) return schedule();
            setBusy(false);
            return notify(__("AtlasAR Cloud is taking longer than usual. Reload the page later to see the result.", "ar-vr-3d-model-try-on"), "warn");
        }
        setBusy(false);
        if (data.status === "ready" && data.src) {
            setPrevious({ src: productModel.src, ios_src: productModel.ios_src });
            // No USDZ from the service: clear an old one so iPhones never show a different model
            // (the viewer converts the GLB for Quick Look).
            apply({ src: data.src, ios_src: "" });
            notify(__("3D model ready. Update the item to keep it.", "ar-vr-3d-model-try-on"), "success");
        } else if (data.status === "failed") {
            notify(data.error || __("AtlasAR Cloud could not make a 3D model from this photo.", "ar-vr-3d-model-try-on"), "error");
        }
    }

    const choosePhoto = () => {
        if (!window.wp?.media) return;
        const frame = window.wp.media({
            title: __("Choose the product photo", "ar-vr-3d-model-try-on"),
            button: { text: __("Use this photo", "ar-vr-3d-model-try-on") },
            library: { type: ["image/jpeg", "image/png", "image/webp"] },
            multiple: false,
        });
        frame.on("select", () => {
            const a = frame.state().get("selection").first().toJSON();
            if (!/^image\/(jpeg|png|webp)$/.test(a?.mime || "")) {
                notify(__("Choose a JPEG, PNG or WebP photo.", "ar-vr-3d-model-try-on"), "error");
                return;
            }
            setPhoto({ id: a.id, url: a.sizes?.medium?.url || a.url });
        });
        frame.open();
    };

    async function start() {
        const cm = parseFloat(height);
        if (!(cm > 0 && cm <= 1000)) {
            notify(__("Enter the real height of the product in cm (0.1–1000).", "ar-vr-3d-model-try-on"), "warn");
            return;
        }
        setBusy(true);
        setJob({ status: "processing" });
        startedAt.current = Date.now();
        try {
            finish(await cloudRequest("POST", `cloud/generate/${postId}`, { image_id: photo.id, height_cm: cm }));
        } catch (error) {
            setBusy(false);
            setJob(null);
            notify(error.message, "error");
        }
    }

    function undo() {
        apply(previous);
        setPrevious(null);
    }

    const box = { border: "1px solid #c3c4c7", background: "#f6f7f7", padding: "12px 14px", margin: 0, lineHeight: 1.55 };
    const intro = (
        <p style={{ margin: 0, lineHeight: 1.55 }}>
            {__("Turn one product photo into a 3D model with AI, at the real size, for the web and AR. Works best for a single object on a plain background.", "ar-vr-3d-model-try-on")}
        </p>
    );

    if (!cloud.connected) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {intro}
                <p style={box}>{__("Connect AtlasAR Cloud in AtlasAR → Integration to use Photo to 3D.", "ar-vr-3d-model-try-on")}</p>
            </div>
        );
    }
    if (cloud.plan !== "premium") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {intro}
                <div style={box}>
                    <strong>{__("Photo to 3D is part of AtlasAR Pro.", "ar-vr-3d-model-try-on")}</strong>{" "}
                    {__("Each site with an AtlasAR Pro licence is Premium on AtlasAR Cloud: no monthly limit, unlimited hosted models and photo to 3D.", "ar-vr-3d-model-try-on")}
                    {cloud.dashboard_url && (
                        <div style={{ marginTop: "10px" }}>
                            <a className="button button-primary" href={`${cloud.dashboard_url}plans`} target="_blank" rel="noopener noreferrer">{__("See plans", "ar-vr-3d-model-try-on")}</a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="atlas-ar-photo-to-3d" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {intro}
            <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                {photo && <img src={photo.url} alt="" style={{ width: "96px", height: "96px", objectFit: "cover", border: "1px solid #c3c4c7", borderRadius: "4px" }} />}
                <button type="button" className="button" onClick={choosePhoto} disabled={busy}>
                    {photo ? __("Choose another photo", "ar-vr-3d-model-try-on") : __("Choose photo", "ar-vr-3d-model-try-on")}
                </button>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                {__("Real height (cm)", "ar-vr-3d-model-try-on")}
                <input type="number" min="0.1" max="1000" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} disabled={busy} style={{ width: "140px", padding: "6px 8px" }} />
            </label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="button button-primary" onClick={start} disabled={!photo || busy}>
                    {busy ? __("Making the model…", "ar-vr-3d-model-try-on") : __("Make 3D model", "ar-vr-3d-model-try-on")}
                </button>
                <span style={{ fontSize: "12px", opacity: 0.8 }}>
                    {sprintf(/* translators: %d: number of models */ __("Uses %d models of your allowance. Nothing is used if it fails.", "ar-vr-3d-model-try-on"), UNITS)}
                </span>
                {previous && !busy && <button type="button" className="button" onClick={undo}>{__("Undo", "ar-vr-3d-model-try-on")}</button>}
            </div>
            {busy && (
                <p style={{ margin: 0, fontSize: "12px" }} role="status">
                    {__("Making the 3D model on AtlasAR Cloud… this usually takes one to three minutes. You can keep editing.", "ar-vr-3d-model-try-on")}
                </p>
            )}
            {!busy && job?.status === "failed" && job.error && (
                <p style={{ margin: 0, fontSize: "12px", color: "#b32d2e" }} role="alert">{job.error}</p>
            )}
        </div>
    );
}
