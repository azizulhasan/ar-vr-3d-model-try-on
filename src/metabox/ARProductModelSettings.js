import React, { useState, useEffect } from "react";
import { getPostID, getURL, postWithoutImage, copyshortcode } from "../context/utilities";


const ARProductModelSettings = () => {
    const [productModel, setProductModel] = useState({
        ar_try_on_file_android: '',
        ar_try_on_file_ios: '',
        ar_try_on_file_poster: '',
        ar_try_on_file_alt: 'Title',
        ar_try_on_ar_placement: 'floor',
    });
    const [currentValue, setCurrentValue] = useState({});
    const [isProductModelLoaded, setIsProductModelLoad] = useState(false);

    /**
     * handle change
     * @param {*} e
     */
    const handleChange = (e) => {
        let value = '';
        value = e.target.value
        if (!e.target.name) return;

        if (e.target.name === 'ar_try_on_ar_placement' && (value !== 'wall' && value !== 'floor') && !ar_try_on.is_pro_active) {
            alert("This option is only available in the pro version");
            return;
        }

        const productModelData = {
            ...productModel,
            ...{ [e.target.name]: value },
        };
        setProductModel(productModelData);

        wp.hooks.doAction('ar_try_on_preview_data', productModelData);

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
                ...{ [currentValue.name]: currentValue.url }
            };
            setProductModel(productModelData);
            wp.hooks.doAction('ar_try_on_preview_data', productModelData);
        }
    }, [currentValue]);


    useEffect(() => {

        if (wp.hooks) {
            const postId = getPostID()
            /**
             * Get data from and display to table.
             */
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
    /**
     * Handle form Submit
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        // Get the 'post' parameter
        const postId = getPostID()

        let formData = new FormData();
        formData.append('fields', JSON.stringify(productModel));
        formData.append('post_id', postId);
        formData.append('method', 'post');
        postWithoutImage(getURL('product_settings'), formData)
            .then((res) => {
                setProductModel({ ...productModel, ...res.data });

                alert('Successfully Saved Data.')
                // setIsDataLoaded(true)
            })
            .catch((err) => {
                console.log(err);
            });
    };


    useEffect(() => {
        if (isProductModelLoaded) {
            console.log({ productModel })
            wp.hooks.doAction('ar_try_on_preview_data', productModel);
        }
    }, [isProductModelLoaded]);
    return (


        <div className="art-flex">
            <div className="art-w-1/2">
                <form onSubmit={handleSubmit}>
                    <div className="art-bg-gray-100">
                        {/* AR Placement */}
                        <div className="art-mb-3">
                            <label htmlFor="ar_try_on_ar_placement" className="art-font-medium">
                                AR Placement / Product Type
                            </label>

                            <select
                                className="art-w-full art-border art-rounded art-p-2 art-text-sm art-mt-1"

                                id="ar_try_on_ar_placement"
                                name="ar_try_on_ar_placement"
                                value={productModel.ar_try_on_ar_placement}
                                onChange={handleChange}
                            >
                                <option value="floor">Floor</option>
                                <option value="wall">Wall</option>
                                <option value="168">Glass {ar_try_on.is_pro_active ? ' ' : ' Pro'} </option>
                            </select>
                            {/*<p className="art-text-sm art-text-gray-500">*/}
                            {/*    Selects whether to place the object on the floor (horizontal surface) or a wall*/}
                            {/*    (vertical surface) in AR. The back (negative Z) of the object´s bounding box will be*/}
                            {/*    placed*/}
                            {/*    against the wall and the shadow will be put on this surface as well. Note that the*/}
                            {/*    different*/}
                            {/*    AR*/}
                            {/*    modes handle the placement UX differently.*/}
                            {/*</p>*/}
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
                            {/*<img id="image-preview" src="" alt="Preview" style="max-width: 200px; display: none;"/>*/}
                            {/*<input type="hidden" id="hidden-image-input" name="image_id"/>*/}
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
                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500 ">
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
                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500 ">
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
                                className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded ar-try-on-open-media-library art-border art-border-sky-500 ">
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
                        <div className="art-mb-1">
                            <button type={'submit'}
                                className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500  art-w-full">
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <div className="art-w-1/2">
                <div className="art-bg-white art-rounded art-shadow-sm art-space-y-2 art-flex ">

                    <input
                        type="text"
                        name="atlas_ar_shortcode_button"
                        id="atlas_ar_shortcode_button"
                        defaultValue="[atlas_ar]"
                        title="Short code"
                        className="art-w-1/2 art-border art-border-gray-300 art-rounded  art-text-sm art-outline-none art-focus:ring art-focus:ring-blue-500"
                    />

                    <button
                        type="button"
                        id="atlas_ar_shortcode_button"
                        style={{ "cursor": "copy" }}
                        onClick={copyshortcode}
                        className="art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 "
                    >
                        <span className="dashicons dashicons-admin-page"></span>
                        Copy ShortCode
                    </button>
                </div>

                <div id='ar_try_on_preveiw'></div>
            </div>
        </div>

    );
};

export default ARProductModelSettings;
