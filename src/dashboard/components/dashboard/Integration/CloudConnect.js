import React, { useState } from "react";
import { __ } from "@wordpress/i18n";
import notify from "../../../../context/Notify";
import { cloudRequest, initialCloudStatus } from "../../../../context/cloud";

/**
 * AR-84: AtlasAR Cloud connection card (Integration tab).
 *
 * Saves through its own routes, not the dashboard Save bar: the key is checked with the service,
 * stored encrypted on the server and never sent back (only a masked hint is shown).
 */
export default function CloudConnect() {
    const [status, setStatus] = useState(initialCloudStatus());
    const [apiKey, setApiKey] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!status.available) {
        return null; // The site has not configured an AtlasAR Cloud URL: nothing to show.
    }

    const run = async (fn, success) => {
        setBusy(true);
        try {
            const next = await fn();
            setStatus(next);
            if (success) notify(success, "success");
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setBusy(false);
        }
    };

    const connect = (event) => {
        event.preventDefault();
        run(async () => {
            const next = await cloudRequest("POST", "cloud/connect", { api_key: apiKey.trim(), accept_terms: accepted });
            setApiKey("");
            return next;
        }, __("AtlasAR Cloud connected.", "ar-vr-3d-model-try-on"));
    };

    const disconnect = () => {
        if (!window.confirm(__("Disconnect AtlasAR Cloud? Models already saved in the Media Library stay.", "ar-vr-3d-model-try-on"))) return;
        run(() => cloudRequest("DELETE", "cloud/connect"), __("AtlasAR Cloud disconnected.", "ar-vr-3d-model-try-on"));
    };

    const refresh = () => run(() => cloudRequest("GET", "cloud/status?refresh=1"), __("Connection works.", "ar-vr-3d-model-try-on"));

    const box = { padding: "20px", border: "1px solid #ccc", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)", marginBottom: "20px" };
    const input = { width: "100%", maxWidth: "420px", padding: "8px", fontFamily: "monospace" };

    return (
        <div style={box} className="atlas-ar-cloud-connect">
            <h2 style={{ color: "var(--theme-text)", marginTop: 0 }}>{__("AtlasAR Cloud", "ar-vr-3d-model-try-on")}</h2>
            <p style={{ marginTop: 0 }}>
                {__("Optimize models on AtlasAR Cloud: smaller GLB files at the real product size, made for fast pages and AR. Your model file is sent to AtlasAR Cloud only when you click “Optimize with AtlasAR Cloud” on an item.", "ar-vr-3d-model-try-on")}
            </p>

            {status.connected ? (
                <div className="art-flex art-flex-wrap art-items-center art-gap-4">
                    <span>✅ {__("Connected", "ar-vr-3d-model-try-on")}</span>
                    <span>
                        {__("Plan:", "ar-vr-3d-model-try-on")} <strong>{status.plan || "—"}</strong>
                    </span>
                    <span>
                        {__("Models this month:", "ar-vr-3d-model-try-on")}{" "}
                        <strong>
                            {status.limit === null || status.limit === undefined
                                ? `${status.used} (${__("no monthly limit", "ar-vr-3d-model-try-on")})`
                                : `${status.used} / ${status.limit}`}
                        </strong>
                    </span>
                    <button type="button" className="button" onClick={refresh} disabled={busy}>
                        {__("Test connection", "ar-vr-3d-model-try-on")}
                    </button>
                    <button type="button" className="button button-link-delete" onClick={disconnect} disabled={busy}>
                        {__("Disconnect", "ar-vr-3d-model-try-on")}
                    </button>
                </div>
            ) : (
                <form onSubmit={connect} className="art-flex art-flex-wrap art-items-center art-gap-3">
                    <label htmlFor="atlas-ar-cloud-key" className="screen-reader-text">
                        {__("AtlasAR Cloud API key", "ar-vr-3d-model-try-on")}
                    </label>
                    <input
                        id="atlas-ar-cloud-key"
                        type="password"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="ar_live_…"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        style={input}
                    />
                    <label className="art-flex art-items-start art-gap-2" style={{ flexBasis: "100%" }}>
                        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                        <span>
                            {__("I agree that, when I click “Optimize with AtlasAR Cloud”, the model file is sent to AtlasAR Cloud (AtlasAiDev), and I accept its terms of service and privacy policy.", "ar-vr-3d-model-try-on")}
                        </span>
                    </label>
                    <button type="submit" className="button button-primary" disabled={busy || !apiKey.trim() || !accepted}>
                        {busy ? __("Checking…", "ar-vr-3d-model-try-on") : __("Connect", "ar-vr-3d-model-try-on")}
                    </button>
                </form>
            )}
        </div>
    );
}
