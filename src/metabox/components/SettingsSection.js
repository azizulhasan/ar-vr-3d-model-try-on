import React from "react";
import AccordionIcon from "../../icons/AccordionIcon";

const SettingsSection = ({
    productModel,
    handleChange,
    activeAccordion,
    toggleAccordion,
}) => {
    return (
        <div className="art-mb-4 art-border art-border-gray-200 art-rounded">
            <button
                type="button"
                onClick={() => toggleAccordion("settings")}
                className="art-w-full art-flex art-justify-between art-items-center art-px-3 art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50"
            >
                <span className="art-w-full art-flex art-justify-between art-py-2 art-bg-white art-text-left art-text-sm art-font-medium hover:art-bg-gray-50">
                    Settings
                </span>
                <AccordionIcon status={activeAccordion.settings} />
            </button>

            {activeAccordion.settings && (
                <div className="art-px-3 art-py-2 art-bg-white art-border-t">
                    {/* Show Button In */}
                    <div className="art-mb-3">
                        <label className="art-font-medium art-block art-mb-2">
                            Show Button In
                        </label>
                        <div className="art-relative">
                            <select
                                name="show_button_in"
                                value={productModel.show_button_in || "global"}
                                onChange={handleChange}
                                className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded art-bg-white art-appearance-none art-pr-8"
                            >
                                <option value="global">Use Global Setting</option>
                                <option value="product_image">Product Image</option>
                                <option value="3d_viewer">3D Viewer</option>
                                <option value="1">woocommerce_before_single_product_summary</option>
                                <option value="2">woocommerce_after_single_product_summary</option>
                                <option value="3">woocommerce_before_single_product</option>
                                <option value="4">woocommerce_after_single_product</option>
                                <option value="5">woocommerce_after_add_to_cart_form</option>
                                <option value="6">woocommerce_before_add_to_cart_form</option>
                                <option value="7">woocommerce_product_thumbnails</option>
                            </select>
                            <div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-px-2 art-pointer-events-none">
                                <svg
                                    className="art-fill-current art-h-4 art-w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                ></svg>
                            </div>
                        </div>
                        <p className="art-text-sm art-text-gray-600 art-mt-2">
                            Choose where the 3D viewer will appear for this product.
                            <br />
                            <strong>Use Global Setting</strong> - Uses the value from plugin settings.
                            <br />
                            <strong>Product Image</strong> - Shows the featured image first with a 3D icon to reveal the 3D viewer.
                            <br />
                            <strong>3D Viewer</strong> - Shows the 3D model first with an image icon to reveal the product image.
                        </p>
                    </div>

                    {/* AR-67: per-product model-library load strategy override.
                        'inherit' falls through to the global setting in
                        AR_TRY_ON_Helper::get_model_load_strategy(). */}
                    <div className="art-mb-3">
                        <label className="art-font-medium art-block art-mb-2">
                            3D Viewer Library Loading
                        </label>
                        <div className="art-relative">
                            <select
                                name="model_load_strategy"
                                value={productModel.model_load_strategy || "inherit"}
                                onChange={handleChange}
                                className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded art-bg-white art-appearance-none art-pr-8"
                            >
                                <option value="inherit">Use Global Setting</option>
                                <option value="auto">Automatic (load with page)</option>
                                <option value="interaction">On interaction (load on click)</option>
                            </select>
                            <div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-px-2 art-pointer-events-none">
                                <svg
                                    className="art-fill-current art-h-4 art-w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                ></svg>
                            </div>
                        </div>
                        <p className="art-text-sm art-text-gray-600 art-mt-2">
                            Overrides the global <strong>Model Loading Behavior</strong> for this product.
                            <br />
                            <strong>Automatic</strong> - the ~1&nbsp;MB 3D viewer loads with the page.
                            <br />
                            <strong>On interaction</strong> - the product image shows first; the 3D viewer downloads only when the shopper clicks "View in 3D".
                        </p>
                    </div>

                    {/* AR-61: per-product "View in AR" CTA label override.
                        Empty falls back to translated default. Lets a
                        merchant call the button "See it in 3D" or any
                        localized phrase without editing translation
                        files or theme code. */}
                    <div className="art-mb-3">
                        <label className="art-font-medium art-block art-mb-2">
                            View-in-AR Button Label
                        </label>
                        <input
                            type="text"
                            name="view_in_ar_label"
                            value={productModel.view_in_ar_label || ""}
                            onChange={handleChange}
                            placeholder="View in AR"
                            className="art-w-full art-p-2 art-border art-border-gray-300 art-rounded"
                        />
                        <p className="art-text-sm art-text-gray-600 art-mt-2">
                            Optional. Replaces the default <strong>"View in AR"</strong> text on this product's button. Leave blank to use the default. The shortcode attribute <code>button_label="…"</code> overrides this on a single insertion.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsSection;
