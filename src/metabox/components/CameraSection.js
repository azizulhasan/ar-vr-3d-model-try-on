// components/ARSettings/CameraSection.js
import React from "react";
import AccordionIcon from "../../icons/AccordionIcon";

const CameraSection = ({
  productModel,
  handleChange,
  activeAccordion,
  toggleAccordion
}) => {
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion('camera')}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Camera
          <AccordionIcon status={activeAccordion.camera} />
        </span>
      </button>

      {activeAccordion.camera && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t art-space-y-4">
          {/* Auto Rotate Toggle */}
          <div className="art-flex art-items-center">
            <label className="art-relative art-inline-flex art-items-center art-cursor-pointer">
              <input
                type="checkbox"
                name="auto_rotate"
                checked={productModel.auto_rotate}
                onChange={handleChange}
              />
            </label>
            <span className="art-text-sm art-font-medium">Auto Rotate</span>
          </div>

          {/* Shadow Intensity */}
          <div>
            <label className="art-block art-text-sm art-font-medium art-mb-2 art-uppercase art-tracking-wide">
              Shadow Intensity
            </label>
            <input
              type="number"
              name="shadow_intensity"
              value={productModel.shadow_intensity}
              onChange={handleChange}
              min="0"
              max="1"
              step="0.1"
              placeholder="1"
              className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
            />
            <p className="art-text-xs art-text-gray-500 art-mt-1">
              Controls the opacity of the shadow. Set to 0 to turn off the shadow entirely. Any value between 0 and 1
            </p>
          </div>

          {/* Camera Orbit */}
          <div>
            <label className="art-block art-text-sm art-font-medium art-mb-2 art-uppercase art-tracking-wide">
              Camera Orbit
            </label>
            <input
              type="text"
              name="camera_orbit"
              value={productModel.camera_orbit}
              onChange={handleChange}
              placeholder="45deg 55deg 4m"
              className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
            />
            <p className="art-text-xs art-text-gray-500 art-mt-1">
              The camera orbit.
            </p>
          </div>

          {/* Disable Zoom Toggle */}
          <div className="art-flex art-items-start">
            <label className="art-relative art-items-center art-cursor-pointer art-mt-1">
              <input
                type="checkbox"
                name="disable_zoom"
                checked={productModel.disable_zoom}
                onChange={handleChange}
              />
            </label>
            <div>
              <span className="art-text-sm art-font-medium art-block">Disable Zoom</span>
              <p className="art-text-xs art-text-gray-500 art-mt-1">
                Disable zooming in and out of the model.
              </p>
            </div>
          </div>

          {/* Disable Tap Toggle */}
          <div className="art-flex art-items-start">
            <label className="art-relative art-items-center art-cursor-pointer art-mt-1">
              <input
                type="checkbox"
                name="disable_tap"
                checked={productModel.disable_tap}
                onChange={handleChange}
              />
            </label>
            <div>
              <span className="art-text-sm art-font-medium art-block">Disable Tap</span>
              <p className="art-text-xs art-text-gray-500 art-mt-1">
                Disable tap to rotate the model.
              </p>
            </div>
          </div>

          {/* AR-61: 360° Rotation Hint (per-product override).
              Empty `interaction_prompt` → falls back to the global
              setting in `Settings > General > 360° Rotation Hint`.
              `auto` / `none` / `when-focused` map directly to
              model-viewer's `interaction-prompt` attribute. */}
          <div className="art-border-t art-pt-3 art-mt-3">
            <label className="art-block art-text-sm art-font-medium art-mb-2 art-uppercase art-tracking-wide">
              360° Rotation Hint
            </label>
            <p className="art-text-xs art-text-gray-500 art-mb-3">
              Shows a visible drag-to-rotate cue so shoppers discover
              that this model is rotatable. Leave any field blank to
              inherit the global setting.
            </p>

            <div className="art-grid art-grid-cols-1 art-gap-3">
              <div>
                <label className="art-block art-text-xs art-font-medium art-mb-1">
                  Mode
                </label>
                <select
                  name="interaction_prompt"
                  value={productModel.interaction_prompt || ""}
                  onChange={handleChange}
                  className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
                >
                  <option value="">Use global setting</option>
                  <option value="auto">Auto — show after idle</option>
                  <option value="when-focused">When focused</option>
                  <option value="none">Off — no hint</option>
                </select>
              </div>

              <div>
                <label className="art-block art-text-xs art-font-medium art-mb-1">
                  Style
                </label>
                <select
                  name="interaction_prompt_style"
                  value={productModel.interaction_prompt_style || ""}
                  onChange={handleChange}
                  disabled={productModel.interaction_prompt === "none"}
                  className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded disabled:art-opacity-50"
                >
                  <option value="">Use global setting</option>
                  <option value="wiggle">Wiggle — model rotates back-and-forth</option>
                  <option value="basic">Basic — hand-pointer icon</option>
                </select>
              </div>

              <div>
                <label className="art-block art-text-xs art-font-medium art-mb-1">
                  Idle Delay
                </label>
                <select
                  name="interaction_prompt_threshold"
                  value={
                    productModel.interaction_prompt_threshold !== undefined
                      ? String(productModel.interaction_prompt_threshold)
                      : ""
                  }
                  onChange={handleChange}
                  disabled={productModel.interaction_prompt === "none"}
                  className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded disabled:art-opacity-50"
                >
                  <option value="">Use global setting</option>
                  <option value="0">Immediate</option>
                  <option value="1000">1 second</option>
                  <option value="2000">2 seconds</option>
                  <option value="3000">3 seconds</option>
                  <option value="5000">5 seconds</option>
                  <option value="8000">8 seconds</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraSection;