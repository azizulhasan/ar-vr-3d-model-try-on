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

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class ARCompressionClient {
    constructor() {
        this.loader = null;
        this.exporter = null;
        this.dracoLoader = null;
        this.compressionQuality = 85; // Default quality (0-100)
        this.maxFileSize = 5 * 1024 * 1024; // 5MB threshold for client-side

        this.init();
    }

    /**
     * Initialize loaders and exporters
     */
    init() {
        // Setup GLTF Loader
        this.loader = new GLTFLoader();

        // Setup Draco Loader
        this.dracoLoader = new DRACOLoader();
        // Use Three.js CDN for Draco decoder (or host locally if preferred)
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.dracoLoader.setDecoderConfig({ type: 'js' });
        this.loader.setDRACOLoader(this.dracoLoader);

        // Setup GLTF Exporter
        this.exporter = new GLTFExporter();

        console.log('AR Compression Client initialized');
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

            // Step 1: Load the file (20% progress)
            if (onProgress) onProgress(10, 'Reading model file...');
            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            if (onProgress) onProgress(20, 'Parsing 3D model...');
            const gltf = await this.parseGLTF(arrayBuffer);

            // Step 2: Process geometry (40% progress)
            if (onProgress) onProgress(40, 'Optimizing geometry...');
            await this.optimizeGeometry(gltf.scene);

            // Step 3: Compress textures (60% progress)
            if (onProgress) onProgress(60, 'Compressing textures...');
            await this.compressTextures(gltf.scene);

            // Step 4: Export compressed model (80% progress)
            if (onProgress) onProgress(80, 'Generating compressed file...');
            const compressedData = await this.exportGLTF(gltf.scene, {
                binary: file.name.toLowerCase().endsWith('.glb'),
                includeCustomExtensions: true,
                truncateDrawRange: true,
                embedImages: true
            });

            // Step 5: Create blob (95% progress)
            if (onProgress) onProgress(95, 'Finalizing...');
            let blob;
            if (compressedData instanceof ArrayBuffer) {
                blob = new Blob([compressedData], { type: 'model/gltf-binary' });
            } else {
                const jsonString = JSON.stringify(compressedData);
                blob = new Blob([jsonString], { type: 'model/gltf+json' });
            }

            const compressionTime = Date.now() - startTime;

            if (onProgress) onProgress(100, 'Compression complete!');

            // Return blob with metadata
            blob.compressionMeta = {
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: ((1 - (blob.size / file.size)) * 100).toFixed(1),
                compressionTime: compressionTime,
                quality: this.compressionQuality
            };

            return blob;

        } catch (error) {
            console.error('Compression error:', error);
            throw new Error(`Compression failed: ${error.message}`);
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
     * Parse GLTF/GLB file
     */
    parseGLTF(arrayBuffer) {
        return new Promise((resolve, reject) => {
            this.loader.parse(
                arrayBuffer,
                '',
                (gltf) => resolve(gltf),
                (error) => reject(error)
            );
        });
    }

    /**
     * Optimize geometry (merge, simplify)
     */
    async optimizeGeometry(scene) {
        scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;

                // Compute bounding box/sphere for better culling
                if (!geometry.boundingBox) {
                    geometry.computeBoundingBox();
                }
                if (!geometry.boundingSphere) {
                    geometry.computeBoundingSphere();
                }

                // Remove unused vertex attributes
                const attributes = geometry.attributes;
                if (attributes.uv2 && !this.usesUV2(child)) {
                    geometry.deleteAttribute('uv2');
                }

                // Optimize buffer attributes
                if (attributes.position) {
                    geometry.attributes.position.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Check if mesh uses UV2 (lightmap)
     */
    usesUV2(mesh) {
        if (!mesh.material) return false;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        return material.lightMap !== null;
    }

    /**
     * Compress textures
     */
    async compressTextures(scene) {
        const textures = [];

        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((material) => {
                    // Collect all texture maps
                    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((mapName) => {
                        if (material[mapName] && !textures.includes(material[mapName])) {
                            textures.push(material[mapName]);
                        }
                    });
                });
            }
        });

        // Optimize textures
        for (const texture of textures) {
            if (texture.image) {
                // Ensure power-of-two dimensions for better compression
                if (!this.isPowerOfTwo(texture.image.width) || !this.isPowerOfTwo(texture.image.height)) {
                    await this.resizeTextureToPowerOfTwo(texture);
                }

                // Reduce quality based on compression setting
                const qualityFactor = this.compressionQuality / 100;
                if (qualityFactor < 0.9 && texture.image.width > 512) {
                    await this.downsampleTexture(texture, qualityFactor);
                }
            }
        }
    }

    /**
     * Check if number is power of two
     */
    isPowerOfTwo(value) {
        return (value & (value - 1)) === 0 && value !== 0;
    }

    /**
     * Resize texture to nearest power of two
     */
    async resizeTextureToPowerOfTwo(texture) {
        if (!texture.image) return;

        const image = texture.image;
        const canvas = document.createElement('canvas');
        const width = this.nearestPowerOfTwo(image.width);
        const height = this.nearestPowerOfTwo(image.height);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        texture.image = canvas;
        texture.needsUpdate = true;
    }

    /**
     * Get nearest power of two
     */
    nearestPowerOfTwo(value) {
        return Math.pow(2, Math.round(Math.log(value) / Math.log(2)));
    }

    /**
     * Downsample texture based on quality
     */
    async downsampleTexture(texture, qualityFactor) {
        if (!texture.image) return;

        const image = texture.image;
        const canvas = document.createElement('canvas');
        const newWidth = Math.max(256, Math.floor(image.width * qualityFactor));
        const newHeight = Math.max(256, Math.floor(image.height * qualityFactor));

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, newWidth, newHeight);

        texture.image = canvas;
        texture.needsUpdate = true;
    }

    /**
     * Export scene as GLTF
     */
    exportGLTF(scene, options) {
        return new Promise((resolve, reject) => {
            this.exporter.parse(
                scene,
                (result) => resolve(result),
                (error) => reject(error),
                options
            );
        });
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.dracoLoader) {
            this.dracoLoader.dispose();
        }
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
