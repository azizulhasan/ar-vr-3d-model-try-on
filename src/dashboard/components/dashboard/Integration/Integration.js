import { useState, useEffect } from "react";
import Settings from "../settings/Settings";

export default function Integration({ handleHeaderChange, handleChange, settings, setHeaders, authType, setAuthType, setSettings }) {

    // Always keep default Authorization header
    useEffect(() => {
        // setHeaders([
        //     {
        //         key: "Authorization",
        //         value:
        //             authType === "Basic"
        //                 ? `Basic `
        //                 : authType === "Bearer"
        //                     ? `Bearer `
        //                     : "",
        //         fixed: false,
        //     },
        // ]);
    }, []);

    const addHeader = () => {
        let tempSettings = structuredClone(settings)
        let headers = tempSettings.ar_try_on_exclude_integration_api_headers;
        headers.push({ key: "", value: "", })
        console.log(tempSettings, headers)
        setSettings({
            ...tempSettings, ...{ ar_try_on_exclude_integration_api_headers: headers }
        });
    };

    const removeHeader = (index) => {
        let tempSettings = structuredClone(settings)
        let headers = tempSettings.ar_try_on_exclude_integration_api_headers;
        headers = headers.filter((_, i) => i !== index)
        setSettings({
            ...tempSettings, ...{ ar_try_on_exclude_integration_api_headers: headers }
        });
    };

    return (
        <div style={{ maxWidth: "80%", margin: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Integration Settings</h2>

            {/* URL Field */}
            <div style={{ marginBottom: "15px" }}>
                <label>URL:</label>
                <input
                    type="text"
                    name="ar_try_on_exclude_integration_api_url"
                    id="ar_try_on_exclude_integration_api_url"
                    value={settings.ar_try_on_exclude_integration_api_url}
                    onChange={(e) => handleChange(e)}
                    placeholder="Enter API URL"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
            </div>

            {/* Auth Type */}
            {/* <div style={{ marginBottom: "15px" }}>
                <label>Auth Type:</label>
                <select
                    value={authType}
                    name="authType"
                    id="authType"
                    onChange={(e) => handleChange(e)}
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                >
                    <option value="Bearer">Bearer Token</option>
                    <option value="Basic">Basic</option>

                </select>
            </div> */}

            {/* Headers Section */}
            <div>
                <button
                    type="button"
                    onClick={addHeader}
                    style={{
                        padding: "8px 12px",
                        marginBottom: "10px",
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Add Header
                </button>

                {settings.ar_try_on_exclude_integration_api_headers.map((header, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                        <input
                            type="text"
                            value={header.key}
                            id={header.key}
                            name={header.key}
                            placeholder={"Key"}
                            onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                            style={{ flex: 1, padding: "8px" }}
                        />
                        <input
                            type="text"
                            value={header.value}
                            placeholder={"Value"}
                            onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                            style={{ flex: 1, padding: "8px" }}
                        />
                        <button
                            type="button"
                            onClick={() => removeHeader(index)}
                            style={{
                                padding: "8px 12px",
                                background: "#f44336",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                visibility: index != 0 ? 'visible' : 'hidden'
                            }}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
