import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import notify from "../../context/Notify";
import CompressionPanel from "./CompressionPanel.js";
import CloudOptimizePanel from "./CloudOptimizePanel.js";
import FlatProductPanel from "./FlatProductPanel.js";
import PhotoTo3DPanel from "./PhotoTo3DPanel.js";
import { initialCloudStatus } from "../../context/cloud";
import { isDemoAsset } from "../../context/utilities";

/**
 * AR-98: one "3D model tools" panel with tabs (approved mockup, Metabox artboard).
 *
 * Optimize GLB — the existing compression panel + AtlasAR Cloud optimize (needs a model).
 * Flat product — the in-browser generator (always available, no model or account needed).
 * Photo to 3D — AtlasAR Cloud (AR-97); only when the site has a service address.
 * Extra tabs are added through the `atlas_ar_model_tools_tabs` filter.
 */
export default function ModelToolsPanel({ postId, productModel, setProductModel }) {
    const hasModel = !!productModel.src;
    // New items start with the built-in demo model: that is not the merchant's own model yet.
    const ownModel = hasModel && !isDemoAsset(productModel.src);
    const [tab, setTab] = useState(ownModel ? "optimize" : "flat");
    const [picked, setPicked] = useState(false);
    // Saved settings arrive after the first render: open Optimize once a model is there, unless the
    // merchant has already used the panel (e.g. just made a model in the Flat tab: stay there).
    useEffect(() => {
        if (ownModel && !picked) setTab("optimize");
    }, [ownModel]);

    const baseTabs = [
        {
            id: "optimize",
            label: __("Optimize GLB", "ar-vr-3d-model-try-on"),
            render: () =>
                hasModel ? (
                    <>
                        <CompressionPanel
                            postId={postId}
                            modelFile={productModel.src}
                            productModel={productModel}
                            setProductModel={setProductModel}
                            onCompressionComplete={() => notify(__("Model compressed successfully!", "ar-vr-3d-model-try-on"), "success")}
                        />
                        {/* AR-84: AtlasAR Cloud optimize (hidden while the site has no service URL). */}
                        <CloudOptimizePanel postId={postId} productModel={productModel} setProductModel={setProductModel} />
                    </>
                ) : (
                    <p style={{ margin: 0 }}>{__("Add a 3D model first (above), or make one in the Flat product tab.", "ar-vr-3d-model-try-on")}</p>
                ),
        },
        {
            id: "flat",
            label: __("Flat product (free)", "ar-vr-3d-model-try-on"),
            render: () => <FlatProductPanel postId={postId} productModel={productModel} setProductModel={setProductModel} />,
        },
        ...(initialCloudStatus().available
            ? [{
                id: "photo",
                label: __("Photo to 3D", "ar-vr-3d-model-try-on"),
                render: () => <PhotoTo3DPanel postId={postId} productModel={productModel} setProductModel={setProductModel} />,
            }]
            : []),
    ];
    const filtered = window.wp?.hooks ? window.wp.hooks.applyFilters("atlas_ar_model_tools_tabs", baseTabs, { postId, productModel, setProductModel }) : baseTabs;
    const tabs = Array.isArray(filtered) ? filtered.filter((t) => t && t.id && typeof t.render === "function") : baseTabs;
    const current = tabs.find((t) => t.id === tab) || tabs[0];

    return (
        <div className="atlas-ar-model-tools" onPointerDownCapture={() => setPicked(true)} onKeyDownCapture={() => setPicked(true)} style={{ border: "1px solid #c3c4c7", background: "#fff", margin: "12px 0" }}>
            <div role="tablist" aria-label={__("3D model tools", "ar-vr-3d-model-try-on")} style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid #c3c4c7" }}>
                {tabs.map((t) => {
                    const active = t.id === current.id;
                    return (
                        <button key={t.id} type="button" role="tab" id={`atlas-ar-tools-tab-${t.id}`} aria-selected={active} aria-controls={`atlas-ar-tools-panel-${t.id}`}
                            onClick={() => setTab(t.id)}
                            style={{ padding: "12px 16px", border: 0, borderBottom: active ? "3px solid #0e6b5c" : "3px solid transparent", background: "transparent", fontWeight: active ? 600 : 400, cursor: "pointer", color: "#1d2327", minHeight: "44px" }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>
            <div role="tabpanel" id={`atlas-ar-tools-panel-${current.id}`} aria-labelledby={`atlas-ar-tools-tab-${current.id}`} style={{ padding: "16px" }}>
                {current.render()}
            </div>
        </div>
    );
}
