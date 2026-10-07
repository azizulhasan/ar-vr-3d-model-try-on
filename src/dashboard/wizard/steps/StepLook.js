import { __ } from "@wordpress/i18n";
import BorderCard from "../../components/dashboard/settings/BorderCard";
import Switch from "../../components/dashboard/settings/Switch";
import Radio from "../../components/dashboard/settings/Radio";
import { Label, Desc } from "../../ui";
import { resolvedModel } from "../model";
import { WizardModelViewer } from "./StepPreview";

const inputStyle = {
  backgroundColor: "var(--theme-bg)",
  color: "var(--theme-text)",
  borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
};

/**
 * Step 4 — page speed and the AR button. Same fields and wording as
 * Settings → General.
 */
export default function StepLook({ state, setSetting, data }) {
  const s = state.settings;
  const model = resolvedModel(state, data);
  const keptAuto =
    data.free_state === "legacy" && data.settings.model_load_strategy === "auto";

  return (
    <>
      <BorderCard>
        <Label>{__("3D Viewer Library Loading", "ar-vr-3d-model-try-on")}</Label>
        <div className="art-flex art-flex-wrap art-gap-6">
          <Radio
            id="atlas_ar_wz_load_auto"
            name="model_load_strategy"
            value="auto"
            checked={s.model_load_strategy === "auto"}
            label={__("Automatic", "ar-vr-3d-model-try-on")}
            onChange={() => setSetting("model_load_strategy", "auto")}
          />
          <Radio
            id="atlas_ar_wz_load_interaction"
            name="model_load_strategy"
            value="interaction"
            checked={s.model_load_strategy === "interaction"}
            label={__("On interaction", "ar-vr-3d-model-try-on")}
            onChange={() => setSetting("model_load_strategy", "interaction")}
          />
        </div>
        <p className="art-text-sm art-text-gray-400 art-leading-snug">
          {__("Controls when the ~1 MB 3D viewer library is downloaded:", "ar-vr-3d-model-try-on")}
          <br />
          <strong>{__("Automatic", "ar-vr-3d-model-try-on")}</strong> — {__("the 3D viewer loads with the page (current behavior).", "ar-vr-3d-model-try-on")}
          <br />
          <strong>{__("On interaction", "ar-vr-3d-model-try-on")}</strong> — {__("the product image shows first and the 3D viewer downloads only when the shopper clicks “View in 3D”, improving initial page speed.", "ar-vr-3d-model-try-on")}
          <br />
          {__("This can be overridden per product in the product’s AR settings.", "ar-vr-3d-model-try-on")}
        </p>
        {keptAuto && (
          <p className="art-text-sm art-rounded art-p-3 art-bg-blue-50 art-text-gray-700">
            {__("Your site uses Automatic today, so we kept it. Switch only if you want faster pages.", "ar-vr-3d-model-try-on")}
          </p>
        )}
      </BorderCard>

      <BorderCard>
        <Label>{__("Custom AR Button", "ar-vr-3d-model-try-on")}</Label>
        <Switch
          label={s.ar_try_on_ar_button === "activate" ? __("Activated", "ar-vr-3d-model-try-on") : __("Deactivated", "ar-vr-3d-model-try-on")}
          defaultChecked={s.ar_try_on_ar_button === "activate"}
          onChange={(checked) => setSetting("ar_try_on_ar_button", checked ? "activate" : "deactivate")}
          color="blue"
        />
        <Desc>{__("Replace the default “Enter AR” icon in the lower right of the viewer with your own button.", "ar-vr-3d-model-try-on")}</Desc>
        {s.ar_try_on_ar_button === "activate" && (
          <div className="art-mt-4 art-border-t art-pt-4">
            <div className="art-flex art-flex-wrap art-items-start art-gap-6">
              <div className="art-space-y-2">
                <label htmlFor="atlas_ar_wz_btn_text" className="art-font-medium">{__("Button Text", "ar-vr-3d-model-try-on")}</label>
                <input
                  type="text"
                  id="atlas_ar_wz_btn_text"
                  className="art-block art-p-2 art-border art-rounded"
                  style={inputStyle}
                  value={s.ar_try_on_ar_button_text || ""}
                  onChange={(e) => setSetting("ar_try_on_ar_button_text", e.target.value)}
                />
              </div>
              <div className="art-space-y-2">
                <label htmlFor="atlas_ar_wz_btn_bg" className="art-font-medium">{__("Button Background Color", "ar-vr-3d-model-try-on")}</label>
                <input
                  type="color"
                  id="atlas_ar_wz_btn_bg"
                  className="art-block art-p-2 art-rounded-md art-cursor-pointer art-border"
                  value={s.ar_try_on_ar_button_background_color || "#3a3a3a"}
                  onChange={(e) => setSetting("ar_try_on_ar_button_background_color", e.target.value)}
                />
              </div>
              <div className="art-space-y-2">
                <label htmlFor="atlas_ar_wz_btn_fg" className="art-font-medium">{__("Button Text Color", "ar-vr-3d-model-try-on")}</label>
                <input
                  type="color"
                  id="atlas_ar_wz_btn_fg"
                  className="art-block art-p-2 art-rounded-md art-cursor-pointer art-border"
                  value={s.ar_try_on_ar_button_text_color || "#ffffff"}
                  onChange={(e) => setSetting("ar_try_on_ar_button_text_color", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        {s.ar_try_on_ar_button === "activate" && (
          <div className="art-flex art-items-center art-gap-3 art-pt-2">
            <span
              style={{
                padding: "8px 14px",
                borderRadius: "4px",
                backgroundColor: s.ar_try_on_ar_button_background_color,
                color: s.ar_try_on_ar_button_text_color,
              }}
            >
              {s.ar_try_on_ar_button_text}
            </span>
            <span className="art-text-sm art-text-gray-400">
              {__("Shown on phones and tablets that support AR.", "ar-vr-3d-model-try-on")}
            </span>
          </div>
        )}
        {model && (
          <div className="art-pt-2" style={{ maxWidth: "560px" }}>
            <WizardModelViewer model={model} settings={s} height="260px" />
          </div>
        )}
      </BorderCard>

      <BorderCard>
        <Label>{__("Enable QR Code", "ar-vr-3d-model-try-on")}</Label>
        <Switch
          label={s.ar_try_on_enable_qr_code === "yes" ? __("Enabled", "ar-vr-3d-model-try-on") : __("Disabled", "ar-vr-3d-model-try-on")}
          defaultChecked={s.ar_try_on_enable_qr_code === "yes"}
          onChange={(checked) => setSetting("ar_try_on_enable_qr_code", checked ? "yes" : "no")}
          color="blue"
        />
        <Desc>{__("Desktop shoppers scan the QR code to open AR on their phone.", "ar-vr-3d-model-try-on")}</Desc>
      </BorderCard>

      <BorderCard>
        <Label htmlFor="atlas_ar_wz_prompt">{__("Interaction prompt", "ar-vr-3d-model-try-on")}</Label>
        <select
          id="atlas_ar_wz_prompt"
          className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm"
          style={inputStyle}
          value={s.ar_try_on_interaction_prompt || "auto"}
          onChange={(e) => setSetting("ar_try_on_interaction_prompt", e.target.value)}
        >
          <option value="auto">{__("Auto — show after idle", "ar-vr-3d-model-try-on")}</option>
          <option value="when-focused">{__("When focused — only after keyboard focus", "ar-vr-3d-model-try-on")}</option>
          <option value="none">{__("Off — no hint", "ar-vr-3d-model-try-on")}</option>
        </select>
        {s.ar_try_on_interaction_prompt !== "none" && (
          <div className="art-flex art-flex-wrap art-gap-6 art-pt-2">
            <Radio
              id="atlas_ar_wz_style_wiggle"
              name="ar_try_on_interaction_prompt_style"
              value="wiggle"
              checked={(s.ar_try_on_interaction_prompt_style || "wiggle") === "wiggle"}
              label={__("Wiggle", "ar-vr-3d-model-try-on")}
              onChange={() => setSetting("ar_try_on_interaction_prompt_style", "wiggle")}
            />
            <Radio
              id="atlas_ar_wz_style_basic"
              name="ar_try_on_interaction_prompt_style"
              value="basic"
              checked={s.ar_try_on_interaction_prompt_style === "basic"}
              label={__("Basic", "ar-vr-3d-model-try-on")}
              onChange={() => setSetting("ar_try_on_interaction_prompt_style", "basic")}
            />
          </div>
        )}
        <Desc>{__("A short hint that tells shoppers they can rotate the model.", "ar-vr-3d-model-try-on")}</Desc>
      </BorderCard>
    </>
  );
}
