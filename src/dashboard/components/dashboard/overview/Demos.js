import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';

/**
 * Demos Component
 * 
 * Displays live demos with sidebar navigation and iframe preview
 * 
 * @since 1.8.0
 */
export default function Demos() {
    const [activeDemo, setActiveDemo] = useState('woocommerce-product');
    
    const demos = [
        {
            id: 'woocommerce-product',
            title: __('WooCommerce Product 3D view', 'ar-vr-3d-model-try-on'),
            description: __('View 3D models inside WooCommerce products.', 'ar-vr-3d-model-try-on'),
            category: __('WooCommerce', 'ar-vr-3d-model-try-on'),
            icon: '🛒',
            url: 'https://wpaugmentedreality.com/product/relaxation-chair/'
        },
        {
            id: 'default',
            title: __('Default', 'ar-vr-3d-model-try-on'),
            description: __('Basic interactive 3D model viewer.', 'ar-vr-3d-model-try-on'),
            category: __('General', 'ar-vr-3d-model-try-on'),
            icon: '📦',
            url: 'https://wpaugmentedreality.com/default-3d-viewer-demo/'
        },
        {
            id: 'custom-width',
            title: __('Custom Width', 'ar-vr-3d-model-try-on'),
            description: __('Viewer with adjustable width option.', 'ar-vr-3d-model-try-on'),
            category: __('General', 'ar-vr-3d-model-try-on'),
            icon: '↔️',
            url: 'https://wpaugmentedreality.com/custom-width-demo/'
        },
        {
            id: 'disable-zoom',
            title: __('Disable Zoom', 'ar-vr-3d-model-try-on'),
            description: __('Prevents zooming on the 3D model.', 'ar-vr-3d-model-try-on'),
            category: __('Controls', 'ar-vr-3d-model-try-on'),
            icon: '🔍',
            url: 'https://wpaugmentedreality.com/disable-zoom-demo/'
        },
        {
            id: 'disable-auto-rotate',
            title: __('Disable Auto Rotate', 'ar-vr-3d-model-try-on'),
            description: __('Stops the model auto-rotation.', 'ar-vr-3d-model-try-on'),
            category: __('Controls', 'ar-vr-3d-model-try-on'),
            icon: '🔄',
            url: 'https://wpaugmentedreality.com/disable-auto-rotate-demo/'
        },
        {
            id: 'lazy-loading',
            title: __('Lazy Loading', 'ar-vr-3d-model-try-on'),
            description: __('Loads model only when visible.', 'ar-vr-3d-model-try-on'),
            category: __('Performance', 'ar-vr-3d-model-try-on'),
            icon: '⚡',
            url: 'https://wpaugmentedreality.com/lazy-loading-demo/'
        },
        {
            id: 'eager-loading',
            title: __('Eager Loading', 'ar-vr-3d-model-try-on'),
            description: __('Loads model immediately on page load.', 'ar-vr-3d-model-try-on'),
            category: __('Performance', 'ar-vr-3d-model-try-on'),
            icon: '⏩',
            url: 'https://wpaugmentedreality.com/eager-loading-demo/'
        },
        {
            id: 'multiple',
            title: __('Multiple', 'ar-vr-3d-model-try-on'),
            description: __('Display multiple 3D models in gallery.', 'ar-vr-3d-model-try-on'),
            category: __('Gallery', 'ar-vr-3d-model-try-on'),
            icon: '🖼️',
            url: 'https://wpaugmentedreality.com/multiple-models-demo/'
        },
        {
            id: 'woocommerce-top',
            title: __('WooCommerce- Top of the image', 'ar-vr-3d-model-try-on'),
            description: __('3D viewer displayed above product image.', 'ar-vr-3d-model-try-on'),
            category: __('WooCommerce', 'ar-vr-3d-model-try-on'),
            icon: '🔝',
            url: 'https://wpaugmentedreality.com/woocommerce-top-demo/'
        },
        {
            id: 'woocommerce-bottom',
            title: __('WooCommerce- Bottom of the image', 'ar-vr-3d-model-try-on'),
            description: __('3D viewer displayed below product image.', 'ar-vr-3d-model-try-on'),
            category: __('WooCommerce', 'ar-vr-3d-model-try-on'),
            icon: '⬇️',
            url: 'https://wpaugmentedreality.com/woocommerce-bottom-demo/'
        },
        {
            id: 'woocommerce-replace',
            title: __('WooCommerce- Replace product image', 'ar-vr-3d-model-try-on'),
            description: __('Replaces default image with 3D viewer.', 'ar-vr-3d-model-try-on'),
            category: __('WooCommerce', 'ar-vr-3d-model-try-on'),
            icon: '🔁',
            url: 'https://wpaugmentedreality.com/woocommerce-replace-demo/'
        },
        {
            id: 'woocommerce-variants',
            title: __('WooCommerce- Variants', 'ar-vr-3d-model-try-on'),
            description: __('Switch 3D models by product variant.', 'ar-vr-3d-model-try-on'),
            category: __('WooCommerce', 'ar-vr-3d-model-try-on'),
            icon: '🎨',
            url: 'https://wpaugmentedreality.com/woocommerce-variants-demo/'
        },
    ];

    const activeData = demos.find(demo => demo.id === activeDemo) || demos[0];

    return (
        <div className="art-flex art-h-[calc(100vh-10vh)] art-overflow-hidden">
            {/* Left Sidebar - Demo Navigation */}
            <div 
                className="art-w-96 art-border-r art-overflow-y-auto art-flex-shrink-0"
                style={{
                    backgroundColor: '#1a1a2e',
                    color: '#ffffff',
                }}
            >
                <div className="art-p-6">
                    {/* Header */}
                    <div className="art-mb-6">
                        <h2 className="art-text-2xl art-font-bold art-mb-2 art-text-white">
                             {__('Live Overview', 'ar-vr-3d-model-try-on')}
                        </h2>
                        <p className="art-text-sm art-text-gray-400">
                              {__('Click on any section to view it live', 'ar-vr-3d-model-try-on')}
                        </p>
                    </div>

                    {/* Demo List */}
                    <div className="art-space-y-3">
                        {demos.map((demo) => (
                            <button
                                key={demo.id}
                                onClick={() => setActiveDemo(demo.id)}
                                className={`art-w-full art-text-left art-p-4 art-rounded-lg art-transition-all art-duration-200 art-cursor-pointer art-border-none ${
                                    activeDemo === demo.id
                                        ? 'art-bg-blue-600'
                                        : 'art-bg-gray-800 hover:art-bg-gray-700'
                                }`}
                            >
                                <div className="art-flex art-items-start art-gap-3">
                                    <span className="art-text-2xl art-flex-shrink-0">
                                        {demo.icon}
                                    </span>
                                    <div className="art-flex-1">
                                        <h3 className="art-text-white art-font-semibold art-mb-1">
                                            {demo.title}
                                        </h3>
                                        <p className="art-text-xs art-text-gray-400 art-mb-2">
                                            {demo.description}
                                        </p>
                                        <span 
                                            className="art-inline-block art-text-xs art-px-2 art-py-1 art-rounded art-bg-gray-700 art-text-gray-300"
                                        >
                                            {demo.category}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Live Preview */}
            <div className="art-flex-1 art-flex art-flex-col art-overflow-hidden">
                {/* Preview Header */}
                <div 
                    className="art-p-6 art-border-b art-flex art-items-center art-justify-between art-flex-shrink-0"
                    style={{
                        backgroundColor: 'var(--theme-bg)',
                        borderColor: 'var(--theme-accent)',
                    }}
                >
                    <div className="art-flex-1">
                        <h2 
                            className="art-text-2xl art-font-bold art-mb-2"
                            style={{ color: 'var(--theme-text)' }}
                        >
                            {activeData.title}
                        </h2>
                        <p 
                            className="art-text-sm"
                            style={{ color: 'var(--theme-text)', opacity: 0.7 }}
                        >
                            {activeData.description}
                        </p>
                    </div>
                    <div className="art-flex art-gap-3">
                        <a
                            href="https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-px-6 art-py-3 art-rounded-md art-font-semibold art-text-white art-bg-blue-600 hover:art-bg-blue-700 art-transition-colors art-no-underline art-cursor-pointer"
                        >
                             {__('Buy Now', 'ar-vr-3d-model-try-on')}
                        </a>
                        <a
                            href="https://wpaugmentedreality.com/shop/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-px-6 art-py-3 art-rounded-md art-font-semibold art-text-white art-bg-orange-500 hover:art-bg-orange-600 art-transition-colors art-no-underline art-cursor-pointer"
                        >
                             {__('See All Demos', 'ar-vr-3d-model-try-on')}
                        </a>
                    </div>
                </div>

                {/* iFrame Preview */}
                <div className="art-flex-1 art-relative art-overflow-hidden">
                    <iframe
                        key={activeDemo}
                        src={activeData.url}
                        className="art-w-full art-h-full art-border-none"
                        title={activeData.title}
                        style={{
                            backgroundColor: '#ffffff',
                        }}
                    />
                    
                    {/* Preview Footer */}
                    <div 
                        className="art-absolute art-bottom-0 art-left-0 art-right-0 art-p-4 art-bg-gray-900 art-bg-opacity-90 art-backdrop-blur"
                    >
                        <p className="art-text-sm art-text-white art-text-center">
                              {__('Preview of', 'ar-vr-3d-model-try-on')} <span className="art-font-semibold">{activeData.title}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}