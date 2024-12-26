import React, {useState, useEffect} from "react";
import {getPostID, getURL, postWithoutImage} from "../context/utilities";

import toast from '../context/Notify';

const ARProductModelSettings = () => {
    const [productModel, setProductModel] = useState({
        ar_try_on_file_android: '',
        ar_try_on_file_ios: '',
        ar_try_on_file_poster: '',
        ar_try_on_file_alt: 'test',
    });
    const [currentValue, setCurrentValue] = useState({});

    /**
     * handle change
     * @param {*} e
     */
    const handleChange = (e) => {
        let value = '';
        value = e.target.value
        if (!e.target.name) return;
        console.log({name: e.target.name, value})

        setProductModel({
            ...productModel,
            ...{[e.target.name]: value},
        });
    };

    useEffect(() => {
        let cloneProductModel = structuredClone(productModel)
        wp.hooks.addAction('ar_try_on_on_select_model_file', 'ar_try_on', function (val) {
            setCurrentValue(val);
        });
    }, []);
    useEffect(() => {
        if (Object.keys(currentValue).length) {
            console.log(currentValue)
            setProductModel({
                ...productModel,
                ...{[currentValue.name]: currentValue.url}
            });
        }
    }, [currentValue]);


    useEffect(() => {
        const postId = getPostID()
        /**
         * Get data from and display to table.
         */
        let formData = new FormData();
        formData.append('method', 'get');
        formData.append('post_id', postId);
        postWithoutImage(getURL('product_settings'), formData).then(
            (res) => {
                console.log(res)
                setProductModel({...productModel, ...res.data});
            });
    }, []);
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
                setProductModel({...productModel, ...res.data});

                alert('Successfully Saved Data.')
                // setIsDataLoaded(true)
            })
            .catch((err) => {
                console.log(err);
            });
    };
    return (
        <form onSubmit={handleSubmit}>
            <div className="p-4 bg-gray-100">
                {/* 3D Model Section */}
                <div className="mb-6">
                    <h5 className="text-lg font-bold flex items-center gap-2">
                        <img
                            src={ar_try_on.plugin_url + "/admin/images/icons8-3d-object-18.png"}
                            alt="3D Model Icon"
                            className="w-6 h-6"
                        />
                        3D Model
                    </h5>
                    {/*<img id="image-preview" src="" alt="Preview" style="max-width: 200px; display: none;"/>*/}
                    {/*<input type="hidden" id="hidden-image-input" name="image_id"/>*/}
                    <p className="text-sm text-gray-600">
                        Add the files of 3D model to this product. Only glTF/GLB models are supported.
                    </p>
                </div>

                {/* File for Android */}
                <div className="mb-6">
                    <label
                        htmlFor="ar_try_on_file_android"
                        className="block text-sm font-medium flex items-center gap-2"
                    >
                        <img
                            src={ar_try_on.plugin_url + "/admin/images/icons8-android-os-18.png"}
                            alt="Android Icon"
                            className="w-6 h-6"
                        />
                        File for Android
                    </label>
                    <input
                        type="text"
                        onChange={handleChange}
                        id="ar_try_on_file_android"
                        name="ar_try_on_file_android"
                        value={productModel.ar_try_on_file_android}
                        className="border w-full mt-2 p-2 rounded"
                    />
                    <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded ar-try-on-open-media-library">
                        Add File
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                        Upload or enter a URL to 3D object (with .glb extension).
                    </p>
                </div>

                {/* File for iOS */}
                <div className="mb-6">
                    <label
                        htmlFor="ar_try_on_file_ios"
                        className="block text-sm font-medium flex items-center gap-2"
                    >
                        <img
                            src={ar_try_on.plugin_url + "/admin/images/icons8-mac-client-18.png"}
                            alt="iOS Icon"
                            className="w-6 h-6"
                        />
                        File for iOS
                    </label>
                    <input
                        type="text"
                        id="ar_try_on_file_ios"
                        name="ar_try_on_file_ios"
                        onChange={handleChange}
                        value={productModel.ar_try_on_file_ios}
                        className="border w-full mt-2 p-2 rounded"
                    />
                    <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded ar-try-on-open-media-library">
                        Add File
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                        Upload or enter a URL to 3D object (with .usdz extension).<br/>
                        The presence of this attribute will automatically enable the quick-look ar-mode.
                    </p>
                </div>

                {/* Poster */}
                <div className="mb-6">
                    <label
                        htmlFor="ar_try_on_file_poster"
                        className="block text-sm font-medium"
                    >
                        Poster
                    </label>
                    <input
                        type="text"
                        id="ar_try_on_file_poster"
                        name="ar_try_on_file_poster"
                        onChange={handleChange}
                        value={productModel.ar_try_on_file_poster}
                        className="border w-full mt-2 p-2 rounded"
                    />
                    <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded ar-try-on-open-media-library">
                        Add File
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                        Upload an image or enter a URL. If the image field (alt) is left empty, the photo
                        of the product is taken.
                    </p>
                </div>

                {/* Alt Text */}
                <div className="mb-6">
                    <label
                        htmlFor="ar_try_on_file_alt"
                        className="block text-sm font-medium flex items-center gap-2"
                    >
                        <img
                            src={ar_try_on.plugin_url + "/admin/images/icons8-web-accessibility-18.png"}
                            alt="Accessibility Icon"
                            className="w-6 h-6"
                        />
                        Alt
                    </label>
                    <input
                        type="text"
                        id="ar_try_on_file_alt"
                        name="ar_try_on_file_alt"
                        onChange={handleChange}
                        value={productModel.ar_try_on_file_alt}
                        className="border w-full mt-2 p-2 rounded"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                        Insert a text. If the text field is left empty, the name of the product is taken.
                    </p>
                </div>
                <div className="mb-6">
                    <button type={'submit'} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                        Save
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ARProductModelSettings;
