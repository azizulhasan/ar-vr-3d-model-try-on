import alertify from 'alertifyjs';
import {setModelAttributes} from '../../src/context/utilities';

class AtlasAR {

    alertify = null

    constructor() {
        this.alertify = alertify
    }

    /**
     * Post data method.
     * @param {url} url api url
     * @param {method} method request type
     * @returns
     */
    postWithoutImage = async (url = "", data = {}) => {
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
    getURL = (endpoint = '') => {
        return ar_try_on.api_url + ar_try_on.api_namespace + '/' + ar_try_on.api_version + '/' + endpoint;
    }

    getPostID = () => {
        // Parse the URL parameters
        const params = new URLSearchParams(window.location.search);

        // Get the 'post' parameter
        return params.get('post');
    }

    getModelSkeleton(model_id = 'atlas_ar_model_viewer') {
        // TODO: user should add custom class for there own sake.
        return `
                <style id="model-viewer-style"></style>
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                        <model-viewer
                            id="${model_id}"
                            class="atlas_ar_model_viewer" 
                            src=""
                            alt=""
                            poster=""
                            reveal=""
                            loading=""
                            ar
                            ar-modes=""
                            camera-controls
                            ar-scale="auto"
                            xr-environment
                            style="width: 100%; height: 400px;"
                        ></model-viewer>
                    </div>`;
    }


    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    setModelData(data, model_id = '.atlas_ar_model_viewer') {
        const modelViewer = document.querySelectorAll(model_id)[0]
        console.log({model_id, modelViewer})
        if (modelViewer && this.isObject(data)) {
            setModelAttributes(modelViewer, data)
        }
    }

    async fetchModelData(product_id, model_id = '.atlas_ar_model_viewer') {
        let modelSessionData = this.getModelSessionData(product_id);
        product_id = parseInt(product_id)
        if(modelSessionData && ar_try_on?.cached_ids?.includes('all')) {
            this.setModelData(modelSessionData, model_id)
            console.log({inc: ar_try_on?.cached_ids?.includes(product_id), product_id})
            return;
        }
        let self = this
        let formData = new FormData();
        formData.append('post_id', product_id);
        formData.append('has_value_changed', true);
        await this.postWithoutImage(this.getURL('get_model_and_settings'), formData)
            .then((response) => {
                if (response.success) {
                    const data = response.data;
                    // Check if the data exists before assigning it to model-viewer
                    if (data) {
                        this.setModelSessionData(data, product_id)
                        self.setModelData(data, model_id)
                    }
                }
            })
    }

    supportsModelViewerTag() {
        const el = document.createElement('model-viewer');
        return el instanceof HTMLElement; // works even if <model-viewer> isn't fully registered yet
    }

    supportsModelViewer() {
        const supportsCustomElements = 'customElements' in window;
        const supportsWebGL = (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
            } catch (e) {
                return false;
            }
        })();

        const supportsWebXR = 'xr' in navigator;

        return supportsCustomElements && supportsWebGL; // Optional: && supportsWebXR
    }

    isModelViewerSupported() {
        return (
            'customElements' in window &&
            typeof customElements.get('model-viewer') !== 'undefined'
        );
    }

    getModelSessionData(postId = '') {

        this.storedModelData = this.getStoredModelDataObj();

        return this.storedModelData?.models?.[postId] ?? false;
    }

    setModelSessionData(modelData, postId) {
        // TODO: update this method based on postId.
        let storedModelDataObj = this.getStoredModelDataObj();
        let storedModelData = {}
        if (modelData && postId) {
            storedModelData = {
                url: window.location.href,
                models: {
                    [postId]: modelData,
                    ...storedModelDataObj?.models
                }
            }
            window.sessionStorage.setItem('atlas_ar_model_data', JSON.stringify(storedModelData))
        }

        this.storedModelData = storedModelData;

        return this.storedModelData;
    }

    getStoredModelDataObj() {
        return JSON.parse(window.sessionStorage.getItem('atlas_ar_model_data'));
    }


}

window.AtlasAR = AtlasAR