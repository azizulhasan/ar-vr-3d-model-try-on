import { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { toast } from 'react-toastify';
import {getURL} from "../../../../../context/utilities";

/**
 * Compression Statistics Component (Pro Only)
 *
 * Display compression statistics and savings.
 *
 * @since 1.8.0
 */
export default function CompressionStats() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(getURL('compression/stats'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) throw new Error(__('Failed to fetch stats', 'ar-vr-3d-model-try-on'));

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            toast.error(__('Failed to load compression statistics', 'ar-vr-3d-model-try-on'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
                <div className="art-animate-pulse">
                    <div className="art-h-4 art-bg-gray-300 art-rounded art-w-1/3 art-mb-4"></div>
                    <div className="art-space-y-2">
                        <div className="art-h-3 art-bg-gray-300 art-rounded"></div>
                        <div className="art-h-3 art-bg-gray-300 art-rounded art-w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats || !stats.total_compressions) {
        return (
            <div className="art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200">
                <h3 className="art-text-base art-font-semibold art-text-gray-900 art-mb-2">
                    {__('Compression Statistics', 'ar-vr-3d-model-try-on')}
                </h3>
                <p className="art-text-sm art-text-gray-600">
                    {__('No compression data available yet. Start compressing models to see statistics!', 'ar-vr-3d-model-try-on')}
                </p>
            </div>
        );
    }

    return (
        <div className="art-p-4 art-bg-gradient-to-br art-from-blue-50 art-to-indigo-50 art-rounded-lg art-border art-border-blue-200">
            <div className="art-flex art-items-center art-justify-between art-mb-4">
                <h3 className="art-text-base art-font-semibold art-text-gray-900">
                    {__('📊 Compression Statistics', 'ar-vr-3d-model-try-on')}
                </h3>
                <span className="art-px-2 art-py-1 art-text-xs art-font-medium art-bg-green-100 art-text-green-800 art-rounded">
                    {__('PRO', 'ar-vr-3d-model-try-on')}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="art-grid art-grid-cols-2 md:art-grid-cols-4 art-gap-4 art-mb-4">
                <div className="art-bg-white art-p-3 art-rounded-lg art-shadow-sm">
                    <div className="art-text-2xl art-font-bold art-text-blue-600">
                        {stats.total_compressions || 0}
                    </div>
                    <div className="art-text-xs art-text-gray-600 art-mt-1">{__('Total Models', 'ar-vr-3d-model-try-on')}</div>
                </div>

                <div className="art-bg-white art-p-3 art-rounded-lg art-shadow-sm">
                    <div className="art-text-2xl art-font-bold art-text-green-600">
                        {stats.avg_compression_ratio || 0}%
                    </div>
                    <div className="art-text-xs art-text-gray-600 art-mt-1">{__('Avg. Reduction', 'ar-vr-3d-model-try-on')}</div>
                </div>

                <div className="art-bg-white art-p-3 art-rounded-lg art-shadow-sm">
                    <div className="art-text-2xl art-font-bold art-text-purple-600">
                        {stats.total_saved_space_formatted || '0 MB'}
                    </div>
                    <div className="art-text-xs art-text-gray-600 art-mt-1">{__('Space Saved', 'ar-vr-3d-model-try-on')}</div>
                </div>

                <div className="art-bg-white art-p-3 art-rounded-lg art-shadow-sm">
                    <div className="art-text-2xl art-font-bold art-text-orange-600">
                        {stats.successful_compressions || 0}
                    </div>
                    <div className="art-text-xs art-text-gray-600 art-mt-1">{__('Successful', 'ar-vr-3d-model-try-on')}</div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="art-bg-white art-p-3 art-rounded-lg art-shadow-sm">
                <div className="art-grid art-grid-cols-2 art-gap-4 art-text-sm">
                    <div>
                        <span className="art-text-gray-600">{__('Original Size:', 'ar-vr-3d-model-try-on')}</span>
                        <span className="art-ml-2 art-font-semibold art-text-gray-900">
                            {stats.total_original_size_formatted || '0 MB'}
                        </span>
                    </div>
                    <div>
                        <span className="art-text-gray-600">{__('Compressed Size:', 'ar-vr-3d-model-try-on')}</span>
                        <span className="art-ml-2 art-font-semibold art-text-gray-900">
                            {stats.total_compressed_size_formatted || '0 MB'}
                        </span>
                    </div>
                    <div>
                        <span className="art-text-gray-600">{__('Success Rate:', 'ar-vr-3d-model-try-on')}</span>
                        <span className="art-ml-2 art-font-semibold art-text-green-600">
                            {stats.total_compressions > 0
                                ? Math.round(
                                      (stats.successful_compressions / stats.total_compressions) * 100
                                  )
                                : 0}
                            %
                        </span>
                    </div>
                    <div>
                        <span className="art-text-gray-600">{__('Failed:', 'ar-vr-3d-model-try-on')}</span>
                        <span className="art-ml-2 art-font-semibold art-text-red-600">
                            {stats.failed_compressions || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="art-mt-4 art-text-center">
                <button
                    onClick={fetchStats}
                    className="art-text-sm art-text-blue-600 hover:art-text-blue-800 art-font-medium"
                >
                    {__('🔄 Refresh Statistics', 'ar-vr-3d-model-try-on')}
                </button>
            </div>
        </div>
    );
}