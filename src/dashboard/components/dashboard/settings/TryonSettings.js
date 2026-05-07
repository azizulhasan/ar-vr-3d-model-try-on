import React from "react";
import BorderCard from "./BorderCard";
import Switch from "./Switch";

/**
 * Virtual Try-On — global settings card.
 *
 * Surfaces the `tryon_*` keys stored inside the shared
 * `ar_try_on_settings` option. Same `handleChange` pipeline used by
 * the rest of the dashboard so values persist via the existing
 * /settings REST endpoint.
 */
export default function TryonSettings({ settings, handleChange }) {
  const onToggle = (key) => () => {
    handleChange(
      { target: { name: key, value: !settings[key] } },
      key
    );
  };

  const onText = (key) => (e) => {
    handleChange(
      { target: { name: key, value: e.target.value } },
      key
    );
  };

  return (
    <BorderCard
      title="Virtual Try-On"
      description="Face-glasses / face-hat AR via webcam (per-product opt-in via `ar_placement`)."
    >
      <div className="art-grid art-grid-cols-1 md:art-grid-cols-2 art-gap-4">
        <Switch
          label="Self-host MediaPipe weights"
          description="Default OFF — load Face Landmarker model from CDN. Toggle ON if your store ships its own copy in `public/models/`."
          checked={!!settings.tryon_self_host}
          onChange={onToggle("tryon_self_host")}
        />
        <Switch
          label="Allow snapshots"
          description="Snapshot button in the try-on modal. Adult / restricted stores may want OFF."
          checked={!!settings.tryon_snapshot}
          onChange={onToggle("tryon_snapshot")}
        />
      </div>

      <div className="art-mt-4 art-grid art-grid-cols-1 md:art-grid-cols-2 art-gap-4">
        <label className="art-block">
          <span className="art-block art-text-sm art-font-medium art-mb-1">
            Button label
          </span>
          <input
            type="text"
            className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
            value={settings.tryon_button_label || ""}
            onChange={onText("tryon_button_label")}
            placeholder="Try it on"
          />
        </label>

        <label className="art-block">
          <span className="art-block art-text-sm art-font-medium art-mb-1">
            Consent text
          </span>
          <textarea
            className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
            rows={3}
            value={settings.tryon_consent_text || ""}
            onChange={onText("tryon_consent_text")}
            placeholder="Allow camera access to try this product on virtually. Video stays on your device."
          />
        </label>
      </div>

      <p className="art-text-xs art-text-gray-500 art-mt-3">
        Per-product settings (placement, mode, calibration) are configured on
        each product's edit page and via the front-end live calibration panel
        (Pro).
      </p>
    </BorderCard>
  );
}
