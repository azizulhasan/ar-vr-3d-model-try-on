// components/ARSettings/ContentSection.js
import React, { useState, useEffect } from "react";
import AccordionIcon from "../../icons/AccordionIcon";
import notify from "../../context/Notify";

const ContentSection = ({
                            basicSettings,
                            productModel,
                            handleChange,
                            setBasicSettings,
                            activeAccordion,
                            toggleAccordion,
                            handleMediaButtonClick,
                            setProductModel
                        }) => {
    // Variations state
    const [hasShownVariationWarning, setHasShownVariationWarning] = useState(false);
    const [modelVariants, setModelVariants] = useState([]);
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState([]);

    // Get WooCommerce product data from localized script
    const isVariableProduct = ar_try_on?.wc_product?.is_variable || false;
    const wcVariations = ar_try_on?.wc_product?.variations || [];
    const wcAttributes = ar_try_on?.wc_product?.attributes || [];


    useEffect(()=> {
        if(isVariableProduct && productModel.src){
            loadModelVariants()
        }
    },[productModel.src, isVariableProduct])

    // Initialize variationSettings if not present
    useEffect(() => {
        if (setProductModel && !productModel.variationSettings) {
            setProductModel(prev => ({
                ...prev,
                variationSettings: {
                    variantAttribute: [],
                    variantMapping: {},
                    variants: {}
                }
            }));
        }
    }, []);

    // Load selected attributes from saved data
    useEffect(() => {
        if (productModel.variationSettings?.variantAttribute) {
            setSelectedAttributes(productModel.variationSettings.variantAttribute);
        }
    }, [productModel.variationSettings?.variantAttribute]);

    // Show warning when user interacts with variations in free version
    const showVariationProWarning = () => {
        if (!ar_try_on.is_pro_active && !hasShownVariationWarning) {
            notify('Variations is a Pro feature. Changes will appear in preview but won\'t be saved to the database.', 'warn', {
                autoClose: 5000,
            });
            setHasShownVariationWarning(true);
        }
    };

    // Load model variants from the 3D model file
    const loadModelVariants = () => {
        setIsLoadingVariants(true);
        const checkModelViewer = setInterval(() => {
            const modelViewer = document.querySelector('.atlas_ar_model_viewer');
            if (modelViewer && modelViewer.availableVariants) {
                clearInterval(checkModelViewer);
                const variants = Array.from(modelViewer.availableVariants || []);
                setModelVariants(variants);
                setIsLoadingVariants(false);
            }
        }, 500);
        setTimeout(() => {
            clearInterval(checkModelViewer);
            setIsLoadingVariants(false);
        }, 59000);
    };

    // Handle attribute selection change
    const handleAttributeChange = (attributeName, isChecked) => {
        showVariationProWarning();
        let newSelectedAttributes;
        if (isChecked) {
            newSelectedAttributes = [...selectedAttributes, attributeName];
        } else {
            newSelectedAttributes = selectedAttributes.filter(attr => attr !== attributeName);
        }
        setSelectedAttributes(newSelectedAttributes);
        if (setProductModel) {
            setProductModel(prev => ({
                ...prev,
                variationSettings: {
                    ...prev.variationSettings,
                    variantAttribute: newSelectedAttributes
                }
            }));
        }
    };

    // Handle variant mapping change
    const handleMappingChange = (wcVariant, modelVariant) => {
        showVariationProWarning();
        if (setProductModel) {
            setProductModel(prev => ({
                ...prev,
                variationSettings: {
                    ...prev.variationSettings,
                    variantMapping: {
                        ...prev.variationSettings?.variantMapping,
                        [wcVariant]: modelVariant
                    }
                }
            }));
        }
    };

    // Handle separate model URL change
    const handleVariantModelChange = (variantName, modelUrl) => {
        showVariationProWarning();
        if (setProductModel) {
            setProductModel(prev => ({
                ...prev,
                variationSettings: {
                    ...prev.variationSettings,
                    variants: {
                        ...prev.variationSettings?.variants,
                        [variantName]: modelUrl
                    }
                }
            }));
        }
    };

    // Remove variant model
    const handleRemoveVariantModel = (variantName) => {
        showVariationProWarning();
        if (setProductModel) {
            setProductModel(prev => {
                const newVariants = { ...prev.variationSettings?.variants };
                delete newVariants[variantName];
                return {
                    ...prev,
                    variationSettings: {
                        ...prev.variationSettings,
                        variants: newVariants
                    }
                };
            });
        }
    };

    useEffect(()=> {
        console.log({variationSettings: productModel.variationSettings})
    },[productModel.variationSettings])
    // Check if variant is mapped
    const isVariantMapped = (variantName) => {
        let modelVariant = productModel.variationSettings?.variantMapping?.[variantName];
        return modelVariants.includes(modelVariant);

    };

    // Check if variant has separate model
    const hasVariantModel = (variantName) => {
        return productModel.variationSettings?.variants?.[variantName] &&
               productModel.variationSettings.variants[variantName] !== '';
    };
    return (
        <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
            <button
                type="button"
                onClick={() => toggleAccordion('content')}
                className="art-w-full art-flex art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
            >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Content
          <AccordionIcon status={activeAccordion.content} />
        </span>
            </button>


            <div className={activeAccordion.content ? " art-block art-px-3 art-py-2 art-bg-white art-border-t " : " art-hidden art-px-3 art-py-2 art-bg-white art-border-t "}>
                {/* AR Placement */}
                <div className="art-mb-3">
                    <label className="art-font-medium art-block art-mb-2">
                        AR Placements / Product Type
                    </label>
                    <div className="art-relative">
                        <select
                            name="ar_placement"
                            value={productModel.ar_placement}
                            onChange={handleChange}
                            className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded art-bg-white art-appearance-none art-pr-8"
                        >
                            <option value="floor">Floor</option>
                            <option value="wall">Wall</option>
                            {/*TODO: this option will be enable when MIndar will be active*/}
                            {/*<option value="168">Glass Pro</option>*/}
                        </select>
                        <div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-px-2 art-pointer-events-none">
                            <svg className="art-fill-current art-h-4 art-w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"></svg>
                        </div>
                    </div>
                </div>
                {/*//TODO: AR-40-6 will be implemented here.*/}


                {/* Android Model */}
                <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                        MODEL {basicSettings.src == 'upload' ? "File" : 'URL'} FOR ANDROID
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.523 15.3414c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm-11.046 0c-.5077 0-.91-.4023-.91-.8999 0-.4976.4023-.8999.91-.8999.5077 0 .91.4023.91.8999 0 .4976-.4023.8999-.91.8999zm11.405-6.02L19.76 6.394c.095-.152.043-.348-.109-.442-.15-.095-.348-.043-.442.109l-1.906 3.038C16.04 8.73 14.06 8.366 12 8.366c-2.06 0-4.04.364-5.303.733L4.791 6.061c-.095-.152-.292-.204-.442-.109-.152.095-.204.291-.109.442L6.118 9.32C3.264 10.558 1.5 12.833 1.5 15.441v1.2h21v-1.2c0-2.608-1.764-4.883-4.618-6.121z" fill="#3DDC84" />
                        </svg>
                    </label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                        <button
                            type="button"
                            // onClick={() => setBasicSettings(prev => ({ ...prev, src: 'upload' }))}
                            onClick={(e) => handleMediaButtonClick('src', 'upload')}
                            data-name="src"
                            className={`art-cursor-pointer ar-try-on-open-media-library art-p-2 art-transition-all art-duration-200 ${basicSettings.src === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span data-name="src" className="dashicons dashicons-cloud-upload"></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setBasicSettings(prev => ({ ...prev, src: 'url' }))}
                            className={`art-p-2 art-transition-all art-cursor-pointer art-duration-200 ${basicSettings.src === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span className="dashicons dashicons-format-image"></span>
                        </button>
                    </div>

                    <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR ANDROID</label>
                    <input
                        type="text"
                        id="src"
                        name="src"
                        value={productModel.src || ''}
                        onChange={handleChange}
                        className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                        placeholder="Enter Android model URL"
                    />
                    <p id='atlas_ar_android_file_notice' className="art-text-sm art-text-gray-600 art-mt-1">The URL of the Android model file.</p>
                </div>
                <br />

                {/* Variations Section - Only for variable products */}
                {isVariableProduct && (
                    <div className="art-border art-border-solid art-border-black art-p-4">
                        <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-2">
                            PRODUCT VARIATIONS
                            {!ar_try_on.is_pro_active && (
                                <span className="art-bg-orange-100 art-text-orange-800 art-text-xs art-px-2 art-py-0.5 art-rounded">
                                    Pro
                                </span>
                            )}
                        </label>

                        {/* Pro Feature Notice */}
                        {!ar_try_on.is_pro_active && (
                            <div className="art-mt-2 art-p-2 art-bg-orange-50 art-border art-border-orange-200 art-rounded art-text-xs art-text-orange-800">
                                <strong>Pro Feature:</strong> Variation models are available in the Pro version.
                            </div>
                        )}

                        {/* Load Model Variants Button */}
                        <div className="art-mt-3 art-flex art-items-center art-gap-2">
                            <button
                                type="button"
                                onClick={loadModelVariants}
                                disabled={isLoadingVariants}
                                className="art-px-3 art-py-1 art-text-sm art-bg-blue-500 art-text-white art-rounded hover:art-bg-blue-600 disabled:art-opacity-50"
                            >
                                {isLoadingVariants ? 'Loading...' : 'Load Model Variants'}
                            </button>
                            {modelVariants.length > 0 && (
                                <span className="art-text-xs art-text-green-600">
                                    {modelVariants.length} variant(s) found
                                </span>
                            )}
                        </div>

                        {/* Model Variants Display */}
                        {modelVariants.length > 0 && (
                            <div className="art-mt-2 art-p-2 art-bg-green-50 art-border art-border-green-200 art-rounded">
                                <p className="art-text-xs art-text-green-800 art-font-medium art-mb-1">
                                    Model built-in variants:
                                </p>
                                <div className="art-flex art-flex-wrap art-gap-1">
                                    {modelVariants.map((variant, index) => (
                                        <span key={index} className="art-bg-green-100 art-text-green-800 art-text-xs art-px-2 art-py-0.5 art-rounded">
                                            {variant}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Attribute Selection */}
                        <div className="art-mt-3">
                            <label className="art-block art-text-sm art-font-medium art-mb-2">
                                Select Attribute(s) for 3D Variants:
                            </label>
                            <div className="art-space-y-1">
                                {wcAttributes.map((attr, index) => (
                                    <label key={index} className="art-flex art-items-center art-gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedAttributes.includes(attr.name)}
                                            onChange={(e) => handleAttributeChange(attr.name, e.target.checked)}
                                            className="art-rounded"
                                        />
                                        <span className="art-text-sm">{attr.name}</span>
                                        <span className="art-text-xs art-text-gray-500">
                                            ({attr.options?.length || 0} options)
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Variant Mapping & Upload for each selected attribute */}
                        {selectedAttributes.map((attributeName, attrIndex) => {
                            const attribute = wcAttributes.find(a => a.name === attributeName);
                            const options = attribute?.options || [];

                            return (
                                <div key={attrIndex} className="art-mt-3 art-border art-border-gray-200 art-rounded art-p-2">
                                    <h4 className="art-font-medium art-text-sm art-mb-2 art-text-slate-700">
                                        {attributeName} Variants
                                    </h4>

                                    <div className="art-space-y-3">
                                        {options.map((option, optIndex) => {
                                            const variantName = option;
                                            const isMapped = isVariantMapped(variantName);
                                            const hasModel = hasVariantModel(variantName);
                                            const currentMapping = productModel.variationSettings?.variantMapping?.[variantName] || '';
                                            const currentModelUrl = productModel.variationSettings?.variants?.[variantName] || '';

                                            return (
                                                <div key={optIndex} className="art-border art-border-gray-100 art-rounded art-p-2 art-bg-gray-50">
                                                    <div className="art-flex art-items-center art-justify-between art-mb-1">
                                                        <span className="art-font-medium art-text-sm">{variantName}</span>
                                                        {(isMapped || hasModel) && (
                                                            <span className="art-text-xs art-text-green-600">
                                                                {isMapped ? '✓ Mapped' : '✓ Has Model'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Model Variant Mapping Dropdown */}
                                                    <div className="art-mb-2">
                                                        <label className="art-block art-text-xs art-text-gray-600 art-mb-1">
                                                            Map to Model Variant:
                                                        </label>
                                                        <select
                                                            value={currentMapping}
                                                            onChange={(e) => handleMappingChange(variantName, e.target.value)}
                                                            className="art-w-full art-p-1 art-text-sm art-border art-border-gray-300 art-rounded art-bg-white"
                                                        >
                                                            <option value="">-- Select --</option>
                                                            {modelVariants.map((mv, mvIndex) => (
                                                                <option key={mvIndex} value={mv}>{mv}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Separate Model Upload (if not mapped) */}
                                                    {!isMapped && (
                                                        <div className="art-border-t art-border-gray-200 art-pt-2">
                                                            <label className="art-block art-text-xs art-text-gray-600 art-mb-1">
                                                                Or Upload Separate Model:
                                                            </label>
                                                            <div className="art-flex art-gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={currentModelUrl}
                                                                    onChange={(e) => handleVariantModelChange(variantName, e.target.value)}
                                                                    placeholder="Model URL"
                                                                    className="art-flex-1 art-p-1 art-text-sm art-border art-border-gray-300 art-rounded"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        showVariationProWarning();
                                                                        if (wp && wp.media) {
                                                                            const frame = wp.media({
                                                                                title: `Select 3D Model for ${variantName}`,
                                                                                button: { text: 'Use this model' },
                                                                                multiple: false
                                                                            });
                                                                            frame.on('select', () => {
                                                                                const attachment = frame.state().get('selection').first().toJSON();
                                                                                handleVariantModelChange(variantName, attachment.url);
                                                                            });
                                                                            frame.open();
                                                                        }
                                                                    }}
                                                                    className="art-px-2 art-py-1 art-bg-gray-200 art-rounded hover:art-bg-gray-300"
                                                                    title="Upload"
                                                                >
                                                                    <span className="dashicons dashicons-cloud-upload"></span>
                                                                </button>
                                                                {hasModel && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveVariantModel(variantName)}
                                                                        className="art-px-2 art-py-1 art-bg-red-100 art-text-red-600 art-rounded hover:art-bg-red-200"
                                                                        title="Remove"
                                                                    >
                                                                        <span className="dashicons dashicons-trash"></span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Preview Dropdown */}
                        {selectedAttributes.length > 0 && (
                            <div className="art-mt-3 art-p-2 art-bg-blue-50 art-border art-border-blue-200 art-rounded">
                                <label className="art-block art-text-sm art-font-medium art-mb-1 art-text-blue-800">
                                    Preview Variant:
                                </label>
                                <select
                                    onChange={(e) => {
                                        const variantName = e.target.value;
                                        if (!variantName) return;
                                        const modelViewer = document.querySelector('.atlas_ar_model_viewer');
                                        if (!modelViewer) return;
                                        const mapping = productModel.variationSettings?.variantMapping?.[variantName];
                                        const separateModel = productModel.variationSettings?.variants?.[variantName];
                                        if (mapping && modelVariants.includes(mapping)) {
                                            console.log(modelViewer.src , productModel.src)
                                            if(modelViewer.src !== productModel.src) {
                                                modelViewer.src = productModel.src;
                                            }
                                            modelViewer.variantName = mapping;
                                        } else if (separateModel) {
                                            modelViewer.src = separateModel;
                                        } else {
                                            modelViewer.variantName = null;
                                        }
                                    }}
                                    className="art-w-full art-p-1 art-text-sm art-border art-border-blue-300 art-rounded art-bg-white"
                                >
                                    <option value="">-- Select Variant to Preview --</option>
                                    {selectedAttributes.flatMap(attrName => {
                                        const attr = wcAttributes.find(a => a.name === attrName);
                                        return (attr?.options || []).map(opt => (
                                            <option key={`${attrName}-${opt}`} value={opt}>
                                                {attrName}: {opt}
                                            </option>
                                        ));
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Info for no attributes selected */}
                        {selectedAttributes.length === 0 && wcAttributes.length > 0 && (
                            <div className="art-mt-2 art-p-2 art-bg-yellow-50 art-border art-border-yellow-200 art-rounded">
                                <p className="art-text-xs art-text-yellow-800">
                                    Select attribute(s) above to configure 3D model variants.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                <br />

                {/* iOS Model */}
                <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase art-flex art-items-center art-gap-1">
                        MODEL {basicSettings.ios_src == 'upload' ? "File" : 'URL'} FOR IOS
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#000000" />
                        </svg>
                    </label>

                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                        <button
                            type="button"
                            // onClick={() => setBasicSettings(prev => ({ ...prev, ios_src: 'upload' }))}
                            onClick={(e) => handleMediaButtonClick('ios_src', 'upload')}
                            data-name="ios_src"
                            className={`art-cursor-pointer ar-try-on-open-media-library art-p-2 art-transition-all art-duration-200 ${basicSettings.ios_src === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span data-name="ios_src" className="dashicons dashicons-cloud-upload"></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setBasicSettings(prev => ({ ...prev, ios_src: 'url' }))}
                            className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.ios_src === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span className="dashicons dashicons-format-image"></span>
                        </button>
                    </div>

                    <label className="art-mt-2 art-block art-text-sm art-font-medium">MODEL URL FOR IOS</label>
                    <input
                        type="text"
                        id="ios_src"
                        name="ios_src"
                        value={productModel.ios_src || ''}
                        onChange={handleChange}
                        className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                        placeholder="Enter iOS model URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the iOS model file.</p>
                </div>
                <br />

                {/* Poster Source */}
                <div className="art-border art-border-solid art-border-black art-p-4">
                    <label className="art-text-xs art-font-semibold art-uppercase"> POSTER SOURCE {basicSettings.poster == 'upload' ? "File" : 'URL'}</label>
                    <div className="art-flex art-mt-1 art-border art-rounded art-overflow-hidden">
                        <button
                            type="button"
                            // onClick={() => setBasicSettings(prev => ({ ...prev, poster: 'upload' }))}
                            onClick={(e) => handleMediaButtonClick('poster', 'upload')}
                            data-name="poster"
                            className={`art-p-2 ar-try-on-open-media-library art-transition-all art-duration-200 ${basicSettings.poster === 'upload' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span data-name="poster" className="dashicons dashicons-cloud-upload"></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setBasicSettings(prev => ({ ...prev, poster: 'url' }))}
                            className={`art-p-2 art-transition-all art-duration-200 ${basicSettings.poster === 'url' ? 'art-bg-black art-text-white' : 'art-bg-white art-text-black'}`}
                        >
                            <span className="dashicons dashicons-format-image"></span>
                        </button>
                    </div>

                    <label className="art-mt-2 art-block art-text-sm art-font-medium">POSTER</label>
                    <input
                        type="text"
                        id="poster"
                        name="poster"
                        value={productModel.poster}
                        onChange={handleChange}
                        className="art-w-full art-mt-1 art-p-2 art-border art-rounded"
                        placeholder="Enter poster image URL"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-1">The URL of the poster image.</p>
                </div>

                {/* Alt Text */}
                <div className="art-mb-1">
                    <label
                        htmlFor="alt"
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
                        id="alt"
                        name="alt"
                        onChange={handleChange}
                        value={productModel.alt}
                        className="art-border art-w-full art-mt-2 art-p-2 art-rounded"
                    />
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        Insert a text. If the text field is left empty, the name of the product is taken.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContentSection;