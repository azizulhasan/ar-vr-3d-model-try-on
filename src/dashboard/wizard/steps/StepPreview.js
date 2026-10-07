import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import BorderCard from "../../components/dashboard/settings/BorderCard";
import { Desc } from "../ui";
import { resolvedModel, selectedItem } from "../model";

/**
 * The <model-viewer> element with the store-wide settings chosen in the
 * wizard. Shared by the Preview and Loading steps.
 */
export function WizardModelViewer({ model, settings, height = "420px" }) {
  const custom = settings.ar_try_on_ar_button === "activate";
  const modes = Array.isArray(settings.ar_try_on_ar_modes)
    ? settings.ar_try_on_ar_modes.join(" ")
    : "webxr scene-viewer quick-look";

  return (
    <model-viewer
      key={model.src}
      src={model.src}
      ios-src={model.ios_src || undefined}
      poster={model.poster || undefined}
      alt={model.alt || ""}
      camera-controls=""
      auto-rotate=""
      shadow-intensity="1"
      environment-image="neutral"
      tone-mapping="neutral"
      ar=""
      ar-modes={modes}
      interaction-prompt={settings.ar_try_on_interaction_prompt || "auto"}
      interaction-prompt-style={settings.ar_try_on_interaction_prompt_style || "wiggle"}
      style={{ width: "100%", height, backgroundColor: "#f3f4f6", borderRadius: "8px" }}
    >
      {custom && (
        <button
          slot="ar-button"
          style={{
            position: "absolute",
            right: "12px",
            bottom: "12px",
            padding: "8px 14px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: settings.ar_try_on_ar_button_background_color,
            color: settings.ar_try_on_ar_button_text_color,
          }}
        >
          {settings.ar_try_on_ar_button_text}
        </button>
      )}
    </model-viewer>
  );
}

/**
 * Step 3 — see the item the way shoppers will.
 */
export default function StepPreview({ state, data }) {
  const [revealed, setRevealed] = useState(false);
  const model = resolvedModel(state, data);
  const item = selectedItem(state, data);
  const s = state.settings;
  const lazy = s.model_load_strategy === "interaction" && !revealed;

  if (!model) {
    return (
      <BorderCard>
        <Desc>
          {state.modelSource === "ai"
            ? __("Generate the model in the editor tab first. After you finish setup, the item shows it like any other model.", "ar-vr-3d-model-try-on")
            : __("Choose a model in the previous step to see it here.", "ar-vr-3d-model-try-on")}
        </Desc>
      </BorderCard>
    );
  }

  return (
    <BorderCard
      title={item ? sprintf(/* translators: %s: item title */ __("%s — as shoppers see it", "ar-vr-3d-model-try-on"), item.title) : ""}
    >
      {lazy ? (
        <div
          className="art-flex art-flex-col art-items-center art-justify-center art-gap-3 art-rounded-lg"
          style={{ height: "420px", backgroundColor: "#f3f4f6" }}
        >
          {model.poster && <img src={model.poster} alt="" style={{ maxHeight: "260px" }} />}
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="art-px-6 art-py-3 art-rounded-md art-font-medium art-text-white art-bg-blue-500 hover:art-bg-blue-600 art-border-none art-cursor-pointer"
          >
            {__("View in 3D", "ar-vr-3d-model-try-on")}
          </button>
          <span className="art-text-xs art-text-gray-500">
            {__("On interaction: the 3D viewer downloads only after this click.", "ar-vr-3d-model-try-on")}
          </span>
        </div>
      ) : (
        <WizardModelViewer model={model} settings={s} />
      )}
      <Desc>
        {__("Drag to rotate. On a phone, the AR button places the item in the room (Scene Viewer on Android, Quick Look on iPhone).", "ar-vr-3d-model-try-on")}
      </Desc>
    </BorderCard>
  );
}
