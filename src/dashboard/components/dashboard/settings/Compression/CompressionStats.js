import { useState, useEffect } from 'react';
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

            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            toast.error('Failed to load compression statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-300 rounded"></div>
                        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats || !stats.total_compressions) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Compression Statistics
                </h3>
                <p className="text-sm text-gray-600">
                    No compression data available yet. Start compressing models to see statistics!
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                    📊 Compression Statistics
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                    PRO
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">
                        {stats.total_compressions || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Total Models</div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-green-600">
                        {stats.avg_compression_ratio || 0}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Avg. Reduction</div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">
                        {stats.total_saved_space_formatted || '0 MB'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Space Saved</div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-2xl font-bold text-orange-600">
                        {stats.successful_compressions || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Successful</div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Original Size:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                            {stats.total_original_size_formatted || '0 MB'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Compressed Size:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                            {stats.total_compressed_size_formatted || '0 MB'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="ml-2 font-semibold text-green-600">
                            {stats.total_compressions > 0
                                ? Math.round(
                                      (stats.successful_compressions / stats.total_compressions) * 100
                                  )
                                : 0}
                            %
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Failed:</span>
                        <span className="ml-2 font-semibold text-red-600">
                            {stats.failed_compressions || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="mt-4 text-center">
                <button
                    onClick={fetchStats}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    🔄 Refresh Statistics
                </button>
            </div>
        </div>
    );
}
