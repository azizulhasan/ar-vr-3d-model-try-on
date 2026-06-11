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

    /**
     * AR-63 — dimension authoring mode. Missing field → "auto" so
     * products saved before this feature behave exactly like today.
     */
    const mode = productModel.dimensions?.mode || "auto";
    const isManual = mode === "manual";

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
        // AR-63 — auto-derive only runs in "auto" mode; manual mode
        // owns the values and must not be clobbered by the bounding
        // box readback.
        if (isProductModelLoaded && !isManual) {
            updateHeightWithPreview()
        }
    }, [productModel.dimensions.unit, isProductModelLoaded, isManual]);

    /**
     * AR-63 — mode switcher. Auto → Manual seeds the manual inputs
     * with whatever the auto path most recently computed (or the
     * default 0/cm fallback) so the merchant starts from a sensible
     * number, not zeros. Manual → Auto leaves the values alone — the
     * next render's useEffect re-runs the bounding-box readback and
     * overwrites them.
     */
    const handleModeChange = (e) => {
        const next = e.target.value === "manual" ? "manual" : "auto";
        setProductModel((prev) => {
            const u = prev.dimensions?.unit || "cm";
            const seedAxis = (axis, fallback) => ({
                value: prev.dimensions?.[axis]?.value ?? fallback,
                unit: u,
            });
            return {
                ...prev,
                dimensions: {
                    ...prev.dimensions,
                    mode: next,
                    width:  next === "manual" ? seedAxis("width",  0) : prev.dimensions?.width,
                    height: next === "manual" ? seedAxis("height", 0) : prev.dimensions?.height,
                    length: next === "manual" ? seedAxis("length", 0) : prev.dimensions?.length,
                },
            };
        });
    };

    /** AR-63 — free-text unit input, manual mode only. */
    const handleUnitTextChange = (e) => {
        const value = e.target.value;
        setProductModel((prev) => ({
            ...prev,
            dimensions: { ...prev.dimensions, unit: value },
        }));
    };

    /** AR-63 — number input for one axis, manual mode only. */
    const handleAxisChange = (axis, rawValue) => {
        // Keep empty string as empty so the input doesn't fight the
        // user mid-edit; only coerce to Number on read.
        const value = rawValue === "" ? "" : Number(rawValue);
        setProductModel((prev) => ({
            ...prev,
            dimensions: {
                ...prev.dimensions,
                [axis]: { value, unit: prev.dimensions?.unit || "cm" },
            },
        }));
    };



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
                    <div className="art-flex art-items-center art-justify-between art-mb-4 art-flex-wrap art-gap-2">
                        <h3 className="art-font-semibold art-text-lg art-text-slate-800">
                            Dimensions
                        </h3>
                        <div className="art-flex art-items-center art-gap-3 art-text-sm art-flex-wrap">
                            {/*
                              * AR-63 — mode dropdown. Same look as the Unit
                              * field next to it so it sits naturally in the
                              * existing header row. Auto = today's bounding-
                              * box-derived numbers; Manual = editable inputs.
                              */}
                            <label htmlFor="dimensions-mode">Mode:</label>
                            <select
                                id="dimensions-mode"
                                name="dimensions-mode"
                                value={mode}
                                onChange={handleModeChange}
                                className="art-border art-rounded art-px-2 art-py-1"
                            >
                                <option value="auto">Auto-detect</option>
                                <option value="manual">Manual</option>
                            </select>

                            <label htmlFor="unit">Unit:</label>
                            {isManual ? (
                                <input
                                    type="text"
                                    id="unit"
                                    name="unit"
                                    value={productModel.dimensions?.unit ?? ""}
                                    onChange={handleUnitTextChange}
                                    placeholder="cm"
                                    className="art-border art-rounded art-px-2 art-py-1"
                                    style={{width: 90}}
                                />
                            ) : (
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
                                    {/*
                                      * AR-63 — ordered smallest to largest
                                      * so the dropdown reads like a number
                                      * line. Matches the conversion table
                                      * in utilities.js::displayDimensions.
                                      */}
                                    <option value="mm">Millimeter</option>
                                    <option value="cm">Centimeter</option>
                                    <option value="inch">Inch</option>
                                    <option value="ft">Feet</option>
                                    <option value="m">Meter</option>
                                </select>
                            )}
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
                                isManual ? (
                                    /*
                                      * AR-63 — manual mode: editable number
                                      * inputs for each axis. Empty string is
                                      * preserved while typing so the cursor
                                      * doesn't fight the user mid-edit; on
                                      * commit it's coerced to Number.
                                      */
                                    <div className="art-space-y-2 art-text-sm">
                                        {['width', 'height', 'length'].map((axis) => {
                                            const raw = productModel.dimensions?.[axis]?.value;
                                            const val = (raw === undefined || raw === null) ? '' : String(raw);
                                            return (
                                                <div key={axis} className="art-flex art-items-center art-gap-2">
                                                    <label
                                                        htmlFor={`dim-${axis}`}
                                                        style={{width: 60, textTransform: 'capitalize'}}
                                                    >
                                                        {axis}:
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id={`dim-${axis}`}
                                                        name={`dim-${axis}`}
                                                        step="0.1"
                                                        min="0"
                                                        value={val}
                                                        onChange={(e) => handleAxisChange(axis, e.target.value)}
                                                        className="art-border art-rounded art-px-2 art-py-1"
                                                        style={{width: 120}}
                                                    />
                                                    <span className="art-text-slate-500">
                                                        {productModel.dimensions?.unit || 'cm'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
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
                                )
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DimensionsSection;