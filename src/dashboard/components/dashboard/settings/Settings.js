import React, { useState, useEffect } from "react";
/**
 *
 * Scripts
 */
import { getURL, postWithoutImage } from "../../../../context/utilities";
import toast from "../../../../context/Notify";
// import MultiSelect from '../../../../context/MultiSelect';
import Radio from "./Radio";
import Checkbox from "./Checkbox";
import Switch from "./Switch";
import MultiSelect from "./MultiSelect";

export default function Settings({ settings, handleChange }) {
  // const [settings, setSettings] = useState({
  //     ar_try_on_display_button_automatically: 'yes',
  //     ar_try_on_allowed_post_types: ['post'],
  //     ar_try_on_wc_hook_position: "3",
  //     ar_try_on_single_product_tabs: "yes",
  //     ar_try_on_loading_type: "auto",
  //     ar_try_on_reveal_type: "auto",
  //     ar_try_on_poster_color: "rgba(78,186,79,0)",
  //     ar_try_on_ar: "activate",
  //     ar_try_on_ar_modes: ["webxr", 'scene-viewer', "quick-look"],
  //     ar_try_on_ar_scale: "auto",
  //     ar_try_on_xr_environment: "activate",
  //     ar_try_on_ar_button: "deactivate",
  //     ar_try_on_ar_button_text: "Activate AR",
  //     ar_try_on_ar_button_background_color: "#3a3a3a",
  //     ar_try_on_ar_button_text_color: "#ffffff",
  //     ar_try_on_enable_qr_code: 'yes',
  //     ar_try_on_clear_cache: false,
  //     ar_try_on_ar_demo: {},
  // });
  const [postTypes, setPostTypes] = useState(["post"]);
  const [isDataLoaded, setIsDataLoaded] = useState(true);

  useEffect(() => {
    if (window.hasOwnProperty("ar_try_on") && ar_try_on?.post_types) {
      console.log(
        JSON.parse(JSON.stringify(Object.keys(ar_try_on.post_types)))
      );
      let tempPostTypes = wp.hooks.applyFilters(
        "ar_try_on_allowed_post_types",
        JSON.parse(JSON.stringify(Object.keys(ar_try_on.post_types)))
      );
      setPostTypes(tempPostTypes);
    }
  }, [window?.ar_try_on]);

  const handleSettingsChange = (e, targetName = "") => {
    handleChange(e, targetName);
  };

  /**
   * Handle form Submit
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(settings);
    // return;
    let formData = new FormData();
    formData.append("fields", JSON.stringify(settings));
    formData.append("method", "post");
    postWithoutImage(getURL("settings"), formData)
      .then((res) => {
        setSettings(res.data);
        toast("Successfully Saved.", "info", {
          autoClose: 15000,
        });
        setIsDataLoaded(true);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const ar_try_on_demo_id = (e) => {
    e.preventDefault();
    // window.open('https://wpaugmentedreality.com/product/dining-armchair-view-in-augmented-reality-3d/', '_blank');
    document.getElementById("ar_try_on_demo_id").value = "Setting Up Preview";
    let formData = new FormData();
    formData.append("method", "post");
    postWithoutImage(getURL("demo_preview"), formData)
      .then((res) => {
        if (res?.data?.ar_try_on_ar_demo?.url) {
          document.getElementById("ar_try_on_demo_id").value = "Preview Demo";
          window.open(res?.data?.ar_try_on_ar_demo?.url, "_blank");
        } else {
          document.getElementById("ar_try_on_demo_id").value = "Try Again";
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return isDataLoaded ? (
    <React.Fragment>
      <div
        id="ar_try_on_settings"
        className="art-p-4 art-bg-gray-100 art-space-y-6"
        style={{
          backgroundColor: "var(--theme-bg)",
          color: "var(--theme-text)",
          border: "1px solid #ccc",
        }}
      >
        <div className={"art-flex"}>
          {/* Title Section */}
          <div className="art-w-1/2">
            <h3
              className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2"
              style={{ color: "var(--theme-text)" }}
            >
              <span className="art-dashicons art-dashicons-admin-generic"></span>
              View Settings
            </h3>
          </div>
          <button
            type="button"
            id={"ar_try_on_demo_id"}
            onClick={ar_try_on_demo_id}
            className="art-w-40 art-h-12  art-cursor-pointer art-rounded art-bg-blue-500 art-text-white art-border  "
            style={{
              backgroundColor: "var(--theme-accent)",
              color: "var(--theme-text)",
            }}
          >
            Preview Demo
          </button>
        </div>

        {/* Display AR Button Automatically */}
        {/* Display AR Button Automatically */}
        <div
          className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-3"
          style={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-text)",
            border: "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {/* Label */}
          <label
            htmlFor="ar_try_on_display_button_automatically"
            className="art-font-medium art-text-base"
          >
            Display AR Button Automatically
          </label>

          {/* Switch Component (now below the label) */}
          <div className="art-flex art-items-center art-gap-3">
            <Switch
              label={
                settings.ar_try_on_display_button_automatically === "yes"
                  ? "Enabled"
                  : "Disabled"
              }
              defaultChecked={
                settings.ar_try_on_display_button_automatically === "yes"
              }
              onChange={(checked) =>
                handleSettingsChange({
                  target: {
                    name: "ar_try_on_display_button_automatically",
                    value: checked ? "yes" : "no",
                  },
                })
              }
              color="blue"
            />
          </div>

          {/* Description */}
          <p className="art-text-sm art-text-gray-400 art-leading-snug art-ml-px">
            Automatically display the AR button on supported product pages.
          </p>
        </div>

        {/* Enable AR For Post Types */}
        <div
          className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-3"
          style={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-text)",
            border: "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {/* Label */}
          <label
            htmlFor="ar_try_on_allowed_post_types"
            className="art-block art-font-medium art-text-base"
          >
            Enable AR For Post Types
          </label>

          {/* MultiSelect Field */}
          <MultiSelect
            id="ar_try_on_allowed_post_types"
            selectedItems={settings.ar_try_on_allowed_post_types}
            options={postTypes}
            onChange={(e) =>
              handleSettingsChange(e, "ar_try_on_allowed_post_types")
            }
          />

          {/* Description */}
          <p className="art-text-sm art-text-gray-400 art-leading-snug">
            Choose which post types will support AR Try-On functionality.
          </p>
        </div>

        {/* Dropdown Section */}
        {ar_try_on.is_wc_active && (
          <>
            {/* Show Button In */}
            <div
              className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-3"
              style={{
                backgroundColor: "var(--theme-bg)",
                color: "var(--theme-text)",
                border:
                  "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <label
                htmlFor="ar_try_on_wc_hook_position"
                className="art-block art-font-medium art-text-base"
              >
                Show Button In
              </label>

              <select
                id="ar_try_on_wc_hook_position"
                name="ar_try_on_wc_hook_position"
                className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm art-transition-all focus:art-ring-2 focus:art-ring-blue-400 focus:art-border-blue-400"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
                }}
                value={settings.ar_try_on_wc_hook_position}
                onChange={handleSettingsChange}
              >
                <option value="">None</option>
                <option value="1">
                  woocommerce_before_single_product_summary
                </option>
                <option value="2">
                  woocommerce_after_single_product_summary
                </option>
                <option value="3">woocommerce_before_single_product</option>
                <option value="4">woocommerce_after_single_product</option>
                <option value="5">woocommerce_after_add_to_cart_form</option>
                <option value="6">woocommerce_before_add_to_cart_form</option>
              </select>

              <p className="art-text-sm art-text-gray-400 art-leading-snug">
                Choose where the AR button will appear within WooCommerce
                product pages.
              </p>
            </div>

            {/* Show in Product Tabs */}
            <div
              className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-3"
              style={{
                backgroundColor: "var(--theme-bg)",
                color: "var(--theme-text)",
                border:
                  "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <label
                htmlFor="ar_try_on_single_product_tabs"
                className="art-font-medium art-text-base"
              >
                Show in Product Tabs
              </label>

              <div className="art-flex art-items-center art-gap-3">
                <Switch
                  label={
                    settings.ar_try_on_single_product_tabs === "yes"
                      ? "Yes"
                      : "No"
                  }
                  defaultChecked={
                    settings.ar_try_on_single_product_tabs === "yes"
                  }
                  onChange={(checked) =>
                    handleSettingsChange({
                      target: {
                        name: "ar_try_on_single_product_tabs",
                        value: checked ? "yes" : "no",
                      },
                    })
                  }
                  color="blue"
                />
              </div>

              <p className="art-text-sm art-text-gray-400 art-leading-snug">
                Toggle whether the AR Try-On feature appears in product tab
                sections.
              </p>
            </div>
          </>
        )}

        {/* Loading Attributes */}
        <div className="art-space-y-4">
          <h3
            className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
            }}
          >
            <span className="art-dashicons art-dashicons-admin-generic"></span>
            Loading : Attributes
          </h3>
          {/* Loading Options */}
          <div
            className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-4"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
              border:
                "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {/* Label */}
            <label
              htmlFor="ar_try_on_loading_type"
              className="art-block art-font-medium art-text-base"
            >
              Loading Type
            </label>

            {/* Radio Options */}
            <div className="art-flex art-flex-wrap art-gap-4">
              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="try_on_loading_type1"
                  name="ar_try_on_loading_type"
                  value="auto"
                  checked={settings.ar_try_on_loading_type === "auto"}
                  onChange={handleSettingsChange}
                />
                <span>Auto</span>
              </label>

              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="ar_try_on_loading2"
                  name="ar_try_on_loading_type"
                  value="lazy"
                  checked={settings.ar_try_on_loading_type === "lazy"}
                  onChange={handleSettingsChange}
                />
                <span>Lazy</span>
              </label>

              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="ar_try_on_loading3"
                  name="ar_try_on_loading_type"
                  value="eager"
                  checked={settings.ar_try_on_loading_type === "eager"}
                  onChange={handleSettingsChange}
                />
                <span>Eager</span>
              </label>
            </div>

            {/* Description */}
            <p className="art-text-sm art-text-gray-500 art-leading-snug">
              Determines how the model should be preloaded:
              <br />
              <strong>Auto</strong> — Loads when near the viewport. <br />
              <strong>Lazy</strong> — Loads only on interaction. <br />
              <strong>Eager</strong> — Loads immediately on page load.
            </p>
          </div>
        </div>

        {/* Reveal Attributes */}
        <div className="art-space-y-4">
          <h3
            className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
            }}
          >
            <span className="art-dashicons art-dashicons-admin-generic"></span>
            Reveal : Attributes
          </h3>
          {/* Reveal Options */}
          <div
            className="art-p-4 art-rounded-2xl art-bg-white art-shadow-sm art-transition-all art-duration-200 hover:art-shadow-md art-space-y-4"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
              border:
                "1.5px solid var(--theme-border, rgba(100, 116, 139, 0.4))",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {/* Label */}
            <label
              htmlFor="ar_try_on_reveal_type"
              className="art-block art-font-medium art-text-base"
            >
              Reveal Type
            </label>

            {/* Radio Options */}
            <div className="art-flex art-flex-wrap art-gap-4">
              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="ar_try_on_reveal1"
                  name="ar_try_on_reveal_type"
                  value="auto"
                  checked={settings.ar_try_on_reveal_type === "auto"}
                  onChange={handleSettingsChange}
                />
                <span>Auto</span>
              </label>

              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="ar_try_on_reveal2"
                  name="ar_try_on_reveal_type"
                  value="interaction"
                  checked={settings.ar_try_on_reveal_type === "interaction"}
                  onChange={handleSettingsChange}
                />
                <span>Interaction</span>
              </label>

              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="ar_try_on_reveal3"
                  name="ar_try_on_reveal_type"
                  value="manual"
                  checked={settings.ar_try_on_reveal_type === "manual"}
                  onChange={handleSettingsChange}
                />
                <span>Manual</span>
              </label>
            </div>

            {/* Description */}
            <p className="art-text-sm art-text-gray-500 art-leading-snug">
              Controls when the model should be revealed:
              <br />
              <strong>Auto</strong> — Reveals automatically once loading
              completes. <br />
              <strong>Interaction</strong> — Waits for user interaction before
              revealing. <br />
              <strong>Manual</strong> — Keeps model hidden until{" "}
              <code>dismissPoster()</code> is called.
            </p>
          </div>
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
              onChange={handleSettingsChange}
            />
            <input
              type="color"
              className="art-p-2 art-bg-gray-300 art-rounded"
              style={{ backgroundColor: "rgba(78, 186, 79, 0)" }}
              onChange={(e) =>
                handleSettingsChange(e, "ar_try_on_poster_color")
              }
            />
          </div>
          <p className="art-text-sm art-text-gray-400">
            Sets the background-color of the poster . You may wish to set this
            to transparent if you are using a seamless poster with transparency
            (so that the background color of shows through).
          </p>
        </div>

        {/* Enable AR */}
        <div className="art-space-y-2">
          <label htmlFor="ar_try_on_ar" className="art-font-medium">
            Enable AR
          </label>

          {/* Switch Component */}
          <Switch
            label={
              settings.ar_try_on_ar === "activate" ? "Activated" : "Deactivated"
            }
            defaultChecked={settings.ar_try_on_ar === "activate"}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_ar",
                  value: checked ? "activate" : "deactivate",
                },
              })
            }
            color="blue"
          />

          <p className="art-text-sm art-text-gray-400">
            Enable the ability to launch AR experiences on supported devices.
          </p>
        </div>

        {/* AR Modes */}
        <div className="art-space-y-2">
          <label htmlFor="ar_try_on_ar_modes" className="art-font-medium">
            AR Modes
          </label>
          <p className="art-text-sm art-text-gray-400">Select / Deselect All</p>
          <div className="art-space-y-1 art-flex art-gap-6">
            <label className="art-flex art-items-center art-space-x-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes1"
                value="webxr"
                checked={settings.ar_try_on_ar_modes.includes("webxr")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span>webxr</span>
            </label>
            <label className="art-flex art-items-center art-space-x-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes2"
                value="scene-viewer"
                checked={settings.ar_try_on_ar_modes.includes("scene-viewer")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span>scene-viewer</span>
            </label>
            <label className="art-flex art-items-center art-space-x-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes3"
                value="quick-look"
                checked={settings.ar_try_on_ar_modes.includes("quick-look")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span>quick-look</span>
            </label>
          </div>
          <p className="art-text-sm art-text-gray-400">
            A prioritized list of the types of AR experiences to enable. Allowed
            values are "webxr", to launch the AR experience in the browser,
            "scene-viewer", to launch the Scene Viewer app, "quick-look", to
            launch the iOS Quick Look app. Note that the presence of an ios-src
            will enable quick-look by itself.
          </p>
        </div>

        {/* AR Scale */}
        <div className="art-space-y-2">
          <label htmlFor="ar_try_on_ar_scale" className="art-font-medium">
            AR Scale
          </label>

          {/* Switch Component */}
          <Switch
            label={settings.ar_try_on_ar_scale === "fixed" ? "Fixed" : "Auto"}
            defaultChecked={settings.ar_try_on_ar_scale === "fixed"}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_ar_scale",
                  value: checked ? "fixed" : "auto",
                },
              })
            }
            color="blue"
          />

          <p className="art-text-sm art-text-gray-400">
            Controls the scaling behavior in AR mode. Set to "fixed" to disable
            scaling of the model, which sets it to always be at 100% scale.
            Defaults to "auto" which allows the model to be resized by pinch.
          </p>
        </div>

        {/* XR Environment */}
        <div className="art-space-y-2">
          <label htmlFor="ar_try_on_xr_environment" className="art-font-medium">
            XR-Environment
          </label>

          <Switch
            label={
              settings.ar_try_on_xr_environment === "activate"
                ? "Activated"
                : "Deactivated"
            }
            defaultChecked={settings.ar_try_on_xr_environment === "activate"}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_xr_environment",
                  value: checked ? "activate" : "deactivate",
                },
              })
            }
            color="blue"
          />

          <p className="art-text-sm art-text-gray-400">
            Enables AR lighting estimation in WebXR mode; this has a performance
            cost and replaces the lighting selected with during an AR session.
            Known issues: sometimes too dark, sudden updates, shiny materials
            look matte. environment-image
          </p>
        </div>

        {/* Custom AR Button */}
        <div className="art-space-y-2">
          <label htmlFor="ar_try_on_ar_button" className="art-font-medium">
            Custom AR Button
          </label>

          {/* Switch Component */}
          <Switch
            label={
              settings.ar_try_on_ar_button === "activate"
                ? "Activated"
                : "Deactivated"
            }
            defaultChecked={settings.ar_try_on_ar_button === "activate"}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_ar_button",
                  value: checked ? "activate" : "deactivate",
                },
              })
            }
            color="blue"
          />

          <p className="art-text-sm art-text-gray-400">
            By placing a child element under with <code>slot="ar-button"</code>,
            this element will replace the default "Enter AR" button (icon in the
            lower right). The custom button will appear if AR is potentially
            available (we will have some false positives until the user tries).
          </p>

          {/* Conditionally Render Fields when Switch is ON */}
          {settings.ar_try_on_ar_button === "activate" && (
            <div className="art-space-y-4 art-mt-4 art-border-t art-pt-4">
              {/* Button Text */}
              <div className="art-space-y-2">
                <label
                  htmlFor="ar_try_on_ar_button_text"
                  className="art-font-medium"
                >
                  Button Text
                </label>
                <input
                  type="text"
                  id="ar_try_on_ar_button_text"
                  name="ar_try_on_ar_button_text"
                  value={settings.ar_try_on_ar_button_text}
                  onChange={handleSettingsChange}
                  className="art-block art-p-2 art-border art-rounded art-w-1/12"
                />
              </div>

              {/* Button Background Color */}
              <div className="art-space-y-2">
                <label
                  htmlFor="ar_try_on_ar_button_background_color"
                  className="art-font-medium"
                >
                  Button Background Color
                </label>
                <div className="art-flex art-items-center art-gap-2">
                  <input
                    type="text"
                    id="ar_try_on_ar_button_background_color"
                    name="ar_try_on_ar_button_background_color"
                    className="art-block art-p-2 art-border art-rounded art-w-1/12"
                    value={settings.ar_try_on_ar_button_background_color}
                    onChange={handleSettingsChange}
                  />
                  <input
                    type="color"
                    id="ar_try_on_ar_button_background_color_picker"
                    name="ar_try_on_ar_button_background_color"
                    style={{ backgroundColor: "transparent" }}
                    value={settings.ar_try_on_ar_button_background_color}
                    onChange={(e) =>
                      handleSettingsChange(
                        e,
                        "ar_try_on_ar_button_background_color"
                      )
                    }
                    className="art-block art-p-2 art-border art-rounded"
                  />
                </div>
              </div>

              {/* Button Text Color */}
              <div className="art-space-y-2">
                <label
                  htmlFor="ar_try_on_ar_button_text_color"
                  className="art-font-medium"
                >
                  Button Text Color
                </label>
                <div className="art-flex art-items-center art-gap-2">
                  <input
                    type="text"
                    id="ar_try_on_ar_button_text_color"
                    name="ar_try_on_ar_button_text_color"
                    className="art-block art-p-2 art-border art-rounded art-w-1/12"
                    value={settings.ar_try_on_ar_button_text_color}
                    onChange={handleSettingsChange}
                  />
                  <input
                    type="color"
                    id="ar_try_on_ar_button_text_color_picker"
                    name="ar_try_on_ar_button_text_color"
                    style={{ backgroundColor: "transparent" }}
                    value={settings.ar_try_on_ar_button_text_color}
                    onChange={(e) =>
                      handleSettingsChange(e, "ar_try_on_ar_button_text_color")
                    }
                    className="art-block art-p-2 art-border art-rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enable QR Code */}
        <div className="art-space-y-4">
          <label
            htmlFor="ar_try_on_enable_qr_code"
            className="art-block art-font-medium"
          >
            Enable QR Code
          </label>

          <Switch
            label={settings.ar_try_on_enable_qr_code === "yes" ? "Yes" : "No"}
            defaultChecked={settings.ar_try_on_enable_qr_code === "yes"}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_enable_qr_code",
                  value: checked ? "yes" : "no",
                },
              })
            }
            color="blue"
          />
        </div>

        {/* Clear Cache */}
        <div className="art-space-y-2 art-mr-1">
          <label htmlFor="ar_try_on_clear_cache" className="art-font-medium">
            Clear Cache
          </label>

          {/* Switch Component */}
          <Switch
            label={settings.ar_try_on_clear_cache ? "Enabled" : "Disabled"}
            defaultChecked={settings.ar_try_on_clear_cache}
            onChange={(checked) =>
              handleSettingsChange({
                target: {
                  name: "ar_try_on_clear_cache",
                  value: checked,
                },
              })
            }
            color="blue"
          />
        </div>
      </div>
    </React.Fragment>
  ) : (
    <h1>Loading</h1>
  );
}
