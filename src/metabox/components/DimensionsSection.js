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

// ---------- Main Dimensions Component ----------
export const DimensionsSection = ({
  productModel,
  setProductModel,
  onUpdateDimension,
  activeAccordion,
  toggleAccordion,
  handleChange,
  isProductModelLoaded
}) => {
  const [showEditor] = useState(true);

  const drawLine = (svgLine, dotHotspot1, dotHotspot2, dimensionHotspot) => {
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
  };

  const calculateDimension = useCallback(() => {
    const modelViewer = document.querySelectorAll(".atlas_ar_model_viewer")[0];

    if (!modelViewer) return;

    const dimElements = [
      ...modelViewer.querySelectorAll("button"),
      modelViewer.querySelector("#dimLines"),
    ];

    // Show/hide dimensions
    function setVisibility(visible) {
      dimElements.forEach((element) => {
        element.classList.toggle("hide", !visible);
      });
    }

    setVisibility(productModel.dimensions.show);

    // Handle AR session toggling visibility
    modelViewer.addEventListener("ar-status", () => {
      setVisibility(productModel.dimensions.show);
    });

    const dimLines = modelViewer.querySelectorAll("line");

    /* Render/update SVG lines. */
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

    // Initial hotspot placement & labels
    const showDimensions = () => {
      const center = modelViewer.getBoundingBoxCenter();
      const size = modelViewer.getDimensions();

      const x2 = size.x / 2;
      const y2 = size.y / 2;
      const z2 = size.z / 2;

      const unit = productModel.dimensions.unit || "cm";
      const decimals = unit === "m" ? 2 : 0;

      const convertedX = convertLength(size.x, unit);
      const convertedY = convertLength(size.y, unit);
      const convertedZ = convertLength(size.z, unit);

      // Position hotspots + update labels
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
      ).textContent = `${convertedZ.toFixed(decimals)} ${unit}`;

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
      ).textContent = `${convertedY.toFixed(decimals)} ${unit}`;

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
      ).textContent = `${convertedX.toFixed(decimals)} ${unit}`;

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
      ).textContent = `${convertedY.toFixed(decimals)} ${unit}`;

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
      ).textContent = `${convertedZ.toFixed(decimals)} ${unit}`;

      modelViewer.updateHotspot({
        name: "hotspot-dot-X-Y+Z",
        position: `${center.x - x2} ${center.y - y2} ${center.z + z2}`,
      });

      // Keep SVG in sync
      renderSVG();
      modelViewer.addEventListener("camera-change", renderSVG);

      // Update React state with dimensions
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
    };

    showDimensions();
  }, [
    productModel.dimensions.show,
    productModel.dimensions.unit,
    setProductModel,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const mv = document.querySelectorAll(".atlas_ar_model_viewer")[0];
      if (mv) {
        clearInterval(interval);
        mv.addEventListener("load", calculateDimension);
        mv.addEventListener("camera-change", calculateDimension);

        if (productModel.dimensions.show) calculateDimension();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [calculateDimension, productModel.dimensions.show]);

    useEffect(() => {
      const modelviewer = document.getElementById("atlas_ar_model_viewer");
      if (!modelviewer) return;

      modelviewer.addEventListener("load", calculateDimension);
      modelviewer.addEventListener("camera-change", calculateDimension);

      if (productModel.dimensions.show) {
        calculateDimension();
      }

      return () => {
        modelviewer.removeEventListener("load", calculateDimension);
        modelviewer.removeEventListener("camera-change", calculateDimension);
      };
    }, [calculateDimension, productModel.dimensions.show]);


 useEffect(() => {
    if (isProductModelLoaded) {
      const previewContainer = document.getElementById("atlas_ar_preview");
      if (!previewContainer) return;

      const mv = document.querySelectorAll(".atlas_ar_model_viewer")[0];
      
      // Only create if it doesn't exist
      if (mv) {
        // Add hotspots & SVG lines - CRITICAL for dimensions
        let hotspotHTML = `
          <button slot="hotspot-dot+X-Y+Z" class="dot"></button>
          <button slot="hotspot-dot+X-Y-Z" class="dot"></button>
          <button slot="hotspot-dot+X+Y-Z" class="dot"></button>
          <button slot="hotspot-dot-X+Y-Z" class="dot"></button>
          <button slot="hotspot-dot-X-Y-Z" class="dot"></button>
          <button slot="hotspot-dot-X-Y+Z" class="dot"></button>

          <button slot="hotspot-dim+X-Y" class="dim"></button>
          <button slot="hotspot-dim+X-Z" class="dim"></button>
          <button slot="hotspot-dim+Y-Z" class="dim"></button>
          <button slot="hotspot-dim-X-Z" class="dim"></button>
          <button slot="hotspot-dim-X-Y" class="dim"></button>

          <svg id="dimLines" class="dimensionLineContainer">
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
            <line class="dimensionLine"></line>
          </svg>
        `;
        
        mv.insertAdjacentHTML("beforeend",hotspotHTML);
      }
    }
  }, [isProductModelLoaded, productModel.src, productModel.ios_src, productModel.poster, productModel.alt, productModel.auto_rotate, productModel.shadow_intensity, productModel.disable_zoom]);



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
        <span>Dimensions</span>
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
