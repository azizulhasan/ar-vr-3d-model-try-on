import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import Settings from './Settings';
import CompressionSettings from './Compression/CompressionSettings';

/**
 * Settings Wrapper Component
 *
 * Provides subtab navigation for Settings page:
 * - General Settings (existing)
 * - Compression Settings (new)
 *
 * @since 1.8.0
 */
export default function SettingsWrapper({ setHeaders, settings, handleChange }) {
    const [activeSubtab, setActiveSubtab] = useState('general');

    // Check if Pro is active
    const isProActive = window.ar_try_on?.is_pro_active === '1' || window.ar_try_on?.is_pro_active === true;

    const subtabs = [
        {
            id: 'general',
            name: __('General', 'ar-vr-3d-model-try-on'),
            icon: '⚙️',
        },
        {
            id: 'compression',
            name: __('Compression', 'ar-vr-3d-model-try-on'),
            icon: '🗜️',
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
                {activeSubtab === 'general' && (
                    <Settings
                        setHeaders={setHeaders}
                        settings={settings}
                        handleChange={handleChange}
                    />
                )}

                {activeSubtab === 'compression' && (
                    <CompressionSettings isProActive={isProActive} />
                )}
            </div>
        </div>
    );
}
