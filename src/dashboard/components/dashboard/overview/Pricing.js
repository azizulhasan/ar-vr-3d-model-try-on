import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
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
                name: __('10 Sites', 'ar-vr-3d-model-try-on'),
                price: '$19.99',
                period: __('/monthly', 'ar-vr-3d-model-try-on'),
                sites: __('10 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('For Enterprises', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('5 Sites', 'ar-vr-3d-model-try-on'),
                price: '$9.99',
                period: __('/monthly', 'ar-vr-3d-model-try-on'),
                sites: __('5 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('For Professionals', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('1 Site', 'ar-vr-3d-model-try-on'),
                price: '$4.99',
                period: __('/monthly', 'ar-vr-3d-model-try-on'),
                sites: __('1 Site', 'ar-vr-3d-model-try-on'),
                subtitle: __('For Starter', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
        yearly: [
            {
                name: __('10 Sites', 'ar-vr-3d-model-try-on'),
                price: '$149.99',
                period: __('/year', 'ar-vr-3d-model-try-on'),
                sites: __('10 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('Enterprise', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('5 Sites', 'ar-vr-3d-model-try-on'),
                price: '$99.99',
                period: __('/year', 'ar-vr-3d-model-try-on'),
                sites: __('5 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('Professional', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('1 Site', 'ar-vr-3d-model-try-on'),
                price: '$49.99',
                period: __('/year', 'ar-vr-3d-model-try-on'),
                sites: __('1 Site', 'ar-vr-3d-model-try-on'),
                subtitle: __('Starter', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
        lifetime: [
                       {
                name: __('10 Sites', 'ar-vr-3d-model-try-on'),
                price: '$399.99',
                period: __('/lifetime', 'ar-vr-3d-model-try-on'),
                sites: __('10 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('For Enterprises', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('5 Sites', 'ar-vr-3d-model-try-on'),
                price: '$249.99',
                period: __('/lifetime', 'ar-vr-3d-model-try-on'),
                sites: __('5 Sites', 'ar-vr-3d-model-try-on'),
                subtitle: __('For Professionals', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: false,
            },
            {
                name: __('1 Site', 'ar-vr-3d-model-try-on'),
                price: '$149.99',
                period: __('/lifetime', 'ar-vr-3d-model-try-on'),
                sites: __('1 Site', 'ar-vr-3d-model-try-on'),
                subtitle: __('Most Popular', 'ar-vr-3d-model-try-on'),
                url: 'https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/',
                featured: true,
            },
        ],
    };

    const features = [
        __('All Pro Features', 'ar-vr-3d-model-try-on'),
        __('Dimensions Display', 'ar-vr-3d-model-try-on'),
        __('Interactive Hotspots', 'ar-vr-3d-model-try-on'),
        __('Slider/Multiple Model Display', 'ar-vr-3d-model-try-on'),
        __('Auto Compression (70% savings)', 'ar-vr-3d-model-try-on'),
        __('Unlimited 3D Model Uploads', 'ar-vr-3d-model-try-on'),
        __('Generate 3D by AI ( usage fees apply )', 'ar-vr-3d-model-try-on'),
        __('Full iOS & Android AR Support (USDZ + GLB)', 'ar-vr-3d-model-try-on'),
        __('WooCommerce Integration with Auto Buttons', 'ar-vr-3d-model-try-on'),
        __('QR Code Generation for Mobile AR', 'ar-vr-3d-model-try-on'),
        __('Priority Email Support (24h response)', 'ar-vr-3d-model-try-on'),
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
                          {__('Monthly', 'ar-vr-3d-model-try-on')}
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
                        {__('Yearly', 'ar-vr-3d-model-try-on')}
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
                        {__('Lifetime', 'ar-vr-3d-model-try-on')}
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
                                {__('Buy Now', 'ar-vr-3d-model-try-on')}
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
                     {__('✅ 14-Day Money-Back Guarantee • ✅ No Setup Fees • ✅ Cancel Anytime', 'ar-vr-3d-model-try-on')}
                </p>
            </div>
        </div>
    );
}