#!/usr/bin/env node
/**
 * Server-Side 3D Model Compression Script
 *
 * Compresses large GLB/GLTF files using Node.js for better performance.
 * Used for files >5MB (Pro feature).
 *
 * Usage: node server-compress.js <input-file> <output-file> <quality>
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes/compression
 * @since      1.8.0
 */

const fs = require('fs');
const path = require('path');
const { Document, NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf');
const sharp = require('sharp');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node server-compress.js <input-file> <output-file> <quality>');
    process.exit(1);
}

const [inputFile, outputFile, qualityStr] = args;
const quality = parseInt(qualityStr) || 85;

/**
 * Main compression function
 */
async function compressModel() {
    const startTime = Date.now();

    try {
        // Validate input file
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Input file not found: ${inputFile}`);
        }

        console.log(`[1/5] Reading model: ${inputFile}`);

        // Create IO instance with Draco extension
        const io = new NodeIO()
            .registerExtensions(ALL_EXTENSIONS)
            .registerDependencies({
                'draco3d.decoder': await draco3d.createDecoderModule(),
                'draco3d.encoder': await draco3d.createEncoderModule(),
            });

        // Load the document
        const document = await io.read(inputFile);

        console.log('[2/5] Analyzing model structure');

        // Get statistics
        const root = document.getRoot();
        const scenes = root.listScenes();
        const meshes = root.listMeshes();
        const materials = root.listMaterials();
        const textures = root.listTextures();

        console.log(`  - Scenes: ${scenes.length}`);
        console.log(`  - Meshes: ${meshes.length}`);
        console.log(`  - Materials: ${materials.length}`);
        console.log(`  - Textures: ${textures.length}`);

        console.log('[3/5] Optimizing geometry');

        // Optimize meshes
        for (const mesh of meshes) {
            const primitives = mesh.listPrimitives();

            for (const primitive of primitives) {
                // Remove unused attributes
                const attributes = primitive.listAttributes();
                const semantics = primitive.listSemantics();

                // Remove UV2 if not used by material
                if (semantics.includes('TEXCOORD_1')) {
                    const material = primitive.getMaterial();
                    if (!material || !material.getOcclusionTexture()) {
                        const uv2Attribute = primitive.getAttribute('TEXCOORD_1');
                        if (uv2Attribute) {
                            primitive.setAttribute('TEXCOORD_1', null);
                        }
                    }
                }
            }
        }

        console.log('[4/5] Compressing textures');

        // Compress textures based on quality
        const qualityFactor = quality / 100;

        for (const texture of textures) {
            const image = texture.getImage();
            if (!image) continue;

            const mimeType = texture.getMimeType();

            try {
                // Get original dimensions
                const metadata = await sharp(image).metadata();
                const { width, height } = metadata;

                // Calculate new dimensions (power of two)
                let newWidth = nearestPowerOfTwo(Math.floor(width * qualityFactor));
                let newHeight = nearestPowerOfTwo(Math.floor(height * qualityFactor));

                // Minimum 256px
                newWidth = Math.max(256, newWidth);
                newHeight = Math.max(256, newHeight);

                // Resize and compress
                let processedImage;
                if (mimeType === 'image/jpeg') {
                    processedImage = await sharp(image)
                        .resize(newWidth, newHeight, { fit: 'contain' })
                        .jpeg({ quality: Math.floor(quality), mozjpeg: true })
                        .toBuffer();
                } else {
                    processedImage = await sharp(image)
                        .resize(newWidth, newHeight, { fit: 'contain' })
                        .png({ quality: Math.floor(quality), compressionLevel: 9 })
                        .toBuffer();
                }

                texture.setImage(processedImage);

                console.log(`  - Compressed texture: ${width}x${height} → ${newWidth}x${newHeight}`);
            } catch (err) {
                console.warn(`  - Failed to compress texture: ${err.message}`);
            }
        }

        console.log('[5/5] Exporting compressed model');

        // Write with Draco compression
        await io.write(outputFile, document);

        const endTime = Date.now();
        const compressionTime = endTime - startTime;

        // Get file sizes
        const originalSize = fs.statSync(inputFile).size;
        const compressedSize = fs.statSync(outputFile).size;
        const compressionRatio = ((1 - (compressedSize / originalSize)) * 100).toFixed(1);

        console.log('\n✅ Compression complete!');
        console.log(`  - Original size: ${formatBytes(originalSize)}`);
        console.log(`  - Compressed size: ${formatBytes(compressedSize)}`);
        console.log(`  - Savings: ${formatBytes(originalSize - compressedSize)} (${compressionRatio}%)`);
        console.log(`  - Time: ${(compressionTime / 1000).toFixed(2)}s`);

        // Output JSON result for PHP to parse
        const result = {
            success: true,
            originalSize,
            compressedSize,
            compressionRatio: parseFloat(compressionRatio),
            compressionTime,
            outputFile,
        };

        console.log('\n--- RESULT ---');
        console.log(JSON.stringify(result));
        console.log('--- END RESULT ---');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Compression failed:', error.message);

        const result = {
            success: false,
            error: error.message,
        };

        console.log('\n--- RESULT ---');
        console.log(JSON.stringify(result));
        console.log('--- END RESULT ---');

        process.exit(1);
    }
}

/**
 * Get nearest power of two
 */
function nearestPowerOfTwo(value) {
    return Math.pow(2, Math.round(Math.log(value) / Math.log(2)));
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run compression
compressModel();
