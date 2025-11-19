import React, {useState, useEffect} from "react";
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
                                        setCurrentAPI,
                          
                                     

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
        /**
         * When a user change the API name like from "trip3d' to "meshy" at that point,
         * the header will be changed. but without saving if he, select again the tripo3d
         * then its previous value which is saved in database with "Authorization" key
         *
         * This code will restore it.
         */
        if (settings?.ar_try_on_exclude_integration_api_name && currentApi.id !== settings?.ar_try_on_exclude_integration_api_name ) {

            let data = getAPITypes(settings.ar_try_on_exclude_integration_api_name || 'tripo3d');
            setCurrentAPI(data);
            if(previousHeaders?.api_name === settings?.ar_try_on_exclude_integration_api_name) {
                data.headers = previousHeaders.headers;
            }

            let headerData = [
                ...settings.ar_try_on_exclude_integration_api_headers,
                ...data.headers,
            ];

            // Keep only the last occurrence of each key
            const uniqueHeaders = Object.values(
                headerData.reduce((acc, item) => {
                    acc[item.key] = item; // overwrite if duplicate
                    return acc;
                }, {})
            );

            let settingsData = {
                ...settings,
                ar_try_on_exclude_integration_api_url: data.url,
                ar_try_on_exclude_integration_api_headers: uniqueHeaders
            }
            setSettings(settingsData)
        }
    }, [settings])

    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", backgroundColor: "var(--theme-bg)", color: "var(--theme-text)" }}  >
            <h2 style={{ color: "var(--theme-text)" }}>Integration Settings</h2>

            {/* API Name */}
            {
                currentApi?.id && <>
                    <div>
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
                    <div className="art-w-full art-flex art-items-center art-py-4  art-gap-4 art-flex-nowrap ">
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
                        {/* Tooltip Button */}
                        <div className="art-relative art-group">
                            <button
                                type="button"
                                className="art-bg-gray-200 art-p-2 art-cursor-pointer"
                            >
                                <span className="dashicons dashicons-info-outline"></span>
                            </button>

                            {/* Tooltip Text */}
                            <div className="art-absolute art-bottom-full art-right-full art-w-40 art-mr-2 art-mb-2 art-bg-black art-text-white art-text-sm art-rounded art-p-2 art-shadow-lg art-opacity-0 art-invisible art-transition-all art-duration-300 group-hover:art-opacity-100 group-hover:art-visible">
                                Model Documentation:
                                <br/>
                                {currentApi?.api_key_url ? (
                                    <p>
                                        {currentApi.name}:
                                        <a
                                            href={currentApi.api_key_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="art-text-blue-400 hover:art-text-blue-300 art-underline art-ml-1"
                                        >
                                            {currentApi.name} API Key Guide
                                        </a>
                                    </p>
                                ) : (
                                    <p>No documentation available for this model type.</p>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Headers Section */}
                    <div>
                        <button
                            type="button"
                            onClick={addHeader}
                            className="art-px-3 art-py-2 art-mb-2.5 art-bg-blue-500 art-text-white art-border-0 art-rounded art-cursor-pointer"

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
                                    className={"art-px-3 art-py-2 art-bg-gray-200 art-text-black art-border-1 art-rounded art-cursor-pointer " + (index !== 0 ? "art-visible" : "art-invisible")
}

                                >
                                 <span class="dashicons dashicons-trash"></span>

                                </button>
                            </div>
                            
                        })}

                        
                    </div>
                </>
            }
        </div>
    );
}
