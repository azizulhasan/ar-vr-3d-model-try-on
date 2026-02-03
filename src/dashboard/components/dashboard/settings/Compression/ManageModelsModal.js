import { useState, useEffect } from 'react';
import { __, sprintf } from '@wordpress/i18n';
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

             if (!response.ok) throw new Error(__('Failed to fetch models', 'ar-vr-3d-model-try-on'));

            const data = await response.json();
            if (data.success) {
                setModels(data.data);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
             toast.error(__('Failed to load compressed models', 'ar-vr-3d-model-try-on'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (postId, postTitle) => {
        if (!confirm(sprintf(__('Are you sure you want to delete compression for "%s"? This will free up one slot.', 'ar-vr-3d-model-try-on'), postTitle))) {
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

                if (!response.ok) throw new Error(__('Failed to delete compression', 'ar-vr-3d-model-try-on'));

            const data = await response.json();
            if (data.success) {
                toast.success(sprintf(__('✅ Compression deleted for "%s"', 'ar-vr-3d-model-try-on'), postTitle));
                // Remove from list
                setModels(models.filter((m) => m.post_id !== postId));
            } else {
                 throw new Error(data.message || __('Failed to delete', 'ar-vr-3d-model-try-on'));
            }
        } catch (error) {
            console.error('Error deleting compression:', error);
              toast.error(__('❌ Failed to delete compression: ', 'ar-vr-3d-model-try-on') + error.message);
        } finally {
            setDeleting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="art-fixed art-inset-0 art-z-50 art-overflow-y-auto">
            {/* Backdrop */}
            <div
                className="art-fixed art-inset-0 art-bg-black art-bg-opacity-50 art-transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="art-flex art-items-center art-justify-center art-min-h-screen art-p-4">
                <div className="art-relative art-bg-white art-rounded-lg art-shadow-xl art-max-w-4xl art-w-full art-max-h-[90vh] art-overflow-hidden">
                    {/* Header */}
                    <div className="art-px-6 art-py-4 art-border-b art-border-gray-200">
                        <div className="art-flex art-items-center art-justify-between">
                            <h2 className="art-text-xl art-font-bold art-text-gray-900">
                                  {__('Manage Compressed Models', 'ar-vr-3d-model-try-on')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="art-text-gray-400 hover:art-text-gray-600"
                            >
                                <svg className="art-w-6 art-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="art-text-sm art-text-gray-600 art-mt-1">
                              {__('Delete compressed models to free up slots. You can re-compress them later.', 'ar-vr-3d-model-try-on')}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="art-px-6 art-py-4 art-overflow-y-auto art-max-h-[calc(90vh-200px)]">
                        {loading ? (
                            <div className="art-flex art-items-center art-justify-center art-py-12">
                                <div className="art-animate-spin art-rounded-full art-h-12 art-w-12 art-border-b-2 art-border-blue-600"></div>
                            </div>
                        ) : models.length === 0 ? (
                            <div className="art-text-center art-py-12">
                                <div className="art-text-gray-400 art-mb-4">
                                    <svg className="art-w-16 art-h-16 art-mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <h3 className="art-text-lg art-font-medium art-text-gray-900 art-mb-2">
                                     {__('No compressed models yet', 'ar-vr-3d-model-try-on')}
                                </h3>
                                <p className="art-text-gray-600">
                                      {__('Start compressing models to see them here.', 'ar-vr-3d-model-try-on')}
                                </p>
                            </div>
                        ) : (
                            <div className="art-space-y-3">
                                {models.map((model) => (
                                    <div
                                        key={model.post_id}
                                        className="art-flex art-items-center art-justify-between art-p-4 art-bg-gray-50 art-rounded-lg art-border art-border-gray-200 hover:art-bg-gray-100 art-transition-colors"
                                    >
                                        <div className="art-flex-1 art-min-w-0 art-mr-4">
                                            <h3 className="art-text-sm art-font-medium art-text-gray-900 art-truncate">
                                                 {model.post_title || sprintf(__('Post #%s', 'ar-vr-3d-model-try-on'), model.post_id)}
                                            </h3>
                                            <div className="art-flex art-items-center art-space-x-4 art-mt-1 art-text-xs art-text-gray-600">
                                                <span>
                                                    {__('Original:', 'ar-vr-3d-model-try-on')} <strong>{model.original_size_formatted}</strong>
                                                </span>
                                                <span>→</span>
                                                <span>
                                                    {__('Compressed:', 'ar-vr-3d-model-try-on')} <strong>{model.compressed_size_formatted}</strong>
                                                </span>
                                                <span className="art-text-green-600 art-font-semibold">
                                                     ({sprintf(__('%s%% reduction', 'ar-vr-3d-model-try-on'), model.compression_ratio)})
                                                </span>
                                            </div>
                                            <div className="art-text-xs art-text-gray-500 art-mt-1">
                                                 {__('Saved:', 'ar-vr-3d-model-try-on')}<strong>{model.saved_space_formatted}</strong>
                                            </div>
                                        </div>
                                        <div className="art-flex art-items-center art-space-x-2">
                                            {model.post_url && (
                                                <a
                                                    href={model.post_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="art-px-3 art-py-1.5 art-text-sm art-font-medium art-text-blue-600 hover:art-text-blue-800"
                                                >
                                                    {__('View', 'ar-vr-3d-model-try-on')}
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(model.post_id, model.post_title)}
                                                disabled={deleting === model.post_id}
                                                className="art-px-3 art-py-1.5 art-text-sm art-font-medium art-text-red-600 hover:art-text-red-800 disabled:art-text-gray-400 disabled:art-cursor-not-allowed"
                                            >
                                                {deleting === model.post_id ? (
                                                    <>
                                                        <span className="art-inline-block art-animate-spin art-mr-1">⏳</span>
                                                        {__('Deleting...', 'ar-vr-3d-model-try-on')}
                                                    </>
                                                ) : (
                                                     __('🗑️ Delete', 'ar-vr-3d-model-try-on')
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="art-px-6 art-py-4 art-border-t art-border-gray-200 art-bg-gray-50">
                        <div className="art-flex art-items-center art-justify-between">
                            <div className="art-text-sm art-text-gray-600">
                                {sprintf(
                                    models.length !== 1 
                                        ? __('%d compressed models', 'ar-vr-3d-model-try-on')
                                        : __('%d compressed model', 'ar-vr-3d-model-try-on'),
                                    models.length
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="art-px-4 art-py-2 art-bg-blue-600 art-text-white art-font-medium art-rounded-md hover:art-bg-blue-700"
                            >
                                 {__('Close', 'ar-vr-3d-model-try-on')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
