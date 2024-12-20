import React, {useState, useEffect} from 'react';
/**
 *
 * Scripts
 */
import {getURL, postWithoutImage} from '../../../../context/utilities';
import toast from '../../../../context/Notify';

export default function Settings() {
    const [settings, setSettings] = useState({
        ar_try_on_for_wordpress_btn: "3",
        ar_try_on_for_wordpress_single_product_tabs: "yes",
        ar_try_on_for_wordpress_loading: "auto",
        ar_try_on_for_wordpress_reveal: "auto",
        ar_try_on_for_wordpress_poster_color: "rgba(78,186,79,0)",
        ar_try_on_for_wordpress_ar: "activate",
        ar_try_on_for_wordpress_ar_modes: ["1", "2", "3"],
        ar_try_on_for_wordpress_ar_scale: "auto",
        ar_try_on_for_wordpress_ar_placement: "floor",
        ar_try_on_for_wordpress_xr_environment: "activate",
        ar_try_on_for_wordpress_ar_button: "activate",
        ar_try_on_for_wordpress_ar_button_text: "Activate AR",
        ar_try_on_for_wordpress_ar_button_background_color: "#3a3a3a",
        ar_try_on_for_wordpress_ar_button_text_color: "#ffffff"
    });
    const [postTypes, setPostTypes] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(true)
    const [postsStatus, setPostsStatus] = useState([])

    useEffect(() => {
        /**
         * Get data from and display to table.
         */
        let formData = new FormData();
        formData.append('method', 'get');
        postWithoutImage(getURL('settings'), formData).then(
            (res) => {
                setSettings({...settings, ...res.data});
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
            setSettings({
                ...settings,
                ...{[targetName]: value},
            });
            return;
        } else {
            value = e.target.value
        }


        if (targetName) {
            e.target.name = targetName;
        }

        if (e.target.name == 'ar_try_on_for_wordpress_ar_modes') {
            let status = e.target.checked
            let clonedVal = structuredClone(settings)
            let tempVal = clonedVal.ar_try_on_for_wordpress_ar_modes
            if(status) {
                tempVal.push(value)
                value = tempVal
            }else{
                if(tempVal.includes(value)) {
                    tempVal = tempVal.filter(item => item != value);
                }
                value = tempVal
            }

            console.log(value)
        }

        if (!e.target.name) return;

        console.log({name: e.target.name, value: e.target.value})

        setSettings({
            ...settings,
            ...{[e.target.name]: value},
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

    return (
        isDataLoaded ? <React.Fragment>
                <form onSubmit={handleSubmit}>
                    <div
                        id="ar_try_on_for_wordpress_settings"
                        className="p-4 bg-gray-100 space-y-6"
                    >
                        {/* Title Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <span className="dashicons dashicons-admin-generic"></span>
                                View Settings
                            </h3>
                        </div>

                        {/* Dropdown Section */}
                        <div className="space-y-4">
                            <label
                                htmlFor="ar_try_on_for_wordpress_btn"
                                className="block font-medium"
                            >
                                Show button in
                            </label>
                            <select
                                id="ar_try_on_for_wordpress_btn"
                                name="ar_try_on_for_wordpress_btn"
                                className="block w-full p-2 border rounded"
                                value={settings.ar_try_on_for_wordpress_btn}
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
                        <div className="space-y-4">
                            <label
                                htmlFor="ar_try_on_for_wordpress_single_product_tabs"
                                className="block font-medium"
                            >
                                Show in Product Tabs
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_single_product_tabs1"
                                        name="ar_try_on_for_wordpress_single_product_tabs"
                                        value="yes"
                                        checked={settings.ar_try_on_for_wordpress_single_product_tabs == 'yes'}
                                        onChange={handleChange}
                                    />
                                    <span>Yes</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_single_product_tabs2"
                                        name="ar_try_on_for_wordpress_single_product_tabs"
                                        value="no"
                                        checked={settings.ar_try_on_for_wordpress_single_product_tabs == 'no'}
                                        onChange={handleChange}
                                    />
                                    <span>No</span>
                                </label>
                            </div>
                        </div>

                        {/* Loading Attributes */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <span className="dashicons dashicons-admin-generic"></span>
                                Loading : Attributes
                            </h3>
                            <label
                                htmlFor="ar_try_on_for_wordpress_loading"
                                className="block font-medium"
                            >
                                Loading
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_loading1"
                                        name="ar_try_on_for_wordpress_loading"
                                        value="auto"
                                        checked={settings.ar_try_on_for_wordpress_loading == 'auto'}
                                        onChange={handleChange}
                                    />
                                    <span>Auto</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_loading2"
                                        name="ar_try_on_for_wordpress_loading"
                                        value="lazy"
                                        checked={settings.ar_try_on_for_wordpress_loading == 'lazy'}
                                        onChange={handleChange}
                                    />
                                    <span>Lazy</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_loading3"
                                        name="ar_try_on_for_wordpress_loading"
                                        value="eager"
                                        checked={settings.ar_try_on_for_wordpress_loading == 'eager'}
                                        onChange={handleChange}
                                    />
                                    <span>Eager</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                An enumerable attribute describing under what conditions the model should be preloaded. The supported values are "auto", "lazy" and "eager". Auto is equivalent to lazy, which loads the model when it is near the viewport for reveal="auto", and when interacted with for reveal="interaction". Eager loads the model immediately.
                            </p>
                        </div>

                        {/* Reveal Attributes */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <span className="dashicons dashicons-admin-generic"></span>
                                Loading : Attributes
                            </h3>
                            <label
                                htmlFor="ar_try_on_for_wordpress_reveal"
                                className="block font-medium"
                            >
                                Reveal
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_reveal1"
                                        name="ar_try_on_for_wordpress_reveal"
                                        value="auto"
                                        checked={settings.ar_try_on_for_wordpress_reveal == 'auto'}
                                        onChange={handleChange}
                                    />
                                    <span>Auto</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_reveal2"
                                        name="ar_try_on_for_wordpress_reveal"
                                        value="interaction"
                                        checked={settings.ar_try_on_for_wordpress_reveal == 'interaction'}
                                        onChange={handleChange}
                                    />
                                    <span>Interaction</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="ar_try_on_for_wordpress_reveal3"
                                        name="ar_try_on_for_wordpress_reveal"
                                        value="manual"
                                        checked={settings.ar_try_on_for_wordpress_reveal == 'manual'}
                                        onChange={handleChange}
                                    />
                                    <span>Manual</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                This attribute controls when the model should be revealed. It currently supports three values: "auto", "interaction", and "manual". If reveal is set to "interaction", will wait until the user interacts with the poster before loading and revealing the model. If reveal is set to "auto", the model will be revealed as soon as it is done loading and rendering. If reveal is set to "manual", the model will remain hidden until dismissPoster() is called.
                            </p>
                        </div>

                        {/* Poster Color */}
                        <div className="space-y-4">
                            <label
                                htmlFor="ar_try_on_for_wordpress_poster_color"
                                className="block font-medium"
                            >
                                --poster-color
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    id="ar_try_on_for_wordpress_poster_color"
                                    name="ar_try_on_for_wordpress_poster_color"
                                    className="block w-full p-2 border rounded"
                                    value={settings.ar_try_on_for_wordpress_poster_color}
                                    onChange={handleChange}
                                />
                                <input
                                    type="color"
                                    className="p-2 bg-gray-300 rounded"
                                    style={{backgroundColor: "rgba(78, 186, 79, 0)"}}
                                    onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_poster_color')}
                                />
                            </div>
                            <p className="text-sm text-gray-500">
                                Sets the background-color of the poster . You may wish to set this to transparent if you are using a seamless poster with transparency (so that the background color of shows through).
                            </p>
                        </div>

                        {/* Enable AR */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar" className="font-medium">
                                Enable AR
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar"
                                        id="ar_try_on_for_wordpress_ar1"
                                        value="activate"
                                        checked={settings.ar_try_on_for_wordpress_ar == 'activate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Activate</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar"
                                        id="ar_try_on_for_wordpress_ar2"
                                        value="deactivate"
                                        checked={settings.ar_try_on_for_wordpress_ar == 'deactivate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Deactivate</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Enable the ability to launch AR experiences on supported devices.
                            </p>
                        </div>

                        {/* AR Modes */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_modes" className="font-medium">
                                AR Modes
                            </label>
                            <p className="text-sm text-gray-500">Select / Deselect All</p>
                            <div className="space-y-1">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="ar_try_on_for_wordpress_ar_modes[]"
                                        id="ar_try_on_for_wordpress_ar_modes1"
                                        value="1"
                                        checked={settings.ar_try_on_for_wordpress_ar_modes.includes('1')}
                                        onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_ar_modes')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>webxr</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="ar_try_on_for_wordpress_ar_modes[]"
                                        id="ar_try_on_for_wordpress_ar_modes2"
                                        value="2"
                                        checked={settings.ar_try_on_for_wordpress_ar_modes.includes('2')}
                                        onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_ar_modes')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>scene-viewer</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="ar_try_on_for_wordpress_ar_modes[]"
                                        id="ar_try_on_for_wordpress_ar_modes3"
                                        value="3"
                                        checked={settings.ar_try_on_for_wordpress_ar_modes.includes('3')}
                                        onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_ar_modes')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>quick-look</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                A prioritized list of the types of AR experiences to enable. Allowed values are "webxr", to launch the AR experience in the browser, "scene-viewer", to launch the Scene Viewer app, "quick-look", to launch the iOS Quick Look app. Note that the presence of an ios-src will enable quick-look by itself.
                            </p>
                        </div>

                        {/* AR Scale */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_scale" className="font-medium">
                                AR Scale
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_scale"
                                        id="ar_try_on_for_wordpress_ar_scale1"
                                        value="auto"
                                        checked={settings.ar_try_on_for_wordpress_ar_scale == 'auto'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Auto</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_scale"
                                        id="ar_try_on_for_wordpress_ar_scale2"
                                        value="fixed"
                                        checked={settings.ar_try_on_for_wordpress_ar_scale == 'fixed'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Fixed</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Controls the scaling behavior in AR mode. Set to "fixed" to disable scaling of the model, which sets it to always be at 100% scale. Defaults to "auto" which allows the model to be resized by pinch.
                            </p>
                        </div>

                        {/* AR Placement */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_placement" className="font-medium">
                                AR Placement
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_placement"
                                        id="ar_try_on_for_wordpress_ar_placement1"
                                        value="floor"
                                        checked={settings.ar_try_on_for_wordpress_ar_placement == 'floor'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Floor</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_placement"
                                        id="ar_try_on_for_wordpress_ar_placement2"
                                        value="wall"
                                        checked={settings.ar_try_on_for_wordpress_ar_placement == 'wall'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Wall</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Selects whether to place the object on the floor (horizontal surface) or a wall (vertical surface) in AR. The back (negative Z) of the object´s bounding box will be placed against the wall and the shadow will be put on this surface as well. Note that the different AR modes handle the placement UX differently.
                            </p>
                        </div>

                        {/* XR Environment */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_xr_environment" className="font-medium">
                                XR-Environment
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_xr_environment"
                                        id="ar_try_on_for_wordpress_xr_environment1"
                                        value="activate"
                                        checked={settings.ar_try_on_for_wordpress_xr_environment == 'activate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Activate</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_xr_environment"
                                        id="ar_try_on_for_wordpress_xr_environment2"
                                        value="deactivate"
                                        checked={settings.ar_try_on_for_wordpress_xr_environment == 'deactivate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Deactive</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Enables AR lighting estimation in WebXR mode; this has a performance cost and replaces the lighting selected with during an AR session. Known issues: sometimes too dark, sudden updates, shiny materials look matte.environment-image
                            </p>
                        </div>

                        {/* Custom AR Button */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_button" className="font-medium">
                                Custom AR Button
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_button"
                                        id="ar_try_on_for_wordpress_ar_button1"
                                        value="activate"
                                        checked={settings.ar_try_on_for_wordpress_ar_button == 'activate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Active</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="ar_try_on_for_wordpress_ar_button"
                                        id="ar_try_on_for_wordpress_ar_button2"
                                        value="deactivate"
                                        checked={settings.ar_try_on_for_wordpress_ar_button == 'deactivate'}
                                        onChange={handleChange}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Deactive</span>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                By placing a child element under with slot="ar-button", this element will replace the default "Enter AR" button, which is a icon in the lower right. This button will be visible if AR is potentially available (we will have some false positives until the user tries).
                            </p>
                        </div>

                        {/* Button Text */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_button_text" className="font-medium">
                                Button Text
                            </label>
                            <input
                                type="text"
                                id="ar_try_on_for_wordpress_ar_button_text"
                                name="ar_try_on_for_wordpress_ar_button_text"
                                value={settings.ar_try_on_for_wordpress_ar_button_text}
                                onChange={handleChange}
                                className="block w-full p-2 border rounded"
                            />
                        </div>

                        {/* Button Color */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_button_background_color"
                                   className="font-medium">
                                Button Color
                            </label>
                            <input
                                type="color"
                                id="ar_try_on_for_wordpress_ar_button_background_color"
                                name="ar_try_on_for_wordpress_ar_button_background_color"
                                style={{backgroundColor: "rgba(78, 186, 79, 0)"}}
                                value={settings.ar_try_on_for_wordpress_ar_button_background_color}
                                onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_ar_button_background_color')}
                                className="block w-full p-2 border rounded"
                            />
                        </div>
                        {/* Button Text color Color */}
                        <div className="space-y-2">
                            <label htmlFor="ar_try_on_for_wordpress_ar_button_text_color"
                                   className="font-medium">
                                Button Color
                            </label>
                            <input
                                type="color"
                                id="ar_try_on_for_wordpress_ar_button_text_color"
                                name="ar_try_on_for_wordpress_ar_button_text_color"
                                style={{backgroundColor: "rgba(78, 186, 79, 0)"}}
                                value={settings.ar_try_on_for_wordpress_ar_button_text_color}
                                onChange={(e) => handleChange(e, 'ar_try_on_for_wordpress_ar_button_text_color')}
                                className="block w-full p-2 border rounded"
                            />
                        </div>
                        {/* submit Button */}
                        <div className="space-y-2">
                            <button
                                type="submit"
                                value={'Save'}
                                className="block w-full p-2 border rounded"
                            >Save
                            </button>
                        </div>
                    </div>
                </form>
            </React.Fragment>
            :
            <h1>Loading</h1>

    );
}
