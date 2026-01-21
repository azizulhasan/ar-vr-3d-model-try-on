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

    // Server compression state
    const [serverLoading, setServerLoading] = useState(true);
    const [nodeStatus, setNodeStatus] = useState(null);
    const [dependenciesStatus, setDependenciesStatus] = useState(null);
    const [compressionMethod, setCompressionMethod] = useState('auto');
    const [apiUrl, setApiUrl] = useState('');
    const [installing, setInstalling] = useState(false);
    const [uninstalling, setUninstalling] = useState(false);

    // Fetch settings and user limit on mount
    useEffect(() => {
        fetchSettings();
        fetchUserLimit();
        fetchServerStatus();
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
     * Fetch server compression status (Node.js, dependencies, method, API URL)
     */
    const fetchServerStatus = async () => {
        try {
            // Fetch Node.js status
            const nodeResponse = await fetch(getURL('compression/node-status'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });
            const nodeData = await nodeResponse.json();
            if (nodeData.success) {
                setNodeStatus(nodeData.data);
            }

            // Fetch dependencies status
            const depsResponse = await fetch(getURL('compression/dependencies-status'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });
            const depsData = await depsResponse.json();
            if (depsData.success) {
                setDependenciesStatus(depsData.data);
            }

            // Fetch compression method
            const methodResponse = await fetch(getURL('compression/method'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });
            const methodData = await methodResponse.json();
            if (methodData.success) {
                setCompressionMethod(methodData.data.method);
            }

            // Fetch API URL
            const apiResponse = await fetch(getURL('compression/api-url'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });
            const apiData = await apiResponse.json();
            if (apiData.success) {
                setApiUrl(apiData.data.url);
            }
        } catch (error) {
            console.error('Error fetching server status:', error);
        } finally {
            setServerLoading(false);
        }
    };

    /**
     * Install dependencies
     */
    const handleInstallDependencies = async () => {
        if (!isProActive) {
            handleProFeatureClick('Local Compression');
            return;
        }

        setInstalling(true);
        toast.info('📦 Installing compression dependencies... This may take a few minutes.');

        try {
            const response = await fetch(getURL('compression/install-dependencies'), {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                toast.success('✅ Dependencies installed successfully!');
                await fetchServerStatus(); // Refresh status
            } else {
                throw new Error(data.message || 'Failed to install dependencies');
            }
        } catch (error) {
            console.error('Error installing dependencies:', error);
            toast.error('❌ Failed to install dependencies: ' + error.message);
        } finally {
            setInstalling(false);
        }
    };

    /**
     * Uninstall dependencies
     */
    const handleUninstallDependencies = async () => {
        if (!confirm('Are you sure you want to uninstall compression dependencies? This will remove all installed packages.')) {
            return;
        }

        setUninstalling(true);
        toast.info('🗑️ Uninstalling dependencies...');

        try {
            const response = await fetch(getURL('compression/uninstall-dependencies'), {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                toast.success('✅ Dependencies uninstalled successfully!');
                await fetchServerStatus(); // Refresh status
            } else {
                throw new Error(data.message || 'Failed to uninstall dependencies');
            }
        } catch (error) {
            console.error('Error uninstalling dependencies:', error);
            toast.error('❌ Failed to uninstall dependencies: ' + error.message);
        } finally {
            setUninstalling(false);
        }
    };

    /**
     * Update compression method
     */
    const handleMethodChange = async (method) => {
        try {
            const response = await fetch(getURL('compression/method'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({ method }),
            });

            const data = await response.json();
            if (data.success) {
                setCompressionMethod(method);
                toast.success('✅ Compression method updated!');
            } else {
                throw new Error(data.message || 'Failed to update method');
            }
        } catch (error) {
            console.error('Error updating method:', error);
            toast.error('❌ Failed to update method: ' + error.message);
        }
    };

    /**
     * Update API URL
     */
    const handleApiUrlChange = async (newUrl) => {
        try {
            const response = await fetch(getURL('compression/api-url'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({ url: newUrl }),
            });

            const data = await response.json();
            if (data.success) {
                setApiUrl(newUrl);
                toast.success('✅ API URL updated!');
            } else {
                throw new Error(data.message || 'Failed to update API URL');
            }
        } catch (error) {
            console.error('Error updating API URL:', error);
            toast.error('❌ Failed to update API URL: ' + error.message);
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
                    {!isProActive && (
                        <span className="art-text-blue-600 art-ml-1">
                            Free users can compress up to 5 models.
                        </span>
                    )}
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
                    <div className="art-mb-6">
                        <KeepOriginalToggle
                            keepOriginal={settings.keep_original}
                            onChange={(keep_original) => setSettings({ ...settings, keep_original })}
                        />
                    </div>

                    {/* Supported Formats */}
                    <div className="art-mb-6">
                        <SupportedFormats
                            isProActive={isProActive}
                            onProFeatureClick={handleProFeatureClick}
                        />
                    </div>

                    {/* Server-Side Compression Setup */}
                    <div className="art-mb-6 art-p-4 art-bg-gradient-to-r art-from-purple-50 art-to-blue-50 art-border art-border-purple-200 art-rounded-lg">
                        <div className="art-mb-4">
                            <h3 className="art-text-lg art-font-semibold art-text-gray-900 art-mb-2">
                                ⚡ Server-Side Compression Setup
                            </h3>
                            <p className="art-text-sm art-text-gray-600">
                                Configure advanced compression for better performance and quality.
                            </p>
                        </div>

                        {serverLoading ? (
                            <div className="art-flex art-items-center art-justify-center art-py-6">
                                <div className="art-animate-spin art-rounded-full art-h-8 art-w-8 art-border-b-2 art-border-purple-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* Compression Method Selection */}
                                <div className="art-mb-4 art-p-3 art-bg-white art-rounded-md">
                                    <label className="art-block art-text-sm art-font-semibold art-text-gray-900 art-mb-2">
                                        Compression Method
                                    </label>
                                    <div className="art-space-y-2">
                                        {/* Automatic */}
                                        <label className="art-flex art-items-start art-p-2 art-border art-border-gray-200 art-rounded art-cursor-pointer hover:art-bg-gray-50">
                                            <input
                                                type="radio"
                                                name="compression_method"
                                                value="auto"
                                                checked={compressionMethod === 'auto'}
                                                onChange={(e) => handleMethodChange(e.target.value)}
                                                className="art-mt-0.5 art-mr-3"
                                            />
                                            <div>
                                                <div className="art-font-medium art-text-sm art-text-gray-900">
                                                    🎯 Automatic (Recommended)
                                                </div>
                                                <div className="art-text-xs art-text-gray-600">
                                                    Try local first for fastest compression, fallback to API if unavailable
                                                </div>
                                            </div>
                                        </label>

                                        {/* Local Only */}
                                        <label className="art-flex art-items-start art-p-2 art-border art-border-gray-200 art-rounded art-cursor-pointer hover:art-bg-gray-50">
                                            <input
                                                type="radio"
                                                name="compression_method"
                                                value="local"
                                                checked={compressionMethod === 'local'}
                                                onChange={(e) => handleMethodChange(e.target.value)}
                                                className="art-mt-0.5 art-mr-3"
                                            />
                                            <div>
                                                <div className="art-font-medium art-text-sm art-text-gray-900">
                                                    💻 Local Only
                                                </div>
                                                <div className="art-text-xs art-text-gray-600">
                                                    Use only local Node.js compression (fastest, requires dependencies)
                                                </div>
                                            </div>
                                        </label>

                                        {/* API Only */}
                                        <label className="art-flex art-items-start art-p-2 art-border art-border-gray-200 art-rounded art-cursor-pointer hover:art-bg-gray-50">
                                            <input
                                                type="radio"
                                                name="compression_method"
                                                value="api"
                                                checked={compressionMethod === 'api'}
                                                onChange={(e) => handleMethodChange(e.target.value)}
                                                className="art-mt-0.5 art-mr-3"
                                            />
                                            <div>
                                                <div className="art-font-medium art-text-sm art-text-gray-900">
                                                    🌐 API Only
                                                </div>
                                                <div className="art-text-xs art-text-gray-600">
                                                    Use only external API compression (slower, no local dependencies needed)
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Local Compression Setup */}
                                <div className="art-mb-4 art-p-3 art-bg-white art-rounded-md">
                                    <div className="art-flex art-items-center art-justify-between art-mb-3">
                                        <h4 className="art-text-sm art-font-semibold art-text-gray-900">
                                            💻 Local Compression
                                        </h4>
                                        {!isProActive && (
                                            <span className="art-px-2 art-py-0.5 art-text-xs art-font-medium art-bg-yellow-100 art-text-yellow-800 art-rounded">
                                                PRO
                                            </span>
                                        )}
                                    </div>

                                    {/* Node.js Status */}
                                    <div className="art-mb-3 art-flex art-items-center art-justify-between art-p-2 art-bg-gray-50 art-rounded">
                                        <span className="art-text-sm art-text-gray-700">Node.js Status:</span>
                                        {nodeStatus?.available ? (
                                            <span className="art-text-sm art-text-green-600 art-font-medium">
                                                ✅ Available ({nodeStatus.version})
                                            </span>
                                        ) : (
                                            <span className="art-text-sm art-text-red-600 art-font-medium">
                                                ❌ Not Available
                                            </span>
                                        )}
                                    </div>

                                    {/* Dependencies Status */}
                                    <div className="art-mb-3 art-p-2 art-bg-gray-50 art-rounded">
                                        <div className="art-flex art-items-center art-justify-between art-mb-2">
                                            <span className="art-text-sm art-text-gray-700">Dependencies:</span>
                                            {dependenciesStatus?.installed ? (
                                                <span className="art-text-sm art-text-green-600 art-font-medium">
                                                    ✅ Installed
                                                </span>
                                            ) : (
                                                <span className="art-text-sm art-text-orange-600 art-font-medium">
                                                    ⚠️ Not Installed
                                                </span>
                                            )}
                                        </div>
                                        {dependenciesStatus?.installed && dependenciesStatus?.packages && (
                                            <div className="art-text-xs art-text-gray-600 art-space-y-1">
                                                {Object.entries(dependenciesStatus.packages).map( (packageObj, index) => (
                                                    <div key={packageObj.name} className="art-flex art-justify-between">
                                                        <span>{packageObj.name}</span>
                                                        <span className="art-text-gray-500">{packageObj.version}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Install/Uninstall Buttons */}
                                    <div className="art-flex art-gap-2">
                                        {!dependenciesStatus?.installed ? (
                                            <button
                                                onClick={handleInstallDependencies}
                                                disabled={installing || !nodeStatus?.available || !isProActive}
                                                className={`art-flex-1 art-px-4 art-py-2 art-text-sm art-font-medium art-rounded-md ${
                                                    installing || !nodeStatus?.available || !isProActive
                                                        ? 'art-bg-gray-300 art-text-gray-600 art-cursor-not-allowed'
                                                        : 'art-bg-green-600 art-text-white hover:art-bg-green-700'
                                                }`}
                                            >
                                                {installing ? (
                                                    <>
                                                        <span className="art-inline-block art-animate-spin art-mr-2">⏳</span>
                                                        Installing...
                                                    </>
                                                ) : !isProActive ? (
                                                    '🔒 Upgrade to Install'
                                                ) : !nodeStatus?.available ? (
                                                    '❌ Node.js Required'
                                                ) : (
                                                    '📦 Install Dependencies'
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleUninstallDependencies}
                                                disabled={uninstalling}
                                                className={`art-flex-1 art-px-4 art-py-2 art-text-sm art-font-medium art-rounded-md ${
                                                    uninstalling
                                                        ? 'art-bg-gray-300 art-text-gray-600 art-cursor-not-allowed'
                                                        : 'art-bg-red-600 art-text-white hover:art-bg-red-700'
                                                }`}
                                            >
                                                {uninstalling ? (
                                                    <>
                                                        <span className="art-inline-block art-animate-spin art-mr-2">⏳</span>
                                                        Uninstalling...
                                                    </>
                                                ) : (
                                                    '🗑️ Uninstall Dependencies'
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Node.js Not Available Notice */}
                                    {!nodeStatus?.available && (
                                        <div className="art-mt-3 art-p-2 art-bg-yellow-50 art-border art-border-yellow-200 art-rounded art-text-xs art-text-yellow-800">
                                            ⚠️ Node.js is not available on your server. You can still use API compression below.
                                        </div>
                                    )}

                                    {/* Performance Notice */}
                                    {isProActive && dependenciesStatus?.installed && (
                                        <div className="art-mt-3 art-p-2 art-bg-green-50 art-border art-border-green-200 art-rounded art-text-xs art-text-green-800">
                                            ⚡ Local compression is up to 10x faster than API compression!
                                        </div>
                                    )}
                                </div>

                                {/* API Compression Setup */}
                                <div className="art-p-3 art-bg-white art-rounded-md">
                                    <h4 className="art-text-sm art-font-semibold art-text-gray-900 art-mb-3">
                                        🌐 API Compression
                                    </h4>

                                    <div className="art-mb-3">
                                        <label className="art-block art-text-xs art-text-gray-700 art-mb-1">
                                            API URL
                                        </label>
                                        <input
                                            type="url"
                                            value={apiUrl}
                                            onChange={(e) => setApiUrl(e.target.value)}
                                            onBlur={(e) => handleApiUrlChange(e.target.value)}
                                            placeholder="http://localhost:3000"
                                            className="art-w-full art-px-3 art-py-2 art-text-sm art-border art-border-gray-300 art-rounded-md focus:art-outline-none focus:art-ring-2 focus:art-ring-blue-500"
                                        />
                                    </div>

                                    {/* API Performance Notice */}
                                    <div className="art-p-2 art-bg-blue-50 art-border art-border-blue-200 art-rounded art-text-xs art-text-blue-800">
                                        ℹ️ API compression is slower than local compression but doesn't require Node.js on your server.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Free User Limit */}
                    {!isProActive && (
                        <div className="art-mb-6 art-p-4 art-bg-blue-50 art-border art-border-blue-200 art-rounded-lg">
                            <div className="art-flex art-items-start art-justify-between">
                                <div className="art-flex-1">
                                    <h3 className="art-text-sm art-font-semibold art-text-gray-900 art-mb-1">
                                        Free User Limit
                                    </h3>
                                    <p className="art-text-sm art-text-gray-600 art-mb-2">
                                        You have compressed <strong>{userLimit.used}</strong> out of{' '}
                                        <strong>{userLimit.limit}</strong> models.
                                        {userLimit.at_limit && (
                                            <span className="art-text-orange-600 art-ml-1">
                                                ⚠️ Limit reached. Delete a compressed model to compress new ones.
                                            </span>
                                        )}
                                    </p>
                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="art-text-sm art-text-blue-600 hover:art-text-blue-800 art-font-medium"
                                    >
                                        Manage Compressed Models →
                                    </button>
                                </div>
                                <div className="art-ml-4">
                                    <div className="art-text-2xl art-font-bold art-text-blue-600">
                                        {userLimit.used}/{userLimit.limit}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Compression (Pro) */}
                    <div className="art-mb-6 art-p-4 art-bg-gray-50 art-border art-border-gray-200 art-rounded-lg">
                        <div className="art-flex art-items-start art-justify-between">
                            <div className="art-flex-1">
                                <div className="art-flex art-items-center art-mb-2">
                                    <h3 className="art-text-sm art-font-semibold art-text-gray-900">
                                        Bulk Compression
                                    </h3>
                                    {!isProActive && (
                                        <span className="art-ml-2 art-px-2 art-py-0.5 art-text-xs art-font-medium art-bg-yellow-100 art-text-yellow-800 art-rounded">
                                            PRO
                                        </span>
                                    )}
                                </div>
                                <p className="art-text-sm art-text-gray-600 art-mb-3">
                                    Compress all existing models at once. Save hours of manual work!
                                </p>
                                <button
                                    onClick={handleBulkCompress}
                                    disabled={!isProActive}
                                    className={`art-px-4 art-py-2 art-text-sm art-font-medium art-rounded-md ${
                                        isProActive
                                            ? 'art-bg-blue-600 art-text-white hover:art-bg-blue-700'
                                            : 'art-bg-gray-300 art-text-gray-600 art-cursor-not-allowed'
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
