import React, { useState, useEffect } from 'react';
/**
 *
 * Scripts
 */
import { getURL, postWithoutImage } from '../../../../context/utilities';
import toast from '../../../../context/Notify';
import MultiSelect from '../../../../context/MultiSelect';

export default function Settings() {
    const [settings, setSettings] = useState({
        ar_try_on_display_button_automatically: 'yes',
        ar_try_on_allowed_post_types: ['post'],
        ar_try_on_wc_hook_position: "3",
        ar_try_on_single_product_tabs: "yes",
        ar_try_on_loading_type: "auto",
        ar_try_on_reveal_type: "auto",
        ar_try_on_poster_color: "rgba(78,186,79,0)",
        ar_try_on_ar: "activate",
        ar_try_on_ar_modes: ["webxr", 'scene-viewer', "quick-look"],
        ar_try_on_ar_scale: "auto",
        ar_try_on_xr_environment: "activate",
        ar_try_on_ar_button: "deactivate",
        ar_try_on_ar_button_text: "Activate AR",
        ar_try_on_ar_button_background_color: "#3a3a3a",
        ar_try_on_ar_button_text_color: "#ffffff",
        ar_try_on_enable_qr_code: 'yes',
        ar_try_on_clear_cache: false,
        ar_try_on_ar_demo: {},
    });
    const [postTypes, setPostTypes] = useState(['post']);
    const [isDataLoaded, setIsDataLoaded] = useState(true)


    useEffect(() => {
        if (window.hasOwnProperty('ar_try_on') && ar_try_on?.post_types) {
            console.log(JSON.parse(JSON.stringify(Object.keys(ar_try_on.post_types))))
            let tempPostTypes = wp.hooks.applyFilters('ar_try_on_allowed_post_types', JSON.parse(JSON.stringify(Object.keys(ar_try_on.post_types))))
            setPostTypes(tempPostTypes)
        }
    }, [window?.ar_try_on])

    useEffect(() => {
        /**
         * Get data from and display to table.
         */
        let formData = new FormData();
        formData.append('method', 'get');
        postWithoutImage(getURL('settings'), formData).then(
            (res) => {
                setSettings({ ...settings, ...res.data });
                setIsDataLoaded(true)
            });
    }, []);

    /**
     * handle change
     * @param {*} e
     */
    const handleChange = (e, targetName = '') => {
        let value = '';
        if (Array.isArray(e)) {
            value = e;

            if (targetName === 'ar_try_on_allowed_post_types' && value.length > 1) {
                toast('Multiple post type is only available in the pro version', 'error')
                return;
            }
            setSettings({
                ...settings,
                ...{ [targetName]: value },
            });
            return;
        } else {
            value = e.target.value
        }


        if (targetName) {
            e.target.name = targetName;
        }

        if (e.target.name == 'ar_try_on_ar_modes') {
            let status = e.target.checked
            let clonedVal = JSON.parse(JSON.stringify(settings));
            let tempVal = clonedVal.ar_try_on_ar_modes
            if (status) {
                tempVal.push(value)
                value = tempVal
            } else {
                if (tempVal.includes(value)) {
                    tempVal = tempVal.filter(item => item != value);
                }
                value = tempVal
            }

            console.log(value)
        }

        if (!e.target.name) return;

        console.log({ name: e.target.name, value: e.target.value })

        setSettings({
            ...settings,
            ...{ [e.target.name]: value },
        });
    };

    /**
     * Handle form Submit
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(settings)
        // return;
        let formData = new FormData();
        formData.append('fields', JSON.stringify(settings));
        formData.append('method', 'post');
        postWithoutImage(getURL('settings'), formData)
            .then((res) => {
                setSettings(res.data);
                toast('Successfully Saved.', 'info', {
                    autoClose: 15000
                });
                setIsDataLoaded(true)
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const ar_try_on_demo_id = (e) => {
        e.preventDefault();
        // window.open('https://wpaugmentedreality.com/product/dining-armchair-view-in-augmented-reality-3d/', '_blank');
        document.getElementById('ar_try_on_demo_id').value = 'Setting Up Preview';
        let formData = new FormData();
        formData.append('method', 'post');
        postWithoutImage(getURL('demo_preview'), formData)
            .then((res) => {
                if (res?.data?.ar_try_on_ar_demo?.url) {
                    document.getElementById('ar_try_on_demo_id').value = 'Preview Demo';
                    window.open(res?.data?.ar_try_on_ar_demo?.url, '_blank')
                } else {
                    document.getElementById('ar_try_on_demo_id').value = 'Try Again';
                }
            })
            .catch((err) => {
                console.log(err);
            });
    }

    return (
        isDataLoaded ? <React.Fragment>
            <form onSubmit={handleSubmit}>
                <div
                    id="ar_try_on_settings"
                    className="art-p-4 art-bg-gray-100 art-space-y-6"
                >

                    <div className={'art-flex'}>
                        {/* Title Section */}
                        <div className="art-w-1/2">
                            <h3 className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2">
                                <span className="art-dashicons art-dashicons-admin-generic"></span>
                                View Settings
                            </h3>
                        </div>
                        <button
                            type="button"
                            id={'ar_try_on_demo_id'}
                            onClick={ar_try_on_demo_id}
                            className="art-w-40 art-h-12  art-cursor-pointer art-rounded art-bg-blue-500 art-text-white art-border art-border-sky-500 "
                        >
                            Preview Demo
                        </button>
                    </div>
                    {/* Display AR Button Autometically */}
                    <div className="art-space-y-4">
                        <label
                            htmlFor="ar_try_on_single_product_tabs"
                            className="art-block art-font-medium"
                        >
                            Display AR Button Autometically
                        </label>
                        <div className="art-flex art-space-x-4">
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_display_button_automatically1"
                                    name="ar_try_on_display_button_automatically"
                                    value="yes"
                                    checked={settings.ar_try_on_display_button_automatically == 'yes'}
                                    onChange={handleChange}
                                />
                                <span>Yes</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_display_button_automatically2"
                                    name="ar_try_on_display_button_automatically"
                                    value="no"
                                    checked={settings.ar_try_on_display_button_automatically == 'no'}
                                    onChange={handleChange}
                                />
                                <span>No</span>
                            </label>
                        </div>
                    </div>
                    <div className="art-space-y-4">
                        <label
                            htmlFor="ar_try_on_allowed_post_types"
                            className="art-block art-font-medium"
                        >
                            Enable AR For Post Types
                        </label>
                        <MultiSelect
                            id="ar_try_on_allowed_post_types"
                            selectedItems={settings.ar_try_on_allowed_post_types}
                            options={postTypes}
                            onChange={(e) => handleChange(e, 'ar_try_on_allowed_post_types')} />
                    </div>

                    {/* Dropdown Section */}
                    {
                        ar_try_on.is_wc_active && <>
                            <div className="art-space-y-4">
                                <label
                                    htmlFor="ar_try_on_wc_hook_position"
                                    className="art-block art-font-medium"
                                >
                                    Show button in
                                </label>
                                <select
                                    id="ar_try_on_wc_hook_position"
                                    name="ar_try_on_wc_hook_position"
                                    className="art-block art-w-full art-p-2 art-border art-rounded"
                                    value={settings.ar_try_on_wc_hook_position}
                                    onChange={handleChange}
                                >
                                    <option value="">None</option>
                                    <option value="1">woocommerce_before_single_product_summary</option>
                                    <option value="2">woocommerce_after_single_product_summary</option>
                                    <option value="3">woocommerce_before_single_product</option>
                                    <option value="4">woocommerce_after_single_product</option>
                                    <option value="5">woocommerce_after_add_to_cart_form</option>
                                    <option value="6">
                                        woocommerce_before_add_to_cart_form
                                    </option>
                                </select>
                            </div>
                            {/* Radio Section */}
                            <div className="art-space-y-4">
                                <label
                                    htmlFor="ar_try_on_single_product_tabs"
                                    className="art-block art-font-medium"
                                >
                                    Show in Product Tabs
                                </label>
                                <div className="art-flex art-space-x-4">
                                    <label className="art-flex art-items-center art-gap-2">
                                        <input
                                            type="radio"
                                            id="ar_try_on_single_product_tabs1"
                                            name="ar_try_on_single_product_tabs"
                                            value="yes"
                                            checked={settings.ar_try_on_single_product_tabs == 'yes'}
                                            onChange={handleChange}
                                        />
                                        <span>Yes</span>
                                    </label>
                                    <label className="art-flex art-items-center art-gap-2">
                                        <input
                                            type="radio"
                                            id="ar_try_on_single_product_tabs2"
                                            name="ar_try_on_single_product_tabs"
                                            value="no"
                                            checked={settings.ar_try_on_single_product_tabs == 'no'}
                                            onChange={handleChange}
                                        />
                                        <span>No</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    }

                    {/* Loading Attributes */}
                    <div className="art-space-y-4">
                        <h3 className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2">
                            <span className="art-dashicons art-dashicons-admin-generic"></span>
                            Loading : Attributes
                        </h3>
                        <label
                            htmlFor="ar_try_on_loading_type"
                            className="art-block art-font-medium"
                        >
                            Loading
                        </label>
                        <div className="art-flex art-space-x-4">
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="try_on_loading_type1"
                                    name="ar_try_on_loading_type"
                                    value="auto"
                                    checked={settings.ar_try_on_loading_type == 'auto'}
                                    onChange={handleChange}
                                />
                                <span>Auto</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_loading2"
                                    name="ar_try_on_loading_type"
                                    value="lazy"
                                    checked={settings.ar_try_on_loading_type == 'lazy'}
                                    onChange={handleChange}
                                />
                                <span>Lazy</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_loading3"
                                    name="ar_try_on_loading_type"
                                    value="eager"
                                    checked={settings.ar_try_on_loading_type == 'eager'}
                                    onChange={handleChange}
                                />
                                <span>Eager</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            An enumerable attribute describing under what conditions the model should be preloaded.
                            The
                            supported values are "auto", "lazy" and "eager". Auto is equivalent to lazy, which loads
                            the
                            model when it is near the viewport for reveal="auto", and when interacted with for
                            reveal="interaction". Eager loads the model immediately.
                        </p>
                    </div>

                    {/* Reveal Attributes */}
                    <div className="art-space-y-4">
                        <h3 className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2">
                            <span className="art-dashicons art-dashicons-admin-generic"></span>
                            Reveal : Attributes
                        </h3>
                        <label
                            htmlFor="ar_try_on_reveal_type"
                            className="art-block art-font-medium"
                        >
                            Reveal
                        </label>
                        <div className="art-flex art-space-x-4">
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_reveal1"
                                    name="ar_try_on_reveal_type"
                                    value="auto"
                                    checked={settings.ar_try_on_reveal_type == 'auto'}
                                    onChange={handleChange}
                                />
                                <span>Auto</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_reveal2"
                                    name="ar_try_on_reveal_type"
                                    value="interaction"
                                    checked={settings.ar_try_on_reveal_type == 'interaction'}
                                    onChange={handleChange}
                                />
                                <span>Interaction</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_reveal3"
                                    name="ar_try_on_reveal_type"
                                    value="manual"
                                    checked={settings.ar_try_on_reveal_type == 'manual'}
                                    onChange={handleChange}
                                />
                                <span>Manual</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            This attribute controls when the model should be revealed. It currently supports three
                            values: "auto", "interaction", and "manual". If reveal is set to "interaction", will
                            wait
                            until the user interacts with the poster before loading and revealing the model. If
                            reveal
                            is set to "auto", the model will be revealed as soon as it is done loading and
                            rendering. If
                            reveal is set to "manual", the model will remain hidden until dismissPoster() is called.
                        </p>
                    </div>

                    {/* Poster Color */}
                    <div className="art-space-y-4">
                        <label
                            htmlFor="ar_try_on_poster_color"
                            className="art-block art-font-medium"
                        >
                            --poster-color
                        </label>
                        <div className="art-flex art-items-center art-gap-2">
                            <input
                                type="text"
                                id="ar_try_on_poster_color"
                                name="ar_try_on_poster_color"
                                className="art-block  art-p-2 art-border art-rounded"
                                value={settings.ar_try_on_poster_color}
                                onChange={handleChange}
                            />
                            <input
                                type="color"
                                className="art-p-2 art-bg-gray-300 art-rounded"
                                style={{ backgroundColor: "rgba(78, 186, 79, 0)" }}
                                onChange={(e) => handleChange(e, 'ar_try_on_poster_color')}
                            />
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            Sets the background-color of the poster . You may wish to set this to transparent if you
                            are
                            using a seamless poster with transparency (so that the background color of shows
                            through).
                        </p>
                    </div>

                    {/* Enable AR */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar" className="art-font-medium">
                            Enable AR
                        </label>
                        <div className="art-flex art-items-center art-space-x-4">
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar"
                                    id="ar_try_on_ar1"
                                    value="activate"
                                    checked={settings.ar_try_on_ar == 'activate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Activate</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar"
                                    id="ar_try_on_ar2"
                                    value="deactivate"
                                    checked={settings.ar_try_on_ar == 'deactivate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Deactivate</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            Enable the ability to launch AR experiences on supported devices.
                        </p>
                    </div>

                    {/* AR Modes */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_modes" className="art-font-medium">
                            AR Modes
                        </label>
                        <p className="art-text-sm art-text-gray-500">Select / Deselect All</p>
                        <div className="art-space-y-1">
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="checkbox"
                                    name="ar_try_on_ar_modes[]"
                                    id="ar_try_on_ar_modes1"
                                    value="webxr"
                                    checked={settings.ar_try_on_ar_modes.includes('webxr')}
                                    onChange={(e) => handleChange(e, 'ar_try_on_ar_modes')}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>webxr</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="checkbox"
                                    name="ar_try_on_ar_modes[]"
                                    id="ar_try_on_ar_modes2"
                                    value="scene-viewer"
                                    checked={settings.ar_try_on_ar_modes.includes('scene-viewer')}
                                    onChange={(e) => handleChange(e, 'ar_try_on_ar_modes')}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>scene-viewer</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="checkbox"
                                    name="ar_try_on_ar_modes[]"
                                    id="ar_try_on_ar_modes3"
                                    value="quick-look"
                                    checked={settings.ar_try_on_ar_modes.includes('quick-look')}
                                    onChange={(e) => handleChange(e, 'ar_try_on_ar_modes')}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>quick-look</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            A prioritized list of the types of AR experiences to enable. Allowed values are "webxr",
                            to
                            launch the AR experience in the browser, "scene-viewer", to launch the Scene Viewer app,
                            "quick-look", to launch the iOS Quick Look app. Note that the presence of an ios-src
                            will
                            enable quick-look by itself.
                        </p>
                    </div>

                    {/* AR Scale */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_scale" className="art-font-medium">
                            AR Scale
                        </label>
                        <div className="art-flex art-items-center art-space-x-4">
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar_scale"
                                    id="ar_try_on_ar_scale1"
                                    value="auto"
                                    checked={settings.ar_try_on_ar_scale == 'auto'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Auto</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar_scale"
                                    id="ar_try_on_ar_scale2"
                                    value="fixed"
                                    checked={settings.ar_try_on_ar_scale == 'fixed'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Fixed</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            Controls the scaling behavior in AR mode. Set to "fixed" to disable scaling of the
                            model,
                            which sets it to always be at 100% scale. Defaults to "auto" which allows the model to
                            be
                            resized by pinch.
                        </p>
                    </div>
                    {/* XR Environment */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_xr_environment" className="art-font-medium">
                            XR-Environment
                        </label>
                        <div className="art-flex art-items-center art-space-x-4">
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_xr_environment"
                                    id="ar_try_on_xr_environment1"
                                    value="activate"
                                    checked={settings.ar_try_on_xr_environment == 'activate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Activate</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_xr_environment"
                                    id="ar_try_on_xr_environment2"
                                    value="deactivate"
                                    checked={settings.ar_try_on_xr_environment == 'deactivate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Deactive</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            Enables AR lighting estimation in WebXR mode; this has a performance cost and replaces
                            the lighting selected with during an AR session. Known issues: sometimes too dark,
                            sudden
                            updates, shiny materials look matte.environment-image
                        </p>
                    </div>

                    {/* Custom AR Button */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_button" className="art-font-medium">
                            Custom AR Button
                        </label>
                        <div className="art-flex art-items-center art-space-x-4">
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar_button"
                                    id="ar_try_on_ar_button1"
                                    value="activate"
                                    checked={settings.ar_try_on_ar_button == 'activate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Active</span>
                            </label>
                            <label className="art-flex art-items-center art-space-x-2">
                                <input
                                    type="radio"
                                    name="ar_try_on_ar_button"
                                    id="ar_try_on_ar_button2"
                                    value="deactivate"
                                    checked={settings.ar_try_on_ar_button == 'deactivate'}
                                    onChange={handleChange}
                                    className="art-text-blue-600 art-focus:ring-blue-500"
                                />
                                <span>Deactive</span>
                            </label>
                        </div>
                        <p className="art-text-sm art-text-gray-500">
                            By placing a child element under with slot="ar-button", this element will replace the
                            default "Enter AR" button, which is a icon in the lower right. This button will be
                            visible
                            if AR is potentially available (we will have some false positives until the user tries).
                        </p>
                    </div>

                    {/* Button Text */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_button_text" className="art-font-medium">
                            Button Text
                        </label>
                        <input
                            type="text"
                            id="ar_try_on_ar_button_text"
                            name="ar_try_on_ar_button_text"
                            value={settings.ar_try_on_ar_button_text}
                            onChange={handleChange}
                            className="art-block art-p-2 art-border art-rounded"
                        />
                    </div>

                    {/* Button Color */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_button_background_color"
                            className="art-font-medium">
                            Button Background Color
                        </label>
                        <div className="art-flex art-items-center art-gap-2">
                            <input
                                type="text"
                                id="ar_try_on_ar_button_background_color"
                                name="ar_try_on_ar_button_background_color"
                                className="art-block  art-p-2 art-border art-rounded"
                                value={settings.ar_try_on_ar_button_background_color}
                                onChange={handleChange}
                            />
                            <input
                                type="color"
                                id="ar_try_on_ar_button_background_color"
                                name="ar_try_on_ar_button_background_color"
                                style={{ backgroundColor: "rgba(78, 186, 79, 0)" }}
                                value={settings.ar_try_on_ar_button_background_color}
                                onChange={(e) => handleChange(e, 'ar_try_on_ar_button_background_color')}
                                className="art-block art-p-2 art-border art-rounded"
                            />
                        </div>
                    </div>

                    {/* Button Text color Color */}
                    <div className="art-space-y-2">
                        <label htmlFor="ar_try_on_ar_button_text_color"
                            className="art-font-medium">
                            Button Text Color
                        </label>
                        <div className="art-flex art-items-center art-gap-2">
                            <input
                                type="text"
                                id="ar_try_on_ar_button_text_color"
                                name="ar_try_on_ar_button_text_color"
                                className="art-block  art-p-2 art-border art-rounded"
                                value={settings.ar_try_on_ar_button_text_color}
                                onChange={handleChange}
                            />
                            <input
                                type="color"
                                id="ar_try_on_ar_button_text_color"
                                name="ar_try_on_ar_button_text_color"
                                style={{ backgroundColor: "rgba(78, 186, 79, 0)" }}
                                value={settings.ar_try_on_ar_button_text_color}
                                onChange={(e) => handleChange(e, 'ar_try_on_ar_button_text_color')}
                                className="art-block art-p-2 art-border art-rounded"
                            />
                        </div>
                    </div>

                    {/* Clear Cache */}
                    <div className="art-space-y-2 art-mr-1">
                        <label htmlFor="ar_try_on_clear_cache"
                            className="art-font-medium">
                            Clear Cache
                        </label>
                        <input
                            type="checkbox"
                            id="ar_try_on_clear_cache"
                            name="ar_try_on_clear_cache"
                            value={settings.ar_try_on_clear_cache}
                            onChange={(e) => handleChange(e, 'ar_try_on_clear_cache')}
                            className="art-block art-p-5 art-border art-rounded"
                        />
                    </div>
                    {/* Enable QR Code */}
                    <div className="art-space-y-4">
                        <label
                            htmlFor="ar_try_on_enable_qr_code"
                            className="art-block art-font-medium"
                        >
                            Enable QR Code
                        </label>
                        <div className="art-flex art-space-x-4">
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_enable_qr_code"
                                    name="ar_try_on_enable_qr_code"
                                    value="yes"
                                    checked={settings.ar_try_on_enable_qr_code == 'yes'}
                                    onChange={handleChange}
                                />
                                <span>Yes</span>
                            </label>
                            <label className="art-flex art-items-center art-gap-2">
                                <input
                                    type="radio"
                                    id="ar_try_on_enable_qr_code"
                                    name="ar_try_on_enable_qr_code"
                                    value="no"
                                    checked={settings.ar_try_on_enable_qr_code == 'no'}
                                    onChange={handleChange}
                                />
                                <span>No</span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="art-space-y-2">
                        <button
                            type="submit"
                            value={'Save'}
                            className="art-block art-cursor-pointer art-w-full art-p-2 art-rounded art-bg-blue-500 art-text-white art-border art-border-sky-500 "
                        >
                            Save
                        </button>
                    </div>

                </div>
            </form>
        </React.Fragment>
            :
            <h1>Loading</h1>

    );
}
