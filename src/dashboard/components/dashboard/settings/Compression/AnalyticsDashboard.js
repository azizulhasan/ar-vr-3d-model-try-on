import { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { toast } from 'react-toastify';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import {getURL} from "../../../../../context/utilities";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Analytics Dashboard Component (Pro Only)
 *
 * Advanced analytics dashboard with interactive charts for compression data.
 *
 * @since 1.8.0
 */
export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [models, setModels] = useState([]);
    const [timeRange, setTimeRange] = useState('all'); // all, week, month
    const [activeTab, setActiveTab] = useState('overview'); // overview, trends, models

    useEffect(() => {
        fetchData();
    }, [timeRange]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch stats
            const statsResponse = await fetch(getURL('compression/stats'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!statsResponse.ok) throw new Error(__('Failed to fetch stats', 'ar-vr-3d-model-try-on'));

            const statsData = await statsResponse.json();
            if (statsData.success) {
                setStats(statsData.data);
            }

            // Fetch models list
            const modelsResponse = await fetch(getURL('compression/models?limit=100'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!modelsResponse.ok) throw new Error(__('Failed to fetch models', 'ar-vr-3d-model-try-on'));

            const modelsData = await modelsResponse.json();
            if (modelsData.success) {
                setModels(modelsData.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(__('Failed to load analytics data', 'ar-vr-3d-model-try-on'));
        } finally {
            setLoading(false);
        }
    };

    // Chart: Compression Ratio Distribution (Pie Chart)
    const getCompressionRatioChart = () => {
        if (!models.length) return null;

        const ranges = { 
            '0-25%': 0, 
            '25-50%': 0, 
            '50-75%': 0, 
            '75-100%': 0 
        };

        models.forEach((model) => {
            const ratio = parseFloat(model.compression_ratio);
            if (ratio <= 25) ranges['0-25%']++;
            else if (ratio <= 50) ranges['25-50%']++;
            else if (ratio <= 75) ranges['50-75%']++;
            else ranges['75-100%']++;
        });

        return {
            labels: Object.keys(ranges),
            datasets: [
                {
                    label: __('Models', 'ar-vr-3d-model-try-on'),
                    data: Object.values(ranges),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    };

    // Chart: File Size Comparison (Bar Chart)
    const getFileSizeChart = () => {
        if (!models.length) return null;

        const topModels = models.slice(0, 10);

        return {
            labels: topModels.map((m) => m.post_title || `${__('Model', 'ar-vr-3d-model-try-on')} ${m.post_id}`).map((t) => t.substring(0, 20)),
            datasets: [
                {
                    label: __('Original Size (MB)', 'ar-vr-3d-model-try-on'),
                    data: topModels.map((m) => (m.original_size / (1024 * 1024)).toFixed(2)),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: __('Compressed Size (MB)', 'ar-vr-3d-model-try-on'),
                    data: topModels.map((m) => (m.compressed_size / (1024 * 1024)).toFixed(2)),
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                },
            ],
        };
    };

    // Chart: Compression Trend Over Time (Line Chart)
    const getCompressionTrendChart = () => {
        if (!models.length) return null;

        // Group by date
        const dateGroups = {};
        models.forEach((model) => {
            const date = new Date(model.created_at).toLocaleDateString();
            if (!dateGroups[date]) {
                dateGroups[date] = { count: 0, totalRatio: 0 };
            }
            dateGroups[date].count++;
            dateGroups[date].totalRatio += parseFloat(model.compression_ratio);
        });

        const dates = Object.keys(dateGroups).sort();
        const avgRatios = dates.map((date) => (dateGroups[date].totalRatio / dateGroups[date].count).toFixed(1));
        const counts = dates.map((date) => dateGroups[date].count);

        return {
            labels: dates,
            datasets: [
                {
                    label: __('Avg. Compression Ratio (%)', 'ar-vr-3d-model-try-on'),
                    data: avgRatios,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y',
                },
                {
                    label: __('Models Compressed', 'ar-vr-3d-model-try-on'),
                    data: counts,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1',
                },
            ],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
    };

    const lineChartOptions = {
        ...chartOptions,
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: __('Compression Ratio (%)', 'ar-vr-3d-model-try-on'),
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: __('Model Count', 'ar-vr-3d-model-try-on'),
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    if (loading) {
        return (
            <div className="art-p-6 art-bg-white art-rounded-lg art-shadow">
                <div className="art-animate-pulse art-space-y-4">
                    <div className="art-h-8 art-bg-gray-300 art-rounded art-w-1/3"></div>
                    <div className="art-h-64 art-bg-gray-300 art-rounded"></div>
                    <div className="art-grid art-grid-cols-3 art-gap-4">
                        <div className="art-h-32 art-bg-gray-300 art-rounded"></div>
                        <div className="art-h-32 art-bg-gray-300 art-rounded"></div>
                        <div className="art-h-32 art-bg-gray-300 art-rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats || !stats.total_compressions) {
        return (
            <div className="art-p-6 art-bg-white art-rounded-lg art-shadow">
                <h2 className="art-text-xl art-font-bold art-text-gray-900 art-mb-4">
                    {__('📊 Analytics Dashboard', 'ar-vr-3d-model-try-on')}
                    <span className="art-ml-2 art-px-2 art-py-1 art-text-xs art-font-medium art-bg-green-100 art-text-green-800 art-rounded">
                        {__('PRO', 'ar-vr-3d-model-try-on')}
                    </span>
                </h2>
                <p className="art-text-gray-600">
                    {__('No compression data available yet. Start compressing models to see detailed analytics!', 'ar-vr-3d-model-try-on')}
                </p>
            </div>
        );
    }

    const compressionRatioData = getCompressionRatioChart();
    const fileSizeData = getFileSizeChart();
    const trendData = getCompressionTrendChart();

    return (
        <div className="art-space-y-6">
            {/* Header */}
            <div className="art-bg-white art-rounded-lg art-shadow art-p-6">
                <div className="art-flex art-items-center art-justify-between art-mb-6">
                    <div>
                        <h2 className="art-text-2xl art-font-bold art-text-gray-900">
                            {__('📊 Analytics Dashboard', 'ar-vr-3d-model-try-on')}
                            <span className="art-ml-2 art-px-2 art-py-1 art-text-xs art-font-medium art-bg-green-100 art-text-green-800 art-rounded">
                                {__('PRO', 'ar-vr-3d-model-try-on')}
                            </span>
                        </h2>
                        <p className="art-text-sm art-text-gray-600 art-mt-1">
                            {__('Advanced analytics and insights for your 3D model compression', 'ar-vr-3d-model-try-on')}
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="art-px-4 art-py-2 art-bg-blue-600 art-text-white art-rounded-lg hover:art-bg-blue-700 art-transition art-text-sm art-font-medium"
                    >
                        {__('🔄 Refresh Data', 'ar-vr-3d-model-try-on')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="art-border-b art-border-gray-200">
                    <nav className="art--mb-px art-flex art-space-x-8">
                        {[
                            { key: 'overview', label: __('Overview', 'ar-vr-3d-model-try-on') },
                            { key: 'trends', label: __('Trends', 'ar-vr-3d-model-try-on') },
                            { key: 'models', label: __('Models', 'ar-vr-3d-model-try-on') }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`art-py-2 art-px-1 art-border-b-2 art-font-medium art-text-sm ${
                                    activeTab === tab.key
                                        ? 'art-border-blue-500 art-text-blue-600'
                                        : 'art-border-transparent art-text-gray-500 hover:art-text-gray-700 hover:art-border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Key Metrics */}
                    <div className="art-grid art-grid-cols-1 md:art-grid-cols-2 lg:art-grid-cols-4 art-gap-4">
                        <div className="art-bg-gradient-to-br art-from-blue-500 art-to-blue-600 art-text-white art-rounded-lg art-shadow art-p-6">
                            <div className="art-text-4xl art-font-bold">{stats.total_compressions || 0}</div>
                            <div className="art-text-blue-100 art-mt-1">{__('Total Models Compressed', 'ar-vr-3d-model-try-on')}</div>
                        </div>

                        <div className="art-bg-gradient-to-br art-from-green-500 art-to-green-600 art-text-white art-rounded-lg art-shadow art-p-6">
                            <div className="art-text-4xl art-font-bold">{stats.avg_compression_ratio || 0}%</div>
                            <div className="art-text-green-100 art-mt-1">{__('Avg. Compression Ratio', 'ar-vr-3d-model-try-on')}</div>
                        </div>

                        <div className="art-bg-gradient-to-br art-from-purple-500 art-to-purple-600 art-text-white art-rounded-lg art-shadow art-p-6">
                            <div className="art-text-4xl art-font-bold">{stats.total_saved_space_formatted || '0 MB'}</div>
                            <div className="art-text-purple-100 art-mt-1">{__('Total Space Saved', 'ar-vr-3d-model-try-on')}</div>
                        </div>

                        <div className="art-bg-gradient-to-br art-from-orange-500 art-to-orange-600 art-text-white art-rounded-lg art-shadow art-p-6">
                            <div className="art-text-4xl art-font-bold">
                                {stats.total_compressions > 0
                                    ? Math.round((stats.successful_compressions / stats.total_compressions) * 100)
                                    : 0}
                                %
                            </div>
                            <div className="art-text-orange-100 art-mt-1">{__('Success Rate', 'ar-vr-3d-model-try-on')}</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="art-grid art-grid-cols-1 lg:art-grid-cols-2 art-gap-6">
                        {compressionRatioData && (
                            <div className="art-bg-white art-rounded-lg art-shadow art-p-6">
                                <h3 className="art-text-lg art-font-semibold art-text-gray-900 art-mb-4">
                                    {__('Compression Ratio Distribution', 'ar-vr-3d-model-try-on')}
                                </h3>
                                <div className="art-h-64">
                                    <Pie data={compressionRatioData} options={chartOptions} />
                                </div>
                            </div>
                        )}

                        {fileSizeData && (
                            <div className="art-bg-white art-rounded-lg art-shadow art-p-6">
                                <h3 className="art-text-lg art-font-semibold art-text-gray-900 art-mb-4">
                                    {__('Top 10 Models - Size Comparison', 'ar-vr-3d-model-try-on')}
                                </h3>
                                <div className="art-h-64">
                                    <Bar data={fileSizeData} options={chartOptions} />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && trendData && (
                <div className="art-bg-white art-rounded-lg art-shadow art-p-6">
                    <h3 className="art-text-lg art-font-semibold art-text-gray-900 art-mb-4">
                        {__('Compression Trends Over Time', 'ar-vr-3d-model-try-on')}
                    </h3>
                    <div className="art-h-96">
                        <Line data={trendData} options={lineChartOptions} />
                    </div>
                </div>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
                <div className="art-bg-white art-rounded-lg art-shadow art-overflow-hidden">
                    <div className="art-px-6 art-py-4 art-border-b art-border-gray-200">
                        <h3 className="art-text-lg art-font-semibold art-text-gray-900">
                            {__('Compressed Models', 'ar-vr-3d-model-try-on')}
                        </h3>
                    </div>
                    <div className="art-overflow-x-auto">
                        <table className="art-min-w-full art-divide-y art-divide-gray-200">
                            <thead className="art-bg-gray-50">
                                <tr>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Model', 'ar-vr-3d-model-try-on')}
                                    </th>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Original Size', 'ar-vr-3d-model-try-on')}
                                    </th>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Compressed Size', 'ar-vr-3d-model-try-on')}
                                    </th>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Ratio', 'ar-vr-3d-model-try-on')}
                                    </th>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Saved', 'ar-vr-3d-model-try-on')}
                                    </th>
                                    <th className="art-px-6 art-py-3 art-text-left art-text-xs art-font-medium art-text-gray-500 art-uppercase art-tracking-wider">
                                        {__('Status', 'ar-vr-3d-model-try-on')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="art-bg-white art-divide-y art-divide-gray-200">
                                {models.slice(0, 20).map((model) => (
                                    <tr key={model.id} className="hover:art-bg-gray-50">
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap art-text-sm art-font-medium art-text-gray-900">
                                            {model.post_title || `${__('Model', 'ar-vr-3d-model-try-on')} ${model.post_id}`}
                                        </td>
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap art-text-sm art-text-gray-500">
                                            {model.original_size_formatted}
                                        </td>
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap art-text-sm art-text-gray-500">
                                            {model.compressed_size_formatted}
                                        </td>
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap art-text-sm art-text-gray-500">
                                            <span className="art-px-2 art-py-1 art-bg-green-100 art-text-green-800 art-rounded art-font-medium">
                                                {model.compression_ratio}%
                                            </span>
                                        </td>
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap art-text-sm art-text-gray-500">
                                            {model.saved_space_formatted}
                                        </td>
                                        <td className="art-px-6 art-py-4 art-whitespace-nowrap">
                                            <span
                                                className={`art-px-2 art-py-1 art-text-xs art-font-medium art-rounded ${
                                                    model.status === 'complete'
                                                        ? 'art-bg-green-100 art-text-green-800'
                                                        : model.status === 'failed'
                                                        ? 'art-bg-red-100 art-text-red-800'
                                                        : 'art-bg-yellow-100 art-text-yellow-800'
                                                }`}
                                            >
                                                {model.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}