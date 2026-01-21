import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {getURL} from "../../../../../context/utilities";

/**
 * Manage Compressed Models Modal
 *
 * Modal to view and delete compressed models (for free user limit management).
 *
 * @since 1.8.0
 */
export default function ManageModelsModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(true);
    const [models, setModels] = useState([]);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchModels();
        }
    }, [isOpen]);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const response = await fetch(getURL('compression/models?status=complete'), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch models');

            const data = await response.json();
            if (data.success) {
                setModels(data.data);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            toast.error('Failed to load compressed models');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (postId, postTitle) => {
        if (!confirm(`Are you sure you want to delete compression for "${postTitle}"? This will free up one slot.`)) {
            return;
        }

        setDeleting(postId);

        try {
            const response = await fetch(getURL(`compression/delete/${postId}`), {
                method: 'DELETE',
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) throw new Error('Failed to delete compression');

            const data = await response.json();
            if (data.success) {
                toast.success(`✅ Compression deleted for "${postTitle}"`);
                // Remove from list
                setModels(models.filter((m) => m.post_id !== postId));
            } else {
                throw new Error(data.message || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting compression:', error);
            toast.error('❌ Failed to delete compression: ' + error.message);
        } finally {
            setDeleting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                Manage Compressed Models
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Delete compressed models to free up slots. You can re-compress them later.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No compressed models yet
                                </h3>
                                <p className="text-gray-600">
                                    Start compressing models to see them here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {models.map((model) => (
                                    <div
                                        key={model.post_id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 mr-4">
                                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                                {model.post_title || `Post #${model.post_id}`}
                                            </h3>
                                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                                                <span>
                                                    Original: <strong>{model.original_size_formatted}</strong>
                                                </span>
                                                <span>→</span>
                                                <span>
                                                    Compressed: <strong>{model.compressed_size_formatted}</strong>
                                                </span>
                                                <span className="text-green-600 font-semibold">
                                                    ({model.compression_ratio}% reduction)
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Saved: <strong>{model.saved_space_formatted}</strong>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {model.post_url && (
                                                <a
                                                    href={model.post_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    View
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(model.post_id, model.post_title)}
                                                disabled={deleting === model.post_id}
                                                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {deleting === model.post_id ? (
                                                    <>
                                                        <span className="inline-block animate-spin mr-1">⏳</span>
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    '🗑️ Delete'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                {models.length} compressed model{models.length !== 1 ? 's' : ''}
                            </div>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
