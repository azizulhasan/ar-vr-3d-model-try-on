/**
 * AR-114: the plugin's saved settings → AtlasAR viewer SDK options.
 *
 * `data` is what get_model_and_settings returns (global ar_try_on_settings + this product's
 * ar_try_on_product_settings). Every setting keeps the meaning it had in setModelAttributes()
 * (src/context/utilities.js), so existing sites look the same; the SDK only draws them.
 *
 * Premium data (hotspots, dimensions, the multi-model slider, variations) is passed on unchanged;
 * the SDK's Premium modules (atlasar-pro.js, shipped by AtlasAR Pro) read it. Without Pro those
 * modules are not on the page, so nothing Premium is drawn — as before.
 */

const on = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'yes' || v === 'on';
const filled = (v) => v !== undefined && v !== null && v !== '';

/**
 * @param {object} data   merged settings from the REST answer
 * @param {object} ctx    { viewerId, immediate } — the old <model-viewer> id, and whether the viewer
 *                        opens after a click (popup, gallery toggle, full screen, tab)
 */
export function toSdkOptions(data = {}, ctx = {}) {
    const o = {
        src: data.src || '',
        iosSrc: data.ios_src || '',
        poster: data.poster || '',
        alt: data.alt || data.product_name || '3D model',
        title: data.product_name || '',

        environmentImage: data.environment_image || 'neutral',
        skyboxImage: data.skybox_image || '',
        toneMapping: data.tone_mapping || 'neutral',
        exposure: filled(data.exposure) ? Number(data.exposure) : 1,
        shadowIntensity: filled(data.shadow_intensity) ? Number(data.shadow_intensity) : 1,
        autoRotate: on(data.auto_rotate),
        cameraOrbit: data.camera_orbit || '45deg 55deg 4m',
        disableZoom: on(data.disable_zoom),
        disableTap: on(data.disable_tap),
        // Per product first, then the global setting (as before).
        interactionPrompt: data.interaction_prompt || data.ar_try_on_interaction_prompt || 'auto',
        interactionPromptThreshold: Number(data.interaction_prompt_threshold || data.ar_try_on_interaction_prompt_threshold || 2000),
        background: data.ar_try_on_poster_color || 'transparent',

        width: data.canvas_width || '100%',
        height: data.canvas_height || '400px',
        align: data.canvas_alignment || 'left',
        margin: data.canvas_margin || '0',
        padding: data.canvas_padding || '2px 0',

        ar: data.ar_try_on_ar !== 'deactivate',
        arModes: Array.isArray(data.ar_try_on_ar_modes) && data.ar_try_on_ar_modes.length ? data.ar_try_on_ar_modes : ['webxr', 'scene-viewer', 'quick-look'],
        // face-glasses / face-hat products: the plugin's own try-on handles the camera; the static
        // viewer shows the model on the floor as it did.
        arPlacement: data.ar_placement === 'wall' ? 'wall' : 'floor',
        arScale: data.ar_try_on_ar_scale === 'fixed' ? 'fixed' : 'auto',
        xrEnvironment: data.ar_try_on_xr_environment !== 'deactivate',
        arButton: data.ar_try_on_ar_button === 'activate' ? 'custom' : 'default',
        arButtonText: data.ar_try_on_ar_button_text || 'View in AR',
        arButtonBackground: data.ar_try_on_ar_button_background_color || '#3a3a3a',
        arButtonColor: data.ar_try_on_ar_button_text_color || '#ffffff',
        qr: false, // the plugin prints its own QR card once per page (render_qr_code_footer)

        loading: ['auto', 'lazy', 'eager'].includes(data.ar_try_on_loading_type) ? data.ar_try_on_loading_type : 'auto',
        reveal: data.ar_try_on_reveal_type === 'manual' ? 'manual' : 'auto',
        load: ctx.immediate ? 'immediate' : (data.model_load_strategy === 'interaction' || (window.ar_try_on && window.ar_try_on.model_load_strategy === 'interaction') ? 'interaction' : 'visible'),

        // Existing CSS and scripts (Pro's variation handler) find the viewer by these.
        viewerId: ctx.viewerId || '',
        viewerClass: 'atlas_ar_model_viewer',
    };

    // Premium data, read by atlasar-pro.js (AtlasAR Pro). Same shapes as the plugin stores.
    if (Array.isArray(data.hotspots) && data.hotspots.length) o.hotspots = data.hotspots;
    if (data.dimensions && typeof data.dimensions === 'object' && data.dimensions.unit) o.dimensions = { ...data.dimensions, show: on(data.dimensions.show) };
    if (on(data.isMultiple) && Array.isArray(data.multipleItems) && data.multipleItems.length > 1) {
        o.items = data.multipleItems;
        const first = data.multipleItems[0] && (data.multipleItems[0].data || data.multipleItems[0]);
        if (first && first.src) { o.src = first.src; o.poster = first.poster || o.poster; }
    }
    if (data.variationSettings && typeof data.variationSettings === 'object') o.variants = data.variationSettings;
    return o;
}
