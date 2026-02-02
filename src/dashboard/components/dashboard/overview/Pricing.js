import React, { useState } from 'react';

/**
 * Pricing Component
 * 
 * Displays pricing plans with monthly, yearly, and lifetime options
 * 
 * @since 1.8.0
 */
export default function Pricing() {
    const [activePlan, setActivePlan] = useState('yearly');

    const plans = {
        monthly: [
            {
                name: '10 Sites',
                price: '$19.99',
                period: '/monthly',
                sites: '10 Sites',
                subtitle: 'For Enterprises',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '5 Sites',
                price: '$9.99',
                period: '/monthly',
                sites: '5 Sites',
                subtitle: 'For Professionals',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '1 Site',
                price: '$4.99',
                period: '/monthly',
                sites: '1 Site',
                subtitle: 'For Starter',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
        yearly: [
            {
                name: '10 Sites',
                price: '$149.99',
                period: '/year',
                sites: '10 Sites',
                subtitle: 'Enterprise',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '5 Sites',
                price: '$99.99',
                period: '/year',
                sites: '5 Sites',
                subtitle: 'Professional',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '1 Site',
                price: '$49.99',
                period: '/year',
                sites: '1 Site',
                subtitle: 'Starter',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
        lifetime: [
            {
                name: '10 Sites',
                price: '$399.99',
                period: '/lifetime',
                sites: '10 Sites',
                subtitle: 'For Enterprises',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '5 Sites',
                price: '$249.99',
                period: '/lifetime',
                sites: '5 Sites',
                subtitle: 'For Professionals',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: '1 Site',
                price: '$149.99',
                period: '/lifetime',
                sites: '1 Site',
                subtitle: 'Most Popular',
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
    };

    const features = [
        'All Pro Features',
        'Dimensions Display',
        'Interactive Hotspots',
        'Slider/Multiple Model Display',
        'Auto Compression (70% savings)',
        'Unlimited 3D Model Uploads',
        'Generate 3D by AI ( usage fees apply )',
        'Full iOS & Android AR Support (USDZ + GLB)',
        'WooCommerce Integration with Auto Buttons',
        'QR Code Generation for Mobile AR',
        'Priority Email Support (24h response)',
    ];

    const currentPlans = plans[activePlan];

    return (
        <div className="art-w-full art-mx-auto">
            {/* Pricing Toggle */}
            <div className="art-flex art-justify-center art-mb-8">
                <div 
                    className="art-inline-flex art-rounded-lg art-p-1 art-gap-2"
                    style={{ backgroundColor: 'transparent' }}
                >
                    <button
                        onClick={() => setActivePlan('monthly')}
                        className={`art-px-6 art-py-2 art-rounded-lg art-font-medium art-transition-all art-cursor-pointer art-border-none ${
                            activePlan === 'monthly'
                                ? ''
                                : ''
                        }`}
                        style={{
                            backgroundColor: activePlan === 'monthly' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)',
                            color: activePlan === 'monthly' ? '#fff' : 'var(--theme-text)',
                        }}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setActivePlan('yearly')}
                        className={`art-px-6 art-py-2 art-rounded-lg art-font-medium art-transition-all art-cursor-pointer art-border-none ${
                            activePlan === 'yearly'
                                ? ''
                                : ''
                        }`}
                        style={{
                            backgroundColor: activePlan === 'yearly' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)',
                            color: activePlan === 'yearly' ? '#fff' : 'var(--theme-text)',
                        }}
                    >
                        Yearly
                    </button>
                    <button
                        onClick={() => setActivePlan('lifetime')}
                        className={`art-px-6 art-py-2 art-rounded-lg art-font-medium art-transition-all art-cursor-pointer art-border-none ${
                            activePlan === 'lifetime'
                                ? ''
                                : ''
                        }`}
                        style={{
                            backgroundColor: activePlan === 'lifetime' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)',
                            color: activePlan === 'lifetime' ? '#fff' : 'var(--theme-text)',
                        }}
                    >
                        Lifetime
                    </button>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="art-grid art-grid-cols-1 md:art-grid-cols-3 art-gap-6">
                {currentPlans.map((plan, index) => (
                    <div
                        key={index}
                        className="art-relative art-rounded-lg art-overflow-hidden art-transition-all art-duration-200 art-shadow-lg"
                        style={{
                            backgroundColor: 'var(--theme-accent)',
                            border: '1px solid rgba(0,0,0,0.1)',
                        }}
                    >

                        {/* Card Content */}
                        <div className="art-p-8">
                            {/* Site Count */}
                            <h3 
                                className="art-text-2xl art-font-bold art-mb-2"
                                style={{ color: 'var(--theme-text)' }}
                            >
                                {plan.sites}
                            </h3>

                            {/* Price */}
                            <div className="art-mb-4">
                                <span 
                                    className="art-text-5xl art-font-bold"
                                    style={{ color: 'var(--theme-text)' }}
                                >
                                    {plan.price.split('.')[0]}
                                </span>
                                <span 
                                    className="art-text-3xl art-font-bold"
                                    style={{ color: 'var(--theme-text)' }}
                                >
                                    .{plan.price.split('.')[1]}
                                </span>
                                <span 
                                    className="art-text-lg art-ml-2"
                                    style={{ color: 'var(--theme-text)', opacity: 0.7 }}
                                >
                                    {plan.period}
                                </span>
                            </div>

                            {/* Subtitle Badge */}
                            {plan.featured ? (
                                <div 
                                    className="art-mb-6 art-py-2 art-px-4 art-text-center art-font-semibold art-rounded"
                                    style={{ 
                                        backgroundColor: '#0066ff',
                                        color: '#fff'
                                    }}
                                >
                                    {plan.subtitle}
                                </div>
                            ) : (
                                <div 
                                    className="art-mb-6 art-py-2 art-text-center art-font-medium"
                                    style={{ color: 'var(--theme-text)' }}
                                >
                                    {plan.subtitle}
                                </div>
                            )}

                            {/* Buy Button */}
                            <a
                                href={plan.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="art-flex art-items-center art-justify-center art-w-full art-py-4 art-rounded-full art-font-semibold art-text-center art-transition-colors art-no-underline art-cursor-pointer art-mb-6"
                                style={{
                                    backgroundColor: '#0066ff',
                                    color: '#fff',
                                }}
                            >
                                Buy Now
                            </a>

                            {/* Features List */}
                            <ul className="art-space-y-3">
                                {features.map((feature, idx) => (
                                    <li 
                                        key={idx}
                                        className="art-flex art-items-start art-gap-2"
                                    >
                                        <svg
                                            className="art-w-5 art-h-5 art-flex-shrink-0 art-mt-0.5"
                                            fill="none"
                                            stroke="#22c55e"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        <span 
                                            className="art-text-sm"
                                            style={{ color: 'var(--theme-text)' }}
                                        >
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Info */}
            <div 
                className="art-mt-12 art-text-center art-p-6 art-rounded-lg"
                style={{ backgroundColor: 'var(--theme-accent)' }}
            >
                <p 
                    className="art-text-sm"
                    style={{ color: 'var(--theme-text)', opacity: 0.8 }}
                >
                    ✅ 14-Day Money-Back Guarantee • ✅ No Setup Fees • ✅ Cancel Anytime
                </p>
            </div>
        </div>
    );
}