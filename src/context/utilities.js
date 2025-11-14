import {useState} from "react";

/**
 * Post data method.
 * @param {url} url api url
 * @param {method} method request type
 * @param {HTMLElement} modelViewer - The model-viewer element
 * @param {Array}
 *

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
export const getURL = (endpoint = "") => {
    return (
        ar_try_on.api_url +
        ar_try_on.api_namespace +
        "/" +
        ar_try_on.api_version +
        "/" +
        endpoint
    );
};

export const getPostID = () => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);

    // Get the 'post' parameter
    return params.get("post");
};

function unsecuredCopyToClipboard() {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    try {
        document.execCommand("copy");
        alert("Copied");
    } catch (err) {
        console.error("Unable to copy to clipboard", err);
    }

    document.body.removeChild(textArea);
}

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
                alert("Copied");
            })
            .catch((e) => {
                alert("Something went wrong! " + e);
                // toast('Something went wrong! ');
            });
    } else {
        unsecuredCopyToClipboard(copyText.value);
    }
};

export const renderUserHotspots = (modelViewer, hotspots = []) => {
    if (!modelViewer) return;

    // Clear existing user hotspots (not dimension hotspots)
    modelViewer.querySelectorAll(".hotspot").forEach((h) => h.remove());

    // Add each hotspot
    hotspots.forEach((hotspot, index) => {
        const btn = document.createElement("button");
        btn.className = "hotspot";
        btn.slot = `hotspot-${index}`;
        btn.dataset.position = hotspot.position || "0 0 0";
        btn.dataset.normal = hotspot.normal || "0 0 1";
        btn.title = hotspot.label;

        //TODO : don't remove these css. current static css is added to
        // ar-vr-3d-model-try-on-public.css file. in future on demand this can be changed.
    //     btn.style.cssText = `
    //   display: block;
    //   width: 20px;
    //   height: 20px;
    //   border-radius: 10px;
    //   border: none;
    //   background-color: blue;
    //   box-sizing: border-box;
    //   pointer-events: auto;
    //   position: relative;
    // `;

        const label = document.createElement("div");
        label.className = "annotation";
        label.textContent = hotspot.label;

        //TODO : don't remove these css. current static css is added to
        // ar-vr-3d-model-try-on-public.css file. in future on demand this can be changed.

    //     label.style.cssText = `
    //   background-color: #ffffff;
    //   position: absolute;
    //   transform: translate(10px, 10px);
    //   border-radius: 10px;
    //   padding: 10px;
    //   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    //   white-space: nowrap;
    //   pointer-events: none;
    // `;

        btn.appendChild(label);
        modelViewer.appendChild(btn);
    });
};

export const convertLength = (valueInMeters, unit) => {
    switch (unit) {
        case "m":
            return valueInMeters;
        case "cm":
            return valueInMeters * 100;
        case "inch":
            return valueInMeters * 39.3701;
        default:
            return valueInMeters;
    }
};

function getDimensionLabel(value, model_settings) {
    const unit = model_settings.dimensions?.unit || "cm"; // Default: cm

    const unitLabel = {
        cm: "cm",
        m: "m",
        inch: "in",
    };
    const converted = convertLength(value, unit);
    return `${converted.toFixed(1)} ${unitLabel[unit]}`;
}

function displayDimensions(modelViewer, model_settings) {

    // FIXED: Check if dimension elements already exist before adding
    const existingDimLines = modelViewer.querySelector("#dimLines");
    const existingHotspots = modelViewer.querySelectorAll('.dot');
    if (!existingDimLines || !existingHotspots) {
        let hotspotHTML = `
              <!-- Hotspots -->
              <button slot="hotspot-dot+X-Y+Z" class="dot" data-position="1 -1 1" data-normal="1 0 0"></button>
              <button slot="hotspot-dim+X-Y" class="dim" data-position="1 -1 0" data-normal="1 0 0"></button>
              <button slot="hotspot-dot+X-Y-Z" class="dot" data-position="1 -1 -1" data-normal="1 0 0"></button>
              <button slot="hotspot-dim+X-Z" class="dim" data-position="1 0 -1" data-normal="1 0 0"></button>
              <button slot="hotspot-dot+X+Y-Z" class="dot" data-position="1 1 -1" data-normal="0 1 0"></button>
              <button slot="hotspot-dim+Y-Z" class="dim" data-position="0 -1 -1" data-normal="0 1 0"></button>
              <button slot="hotspot-dot-X+Y-Z" class="dot" data-position="-1 1 -1" data-normal="0 1 0"></button>
              <button slot="hotspot-dim-X-Z" class="dim" data-position="-1 0 -1" data-normal="-1 0 0"></button>
              <button slot="hotspot-dot-X-Y-Z" class="dot" data-position="-1 -1 -1" data-normal="-1 0 0"></button>
              <button slot="hotspot-dim-X-Y" class="dim" data-position="-1 -1 0" data-normal="-1 0 0"></button>
              <button slot="hotspot-dot-X-Y+Z" class="dot" data-position="-1 -1 1" data-normal="-1 0 0"></button>

        <!-- Dimension lines -->
        <svg id="dimLines" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="dimensionLineContainer">
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
        </svg>
        `;

        modelViewer.insertAdjacentHTML("beforeend", hotspotHTML);
    }


    const unit = model_settings.dimensions?.unit || "cm";

    const conversion = {
        cm: (v) => v * 100,
        m: (v) => v,
        inch: (v) => v * 39.3701,
    };

    const unitLabel = { cm: "cm", m: "m", inch: "in" };

    const formatValue = (v) => `${conversion[unit](v).toFixed(1)} ${unitLabel[unit]}`;

    const hotspots = [
        { dot: "hotspot-dot+X-Y+Z", pos: (c, s) => [c.x + s.x/2, c.y - s.y/2, c.z + s.z/2] },
        { dot: "hotspot-dot+X-Y-Z", pos: (c, s) => [c.x + s.x/2, c.y - s.y/2, c.z - s.z/2] },
        { dot: "hotspot-dot+X+Y-Z", pos: (c, s) => [c.x + s.x/2, c.y + s.y/2, c.z - s.z/2] },
        { dot: "hotspot-dot-X+Y-Z", pos: (c, s) => [c.x - s.x/2, c.y + s.y/2, c.z - s.z/2] },
        { dot: "hotspot-dot-X-Y-Z", pos: (c, s) => [c.x - s.x/2, c.y - s.y/2, c.z - s.z/2] },
        { dot: "hotspot-dot-X-Y+Z", pos: (c, s) => [c.x - s.x/2, c.y - s.y/2, c.z + s.z/2] },
    ];

    const dimLabels = [
        {
            name: "hotspot-dim+X-Y",
            pos: (c, s) => [c.x + s.x*0.6, c.y - s.y*0.55, c.z],
            value: (s) => formatValue(s.z),
        },
        {
            name: "hotspot-dim+X-Z",
            pos: (c, s) => [c.x + s.x*0.6, c.y, c.z - s.z*0.6],
            value: (s) => formatValue(s.y),
        },
        {
            name: "hotspot-dim+Y-Z",
            pos: (c, s) => [c.x, c.y + s.y*0.55, c.z - s.z*0.55],
            value: (s) => formatValue(s.x),
        },
        {
            name: "hotspot-dim-X-Z",
            pos: (c, s) => [c.x - s.x*0.6, c.y, c.z - s.z*0.6],
            value: (s) => formatValue(s.y),
        },
        {
            name: "hotspot-dim-X-Y",
            pos: (c, s) => [c.x - s.x*0.6, c.y - s.y*0.55, c.z],
            value: (s) => formatValue(s.z),
        },
    ];

    function updateHotspots() {
        const center = modelViewer.getBoundingBoxCenter();
        const size = modelViewer.getDimensions();
        if (!center || !size) return;

        // Dot hotspots (6)
        hotspots.forEach(h => {
            const [x, y, z] = h.pos(center, size);
            modelViewer.updateHotspot({
                name: h.dot,
                position: `${x} ${y} ${z}`
            });
        });

        // Dimension label hotspots (5)
        dimLabels.forEach(h => {
            const [x, y, z] = h.pos(center, size);
            modelViewer.updateHotspot({
                name: h.name,
                position: `${x} ${y} ${z}`
            });

            const btn = modelViewer.querySelector(`button[slot="${h.name}"]`);
            if (btn) btn.textContent = h.value(size);
        });

    }

    // Show or hide dimension UI
    function setVisibility(visible) {
        const dimElements = [
            ...modelViewer.querySelectorAll("button"),
            modelViewer.querySelector("#dimLines"),
        ];
        dimElements.forEach(el =>
            el?.classList.toggle("hide", !visible)
        );
    }

    setVisibility(model_settings.dimensions.show);

    // SVG line redraw
    const dimLines = modelViewer.querySelectorAll("line");

    function drawLine(svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) {
        if (dotHotspot1 && dotHotspot2 && svgLine) {
            svgLine.setAttribute("x1", dotHotspot1.canvasPosition.x);
            svgLine.setAttribute("y1", dotHotspot1.canvasPosition.y);
            svgLine.setAttribute("x2", dotHotspot2.canvasPosition.x);
            svgLine.setAttribute("y2", dotHotspot2.canvasPosition.y);
            if (dimensionHotspot && !dimensionHotspot.facingCamera) {
                svgLine.classList.add("hide");
            } else {
                svgLine.classList.remove("hide");
            }
        }
    }

    const renderSVG = () => {
        drawLine(
            dimLines[0],
            modelViewer.queryHotspot("hotspot-dot+X-Y+Z"),
            modelViewer.queryHotspot("hotspot-dot+X-Y-Z"),
            modelViewer.queryHotspot("hotspot-dim+X-Y")
        );
        drawLine(
            dimLines[1],
            modelViewer.queryHotspot("hotspot-dot+X-Y-Z"),
            modelViewer.queryHotspot("hotspot-dot+X+Y-Z"),
            modelViewer.queryHotspot("hotspot-dim+X-Z")
        );
        drawLine(
            dimLines[2],
            modelViewer.queryHotspot("hotspot-dot+X+Y-Z"),
            modelViewer.queryHotspot("hotspot-dot-X+Y-Z")
        );
        drawLine(
            dimLines[3],
            modelViewer.queryHotspot("hotspot-dot-X+Y-Z"),
            modelViewer.queryHotspot("hotspot-dot-X-Y-Z"),
            modelViewer.queryHotspot("hotspot-dim-X-Z")
        );
        drawLine(
            dimLines[4],
            modelViewer.queryHotspot("hotspot-dot-X-Y-Z"),
            modelViewer.queryHotspot("hotspot-dot-X-Y+Z"),
            modelViewer.queryHotspot("hotspot-dim-X-Y")
        );

    };

    // Events
    modelViewer.addEventListener("load", () => {
        updateHotspots();
        renderSVG();
    });

    modelViewer.addEventListener("camera-change", () => {
        updateHotspots();
        renderSVG();
    });

    modelViewer.addEventListener("ar-status", (event) => {
        setVisibility(model_settings.dimensions.show && event.detail.status !== "session-started");
    });
}

export const setModelAttributes = (modelViewer, model_settings) => {
    console.log({model_settings});
    modelViewer.setAttribute("src", model_settings.src || "");
    modelViewer.setAttribute("ios-src", model_settings.ios_src || "");
    modelViewer.setAttribute("alt", model_settings.alt || "");
    modelViewer.setAttribute("poster", model_settings.poster || "");
    modelViewer.setAttribute(
        "ar-placement",
        model_settings.ar_placement || "floor"
    );
    modelViewer.setAttribute("skybox-image", model_settings.skybox_image || "");
    modelViewer.setAttribute(
        "environment-image",
        model_settings.environment_image || ""
    );

    if (model_settings.auto_rotate) {
        modelViewer.setAttribute("auto-rotate", "");
    } else {
        modelViewer.removeAttribute("auto-rotate");
    }
    modelViewer.setAttribute(
        "shadow-intensity",
        model_settings.shadow_intensity ?? "1"
    );
    if (model_settings.camera_orbit) {
        modelViewer.setAttribute("camera-orbit", model_settings.camera_orbit);
    } else {
        modelViewer.removeAttribute("camera-orbit");
    }

    if (model_settings.disable_zoom) {
        modelViewer.setAttribute("disable-zoom", "");
    } else {
        modelViewer.removeAttribute("disable-zoom");
    }

    if (model_settings.disable_tap) {
        modelViewer.setAttribute("disable-tap", "");
    } else {
        modelViewer.removeAttribute("disable-tap");
    }

    //    Here goes the Canvas Section:
    if (model_settings.canvas_alignment) {
        if (model_settings.canvas_alignment == "center") {
            modelViewer.style.display = "block";
            modelViewer.style.margin = "0px auto";
        } else if (model_settings.canvas_alignment == "left") {
            modelViewer.style.margin = "0 auto 0 0";
        } else if (model_settings.canvas_alignment == "right") {
            modelViewer.style.margin = "0 0 0 auto";
            console.log(model_settings);
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

    modelViewer.setAttribute(
        "reveal",
        model_settings.ar_try_on_reveal_type || "auto"
    );
    modelViewer.setAttribute(
        "loading",
        model_settings.ar_try_on_loading_type || "auto"
    );
    modelViewer.setAttribute(
        "ar-modes",
        (model_settings.ar_try_on_ar_modes || []).join(" ")
    );

    const modelViewerStyle = document.getElementById("model-viewer-style");
    if (modelViewerStyle) {
        modelViewerStyle.innerHTML = model_settings.custom_css;
    }

    modelViewer.style.backgroundColor =
        model_settings.ar_try_on_poster_color || "rgba(255,255,255,0)";
    const scale = model_settings.ar_try_on_ar_scale || "auto";
    modelViewer.setAttribute("ar-scale", scale);
    if (model_settings.ar_try_on_ar === "deactivate") {
        modelViewer.removeAttribute("ar");
    }
    if (model_settings.ar_try_on_xr_environment === "deactivate") {
        modelViewer.removeAttribute("xr-environment");
    }
    if (model_settings.ar_try_on_ar_button === "activate") {
        modelViewer.innerHTML = `<button> ${
            model_settings.ar_try_on_ar_button_text || "Activate AR"
        } </button>`;
    }


    // Dimension
    displayDimensions(modelViewer, model_settings);


    if (model_settings.hotspots && model_settings.hotspots.length > 0) {
        renderUserHotspots(modelViewer, model_settings.hotspots);
    }
};

export const getAPITypes = (api_type = "tripo3d") => {
    let api_types = {
        tripo3d: {
            id: "tripo3d",
            name: "Tripo 3D",
            url: "https://api.tripo3d.ai/v2/openapi/task",
            api_key_url: "https://platform.tripo3d.ai/api-keys",
            headers: [
                {key: "Authorization", value: ""},
                {key: "Content-Type", value: "application/json"},
            ],
            body: {
                supported_types: {
                    text_to_model: {
                        input: [
                            {key: "prompt", type: "textarea", value: ""},
                            {key: "type", type: "text", value: "text_to_model"},
                            {key: "model_version", type: "text", value: "v2.5-20250123"},
                            {key: "texture", type: "boolean", value: true},
                            {key: "pbr", type: "boolean", value: true},
                            {key: "texture_alignment", type: "text", value: "geometry"},
                            {key: "geometry_quality", type: "text", value: "original"},
                        ],
                        doc: "https://platform.tripo3d.ai/docs/generation#text-to-model",
                    },
                    image_to_model: {
                        input: [
                            {key: "type", type: "text", value: "image_to_model"},
                            {key: "file.type", type: "text", value: "png"},
                            {key: "file.file_token", type: "file", value: ""},
                            {key: "file.object", type: "text", value: ""},
                            {key: "file.url", type: "url", value: ""},
                            {key: "model_version", type: "text", value: "v2.5-20250123"},
                            {key: "texture", type: "boolean", value: true},
                            {key: "pbr", type: "boolean", value: true},
                            {
                                key: "texture_alignment",
                                type: "text",
                                value: "original_image",
                            },
                        ],
                        doc: "https://platform.tripo3d.ai/docs/generation#image-to-model",
                    },
                },
            },
        },
        meshy_ai: {
            id: "meshy_ai",
            name: "Meshy AI 3D",
            url: "https://api.meshy.ai/openapi/v2/text-to-3d",
            api_key_url: "https://www.meshy.ai/settings/api",
            headers: [
                {key: "Authorization", value: ""},
                {key: "Content-Type", value: "application/json"},
            ],
            body: {
                supported_types: {
                    text_to_model: {
                        input: [
                            {key: "prompt", type: "textarea", value: "", required: true},
                            {key: "mode", type: "text", value: "preview", required: true},
                            {
                                key: "negative_prompt",
                                type: "textarea",
                                value: "",
                                required: false,
                            },
                            {
                                key: "art_style",
                                type: "text",
                                value: "realistic",
                                required: false,
                            },
                            {
                                key: "should_remesh",
                                type: "boolean",
                                value: true,
                                required: false,
                            },
                        ],
                        doc: "https://docs.meshy.ai/en/api/quick-start#make-your-first-text-to-3-d-api-request",
                    },
                    image_to_model: {
                        input: [
                            {key: "image_url", type: "file", value: "", required: true},
                            {
                                key: "should_texture",
                                type: "boolean",
                                value: true,
                                required: false,
                            },
                            {
                                key: "should_remesh",
                                type: "boolean",
                                value: true,
                                required: false,
                            },
                            {
                                key: "enable_pbr",
                                type: "boolean",
                                value: false,
                                required: false,
                            },
                            {
                                key: "ai_model",
                                type: "text",
                                value: "meshy-5",
                                required: false,
                            },
                        ],
                        doc: "https://docs.meshy.ai/en/api/image-to-3d#create-an-image-to-3d-task",
                    },
                },
            },
        },
    };

    if (api_type === "all") {
        return api_types;
    }
    return api_types[api_type];
};

/**
 * compare 2 objects
 * @param obj1
 * @param obj2
 * @returns {boolean}
 */
