import {useState} from "react";


/**
 * Post data method.
 * @param {url} url api url
 * @param {method} method request type
 * @returns
 */
export const postWithoutImage = async (url = "", data = {}) => {
    // Default options are marked with *
    const response = await fetch(url, {
        // headers: {
        //   "Content-Type": "application/json",
        // },
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        body: data, // body data type must match "Content-Type" header
        headers: {
            'X-WP-Nonce': ar_try_on.rest_nonce
        },
    });
    const responseData = await response.json(); // parses JSON response into native JavaScript objects

    return responseData;
};


/**
 *
 * @param endpoint
 * @returns {string}
 */
export const getURL = (endpoint = '') => {
    return ar_try_on.api_url + ar_try_on.api_namespace + '/' + ar_try_on.api_version + '/' + endpoint;
}

export const getPostID = () => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);

    // Get the 'post' parameter
    return params.get('post');
}



function unsecuredCopyToClipboard() {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy')
        alert('Copied')
    } catch (err) {
        console.error('Unable to copy to clipboard', err)
    }

    document.body.removeChild(textArea)
};

/**
 * Copy short Code
 */
export const copyshortcode = (e) => {
    e.preventDefault();
    /* Get the text field */
    var copyText = document.getElementById("atlas_ar_shortcode_button");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    if (window.isSecureContext && navigator.clipboard) {
        /* Copy the text inside the text field */
        navigator.clipboard
            .writeText(copyText.value)
            .then(() => {
                alert('Copied')
            })
            .catch((e) => {
                alert("Something went wrong! " + e);
                // toast('Something went wrong! ');
            });
    } else {
        unsecuredCopyToClipboard(copyText.value);
    }
};


export const setModelAttributes = (modelViewer, model_settings) => {
    modelViewer.setAttribute('src', model_settings.src || '');
    modelViewer.setAttribute('ios-src', model_settings.ios_src || '');
    modelViewer.setAttribute('alt', model_settings.alt || '');
    modelViewer.setAttribute('poster', model_settings.poster || '');
    modelViewer.setAttribute('ar-placement', (model_settings.ar_placement || 'floor'));
    modelViewer.setAttribute('skybox-image', (model_settings.skybox_image || ''));
    modelViewer.setAttribute('environment-image', (model_settings.environment_image || ''));

    if (model_settings.auto_rotate) {
        modelViewer.setAttribute('auto-rotate', '');
    } else {
        modelViewer.removeAttribute('auto-rotate');
    }
    modelViewer.setAttribute('shadow-intensity', (model_settings.shadow_intensity ?? '1'));
    if (model_settings.camera_orbit) {
        modelViewer.setAttribute('camera-orbit', model_settings.camera_orbit);
    } else {
        modelViewer.removeAttribute('camera-orbit');
    }

    if (model_settings.disable_zoom) {
        modelViewer.setAttribute('disable-zoom', '');
    } else {
        modelViewer.removeAttribute('disable-zoom');
    }

    if (model_settings.disable_tap) {
        modelViewer.setAttribute('disable-tap', '');
    } else {
        modelViewer.removeAttribute('disable-tap');
    }

    //    Here goes the Canvas Section:
    if (model_settings.canvas_alignment) {
        if (model_settings.canvas_alignment == 'center') {
            modelViewer.style.display = 'block';
            modelViewer.style.margin = '0px auto';
        } else if (model_settings.canvas_alignment ==   'left') {
            modelViewer.style.margin = '0 auto 0 0';
        } else if (model_settings.canvas_alignment == 'right') {
            modelViewer.style.margin = '0 0 0 auto';
            console.log(model_settings)
        }
    }

    if (model_settings.canvas_width) {
        modelViewer.style.width = model_settings.canvas_width;
    }
    if (model_settings.canvas_height) {
        modelViewer.style.height = model_settings.canvas_height;
    }
    if (model_settings.canvas_margin) {
        modelViewer.style.margin = model_settings.canvas_margin;
    }
    if (model_settings.canvas_padding) {
        modelViewer.style.padding = model_settings.canvas_padding;
    }




    modelViewer.setAttribute('reveal', model_settings.ar_try_on_reveal_type || 'auto');
    modelViewer.setAttribute('loading', model_settings.ar_try_on_loading_type || 'auto');
    modelViewer.setAttribute('ar-modes', (model_settings.ar_try_on_ar_modes || []).join(' '));



    const modelViewerStyle = document.getElementById('model-viewer-style');
    if (modelViewerStyle) {
        modelViewerStyle.innerHTML = model_settings.custom_css
    }

    modelViewer.style.backgroundColor = model_settings.ar_try_on_poster_color || 'rgba(255,255,255,0)';
    const scale = model_settings.ar_try_on_ar_scale || 'auto'; // Default value if not defined
    modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
    if (model_settings.ar_try_on_ar === "deactivate") {
        modelViewer.removeAttribute('ar');
    }
    if (model_settings.ar_try_on_xr_environment === "deactivate") {
        modelViewer.removeAttribute('xr-environment');
    }
    // TODO: add functionality for this.
    if (model_settings.ar_try_on_ar_button === "activate") {
        modelViewer.innerHTML = `<button> ${model_settings.ar_try_on_ar_button_text || 'Activate Ar'} </button>`;
    }
}



