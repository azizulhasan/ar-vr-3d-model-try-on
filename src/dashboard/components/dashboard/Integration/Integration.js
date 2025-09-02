import {useState, useEffect} from "react";
import Settings from "../settings/Settings";
import {getAPITypes} from "../../../../context/utilities";

export default function Integration({
                                        handleHeaderChange,
                                        handleChange,
                                        settings,
                                        setHeaders,
                                        authType,
                                        setAuthType,
                                        setSettings,
                                        currentApi,
                                        allApi,
                                    }) {

    const [previousHeaders, setPreviousHeaders] = useState(null)
    const addHeader = () => {
        let tempSettings = structuredClone(settings)
        let headers = tempSettings.ar_try_on_exclude_integration_api_headers;
        headers.push({key: "", value: "",})
        setSettings({
            ...tempSettings, ...{ar_try_on_exclude_integration_api_headers: headers}
        });
    };

    const removeHeader = (index) => {
        let tempSettings = structuredClone(settings)
        let headers = tempSettings.ar_try_on_exclude_integration_api_headers;
        headers = headers.filter((_, i) => i !== index)
        setSettings({
            ...tempSettings, ...{ar_try_on_exclude_integration_api_headers: headers}
        });
    };



    useEffect(() => {
        if(!previousHeaders && settings?.ar_try_on_exclude_integration_api_url !== '') {
            setPreviousHeaders({
                api_name:settings?.ar_try_on_exclude_integration_api_name || currentApi.id,
                headers: settings?.ar_try_on_exclude_integration_api_headers
            })
        }
        // if (settings?.ar_try_on_exclude_integration_api_name !== undefined && currentApi.id !== settings?.ar_try_on_exclude_integration_api_name ) {
        //
        //     let data = getAPITypes(settings.ar_try_on_exclude_integration_api_name || 'tripo3d');
        //     setCurentAPI(data);
        //     console.log({data})
        //     if(previousHeaders?.api_name == settings?.ar_try_on_exclude_integration_api_name) {
        //         data.headers = previousHeaders.headers;
        //     }
        //
        //     let headerData = [
        //         ...settings.ar_try_on_exclude_integration_api_headers,
        //         ...data.headers,
        //     ];
        //
        //     // Keep only the last occurrence of each key
        //     const uniqueHeaders = Object.values(
        //         headerData.reduce((acc, item) => {
        //             acc[item.key] = item; // overwrite if duplicate
        //             return acc;
        //         }, {})
        //     );
        //
        //     let settingsData = {
        //         ...settings,
        //         ar_try_on_exclude_integration_api_url: data.url,
        //         ar_try_on_exclude_integration_api_headers: uniqueHeaders
        //     }
        //     setSettings(settingsData)
        // }
    }, [settings])

    return (
        <div style={{maxWidth: "80%", margin: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px"}}>
            <h2>Integration Settings</h2>

            {/* API Name */}
            {
                currentApi?.id && <>
                    <div style={{marginBottom: "15px"}}>
                        <label>API Name:</label>
                        <select
                            value={settings.ar_try_on_exclude_integration_api_name}
                            name="ar_try_on_exclude_integration_api_name"
                            id="ar_try_on_exclude_integration_api_name"
                            onChange={(e) => handleChange(e)}
                            style={{width: "100%", padding: "8px", marginTop: "5px"}}
                        >
                            {
                                Object.keys(allApi).map(apiKey => (
                                    <option key={apiKey} value={apiKey}>
                                        {allApi[apiKey]?.name}
                                    </option>
                                ))

                            }
                        </select>
                    </div>
                    {/* URL Field */}
                    <div style={{marginBottom: "15px"}}>
                        <label>URL:</label>
                        <input
                            type="text"
                            name="ar_try_on_exclude_integration_api_url"
                            id="ar_try_on_exclude_integration_api_url"
                            value={settings.ar_try_on_exclude_integration_api_url || currentApi.url}
                            onChange={(e) => handleChange(e)}
                            placeholder="Enter API URL"
                            style={{width: "100%", padding: "8px", marginTop: "5px"}}
                        />
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

                        {settings?.ar_try_on_exclude_integration_api_headers && Object.keys(settings.ar_try_on_exclude_integration_api_headers).length && settings.ar_try_on_exclude_integration_api_headers.map((header, index) => {
                            return <div key={index} style={{display: "flex", gap: "10px", marginBottom: "8px"}}>
                                <input
                                    type="text"
                                    value={header.key}
                                    id={header.key}
                                    name={header.key}
                                    placeholder={"Key"}
                                    onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                                    style={{flex: 1, padding: "8px"}}
                                />
                                <input
                                    type="text"
                                    value={header.value}
                                    placeholder={"Value"}
                                    onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                                    style={{flex: 1, padding: "8px"}}
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
                        })}
                    </div>
                </>
            }
        </div>
    );
}
