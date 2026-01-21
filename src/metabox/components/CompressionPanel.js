import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getURL } from "../../context/utilities";

/**
 * Compression Panel Component
 *
 * Shows compression status and controls in the metabox.
 * Allows users to compress models after upload.
 *
 * @since 1.8.0
 */
export default function CompressionPanel({ postId, modelFile, onCompressionComplete }) {
    const [compressionStatus, setCompressionStatus] = useState(null); // null, 'compressing', 'complete', 'failed'
    const [compressionData, setCompressionData] = useState(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [canCompress, setCanCompress] = useState(true);
    const [userLimit, setUserLimit] = useState(null);

    const isProActive = window.ar_try_on?.is_pro_active === '1' || window.ar_try_on?.is_pro_active === true;

    useEffect(() => {
        if (postId) {
            fetchCompressionStatus();
            fetchUserLimit();
        }
    }, [postId]);

    /**
     * Fetch compression status for this post
     */
    const fetchCompressionStatus = async () => {
        try {
            const response = await fetch(getURL(`compression/status/${postId}`), {
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setCompressionData(data.data);
                    setCompressionStatus('complete');
                }
            }
        } catch (error) {
            console.error('Error fetching compression status:', error);
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

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUserLimit(data.data);
                    setCanCompress(data.data.can_compress && !data.data.at_limit);
                }
            }
        } catch (error) {
            console.error('Error fetching user limit:', error);
        }
    };

    /**
     * Start compression process
     */
    const handleCompress = async () => {
        if (!modelFile) {
            toast.error('No model file selected');
            return;
        }

        // Check user limit
        if (!isProActive && userLimit?.at_limit) {
            toast.warning(
                `⚠️ You've reached the free limit (${userLimit.limit} models). Delete a compressed model or upgrade to Pro.`,
                {
                    autoClose: 8000,
                    onClick: () => {
                        // Open manage models in settings
                        window.location.href = '/wp-admin/admin.php?page=ar-vr-3d-model-try-on';
                    }
                }
            );
            return;
        }

        setCompressionStatus('compressing');
        setProgress(0);

        try {
            // Step 1: Prepare compression
            setProgressMessage('Preparing compression...');
            const prepareResponse = await fetch(getURL('compression/prepare'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({
                    post_id: postId,
                    source_file: modelFile,
                }),
            });

            if (!prepareResponse.ok) {
                const errorData = await prepareResponse.json();
                throw new Error(errorData.message || 'Failed to prepare compression');
            }

            const prepareData = await prepareResponse.json();
            if (!prepareData.success) {
                throw new Error(prepareData.message || 'Failed to prepare compression');
            }

            const { log_id, method, paths, quality } = prepareData.data;

            // Step 2: Compress the model
            if (method === 'client') {
                await compressClientSide(log_id, modelFile, paths, quality);
            } else {
                // Server-side compression (Pro only)
                toast.info('🚀 Large file detected. Processing on server (Pro feature)...');
                // TODO: Implement server-side compression in Phase 4
                throw new Error('Server-side compression not yet implemented');
            }

        } catch (error) {
            console.error('Compression error:', error);
            setCompressionStatus('failed');
            toast.error(`❌ Compression failed: ${error.message}`);
        }
    };

    /**
     * Compress using client-side (browser)
     */
    const compressClientSide = async (logId, file, paths, quality) => {
        try {
            // Initialize compression client
            if (!window.arCompressionClient) {
                window.arCompressionClient = new window.ARCompressionClient();
            }

            const compressor = window.arCompressionClient;

            // Check if can compress client-side
            const canCompress = compressor.canCompressClientSide(file);
            if (!canCompress.canCompress) {
                throw new Error(canCompress.reason);
            }

            if (canCompress.warning) {
                toast.warning(canCompress.warning, { autoClose: 10000 });
            }

            // Start compression with progress callback
            const compressedBlob = await compressor.compressModel(
                file,
                { quality },
                (percent, message) => {
                    setProgress(percent);
                    setProgressMessage(message);
                }
            );

            // Upload compressed file
            setProgressMessage('Uploading compressed file...');
            const uploadedFile = await uploadCompressedFile(compressedBlob, file.name, paths.compressed);

            // Complete compression
            const completeResponse = await fetch(getURL('compression/complete'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({
                    log_id: logId,
                    compressed_file: uploadedFile,
                    compression_time: compressedBlob.compressionMeta.compressionTime,
                }),
            });

            if (!completeResponse.ok) {
                throw new Error('Failed to complete compression');
            }

            // Success!
            setCompressionStatus('complete');
            setCompressionData({
                ...compressedBlob.compressionMeta,
                original_size_formatted: formatFileSize(compressedBlob.compressionMeta.originalSize),
                compressed_size_formatted: formatFileSize(compressedBlob.compressionMeta.compressedSize),
                saved_space_formatted: formatFileSize(
                    compressedBlob.compressionMeta.originalSize - compressedBlob.compressionMeta.compressedSize
                ),
            });

            toast.success(
                `✅ Compression complete! Saved ${compressedBlob.compressionMeta.compressionRatio}% (${formatFileSize(compressedBlob.compressionMeta.originalSize - compressedBlob.compressionMeta.compressedSize)})`
            );

            if (onCompressionComplete) {
                onCompressionComplete(compressedBlob.compressionMeta);
            }

            // Refresh user limit
            await fetchUserLimit();

        } catch (error) {
            // Fail compression in database
            await fetch(getURL('compression/fail'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({
                    log_id: logId,
                    error_message: error.message,
                }),
            });

            throw error;
        }
    };

    /**
     * Upload compressed file to server
     */
    const uploadCompressedFile = async (blob, originalFileName, targetPath) => {
        const formData = new FormData();
        formData.append('file', blob, originalFileName.replace(/\.(glb|gltf)$/, '_compressed.$1'));
        formData.append('target_path', targetPath);

        // Use WordPress media upload endpoint or custom endpoint
        const response = await fetch(getURL('upload-compressed'), {
            method: 'POST',
            headers: {
                'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload compressed file');
        }

        const data = await response.json();
        return data.file_path;
    };

    /**
     * Format file size
     */
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    /**
     * Handle delete compression
     */
    const handleDeleteCompression = async () => {
        if (!confirm('Are you sure you want to delete the compressed version? The original file will remain.')) {
            return;
        }

        try {
            const response = await fetch(getURL(`compression/delete/${postId}`), {
                method: 'DELETE',
                headers: {
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete compression');
            }

            toast.success('✅ Compressed version deleted');
            setCompressionStatus(null);
            setCompressionData(null);
            await fetchUserLimit();

        } catch (error) {
            console.error('Error deleting compression:', error);
            toast.error('❌ Failed to delete compression');
        }
    };

    if (loading) {
        return (
            <div className="compression-panel p-4 border border-gray-300 rounded-md bg-gray-50">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="compression-panel p-4 border border-gray-300 rounded-md bg-white">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">🗜️</span>
                    Model Compression
                </h4>
                {!isProActive && userLimit && (
                    <span className="text-xs text-gray-600">
                        {userLimit.used}/{userLimit.limit} models
                    </span>
                )}
            </div>

            {/* Not compressed yet */}
            {!compressionStatus && (
                <div>
                    <p className="text-sm text-gray-600 mb-3">
                        Compress this model to reduce file size and improve loading speed.
                    </p>
                    {!isProActive && userLimit?.at_limit && (
                        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                            ⚠️ You've reached the free limit. Delete a compressed model to compress this one.
                        </div>
                    )}
                    <button
                        onClick={handleCompress}
                        disabled={!canCompress || !modelFile}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {canCompress ? '🚀 Compress Model' : '🔒 Limit Reached'}
                    </button>
                </div>
            )}

            {/* Compressing */}
            {compressionStatus === 'compressing' && (
                <div>
                    <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{progressMessage}</span>
                            <span className="font-semibold">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                        Please wait, this may take a few moments...
                    </p>
                </div>
            )}

            {/* Complete */}
            {compressionStatus === 'complete' && compressionData && (
                <div>
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center mb-2">
                            <span className="text-green-600 mr-2">✅</span>
                            <span className="text-sm font-semibold text-green-800">Compressed Successfully!</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-700">
                            <div className="flex justify-between">
                                <span>Original:</span>
                                <span className="font-semibold">{compressionData.original_size_formatted}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Compressed:</span>
                                <span className="font-semibold">{compressionData.compressed_size_formatted}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>Saved:</span>
                                <span className="font-semibold">
                                    {compressionData.saved_space_formatted} ({compressionData.compressionRatio || compressionData.compression_ratio}%)
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleCompress}
                            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                        >
                            🔄 Re-compress
                        </button>
                        <button
                            onClick={handleDeleteCompression}
                            className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Failed */}
            {compressionStatus === 'failed' && (
                <div>
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center mb-1">
                            <span className="text-red-600 mr-2">❌</span>
                            <span className="text-sm font-semibold text-red-800">Compression Failed</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            An error occurred during compression. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={handleCompress}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        🔄 Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
