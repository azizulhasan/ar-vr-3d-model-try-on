import { __ } from "@wordpress/i18n";
import BorderCard from "../../components/dashboard/settings/BorderCard";
import Switch from "../../components/dashboard/settings/Switch";
import MultiSelect from "../../components/dashboard/settings/MultiSelect";
import { isProActive } from "../../../context/PremiumBadge";
import notify from "../../../context/Notify";
import { Label, Desc } from "../../ui";

// Same options as Settings → "Show Button In".
const HOOK_POSITIONS = [
  ["product_image", "Product Image"],
  ["3d_viewer", "3D Viewer"],
  ["1", "woocommerce_before_single_product_summary"],
  ["2", "woocommerce_after_single_product_summary"],
  ["3", "woocommerce_before_single_product"],
  ["4", "woocommerce_after_single_product"],
  ["5", "woocommerce_after_add_to_cart_form"],
  ["6", "woocommerce_before_add_to_cart_form"],
  ["7", "woocommerce_product_thumbnails"],
];

/**
 * Step 1 — where AR appears. Same fields and wording as Settings → General.
 */
export default function StepWhere({ state, setSetting }) {
  const s = state.settings;
  const postTypes = wp.hooks.applyFilters(
    "ar_try_on_allowed_post_types",
    Object.keys(ar_try_on.post_types || {}).filter((t) => t !== "attachment")
  );

  const onPostTypes = (value) => {
    if (!isProActive() && value.length > 1) {
      notify(__("Multiple post type is only available in the pro version", "ar-vr-3d-model-try-on"), "error");
      return;
    }
    setSetting("ar_try_on_allowed_post_types", value);
  };

  return (
    <>
      <BorderCard>
        <Label>{__("Display AR Button Automatically", "ar-vr-3d-model-try-on")}</Label>
        <div className="art-flex art-items-center art-gap-3">
          <Switch
            label={s.ar_try_on_display_button_automatically === "yes" ? __("Enabled", "ar-vr-3d-model-try-on") : __("Disabled", "ar-vr-3d-model-try-on")}
            defaultChecked={s.ar_try_on_display_button_automatically === "yes"}
            onChange={(checked) => setSetting("ar_try_on_display_button_automatically", checked ? "yes" : "no")}
            color="blue"
          />
        </div>
        <Desc>{__("Automatically display the AR button on supported product pages.", "ar-vr-3d-model-try-on")}</Desc>
      </BorderCard>

      <BorderCard>
        <Label>{__("Enable AR For Post Types", "ar-vr-3d-model-try-on")}</Label>
        <MultiSelect
          id="ar_try_on_allowed_post_types"
          selectedItems={s.ar_try_on_allowed_post_types || []}
          options={postTypes}
          onChange={onPostTypes}
        />
        <Desc>
          {__("Choose which post types will support AR Try-On functionality.", "ar-vr-3d-model-try-on")}
          {!isProActive() &&
            " " + __("AtlasAR Free supports one post type at a time; AtlasAR Pro lets you enable AR on any combination.", "ar-vr-3d-model-try-on")}
        </Desc>
      </BorderCard>

      {ar_try_on.is_wc_active && (
        <>
          <BorderCard>
            <Label htmlFor="ar_try_on_wc_hook_position">{__("Show Button In", "ar-vr-3d-model-try-on")}</Label>
            <select
              id="ar_try_on_wc_hook_position"
              className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm art-transition-all focus:art-ring-2 focus:art-ring-blue-400 focus:art-border-blue-400"
              style={{
                backgroundColor: "var(--theme-bg)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
              }}
              value={s.ar_try_on_wc_hook_position || "product_image"}
              onChange={(e) => setSetting("ar_try_on_wc_hook_position", e.target.value)}
            >
              {HOOK_POSITIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="art-text-sm art-text-gray-400 art-leading-snug">
              {__("Choose where the AR button will appear within WooCommerce product pages.", "ar-vr-3d-model-try-on")}
              <br />
              <strong>{__("Product Image", "ar-vr-3d-model-try-on")}</strong> - {__("Shows the featured image first with a 3D icon to reveal the 3D viewer.", "ar-vr-3d-model-try-on")}
              <br />
              <strong>{__("3D Viewer", "ar-vr-3d-model-try-on")}</strong> - {__("Shows the 3D model first with an image icon to reveal the product image.", "ar-vr-3d-model-try-on")}
            </p>
          </BorderCard>

          <BorderCard>
            <Label>{__("Show in Product Tabs", "ar-vr-3d-model-try-on")}</Label>
            <div className="art-flex art-items-center art-gap-3">
              <Switch
                label={s.ar_try_on_single_product_tabs === "yes" ? __("Yes", "ar-vr-3d-model-try-on") : __("No", "ar-vr-3d-model-try-on")}
                defaultChecked={s.ar_try_on_single_product_tabs === "yes"}
                onChange={(checked) => setSetting("ar_try_on_single_product_tabs", checked ? "yes" : "no")}
                color="blue"
              />
            </div>
            <Desc>{__("Toggle whether the AR Try-On feature appears in product tab sections.", "ar-vr-3d-model-try-on")}</Desc>
          </BorderCard>
        </>
      )}
    </>
  );
}
