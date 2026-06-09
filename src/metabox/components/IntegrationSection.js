import React, {useState, useEffect} from "react";
import {getURL, postWithoutImage, getAPITypes, getPostID, setNestedKey} from "../../context/utilities";
import notify from "../../context/Notify";
import ImageSourcePicker from "./ImageSourcePicker";

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
    const [tempModelData, setTempModelData] = useState(null)

    function insertUnique(array, newItem, shouldReplace = false) {
        const index = array.findIndex(item => item.key === newItem.key);

        if (index === -1) {
            // if key not found → insert new
            array.push(newItem);
        }

        if (shouldReplace) {
            // if key exists and shouldReplace is true → replace
            array[index] = newItem;
        }

        return array;
    }
    const generateModelButtonStateChange = (state, innerText, submitButton = '') => {
        if (!submitButton) {
            submitButton = document.getElementById('atlas_ar_model_generate');
        }
        if (state) {
            submitButton.setAttribute('data-id', state)
        }

        if (innerText) {
            submitButton.innerHTML = innerText;
        }
    }
    const handleSubmit = async (e) => {
        let submitButton = e.target;
        e.preventDefault();
        const postId = getPostID()
        if (!postId) {
            notify('Please publish the post first. Then reload the page and save.', 'warn', {
                autoClose: 5000,
            })
            return;
        }

        if (submitButton.getAttribute('data-id') === 'complete') {
            /**
             * After a successful save the button label flips to
             * "See model from frontend." but it's the same DOM
             * element — clicking it used to fall through to the
             * regenerate confirmation, which is the opposite of
             * what the label promises. When the button is in
             * "see model from frontend" mode, treat it as a link
             * to the post permalink instead.
             */
            const btnText = (submitButton.innerText || submitButton.textContent || '').toLowerCase();
            const looksLikeFrontendCta = btnText.includes('frontend') || btnText.includes('see model');
            if (looksLikeFrontendCta) {
                const permalink =
                    document.querySelector('#sample-permalink a')?.href
                    || document.querySelector('#wp-admin-bar-view a')?.href
                    || (window.ar_try_on?.permalink || '');
                if (permalink) {
                    window.open(permalink, '_blank', 'noopener,noreferrer');
                    return;
                }
                notify('Could not detect the post permalink — use the "View product" link in the admin bar.', 'warn', { autoClose: 4000 });
                return;
            }
            if (!confirm('Model is generated successfully. Are you sure you want to generate the model again?')) {
                return;
            }
            generateModelButtonStateChange('generate', 'Generating Model......', submitButton)
        }

        /**
         * Build data to generate model or save model.
         * @type {{}}
         */
        let headers = {}
        if(!settings?.ar_try_on_exclude_integration_api_headers) {
            notify('Please integrate first from Integration Tab of the plugin', 'error');
            return;
        }
        settings.ar_try_on_exclude_integration_api_headers.map(header => {
            headers[header.key] = header.value;
        });

        /**
         * Build the request body. The editor schema is FLAT
         * (e.g. `{key: "file.url", value: "..."}`) so dot-paths
         * have to be re-nested into the shape Tripo3D / Meshy AI
         * actually expect on the wire (`{file: {url: "..."}}`).
         * Without this, image_to_model never receives the image
         * and the task polls forever (Joachim Rodriguez, 2026-06-07).
         */
        let body = {}
        productModel.exclude_integration_api_body.forEach(item => {
            setNestedKey(body, item.key, item.value);
        });

        /**
         * For image_to_model, Tripo3D requires exactly one of
         * file.file_token / file.url / file.object — they are
         * mutually exclusive. Empty strings still occupy a slot
         * and cause the request to be rejected, so drop them.
         */
        if (body?.file && typeof body.file === 'object' && body.file !== null) {
            ['file_token', 'url', 'object'].forEach(k => {
                if (body.file[k] === '' || body.file[k] == null) {
                    delete body.file[k];
                }
            });
        }

        let data_arr = {};
        data_arr['url'] = settings?.ar_try_on_exclude_integration_api_url || ''
        data_arr['api_name'] = settings?.ar_try_on_exclude_integration_api_name || ''
        data_arr['headers'] = headers;
        data_arr['body'] = body
        data_arr['post_id'] = postId
        if (data_arr?.url == '' || data_arr?.api_name == '') {
            notify('Please integrate first from Integration Tab of the plugin', 'error');
            return;
        }

        const taskType = data_arr?.body?.type;

        // text_to_model needs a real prompt.
        if ((data_arr?.api_name == 'meshy_ai' || data_arr?.api_name == 'tripo3d')
            && taskType === 'text_to_model'
            && (data_arr?.body?.prompt == '' || data_arr?.body?.prompt?.length < 3)) {
            notify('Please write a proper prompt', 'error');
            return;
        }

        // image_to_model needs at least one image input.
        if (data_arr?.api_name == 'tripo3d' && taskType === 'image_to_model') {
            const hasImage = !!(
                data_arr?.body?.file?.url ||
                data_arr?.body?.file?.file_token ||
                data_arr?.body?.file?.object
            );
            if (!hasImage) {
                notify('Please provide an image URL or upload an image before generating.', 'error');
                return;
            }
        }

        /**
         * Generate model and save it to temporary folder. also get the temporary model url
         * and temporary poster url and preview it. at that time button state will be "save"
         * If user is satisfied then click button again. To save it on permanent folder
         */
        if (submitButton.getAttribute('data-id') === 'generate') {

            if (data_arr?.body?.task_id) {
                generateModelButtonStateChange('progress', 'Generating Model......', submitButton)
            } else {
                generateModelButtonStateChange('progress', 'Generating Task......', submitButton)
            }
            console.log(data_arr)
            // return;
            let formData = new FormData();
            formData.append('data', JSON.stringify(data_arr));
            postWithoutImage(getURL('generate_3d_model'), formData).then(
                (res) => {
                    console.log(res)
                    /**
                     * This code  will be true why request is being sent with task_id
                     */
                    if (res?.status && res?.data?.temp?.src?.url) {
                        let tempProductModel = structuredClone(productModel)
                        // set product model file
                        tempProductModel.src = res.data.temp.src.url
                        // set product poster image
                        if (res?.data?.temp?.poster?.url) {
                            tempProductModel.poster = res.data.temp.poster.url
                        }

                        // set product body with task_id
                        if (res?.data?.input?.prompt) {
                            tempProductModel.exclude_integration_api_body  = insertUnique(tempProductModel.exclude_integration_api_body,{key: 'prompt', type: 'textarea', value: res.data.input.prompt}, true)
                            tempProductModel.exclude_integration_api_body  = insertUnique(tempProductModel.exclude_integration_api_body,{key: 'task_id', type: 'textarea', value: res.data.task_id})
                        }

                        setProductModel(tempProductModel)
                        setTempModelData({...{temp: res.data.temp}, ...{post_id: data_arr.post_id}})
                        console.log({tempProductModel})
                        generateModelButtonStateChange('save', 'Save This Model', submitButton)
                        wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                        return;
                    }

                    if (res?.data?.task_id) {
                        generateModelButtonStateChange('task', 'Task Created! Please Wait!', submitButton)
                    }
                    /**
                     * TODO:: meke this a method. This code will be true when
                     * request is being created without any task_id
                     */
                    if (!res?.data?.temp?.src?.url && res?.data?.task_id) {
                        let responseData = {};
                        let taskInterval = setInterval(async () => {
                            if (responseData?.data?.temp?.src?.url) {
                                clearInterval(taskInterval)
                                taskInterval = null;
                                let tempProductModel = structuredClone(productModel)
                                // set product model file
                                tempProductModel.src = responseData.data.temp.src.url
                                // set product poster image
                                if (responseData?.data?.temp?.poster?.url) {
                                    tempProductModel.poster = responseData.data.temp.poster.url
                                }

                                // set product body with task_id
                                if (responseData?.data?.task_id) {
                                    tempProductModel.exclude_integration_api_body.push({key: 'task_id', type: 'text', value: responseData.data.task_id})
                                }
                                if (responseData?.data?.task_id) {
                                    tempProductModel.exclude_integration_api_body  = insertUnique(tempProductModel.exclude_integration_api_body,{key: 'task_id', type: 'textarea', value: responseData.data.task_id})
                                }

                                setTempModelData({...{temp: responseData.data.temp}, ...{post_id: data_arr.post_id}})
                                setProductModel(tempProductModel)
                                generateModelButtonStateChange('save', 'Save This Model', submitButton)
                                console.log({tempProductModel})
                                wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                                return;
                            }

                            if (responseData?.data?.temp?.poster?.url || responseData?.data?.output?.poster) {
                                generateModelButtonStateChange('poster', 'Poster Created! Now Generating Model', submitButton)
                                setTimeout(() => {
                                    generateModelButtonStateChange('poster', 'Model .glb file is generating!', submitButton)
                                }, 5000)
                            }

                            let formData2 = new FormData();
                            data_arr.body.task_id = res?.data?.task_id;

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
            /**
             * When button state is "save" then it will move the temporay
             * files to permanent folder.
             */
        } else if (submitButton.getAttribute('data-id') === 'save') {
            console.log(tempModelData)
            if (!tempModelData?.temp) {
                generateModelButtonStateChange('error', 'Model data is not set!', submitButton)
                console.error('Model data is not set!')
                return;
            }
            /**
             * Save model files from temporary folder to final folder.
             */
            generateModelButtonStateChange('save_progress', 'Model files saving .......', submitButton)
            let formData2 = new FormData();
            data_arr['temporary_model_data'] = tempModelData
            formData2.append('data', JSON.stringify(data_arr));
            let response = await fetch(getURL('generate_3d_model'), {
                method: "POST", // *GET, POST, PUT, DELETE, etc.
                body: formData2, // body data type must match "Content-Type" header
                headers: {
                    'X-WP-Nonce': ar_try_on.rest_nonce
                },
            });
            response = await response.json();
            let tempProductModel = structuredClone(productModel)
            if (!response?.data?.src?.url) {
                generateModelButtonStateChange('error', 'Something went wrong! Try again.', submitButton)
                return;
            }
            // set model src
            tempProductModel.src = response.data.src.url
            // set model poster.
            if (response?.data?.poster?.url) {
                tempProductModel.poster = response.data.poster.url
            }
            /**
             * Default the model-viewer alt to the post title when the
             * user hasn't customised it. "Title" is the productModel
             * default in ARProductModelSettings.js — treat that as
             * "still placeholder". For an image_to_model save, the
             * product name is the most accurate accessibility label
             * (screen readers read it as "3D model of <product>").
             */
            const currentAlt = (tempProductModel.alt || '').trim();
            if (currentAlt === '' || currentAlt.toLowerCase() === 'title') {
                const postTitle = (
                    document.querySelector('#title')?.value
                    || document.querySelector('.editor-post-title__input')?.value
                    || ''
                ).trim();
                if (postTitle) {
                    tempProductModel.alt = postTitle;
                }
            }

            setTempModelData({})
            setProductModel(tempProductModel)
            generateModelButtonStateChange('file_saved', 'Model files saved successfully.', submitButton)

            /**
             * Save product model data with updated poster ans src url to database.
             */
            console.log(tempProductModel)
            let formData = new FormData();
            formData.append('fields', JSON.stringify(tempProductModel));
            formData.append('post_id', postId);
            formData.append('method', 'POST');

            setTimeout(() => {
                generateModelButtonStateChange('data_save', 'Model data is saving.......', submitButton)
            }, 10)
            postWithoutImage(getURL('get_model_and_settings'), formData)
                .then((res) => {
                    console.log(res)
                    let tempProductModel = {...productModel, ...res.data};
                    setProductModel(tempProductModel);
                    notify('Successfully Saved All Data.', 'success', {
                        autoClose: 5000,
                    })
                    generateModelButtonStateChange('complete', 'Successfully Saved All Data.', submitButton)
                    setTimeout(() => {
                        generateModelButtonStateChange('complete', 'See model from frontend.', submitButton)
                    }, 2000)
                    wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                })
                .catch((err) => {
                    console.log(err);
                });

        } else {
            generateModelButtonStateChange('double_click', 'Do not click multiple time!', submitButton)
        }
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
            console.log({productModelData, previousBody})
            //TODO:: un endign loop
            // setProductModel(productModelData);
        }

    }, [productModel])


    // Pro-gated image picker takes over the body editor for
    // Tripo3D/Meshy AI image_to_model — hide the raw key/value rows
    // and the Add Body button while it's active.
    const _proActive = (window.ar_try_on?.is_pro_active === '1'
        || window.ar_try_on?.is_pro_active === 1
        || window.ar_try_on?.is_pro_active === true);
    const pickerActive = _proActive
        && productModel?.exclude_integration_api_model_type === 'image_to_model';

    /**
     * Generation modes the host site is licensed to actually run.
     * Filled by Free's `atlas_ar_generation_supported_modes` filter:
     *   - Free alone returns `['text_to_model']`.
     *   - Pro extends with `image_to_model` via
     *     `AR_TRY_ON_Pro_Bridge::add_pro_generation_modes()`.
     *
     * The dropdown intersects what the API exposes (text_to_model,
     * image_to_model, ...) with what the SITE supports — so a
     * Free-only install hides image_to_model entirely instead of
     * letting the user pick a feature that can't run.
     */
    const _allowedModes = Array.isArray(window.ar_try_on?.generation_supported_modes)
        ? window.ar_try_on.generation_supported_modes
        : ['text_to_model'];
    const _apiSupportedTypes = currentApi?.body?.supported_types || {};
    const _visibleModes = Object.keys(_apiSupportedTypes).filter(t => _allowedModes.includes(t));
    const _imageModeUnlocked = _allowedModes.includes('image_to_model');

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
                        _visibleModes.map(model_type => (
                            <option key={model_type} value={model_type}>
                                {model_type}
                            </option>
                        ))
                    }
                </select>
                {/*
                  * Upsell notice for Free users: when image_to_model is
                  * NOT in the host site's allowed list AND the Tripo3D
                  * schema actually exposes it, surface a small inline
                  * pitch with a link to atlasaidev.com. This is the
                  * Yoast-pattern shape — informational link, no locked
                  * control, no "fake" image_to_model option that the
                  * user can click to discover it's gated.
                  */}
                {!_imageModeUnlocked && _apiSupportedTypes.image_to_model && (
                    <div
                        style={{
                            background: '#eff6ff',
                            border: '1px solid #93c5fd',
                            borderRadius: 6,
                            padding: '10px 12px',
                            marginTop: 8,
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: '#1e3a8a',
                        }}
                    >
                        <strong>Want image-to-3D generation?</strong>
                        {' '}Upload a product photo (featured image, gallery, media library,
                        {' '}or your own URL) and turn it directly into a 3D model — no prompt
                        {' '}writing needed. <em>Image-to-3D is part of AtlasAR Pro.</em>
                        {' '}
                        <a
                            href="https://atlasaidev.com/plugins/3d-model-viewer-wordpress-plugin/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline'}}
                        >
                            Learn more →
                        </a>
                    </div>
                )}
            </div>

            }

            {/*
              * Pro-gated image-source picker for Tripo3D / Meshy AI
              * image_to_model. Renders ONLY when:
              *   - Pro is active (is_pro_active === '1'), AND
              *   - the selected supported model type is image_to_model
              * Replaces the dynamic key/value rows below with a guided
              * 4-source picker (featured / gallery / library / upload).
              * The picker writes back into exclude_integration_api_body
              * so the existing Generate Model submit path works
              * unchanged.
              */}
            {pickerActive && (
                <ImageSourcePicker
                    productModel={productModel}
                    setProductModel={setProductModel}
                />
            )}

            {!pickerActive && (<>
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
                        <span className="dashicons dashicons-info-outline"></span>
                    </button>

                    {/* Tooltip Text */}
                    <div
                        className="art-absolute art-bottom-full art-right-full art-w-40 art-mr-2 art-mb-2 art-bg-black art-text-white art-text-sm art-rounded art-p-2 art-shadow-lg art-opacity-0 art-invisible art-transition-all art-duration-300 group-hover:art-opacity-100 group-hover:art-visible">
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
                        <option value="file">File</option>
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
                        <div className="art-px-2 art-py-1 art-text-gray-400 art-flex art-items-center"
                             title="Required field">
                        </div>
                    )}

                </div>

            ))}
            </>)}
            <button type="button"
                    onClick={handleSubmit}
                    data-id={'generate'}
                    id={"atlas_ar_model_generate"}
                    className="art-w-full art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 ">
                Generate Model
            </button>
        </div>
    );
}
