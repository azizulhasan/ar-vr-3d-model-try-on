import { __, sprintf } from "@wordpress/i18n";
import BorderCard from "../../components/dashboard/settings/BorderCard";
import Radio from "../../components/dashboard/settings/Radio";
import { Label, Desc } from "../ui";
import { itemsFor, selectedItem } from "../model";

/**
 * Step 2 — put a first 3D model on one item.
 */
export default function StepModel({ state, update, data }) {
  const items = itemsFor(data, state.postType);
  const item = selectedItem(state, data);

  const openLibrary = (e) => {
    e.preventDefault();
    if (!window.wp || !wp.media) {
      return;
    }
    const frame = wp.media({
      title: __("Choose a 3D model (.glb, .gltf or .usdz)", "ar-vr-3d-model-try-on"),
      button: { text: __("Use this model", "ar-vr-3d-model-try-on") },
      multiple: false,
    });
    frame.on("select", () => {
      const file = frame.state().get("selection").first().toJSON();
      const url = file.url || "";
      const ext = url.split("?")[0].split(".").pop().toLowerCase();
      if (!["glb", "gltf", "usdz"].includes(ext)) {
        update({ libraryError: __("Please choose a .glb, .gltf or .usdz file.", "ar-vr-3d-model-try-on") });
        return;
      }
      const current = state.libraryModel || {};
      const model =
        ext === "usdz"
          ? { ...current, ios_src: url }
          : { ...current, src: url, poster: current.poster || "", alt: file.title || "" };
      update({ libraryModel: model, libraryError: "" });
    });
    frame.open();
  };

  const fileName = (url) => (url ? url.split("/").pop() : "");

  return (
    <>
      <BorderCard>
        <Label htmlFor="atlas_ar_wizard_item">
          {sprintf(
            /* translators: %s: post type name, e.g. "product" */
            __("Pick one %s to try AtlasAR on", "ar-vr-3d-model-try-on"),
            state.postType
          )}
        </Label>
        {items.length ? (
          <select
            id="atlas_ar_wizard_item"
            className="art-block art-w-full art-p-2 art-rounded-lg art-border art-text-sm"
            style={{
              backgroundColor: "var(--theme-bg)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-border, rgba(100,116,139,0.4))",
            }}
            value={state.productId || ""}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10) || 0;
              const next = items.find((p) => p.id === id);
              update({
                productId: id,
                modelSource: next && next.has_model ? "current" : "sample",
                tryonMode: "keep",
              });
            }}
          >
            {items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || `#${p.id}`}
                {p.has_model ? " — " + __("has a 3D model", "ar-vr-3d-model-try-on") : ""}
              </option>
            ))}
          </select>
        ) : (
          <Desc>
            {sprintf(
              /* translators: %s: post type name */
              __("There is no published %s yet. You can finish setup now and add a model from the editor later.", "ar-vr-3d-model-try-on"),
              state.postType
            )}
          </Desc>
        )}
        <Desc>{__("You can add models to other items later from their edit page.", "ar-vr-3d-model-try-on")}</Desc>
      </BorderCard>

      {item && (
        <BorderCard>
          <Label>{__("Where does the model come from?", "ar-vr-3d-model-try-on")}</Label>
          <div className="art-flex art-flex-wrap art-gap-6">
            {item.has_model && (
              <Radio
                id="atlas_ar_src_current"
                name="atlas_ar_model_source"
                value="current"
                checked={state.modelSource === "current"}
                label={__("Keep its current model", "ar-vr-3d-model-try-on")}
                onChange={() => update({ modelSource: "current" })}
              />
            )}
            <Radio
              id="atlas_ar_src_sample"
              name="atlas_ar_model_source"
              value="sample"
              checked={state.modelSource === "sample"}
              label={__("Use the sample model", "ar-vr-3d-model-try-on")}
              onChange={() => update({ modelSource: "sample" })}
            />
            <Radio
              id="atlas_ar_src_library"
              name="atlas_ar_model_source"
              value="library"
              checked={state.modelSource === "library"}
              label={__("Upload or choose my own file", "ar-vr-3d-model-try-on")}
              onChange={() => update({ modelSource: "library" })}
            />
            <Radio
              id="atlas_ar_src_ai"
              name="atlas_ar_model_source"
              value="ai"
              checked={state.modelSource === "ai"}
              label={__("Generate with AI", "ar-vr-3d-model-try-on")}
              onChange={() => update({ modelSource: "ai" })}
            />
          </div>

          {state.modelSource === "sample" && (
            <Desc>{__("A sample astronaut model, so you can see AtlasAR working right away. Replace it with your own model whenever you are ready.", "ar-vr-3d-model-try-on")}</Desc>
          )}

          {state.modelSource === "library" && (
            <div className="art-space-y-2">
              <button
                type="button"
                onClick={openLibrary}
                className="art-px-4 art-py-2 art-rounded art-bg-blue-500 art-text-white art-border-none art-cursor-pointer"
              >
                {__("Choose from Media Library", "ar-vr-3d-model-try-on")}
              </button>
              {state.libraryModel && state.libraryModel.src && (
                <p className="art-text-sm">{__("Model:", "ar-vr-3d-model-try-on")} <strong>{fileName(state.libraryModel.src)}</strong></p>
              )}
              {state.libraryModel && state.libraryModel.ios_src && (
                <p className="art-text-sm">{__("iOS model:", "ar-vr-3d-model-try-on")} <strong>{fileName(state.libraryModel.ios_src)}</strong></p>
              )}
              {state.libraryError && <p className="art-text-sm art-text-red-600">{state.libraryError}</p>}
              <Desc>{__("Supported File type .glb, .gltf, and .usdz for iPhone. Choose a .usdz as well if you want AR on iPhone to use its own file.", "ar-vr-3d-model-try-on")}</Desc>
            </div>
          )}

          {state.modelSource === "ai" && (
            <div className="art-space-y-2">
              <Desc>{__("Tripo3D and Meshy AI generation runs from the AtlasAR box on the edit page, with your own API key. Open it in a new tab, generate, then come back and continue.", "ar-vr-3d-model-try-on")}</Desc>
              <a
                href={item.edit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="art-inline-block art-px-4 art-py-2 art-rounded art-bg-blue-500 art-text-white art-no-underline hover:art-text-white"
              >
                {__("Open the editor in a new tab", "ar-vr-3d-model-try-on")}
              </a>
            </div>
          )}
        </BorderCard>
      )}
    </>
  );
}
