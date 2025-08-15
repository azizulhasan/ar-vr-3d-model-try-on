import { useState, useEffect } from "react";

export default function Integration() {
    const [url, setUrl] = useState("");
    const [authType, setAuthType] = useState("Bearer");
    const [headers, setHeaders] = useState([]);

    // Always keep default Authorization header
    useEffect(() => {
        setHeaders([
            {
                key: "Authorization",
                value:
                    authType === "Basic"
                        ? `Basic `
                        : authType === "Bearer"
                        ? `Bearer `
                        : "",
                fixed: false,
            },
        ]);
    }, [authType]);

    const addHeader = () => {
        setHeaders([...headers, { key: "", value: "", fixed: false }]);
    };

    const removeHeader = (index) => {
        setHeaders(headers.filter((_, i) => i !== index));
    };

    const handleHeaderChange = (index, field, value) => {
        const updated = [...headers];
        updated[index][field] = value;
        setHeaders(updated);
    };

    const handleSave = () => {
        const data = {
            url,
            authType,
            headers,
        };
        console.log("Saved Data:", data);
        alert("Data saved! Check console for details.");
    };

    return (
        <div style={{ maxWidth: "80%", margin: "20px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Integration Settings</h2>

            {/* URL Field */}
            <div style={{ marginBottom: "15px" }}>
                <label>URL:</label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter API URL"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
            </div>

            {/* Auth Type */}
            <div style={{ marginBottom: "15px" }}>
                <label>Auth Type:</label>
                <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                >
                   <option value="Bearer">Bearer Token</option>
                    <option value="Basic">Basic</option>
                   
                </select>
            </div>

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

                {headers.map((header, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                        <input
                            type="text"
                            value={header.key}
                            readOnly={header.fixed}
                            placeholder={header.fixed ? undefined : "Key"}
                            onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                            style={{ flex: 1, padding: "8px" }}
                        />
                        <input
                            type="text"
                            value={header.fixed ? "" : header.value}
                            placeholder={header.fixed ? header.value : "Value"}
                            readOnly={header.fixed}
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
                                    display: index != 0 ? 'block' : 'none'
                                }}
                            >
                                Delete
                        </button>
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <button
                type="button"
                onClick={handleSave}
                style={{
                    marginTop: "20px",
                    padding: "10px 15px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                }}
            >
                Save
            </button>
        </div>
    );
}
