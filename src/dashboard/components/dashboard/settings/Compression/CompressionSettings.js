import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CompressionToggle from './CompressionToggle';
import QualitySlider from './QualitySlider';
import KeepOriginalToggle from './KeepOriginalToggle';
import SupportedFormats from './SupportedFormats';
import CompressionStats from './CompressionStats';
import AnalyticsDashboard from './AnalyticsDashboard';
import ManageModelsModal from './ManageModelsModal';
import {getURL} from "../../../../../context/utilities";
import PremiumBadge from "../../../../../context/PremiumBadge";

/**
 * Compression Settings Component
 *
 * Main settings panel for 3D model compression feature.
 *
 * @since 1.8.0
 */
export default function CompressionSettings({ isProActive }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        enabled: true,
        quality: 85,
        keep_original: false,
        auto_compress: true,
    });
    const [userLimit, setUserLimit] = useState({
        can_compress: true,
        limit: -1,
        used: 0,
        remaining: 0,
        at_limit: false,
    });
    const [showManageModal, setShowManageModal] = useState(false);

    // Fetch settings and user limit on mount
    useEffect(() => {
        fetchSettings();
        fetchUserLimit();
    }, []);

    /**
     * Fetch compression settings from API
     */
    const fetchSettings = async () => {
        try {
            const response = await fetch(getURL('compression/settings'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch settings');

            const data = await response.json();
            if (data.success) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load compression settings');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Fetch user compression limit
     */
    const fetchUserLimit = async () => {
        try {
            const response = await fetch(getURL('compression/can-compress'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch user limit');

            const data = await response.json();
            if (data.success) {
                setUserLimit(data.data);
            }
        } catch (error) {
            console.error('Error fetching user limit:', error);
        }
    };

    /**
     * Save settings to API
     */
    const handleSaveSettings = async () => {
        setSaving(true);

        try {
            const response = await fetch(getURL('compression/settings'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify(settings),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            const data = await response.json();
            if (data.success) {
                toast.success('✅ Compression settings saved successfully!');
                setSettings(data.data);
            } else {
                throw new Error(data.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('❌ Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    /**
     * Handle Pro feature click — kept for backward compatibility with
     * the SupportedFormats subcomponent which still calls it. Now
     * delegates to a static upgrade link rather than a faux-toast that
     * pretended to do something. Will be removed once SupportedFormats
     * migrates fully to the PremiumBadge component.
     *
     * @since AR-61 §1.1 Phase 2
     */
    const handleProFeatureClick = (featureName) => {
        // Intentional no-op: the PremiumBadge component now handles
        // the upgrade-link UI in a visible, non-modal way.
    };

    /**
     * Handle bulk compress (Pro only). When Pro is loaded, Pro's own
     * dashboard tab handles this. Free never reaches this handler
     * because the locked button is replaced with a PremiumBadge link
     * in the JSX below.
     *
     * @since AR-61 §1.1 Phase 2
     */
    const handleBulkCompress = () => {
        // Pro replaces the Bulk Compression card with its own
        // implementation via the Phase 3 extension hooks; this handler
        // exists only as a fallback if a future build ships the button
        // without the badge. Stays a no-op in Free.
    };

    if (loading) {
        return (
            <div className="art-flex art-items-center art-justify-center art-py-12">
                <div className="art-animate-spin art-rounded-full art-h-12 art-w-12 art-border-b-2 art-border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="compression-settings art-p-6 art-bg-white art-rounded-lg art-shadow-sm">
            {/* Header */}
            <div className="art-mb-6">
                <h2 className="art-text-2xl art-font-bold art-text-gray-900 art-mb-2">
                    3D Model Compression Settings
                </h2>
                <p className="art-text-gray-600">
                    Automatically compress 3D models to reduce file sizes and improve loading speed.
                </p>
            </div>

            {/* Enable/Disable Compression */}
            <div className="art-mb-6">
                <CompressionToggle
                    enabled={settings.enabled}
                    onChange={(enabled) => setSettings({ ...settings, enabled })}
                />
            </div>

            {/* Settings (only show if compression is enabled) */}
            {settings.enabled && (
                <>
                    {/* Quality Slider */}
                    <div className="art-mb-6">
                        <QualitySlider
                            quality={settings.quality}
                            onChange={(quality) => setSettings({ ...settings, quality })}
                        />
                    </div>

                    {/* Keep Original Files */}
                    {/*<div className="art-mb-6">*/}
                    {/*    <KeepOriginalToggle*/}
                    {/*        keepOriginal={settings.keep_original}*/}
                    {/*        onChange={(keep_original) => setSettings({ ...settings, keep_original })}*/}
                    {/*    />*/}
                    {/*</div>*/}

                    {/* Supported Formats */}
                    <div className="art-mb-6">
                        <SupportedFormats
                            isProActive={isProActive}
                            onProFeatureClick={handleProFeatureClick}
                        />
                    </div>

                    {/*
                     * The Free 5-model cap and its "Free User Limit"
                     * progress block were removed in AR-61 §1.1 Phase 1.
                     * Free has unlimited compressions now.
                     */}

                    {/* Bulk Compression — Pro only */}
                    {isProActive ? (
                        <div className="art-mb-6 art-p-4 art-bg-gray-50 art-border art-border-gray-200 art-rounded-lg">
                            <div className="art-flex art-items-start art-justify-between">
                                <div className="art-flex-1">
                                    <h3 className="art-text-sm art-font-semibold art-text-gray-900 art-mb-2">
                                        Bulk Compression
                                    </h3>
                                    <p className="art-text-sm art-text-gray-600 art-mb-3">
                                        Compress all existing models at once. Save hours of manual work!
                                    </p>
                                    <button
                                        onClick={handleBulkCompress}
                                        className="art-px-4 art-py-2 art-text-sm art-font-medium art-rounded-md art-bg-blue-600 art-text-white hover:art-bg-blue-700"
                                    >
                                        🚀 Compress All Models
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="art-mb-6">
                            <PremiumBadge feature="bulk-compression">
                                <strong>Bulk compress all models</strong> — one click runs
                                the compression pipeline across every product on your
                                site. Available in AtlasAR Pro.
                            </PremiumBadge>
                        </div>
                    )}

                    {/* Compression Statistics (Pro) */}
                    {isProActive && (
                        <>
                            <div className="art-mb-6">
                                <CompressionStats />
                            </div>

                            {/* Analytics Dashboard (Pro) */}
                            <div className="art-mb-6">
                                <AnalyticsDashboard />
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Save Button */}
            <div className="art-flex art-items-center art-justify-between art-pt-6 art-border-t art-border-gray-200">
                <div className="art-text-sm art-text-gray-500">
                    Changes will take effect immediately after saving.
                </div>
                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="art-px-6 art-py-2 art-bg-blue-600 art-text-white art-font-medium art-rounded-md hover:art-bg-blue-700 disabled:art-bg-gray-400 disabled:art-cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <span className="art-inline-block art-animate-spin art-mr-2">⏳</span>
                            Saving...
                        </>
                    ) : (
                        '💾 Save Settings'
                    )}
                </button>
            </div>

            {/* Manage Models Modal */}
            {showManageModal && (
                <ManageModelsModal
                    isOpen={showManageModal}
                    onClose={() => {
                        setShowManageModal(false);
                        fetchUserLimit(); // Refresh limit after closing
                    }}
                />
            )}
        </div>
    );
}