export const getAPITypes = (api_type = 'tripo3d') => {
    let api_types = {
        tripo3d: {
            id: 'tripo3d',
            name: 'Tripo 3D',
            url: 'https://api.tripo3d.ai/v2/openapi/task',
            headers: [
                {key: 'Authorization', value: '' },
                {key: 'Content-Type', value: 'application/json' },
            ],
            body: {
                supported_types: {
                    text_to_model: {
                        input: [
                            {key: 'prompt', type: 'textarea', value: 'a cat'},
                            {key: 'type', type: 'text', value: 'text_to_model'},
                            {key: 'model_version', type: 'text', value: 'v2.5-20250123'},
                            {key: 'texture', type: 'boolean', value: true},
                            {key: 'pbr', type: 'boolean', value: true},
                            {key: 'texture_alignment', type: 'text', value: 'geometry'},
                            {key: 'geometry_quality', type: 'text', value: 'original'},
                        ],
                        doc: 'https://platform.tripo3d.ai/docs/generation#text-to-model'
                    },
                    image_to_model: {
                        input: [
                            { key: 'type', type: 'text', value: 'image_to_model' },
                            { key: 'file.type', type: 'text', value: 'png' },
                            { key: 'file.file_token', type: 'file', value: '' },
                            { key: 'file.object', type: 'text', value: '' },
                            { key: 'file.url', type: 'url', value: '' },
                            { key: 'model_version', type: 'text', value: 'v2.5-20250123' },
                            { key: 'texture', type: 'boolean', value: true },
                            { key: 'pbr', type: 'boolean', value: true },
                            { key: 'texture_alignment', type: 'text', value: 'original_image' }
                        ],
                        doc: 'https://platform.tripo3d.ai/docs/generation#image-to-model'
                    },                  
                    
                }
            }
        },
        meshy_ai: {
            id: 'meshy_ai',
            name: 'Meshy AI 3D',
            url: 'https://api.meshy.ai/openapi/v2/text-to-3d',
            headers: [
                {key: 'Authorization', value: '' },
                {key: 'Content-Type', value: 'application/json' },
            ],
            body: {
                supported_types: {
                    text_to_model: {
                        input: [
                            { key: 'prompt', type: 'textarea', value: '' },
                            { key: 'mode', type: 'text', value: 'preview' },
                            { key: 'negative_prompt', type: 'textarea', value: '' },
                            { key: 'art_style', type: 'text', value: 'realistic' },
                            { key: 'should_remesh', type: 'boolean', value: true }
                        ],
                        doc: 'https://docs.meshy.ai/en/api/quick-start#make-your-first-text-to-3-d-api-request'
                    },
                }
            }
        },

    }

    if(api_type === 'all'){
        return api_types;
    }
    return api_types[api_type];
}