import { __, sprintf } from "@wordpress/i18n";
import BorderCard from "../../components/dashboard/settings/BorderCard";
import Switch from "../../components/dashboard/settings/Switch";
import Radio from "../../components/dashboard/settings/Radio";
import { Label, Desc } from "../ui";
import { selectedItem } from "../model";

/**
 * Step 6 — AtlasTryOn (optional). Same fields as Settings → AtlasTryOn,
 * plus a switch to use try-on on the item picked in step 2.
 */
export default function StepTryOn({ state, update, setSetting, data }) {
  const s = state.settings;
  const item = selectedItem(state, data);
  const current = item ? item.ar_placement : "floor";
  const effective = state.tryonMode === "keep" ? current : state.tryonMode;
  const isFace = (p) => p === "face-glasses" || p === "face-hat";

  const choose = (mode) => {
    if (mode === "none") {
      // Leave non-face placements (floor / wall) as they are.
      update({ tryonMode: isFace(current) ? "floor" : "keep" });
      return;
    }
    update({ tryonMode: mode === current ? "keep" : mode });
  };

  return (
    <>
      {item && (
        <BorderCard>
          <Label>
            {sprintf(
              /* translators: %s: item title */
              __("Virtual try-on for %s", "ar-vr-3d-model-try-on"),
              item.title
            )}
          </Label>
          <div className="art-flex art-flex-wrap art-gap-6">
            <Radio
              id="atlas_ar_wz_tryon_none"
              name="atlas_ar_wz_tryon"
              value="none"
              checked={!isFace(effective)}
              label={__("No try-on (3D and AR only)", "ar-vr-3d-model-try-on")}
              onChange={() => choose("none")}
            />
            <Radio
              id="atlas_ar_wz_tryon_glasses"
              name="atlas_ar_wz_tryon"
              value="face-glasses"
              checked={effective === "face-glasses"}
              label={__("Glasses", "ar-vr-3d-model-try-on")}
              onChange={() => choose("face-glasses")}
            />
            <Radio
              id="atlas_ar_wz_tryon_hat"
              name="atlas_ar_wz_tryon"
              value="face-hat"
              checked={effective === "face-hat"}
              label={__("Hats and caps", "ar-vr-3d-model-try-on")}
              onChange={() => choose("face-hat")}
            />
          </div>
          <Desc>
            {__("Shoppers see the item on their own face through the webcam. The camera starts only when they tap the button, and the video stays on their device. Use a glasses or hat model for this.", "ar-vr-3d-model-try-on")}
          </Desc>
          {isFace(effective) && state.modelSource === "sample" && (
            <p className="art-text-sm art-rounded art-p-3 art-bg-blue-50 art-text-gray-700">
              {__("The sample model is not glasses or a hat. Choose your own model in step 2 to try this properly.", "ar-vr-3d-model-try-on")}
            </p>
          )}
        </BorderCard>
      )}

      <BorderCard>
        <div className="art-mb-3">
          <strong className="art-block art-text-base">AtlasTryOn</strong>
          <span className="art-block art-text-xs art-text-gray-500">
            {__("Settings for every try-on item.", "ar-vr-3d-model-try-on")}
          </span>
        </div>
        <div className="art-mb-4">
          <label className="art-block art-font-medium art-text-base art-mb-1">{__("Allow Snapshot", "ar-vr-3d-model-try-on")}</label>
          <Switch
            label={s.tryon_snapshot ? __("Enabled", "ar-vr-3d-model-try-on") : __("Disabled", "ar-vr-3d-model-try-on")}
            defaultChecked={!!s.tryon_snapshot}
            onChange={(checked) => setSetting("tryon_snapshot", checked)}
            color="blue"
          />
          <span className="art-block art-text-xs art-text-gray-500 art-mt-1">
            {__("Snapshot button in the Try-On modal.", "ar-vr-3d-model-try-on")}
          </span>
        </div>
        <div className="art-mb-2">
          <label htmlFor="atlas_ar_wz_tryon_label" className="art-block art-font-medium art-text-base art-mb-1">
            {__("Button label", "ar-vr-3d-model-try-on")}
          </label>
          <input
            id="atlas_ar_wz_tryon_label"
            type="text"
            className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
            value={s.tryon_button_label || ""}
            onChange={(e) => setSetting("tryon_button_label", e.target.value)}
            placeholder={__("Try it on", "ar-vr-3d-model-try-on")}
          />
        </div>
      </BorderCard>
    </>
  );
}
