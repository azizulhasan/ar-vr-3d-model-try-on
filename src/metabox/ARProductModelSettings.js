import React, { useState, useEffect } from "react";
import { getPostID, getURL, postWithoutImage, copyshortcode } from "../context/utilities";
import ContentSection from "./components/ContentSection.js";
import CameraSection from "./components/CameraSection.js";
import LightEnvironmentSection from "./components/LightEnvrionmentSection.js";
import StyleSection from "./components/StyleSection.js";

const ARProductModelSettings = () => {

    const [basicSettings, setBasicSettings] = useState({
        src: 'upload',
        poster: 'upload',
        environment_source_type: 'upload',
        skybox_source_type: 'upload',
        ios_src: 'upload',
    })
    const [productModel, setProductModel] = useState({
        src: '',
        ios_src: '',
        poster: '',
        alt: 'Title',
        ar_placement: 'floor',
        // light & environment settings
        skybox_image: '',
        environment_image: '',
        // Camera settings
        auto_rotate: false,
        shadow_intensity: '1',
        camera_orbit: '45deg 55deg 4m',
        disable_zoom: false,
        disable_tap: false,
        // Canvas settings
        canvas_alignment: '',
        canvas_width: '',
        canvas_height: '',
        canvas_margin: '',
        canvas_padding: '',
        custom_css: '',
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

    const handleMediaButtonClick = (fieldName, value) => {
        setBasicSettings(prev => ({ ...prev, ...{ [fieldName]: value } }))
        let inputField = document.getElementById(fieldName)
        wp.hooks.doAction('ar_try_on_select_light_and_envirement_files', {
            name: fieldName,
            field: inputField,
        });
    };

    useEffect(() => {
        if (wp?.hooks) {
            wp.hooks.addAction('ar_try_on_on_select_model_file', 'ar_try_on', function (val) {
                setCurrentValue(val);
            });
        }
    }, [wp.hooks]);

    useEffect(() => {
        console.log(currentValue)
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
        let InterVal = setInterval(() => {
            if (document.getElementById('ar_try_on_preveiw')) {
                clearInterval(InterVal)
                const postId = getPostID()
                let formData = new FormData();
                formData.append('post_id', postId);
                formData.append('call_from', 'admin');
                postWithoutImage(getURL('get_model_and_settings'), formData).then(
                    (res) => {
                        const productModelData = {
                            ...productModel,
                            ...res.data,
                        };
                        setProductModel(productModelData);
                        setIsProductModelLoad(true)
                    });
            }
        }, 1000)

    }, []);

    useEffect(() => {
        if (isProductModelLoaded) {
            wp.hooks.doAction('ar_try_on_preview_data', productModel);
        }
    }, [isProductModelLoaded]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const postId = getPostID()
        if (!postId) {
            alert('Please publish the post first. Then reload the page and save.')
            return;
        }

        let formData = new FormData();
        formData.append('fields', JSON.stringify(productModel));
        formData.append('post_id', postId);
        formData.append('method', 'POST');
        postWithoutImage(getURL('get_model_and_settings'), formData)
            .then((res) => {
                console.log(res)
                setProductModel({ ...productModel, ...res.data });
                alert('Successfully Saved Data.')
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const SaveButton = ({ classes = 'art-w-full' }) => (
        <button
            type="button"
            onClick={handleSubmit}
            className={"art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 " + classes}
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
                        className={`art-px-4 art-py-2 art-cursor-pointer art-font-medium art-border-b-2 ${activeSection === 'settings'
                            ? 'art-border-blue-500 art-text-blue-600'
                            : 'art-border-transparent art-text-gray-600 hover:art-text-gray-800'
                            }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => toggleSection('style')}
                        className={`art-px-4 art-py-2 art-font-medium art-cursor-pointer art-border-b-2 ${activeSection === 'style'
                            ? 'art-border-blue-500 art-text-blue-600'
                            : 'art-border-transparent art-text-gray-600 hover:art-text-gray-800'
                            }`}
                    >
                        Style
                    </button>
                </div>

                <div>
                    <br />
                    {/* Settings Section */}
                    {activeSection === 'settings' && (
                        <div className="art-bg-gray-100 art-rounded">
                            <ContentSection
                                basicSettings={basicSettings}
                                productModel={productModel}
                                handleChange={handleChange}
                                setBasicSettings={setBasicSettings}
                                activeAccordion={activeAccordion}
                                toggleAccordion={toggleAccordion}
                                handleMediaButtonClick={handleMediaButtonClick}
                            />

                            <CameraSection
                                productModel={productModel}
                                handleChange={handleChange}
                                activeAccordion={activeAccordion}
                                toggleAccordion={toggleAccordion}
                            />

                            <LightEnvironmentSection
                                basicSettings={basicSettings}
                                productModel={productModel}
                                handleChange={handleChange}
                                handleMediaButtonClick={handleMediaButtonClick}
                                activeAccordion={activeAccordion}
                                toggleAccordion={toggleAccordion}
                                setBasicSettings={setBasicSettings}
                            />


                        </div>
                    )}

                    {/* Style Section */}
                    {activeSection === 'style' && (
                        <StyleSection
                            productModel={productModel}
                            handleChange={handleChange}
                            styleAccordion={styleAccordion}
                            toggleStyleAccordion={toggleStyleAccordion}

                        />



                    )}

                    <SaveButton />


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
                        // className="art-w-1/5 art-h-1/5 art-cursor-pointer art-p-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500"
                        className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 art-w-80 "
                    >
                        <span className="dashicons dashicons-admin-page"></span>
                        Copy ShortCode
                    </div>
                    <SaveButton classes="art-w-96" />
                </div>

                <div id='ar_try_on_preveiw'></div>
            </div>
            <div className="art-hidden art-w-96 art-w-1/3"></div>
        </div>
    );
};

export default ARProductModelSettings;
