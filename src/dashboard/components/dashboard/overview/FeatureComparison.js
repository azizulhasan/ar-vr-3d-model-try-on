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
            name: 'Embed 3D Models in Posts, Pages, and Widgets',
            free: true,
            pro: true,
        },
        {
            name: 'Supports Popular 3D Formats (.GLB, .GLTF, .OBJ, .STL, and more)',
            free: true,
            pro: true,
        },
        {
            name: 'Support for external model URLs',
            free: true,
            pro: true,
        },
        {
            name: 'Show 3D product on your WooCommerce product pages',
            free: true,
            pro: true,
        },
        {
            name: 'Add multiple 3D models into a single viewer gallery',
            free: true,
            pro: true,
        },
        {
            name: 'Add 3D models for each variant for the WooCommerce product',
            free: false,
            pro: true,
        },
        {
            name: 'Touch, Pan, Zoom & Rotate controls',
            free: true,
            pro: true,
        },
        {
            name: 'Auto-Rotation to view in 360° without interaction',
            free: true,
            pro: true,
        },
        {
            name: 'Preset to save your preferred viewer configurations',
            free: true,
            pro: true,
        },
        {
            name: 'Elementor widget available',
            free: true,
            pro: true,
        },
        {
            name: 'Full viewer settings on Elementor widget',
            free: false,
            pro: true,
        },
        {
            name: 'Lazy Loading for Performance',
            free: true,
            pro: true,
        },
        {
            name: 'Adjust lighting, shadow intensity, and exposure',
            free: false,
            pro: true,
        },
        {
            name: 'Add a poster image to show while the model is loading',
            free: false,
            pro: true,
        },
        {
            name: 'Display a progress bar until the 3D file is fully loaded',
            free: false,
            pro: true,
        },
        {
            name: 'Enable or disable auto-rotate, fullscreen, and autoplay',
            free: false,
            pro: true,
        },
        {
            name: 'Set a custom camera angle for the perfect first impression',
            free: false,
            pro: true,
        },
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