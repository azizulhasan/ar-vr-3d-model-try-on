import React, { useState, useEffect } from "react";
import { getPostID, getURL, postWithoutImage, copyshortcode } from "../context/utilities";
import AccordionIcon from "../icons/AccordionIcon";

const ARProductModelSettings = () => {
    const [productModel, setProductModel] = useState({
        // ar_try_on_file_android: '',
        // ar_try_on_file_ios: '',
        ar_try_on_file_poster: '',
        ar_try_on_file_alt: 'Title',
        ar_try_on_ar_placement: 'floor',
        ar_try_on_test_field: '',
        ar_try_on_android_model: '',
        ar_try_on_ios_model: '',
        // Camera settings
        auto_rotate: false,
        shadow_intensity: '1',
        camera_orbit: '45deg 55deg 4m',
        disable_zoom: false,
        disable_tap: false,
        poster_source_type: 'upload',
        environment_source_type: 'upload', 
        model_source_type: 'upload',
        skybox_source_type: 'upload',
        android_model_source_type: 'upload',
        ios_model_source_type: 'upload'
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
                    const productModelData = { 
                        ...productModel, 
                        ...res.data,
                        // Always force these to 'upload' on page load
                        android_model_source_type: 'upload',
                        ios_model_source_type: 'upload',
                        poster_source_type: 'upload',
                        environment_source_type: 'upload',
                        skybox_source_type: 'upload',
                    };
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

    const SaveButton = () => (
    <button 
        type="button"
        onClick={handleSubmit}
        className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 art-w-full"
    >
        Save
    </button>
    );







    return (
        <div className="art-flex art-gap-6" style={{ display: 'flex', gap: '0.25rem' }}>
            {/* Left Side - Settings/Style Sections */}
            <div className="art-w-1/2" style={{ width: '50%', borderRight: '1px solid black', paddingRight: '1rem' }}>
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
                                                <div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-px-2 art-pointer-events-none">
                                                    <svg className="art-fill-current art-h-4 art-w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        {/* <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/> */}
                                                    </svg>
                                                </div>
                                            </div>
                                            
                                            {/* Display selected option with icon */}
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



{/* 
                            {activeAccordion.content && (
                                <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-6"> */}
                                    {/* === Android MODEL URL === */}
                                    <div className="art-border art-border-solid art-border-black art-p-4">
                                             <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                                                    MODEL URL FOR ANDROID
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M17.523 15.3414c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm-11.046 0c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm11.405-6.02L19.76 6.394c.095-.152.043-.348-.109-.442-.15-.095-.348-.043-.442.109l-1.906 3.038C16.04 8.73 14.06 8.366 12 8.366c-2.06 0-4.04.364-5.303.733L4.791 6.061c-.095-.152-.292-.204-.442-.109-.152.095-.204.291-.109.442L6.118 9.32C3.264 10.558 1.5 12.833 1.5 15.441v1.2h21v-1.2c0-2.608-1.764-4.883-4.618-6.121z" fill="#3DDC84"/>
                                                    </svg>
                                                </label>
                                        <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, android_model_source_type: 'upload' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.android_model_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-cloud-upload"></span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, android_model_source_type: 'url' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.android_model_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-format-image"></span>
                                            </button>
                                        </div>

                                        {/* Show input field when upload (cloud-upload) is selected */}
                                        {productModel.android_model_source_type === 'upload' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR ANDROID</label>
                                              <input
                                                type="text"
                                                name="ar_try_on_android_model"  // This should match the field name in handleMediaButtonClick
                                                value={productModel.ar_try_on_android_model || ''} // Add || '' to prevent undefined errors
                                                onChange={handleChange}
                                                className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                placeholder="Enter Android model URL"
                                            />
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the Android model file.</p>
                                            </>
                                        )}

                                        {/* Show Select Android Model button when url (format-image) is selected */}
                                        {productModel.android_model_source_type === 'url' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR ANDROID</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaButtonClick('ar_try_on_android_model')}
                                                    className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                                >
                                                    Select .glb model url
                                                </button>
                                                {productModel.ar_try_on_android_model && (
                                                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                        Selected: {productModel.ar_try_on_android_model.split('/').pop()}
                                                    </p>
                                                )}
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select Android model from media library.</p>
                                            </>
                                        )}
                                    </div>
                                    <br/>

                                    {/* === IOS MODEL URL === */}
                                    <div className="art-border art-border-solid art-border-black art-p-4">
                                           <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                                                        MODEL URL FOR IOS
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#000000"/>
                                                        </svg>
                                                    </label>
                                        
                                        <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, ios_model_source_type: 'upload' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.ios_model_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-cloud-upload"></span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, ios_model_source_type: 'url' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.ios_model_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-format-image"></span>
                                            </button>
                                        </div>

                                        {/* Show input field when upload (cloud-upload) is selected */}
                                        {productModel.ios_model_source_type === 'upload' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR IOS</label>

                                                    <input
                                                        type="text"
                                                        name="ar_try_on_ios_model"  // This should match the field name in handleMediaButtonClick
                                                        value={productModel.ar_try_on_ios_model || ''} // Add || '' to prevent undefined errors
                                                        onChange={handleChange}
                                                        className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                        placeholder="Enter iOS model URL"
                                                    />
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the iOS model file.</p>
                                            </>
                                        )}

                                        {/* Show Select iOS Model button when url (format-image) is selected */}
                                        {productModel.ios_model_source_type === 'url' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR IOS</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaButtonClick('ar_try_on_ios_model')}
                                                    className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                                >
                                                    Select .usdz model url
                                                </button>
                                                {productModel.ar_try_on_ios_model && (
                                                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                        Selected: {productModel.ar_try_on_ios_model.split('/').pop()}
                                                    </p>
                                                )}
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select iOS model from media library.</p>
                                            </>
                                        )}
                                    </div>
                                      <br/>

                                {/* === POSTER SOURCE === */}

                                <div className="art-border art-border-solid art-border-black art-p-4">
                                    <label className="art-text-xs art-font-semibold art-uppercase">Poster Source</label>
                                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, poster_source_type: 'upload' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.poster_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-cloud-upload"></span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, poster_source_type: 'url' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.poster_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-format-image"></span>
                                        </button>
                                    </div>

                                    {/* Show input field when upload (cloud-upload) is selected */}
                                    {productModel.poster_source_type === 'upload' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">POSTER</label>
                                            <input
                                                type="text"
                                                name="ar_try_on_file_poster"
                                                value={productModel.ar_try_on_file_poster}
                                                onChange={handleChange}
                                                className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                placeholder="Enter poster image URL"
                                            />
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the poster image.</p>
                                        </>
                                    )}

                                    {/* Show Select Poster button when url (format-image) is selected */}
                                    {productModel.poster_source_type === 'url' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">POSTER</label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_try_on_file_poster')}
                                                className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                            >
                                                Select Poster
                                            </button>
                                            {productModel.ar_try_on_file_poster && (
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                    Selected: {productModel.ar_try_on_file_poster.split('/').pop()}
                                                </p>
                                            )}
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select poster image from media library.</p>
                                        </>
                                    )}
                                </div>
                                

                                    {/* Alt Text */}
                                        <div className="art-mb-1">
                                            <label
                                                htmlFor="ar_try_on_file_alt"
                                                className="art-block art-text-sm art-font-medium art-items-center art-gap-2"
                                            >
                                                <img
                                                    src={ar_try_on.plugin_url + "admin/images/icons8-web-accessibility-18.png"}
                                                    alt="Accessibility Icon"
                                                    className="art-w-6 art-h-6 art-mt-4"
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
                                
                              
                                                                    

                                {/* === MODEL SOURCE === */}
                                {/* <div>
                                    <label className="art-text-xs art-font-semibold art-uppercase">Model Source</label>
                                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, model_source_type: 'upload' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.model_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-cloud-upload"></span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, model_source_type: 'url' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.model_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-format-image"></span>
                                        </button>
                                    </div>
                                    {/* Show input field when upload (cloud-upload) is selected */}
                                    {/* {productModel.model_source_type === 'upload' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL</label>
                                            <input
                                                type="text"
                                                name="ar_model_url"
                                                value={productModel.ar_model_url || ''}
                                                onChange={handleChange}
                                                className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                placeholder="Enter .glTF or .GLB model URL"
                                            />
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the glTF or GLB model to be displayed.</p>
                                        </>
                                    )} */}
                                    {/* Show Select Model button when url (format-image) is selected */}
                                    {/* {productModel.model_source_type === 'url' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL</label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_model_url')}
                                                className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                            >
                                                Select Model
                                            </button>
                                            {productModel.ar_model_url && (
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                    Selected: {productModel.ar_model_url.split('/').pop()}
                                                </p>
                                            )}
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select glTF or GLB model from media library.</p>
                                        </>
                                    )}
                                //  */} 

           





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

                            {/* Light & Environment Accordion */}
                            <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('light')}
                                    className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                                >
                                    <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                        Light & Environment
                                        <AccordionIcon status={activeAccordion.light}/>
                                    </span>
                                </button>
                                {activeAccordion.light && (
                                    <div className="art-px-3 art-py-2 art-bg-white art-border-t ">
                                        
                                    {/* === SKYBOX SOURCE === */}
                                    <div className="art-border art-border-solid art-border-black art-p-4">
                                        <label className="art-text-xs art-font-semibold art-uppercase">Skybox Source</label>
                                        <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, skybox_source_type: 'upload' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.skybox_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-cloud-upload"></span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProductModel(prev => ({ ...prev, skybox_source_type: 'url' }))}
                                                className={`art-p-2 art-transition-all art-duration-200 ${
                                                    productModel.skybox_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                                }`}
                                            >
                                                <span className="dashicons dashicons-format-image"></span>
                                            </button>
                                        </div>
                                        {/* Show input field when upload (cloud-upload) is selected */}
                                        {productModel.skybox_source_type === 'upload' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">SKYBOX IMAGE</label>
                                                <input
                                                    type="text"
                                                    name="ar_skybox_image"
                                                    value={productModel.ar_skybox_image}
                                                    onChange={handleChange}
                                                    className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                    placeholder="Enter skybox image URL"
                                                />
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the skybox image for the AR environment.</p>
                                            </>
                                        )}
                                        {/* Show Select Skybox button when url (format-image) is selected */}
                                        {productModel.skybox_source_type === 'url' && (
                                            <>
                                                <label className="art-mt-2 art-block art-text-sm art-font-medium">SKYBOX IMAGE</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaButtonClick('ar_skybox_image')}
                                                    className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                                >
                                                    Select Skybox Image
                                                </button>
                                                {productModel.ar_skybox_image && (
                                                    <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                        Selected: {productModel.ar_skybox_image.split('/').pop()}
                                                    </p>
                                                )}
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select skybox image from media library.</p>
                                            </>
                                        )}
                                        </div>
                                          <br/>
                                                                        {/* === ENVIRONMENT IMAGE SOURCE === */}
                                <div className="art-border art-border-solid art-border-black art-p-4">
                                    <label className="art-text-xs art-font-semibold art-uppercase">Environment Image Source</label>
                                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, environment_source_type: 'upload' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.environment_source_type === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-cloud-upload"></span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProductModel(prev => ({ ...prev, environment_source_type: 'url' }))}
                                            className={`art-p-2 art-transition-all art-duration-200 ${
                                                productModel.environment_source_type === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'
                                            }`}
                                        >
                                            <span className="dashicons dashicons-format-image"></span>
                                        </button>
                                    </div>
                                    {/* Show input field when upload (cloud-upload) is selected */}
                                    {productModel.environment_source_type === 'upload' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">ENVIRONMENT IMAGE</label>
                                            <input
                                                type="text"
                                                name="ar_try_on_file_environment"
                                                value={productModel.ar_try_on_file_environment}
                                                onChange={handleChange}
                                                className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                                                placeholder="Enter environment image URL"
                                            />
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">HDR image to use as the environment map.</p>
                                        </>
                                    )}
                                    {/* Show Select Environment Image button when url (format-image) is selected */}
                                    {productModel.environment_source_type === 'url' && (
                                        <>
                                            <label className="art-mt-2 art-block art-text-sm art-font-medium">ENVIRONMENT IMAGE</label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaButtonClick('ar_try_on_file_environment')}
                                                className="art-w-1/4 art-mt-1 art-p-2 art-border art-rounded art-bg-blue-500 art-text-white hover:art-bg-blue-600 art-transition-colors"
                                            >
                                                Select Image (HDR)
                                            </button>
                                            {productModel.ar_try_on_file_environment && (
                                                <p className="art-text-sm art-text-gray-600 art-mt-1">
                                                    Selected: {productModel.ar_try_on_file_environment.split('/').pop()}
                                                </p>
                                            )}
                                            <p className="art-text-sm art-text-gray-600 art-mt-1">Click to select environment image from media library.</p>
                                        </>
                                    )}
                                </div>  
                                </div>

                               


                                        

                                   
                                )}

                              <SaveButton />
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
                                        <AccordionIcon status={styleAccordion.canvas} />
                                    </span>
                                </button>

                               {styleAccordion.canvas && (
                                <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
                                    {/* Alignment */}
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
                                        <label className="art-block art-font-medium mb-2">Width</label>
                                        <input
                                            type="text"
                                            name="canvas_width"
                                            onChange={handleChange}
                                            value={productModel.canvas_width || ''}
                                            className="art-w-full art-p-2 art-border art-rounded"
                                            placeholder="e.g., 600px, 50%, 10rem"
                                        />
                                    </div>

                                    {/* Height */}
                                    <div>
                                        <label className="art-block art-font-medium mb-2">Height</label>
                                        <input
                                            type="text"
                                            name="canvas_height"
                                            onChange={handleChange}
                                            value={productModel.canvas_height || ''}
                                            className="art-w-full art-p-2 art-border art-rounded"
                                            placeholder="e.g., 400px, auto, 30vh"
                                        />
                                    </div>

                                    {/* Margin */}
                                    <div>
                                        <label className="art-block art-font-medium mb-2">Margin</label>
                                        <input
                                            type="text"
                                            name="canvas_margin"
                                            onChange={handleChange}
                                            value={productModel.canvas_margin || ''}
                                            className="art-w-full art-p-2 art-border art-rounded"
                                            placeholder="e.g., 10px 20px"
                                        />
                                    </div>

                                    {/* Padding */}
                                    <div>
                                        <label className="art-block art-font-medium mb-2">Padding</label>
                                        <input
                                            type="text"
                                            name="canvas_padding"
                                            onChange={handleChange}
                                            value={productModel.canvas_padding || ''}
                                            className="art-w-full art-p-2 art-border art-rounded"
                                            placeholder="e.g., 1rem 2rem"
                                        />
                                    </div>
                                </div>
                            )}

                        {/* Custom CSS Accordion */}
                        <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
                            <button
                                type="button"
                                onClick={() => toggleStyleAccordion('advance')}
                                className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
                            >
                                <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                                    Custom CSS
                                    <AccordionIcon status={styleAccordion.advance} />
                                </span>
                            </button>

                            {styleAccordion.advance && (
                                <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
                                    <label className="art-block art-font-medium mb-2">Write Custom CSS</label>
                                    <textarea
                                        name="custom_css"
                                        onChange={handleChange}
                                        value={productModel.custom_css || ''}
                                        className="art-w-full art-min-h-[150px] art-p-2 art-border art-rounded art-font-mono art-text-sm"
                                        placeholder={`e.g.\n.selector {\n    color: red;\n    font-size: 16px;\n}`}
                                    />
                                </div>
                            )}
                        </div>


                                   <SaveButton />
                            </div>
                         </div>
                    )}
                </div>
            </div>

            {/* Right Side - Shortcode and Preview */}
            <div className="art-w-1/2" style={{ width: '50%', paddingLeft: '1rem' }}>
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