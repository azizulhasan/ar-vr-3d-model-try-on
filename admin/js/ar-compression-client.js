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
        this.compressionQuality = 85; // Default quality (0-100).
        // Hard ceiling for client-side compression. Above this size
        // the gltf-transform pipeline would lock the browser tab.
        // Mirrors AR_TRY_ON_Compression::MAX_CLIENT_SIDE_SIZE on the
        // PHP side. AR-61 §1.1 Phase 2 raised this from 5 MB to 10 MB
        // to match the PHP-side constant.
        this.maxFileSize = 10 * 1024 * 1024;

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
        // Check file type — Free supports GLB / GLTF only. The Pro
        // plugin can extend this list via the `atlas_ar_supported_formats`
        // filter (Phase 3 wires the filter); until then those formats
        // are surfaced through the upgrade badge on the dashboard, not
        // through this method.
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

        // Check file size against the 10 MB technical ceiling. This
        // is a real browser-performance limit — compressing larger
        // files client-side locks the page up — not a Free-tier
        // gate. AR-61 §1.1 Phase 2 explicitly does NOT mention Pro
        // at point-of-failure; the Pro "server-side compression for
        // large files" feature is advertised separately on the
        // dashboard's Compression Settings page via <PremiumBadge>.
        if (file.size <= this.maxFileSize) {
            return {
                canCompress: true,
                method: 'client',
                reason: 'File size suitable for browser compression'
            };
        }

        return {
            canCompress: false,
            method: 'none',
            reason: "File size is too big — can't be compressed."
        };
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
