import { useEffect, useCallback } from "react";
import AccordionIcon from "../../icons/AccordionIcon";

const HotspotsSection = ({
  productModel,
  setProductModel,
  activeAccordion,
  toggleAccordion,
}) => {


  useEffect(() => {
    wp.hooks.doAction("atlas_ar_preview_data", productModel);
  }, [productModel.hotspots]);

  // ---------- Helpers ----------
  const updateHotspots = (newList) => {
    setProductModel((prev) => ({ ...prev, hotspots: newList }));
  };

  const removeHotspot = (index) => {
    const updated = productModel.hotspots.filter((_, i) => i !== index);
    updateHotspots(updated);
  };

  const updateHotspotLabel = (index, newLabel) => {
    const updated = [...productModel.hotspots];
    updated[index] = { ...updated[index], label: newLabel };
    updateHotspots(updated);
  };

  // ---------- Click to Add Hotspot (ONLY when accordion is open) ----------
  useEffect(() => {
    const modelViewer = document.querySelector(".atlas_ar_model_viewer");
    if (!modelViewer) return;

    const handleClick = (event) => {
      // CRITICAL: Only add hotspots when the accordion is open
      if (!activeAccordion.hotspots) return;

      // Get the hit position and normal from the model
      const hit = modelViewer.positionAndNormalFromPoint?.(
        event.clientX,
        event.clientY
      );

      if (!hit) {
        console.log("No hit detected on model");
        return;
      }

      const pos = `${hit.position.x.toFixed(3)} ${hit.position.y.toFixed(
        3
      )} ${hit.position.z.toFixed(3)}`;
      const norm = `${hit.normal.x.toFixed(3)} ${hit.normal.y.toFixed(
        3
      )} ${hit.normal.z.toFixed(3)}`;

      console.log("Adding hotspot at:", pos, "with normal:", norm);

      const nextId = (productModel.hotspots?.length || 0) + 1;
      const newHotspot = {
        id: nextId,
        label: `Hotspot ${nextId}`,
        position: pos,
        normal: norm,
      };
      updateHotspots([...(productModel.hotspots || []), newHotspot]);
    };

    modelViewer.addEventListener("click", handleClick);
    return () => modelViewer.removeEventListener("click", handleClick);
  }, [activeAccordion.hotspots, productModel.hotspots]); // Re-run when accordion state changes

  // ---------- JSX ----------
  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion("hotspots")}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Hotspots
        </span>
        <AccordionIcon status={activeAccordion.hotspots} />
      </button>

      {activeAccordion.hotspots && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t">
          <div className="art-flex art-items-center art-justify-between art-mb-4">
            <h3 className="art-font-semibold art-text-lg art-text-slate-800">
              Manage Hotspots
            </h3>
            <p className="art-text-xs art-text-gray-500">
              💡 Click on the 3D model to place a hotspot.
            </p>
          </div>

          <div className="art-space-y-4">
            {(productModel.hotspots || []).length > 0 ? (
              productModel.hotspots.map((hotspot, index) => (
                <div
                  key={index}
                  className="art-border art-rounded art-p-3 art-bg-gray-50 art-relative art-shadow-sm"
                >
                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-20">Label:</label>
                    <input
                      type="text"
                      className="art-border art-rounded art-px-2 art-py-1 art-w-1/2"
                      value={hotspot.label}
                      onChange={(e) =>
                        updateHotspotLabel(index, e.target.value)
                      }
                    />
                  </div>

                  {/* <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-20">Position:</label>
                    <input
                      type="text"
                      readOnly
                      className="art-border art-rounded art-px-2 art-py-1 art-w-1/2 art-bg-gray-100"
                      value={hotspot.position}
                    />
                  </div>

                  <div className="art-flex art-items-center art-gap-2 art-mb-2">
                    <label className="art-text-sm art-w-20">Normal:</label>
                    <input
                      type="text"
                      readOnly
                      className="art-border art-rounded art-px-2 art-py-1 art-w-1/2 art-bg-gray-100"
                      value={hotspot.normal}
                    />
                  </div> */}

                  <button
                    onClick={() => removeHotspot(index)}
                    className="art-absolute art-top-2 art-right-2 art-text-red-500 hover:art-text-red-700 art-text-xl art-w-6 art-h-6 art-flex art-items-center art-justify-center"
                    title="Remove hotspot"
                  >
                    &times;
                  </button>
                </div>
              ))
            ) : (
              <p className="art-text-gray-500 art-italic">
                No hotspots yet. Click the model to add one.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotspotsSection;
