import { useEffect, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import notify from "../../context/Notify";
import { cloudRequest, formatBytes, initialCloudStatus, toCentimetres } from "../../context/cloud";

const POLL_MS = 3000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

/**
 * AR-84: "Optimize with AtlasAR Cloud" (metabox, next to Model Compression).
 *
 * Same pattern as the compression panel: the optimized GLB becomes the model in the form, and it is
 * kept when the item is updated. The result is a NEW Media Library file; Undo switches back.
 */
export default function CloudOptimizePanel({ postId, productModel, setProductModel }) {
    const cloud = initialCloudStatus();
    const dims = productModel?.dimensions || {};
    const [height, setHeight] = useState(() => {
        // Only dimensions the merchant typed (manual mode) are a real size. In "auto" mode they are
        // read from the model itself (or are placeholders), which is exactly what may be wrong.
        if (dims?.mode !== "manual") return "";
        const cm = toCentimetres({ value: dims?.height?.value, unit: dims?.height?.unit || dims?.unit });
        return cm ? String(cm) : "";
    });
    const [job, setJob] = useState(null);
    const [busy, setBusy] = useState(false);
    const [previousSrc, setPreviousSrc] = useState("");
    const timer = useRef(null);
    const startedAt = useRef(0);

    useEffect(() => () => clearTimeout(timer.current), []);

    // Resume a job that was still running when the page was reloaded.
    useEffect(() => {
        if (!cloud.available || !cloud.connected || !postId) return;
        cloudRequest("GET", `cloud/optimize/${postId}`)
            .then((data) => {
                if (data.status === "processing" && data.kind !== "generate") { // AR-97: photo jobs belong to the Photo to 3D tab
                    setJob(data);
                    startedAt.current = Date.now();
                    schedule();
                }
            })
            .catch(() => {});
    }, [postId]);

    if (!cloud.available) return null;

    function schedule() {
        clearTimeout(timer.current);
        timer.current = setTimeout(poll, POLL_MS);
    }

    async function poll() {
        try {
            const data = await cloudRequest("GET", `cloud/optimize/${postId}`);
            finish(data);
        } catch (error) {
            // Temporary trouble (network / rate limit): keep polling until the time limit.
            if (Date.now() - startedAt.current < POLL_LIMIT_MS) schedule();
            else {
                setBusy(false);
                notify(error.message, "error");
            }
        }
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
            setPreviousSrc(productModel.src);
            useModel(data.src);
            notify(__("Optimized model ready. Update the item to keep it.", "ar-vr-3d-model-try-on"), "success");
        } else if (data.status === "failed") {
            notify(data.error || __("AtlasAR Cloud could not optimize this model.", "ar-vr-3d-model-try-on"), "error");
        }
    }

    // Same as the compression panel: update the form and refresh the 3D preview.
    function useModel(src) {
        const next = { ...productModel, src };
        setProductModel(next);
        window.wp?.hooks?.doAction("atlas_ar_preview_data", next);
    }

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
            finish(await cloudRequest("POST", `cloud/optimize/${postId}`, { src: productModel.src, height_cm: cm }));
        } catch (error) {
            setBusy(false);
            setJob(null);
            notify(error.message, "error");
        }
    }

    function undo() {
        useModel(previousSrc);
        setPreviousSrc("");
        notify(__("Switched back to the original model. Update the item to keep it.", "ar-vr-3d-model-try-on"), "info");
    }

    const panel = "atlas-ar-cloud-panel art-p-4 art-border art-border-gray-300 art-rounded-md art-bg-white art-mt-3";
    const button = "art-px-4 art-py-2 art-bg-blue-600 art-text-white art-text-sm art-font-medium art-rounded-md hover:art-bg-blue-700 disabled:art-bg-gray-400 disabled:art-cursor-not-allowed";

    return (
        <div className={panel}>
            <h4 className="art-text-sm art-font-semibold art-text-gray-900 art-mb-2">
                {__("AtlasAR Cloud", "ar-vr-3d-model-try-on")}
            </h4>

            {!cloud.connected ? (
                <p className="art-text-sm art-text-gray-600 art-m-0">
                    {__("Connect AtlasAR Cloud in AtlasAR → Integration to optimize this model: a smaller GLB at the real product size.", "ar-vr-3d-model-try-on")}
                </p>
            ) : (
                <>
                    <p className="art-text-sm art-text-gray-600 art-mt-0 art-mb-3">
                        {__("Sends this GLB to AtlasAR Cloud and saves a smaller copy at the real size as a new Media Library file. The original file stays.", "ar-vr-3d-model-try-on")}
                    </p>
                    <div className="art-flex art-flex-wrap art-items-end art-gap-3">
                        <label className="art-text-sm">
                            {__("Real height (cm)", "ar-vr-3d-model-try-on")}
                            <input
                                type="number"
                                min="0.1"
                                max="1000"
                                step="0.1"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                disabled={busy}
                                className="art-block art-mt-1"
                                style={{ width: "120px" }}
                            />
                        </label>
                        <button type="button" className={button} onClick={start} disabled={busy || !productModel?.src}>
                            {busy ? __("Optimizing…", "ar-vr-3d-model-try-on") : __("Optimize with AtlasAR Cloud", "ar-vr-3d-model-try-on")}
                        </button>
                        {previousSrc && !busy && (
                            <button type="button" className="button" onClick={undo}>
                                {__("Undo", "ar-vr-3d-model-try-on")}
                            </button>
                        )}
                    </div>
                    {busy && (
                        <p className="art-text-xs art-text-gray-500 art-mt-2 art-mb-0" role="status">
                            {__("Optimizing on AtlasAR Cloud… this usually takes under a minute.", "ar-vr-3d-model-try-on")}
                        </p>
                    )}
                    {!busy && job?.status === "ready" && job.result_size > 0 && (
                        <p className="art-text-xs art-text-gray-600 art-mt-2 art-mb-0" role="status">
                            {formatBytes(job.source_size)} → <strong>{formatBytes(job.result_size)}</strong>
                            {job.source_size > 0 && job.result_size < job.source_size
                                ? ` (${Math.round((1 - job.result_size / job.source_size) * 100)}% ${__("smaller", "ar-vr-3d-model-try-on")})`
                                : ` — ${__("this model was already small; the new file is scaled to the real size.", "ar-vr-3d-model-try-on")}`}
                        </p>
                    )}
                    {!busy && job?.status === "failed" && job.error && (
                        <p className="art-text-xs art-text-red-600 art-mt-2 art-mb-0" role="alert">{job.error}</p>
                    )}
                </>
            )}
        </div>
    );
}
