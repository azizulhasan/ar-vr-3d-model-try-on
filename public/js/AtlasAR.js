import {setModelAttributes, createModal, SpinnerModal, switchModelVariant} from "../../src/context/utilities";

class AtlasAR {
  alertify = null;
  modelsData = {};
  product_id = null;

  constructor() {}

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
        "X-WP-Nonce": ar_try_on.rest_nonce,
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
  getURL = (endpoint = "") => {
    return (
      ar_try_on.api_url +
      ar_try_on.api_namespace +
      "/" +
      ar_try_on.api_version +
      "/" +
      endpoint
    );
  };

  getPostID = () => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);

    // Get the 'post' parameter
    return params.get("post");
  };

  getModelSkeleton(model_id = "atlas_ar_model_viewer") {
    // AR-61 (May 2026): skeleton ships with the same safe defaults that
    // `setModelAttributes` will overlay once REST returns the per-product
    // settings. The pre-overlay attribute values are what shows during
    // the first paint, so getting them right here removes the flash of
    // pink-tinted reflective whites the previous build had — and gives
    // shoppers an immediate "drag to rotate" cue.
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
                            environment-image="neutral"
                            tone-mapping="neutral"
                            exposure="1"
                            interaction-prompt="auto"
                            interaction-prompt-style="wiggle"
                            interaction-prompt-threshold="2000"
                            style="width: 100%; height: 400px;"
                        ></model-viewer>
                    </div>`;
  }

  isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  setModelData(data, model_id = ".atlas_ar_model_viewer", type = "normal") {
    // this.modelsData[this.product_id] = data;
    if (type === "modal") {
      let productName = data.product_name || "3D Product";
      productName = this.decodeHtml(productName);

      let model_id_name = model_id.replace("#", "");
      const htmlContent = this.getModelSkeleton(model_id_name);
      createModal(productName, htmlContent);
    }
    const modelViewer = document.querySelectorAll(model_id)[0];
    console.log({ model_id, modelViewer });
    if (modelViewer && this.isObject(data)) {
      setModelAttributes(modelViewer, data);
    }
  }
  decodeHtml(html) {
    return new DOMParser().parseFromString(html, "text/html").documentElement
      .textContent;
  }

  whichExists(arr = [], product_id = "") {
    if (arr.length < 1) {
      arr = ar_try_on?.cached_ids || [];
    }
    if (product_id) {
      if (arr.includes(product_id)) return product_id;
    }
    if (!Array.isArray(arr)) return false;
    if (arr.includes("all")) return "all";
    if (arr.includes("all_remove")) return "all_remove";
    return false;
  }

  spinLoader() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 24 24"
         class="art-w-5 art-h-5 art-animate-spin"
         fill="none"
         stroke="currentColor"
         stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M4.5 12a7.5 7.5 0 0015 0" />
    </svg>
  `;
  }

  async fetchModelData(
    product_id,
    model_id = ".atlas_ar_model_viewer",
    type = "normal"
  ) {
    product_id = parseInt(product_id);
    this.product_id = product_id;
    let modelSessionData = this.getModelSessionData("models", product_id);
    let isSettingsChanged = this.getModelSessionData("isSettingsChanged");
    const whichExists = this.whichExists(ar_try_on.cached_ids, product_id);
    console.log({ whichExists, isSettingsChanged, product_id });
    if (whichExists) {
      if (isSettingsChanged === whichExists) {
        this.setModelData(modelSessionData, model_id, type);
        return;
      }
    } else {
      if (modelSessionData && !ar_try_on?.cached_ids?.includes(product_id)) {
        this.setModelData(modelSessionData, model_id, type);
        return;
      }
    }

    // Show loading message before sending the request
    let button = document.querySelector(`[product-id="${product_id}"]`);
    let buttonText = 'View In 3D'
    if(button){
      buttonText = button.innerText;
      button.innerHTML = `Loading 3D Model ${this.spinLoader()}`;
    }
    let self = this;
    let formData = new FormData();
    formData.append("post_id", product_id);
    formData.append("has_value_changed", true);
    await this.postWithoutImage(
      this.getURL("get_model_and_settings"),
      formData
    ).then((response) => {
      if (response.success) {
        const data = response.data;
        self.setModelData(data, model_id, type);
        if (data) {
          this.setModelSessionData(data, product_id);
        }
        if(button){
          button.innerHTML = buttonText;
        }
      }
    });
  }

  supportsModelViewerTag() {
    const el = document.createElement("model-viewer");
    return el instanceof HTMLElement; // works even if <model-viewer> isn't fully registered yet
  }

  supportsModelViewer() {
    const supportsCustomElements = "customElements" in window;
    const supportsWebGL = (() => {
      try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && canvas.getContext("webgl"));
      } catch (e) {
        return false;
      }
    })();

    const supportsWebXR = "xr" in navigator;

    return supportsCustomElements && supportsWebGL; // Optional: && supportsWebXR
  }

  isModelViewerSupported() {
    return (
      "customElements" in window &&
      typeof customElements.get("model-viewer") !== "undefined"
    );
  }

  getModelSessionData(propertyName = "models", postId = "") {
    this.storedModelData = this.getStoredModelDataObj();
    if (propertyName === "models") {
      return this.storedModelData?.models?.[postId] ?? false;
    }

    return this.storedModelData?.[propertyName] ?? false;
  }

  setModelSessionData(data, postId = "", propertyName = "") {
    // TODO: update this method based on postId.
    let storedModelDataObj = this.getStoredModelDataObj();
    let storedModelData = {};
    if (data && postId) {
      storedModelData = {
        url: window.location.href,
        isSettingsChanged: this.whichExists(),
        models: {
          ...storedModelDataObj?.models,
          [postId]: data,
        },
      };
      console.log(storedModelData);
      window.sessionStorage.setItem(
        "atlas_ar_model_data",
        JSON.stringify(storedModelData)
      );
    }

    this.storedModelData = storedModelData;

    return this.storedModelData;
  }

  getStoredModelDataObj() {
    return JSON.parse(window.sessionStorage.getItem("atlas_ar_model_data"));
  }

  /**
   * Switch 3D model variant based on WooCommerce variation selection
   * @param {string} variantName - The WooCommerce variant name (e.g., "Blue", "Large")
   * @param {string} modelSelector - Optional selector for the model-viewer element
   * @returns {boolean} - Whether the variant was successfully switched
   */
  switchVariant(variantName, modelSelector = '.atlas_ar_model_viewer') {
    const modelViewer = document.querySelector(modelSelector);
    if (!modelViewer) {
      console.warn('Model viewer not found:', modelSelector);
      return false;
    }

    let modelSessionData = this.getModelSessionData("models", modelViewer.dataset.id);

    return switchModelVariant(modelViewer, variantName, modelSessionData);
  }

  /**
   * Initialize WooCommerce variation listener
   * Automatically switches 3D model when user selects a product variation
   * @param {string} modelSelector - Optional selector for the model-viewer element
   */
  initVariationListener(modelSelector = '.atlas_ar_model_viewer') {
    // WooCommerce fires 'found_variation' event when a variation is selected
    const variationsForm = document.querySelector('.variations_form');
    if (!variationsForm) {
      return;
    }

    const self = this;

    // Listen for WooCommerce variation selection
    jQuery(variationsForm).on('found_variation', function(event, variation) {
      // Get the selected attributes
      const attributes = variation.attributes || {};

      // Try each attribute value to find a matching variant
      Object.values(attributes).forEach(attrValue => {
        if (attrValue) {
          // Clean up the attribute value (remove 'pa_' prefix if present)
          const cleanValue = attrValue.replace(/^pa_/, '');
          self.switchVariant(cleanValue, modelSelector);
        }
      });
    });

    // Listen for reset (when user clears selection)
    jQuery(variationsForm).on('reset_data', function() {
      const modelViewer = document.querySelector(modelSelector);
      if (modelViewer && modelViewer.dataset.originalSrc) {
        modelViewer.src = modelViewer.dataset.originalSrc;
        modelViewer.variantName = null;
      }
    });
  }
}

window.AtlasAR = AtlasAR;
