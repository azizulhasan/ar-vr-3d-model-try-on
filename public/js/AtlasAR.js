import {setModelAttributes, createModal, SpinnerModal, switchModelVariant} from "../../src/context/utilities";
import {toSdkOptions} from "../../src/context/sdkOptions";

/** AR-114: the AtlasAR viewer SDK (public/js/atlasar-sdk/atlasar.js), when it loaded. */
const sdk = () => (window.AtlasARViewer && typeof window.AtlasARViewer.mount === "function" ? window.AtlasARViewer : null);
// Tell the SDK where its files are (a caching plugin that combines scripts would hide it).
if (sdk() && window.ar_try_on && ar_try_on.plugin_url) {
  sdk().configure({ assetsBase: ar_try_on.plugin_url + "public/js/atlasar-sdk/" });
}

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
    // AR-114: with the viewer SDK, an <atlasar-viewer> slot. The empty <model-viewer> inside keeps
    // the old id and class for the scripts that look for it before the data arrives (gallery
    // toggle, full screen); the SDK hides it and draws the real one with the same id.
    if (sdk()) {
      return `
                <style id="model-viewer-style"></style>
                <atlasar-viewer class="atlas-ar-sdk-viewer" data-atlas-ar-slot="${model_id}" style="display:block;width:100%;height:100%;">
                    <model-viewer id="${model_id}" class="atlas_ar_model_viewer atlas-ar-sdk-placeholder" hidden></model-viewer>
                </atlasar-viewer>`;
    }
    // Without the SDK (blocked or missing file): the original skeleton.
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

  /** AR-114: the <atlasar-viewer> for an old model-viewer selector ("#id" or ".atlas_ar_model_viewer"). */
  findViewerHost(model_id) {
    if (typeof model_id === "string" && model_id.charAt(0) === "#") {
      const id = model_id.slice(1);
      const slot = document.querySelector(`atlasar-viewer[data-atlas-ar-slot="${CSS.escape(id)}"]`);
      if (slot) return slot;
      const el = document.getElementById(id);
      return el ? el.closest("atlasar-viewer") : null;
    }
    const el = document.querySelector(model_id);
    return el ? (el.tagName === "ATLASAR-VIEWER" ? el : el.closest("atlasar-viewer")) : document.querySelector("atlasar-viewer.atlas-ar-sdk-viewer");
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
    // AR-114: the SDK draws it.
    const host = sdk() ? this.findViewerHost(model_id) : null;
    if (host && this.isObject(data)) {
      const viewerId = host.getAttribute("data-atlas-ar-slot") || "";
      // Opened by a click (popup, gallery toggle, full screen, tab): load at once.
      const immediate = type === "modal" || !!host.closest("#atlas_ar-3d-viewer-overlay, .atlas-ar-3d-viewer-overlay, .atlas-ar-fullscreen-viewer, .atlas-ar-wc-tab-viewer, #atlas_ar-toggle-3d-container, .woocommerce-product-gallery");
      // Custom CSS stays page-level, exactly as before (it may target .atlas_ar_model_viewer).
      const style = host.parentNode && host.parentNode.querySelector("#model-viewer-style");
      if (style && typeof data.custom_css === "string") style.textContent = data.custom_css;
      host.querySelectorAll(":scope > .atlas-ar-sdk-placeholder").forEach((n) => n.remove());
      host.options = toSdkOptions(data, { viewerId, immediate });
      return;
    }
    const modelViewer = document.querySelectorAll(model_id)[0];
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

    // AR-61 fix: a cache hit must mean we actually have model data for
    // THIS product. Previously the `whichExists` branch fired whenever
    // `cached_ids` contained "all" — even if `modelSessionData` was
    // empty/undefined for the requested product_id (e.g. when the
    // shopper navigates to a product they haven't visited yet in this
    // session). That caused `setModelAttributes` to be called with
    // `{}`, which wrote `src=""` and produced a blank model-viewer
    // (visible as an empty 3D modal on /server-api/ after visiting
    // /glass/). Both cache branches now require a non-empty `src` in
    // the session entry before they short-circuit the REST fetch.
    const hasUsableSessionData =
      modelSessionData &&
      typeof modelSessionData === "object" &&
      typeof modelSessionData.src === "string" &&
      modelSessionData.src !== "";

    if (whichExists) {
      if (isSettingsChanged === whichExists && hasUsableSessionData) {
        this.setModelData(modelSessionData, model_id, type);
        return;
      }
    } else {
      if (hasUsableSessionData && !ar_try_on?.cached_ids?.includes(product_id)) {
        this.setModelData(modelSessionData, model_id, type);
        return;
      }
    }

    // Show loading message before sending the request
    let button = document.querySelector(`[data-product-id="${product_id}"], [product-id="${product_id}"]`);
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
    // AR-114: with the SDK, its variants module (AtlasAR Pro) switches it.
    const host = modelViewer.closest && modelViewer.closest("atlasar-viewer");
    if (host && typeof host.setVariant === "function") {
      return host.setVariant(variantName);
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
