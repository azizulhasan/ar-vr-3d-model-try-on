import React from 'react';
import { __ } from '@wordpress/i18n';

const ARModelViewerSettings = () => {
    return (
        <div className="art-p-4 art-bg-gray-100">
            {/* Header Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    {__('View Settings', 'ar-vr-3d-model-try-on')}
                </h3>
            </div>

            {/* Show Button In Dropdown */}
            <div className="art-mb-6">
                <label htmlFor="art_ar_model_viewer_for_wordpress_btn"
                       className="art-block art-text-sm art-font-medium">
                    {__('Show button in', 'ar-vr-3d-model-try-on')}
                </label>
                <select
                    id="art_ar_model_viewer_for_wordpress_btn"
                    className="art-w-full art-border art-rounded art-p-2 art-text-sm art-mt-1"
                >
                    <option value="">{__('None', 'ar-vr-3d-model-try-on')}</option>
                    <option value="1">
                        {__('Before Single Product Summary (woocommerce_before_single_product_summary)', 'ar-vr-3d-model-try-on')}
                    </option>
                    <option value="2">
                        {__('After Single Product Summary (woocommerce_after_single_product_summary)', 'ar-vr-3d-model-try-on')}
                    </option>
                    <option value="3" selected>
                        {__('Before Single Product (woocommerce_before_single_product)', 'ar-vr-3d-model-try-on')}
                    </option>
                    <option value="4">
                        {__('After Single Product (woocommerce_after_single_product)', 'ar-vr-3d-model-try-on')}
                    </option>
                    <option value="5">
                        {__('After Add to Cart Form (woocommerce_after_add_to_cart_form)', 'ar-vr-3d-model-try-on')}
                    </option>
                    <option value="6">
                        {__('Before Add to Cart Form (woocommerce_before_add_to_cart_form)', 'ar-vr-3d-model-try-on')}
                    </option>
                </select>
            </div>

            {/* Product Tabs Radio Options */}
            <div className="art-mb-6">
                <label className="art-block art-text-sm art-font-medium art-mb-1">
                    {__('Show in Product Tabs', 'ar-vr-3d-model-try-on')}
                </label>
                <div className="art-flex art-gap-4">
                    <label className="art-flex art-items-center art-gap-2">
                        <input type="radio" name="product_tabs" value="yes" checked className="art-accent-blue-500"/>
                        <span>{__('Yes', 'ar-vr-3d-model-try-on')}</span>
                    </label>
                    <label className="art-flex art-items-center art-gap-2">
                        <input type="radio" name="product_tabs" value="no" className="art-accent-blue-500"/>
                        <span>{__('No', 'ar-vr-3d-model-try-on')}</span>
                    </label>
                </div>
            </div>

            {/* Loading Attributes Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    {__('Loading : Attributes', 'ar-vr-3d-model-try-on')}
                </h3>
                <div>
                    <label className="art-block art-text-sm art-font-medium art-mb-1">
                        {__('Loading', 'ar-vr-3d-model-try-on')}
                    </label>
                    <div className="art-flex art-gap-4">
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="1" checked className="art-accent-blue-500"/>
                            <span>{__('Auto', 'ar-vr-3d-model-try-on')}</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="2" className="art-accent-blue-500"/>
                            <span>{__('Lazy', 'ar-vr-3d-model-try-on')}</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="radio" name="loading" value="3" className="art-accent-blue-500"/>
                            <span>{__('Eager', 'ar-vr-3d-model-try-on')}</span>
                        </label>
                    </div>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        {__('An enumerable attribute describing under what conditions the model should be preloaded.', 'ar-vr-3d-model-try-on')}
                    </p>
                </div>
            </div>

            {/* AR Modes Section */}
            <div className="art-mb-6">
                <h3 className="art-text-lg art-font-bold art-flex art-items-center art-gap-2">
                    <span className="art-dashicons art-dashicons-admin-generic"></span>
                    {__('Augmented Reality : Attributes', 'ar-vr-3d-model-try-on')}
                </h3>
                <div>
                    <label className="art-block art-text-sm art-font-medium art-mb-1">
                        {__('AR Modes', 'ar-vr-3d-model-try-on')}
                    </label>
                    <div className="art-flex art-gap-4">
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="webxr" checked className="art-accent-blue-500"/>
                            <span>{__("webxr", 'ar-vr-3d-model-try-on')}</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="scene-viewer" checked className="art-accent-blue-500"/>
                            <span>{__("scene-viewer", 'ar-vr-3d-model-try-on')}</span>
                        </label>
                        <label className="art-flex art-items-center art-gap-2">
                            <input type="checkbox" value="quick-look" checked className="art-accent-blue-500"/>
                            <span>{__("quick-look", 'ar-vr-3d-model-try-on')}</span>
                        </label>
                    </div>
                    <p className="art-text-sm art-text-gray-600 art-mt-2">
                        {__('A prioritized list of the types of AR experiences to enable.', 'ar-vr-3d-model-try-on')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ARModelViewerSettings;