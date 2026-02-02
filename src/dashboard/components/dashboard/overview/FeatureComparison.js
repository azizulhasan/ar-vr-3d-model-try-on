import React from 'react';

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
            name: 'Unlimited 3D Model Uploads',
            free: true,
            pro: true,
        },
        {
            name: 'Supports GLB, GLTF, USDZ formats',
            free: true,
            pro: true,
        },
        {
            name: 'Mobile AR for Android & iOS (No App Required)',
            free: true,
            pro: true,
        },
        {
            name: 'Floor Placement AR Mode',
            free: true,
            pro: true,
        },
        {
            name: 'Wall Placement AR Mode',
            free: true,
            pro: true,
        },
        {
            name: 'WooCommerce Integration with Auto Buttons',
            free: true,
            pro: true,
        },
        {
            name: 'Interactive 3D Viewer (Rotate, Zoom, Pan)',
            free: true,
            pro: true,
        },
        {
            name: 'Custom Poster/Thumbnail Images',
            free: true,
            pro: true,
        },
        {
            name: 'QR Code Generation for Mobile AR',
            free: true,
            pro: true,
        },
        {
            name: 'Shortcode Support [atlas_ar]',
            free: true,
            pro: true,
        },
        {
            name: 'Tripo3D AI Model Generation (usage fees apply)',
            free: true,
            pro: true,
        },
        {
            name: 'Gutenberg Block Support',
            free: true,
            pro: true,
        },
        {
            name: 'Auto-Rotation Settings',
            free: true,
            pro: true,
        },
        {
            name: 'Environment & Skybox Images',
            free: true,
            pro: true,
        },
        {
            name: 'Shadow Intensity Control',
            free: true,
            pro: true,
        },
        {
            name: 'Lazy Loading for Performance',
            free: true,
            pro: true,
        },
        {
            name: 'Custom CSS & Styling Options',
            free: true,
            pro: true,
        },
        {
            name: 'Dimensions Display (Length, Width, Height)',
            free: false,
            pro: true,
        },
        {
            name: 'Interactive Hotspots (Unlimited)',
            free: false,
            pro: true,
        },
        {
            name: 'Slider/Multiple Model Display',
            free: false,
            pro: true,
        },
        {
            name: 'Automatic Compression (Upto 50% file size reduction)',
            free: false,
            pro: true,
        },
        // {
        //     name: 'Product Configurators (Colors, Materials, Finishes)',
        //     free: false,
        //     pro: true,
        // },
        {
            name: 'Priority Email Support (24h Response)',
            free: false,
            pro: true,
        },
        // {
        //     name: 'Analytics Dashboard (Coming Q1 2026)',
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: 'Per-Variation 3D Models (Coming Q1 2026)',
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: 'Background Processing for Large Files (Coming Q2 2026)',
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: 'Glass Mode Virtual Try-On for Eyewear & Jewelry (Coming Q2 2026)',
        //     free: false,
        //     pro: true,
        // },
        // {
        //     name: 'Desktop WebAR Experiences (Coming Q3 2026)',
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
                            Features
                        </h2>
                    </div>
                    <div className="art-col-span-3 art-text-center">
                        <h3 
                            className="art-text-lg art-font-semibold"
                            // style={{ color: 'var(--theme-text)' }}
                        >
                            Free Plan
                        </h3>
                    </div>
                    <div className="art-col-span-3 art-text-center">
                        <h3 
                            className="art-text-lg art-font-semibold"
                            // style={{ color: 'rgb(59,130,246)' }}
                        >
                            Pro Start from <span className="art-text-2xl art-text-blue-800">49.99/y</span>
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