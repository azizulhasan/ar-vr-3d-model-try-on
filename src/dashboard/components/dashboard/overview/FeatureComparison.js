import React from 'react';
import { __ } from '@wordpress/i18n';

/**
 * Feature Comparison Component
 * 
 * Displays a comparison table between Free and Pro plans
 * 
 * @since 1.8.0
 */
export default function FeatureComparison() {
    const features = [
        {
            name: __('Unlimited 3D Model Uploads', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Supports GLB, GLTF, USDZ formats', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Mobile AR for Android & iOS (No App Required)', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Floor Placement AR Mode', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Wall Placement AR Mode', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('WooCommerce Integration with Auto Buttons', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Interactive 3D Viewer (Rotate, Zoom, Pan)', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Custom Poster/Thumbnail Images', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('QR Code Generation for Mobile AR', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Shortcode Support [atlas_ar]', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Tripo3D AI Model Generation (usage fees apply)', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Gutenberg Block Support', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Auto-Rotation Settings', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Environment & Skybox Images', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Shadow Intensity Control', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Lazy Loading for Performance', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Custom CSS & Styling Options', 'ar-vr-3d-model-try-on'),
            free: true,
            pro: true,
        },
        {
            name: __('Dimensions Display (Length, Width, Height)', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        {
            name: __('Interactive Hotspots (Unlimited)', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        {
            name: __('Slider/Multiple Model Display', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        {
            name: __('Automatic Compression (Upto 50% file size reduction)', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        // {
        //     name: __('Product Configurators (Colors, Materials, Finishes)', 'ar-vr-3d-model-try-on'),
        //     free: false,
        //     pro: true,
        // },
        {
            name: __('Priority Email Support (24h Response)', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        // {
        //     name: __('Analytics Dashboard (Coming Q1 2026)', 'ar-vr-3d-model-try-on'),
        //     free: false,
        //     pro: true,
        // },
        {
            name: __('Per-Variation 3D Models', 'ar-vr-3d-model-try-on'),
            free: false,
            pro: true,
        },
        // {
        //     name: __('Background Processing for Large Files (Coming Q2 2026)', 'ar-vr-3d-model-try-on'),
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: __('Glass Mode Virtual Try-On for Eyewear & Jewelry (Coming Q2 2026)', 'ar-vr-3d-model-try-on'),
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: __('Desktop WebAR Experiences (Coming Q3 2026)', 'ar-vr-3d-model-try-on'),
        //     free: false,
        //     pro: true,
        // },
    ];

    return (
        <div className="art-w-full art-max-w-7xl art-mx-auto">
            <div 
                className="art-rounded-lg art-overflow-hidden art-shadow-lg"
                style={{ 
                    backgroundColor: 'var(--theme-accent)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}
            >
                {/* Table Header */}
                <div 
                    className="art-grid art-grid-cols-12 art-gap-4 art-p-6 art-border-b art-bg-blue-200"
                    // style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                >
                    <div className="art-col-span-6">
                        <h2 
                            className="art-text-xl art-font-semibold"
                            // style={{ color: 'var(--theme-text)' }}
                        >
                            {__('Features', 'ar-vr-3d-model-try-on')}
                        </h2>
                    </div>
                    <div className="art-col-span-3 art-text-center">
                        <h3 
                            className="art-text-lg art-font-semibold"
                            // style={{ color: 'var(--theme-text)' }}
                        >
                            {__('Free Plan', 'ar-vr-3d-model-try-on')}
                        </h3>
                    </div>
                    <div className="art-col-span-3 art-text-center">
                        <h3 
                            className="art-text-lg art-font-semibold"
                            // style={{ color: 'rgb(59,130,246)' }}
                        >
                            {__('Pro Start from', 'ar-vr-3d-model-try-on')} <span className="art-text-2xl art-text-blue-800">49.99/y</span>
                        </h3>
                    </div>
                </div>

                {/* Table Body */}
                <div>
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="art-grid art-grid-cols-12 art-gap-4 art-p-6 art-border-b art-items-center hover:art-bg-opacity-50 art-transition-colors"
                            style={{ 
                                borderColor: 'rgba(0,0,0,0.05)',
                                backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'
                            }}
                        >
                            <div className="art-col-span-6">
                                <p 
                                    className="art-text-sm art-font-medium"
                                    style={{ color: 'var(--theme-text)' }}
                                >
                                    {feature.name}
                                </p>
                            </div>
                            <div className="art-col-span-3 art-flex art-justify-center">
                                {feature.free ? (
                                    <svg
                                        className="art-w-6 art-h-6"
                                        fill="none"
                                        stroke="rgb(34,197,94)"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="art-w-6 art-h-6"
                                        fill="none"
                                        stroke="rgb(239,68,68)"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                )}
                            </div>
                            <div className="art-col-span-3 art-flex art-justify-center">
                                {feature.pro ? (
                                    <svg
                                        className="art-w-6 art-h-6"
                                        fill="none"
                                        stroke="rgb(34,197,94)"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="art-w-6 art-h-6"
                                        fill="none"
                                        stroke="rgb(239,68,68)"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}