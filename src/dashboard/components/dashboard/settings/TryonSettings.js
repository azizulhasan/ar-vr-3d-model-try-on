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
 *
 * IMPORTANT: the Switch component reads `defaultChecked` (not
 * `checked`) and emits the new boolean state via onChange(checked).
 * We forward that to handleChange in the same shape Settings.js does
 * for `ar_try_on_enable_qr_code` etc.
 */
export default function TryonSettings({ settings, handleChange }) {
  const onToggle = (key) => (checked) =>
    handleChange({ target: { name: key, value: checked } });

  const onText = (key) => (e) =>
    handleChange({ target: { name: key, value: e.target.value } });

  return (
    <BorderCard>
      <div className="art-mb-3">
        <strong className="art-block art-text-base">AtlasTryOn</strong>
        <span className="art-block art-text-xs art-text-gray-500">
          Face-glasses / face-hat AR via webcam (per-product opt-in via
          <code> ar_placement</code>).
        </span>
      </div>

      <div className="art-mb-4">
        <label className="art-block art-font-medium art-text-base art-mb-1">
          Self-host MediaPipe weights
        </label>
        <Switch
          label={settings.tryon_self_host ? "Enabled" : "Disabled"}
          defaultChecked={!!settings.tryon_self_host}
          onChange={onToggle("tryon_self_host")}
          color="blue"
        />
        <span className="art-block art-text-xs art-text-gray-500 art-mt-1">
          Default OFF — load Face Landmarker model from CDN. Toggle ON if your
          store ships its own copy in <code>public/models/</code>.
        </span>
      </div>

      <div className="art-mb-4">
        <label className="art-block art-font-medium art-text-base art-mb-1">
          Allow Snapshot
        </label>
        <Switch
          label={settings.tryon_snapshot ? "Enabled" : "Disabled"}
          defaultChecked={!!settings.tryon_snapshot}
          onChange={onToggle("tryon_snapshot")}
          color="blue"
        />
        <span className="art-block art-text-xs art-text-gray-500 art-mt-1">
          Snapshot button in the Try-On modal. Adult / restricted stores may
          want OFF.
        </span>
      </div>

      <div className="art-mb-4">
        <label
          htmlFor="tryon_button_label"
          className="art-block art-font-medium art-text-base art-mb-1"
        >
          Button label
        </label>
        <input
          id="tryon_button_label"
          type="text"
          className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
          value={settings.tryon_button_label || ""}
          onChange={onText("tryon_button_label")}
          placeholder="Try it on"
        />
      </div>

      <div className="art-mb-2">
        <label
          htmlFor="tryon_consent_text"
          className="art-block art-font-medium art-text-base art-mb-1"
        >
          Consent text
        </label>
        <textarea
          id="tryon_consent_text"
          className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
          rows={3}
          value={settings.tryon_consent_text || ""}
          onChange={onText("tryon_consent_text")}
          placeholder="Allow camera access to try this product on virtually. Video stays on your device."
        />
      </div>

      <p className="art-text-xs art-text-gray-500 art-mt-3">
        Per-product settings (placement, mode, calibration) are configured on
        each product's edit page and via the front-end live calibration panel
        (Pro).
      </p>
    </BorderCard>
  );
}
