import React, {useState, useEffect} from "react";
import {getURL, postWithoutImage, getAPITypes} from "../../context/utilities";

export default function IntegrationSection({
                                               productModel,
                                               addField,
                                               removeField,
                                               handleIntegrationChange,
                                               settings,
                                               currentApi,
                                               handleChange,
                                               setProductModel
                                           }) {

    const [previousBody, setPreviousBody] = useState(null)
    const [previousModelType, setPreviousModelType] = useState(null)
    const handleSubmit = async () => {

        let headers = {}
        settings.ar_try_on_exclude_integration_api_headers.map(header => {
            headers[header.key] = header.value;
        });

        let body = {}
        productModel.exclude_integration_api_body.map(item => {
            body[item.key] = item.value;
        });
        let data_arr = {};
        data_arr['url'] = settings?.ar_try_on_exclude_integration_api_url || ''
        data_arr['api_name'] = settings?.ar_try_on_exclude_integration_api_name || ''
        data_arr['headers'] = headers;
        data_arr['body'] = body
        if (data_arr?.url == '' || data_arr?.api_name == '') {
            alert('Please integrate first from Integration Tab of the plugin')
            return;
        }

        if ((data_arr?.api_name == 'meshy_ai' || data_arr?.api_name == 'tripo3d')
            && (data_arr?.body?.prompt == '' || data_arr?.body?.prompt?.length < 3)) {
            alert('Please write a proper prompt')
            return;
        }

        let formData = new FormData();
        formData.append('data', JSON.stringify(data_arr));
        postWithoutImage(getURL('generate_3d_model'), formData).then(
            (res) => {
                console.log(res)
                if(res?.status && res?.data?.temp?.src?.url) {
                    // console.log(res)
                    let tempProductModel = structuredClone(productModel)
                    tempProductModel.src = res?.data?.temp?.src?.url
                    setProductModel(tempProductModel)
                    console.log({tempProductModel})
                    wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                }

                /**
                 * TODO:: meke this a method.
                 */
                if (!res?.data?.temp?.src?.url && res?.data?.task_id) {
                    let responseData = {};
                    let taskInterval = setInterval(async () => {
                        console.log(taskInterval)
                        if (responseData?.data?.temp?.src?.url) {
                            clearInterval(taskInterval)
                            taskInterval = null;
                            let tempProductModel = structuredClone(productModel)
                            tempProductModel.src = responseData.data.temp.src.url
                            setProductModel(tempProductModel)
                            console.log({tempProductModel})
                            wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                            return;
                        }

                        let formData2 = new FormData();
                        data_arr.body.task_id = res?.data?.task_id;
                        console.log(data_arr)
                        formData2.append('data', JSON.stringify(data_arr));
                        // Default options are marked with *
                        const response = await fetch(getURL('generate_3d_model'), {
                            method: "POST", // *GET, POST, PUT, DELETE, etc.
                            body: formData2, // body data type must match "Content-Type" header
                            headers: {
                                'X-WP-Nonce': ar_try_on.rest_nonce
                            },
                        });
                        responseData = await response.json();
                        console.log(responseData)
                    }, 30000)
                }

            });
    };

    useEffect(() => {
        console.log({currentApi})
    }, [currentApi]);

    useEffect(() => {
        if (!previousBody && productModel?.exclude_integration_api_body) {
            setPreviousBody(productModel.exclude_integration_api_body)
        }
        if (!previousModelType && productModel?.exclude_integration_api_model_type) {
            setPreviousModelType(productModel.exclude_integration_api_model_type)
        }

        if (productModel?.exclude_integration_api_model_type
            && previousModelType
            && productModel?.exclude_integration_api_model_type !== previousModelType) {

            let productModelData = structuredClone(productModel);
            productModelData.exclude_integration_api_body = currentApi.body.supported_types[productModel?.exclude_integration_api_model_type].input
            console.log({ productModelData, previousBody })
            //TODO:: un endign loop
            // setProductModel(productModelData);
        }

        console.log({productModel})
    }, [productModel])


    return (
        <div className="art-bg-gray-100 ">
            <h3 className="art-font-medium art-mb-4">Integration</h3>


            {currentApi?.id && <div style={{marginBottom: "15px"}}>
                <label>Supported Model Types:</label>
                <select
                    value={productModel.exclude_integration_api_model_type}
                    name="exclude_integration_api_model_type"
                    id="exclude_integration_api_model_type"
                    onChange={(e) => handleChange(e)}
                    style={{width: "100%", padding: "8px", marginTop: "5px"}}
                >
                    {
                        Object.keys(currentApi?.body?.supported_types).map(model_type => (
                            <option key={model_type} value={model_type}>
                                {model_type}
                            </option>
                        ))
                    }
                </select>
            </div>

            }

            {/* Add new field button */}
                <div className="art-flex art-items-center art-justify-between">
                {/* Add Body Button */}
                <button
                    type="button"
                    onClick={addField}
                    className="art-mb-4 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none art-hover:bg-blue-600"
                >
                    Add Body
                </button>

                {/* Tooltip Button */}
                <div className="art-relative art-group">
                    <button
                    type="button"
                    className="art-bg-gray-200  art-p-2  art-cursor-pointer"
                    >
                    ℹ️
                    </button>

                    {/* Tooltip Text */}
                        <div className="art-absolute art-bottom-full art-right-full art-w-40 art-mr-2 art-mb-2 art-bg-black art-text-white art-text-sm art-rounded art-p-2 art-shadow-lg art-opacity-0 art-invisible art-transition-all art-duration-300 group-hover:art-opacity-100 group-hover:art-visible">
                            Model Documentation:
                            <br/>
                            {currentApi?.body?.supported_types?.[productModel.exclude_integration_api_model_type]?.doc ? (
                                <p>
                                    {currentApi.name}: 
                                    <a 
                                        href={currentApi.body.supported_types[productModel.exclude_integration_api_model_type].doc} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="art-text-blue-400 hover:art-text-blue-300 art-underline art-ml-1"
                                    >
                                        {productModel.exclude_integration_api_model_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Guide
                                    </a>
                                </p>
                            ) : (
                                <p>No documentation available for this model type.</p>
                            )}
                        </div>
                </div>
                </div>




            {/* Dynamic rows */}
            {productModel.exclude_integration_api_body.map((field, index) => (
                <div key={index} className="art-flex art-gap-4 art-mb-4 art-flex-nowrap">
                    <input
                        type="text"
                        placeholder="Key"
                        value={field.key}
                        onChange={(e) => handleIntegrationChange(index, "key", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/5"
                    />

                    <select
                        value={field.type}
                        onChange={(e) => handleIntegrationChange(index, "type", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/5"
                    >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                    </select>

                    {field.type === "textarea" ? (
                        <textarea
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleIntegrationChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/2"
                            style={{height: '100px'}}
                        />
                    ) : (
                        <input
                            type={field.type}
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleIntegrationChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/2"
                        />
                    )}

                    {/* <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
                    >
                        ✕

                    </button> */}


                     {!field.required ? (
                        <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
                            title="Remove field"
                        >
                            ✕
                        </button>
                            ) : (
                                <div className="art-px-2 art-py-1 art-text-gray-400 art-flex art-items-center" title="Required field">
                                
                                </div>
                            )}

                        </div>

            ))}
            <button type="button"
                    onClick={handleSubmit}
                    className="art-w-full art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 ">
                Generate Model
            </button>
        </div>
    );
}
