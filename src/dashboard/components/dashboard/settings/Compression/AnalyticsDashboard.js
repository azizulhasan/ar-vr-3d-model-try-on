import { useState, useEffect } from 'react';
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
            const statsResponse = await fetch('/wp-json/ar_try_on/v1/compression/stats', {
                headers: {
                    'X-WP-Nonce': window.ar_try_on?.nonce || '',
                },
            });

            if (!statsResponse.ok) throw new Error('Failed to fetch stats');

            const statsData = await statsResponse.json();
            if (statsData.success) {
                setStats(statsData.data);
            }

            // Fetch models list
            const modelsResponse = await fetch('/wp-json/ar_try_on/v1/compression/models?limit=100', {
                headers: {
                    'X-WP-Nonce': window.ar_try_on?.nonce || '',
                },
            });

            if (!modelsResponse.ok) throw new Error('Failed to fetch models');

            const modelsData = await modelsResponse.json();
            if (modelsData.success) {
                setModels(modelsData.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // Chart: Compression Ratio Distribution (Pie Chart)
    const getCompressionRatioChart = () => {
        if (!models.length) return null;

        const ranges = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };

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
                    label: 'Models',
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
            labels: topModels.map((m) => m.post_title || `Model ${m.post_id}`).map((t) => t.substring(0, 20)),
            datasets: [
                {
                    label: 'Original Size (MB)',
                    data: topModels.map((m) => (m.original_size / (1024 * 1024)).toFixed(2)),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Compressed Size (MB)',
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
                    label: 'Avg. Compression Ratio (%)',
                    data: avgRatios,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y',
                },
                {
                    label: 'Models Compressed',
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
                    text: 'Compression Ratio (%)',
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Model Count',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-300 rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-32 bg-gray-300 rounded"></div>
                        <div className="h-32 bg-gray-300 rounded"></div>
                        <div className="h-32 bg-gray-300 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats || !stats.total_compressions) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    📊 Analytics Dashboard
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        PRO
                    </span>
                </h2>
                <p className="text-gray-600">
                    No compression data available yet. Start compressing models to see detailed analytics!
                </p>
            </div>
        );
    }

    const compressionRatioData = getCompressionRatioChart();
    const fileSizeData = getFileSizeChart();
    const trendData = getCompressionTrendChart();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            📊 Analytics Dashboard
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                PRO
                            </span>
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Advanced analytics and insights for your 3D model compression
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                        🔄 Refresh Data
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {['overview', 'trends', 'models'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-6">
                            <div className="text-4xl font-bold">{stats.total_compressions || 0}</div>
                            <div className="text-blue-100 mt-1">Total Models Compressed</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow p-6">
                            <div className="text-4xl font-bold">{stats.avg_compression_ratio || 0}%</div>
                            <div className="text-green-100 mt-1">Avg. Compression Ratio</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow p-6">
                            <div className="text-4xl font-bold">{stats.total_saved_space_formatted || '0 MB'}</div>
                            <div className="text-purple-100 mt-1">Total Space Saved</div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow p-6">
                            <div className="text-4xl font-bold">
                                {stats.total_compressions > 0
                                    ? Math.round((stats.successful_compressions / stats.total_compressions) * 100)
                                    : 0}
                                %
                            </div>
                            <div className="text-orange-100 mt-1">Success Rate</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {compressionRatioData && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Compression Ratio Distribution
                                </h3>
                                <div className="h-64">
                                    <Pie data={compressionRatioData} options={chartOptions} />
                                </div>
                            </div>
                        )}

                        {fileSizeData && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Top 10 Models - Size Comparison
                                </h3>
                                <div className="h-64">
                                    <Bar data={fileSizeData} options={chartOptions} />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && trendData && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Compression Trends Over Time</h3>
                    <div className="h-96">
                        <Line data={trendData} options={lineChartOptions} />
                    </div>
                </div>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Compressed Models</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Model
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Original Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Compressed Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ratio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Saved
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {models.slice(0, 20).map((model) => (
                                    <tr key={model.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {model.post_title || `Model ${model.post_id}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {model.original_size_formatted}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {model.compressed_size_formatted}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                                                {model.compression_ratio}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {model.saved_space_formatted}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${
                                                    model.status === 'complete'
                                                        ? 'bg-green-100 text-green-800'
                                                        : model.status === 'failed'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
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
