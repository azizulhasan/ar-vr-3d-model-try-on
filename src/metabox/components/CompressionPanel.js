import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getURL } from "../../context/utilities";
import { __ } from "@wordpress/i18n";

/**
 * Compression Panel Component
 *
 * Shows compression status and controls in the metabox.
 * Allows users to compress models after upload.
 *
 * @since 1.8.0
 */
export default function CompressionPanel({ postId, modelFile, onCompressionComplete, setProductModel, productModel }) {
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
        console.log(modelFile)
        // return;

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

            const { log_id, method, paths, quality, file_size } = prepareData.data;

            console.log()
            async function urlToFile(url) {
                const response = await fetch(url);
                const blob = await response.blob();
                const name = url.split('/').pop();

                return new File([blob], name, { type: blob.type });
            }

            console.log(prepareData)
            let file = await urlToFile(paths?.url )
            console.log({file})
            // Step 2: Compress the model
            if (method === 'client') {

                if(file_size > wp.hooks.applyFilters('ar_try_on_client_compress_file_size_limit',  10485760)) {
                    setCompressionStatus('failed');
                    let error_message = __('Compression size exceeded: In free version you can compress less than 10MB. Buy Pro', 'ar-vr-3d-model-try-on');
                    toast.error(error_message);
                    await fetch(getURL('compression/fail'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                        },
                        body: JSON.stringify({
                            log_id: log_id,
                            error_message: error_message,
                        }),
                    });

                }else{
                    await compressClientSide(log_id, file, paths, quality);
                }

            } else {
                // Server-side compression (Pro only)
                await compressServerSide(log_id, paths, quality);
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
            const uploadedFile = await uploadCompressedFile(compressedBlob, file.name, paths.post_dir);

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
            const meta = compressedBlob.compressionMeta;
            setCompressionStatus('complete');
            setCompressionData({
                ...meta,
                original_size_formatted: formatFileSize(meta.originalSize),
                compressed_size_formatted: formatFileSize(meta.compressedSize),
                saved_space_formatted: formatFileSize(
                    meta.originalSize - meta.compressedSize
                ),
            });

            // Show appropriate message based on whether compression was applied or skipped
            if (meta.skipped) {
                toast.info(
                    `ℹ️ ${meta.reason}`,
                    { autoClose: 8000 }
                );
            } else {
                const strategyText = meta.strategy === 'full' ? '' :
                    meta.strategy === 'aggressive' ? ' (aggressive mode)' :
                    meta.strategy === 'basic' ? ' (basic optimization)' :
                    meta.strategy === 'minimal' ? ' (minimal optimization)' : '';

                toast.success(
                    `✅ Compression complete${strategyText}! Saved ${meta.compressionRatio}% (${formatFileSize(meta.originalSize - meta.compressedSize)})`
                );
            }

            if (onCompressionComplete) {
                onCompressionComplete(meta);
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
     * Compress using server-side (Node.js with Draco compression)
     */
    const compressServerSide = async (logId, paths, quality) => {
        try {
            setProgressMessage('Starting server-side compression...');
            setProgress(10);
            console.log(paths)

            toast.info('🚀 Processing large file on server (Pro feature)...', { autoClose: 3000 });

            // Call server-side compression API
            const compressResponse = await fetch(getURL('compression/server-compress'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({
                    input_file: paths.original,
                    output_file: paths.compressed,
                    quality: quality,
                }),
            });

            setProgress(50);
            setProgressMessage('Compressing model on server...');

            if (!compressResponse.ok) {
                const errorData = await compressResponse.json();
                throw new Error(errorData.message || 'Server-side compression failed');
            }

            const compressData = await compressResponse.json();
            if (!compressData.success) {
                throw new Error(compressData.message || 'Server-side compression failed');
            }

            setProgress(80);
            setProgressMessage('Finalizing compression...');
            console.log(compressData)

            const compressionResult = compressData.data;
            console.log(compressionResult)

            // const data = await response.json();
            if(compressionResult?.output_url) {
                let productModelCloned = structuredClone(productModel)
                productModelCloned.src = compressionResult.output_url;
                setProductModel(productModelCloned);
                wp.hooks.doAction("atlas_ar_preview_data", productModelCloned);
                console.log({productModelCloned})
            }
            // Complete compression
            const completeResponse = await fetch(getURL('compression/complete'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window?.ar_try_on?.rest_nonce || '',
                },
                body: JSON.stringify({
                    log_id: logId,
                    compressed_file: compressionResult.output_file,
                    compression_time: compressionResult.compression_time,
                }),
            });

            if (!completeResponse.ok) {
                throw new Error('Failed to complete compression');
            }

            setProgress(100);

            // Success!
            setCompressionStatus('complete');
            setCompressionData({
                original_size: compressionResult.original_size,
                compressed_size: compressionResult.compressed_size,
                compression_ratio: compressionResult.compression_ratio,
                original_size_formatted: formatFileSize(compressionResult.original_size),
                compressed_size_formatted: formatFileSize(compressionResult.compressed_size),
                saved_space_formatted: formatFileSize(
                    compressionResult.original_size - compressionResult.compressed_size
                ),
            });

            toast.success(
                `✅ Server compression complete! Saved ${compressionResult.compression_ratio}% (${formatFileSize(compressionResult.original_size - compressionResult.compressed_size)})`
            );

            if (onCompressionComplete) {
                onCompressionComplete(compressionResult);
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
        if(data?.file_url) {
            let productModelCloned = structuredClone(productModel)
            productModelCloned.src = data.file_url;
            setProductModel(productModelCloned);
            wp.hooks.doAction("atlas_ar_preview_data", productModelCloned);
            console.log({productModelCloned})

        }

        return data.file_path;
    };

    useEffect(()=> {
        console.log(productModel.src)
    },[productModel.src])

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
            <div className="compression-panel art-p-4 art-border art-border-gray-300 art-rounded-md art-bg-gray-50">
                <div className="art-animate-pulse">
                    <div className="art-h-4 art-bg-gray-300 art-rounded art-w-1/3 art-mb-2"></div>
                    <div className="art-h-3 art-bg-gray-300 art-rounded art-w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="compression-panel art-p-4 art-border art-border-gray-300 art-rounded-md art-bg-white">
            <div className="art-flex art-items-center art-justify-between art-mb-3">
                <h4 className="art-text-sm art-font-semibold art-text-gray-900 art-flex art-items-center">
                    <span className="art-mr-2">🗜️</span>
                    Model Compression
                </h4>
                {!isProActive && userLimit && (
                    <span className="art-text-xs art-text-gray-600">
                        {userLimit.used}/{userLimit.limit} models
                    </span>
                )}
            </div>

            {/* Not compressed yet */}
            {!compressionStatus && (
                <div>
                    <p className="art-text-sm art-text-gray-600 art-mb-3">
                        Compress this model to reduce file size and improve loading speed.
                    </p>
                    {!isProActive && userLimit?.at_limit && (
                        <div className="art-mb-3 art-p-2 art-bg-orange-50 art-border art-border-orange-200 art-rounded art-text-xs art-text-orange-700">
                            ⚠️ You've reached the free limit. Delete a compressed model to compress this one.
                        </div>
                    )}
                    <button
                        onClick={handleCompress}
                        disabled={!canCompress || !modelFile}
                        className="art-w-full art-px-4 art-py-2 art-bg-blue-600 art-text-white art-text-sm art-font-medium art-rounded-md hover:art-bg-blue-700 disabled:art-bg-gray-400 disabled:art-cursor-not-allowed"
                    >
                        {canCompress ? '🚀 Compress Model' : '🔒 Limit Reached'}
                    </button>
                </div>
            )}

            {/* Compressing */}
            {compressionStatus === 'compressing' && (
                <div>
                    <div className="art-mb-2">
                        <div className="art-flex art-items-center art-justify-between art-text-xs art-text-gray-600 art-mb-1">
                            <span>{progressMessage}</span>
                            <span className="art-font-semibold">{progress}%</span>
                        </div>
                        <div className="art-w-full art-bg-gray-200 art-rounded-full art-h-2">
                            <div
                                className="art-bg-blue-600 art-h-2 art-rounded-full art-transition-all art-duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                    <p className="art-text-xs art-text-gray-500 art-text-center">
                        Please wait, this may take a few moments...
                    </p>
                </div>
            )}

            {/* Complete */}
            {compressionStatus === 'complete' && compressionData && (
                <div>
                    {compressionData.skipped ? (
                        // Model was not compressed (already optimized)
                        <div className="art-mb-3 art-p-3 art-bg-blue-50 art-border art-border-blue-200 art-rounded">
                            <div className="art-flex art-items-center art-mb-2">
                                <span className="art-text-blue-600 art-mr-2">ℹ️</span>
                                <span className="art-text-sm art-font-semibold art-text-blue-800">Already Optimized</span>
                            </div>
                            <div className="art-space-y-1 art-text-xs art-text-gray-700">
                                <p className="art-mb-2">{compressionData.reason}</p>
                                <div className="art-flex art-justify-between">
                                    <span>File Size:</span>
                                    <span className="art-font-semibold">{compressionData.original_size_formatted}</span>
                                </div>
                                <p className="art-text-xs art-text-gray-500 art-mt-2">
                                    Your model is already well-optimized and couldn't be compressed further without quality loss.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Model was successfully compressed
                        <div className="art-mb-3 art-p-3 art-bg-green-50 art-border art-border-green-200 art-rounded">
                            <div className="art-flex art-items-center art-mb-2">
                                <span className="art-text-green-600 art-mr-2">✅</span>
                                <span className="art-text-sm art-font-semibold art-text-green-800">
                                    Compressed Successfully!
                                    {compressionData.strategy && compressionData.strategy !== 'full' && (
                                        <span className="art-text-xs art-font-normal art-text-gray-600 art-ml-1">
                                            ({compressionData.strategy === 'aggressive' ? 'aggressive' :
                                              compressionData.strategy === 'basic' ? 'basic' :
                                              compressionData.strategy === 'minimal' ? 'minimal' : compressionData.strategy})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="art-space-y-1 art-text-xs art-text-gray-700">
                                <div className="art-flex art-justify-between">
                                    <span>Original:</span>
                                    <span className="art-font-semibold">{compressionData.original_size_formatted}</span>
                                </div>
                                <div className="art-flex art-justify-between">
                                    <span>Compressed:</span>
                                    <span className="art-font-semibold">{compressionData.compressed_size_formatted}</span>
                                </div>
                                <div className="art-flex art-justify-between art-text-green-600">
                                    <span>Saved:</span>
                                    <span className="art-font-semibold">
                                        {compressionData.saved_space_formatted} ({compressionData.compressionRatio || compressionData.compression_ratio}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="art-flex art-space-x-2">
                        <button
                            onClick={handleCompress}
                            className="art-flex-1 art-px-3 art-py-1.5 art-bg-gray-200 art-text-gray-700 art-text-xs art-font-medium art-rounded hover:art-bg-gray-300"
                        >
                            🔄 Re-compress
                        </button>
                        <button
                            onClick={handleDeleteCompression}
                            className="art-flex-1 art-px-3 art-py-1.5 art-bg-red-100 art-text-red-700 art-text-xs art-font-medium art-rounded hover:art-bg-red-200"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Failed */}
            {compressionStatus === 'failed' && (
                <div>
                    <div className="art-mb-3 art-p-3 art-bg-red-50 art-border art-border-red-200 art-rounded">
                        <div className="art-flex art-items-center art-mb-1">
                            <span className="art-text-red-600 art-mr-2">❌</span>
                            <span className="art-text-sm art-font-semibold art-text-red-800">Compression Failed</span>
                        </div>
                        <p className="art-text-xs art-text-gray-600">
                            An error occurred during compression. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={handleCompress}
                        className="art-w-full art-px-4 art-py-2 art-bg-blue-600 art-text-white art-text-sm art-font-medium art-rounded-md hover:art-bg-blue-700"
                    >
                        🔄 Try Again
                    </button>
                </div>
            )}
        </div>
    );
}
