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
        keep_original: true,
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
     * Handle Pro feature click (show upgrade toast)
     */
    const handleProFeatureClick = (featureName) => {
        toast.info(
            `🔒 ${featureName} is a Pro feature. Upgrade to unlock this powerful feature!`,
            {
                position: 'top-center',
                autoClose: 5000,
                onClick: () => {
                    window.open('https://wpaugmentedreality.com/pricing/', '_blank');
                },
            }
        );
    };

    /**
     * Handle bulk compress (Pro only)
     */
    const handleBulkCompress = () => {
        if (!isProActive) {
            handleProFeatureClick('Bulk Compression');
            return;
        }

        // TODO: Implement bulk compression
        toast.info('🚀 Bulk compression will be implemented in the next phase');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="compression-settings p-6 bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    3D Model Compression Settings
                </h2>
                <p className="text-gray-600">
                    Automatically compress 3D models to reduce file sizes and improve loading speed.
                    {!isProActive && (
                        <span className="text-blue-600 ml-1">
                            Free users can compress up to 5 models.
                        </span>
                    )}
                </p>
            </div>

            {/* Enable/Disable Compression */}
            <div className="mb-6">
                <CompressionToggle
                    enabled={settings.enabled}
                    onChange={(enabled) => setSettings({ ...settings, enabled })}
                />
            </div>

            {/* Settings (only show if compression is enabled) */}
            {settings.enabled && (
                <>
                    {/* Quality Slider */}
                    <div className="mb-6">
                        <QualitySlider
                            quality={settings.quality}
                            onChange={(quality) => setSettings({ ...settings, quality })}
                        />
                    </div>

                    {/* Keep Original Files */}
                    <div className="mb-6">
                        <KeepOriginalToggle
                            keepOriginal={settings.keep_original}
                            onChange={(keep_original) => setSettings({ ...settings, keep_original })}
                        />
                    </div>

                    {/* Supported Formats */}
                    <div className="mb-6">
                        <SupportedFormats
                            isProActive={isProActive}
                            onProFeatureClick={handleProFeatureClick}
                        />
                    </div>

                    {/* Free User Limit */}
                    {!isProActive && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                        Free User Limit
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        You have compressed <strong>{userLimit.used}</strong> out of{' '}
                                        <strong>{userLimit.limit}</strong> models.
                                        {userLimit.at_limit && (
                                            <span className="text-orange-600 ml-1">
                                                ⚠️ Limit reached. Delete a compressed model to compress new ones.
                                            </span>
                                        )}
                                    </p>
                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Manage Compressed Models →
                                    </button>
                                </div>
                                <div className="ml-4">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {userLimit.used}/{userLimit.limit}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Compression (Pro) */}
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        Bulk Compression
                                    </h3>
                                    {!isProActive && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                            PRO
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                    Compress all existing models at once. Save hours of manual work!
                                </p>
                                <button
                                    onClick={handleBulkCompress}
                                    disabled={!isProActive}
                                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                                        isProActive
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    }`}
                                >
                                    {isProActive ? '🚀 Compress All Models' : '🔒 Upgrade to Pro'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Compression Statistics (Pro) */}
                    {isProActive && (
                        <>
                            <div className="mb-6">
                                <CompressionStats />
                            </div>

                            {/* Analytics Dashboard (Pro) */}
                            <div className="mb-6">
                                <AnalyticsDashboard />
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                    Changes will take effect immediately after saving.
                </div>
                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <span className="inline-block animate-spin mr-2">⏳</span>
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
