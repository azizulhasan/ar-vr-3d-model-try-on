import { useState, useEffect, useCallback } from "react";
import AccordionIcon from "../../icons/AccordionIcon";
import "../../icons/dimensions.css";

// ---------- Utility for unit conversion ----------
const convertLength = (valueInMeters, unit) => {
  switch (unit) {
    case "m":
      return valueInMeters;
    case "cm":
      return valueInMeters * 100;
    case "inch":
      return valueInMeters * 39.3701;
    default:
      return valueInMeters;
  }
};

// ---------- Display Dimensions Function ----------
const displayDimensions = (modelViewer, model_settings) => {
  console.log(model_settings.dimensions.show);

  const dimElements = [
    ...modelViewer.querySelectorAll("button"),
    modelViewer.querySelector("#dimLines"),
  ];

  function calculateDimensions(modelViewer, model_settings) {
    const unit = model_settings.dimensions?.unit || "cm";
    const conversion = {
      cm: (v) => v * 100,
      m: (v) => v,
      inch: (v) => v * 39.3701,
    };

    const unitLabel = {
      cm: "cm",
      m: "m",
      inch: "in",
    };

    function formatValue(value) {
      const converted = conversion[unit](value);
      return `${converted.toFixed(1)} ${unitLabel[unit]}`;
    }

    const updateDimensions = () => {
      const center = modelViewer.getBoundingBoxCenter();
      const size = modelViewer.getDimensions();
      if (!center || !size) return;

      const x2 = size.x / 2;
      const y2 = size.y / 2;
      const z2 = size.z / 2;

      const updateHotspot = (name, position, labelVal) => {
        modelViewer.updateHotspot({ name, position });
        const btn = modelViewer.querySelector(`button[slot="${name}"]`);
        if (btn && labelVal) btn.textContent = labelVal;
      };

      updateHotspot(
        "hotspot-dot+X-Y+Z",
        `${center.x + x2} ${center.y - y2} ${center.z + z2}`
      );
      updateHotspot(
        "hotspot-dim+X-Y",
        `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`,
        formatValue(size.z)
      );

      updateHotspot(
        "hotspot-dot+X-Y-Z",
        `${center.x + x2} ${center.y - y2} ${center.z - z2}`
      );
      updateHotspot(
        "hotspot-dim+X-Z",
        `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`,
        formatValue(size.y)
      );

      updateHotspot(
        "hotspot-dot+X+Y-Z",
        `${center.x + x2} ${center.y + y2} ${center.z - z2}`
      );
      updateHotspot(
        "hotspot-dim+Y-Z",
        `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`,
        formatValue(size.x)
      );

      updateHotspot(
        "hotspot-dot-X+Y-Z",
        `${center.x - x2} ${center.y + y2} ${center.z - z2}`
      );
      updateHotspot(
        "hotspot-dim-X-Z",
        `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`,
        formatValue(size.y)
      );

      updateHotspot(
        "hotspot-dot-X-Y-Z",
        `${center.x - x2} ${center.y - y2} ${center.z - z2}`
      );
      updateHotspot(
        "hotspot-dim-X-Y",
        `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`,
        formatValue(size.z)
      );

      updateHotspot(
        "hotspot-dot-X-Y+Z",
        `${center.x - x2} ${center.y - y2} ${center.z + z2}`
      );

      console.log(
        `Model Dimensions → X: ${formatValue(size.x)}, Y: ${formatValue(
          size.y
        )}, Z: ${formatValue(size.z)}`
      );
    };

    modelViewer.addEventListener("camera-change", updateDimensions);
  }

  function setVisibility(visible) {
    dimElements.forEach((element) => {
      if (element) {
        if (visible) {
          element.classList.remove("hide");
        } else {
          element.classList.add("hide");
        }
      }
    });
  }

  setVisibility(model_settings.dimensions.show);
  calculateDimensions(modelViewer, model_settings);

  modelViewer.addEventListener("ar-status", (event) => {
    setVisibility(
      model_settings.dimensions.show &&
        event.detail.status !== "session-started"
    );
  });

  function drawLine(svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) {
    if (dotHotspot1 && dotHotspot2) {
      svgLine.setAttribute("x1", dotHotspot1.canvasPosition.x);
      svgLine.setAttribute("y1", dotHotspot1.canvasPosition.y);
      svgLine.setAttribute("x2", dotHotspot2.canvasPosition.x);
      svgLine.setAttribute("y2", dotHotspot2.canvasPosition.y);
      if (dimensionHotspot && !dimensionHotspot.facingCamera) {
        svgLine.classList.add("hide");
      } else {
        svgLine.classList.remove("hide");
      }
    }
  }

  const dimLines = modelViewer.querySelectorAll("line");

  const renderSVG = () => {
    drawLine(
      dimLines[0],
      modelViewer.queryHotspot("hotspot-dot+X-Y+Z"),
      modelViewer.queryHotspot("hotspot-dot+X-Y-Z"),
      modelViewer.queryHotspot("hotspot-dim+X-Y")
    );
    drawLine(
      dimLines[1],
      modelViewer.queryHotspot("hotspot-dot+X-Y-Z"),
      modelViewer.queryHotspot("hotspot-dot+X+Y-Z"),
      modelViewer.queryHotspot("hotspot-dim+X-Z")
    );
    drawLine(
      dimLines[2],
      modelViewer.queryHotspot("hotspot-dot+X+Y-Z"),
      modelViewer.queryHotspot("hotspot-dot-X+Y-Z")
    );
    drawLine(
      dimLines[3],
      modelViewer.queryHotspot("hotspot-dot-X+Y-Z"),
      modelViewer.queryHotspot("hotspot-dot-X-Y-Z"),
      modelViewer.queryHotspot("hotspot-dim-X-Z")
    );
    drawLine(
      dimLines[4],
      modelViewer.queryHotspot("hotspot-dot-X-Y-Z"),
      modelViewer.queryHotspot("hotspot-dot-X-Y+Z"),
      modelViewer.queryHotspot("hotspot-dim-X-Y")
    );
  };

  modelViewer.addEventListener("load", () => {
    const center = modelViewer.getBoundingBoxCenter();
    const size = modelViewer.getDimensions();
    const x2 = size.x / 2;
    const y2 = size.y / 2;
    const z2 = size.z / 2;

    modelViewer.updateHotspot({
      name: "hotspot-dot+X-Y+Z",
      position: `${center.x + x2} ${center.y - y2} ${center.z + z2}`,
    });
    modelViewer.updateHotspot({
      name: "hotspot-dim+X-Y",
      position: `${center.x + x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`,
    });
    modelViewer.querySelector(
      'button[slot="hotspot-dim+X-Y"]'
    ).textContent = `${(size.z * 100).toFixed(0)} cm`;

    modelViewer.updateHotspot({
      name: "hotspot-dot+X-Y-Z",
      position: `${center.x + x2} ${center.y - y2} ${center.z - z2}`,
    });
    modelViewer.updateHotspot({
      name: "hotspot-dim+X-Z",
      position: `${center.x + x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`,
    });
    modelViewer.querySelector(
      'button[slot="hotspot-dim+X-Z"]'
    ).textContent = `${(size.y * 100).toFixed(0)} cm`;

    modelViewer.updateHotspot({
      name: "hotspot-dot+X+Y-Z",
      position: `${center.x + x2} ${center.y + y2} ${center.z - z2}`,
    });
    modelViewer.updateHotspot({
      name: "hotspot-dim+Y-Z",
      position: `${center.x} ${center.y + y2 * 1.1} ${center.z - z2 * 1.1}`,
    });
    modelViewer.querySelector(
      'button[slot="hotspot-dim+Y-Z"]'
    ).textContent = `${(size.x * 100).toFixed(0)} cm`;

    modelViewer.updateHotspot({
      name: "hotspot-dot-X+Y-Z",
      position: `${center.x - x2} ${center.y + y2} ${center.z - z2}`,
    });
    modelViewer.updateHotspot({
      name: "hotspot-dim-X-Z",
      position: `${center.x - x2 * 1.2} ${center.y} ${center.z - z2 * 1.2}`,
    });
    modelViewer.querySelector(
      'button[slot="hotspot-dim-X-Z"]'
    ).textContent = `${(size.y * 100).toFixed(0)} cm`;

    modelViewer.updateHotspot({
      name: "hotspot-dot-X-Y-Z",
      position: `${center.x - x2} ${center.y - y2} ${center.z - z2}`,
    });
    modelViewer.updateHotspot({
      name: "hotspot-dim-X-Y",
      position: `${center.x - x2 * 1.2} ${center.y - y2 * 1.1} ${center.z}`,
    });
    modelViewer.querySelector(
      'button[slot="hotspot-dim-X-Y"]'
    ).textContent = `${(size.z * 100).toFixed(0)} cm`;

    modelViewer.updateHotspot({
      name: "hotspot-dot-X-Y+Z",
      position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`,
    });

    renderSVG();
    modelViewer.addEventListener("camera-change", renderSVG);
  });
  
};

// ---------- Main Dimensions Component ----------
export const DimensionsSection = ({
  productModel,
  setProductModel,
  onUpdateDimension,
  activeAccordion,
  toggleAccordion,
  handleChange,
  isProductModelLoaded,
}) => {
  const [showEditor] = useState(true);

  // Use displayDimensions instead of calculateDimension
  const applyDimensions = useCallback(() => {
    const modelViewer = document.querySelectorAll(".atlas_ar_model_viewer")[0];
    if (!modelViewer) return;

    displayDimensions(modelViewer, productModel);

    // Update React state with dimensions after calculation
    const center = modelViewer.getBoundingBoxCenter();
    const size = modelViewer.getDimensions();
    
    if (center && size) {
      const unit = productModel.dimensions.unit || "cm";
      const convertedX = convertLength(size.x, unit);
      const convertedY = convertLength(size.y, unit);
      const convertedZ = convertLength(size.z, unit);

      setProductModel((prev) => {
        if (
          prev.dimensions.width?.value === convertedX &&
          prev.dimensions.height?.value === convertedY &&
          prev.dimensions.length?.value === convertedZ &&
          prev.dimensions.unit === unit
        ) {
          return prev;
        }

        return {
          ...prev,
          dimensions: {
            ...prev.dimensions,
            width: { value: convertedX, unit },
            height: { value: convertedY, unit },
            length: { value: convertedZ, unit },
          },
        };
      });
    }
  }, [productModel, setProductModel]);

  useEffect(() => {
    const interval = setInterval(() => {
      const mv = document.querySelectorAll(".atlas_ar_model_viewer")[0];
      if (mv) {
        clearInterval(interval);
        mv.addEventListener("load", applyDimensions);
        mv.addEventListener("camera-change", applyDimensions);

        if (productModel.dimensions.show) applyDimensions();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [applyDimensions, productModel.dimensions.show]);

  useEffect(() => {
    const modelviewer = document.getElementById("atlas_ar_model_viewer");
    if (!modelviewer) return;

    modelviewer.addEventListener("load", applyDimensions);
    modelviewer.addEventListener("camera-change", applyDimensions);

    if (productModel.dimensions.show) {
      applyDimensions();
    }

    return () => {
      modelviewer.removeEventListener("load", applyDimensions);
      modelviewer.removeEventListener("camera-change", applyDimensions);
    };
  }, [applyDimensions, productModel.dimensions.show]);

  const handleUnitChange = (e) => {
    onUpdateDimension("unit", e.target.value);
  };

  return (
    <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
      <button
        type="button"
        onClick={() => toggleAccordion("dimensions")}
        className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
      >
        <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Dimensions
        </span>
        <AccordionIcon status={activeAccordion.dimensions} />
      </button>

      {activeAccordion.dimensions && (
        <div className="art-px-3 art-py-2 art-bg-white art-border-t">
          <div className="art-flex art-items-center art-justify-between art-mb-4">
            <h3 className="art-font-semibold art-text-lg art-text-slate-800">
              Dimensions
            </h3>
            <div className="art-flex art-items-center art-gap-2 art-text-sm">
              <label htmlFor="unitSelect">Unit:</label>
              <select
                id="unitSelect"
                value={productModel.dimensions.unit || "cm"}
                onChange={handleUnitChange}
                className="art-border art-rounded art-px-2 art-py-1"
              >
                <option value="inch">Inch</option>
                <option value="cm">Centimeter</option>
                <option value="m">Meter</option>
              </select>
            </div>
          </div>

          {showEditor && (
            <div className="art-space-y-4">
              <label className="art-flex art-items-center art-gap-2 art-text-sm">
                <input
                  type="checkbox"
                  name="dimensions"
                  id="dimensions"
                  checked={productModel.dimensions.show !== false}
                  onChange={(e) => handleChange(e)}
                  className="art-rounded"
                />
                Show Dimensions
              </label>

              {productModel.dimensions.show && (
                <div className="art-space-y-2 art-text-sm art-text-slate-600">
                  <div>
                    Width:{" "}
                    {productModel.dimensions.width?.value?.toFixed(2) || 0}{" "}
                    {productModel.dimensions.width?.unit ||
                      productModel.dimensions.unit}
                  </div>
                  <div>
                    Height:{" "}
                    {productModel.dimensions.height?.value?.toFixed(2) || 0}{" "}
                    {productModel.dimensions.height?.unit ||
                      productModel.dimensions.unit}
                  </div>
                  <div>
                    Length:{" "}
                    {productModel.dimensions.length?.value?.toFixed(2) || 0}{" "}
                    {productModel.dimensions.length?.unit ||
                      productModel.dimensions.unit}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DimensionsSection;