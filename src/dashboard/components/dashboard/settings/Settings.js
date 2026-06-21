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
import BorderCard from "./BorderCard";
import TryonSettings from "./TryonSettings";
import { isProActive } from "../../../../context/PremiumBadge";


export default function Settings({ settings, handleChange }) {
  // const [settings, setSettings] = useState({
  //     ar_try_on_display_button_automatically: 'yes',
  //     ar_try_on_allowed_post_types: ['post'],
  //     ar_try_on_wc_hook_position: "product_image",
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
    document.getElementById("ar_try_on_demo_id").innerHTML = "Setting Up Preview";
    console.log(document.getElementById("ar_try_on_demo_id"))
    let formData = new FormData();
    formData.append("method", "post");
    postWithoutImage(getURL("demo_preview"), formData)
      .then((res) => {

        if (res?.data?.ar_try_on_ar_demo?.url) {
          document.getElementById("ar_try_on_demo_id").innerHTML = "Preview Demo";
          window.open(res?.data?.ar_try_on_ar_demo?.url, "_blank");
        } else {
          document.getElementById("ar_try_on_demo_id").innerHTML = "Try Again";
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
            className="art-w-40 art-h-12  art-cursor-pointer art-rounded art-bg-blue-500 art-text-white art-border-none"
          >
            Preview Demo
          </button>
        </div>

        {/* Display AR Button Automatically */}
        <BorderCard>
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
        </BorderCard>

        {/* Enable AR For Post Types */}
        <BorderCard>
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
            {!isProActive() && (
              <>
                {' '}AtlasAR Free supports one post type at a time;
                AtlasAR Pro lets you enable AR on any combination.
              </>
            )}
          </p>

          {/*
           * AR-61 §1.1 Phase 2 — the multi-post-type cap stays enforced
           * in App.js (defense-in-depth). The upfront <PremiumBadge>
           * that used to live here was removed at the project owner's
           * request — the descriptive note above already explains the
           * Free limit honestly without a separate visual block.
           */}
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
                value={settings.ar_try_on_wc_hook_position || 'product_image'}
                onChange={handleSettingsChange}
              >
                <option value="product_image">Product Image</option>
                <option value="3d_viewer">3D Viewer</option>
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
                <option value="7">woocommerce_product_thumbnails</option>
              </select>

              <p className="art-text-sm art-text-gray-400 art-leading-snug">
                Choose where the AR button will appear within WooCommerce
                product pages.
                <br />
                <strong>Product Image</strong> - Shows the featured image first with a 3D icon to reveal the 3D viewer.
                <br />
                <strong>3D Viewer</strong> - Shows the 3D model first with an image icon to reveal the product image.
              </p>
            </BorderCard>

            {/* Show in Product Tabs */}
            <BorderCard>
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
            Loading : Attributes
          </h3>
          {/* Loading Options */}
          <BorderCard>
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
              Determines when the 3D model file (.glb) is fetched, once the
              viewer is on the page:
              <br />
              <strong>Auto</strong> — The browser decides; usually the same as
              Lazy. <br />
              <strong>Lazy</strong> — Defers the model file until the viewer
              scrolls near the viewport. <br />
              <strong>Eager</strong> — Loads the model file immediately on page
              load.
            </p>
          </BorderCard>
        </div>

        {/* Model Library Loading Behavior (AR-67) */}
        <div className="art-space-y-4">
          <h3
            className="art-text-xl art-font-semibold art-flex art-items-center art-gap-2"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
            }}
          >
            <span className="art-dashicons art-dashicons-performance"></span>
            Model Loading Behavior
          </h3>
          <BorderCard>
            <label
              htmlFor="model_load_strategy"
              className="art-block art-font-medium art-text-base"
            >
              3D Viewer Library Loading
            </label>

            <div className="art-flex art-flex-wrap art-gap-4">
              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="model_load_strategy_auto"
                  name="model_load_strategy"
                  value="auto"
                  checked={(settings.model_load_strategy || "auto") === "auto"}
                  onChange={handleSettingsChange}
                />
                <span>Automatic</span>
              </label>

              <label className="art-flex art-items-center art-gap-2 art-cursor-pointer">
                <Radio
                  type="radio"
                  id="model_load_strategy_interaction"
                  name="model_load_strategy"
                  value="interaction"
                  checked={settings.model_load_strategy === "interaction"}
                  onChange={handleSettingsChange}
                />
                <span>On interaction</span>
              </label>
            </div>

            <p className="art-text-sm art-text-gray-500 art-leading-snug">
              Controls when the ~1&nbsp;MB 3D viewer library is downloaded:
              <br />
              <strong>Automatic</strong> — the 3D viewer loads with the page
              (current behavior). <br />
              <strong>On interaction</strong> — the product image shows first and
              the 3D viewer downloads only when the shopper clicks
              &ldquo;View&nbsp;in&nbsp;3D&rdquo;, improving initial page speed.{" "}
              <br />
              This can be overridden per product in the product&rsquo;s AR
              settings.
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
            Reveal : Attributes
          </h3>
          {/* Reveal Options */}
          <BorderCard>
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
          </BorderCard>
        </div>

        {/* Poster Color */}

        <BorderCard>
          <label
            htmlFor="ar_try_on_poster_color"
            className="art-block art-font-medium art-text-base"
          >
            --poster-color
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
            Defines the background color of the poster. Set it to{" "}
            <code>transparent</code> if your poster image includes transparency,
            allowing the underlying background to show through.
          </p>
        </BorderCard>

        {/* Enable AR */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar"
            className="art-font-medium art-text-base"
          >
            Enable AR
          </label>

          {/* Switch Component */}
          <div className="art-flex art-items-center art-justify-between">
            <Switch
              label={
                settings.ar_try_on_ar === "activate"
                  ? "Activated"
                  : "Deactivated"
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
            Enable the ability to launch AR experiences on supported devices.
          </p>
        </BorderCard>

        {/* AR Modes */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_modes"
            className="art-font-medium art-text-base"
          >
            AR Modes
          </label>

          <p className="art-text-sm art-text-gray-500 art-leading-snug">
            Select / Deselect All
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
            A prioritized list of the types of AR experiences to enable. Allowed
            values are <code>"webxr"</code> (launches in-browser),{" "}
            <code>"scene-viewer"</code>
            (opens Scene Viewer app), and <code>"quick-look"</code> (opens iOS
            Quick Look). The presence of an <code>ios-src</code> automatically
            enables Quick Look.
          </p>
        </BorderCard>

        {/* AR Scale */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_scale"
            className="art-font-medium art-text-base"
          >
            AR Scale
          </label>

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
            Controls the scaling behavior in AR mode. Set to{" "}
            <code>"fixed"</code> to disable scaling of the model, which sets it
            to always be at 100% scale. Defaults to <code>"auto"</code>, which
            allows the model to be resized by pinch.
          </p>
        </BorderCard>

        {/* XR Environment */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_xr_environment"
            className="art-font-medium art-text-base"
          >
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
        </BorderCard>

        {/* AR-61: Global "View in AR" button label override.
            Defaults to "View in AR". Per-product metabox
            `view_in_ar_label` and shortcode `button_label="…"`
            both override this on a finer-grained scope. */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_view_in_ar_label"
            className="art-font-medium art-text-base"
          >
            "View in AR" Button Label
          </label>

          <input
            type="text"
            id="ar_try_on_view_in_ar_label"
            name="ar_try_on_view_in_ar_label"
            placeholder="View in AR"
            value={
              settings.ar_try_on_view_in_ar_label !== undefined
                ? settings.ar_try_on_view_in_ar_label
                : "View in AR"
            }
            onChange={handleSettingsChange}
            className="art-block art-w-full art-px-3 art-py-2 art-border art-rounded-md art-bg-transparent focus:art-ring-1 focus:art-ring-[var(--theme-accent)] focus:art-border-[var(--theme-accent)]"
          />

          <p className="art-text-sm art-text-gray-400 art-leading-snug">
            Override the default <strong>"View in AR"</strong> button text store-wide. Individual products can override this via the AtlasAR metabox, and shortcode insertions can override per emit with <code>[atlas_ar button_label="…"]</code>.
          </p>
        </BorderCard>

        {/* AR-61: Global rotation hint — model-viewer's
            `interaction-prompt`, `interaction-prompt-style` and
            `interaction-prompt-threshold` attributes, exposed as
            three dropdowns / one numeric slider. Per-product metabox
            can opt in/out and adjust style/timing individually. */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_interaction_prompt"
            className="art-font-medium art-text-base"
          >
            360° Rotation Hint
          </label>

          <p className="art-text-sm art-text-gray-500 art-leading-snug art-mt-1">
            Shows a visible drag-to-rotate cue so shoppers discover that
            the 3D model can be rotated. Individual products can override
            this via the AtlasAR metabox.
          </p>

          <div className="art-grid art-grid-cols-1 sm:art-grid-cols-3 art-gap-3 art-mt-3">
            {/* Mode */}
            <div>
              <label
                htmlFor="ar_try_on_interaction_prompt"
                className="art-block art-text-sm art-font-medium art-mb-1"
              >
                Mode
              </label>
              <select
                id="ar_try_on_interaction_prompt"
                name="ar_try_on_interaction_prompt"
                value={settings.ar_try_on_interaction_prompt || "auto"}
                onChange={handleSettingsChange}
                className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm focus:art-ring-2 focus:art-ring-blue-400 focus:art-border-blue-400"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
                }}
              >
                <option value="auto">Auto — show after idle</option>
                <option value="when-focused">
                  When focused — only after keyboard focus
                </option>
                <option value="none">Off — no hint</option>
              </select>
            </div>

            {/* Style */}
            <div>
              <label
                htmlFor="ar_try_on_interaction_prompt_style"
                className="art-block art-text-sm art-font-medium art-mb-1"
              >
                Style
              </label>
              <select
                id="ar_try_on_interaction_prompt_style"
                name="ar_try_on_interaction_prompt_style"
                value={
                  settings.ar_try_on_interaction_prompt_style || "wiggle"
                }
                onChange={handleSettingsChange}
                disabled={settings.ar_try_on_interaction_prompt === "none"}
                className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm focus:art-ring-2 focus:art-ring-blue-400 focus:art-border-blue-400 disabled:art-opacity-50"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
                }}
              >
                <option value="wiggle">
                  Wiggle — model rotates back-and-forth
                </option>
                <option value="basic">
                  Basic — hand-pointer icon
                </option>
              </select>
            </div>

            {/* Threshold */}
            <div>
              <label
                htmlFor="ar_try_on_interaction_prompt_threshold"
                className="art-block art-text-sm art-font-medium art-mb-1"
              >
                Idle Delay
              </label>
              <select
                id="ar_try_on_interaction_prompt_threshold"
                name="ar_try_on_interaction_prompt_threshold"
                value={
                  String(
                    settings.ar_try_on_interaction_prompt_threshold || "2000"
                  )
                }
                onChange={handleSettingsChange}
                disabled={settings.ar_try_on_interaction_prompt === "none"}
                className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm focus:art-ring-2 focus:art-ring-blue-400 focus:art-border-blue-400 disabled:art-opacity-50"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
                }}
              >
                <option value="0">Immediate</option>
                <option value="1000">1 second</option>
                <option value="2000">2 seconds (default)</option>
                <option value="3000">3 seconds</option>
                <option value="5000">5 seconds</option>
                <option value="8000">8 seconds</option>
              </select>
            </div>
          </div>
        </BorderCard>

        {/* Custom AR Button */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_ar_button"
            className="art-font-medium art-text-base"
          >
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
            <div className="art-mt-4 art-border-t art-pt-4">
              <div className="art-flex art-flex-wrap art-items-start art-gap-6">
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
                    className="art-block art-p-2 art-border art-rounded art-w-[100px]"
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
                    Button Text Color
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
        </BorderCard>

        {/* Clear Cache */}
        <BorderCard>
          <label
            htmlFor="ar_try_on_clear_cache"
            className="art-font-medium art-text-base"
          >
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
        </BorderCard>

        {/* Virtual Try-On (Face Landmarker) */}
        <TryonSettings settings={settings} handleChange={handleChange} />
      </div>
    </React.Fragment>
  ) : (
    <h1>Loading</h1>
  );
}
