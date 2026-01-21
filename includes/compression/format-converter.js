#!/usr/bin/env node
/**
 * 3D Model Format Converter Script
 *
 * Converts FBX/OBJ files to GLB format using Node.js.
 * Pro feature only.
 *
 * Usage: node format-converter.js <input-file> <output-file> <options>
 *
 * @package    AR_TRY_ON
 * @subpackage AR_TRY_ON/includes/compression
 * @since      1.8.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node format-converter.js <input-file> <output-file> [options]');
    process.exit(1);
}

const [inputFile, outputFile, optionsJson = '{}'] = args;
const options = JSON.parse(optionsJson);

/**
 * Main conversion function
 */
async function convertModel() {
    const startTime = Date.now();

    try {
        // Validate input file
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Input file not found: ${inputFile}`);
        }

        console.log(`[1/4] Reading input file: ${inputFile}`);

        // Get file extension
        const inputExt = path.extname(inputFile).toLowerCase();
        const inputFormat = inputExt.replace('.', '');

        console.log(`[2/4] Detected format: ${inputFormat}`);

        // Check if conversion is supported
        const supportedFormats = ['fbx', 'obj', 'gltf', 'glb'];
        if (!supportedFormats.includes(inputFormat)) {
            throw new Error(`Unsupported input format: ${inputFormat}. Supported formats: ${supportedFormats.join(', ')}`);
        }

        // If already GLB, just copy
        if (inputFormat === 'glb') {
            console.log('[3/4] Input is already GLB format, copying file');
            fs.copyFileSync(inputFile, outputFile);
        } else if (inputFormat === 'gltf') {
            // Convert GLTF to GLB using gltf-transform
            console.log('[3/4] Converting GLTF to GLB');
            await convertGltfToGlb(inputFile, outputFile);
        } else {
            // For FBX/OBJ, we need external converters
            console.log(`[3/4] Converting ${inputFormat.toUpperCase()} to GLB`);

            if (inputFormat === 'fbx') {
                await convertFbxToGlb(inputFile, outputFile, options);
            } else if (inputFormat === 'obj') {
                await convertObjToGlb(inputFile, outputFile, options);
            }
        }

        console.log('[4/4] Validating output file');

        // Verify output file exists
        if (!fs.existsSync(outputFile)) {
            throw new Error('Conversion completed but output file not found');
        }

        const endTime = Date.now();
        const conversionTime = endTime - startTime;

        // Get file sizes
        const originalSize = fs.statSync(inputFile).size;
        const convertedSize = fs.statSync(outputFile).size;

        console.log('\n✅ Conversion complete!');
        console.log(`  - Original format: ${inputFormat.toUpperCase()}`);
        console.log(`  - Original size: ${formatBytes(originalSize)}`);
        console.log(`  - Converted size: ${formatBytes(convertedSize)}`);
        console.log(`  - Time: ${(conversionTime / 1000).toFixed(2)}s`);

        // Output JSON result for PHP to parse
        const result = {
            success: true,
            originalFormat: inputFormat,
            originalSize,
            convertedSize,
            conversionTime,
            outputFile,
        };

        console.log('\n--- RESULT ---');
        console.log(JSON.stringify(result));
        console.log('--- END RESULT ---');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Conversion failed:', error.message);

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
 * Convert GLTF to GLB using gltf-transform
 */
async function convertGltfToGlb(inputFile, outputFile) {
    const { NodeIO } = require('@gltf-transform/core');
    const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.read(inputFile);
    await io.write(outputFile, document);
}

/**
 * Convert FBX to GLB
 *
 * Note: FBX conversion requires FBX2glTF or similar external tool.
 * This implementation provides a framework - actual conversion depends on available tools.
 */
async function convertFbxToGlb(inputFile, outputFile, options) {
    // Check for FBX2glTF tool
    try {
        // Try to use FBX2glTF if available
        const command = `FBX2glTF "${inputFile}" -o "${outputFile}" --binary`;
        execSync(command, { stdio: 'pipe' });
    } catch (error) {
        // If FBX2glTF not available, provide helpful error
        throw new Error(
            'FBX conversion requires FBX2glTF tool. ' +
            'Download from: https://github.com/facebookincubator/FBX2glTF. ' +
            'Original error: ' + error.message
        );
    }
}

/**
 * Convert OBJ to GLB using obj2gltf
 */
async function convertObjToGlb(inputFile, outputFile, options) {
    // Check for obj2gltf
    try {
        // Check if obj2gltf is installed
        try {
            require.resolve('obj2gltf');
        } catch (e) {
            throw new Error(
                'OBJ conversion requires obj2gltf package. ' +
                'Install with: npm install obj2gltf'
            );
        }

        const obj2gltf = require('obj2gltf');

        // Convert OBJ to glTF
        const gltf = await obj2gltf(inputFile, {
            binary: true,
            separate: false,
            checkTransparency: true,
            metallicRoughness: true,
        });

        // Write binary GLB
        fs.writeFileSync(outputFile, gltf.glb);

    } catch (error) {
        throw new Error('OBJ conversion failed: ' + error.message);
    }
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

// Run conversion
convertModel();
