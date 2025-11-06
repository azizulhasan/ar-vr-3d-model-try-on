import { useEffect, useCallback } from "react";
import AccordionIcon from "../../icons/AccordionIcon";
import "../../icons/hotspots.css";

const HotspotsSection = ({
  productModel,
  setProductModel,
  activeAccordion,
  toggleAccordion,
}) => {
  // ---------- Render Hotspots into <model-viewer> ----------
  const renderHotspots = useCallback(() => {
    const modelViewer = document.querySelector(".atlas_ar_model_viewer");
    if (!modelViewer) return;

    // Remove existing
    modelViewer.querySelectorAll(".hotspot").forEach((h) => h.remove());

    // Append current hotspots
    (productModel.hotspots || []).forEach((hotspot) => {
      const button = document.createElement("button");
      button.className = "hotspot";
      if (hotspot.slot) button.setAttribute("slot", hotspot.slot);
      if (hotspot.dataPosition) button.setAttribute("data-position", hotspot.dataPosition);
      if (hotspot.dataNormal) button.setAttribute("data-normal", hotspot.dataNormal);
      if (hotspot.dataVisibilityAttribute) {
        button.setAttribute("data-visibility-attribute", hotspot.dataVisibilityAttribute);
      }
      if (hotspot.annotation) {
        const div = document.createElement("div");
        div.className = "annotation";
        div.innerText = hotspot.annotation;
        button.appendChild(div);
      }
      modelViewer.appendChild(button);
    });
  }, [productModel.hotspots]);

  // Re-render hotspots whenever hotspots change
  useEffect(() => {
    renderHotspots();
  }, [productModel.hotspots, renderHotspots]);

  // ---------- Utilities ----------
  const safeAddHotspot = (hotspotObj) => {
    setProductModel((prev) => {
      const prevHotspots = Array.isArray(prev.hotspots) ? prev.hotspots : [];
      return { ...prev, hotspots: [...prevHotspots, hotspotObj] };
    });
  };

  // Try to call positionAndNormalFromPoint using different param spaces
  const pickPositionAndNormal = (modelViewer, clientX, clientY, pageX, pageY) => {
    try {
      // preferred: element-local coordinates
      const rect = modelViewer.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      if (typeof modelViewer.positionAndNormalFromPoint === "function") {
        const hitLocal = modelViewer.positionAndNormalFromPoint(localX, localY);
        if (hitLocal) return hitLocal;
      }
    } catch (e) {
      // ignore
    }

    try {
      // sometimes model-viewer expects page coords — try both
      if (typeof modelViewer.positionAndNormalFromPoint === "function") {
        const tryClient = modelViewer.positionAndNormalFromPoint(clientX, clientY);
        if (tryClient) return tryClient;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (typeof modelViewer.positionAndNormalFromPoint === "function") {
        const tryPage = modelViewer.positionAndNormalFromPoint(pageX, pageY);
        if (tryPage) return tryPage;
      }
    } catch (e) {
      // ignore
    }

    return null;
  };

  // ---------- Click / pointer handler (robust) ----------
  useEffect(() => {
    let mv = document.querySelector(".atlas_ar_model_viewer");
    if (!mv) {
      // if not present yet, keep an interval to wait for it
      const waitInterval = setInterval(() => {
        mv = document.querySelector(".atlas_ar_model_viewer");
        if (mv) {
          clearInterval(waitInterval);
          // render and attach listeners below by re-running effect (we don't re-run automatically here,
          // so manually call initialization)
          renderHotspots();
        }
      }, 400);
      return () => clearInterval(waitInterval);
    }

    // Ensure hotspots rendered on load/scene ready
    const onLoad = () => {
      console.debug("[Hotspots] model-viewer 'load' fired — rendering hotspots");
      renderHotspots();
    };
    const onSceneReady = () => {
      console.debug("[Hotspots] model-viewer 'scene-graph-ready' fired — rendering hotspots");
      renderHotspots();
    };

    mv.addEventListener("load", onLoad);
    mv.addEventListener("scene-graph-ready", onSceneReady);

    // Pointerdown on document (capture) to ensure we catch clicks even if shadow DOM/overlay present
    const onPointerDown = (ev) => {
      // Only react to primary button
      if (ev.button && ev.button !== 0) return;

      // Use composedPath to detect model-viewer in path (works through shadow DOM)
      const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
      const clickedModelViewer = path.find((el) => {
        return el && el.tagName && el.tagName.toLowerCase() === "model-viewer";
      });

      if (!clickedModelViewer && !(ev.target && ev.target.closest && ev.target.closest("model-viewer"))) {
        // click wasn't on any model-viewer
        return;
      }

      // identify the model-viewer element we should query against
      const targetMV = clickedModelViewer || document.querySelector(".atlas_ar_model_viewer");
      if (!targetMV) return;

      // ensure method present
      if (typeof targetMV.positionAndNormalFromPoint !== "function") {
        console.warn("[Hotspots] positionAndNormalFromPoint not available yet on this model-viewer.");
        return;
      }

      // compute coordinates
      const clientX = ev.clientX;
      const clientY = ev.clientY;
      const pageX = ev.pageX;
      const pageY = ev.pageY;

      const hit = pickPositionAndNormal(targetMV, clientX, clientY, pageX, pageY);
      if (!hit) {
        console.debug("[Hotspots] no hit from positionAndNormalFromPoint at", clientX, clientY);
        return;
      }

      // got a hit -> add hotspot
      const { position, normal } = hit;
      const dataPosition = `${position.x.toFixed(4)} ${position.y.toFixed(4)} ${position.z.toFixed(4)}`;
      const dataNormal = `${normal.x.toFixed(4)} ${normal.y.toFixed(4)} ${normal.z.toFixed(4)}`;

      console.info("[Hotspots] adding hotspot at", dataPosition, "normal", dataNormal);

      safeAddHotspot({
        slot: `hotspot-${Date.now()}`,
        dataPosition,
        dataNormal,
        annotation: "New hotspot",
      });

      // Prevent any further handling if desired:
      // ev.stopPropagation();
      // ev.preventDefault();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true });

    // cleanup
    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("scene-graph-ready", onSceneReady);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [renderHotspots, setProductModel]);

  // ---------- CRUD helpers ----------
  const updateHotspotField = (index, field, value) => {
    const updated = [...(productModel.hotspots || [])];
    updated[index] = { ...updated[index], [field]: value };
    setProductModel((prev) => ({ ...prev, hotspots: updated }));
  };

  const removeHotspot = (index) => {
    setProductModel((prev) => ({
      ...prev,
      hotspots: (prev.hotspots || []).filter((_, i) => i !== index),
    }));
  };

  // ---------- JSX (accordion kept identical to your original) ----------
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion("hotspots")}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span>Hotspots</span>
        <AccordionIcon status={activeAccordion.hotspots} />
      </button>

      {activeAccordion.hotspots && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t">
          <div className="art-flex art-items-center art-justify-between art-mb-4">
            <h3 className="art-font-semibold art-text-lg art-text-slate-800">
              Manage Hotspots
            </h3>
            <p className="art-text-xs art-text-gray-500">
              💡 Click directly on the 3D model preview to place hotspots.
            </p>
          </div>

          <div className="art-space-y-4">
            {(productModel.hotspots || []).length > 0 ? (
              (productModel.hotspots || []).map((hotspot, index) => (
                <div
                  key={index}
                  className="art-border art-rounded art-p-3 art-bg-gray-50 art-relative art-shadow-sm"
                >
                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-28">Slot Name:</label>
                    <input
                      type="text"
                      className="art-border art-rounded art-px-2 art-py-1 art-w-full"
                      value={hotspot.slot || ""}
                      onChange={(e) => updateHotspotField(index, "slot", e.target.value)}
                    />
                  </div>

                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-28">Data Position:</label>
                    <input
                      type="text"
                      className="art-border art-rounded art-px-2 art-py-1 art-w-full"
                      value={hotspot.dataPosition || ""}
                      onChange={(e) => updateHotspotField(index, "dataPosition", e.target.value)}
                    />
                  </div>

                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-28">Data Normal:</label>
                    <input
                      type="text"
                      className="art-border art-rounded art-px-2 art-py-1 art-w-full"
                      value={hotspot.dataNormal || ""}
                      onChange={(e) => updateHotspotField(index, "dataNormal", e.target.value)}
                    />
                  </div>

                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-28">Annotation:</label>
                    <input
                      type="text"
                      className="art-border art-rounded art-px-2 art-py-1 art-w-full"
                      value={hotspot.annotation || ""}
                      onChange={(e) => updateHotspotField(index, "annotation", e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => removeHotspot(index)}
                    className="art-absolute art-top-2 art-right-2 art-text-red-500 hover:art-text-red-700"
                    title="Remove hotspot"
                  >
                    &times;
                  </button>
                </div>
              ))
            ) : (
              <p className="art-text-gray-500 art-italic">No hotspots yet. Click the model preview to add one.</p>
            )}
          </div>


        </div>
      )}
    </div>
  );
};

export default HotspotsSection;
