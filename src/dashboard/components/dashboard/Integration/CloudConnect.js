import React, { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import notify from "../../../../context/Notify";
import { cloudRequest, initialCloudStatus } from "../../../../context/cloud";

/**
 * AR-84 / AR-93: AtlasAR Cloud card (Integration tab), as in the approved mockup.
 *
 * Three states: sign up with an email (or paste an existing key), waiting for the account
 * owner's approval, connected. Saves through its own routes, not the dashboard Save bar: the key
 * is made or checked by the service, stored encrypted on the server and never sent back.
 *
 * AR-105: `embedded` (the setup wizard's step) leaves out the card's own heading and margin.
 */
export default function CloudConnect({ embedded = false }) {
    const [status, setStatus] = useState(initialCloudStatus());
    const [email, setEmail] = useState(window?.ar_try_on?.admin_email || "");
    const [apiKey, setApiKey] = useState("");
    const [useKey, setUseKey] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!status.available) {
        return null; // The site has no AtlasAR Cloud address: nothing to show.
    }

    const run = async (fn, success) => {
        setBusy(true);
        try {
            const next = await fn();
            setStatus(next);
            if (success) notify(typeof success === "function" ? success(next) : success, "success");
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setBusy(false);
        }
    };

    const signUp = (event) => {
        event.preventDefault();
        run(() => cloudRequest("POST", "cloud/register", { email: email.trim(), accept_terms: accepted }),
            (next) => (next.pending ? __("Check your inbox to approve this site.", "ar-vr-3d-model-try-on") : __("AtlasAR Cloud connected.", "ar-vr-3d-model-try-on")));
    };
    const connectKey = (event) => {
        event.preventDefault();
        run(async () => {
            const next = await cloudRequest("POST", "cloud/connect", { api_key: apiKey.trim(), accept_terms: accepted });
            setApiKey("");
            return next;
        }, __("AtlasAR Cloud connected.", "ar-vr-3d-model-try-on"));
    };
    const recheck = () => run(() => cloudRequest("POST", "cloud/recheck"),
        (next) => (next.connected ? __("Approved. AtlasAR Cloud is connected.", "ar-vr-3d-model-try-on") : __("Not approved yet.", "ar-vr-3d-model-try-on")));
    const disconnect = () => {
        if (!window.confirm(__("Disconnect AtlasAR Cloud? Models already saved in the Media Library stay.", "ar-vr-3d-model-try-on"))) return;
        run(() => cloudRequest("DELETE", "cloud/connect"), __("AtlasAR Cloud disconnected.", "ar-vr-3d-model-try-on"));
    };

    const card = { padding: "24px 28px", border: "1px solid #c3c4c7", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)", marginBottom: embedded ? 0 : "20px", display: "flex", flexDirection: "column", gap: "14px" };
    const field = { width: "100%", maxWidth: "460px", padding: "8px 10px", fontSize: "14px" };
    const percent = status.limit ? Math.min(100, Math.round((status.used / status.limit) * 100)) : 0;
    const planLabel = status.plan === "premium" ? __("Premium", "ar-vr-3d-model-try-on") : __("Free", "ar-vr-3d-model-try-on");

    const agreement = (
        <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", lineHeight: 1.5, maxWidth: "620px" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: "3px" }} />
            <span>{__("I agree that model files and product photos are sent to AtlasAR Cloud (AtlasAiDev) only when I click Optimize or Make 3D model, and I accept its terms of service and privacy policy.", "ar-vr-3d-model-try-on")}</span>
        </label>
    );

    return (
        <div style={card} className="atlas-ar-cloud-connect">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                {!embedded && <h2 style={{ color: "var(--theme-text)", margin: 0 }}>{__("AtlasAR Cloud", "ar-vr-3d-model-try-on")}</h2>}
                {!status.connected && !status.pending && (
                    <span style={{ fontSize: "12px", background: "#dcfce7", color: "#14532d", padding: "2px 8px", borderRadius: "10px" }}>
                        {__("Free plan: 20 models a month", "ar-vr-3d-model-try-on")}
                    </span>
                )}
            </div>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
                {__("Optimize 3D models at their real size and host them for fast pages and AR. A model file or product photo is sent to AtlasAR Cloud only when you click “Optimize with AtlasAR Cloud” or “Make 3D model” (Photo to 3D) on an item.", "ar-vr-3d-model-try-on")}
            </p>

            {!status.connected && !status.pending && !useKey && (
                <form onSubmit={signUp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label htmlFor="atlas-ar-cloud-email" style={{ fontWeight: 600, fontSize: "13px" }}>
                        {__("Email for your AtlasAR Cloud account", "ar-vr-3d-model-try-on")}
                    </label>
                    <input id="atlas-ar-cloud-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} required />
                    {agreement}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <button type="submit" className="button button-primary" disabled={busy || !email.trim() || !accepted}>
                            {busy ? __("Connecting…", "ar-vr-3d-model-try-on") : __("Connect this site", "ar-vr-3d-model-try-on")}
                        </button>
                        <button type="button" className="button-link" onClick={() => setUseKey(true)}>
                            {__("I already have an API key", "ar-vr-3d-model-try-on")}
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                        {__("New email: you are connected at once on the Free plan. An email that already has an account: we email its owner a link to approve this site.", "ar-vr-3d-model-try-on")}
                    </p>
                </form>
            )}

            {!status.connected && !status.pending && useKey && (
                <form onSubmit={connectKey} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label htmlFor="atlas-ar-cloud-key" style={{ fontWeight: 600, fontSize: "13px" }}>{__("AtlasAR Cloud API key", "ar-vr-3d-model-try-on")}</label>
                    <input id="atlas-ar-cloud-key" type="password" autoComplete="off" spellCheck="false" placeholder="ar_live_…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ ...field, fontFamily: "monospace" }} />
                    {agreement}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <button type="submit" className="button button-primary" disabled={busy || !apiKey.trim() || !accepted}>
                            {busy ? __("Checking…", "ar-vr-3d-model-try-on") : __("Connect", "ar-vr-3d-model-try-on")}
                        </button>
                        <button type="button" className="button-link" onClick={() => setUseKey(false)}>{__("Sign up with an email instead", "ar-vr-3d-model-try-on")}</button>
                    </div>
                </form>
            )}

            {status.pending && (
                <div style={{ border: "1px solid #f0c33c", background: "#fcf9e8", color: "#1d2327", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "660px" }} role="status">
                    <strong>{__("Waiting for approval", "ar-vr-3d-model-try-on")}</strong>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.55 }}>
                        {sprintf(
                            /* translators: %s: the account email */
                            __("%s already has an AtlasAR Cloud account. We emailed it a link to approve this site. Click Approve in that email, then check again here.", "ar-vr-3d-model-try-on"),
                            status.email
                        )}
                    </p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button type="button" className="button button-primary" onClick={recheck} disabled={busy}>{__("I approved it, check again", "ar-vr-3d-model-try-on")}</button>
                        <button type="button" className="button" onClick={disconnect} disabled={busy}>{__("Use another email", "ar-vr-3d-model-try-on")}</button>
                    </div>
                </div>
            )}

            {status.connected && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
                        <span>✅ {status.email
                            ? sprintf(/* translators: %s: account email */ __("Connected as %s", "ar-vr-3d-model-try-on"), status.email)
                            : __("Connected", "ar-vr-3d-model-try-on")}</span>
                        <span>{__("Plan:", "ar-vr-3d-model-try-on")} <strong>{planLabel}</strong></span>
                        <span>{__("Instant updates:", "ar-vr-3d-model-try-on")} <strong>{status.webhook ? __("on", "ar-vr-3d-model-try-on") : __("off", "ar-vr-3d-model-try-on")}</strong></span>
                    </div>
                    {!status.usage_known && (
                        <p style={{ margin: 0, fontSize: "13px" }}>{__("Click “Test connection” to load this month's usage.", "ar-vr-3d-model-try-on")}</p>
                    )}
                    {status.usage_known && <div style={{ maxWidth: "520px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                            <span>{__("Models this month", "ar-vr-3d-model-try-on")}</span>
                            <strong>{status.limit === null || status.limit === undefined ? `${status.used} (${__("no monthly limit", "ar-vr-3d-model-try-on")})` : `${status.used} / ${status.limit}`}</strong>
                        </div>
                        {status.limit ? (
                            <div style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }} role="progressbar" aria-valuemin={0} aria-valuemax={status.limit} aria-valuenow={status.used} aria-label={__("Models used this month", "ar-vr-3d-model-try-on")}>
                                <div style={{ width: `${percent}%`, height: "8px", background: percent >= 100 ? "#b32d2e" : "#0e6b5c" }} />
                            </div>
                        ) : null}
                        {status.resets_at && (
                            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "6px" }}>
                                {sprintf(/* translators: %s: date */ __("Renews on %s.", "ar-vr-3d-model-try-on"), new Date(status.resets_at).toLocaleDateString())}
                            </div>
                        )}
                    </div>}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {status.plan !== "premium" && status.dashboard_url && (
                            <a className="button button-primary" href={`${status.dashboard_url}plans`} target="_blank" rel="noopener noreferrer">{__("Upgrade to Pro", "ar-vr-3d-model-try-on")}</a>
                        )}
                        {status.dashboard_url && (
                            <a className="button" href={status.dashboard_url} target="_blank" rel="noopener noreferrer">{__("Open dashboard", "ar-vr-3d-model-try-on")}</a>
                        )}
                        <button type="button" className="button" onClick={recheck} disabled={busy}>{__("Test connection", "ar-vr-3d-model-try-on")}</button>
                        <button type="button" className="button button-link-delete" onClick={disconnect} disabled={busy}>{__("Disconnect", "ar-vr-3d-model-try-on")}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
