import {useState, useEffect, useCallback} from "react";
import AccordionIcon from "../../icons/AccordionIcon";
import {convertLength} from '../../context/utilities';
import notify from "../../context/Notify";
import PremiumBadge, { isProActive } from "../../context/PremiumBadge";


export const DimensionsSection = ({
                                      productModel,
                                      setProductModel,
                                      onUpdateDimension,
                                      activeAccordion,
                                      toggleAccordion,
                                      handleChange,
                                      isProductModelLoaded,
                                  }) => {
    // AR-61 §1.1 Phase 2 — when Pro is absent, the entire section
    // collapses to a single upsell badge that links to the pricing
    // page. The dimension editor body below only renders when Pro
    // is loaded. The previous "changes will appear in preview but
    // won't be saved" toast was the Yoast-pattern anti-pattern (a
    // selectable control that silently fails); it is gone.
    if (!isProActive()) {
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
                    <AccordionIcon status={activeAccordion.dimensions}/>
                </button>
                {activeAccordion.dimensions && (
                    <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                        <PremiumBadge feature="dimensions">
                            <strong>Real-world dimensions</strong> render the model at its
                            true size in AR — customers can hold their phone up and
                            instantly see "will this fit?". Available in AtlasAR Pro.
                        </PremiumBadge>
                    </div>
                )}
            </div>
        );
    }

    const [showEditor] = useState(true);

    // Kept as a no-op so the existing call sites below still type-check.
    // With the Pro gate at the top of the component this code path is
    // only ever reached when Pro IS active, so no warning ever needed.
    const showProWarning = () => {};

    useEffect(() => {
        function updateHeightWithPreview() {
            const modelViewer = document.querySelectorAll(".atlas_ar_model_viewer")[0];
            if (!modelViewer) return;

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
                            width: {value: convertedX, unit},
                            height: {value: convertedY, unit},
                            length: {value: convertedZ, unit},
                        },
                    };
                });
            }
        }
        if(isProductModelLoaded) {
            updateHeightWithPreview()
        }
    }, [productModel.dimensions.unit, isProductModelLoaded]);



    return (
        <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
            <button
                type="button"
                onClick={() => toggleAccordion("dimensions")}
                className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
            >
        <span
            className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
          Dimensions
        </span>
                <AccordionIcon status={activeAccordion.dimensions}/>
            </button>

            {activeAccordion.dimensions && (
                <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                    <div className="art-flex art-items-center art-justify-between art-mb-4">
                        <h3 className="art-font-semibold art-text-lg art-text-slate-800">
                            Dimensions
                        </h3>
                        <div className="art-flex art-items-center art-gap-2 art-text-sm">
                            <label htmlFor="unit">Unit:</label>
                            <select
                                id="unit"
                                name="unit"
                                value={productModel.dimensions.unit || "cm"}
                                onChange={(e) => {
                                    showProWarning();
                                    handleChange(e);
                                }}
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
                                    onChange={(e) => {
                                        showProWarning();
                                        handleChange(e);
                                    }}
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