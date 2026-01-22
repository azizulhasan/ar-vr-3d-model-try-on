/**
 * AR Try On - Client-Side 3D Model Compression
 *
 * Compresses GLB/GLTF models using Draco geometry compression.
 * Runs in the browser for files < 5MB (free + pro).
 * Larger files use server-side compression (Pro only).
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/admin/js
 * @since      1.8.0
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
    draco,
    dedup,
    prune,
    textureCompress,
    resample,
    flatten,
    join,
    weld
} from '@gltf-transform/functions';

class ARCompressionClient {
    constructor() {
        this.io = null;
        this.compressionQuality = 85; // Default quality (0-100)
        this.maxFileSize = 5 * 1024 * 1024; // 5MB threshold for client-side

        this.init();
    }

    /**
     * Initialize gltf-transform IO
     */
    init() {
        // Setup NodeIO with all extensions
        this.io = new NodeIO()
            .registerExtensions(ALL_EXTENSIONS);

        console.log('AR Compression Client initialized with gltf-transform');
    }

    /**
     * Check if file can be compressed client-side
     *
     * @param {File} file - The file to check
     * @returns {Object} Result object with canCompress and reason
     */
    canCompressClientSide(file) {
        const isProActive = window.ar_try_on?.is_pro_active === '1' || window.ar_try_on?.is_pro_active === true;

        // Check file type
        const validExtensions = ['.glb', '.gltf'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (!hasValidExtension) {
            return {
                canCompress: false,
                method: 'none',
                reason: 'Only GLB/GLTF files can be compressed'
            };
        }

        // Check file size
        if (file.size <= this.maxFileSize) {
            return {
                canCompress: true,
                method: 'client',
                reason: 'File size suitable for browser compression'
            };
        }

        // Large files: Pro users can use server-side, free users get warning
        if (isProActive) {
            return {
                canCompress: true,
                method: 'server',
                reason: 'Large file will be compressed on server (Pro feature)'
            };
        } else {
            return {
                canCompress: true,
                method: 'client',
                reason: 'Large file will be compressed in browser (may be slow)',
                warning: 'Files over 5MB compress faster with Pro (server-side compression)'
            };
        }
    }

    /**
     * Compress a GLB/GLTF file
     *
     * @param {File} file - The file to compress
     * @param {Object} options - Compression options
     * @param {Function} onProgress - Progress callback (percent, message)
     * @returns {Promise<Blob>} Compressed file as Blob
     */
    async compressModel(file, options = {}, onProgress = null) {
        const startTime = Date.now();

        try {
            // Set quality
            this.compressionQuality = options.quality || 85;

            // Step 1: Load the file
            if (onProgress) onProgress(10, 'Reading model file...');
            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            if (onProgress) onProgress(20, 'Parsing 3D model...');
            const document = await this.io.readBinary(new Uint8Array(arrayBuffer));

            const originalSize = arrayBuffer.byteLength;

            // Try progressive compression strategies
            let result = await this.tryCompressionStrategies(document, originalSize, arrayBuffer, onProgress);

            if (result.success) {
                const compressionTime = Date.now() - startTime;

                result.blob.compressionMeta = {
                    originalSize: originalSize,
                    compressedSize: result.blob.size,
                    compressionRatio: ((1 - (result.blob.size / originalSize)) * 100).toFixed(1),
                    compressionTime: compressionTime,
                    quality: this.compressionQuality,
                    strategy: result.strategy,
                    skipped: false
                };

                return result.blob;
            } else {
                // All strategies failed - return original file
                const compressionTime = Date.now() - startTime;
                const originalBlob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });

                originalBlob.compressionMeta = {
                    originalSize: originalSize,
                    compressedSize: originalSize,
                    compressionRatio: 0,
                    compressionTime: compressionTime,
                    quality: this.compressionQuality,
                    strategy: 'none',
                    skipped: true,
                    reason: result.reason
                };

                if (onProgress) onProgress(100, result.reason);
                return originalBlob;
            }

        } catch (error) {
            console.error('Compression error:', error);
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    /**
     * Try multiple compression strategies progressively
     */
    async tryCompressionStrategies(document, originalSize, originalArrayBuffer, onProgress) {
        // Strategy 1: Full compression with current quality
        if (onProgress) onProgress(30, 'Trying full compression...');
        let result = await this.tryFullCompression(document, originalSize, onProgress, 40);
        if (result.success) {
            return { success: true, blob: result.blob, strategy: 'full' };
        }

        // Strategy 2: Aggressive compression with lower quality
        if (onProgress) onProgress(50, 'Trying aggressive compression...');
        const originalQuality = this.compressionQuality;
        this.compressionQuality = Math.max(50, this.compressionQuality - 20); // Lower quality

        // Re-parse document for fresh attempt
        const document2 = await this.io.readBinary(new Uint8Array(originalArrayBuffer));
        result = await this.tryFullCompression(document2, originalSize, onProgress, 60);
        this.compressionQuality = originalQuality; // Restore original quality

        if (result.success) {
            return { success: true, blob: result.blob, strategy: 'aggressive' };
        }

        // Strategy 3: Basic optimization without Draco
        if (onProgress) onProgress(70, 'Trying basic optimization...');
        const document3 = await this.io.readBinary(new Uint8Array(originalArrayBuffer));
        result = await this.tryBasicOptimization(document3, originalSize, onProgress, 80);
        if (result.success) {
            return { success: true, blob: result.blob, strategy: 'basic' };
        }

        // Strategy 4: Minimal optimization (dedup and prune only)
        if (onProgress) onProgress(85, 'Trying minimal optimization...');
        const document4 = await this.io.readBinary(new Uint8Array(originalArrayBuffer));
        result = await this.tryMinimalOptimization(document4, originalSize, onProgress, 95);
        if (result.success) {
            return { success: true, blob: result.blob, strategy: 'minimal' };
        }

        // All strategies failed
        return {
            success: false,
            reason: 'Model is already optimized. No compression method reduced file size.'
        };
    }

    /**
     * Try full compression with Draco
     */
    async tryFullCompression(document, originalSize, onProgress, baseProgress) {
        try {
            // Apply all optimizations
            await document.transform(
                dedup(),
                prune()
            );

            await document.transform(
                weld({ tolerance: 0.0001 })
            );

            await document.transform(
                draco({
                    quantizationBits: this.getDracoQuantizationBits(),
                    quantizationVolume: 'mesh'
                })
            );

            const maxTextureSize = this.getMaxTextureSize();
            if (maxTextureSize < 4096) {
                await document.transform(
                    resample({
                        size: [maxTextureSize, maxTextureSize]
                    })
                );
            }

            await document.transform(join());

            const compressedArrayBuffer = await this.io.writeBinary(document);
            const blob = new Blob([compressedArrayBuffer], { type: 'model/gltf-binary' });

            if (blob.size < originalSize) {
                return { success: true, blob };
            }

            return { success: false };
        } catch (error) {
            console.warn('Full compression failed:', error);
            return { success: false };
        }
    }

    /**
     * Try basic optimization without Draco
     */
    async tryBasicOptimization(document, originalSize, onProgress, baseProgress) {
        try {
            await document.transform(
                dedup(),
                prune(),
                weld({ tolerance: 0.0001 }),
                join()
            );

            const maxTextureSize = this.getMaxTextureSize();
            if (maxTextureSize < 2048) {
                await document.transform(
                    resample({
                        size: [maxTextureSize, maxTextureSize]
                    })
                );
            }

            const compressedArrayBuffer = await this.io.writeBinary(document);
            const blob = new Blob([compressedArrayBuffer], { type: 'model/gltf-binary' });

            if (blob.size < originalSize) {
                return { success: true, blob };
            }

            return { success: false };
        } catch (error) {
            console.warn('Basic optimization failed:', error);
            return { success: false };
        }
    }

    /**
     * Try minimal optimization (dedup and prune only)
     */
    async tryMinimalOptimization(document, originalSize, onProgress, baseProgress) {
        try {
            await document.transform(
                dedup(),
                prune()
            );

            const compressedArrayBuffer = await this.io.writeBinary(document);
            const blob = new Blob([compressedArrayBuffer], { type: 'model/gltf-binary' });

            if (blob.size < originalSize) {
                return { success: true, blob };
            }

            return { success: false };
        } catch (error) {
            console.warn('Minimal optimization failed:', error);
            return { success: false };
        }
    }

    /**
     * Read file as ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get Draco quantization bits based on quality setting
     */
    getDracoQuantizationBits() {
        const quality = this.compressionQuality;
        if (quality >= 90) return 14; // High quality
        if (quality >= 70) return 12; // Medium quality
        if (quality >= 50) return 10; // Low quality
        return 8; // Very low quality
    }

    /**
     * Get max texture size based on quality setting
     */
    getMaxTextureSize() {
        const quality = this.compressionQuality;
        if (quality >= 90) return 4096;
        if (quality >= 70) return 2048;
        if (quality >= 50) return 1024;
        return 512;
    }

    /**
     * Format bytes to human readable size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cleanup resources
     */
    dispose() {
        // gltf-transform doesn't require explicit disposal
        this.io = null;
    }
}

// Create global instance
window.ARCompressionClient = ARCompressionClient;

// Auto-initialize if in WordPress admin
if (typeof wp !== 'undefined' && wp.hooks) {
    wp.hooks.addAction('ar_try_on_loaded', 'ar-compression', () => {
        window.arCompressionClient = new ARCompressionClient();
    });
}

export default ARCompressionClient;
