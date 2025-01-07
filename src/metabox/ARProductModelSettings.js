import React, {useState, useEffect} from "react";
import {getPostID, getURL, postWithoutImage} from "../context/utilities";


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
            <div className="art-p-4 art-bg-gray-100">
                {/* 3D Model Section */}
                <div className="art-mb-6">
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
                <div className="art-mb-6">
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
                        className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-try-on-open-media-library art-border art-border-sky-500 ">
                        Add File
                    </button>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        Upload or enter a URL to 3D object (with .glb extension).
                    </p>
                </div>

                {/* File for iOS */}
                <div className="art-mb-6">
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
                        className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-try-on-open-media-library art-border art-border-sky-500 ">
                        Add File
                    </button>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        Upload or enter a URL to 3D object (with .usdz extension).<br/>
                        The presence of this attribute will automatically enable the quick-look ar-mode.
                    </p>
                </div>

                {/* Poster */}
                <div className="art-mb-6">
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
                        className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-try-on-open-media-library art-border art-border-sky-500 ">
                        Add File
                    </button>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        Upload an image or enter a URL. If the image field (alt) is left empty, the photo
                        of the product is taken.
                    </p>
                </div>

                {/* Alt Text */}
                <div className="art-mb-6">
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
                <div className="art-mb-6">
                    <button type={'submit'}
                            className="art-mt-2 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500  art-w-full">
                        Save
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ARProductModelSettings;
