import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import Welcome from './Welcome';
import FeatureComparison from './FeatureComparison';
// import Demos from './Demos';
import Pricing from './Pricing';

/**
 * Overview Wrapper Component
 *
 * Provides subtab navigation for Overview page:
 * - Welcome (new)
 *
 * @since 1.8.0
 */
export default function OverviewWrapper() {
    const [activeSubtab, setActiveSubtab] = useState('welcome');
    
    const subtabs = [
        {
            id: 'welcome',
            name: __('Welcome', 'ar-vr-3d-model-try-on'),
            icon: '👋',
        },
        // {
        //     id: 'demos',
        //     name: __('Demos', 'ar-vr-3d-model-try-on'),
        //     icon: '🎮',
        // },
        {
            id: 'pricing',
            name: __('Pricing', 'ar-vr-3d-model-try-on'),
            icon: '💰',
        },
        {
            id: 'feature-comparison',
            name: __('Feature Comparison', 'ar-vr-3d-model-try-on'),
            icon: '📊',
        },
    ];

    return (
        <div className="art-w-full">
            {/* Subtab Navigation */}
            <div
                className="art-border-b art-border-gray-200 art-mb-6"
                style={{
                    backgroundColor: "var(--theme-bg)",
                    borderBottom: "1px solid var(--theme-accent)",
                }}
            >
                <nav className="art-flex art-space-x-8 art-px-6" aria-label={__('Subtabs', 'ar-vr-3d-model-try-on')}>
                    {subtabs.map((subtab) => (
                        <button
                            key={subtab.id}
                            onClick={() => setActiveSubtab(subtab.id)}
                            className={`art-py-4 art-px-1 art-border-b-2 art-font-medium art-text-sm art-transition-colors art-duration-200 art-cursor-pointer art-bg-transparent ${
                                activeSubtab === subtab.id
                                    ? 'art-border-blue-500'
                                    : 'art-border-transparent hover:art-border-gray-300'
                            }`}
                            style={{
                                color: activeSubtab === subtab.id ? 'rgb(59,130,246)' : 'var(--theme-text)',
                                borderBottomColor: activeSubtab === subtab.id ? 'rgb(59,130,246)' : 'transparent',
                                outline: 'none',
                            }}
                            aria-current={activeSubtab === subtab.id ? 'page' : undefined}
                        >
                            <span className="art-mr-2">{subtab.icon}</span>
                            {subtab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Subtab Content */}
            <div className="art-px-6 art-pb-6">
                {activeSubtab === 'welcome' && <Welcome />}
                {/* {activeSubtab === 'demos' && <Demos/>} */}
                {activeSubtab === 'pricing' && <Pricing/>}
                {activeSubtab === 'feature-comparison' && <FeatureComparison />}
            </div>
        </div>
    );
}