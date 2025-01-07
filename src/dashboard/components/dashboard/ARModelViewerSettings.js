import React from 'react';

const ARModelViewerSettings = () => {
    return (
        <div className="art-p-4 art-bg-gray-100">
            {/* Header Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    View Settings
                </h3>
            </div>

            {/* Show Button In Dropdown */}
            <div className="art-mb-6">
                <label htmlFor="art_ar_model_viewer_for_wordpress_btn"
                       className="art-block art-text-sm art-font-medium">
                    Show button in
                </label>
                <select
                    id="art_ar_model_viewer_for_wordpress_btn"
                    className="art-w-full art-border art-rounded art-p-2 art-text-sm art-mt-1"
                >
                    <option value="">None</option>
                    <option value="1">woocommerce_before_single_product_summary</option>
                    <option value="2">woocommerce_after_single_product_summary</option>
                    <option value="3" selected>
                        woocommerce_before_single_product
                    </option>
                    <option value="4">woocommerce_after_single_product</option>
                    <option value="5">woocommerce_after_add_to_cart_form</option>
                    <option value="6">woocommerce_before_add_to_cart_form</option>
                </select>
            </div>

            {/* Product Tabs Radio Options */}
            <div className="art-mb-6">
                <label className="art-block art-text-sm art-font-medium art-mb-1">
                    Show in Product Tabs
                </label>
                <div className="art-flex art-gap-4">
                    <label className="art-flex art-items-center art-gap-2">
                        <input type="radio" name="product_tabs" value="yes" checked className="art-accent-blue-500"/>
                        <span>Yes</span>
                    </label>
                    <label className="art-flex art-items-center art-gap-2">
                        <input type="radio" name="product_tabs" value="no" className="art-accent-blue-500"/>
                        <span>No</span>
                    </label>
                </div>
            </div>

            {/* Loading Attributes Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    Loading : Attributes
                </h3>
                <div>
                    <label className="art-block art-text-sm art-font-medium art-mb-1">Loading</label>
                    <div className="art-flex art-gap-4">
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="1" checked className="art-accent-blue-500"/>
                            <span>Auto</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="2" className="art-accent-blue-500"/>
                            <span>Lazy</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="3" className="art-accent-blue-500"/>
                            <span>Eager</span>
                        </label>
                    </div>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        An enumerable attribute describing under what conditions the model should be preloaded.
                    </p>
                </div>
            </div>

            {/* AR Modes Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    Augmented Reality : Attributes
                </h3>
                <div>
                    <label className="art-block art-text-sm art-font-medium art-mb-1">AR Modes</label>
                    <div className="art-flex art-gap-4">
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="webxr" checked className="art-accent-blue-500"/>
                            <span>webxr</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="scene-viewer" checked className="art-accent-blue-500"/>
                            <span>scene-viewer</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="quick-look" checked className="art-accent-blue-500"/>
                            <span>quick-look</span>
                        </label>
                    </div>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        A prioritized list of the types of AR experiences to enable.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ARModelViewerSettings;

