import React, { useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';
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
import BorderCard from "./BorderCard";


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
        toast(__("Successfully Saved.", "ar-vr-3d-model-try-on"), "info", {
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
    document.getElementById("ar_try_on_demo_id").innerHTML = __("Setting Up Preview", "ar-vr-3d-model-try-on");
    console.log(document.getElementById("ar_try_on_demo_id"))
    let formData = new FormData();
    formData.append("method", "post");
    postWithoutImage(getURL("demo_preview"), formData)
      .then((res) => {

        if (res?.data?.ar_try_on_ar_demo?.url) {
          document.getElementById("ar_try_on_demo_id").innerHTML = __("Preview Demo", "ar-vr-3d-model-try-on");
          window.open(res?.data?.ar_try_on_ar_demo?.url, "_blank");
        } else {
          document.getElementById("ar_try_on_demo_id").innerHTML = __("Try Again", "ar-vr-3d-model-try-on");
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
                {__('View Settings', 'ar-vr-3d-model-try-on')}
            </h3>
          </div>
          <button
            type="button"
            id={"ar_try_on_demo_id"}
            onClick={ar_try_on_demo_id}
            className="art-w-40 art-h-12  art-cursor-pointer art-rounded art-bg-blue-500 art-text-white art-border-none"
          >
           {__('Preview Demo', 'ar-vr-3d-model-try-on')}
          </button>
        </div>

        {/* Display AR Button Automatically */}
        <BorderCard>
          {/* Label */}
          <label
            htmlFor="ar_try_on_display_button_automatically"
            className="art-font-medium art-text-base"
          >
             {__('Display AR Button Automatically', 'ar-vr-3d-model-try-on')}
          </label>

          {/* Switch Component (now below the label) */}
          <div className="art-flex art-items-center art-gap-3">
            <Switch
              label={
                settings.ar_try_on_display_button_automatically === "yes"
                  ? __("Enabled", "ar-vr-3d-model-try-on")
                  : __("Disabled", "ar-vr-3d-model-try-on")
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
            {__('Automatically display the AR button on supported product pages.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* Enable AR For Post Types */}
        <BorderCard>
          {/* Label */}
          <label
            htmlFor="ar_try_on_allowed_post_types"
            className="art-block art-font-medium art-text-base"
          >
                 {__('Enable AR For Post Types', 'ar-vr-3d-model-try-on')}
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
            {__('Choose which post types will support AR Try-On functionality.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* Dropdown Section */}
        {ar_try_on.is_wc_active && (
          <>
            {/* Show Button In */}
            <BorderCard>
              <label
                htmlFor="ar_try_on_wc_hook_position"
                className="art-block art-font-medium art-text-base"
              >
                 {__('Show Button In', 'ar-vr-3d-model-try-on')}
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
                <option value="">{__('None', 'ar-vr-3d-model-try-on')}</option>
                <option value="1">
                  {__("woocommerce_before_single_product_summary", "ar-vr-3d-model-try-on")}
                </option>
                <option value="2">
                  {__("woocommerce_after_single_product_summary", "ar-vr-3d-model-try-on")}
                </option>
                <option value="3">{__("woocommerce_before_single_product", "ar-vr-3d-model-try-on")}</option>
                <option value="4">{__("woocommerce_after_single_product", "ar-vr-3d-model-try-on")}</option>
                <option value="5">{__("woocommerce_after_add_to_cart_form", "ar-vr-3d-model-try-on")}</option>
                <option value="6">{__("woocommerce_before_add_to_cart_form", "ar-vr-3d-model-try-on")}</option>
                <option value="7">{__("woocommerce_product_thumbnails", "ar-vr-3d-model-try-on")}</option>
              </select>

              <p className="art-text-sm art-text-gray-400 art-leading-snug">
                {__('Choose where the AR button will appear within WooCommerce product pages.', 'ar-vr-3d-model-try-on')}
              </p>
            </BorderCard>

            {/* Show in Product Tabs */}
            <BorderCard>
              <label
                htmlFor="ar_try_on_single_product_tabs"
                className="art-font-medium art-text-base"
              >
                    {__('Show in Product Tabs', 'ar-vr-3d-model-try-on')}
              </label>

              <div className="art-flex art-items-center art-gap-3">
                <Switch
                  label={
                    settings.ar_try_on_single_product_tabs === "yes"
                      ? __("Yes", "ar-vr-3d-model-try-on")
                      : __("No", "ar-vr-3d-model-try-on")
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
                {__('Toggle whether the AR Try-On feature appears in product tab sections.', 'ar-vr-3d-model-try-on')}
              </p>
            </BorderCard>
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
             {__('Loading : Attributes', 'ar-vr-3d-model-try-on')}
          </h3>
          {/* Loading Options */}
          <BorderCard>
            {/* Label */}
            <label
              htmlFor="ar_try_on_loading_type"
              className="art-block art-font-medium art-text-base"
            >
               {__('Loading Type', 'ar-vr-3d-model-try-on')}
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
                <span>{__('Auto', 'ar-vr-3d-model-try-on')}</span>
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
                <span>{__('Lazy', 'ar-vr-3d-model-try-on')}</span>
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
                <span>{__('Eager', 'ar-vr-3d-model-try-on')}</span>
              </label>
            </div>

            {/* Description */}
            <p className="art-text-sm art-text-gray-500 art-leading-snug">
              {__('Determines how the model should be preloaded:', 'ar-vr-3d-model-try-on')}
              <br />
              <strong>{__('Auto', 'ar-vr-3d-model-try-on')}</strong> — {__('Loads when near the viewport.', 'ar-vr-3d-model-try-on')} <br />
              <strong>{__('Lazy', 'ar-vr-3d-model-try-on')}</strong> — {__('Loads only on interaction.', 'ar-vr-3d-model-try-on')} <br />
              <strong>{__('Eager', 'ar-vr-3d-model-try-on')}</strong> — {__('Loads immediately on page load.', 'ar-vr-3d-model-try-on')}
            </p>
          </BorderCard>
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
              {__('Reveal : Attributes', 'ar-vr-3d-model-try-on')}
          </h3>
          {/* Reveal Options */}
          <BorderCard>
            {/* Label */}
            <label
              htmlFor="ar_try_on_reveal_type"
              className="art-block art-font-medium art-text-base"
            >
              {__('Reveal Type', 'ar-vr-3d-model-try-on')}
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
                <span>{__('Auto', 'ar-vr-3d-model-try-on')}</span>
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
                <span>{__('Interaction', 'ar-vr-3d-model-try-on')}</span>
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
                <span>{__('Manual', 'ar-vr-3d-model-try-on')}</span>
              </label>
            </div>

            {/* Description */}
            <p className="art-text-sm art-text-gray-500 art-leading-snug">
              {__('Controls when the model should be revealed:', 'ar-vr-3d-model-try-on')}
              <br />
              <strong>{__('Auto', 'ar-vr-3d-model-try-on')}</strong> — {__('Reveals automatically once loading completes.', 'ar-vr-3d-model-try-on')} <br />
              <strong>{__('Interaction', 'ar-vr-3d-model-try-on')}</strong> — {__('Waits for user interaction before revealing.', 'ar-vr-3d-model-try-on')} <br />
              <strong>{__('Manual', 'ar-vr-3d-model-try-on')}</strong> — {__('Keeps model hidden until', 'ar-vr-3d-model-try-on')}{" "}
              <code>dismissPoster()</code> {__('is called.', 'ar-vr-3d-model-try-on')}
            </p>
          </BorderCard>
        </div>

        {/* Poster Color */}

        <BorderCard>
          <label
            htmlFor="ar_try_on_poster_color"
            className="art-block art-font-medium art-text-base"
          >
            {__("--poster-color", "ar-vr-3d-model-try-on")}
          </label>

          <div className="art-flex art-items-center art-gap-3">
            <input
              type="text"
              id="ar_try_on_poster_color"
              name="ar_try_on_poster_color"
              className="art-block art-w-40 art-px-3 art-py-2 art-border art-rounded-md art-bg-transparent focus:art-ring-1 focus:art-ring-[var(--theme-accent)] focus:art-border-[var(--theme-accent)]"
              value={settings.ar_try_on_poster_color}
              onChange={handleSettingsChange}
            />
            <input
              type="color"
              className="art-p-2 art-rounded-md art-cursor-pointer art-border"
              style={{ backgroundColor: "transparent" }}
              value={settings.ar_try_on_poster_color}
              onChange={(e) =>
                handleSettingsChange(e, "ar_try_on_poster_color")
              }
            />
          </div>

          <p className="art-text-sm art-text-gray-500 art-leading-snug">
            {__('Defines the background color of the poster. Set it to', 'ar-vr-3d-model-try-on')}{" "}
            <code>transparent</code> {__('if your poster image includes transparency, allowing the underlying background to show through.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* Enable AR */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar"
            className="art-font-medium art-text-base"
          >
              {__('Enable AR', 'ar-vr-3d-model-try-on')}
          </label>

          {/* Switch Component */}
          <div className="art-flex art-items-center art-justify-between">
            <Switch
              label={
                settings.ar_try_on_ar === "activate"
                  ? __("Activated", "ar-vr-3d-model-try-on")
                  : __("Deactivated", "ar-vr-3d-model-try-on")
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
          </div>

          <p className="art-text-sm art-text-gray-500 art-leading-snug">
            {__('Enable the ability to launch AR experiences on supported devices.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* AR Modes */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_modes"
            className="art-font-medium art-text-base"
          >
            {__('AR Modes', 'ar-vr-3d-model-try-on')}
          </label>

          <p className="art-text-sm art-text-gray-500 art-leading-snug">
             {__('Select / Deselect All', 'ar-vr-3d-model-try-on')}
          </p>

          <div className="art-flex art-flex-wrap art-gap-6 art-mt-1">
            <label className="art-flex art-items-center art-gap-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes1"
                value="webxr"
                checked={settings.ar_try_on_ar_modes.includes("webxr")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span className="art-text-base">webxr</span>
            </label>

            <label className="art-flex art-items-center art-gap-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes2"
                value="scene-viewer"
                checked={settings.ar_try_on_ar_modes.includes("scene-viewer")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span className="art-text-base">scene-viewer</span>
            </label>

            <label className="art-flex art-items-center art-gap-2">
              <Checkbox
                type="checkbox"
                name="ar_try_on_ar_modes[]"
                id="ar_try_on_ar_modes3"
                value="quick-look"
                checked={settings.ar_try_on_ar_modes.includes("quick-look")}
                onChange={(e) => handleSettingsChange(e, "ar_try_on_ar_modes")}
                className="art-text-blue-600 art-focus:ring-blue-500"
              />
              <span className="art-text-base">quick-look</span>
            </label>
          </div>

          <p className="art-text-sm art-text-gray-500 art-leading-snug">
            {__('A prioritized list of the types of AR experiences to enable. Allowed values are', 'ar-vr-3d-model-try-on')}{" "}
            <code>"webxr"</code> {__('(launches in-browser),', 'ar-vr-3d-model-try-on')}{" "}
            <code>"scene-viewer"</code>
            {" "}{__('(opens Scene Viewer app), and', 'ar-vr-3d-model-try-on')}{" "}<code>"quick-look"</code> {__('(opens iOS Quick Look). The presence of an', 'ar-vr-3d-model-try-on')}{" "}<code>ios-src</code> {__('automatically enables Quick Look.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* AR Scale */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_scale"
            className="art-font-medium art-text-base"
          >
                   {__('AR Scale', 'ar-vr-3d-model-try-on')}
          </label>

          <Switch
            label={settings.ar_try_on_ar_scale === "fixed" ? __("Fixed", "ar-vr-3d-model-try-on") : __("Auto", "ar-vr-3d-model-try-on")}
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
            {__('Controls the scaling behavior in AR mode. Set to', 'ar-vr-3d-model-try-on')}{" "}
            <code>"fixed"</code> {__('to disable scaling of the model, which sets it to always be at 100% scale. Defaults to', 'ar-vr-3d-model-try-on')}{" "}<code>"auto"</code>, {__('which allows the model to be resized by pinch.', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* XR Environment */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_xr_environment"
            className="art-font-medium art-text-base"
          >
                  {__('XR-Environment', 'ar-vr-3d-model-try-on')}
          </label>

          <Switch
            label={
              settings.ar_try_on_xr_environment === "activate"
                ? __("Activated", "ar-vr-3d-model-try-on")
                : __("Deactivated", "ar-vr-3d-model-try-on")
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
            {__('Enables AR lighting estimation in WebXR mode; this has a performance cost and replaces the lighting selected with during an AR session. Known issues: sometimes too dark, sudden updates, shiny materials look matte. environment-image', 'ar-vr-3d-model-try-on')}
          </p>
        </BorderCard>

        {/* Custom AR Button */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_button"
            className="art-font-medium art-text-base"
          >
                 {__('Custom AR Button', 'ar-vr-3d-model-try-on')}
          </label>

          {/* Switch Component */}
          <Switch
            label={
              settings.ar_try_on_ar_button === "activate"
                ? __("Activated", "ar-vr-3d-model-try-on")
                : __("Deactivated", "ar-vr-3d-model-try-on")
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
            {__('By placing a child element under with', 'ar-vr-3d-model-try-on')}{" "}<code>slot="ar-button"</code>,
            {" "}{__('this element will replace the default "Enter AR" button (icon in the lower right). The custom button will appear if AR is potentially available (we will have some false positives until the user tries).', 'ar-vr-3d-model-try-on')}
          </p>


          {/* Conditionally Render Fields when Switch is ON */}
          {settings.ar_try_on_ar_button === "activate" && (
            <div className="art-mt-4 art-border-t art-pt-4">
              <div className="art-flex art-flex-wrap art-items-start art-gap-6">
                {/* Button Text */}
                <div className="art-space-y-2">
                  <label
                    htmlFor="ar_try_on_ar_button_text"
                    className="art-font-medium"
                  >
                     {__('Button Text', 'ar-vr-3d-model-try-on')}
                  </label>
                  <input
                    type="text"
                    id="ar_try_on_ar_button_text"
                    name="ar_try_on_ar_button_text"
                    value={settings.ar_try_on_ar_button_text}
                    onChange={handleSettingsChange}
                    className="art-block art-p-2 art-border art-rounded art-w-[100px]"
                  />
                </div>

                {/* Button Background Color */}
                <div className="art-space-y-2">
                  <label
                    htmlFor="ar_try_on_ar_button_background_color"
                    className="art-font-medium"
                  >
                      {__('Button Background Color', 'ar-vr-3d-model-try-on')}
                  </label>
                  <div className="art-flex art-items-center">
                    <input
                      type="text"
                      id="ar_try_on_ar_button_background_color"
                      name="ar_try_on_ar_button_background_color"
                      className="art-block art-p-2 art-border art-rounded art-w-[100px]"
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
                        {__('Button Text Color', 'ar-vr-3d-model-try-on')}
                  </label>
                  <div className="art-flex art-items-center">
                    <input
                      type="text"
                      id="ar_try_on_ar_button_text_color"
                      name="ar_try_on_ar_button_text_color"
                      className="art-block art-p-2 art-border art-rounded art-w-[100px]"
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
                        handleSettingsChange(
                          e,
                          "ar_try_on_ar_button_text_color"
                        )
                      }
                      className="art-block art-p-2 art-border art-rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </BorderCard>

        {/* Enable QR Code */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_enable_qr_code"
            className="art-block art-font-medium art-text-base"
          >
                  {__('Enable QR Code', 'ar-vr-3d-model-try-on')}
          </label>

          <Switch
            label={settings.ar_try_on_enable_qr_code === "yes" ? __("Yes", "ar-vr-3d-model-try-on") : __("No", "ar-vr-3d-model-try-on")}
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
        </BorderCard>

        {/* Clear Cache */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_clear_cache"
            className="art-font-medium art-text-base"
          >
             {__('Clear Cache', 'ar-vr-3d-model-try-on')}
          </label>

          {/* Switch Component */}
          <Switch
            label={settings.ar_try_on_clear_cache ? __("Enabled", "ar-vr-3d-model-try-on") : __("Disabled", "ar-vr-3d-model-try-on")}
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
        </BorderCard>
      </div>
    </React.Fragment>
  ) : (
    <h1>{__('Loading', 'ar-vr-3d-model-try-on')}</h1>
  );
}
