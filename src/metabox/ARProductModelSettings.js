import React, { useState, useEffect } from "react";
import { getPostID, getURL, postWithoutImage, copyshortcode } from "../context/utilities";
import AccordionIcon from "../icons/AccordionIcon";

const ARProductModelSettings = () => {
    const [productModel, setProductModel] = useState({
        ar_try_on_file_android: '',
        ar_try_on_file_ios: '',
        ar_try_on_file_poster: '',
        ar_try_on_file_alt: 'Title',
        ar_try_on_ar_placement: 'floor',
        ar_try_on_test_field: '',
        // Camera settings
        auto_rotate: false,
        shadow_intensity: '1',
        camera_orbit: '45deg 55deg 4m',
        disable_zoom: false,
        disable_tap: false
    });
    const [currentValue, setCurrentValue] = useState({});
    const [isProductModelLoaded, setIsProductModelLoad] = useState(false);
    
    // Accordion state
    const [activeSection, setActiveSection] = useState('settings');
    const [activeAccordion, setActiveAccordion] = useState({
        content: true,
        camera: false,
        advance: false
    });
    const [styleAccordion, setStyleAccordion] = useState({
        canvas: true,
        advance: false,
    });

    const toggleStyleAccordion = (section) => {
        setStyleAccordion(prev => ({
            canvas: false,
            advance: false,
            [section]: !prev[section],
        }));
    };

    const toggleAccordion = (section) => {
        setActiveAccordion(prev => ({
            content: false,
            camera: false,
            advance: false,
            [section]: !prev[section],
        }));
    };

    const toggleSection = (section) => {
        setActiveSection(section);
    };

    const handleChange = (e) => {
        let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (!e.target.name) return;

        if (e.target.name === 'ar_try_on_ar_placement' && (value !== 'wall' && value !== 'floor') && !ar_try_on.is_pro_active) {
            alert("This option is only available in the pro version");
            return;
        }

        const productModelData = {
            ...productModel,
            [e.target.name]: value,
        };
        setProductModel(productModelData);
        wp.hooks.doAction('ar_try_on_preview_data', productModelData);
    };

    const handleMediaButtonClick = (fieldName) => {
        const media = wp.media({
            title: "Upload File",
            multiple: false
        });

        media.on("select", function () {
            const attachment = media.state().get("selection").first().toJSON();
            const updatedModel = {
                ...productModel,
                [fieldName]: attachment.url
            };
            setProductModel(updatedModel);
            wp.hooks.doAction('ar_try_on_preview_data', updatedModel);
        });

        media.open();
    };

    useEffect(() => {
        let cloneProductModel = JSON.parse(JSON.stringify(productModel));
        wp.hooks.addAction('ar_try_on_on_select_model_file', 'ar_try_on', function (val) {
            setCurrentValue(val);
        });
    }, []);

    useEffect(() => {
        if (Object.keys(currentValue).length) {
            const productModelData = {
                ...productModel,
                [currentValue.name]: currentValue.url
            };
            setProductModel(productModelData);
            wp.hooks.doAction('ar_try_on_preview_data', productModelData);
        }
    }, [currentValue]);

    useEffect(() => {
        if (wp.hooks) {
            const postId = getPostID()
            let formData = new FormData();
            formData.append('method', 'get');
            formData.append('post_id', postId);
            postWithoutImage(getURL('product_settings'), formData).then(
                (res) => {
                    const productModelData = { ...productModel, ...res.data };
                    setProductModel(productModelData);
                    setIsProductModelLoad(true)
                });
        }
    }, [wp.hooks]);

    useEffect(() => {
        if (isProductModelLoaded) {
            wp.hooks.doAction('ar_try_on_preview_data', productModel);
        }
    }, [isProductModelLoaded]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const postId = getPostID()
        let formData = new FormData();
        formData.append('fields', JSON.stringify(productModel));
        formData.append('post_id', postId);
        formData.append('method', 'post');
        postWithoutImage(getURL('product_settings'), formData)
            .then((res) => {
                setProductModel({ ...productModel, ...res.data });
                alert('Successfully Saved Data.')
            })
            .catch((err) => {
                console.log(err);
            });
    };

    return (
        <div className="art-flex art-gap-4">
            {/* Left Side - Settings/Style Sections */}
            <div className="art-w-1/2">
                {/* Section Tabs */}
                <div className="art-flex art-mb-4 art-border-b">
                    <button
                        onClick={() => toggleSection('settings')}
                        className={`art-px-4 art-py-2 art-font-medium art-border-b-2 ${
                            activeSection === 'settings'
                                ? 'art-border-blue-500 art-text-blue-600'
                                : 'art-border-transparent art-text-gray-600 hover:art-text-gray-800'
                        }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => toggleSection('style')}
                        className={`art-px-4 art-py-2 art-font-medium art-border-b-2 ${
                            activeSection === 'style'
                                ? 'art-border-blue-500 art-text-blue-600'
                                : 'art-border-transparent art-text-gray-600 hover:art-text-gray-800'
                        }`}
                    >
                        Style
                    </button>
                </div>

                <div>
                    <br/>
                    {/* Settings Section */}
                    {activeSection === 'settings' && (
                        <div className="art-bg-gray-100 art-rounded">
                            {/* Content Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('content')}
                                    className="art-w-full art-flex art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Content
                                        <AccordionIcon status={activeAccordion.content}/>
                                    </span>
                                </button>

                                {activeAccordion.content && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                                        {/* AR Placement */}
                                        <div className="art-mb-3">
                                            <label className="art-font-medium block mb-2">
                                                AR Placements / Product Type
                                            </label>
                                            <div className="art-relative">
                                                <select
                                                    name="ar_try_on_ar_placement"
                                                    value={productModel.ar_try_on_ar_placement}
                                                    onChange={handleChange}
                                                    className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded art-bg-white art-appearance-none art-pr-8"
                                                >
                                                    <option value="floor">Floor</option>
                                                    <option value="wall">Wall</option>
                                                    <option value="168">Glass Pro</option>
                                                </select>
                                            </div>
                                            
                                            <div className="art-mt-2 art-flex art-items-center art-gap-2">
                                                {/* <img
                                                    src={ar_try_on.plugin_url + 'admin/images/' + 
                                                        (productModel.ar_try_on_ar_placement === 'floor' ? 'floor.png' : 
                                                         productModel.ar_try_on_ar_placement === 'wall' ? 'wall.png' : 'glass.png')}
                                                    alt="Selected placement"
                                                    className="art-w-6 art-h-6"
                                                /> */}
                                                <span className="art-text-sm art-text-gray-600">
                                                    Selected: {productModel.ar_try_on_ar_placement === 'floor' ? 'Floor' : 
                                                               productModel.ar_try_on_ar_placement === 'wall' ? 'Wall' : 'Glass Pro'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 3D Model Section */}
                                        <div className="art-mb-1">
                                            <h5 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                                                <img
                                                    src={ar_try_on.plugin_url + "admin/images/icons8-3d-object-18.png"}
                                                    alt="3D Model Icon"
                                                    className="art-w-6 art-h-6"
                                                />
                                                3D Model
                                            </h5>
                                            <p className="art-text-sm art-text-gray-600">
                                                Add the files of 3D model to this product. Only glTF/GLB models are supported.
                                            </p>
                                        </div>

                                        {/* File for Android */}
                                        <div className="art-mb-1">
                                            <label
                                                htmlFor="ar_try_on_file_android"
                                                className="art-block art-text-sm art-font-medium art-flex art-items-center art-gap-2"
                                            >
                                                <img
                                                    src={ar_try_on.plugin_url + "admin/images/icons8-android-os-18.png"}
                                                    alt="Android Icon"
                                                    className="art-w-6 art-h-6"
                                                />
                                                File for Android
                                            </label>
                                            <input
                                                type="text"
                                                onChange={handleChange}
                                                id="ar_try_on_file_android"
                                                name="ar_try_on_file_android"
                                                value={productModel.ar_try_on_file_android}
                                                className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_try_on_file_android')}
                                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500"
                                            >
                                                Add File
                                            </button>
                                            <p className="art-text-sm art-text-gray-600 art-mt-2">
                                                Upload or enter a URL to 3D object (with .glb extension).
                                            </p>
                                        </div>

                                        {/* File for iOS */}
                                        <div className="art-mb-1">
                                            <label
                                                htmlFor="ar_try_on_file_ios"
                                                className="art-block art-text-sm art-font-medium art-flex art-items-center art-gap-2"
                                            >
                                                <img
                                                    src={ar_try_on.plugin_url + "admin/images/icons8-mac-client-18.png"}
                                                    alt="iOS Icon"
                                                    className="art-w-6 art-h-6"
                                                />
                                                File for iOS
                                            </label>
                                            <input
                                                type="text"
                                                id="ar_try_on_file_ios"
                                                name="ar_try_on_file_ios"
                                                onChange={handleChange}
                                                value={productModel.ar_try_on_file_ios}
                                                className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_try_on_file_ios')}
                                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500"
                                            >
                                                Add File
                                            </button>
                                            <p className="art-text-sm art-text-gray-600 art-mt-2">
                                                Upload or enter a URL to 3D object (with .usdz extension).<br />
                                                The presence of this attribute will automatically enable the quick-look ar-mode.
                                            </p>
                                        </div>

                                        {/* Poster */}
                                        <div className="art-mb-1">
                                            <label
                                                htmlFor="ar_try_on_file_poster"
                                                className="art-block art-text-sm art-font-medium"
                                            >
                                                Poster
                                            </label>
                                            <input
                                                type="text"
                                                id="ar_try_on_file_poster"
                                                name="ar_try_on_file_poster"
                                                onChange={handleChange}
                                                value={productModel.ar_try_on_file_poster}
                                                className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_try_on_file_poster')}
                                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500"
                                            >
                                                Add File
                                            </button>
                                            <p className="art-text-sm art-text-gray-600 art-mt-2">
                                                Upload an image or enter a URL. If the image field (alt) is left empty, the photo
                                                of the product is taken.
                                            </p>
                                        </div>

                                        {/* Alt Text */}
                                        <div className="art-mb-1">
                                            <label
                                                htmlFor="ar_try_on_file_alt"
                                                className="art-block art-text-sm art-font-medium art-flex art-items-center art-gap-2"
                                            >
                                                <img
                                                    src={ar_try_on.plugin_url + "admin/images/icons8-web-accessibility-18.png"}
                                                    alt="Accessibility Icon"
                                                    className="art-w-6 art-h-6"
                                                />
                                                Alt
                                            </label>
                                            <input
                                                type="text"
                                                id="ar_try_on_file_alt"
                                                name="ar_try_on_file_alt"
                                                onChange={handleChange}
                                                value={productModel.ar_try_on_file_alt}
                                                className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                                            />
                                            <p className="art-text-sm art-text-gray-600 art-mt-2">
                                                Insert a text. If the text field is left empty, the name of the product is taken.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Camera Settings Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('camera')}
                                    className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Camera
                                        <AccordionIcon status={activeAccordion.camera}/>
                                    </span>
                                </button>

                                {activeAccordion.camera && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
                                        {/* Auto Rotate Toggle */}
                                        <div className="art-flex art-items-center">
                                            <label className="art-relative art-inline-flex art-items-center art-cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="auto_rotate"
                                                    checked={productModel.auto_rotate}
                                                    onChange={handleChange}
                                                />
                                            </label>
                                            <span className="art-text-sm art-font-medium">Auto Rotate</span>
                                        </div>

                                        {/* Shadow Intensity */}
                                        <div>
                                            <label className="art-block art-text-sm art-font-medium art-mb-2 art-uppercase art-tracking-wide">
                                                Shadow Intensity
                                            </label>
                                            <input
                                                type="number"
                                                name="shadow_intensity"
                                                value={productModel.shadow_intensity}
                                                onChange={handleChange}
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                placeholder="1"
                                                className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
                                            />
                                            <p className="art-text-xs art-text-gray-500 art-mt-1">
                                                Controls the opacity of the shadow. Set to 0 to turn off the shadow entirely. Any value between 0 and 1
                                            </p>
                                        </div>

                                        {/* Camera Orbit */}
                                        <div>
                                            <label className="art-block art-text-sm art-font-medium art-mb-2 art-uppercase art-tracking-wide">
                                                Camera Orbit
                                            </label>
                                            <input
                                                type="text"
                                                name="camera_orbit"
                                                value={productModel.camera_orbit}
                                                onChange={handleChange}
                                                placeholder="45deg 55deg 4m"
                                                className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
                                            />
                                            <p className="art-text-xs art-text-gray-500 art-mt-1">
                                                The camera orbit.
                                            </p>
                                        </div>

                                        {/* Disable Zoom Toggle */}
                                        <div className="art-flex art-items-start">
                                            <label className="art-relative art-items-center art-cursor-pointer art-mt-1">
                                                <input
                                                    type="checkbox"
                                                    name="disable_zoom"
                                                    checked={productModel.disable_zoom}
                                                    onChange={handleChange}
                                                />
                                            </label>
                                            <div>
                                                <span className="art-text-sm art-font-medium art-block">Disable Zoom</span>
                                                <p className="art-text-xs art-text-gray-500 art-mt-1">
                                                    Disable zooming in and out of the model.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Disable Tap Toggle */}
                                        <div className="art-flex art-items-start">
                                            <label className="art-relative art-items-center art-cursor-pointer art-mt-1">
                                                <input
                                                    type="checkbox"
                                                    name="disable_tap"
                                                    checked={productModel.disable_tap}
                                                    onChange={handleChange}
                                                />
                                            </label>
                                            <div>
                                                <span className="art-text-sm art-font-medium art-block">Disable Tap</span>
                                                <p className="art-text-xs art-text-gray-500 art-mt-1">
                                                    Disable tap to rotate the model.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Advance Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('advance')}
                                    className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Advance
                                        <AccordionIcon status={activeAccordion.advance}/>
                                    </span>
                                </button>
                                {activeAccordion.advance && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                                        <p className="art-text-gray-600">Advanced settings content will be added here later...</p>
                                    </div>
                                )}

                                <button 
                                    type="button"
                                    onClick={handleSubmit}
                                    className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 art-w-full"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Style Section */}
                    {activeSection === 'style' && (
                        <div className="art-bg-gray-100 art-p-4 art-rounded">
                            {/* Canvas Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleStyleAccordion('canvas')}
                                    className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Canvas
                                        <AccordionIcon status={styleAccordion.canvas}/>
                                    </span>
                                </button>

                                {styleAccordion.canvas && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
                                        {/* Alignment Settings */}
                                        <div>
                                            <label className="art-block art-font-medium mb-2">Alignment</label>
                                            <select
                                                name="canvas_alignment"
                                                onChange={handleChange}
                                                className="art-w-full art-p-2 art-border art-rounded"
                                                value={productModel.canvas_alignment || 'center'}
                                            >
                                                <option value="left">Left</option>
                                                <option value="center">Center</option>
                                                <option value="right">Right</option>
                                            </select>
                                        </div>

                                        {/* Width */}
                                        <div>
                                            <label className="art-block art-font-medium mb-2">Width (px)</label>
                                            <input
                                                type="number"
                                                name="canvas_width"
                                                onChange={handleChange}
                                                value={productModel.canvas_width || ''}
                                                className="art-w-full art-p-2 art-border art-rounded"
                                                placeholder="e.g., 600"
                                            />
                                        </div>

                                        {/* Height */}
                                        <div>
                                            <label className="art-block art-font-medium mb-2">Height (px)</label>
                                            <input
                                                type="number"
                                                name="canvas_height"
                                                onChange={handleChange}
                                                value={productModel.canvas_height || ''}
                                                className="art-w-full art-p-2 art-border art-rounded"
                                                placeholder="e.g., 400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Advance Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleStyleAccordion('advance')}
                                    className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Advance
                                        <AccordionIcon status={styleAccordion.advance}/>
                                    </span>
                                </button>
                                {styleAccordion.advance && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                                        <p className="art-text-gray-600">Advanced style settings will be added later...</p>
                                    </div>
                                )}

                                <button 
                                    type="button"
                                    onClick={handleSubmit}
                                    className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 art-w-full"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Shortcode and Preview */}
            <div className="art-w-1/2">
                <div className="art-bg-white art-rounded art-shadow-sm art-flex art-gap-2">
                    <input
                        type="text"
                        name="atlas_ar_shortcode_button"
                        id="atlas_ar_shortcode_button"
                        defaultValue="[atlas_ar]"
                        title="Short code"
                        className="art-border art-w-1/2 art-rounded art-ml-4 "
                    />

                    <div
                        type="button"
                        id="atlas_ar_shortcode_button"
                        style={{ cursor: "copy" }}
                        onClick={copyshortcode}
                        className="art-w-1/5 art-h-1/5 art-cursor-pointer art-p-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500"
                    >
                        <span className="dashicons dashicons-admin-page"></span>
                        Copy ShortCode
                    </div>
                </div>

                <div id='ar_try_on_preveiw'></div>
            </div>
        </div>
    );
};

export default ARProductModelSettings;