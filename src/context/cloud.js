/**
 * AR-84: AtlasAR Cloud connector — browser client for the plugin's own ar_try_on/v1/cloud/* routes.
 * The API key never passes through here (except once, when the admin pastes it to connect).
 */
import { getURL } from "./utilities";

export async function cloudRequest(method, endpoint, body) {
    const response = await fetch(getURL(endpoint), {
        method,
        credentials: "same-origin",
        headers: {
            "X-WP-Nonce": window?.ar_try_on?.rest_nonce || "",
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
        data = await response.json();
    } catch (e) {
        /* empty body */
    }
    if (!response.ok) {
        const error = new Error(data?.message || "Something went wrong. Please try again.");
        error.code = data?.code || "";
        error.status = response.status;
        throw error;
    }
    return data;
}

/** Status localized on page load (no HTTP call). */
export const initialCloudStatus = () => window?.ar_try_on?.cloud || { available: false, connected: false };

/** Convert a dimensions entry ({ value, unit }) to centimetres; 0 when unknown. */
export function toCentimetres(entry) {
    const value = parseFloat(entry?.value);
    if (!(value > 0)) return 0;
    const factor = { mm: 0.1, cm: 1, m: 100, in: 2.54, inch: 2.54, ft: 30.48 }[String(entry?.unit || "cm").toLowerCase()];
    return factor ? Math.round(value * factor * 100) / 100 : 0;
}

export function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / 1024 ** i).toFixed(2))} ${units[i]}`;
}
