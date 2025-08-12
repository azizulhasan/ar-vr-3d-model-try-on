import alertify from 'alertifyjs';

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

    setModelData(data, model_id = 'atlas_ar_model_viewer') {
        const modelViewer = document.getElementById(model_id);
        const modelViewer2 = document.querySelectorAll('.atlas_ar_model_viewer')[0]
        console.log(modelViewer2)
        if (modelViewer && this.isObject(data)) {
            modelViewer.setAttribute('src', data.model_3d_file || '');
            modelViewer.setAttribute('ios-src', data.model_ios_file || '');
            modelViewer.setAttribute('alt', data.model_alt || '');
            modelViewer.setAttribute('poster', data.model_poster || '');
            modelViewer.setAttribute('reveal', data.reveal || 'auto');
            modelViewer.setAttribute('loading', data.loading || 'auto');
            modelViewer.setAttribute('ar-modes', (data.ar_modes || []).join(' '));
            modelViewer.setAttribute('ar-placement', (data.ar_placement || 'floor'));
            modelViewer.setAttribute('skybox-image', (data.skybox_image || ''));
            modelViewer.setAttribute('environment-image', (data.environment_image || ''));

            if (data.auto_rotate) {
                modelViewer.setAttribute('auto-rotate', '');
            } else {
                modelViewer.removeAttribute('auto-rotate');
            }

            modelViewer.setAttribute('shadow-intensity', data.shadow_intensity ?? '1');

            if (data.camera_orbit) {
                modelViewer.setAttribute('camera-orbit', data.camera_orbit);
            } else {
                modelViewer.removeAttribute('camera-orbit');
            }

            if (data.disable_zoom) {
                modelViewer.setAttribute('disable-zoom', '');
            } else {
                modelViewer.removeAttribute('disable-zoom');
            }

            if (data.disable_tap) {
                modelViewer.setAttribute('disable-tap', '');
            } else {
                modelViewer.removeAttribute('disable-tap');
            }


            if (data.canvas_alignment) {
                if (data.canvas_alignment === 'center') {
                    modelViewer.style.display = 'block';
                    modelViewer.style.margin = '0 auto';
                } else if (data.canvas_alignment === 'left') {
                    modelViewer.style.margin = '0 auto 0 0';
                } else if (data.canvas_alignment === 'right') {
                    modelViewer.style.margin = '0 0 0 auto';
                }
            }

            console.log({ data })
            if (data.canvas_width) {
                modelViewer.style.width = data.canvas_width;
            }
            if (data.canvas_height) {
                modelViewer.style.height = data.canvas_height;
            }
            if (data.canvas_margin) {
                modelViewer.style.margin = data.canvas_margin;
            }
            if (data.canvas_padding) {
                modelViewer.style.padding = data.canvas_padding;
            }
            const modelViewerStyle = document.getElementById('model-viewer-style');
            if (modelViewerStyle) {
                modelViewerStyle.innerHTML = data.custom_css
            }


            modelViewer.style.backgroundColor = data.poster_color || 'rgba(255,255,255,0)';
            const scale = data.scale || 'auto'; // Default value if not defined
            modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
            if (data.ar === "deactivate") {
                modelViewer.removeAttribute('ar');
            }
            if (data.xr_environment === "deactivate") {
                modelViewer.removeAttribute('xr-environment');
            }
            // TODO: add functionality for this.
            if (data.custom_button === "activate") {
                modelViewer.innerHTML = `<button> ${data.custom_button_text || 'Activate Ar'} </button>`;
            }

            console.log({ modelViewer })

        }
    }

    async fetchModelData(product_id, model_id = 'atlas_ar_model_viewer') {
        let self = this
        let formData = new FormData();
        formData.append('post_id', product_id);
        await this.postWithoutImage(this.getURL('get_model_and_settings'), formData)
            .then((response) => {
                if (response.success) {
                    const data = response.data;
                    // Check if the data exists before assigning it to model-viewer
                    if (data) {
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



}

window.AtlasAR = AtlasAR