export const isDifferent = (obj1, obj2) => {
    // If both are strictly equal
    if (obj1 === obj2) return false;

    // If either is null/undefined or types don't match
    if (typeof obj1 !== typeof obj2 || obj1 === null || obj2 === null) {
        return true;
    }

    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return true;
        for (let i = 0; i < obj1.length; i++) {
            if (isDifferent(obj1[i], obj2[i])) return true;
        }
        return false;
    }

    // Handle objects
    if (typeof obj1 === "object" && typeof obj2 === "object") {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        // Check if keys length differs
        if (keys1.length !== keys2.length) return true;

        // Check if any key is missing or values differ
        for (let key of keys1) {
            if (!(key in obj2)) return true;
            if (isDifferent(obj1[key], obj2[key])) return true;
        }
        return false;
    }

    // Primitive values (string, number, boolean, etc.)
    return obj1 !== obj2;
};

export const createModal = (
    title = "Modal Title",
    bodyContent = "Modal body content..."
) => {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className =
        "art-fixed art-inset-0 art-bg-black/50 art-flex art-items-center art-justify-center art-z-50";

    // Create modal container
    const modal = document.createElement("div");
    modal.className =
        "art-bg-white art-rounded-lg art-shadow-lg art-w-11/12 art-max-w-lg art-flex art-flex-col art-relative";

    // --- Header ---
    const header = document.createElement("div");
    header.className =
        "art-flex art-items-center art-justify-between art-p-4 art-border-b art-border-gray-200";

    // Title
    const titleEl = document.createElement("h2");
    titleEl.className = "art-text-lg art-font-semibold";
    titleEl.textContent = title;

    // Header buttons container
    const headerButtons = document.createElement("div");
    headerButtons.className = "art-flex art-gap-2";

    // Expand button (SVG)
    const expandBtn = document.createElement("button");
    expandBtn.className = "art-p-1 art-rounded hover:art-bg-gray-200";
    expandBtn.innerHTML = `
    <svg class="art-w-5 art-h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4V4zM14 14h6v6h-6v-6zM4 14h6v6H4v-6zM14 4h6v6h-6V4z"/>
    </svg>`;
    console.log(expandBtn);
    expandBtn.addEventListener("click", () => {
        modal.classList.toggle("art-fixed");
        modal.classList.toggle("art-inset-0");
        modal.classList.toggle("art-w-full");
        modal.classList.toggle("art-h-full");
        modal.classList.toggle("art-max-w-none");
        modal.classList.toggle("art-rounded-none");
        console.log(modal);
    });

    // Close button (SVG)
    const closeBtn = document.createElement("button");
    closeBtn.className = "art-p-1 art-rounded hover:art-bg-gray-200";
    closeBtn.innerHTML = `
    <svg class="art-w-5 art-h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>`;
    closeBtn.addEventListener("click", () => document.body.removeChild(overlay));

    headerButtons.appendChild(expandBtn);
    headerButtons.appendChild(closeBtn);
    header.appendChild(titleEl);
    header.appendChild(headerButtons);

    // --- Body ---
    const body = document.createElement("div");
    body.className = "art-p-4 art-flex-1 art-overflow-y-auto";
    console.log(bodyContent);
    body.innerHTML = bodyContent;

    // --- Footer ---
    const footer = document.createElement("div");
    footer.className =
        "art-flex art-justify-end art-p-4 art-border-t art-border-gray-200";
    const footerCloseBtn = document.createElement("button");
    footerCloseBtn.className =
        "art-bg-gray-200 art-hover-bg-gray-300 art-text-gray-700 art-px-4 art-py-2 art-rounded";
    footerCloseBtn.textContent = "Close";
    footerCloseBtn.addEventListener("click", () =>
        document.body.removeChild(overlay)
    );
    footer.appendChild(footerCloseBtn);

    // --- Assemble modal ---
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    // Add to body
    document.body.appendChild(overlay);
    return overlay;
};
