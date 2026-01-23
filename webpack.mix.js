const mix = require('laravel-mix');
const fs = require('fs');
const path = require('path');

mix.js('src/dashboard/index.js', 'admin/js/build/ar-try-on-dashboard-ui.min.js').react();
mix.js('src/metabox/index.js', 'admin/js/build/ar-try-on-metabox-ui.min.js').react();
mix.js('admin/js/ar-try-on-media-library.js', 'admin/js/build/ar-try-on-media-library.min.js');
mix.js('admin/js/ar-compression-client.js', 'admin/js/build/ar-compression-client.min.js');
mix.js('public/js/ar-vr-3d-model-try-on-public.js', 'public/js/ar-vr-3d-model-try-on-public-dist.js');
mix.js('admin/js/ar-vr-3d-model-try-on-preview.js', 'admin/js/build/ar-vr-3d-model-try-on-preview.min.js');
mix.js('public/js/AtlasAR.js', 'public/js/AtlasAR.dist.js');


mix.webpackConfig({
    output: {
        chunkFilename: 'admin/js/build/chunks/[name].js', // Output chunks to dedicated folder (will be auto-deleted)
    },
    optimization: {
        splitChunks: false, // Disable code splitting to prevent chunks folder
        runtimeChunk: false, // Disable runtime chunk
    },
    plugins: [
        // Auto-cleanup unwanted chunk files after compilation
        {
            apply: (compiler) => {
                compiler.hooks.done.tap('CleanupChunks', (stats) => {
                    const rootDir = __dirname;
                    const chunkPattern = /^_[a-f0-9]{4}\.js$/;

                    // Locations to check for unwanted chunk files
                    const locationsToClean = [
                        rootDir, // Root directory
                        path.join(rootDir, 'admin/js/build'), // Build directory
                    ];

                    // Delete chunk files in all locations
                    locationsToClean.forEach(location => {
                        if (fs.existsSync(location)) {
                            fs.readdirSync(location).forEach(file => {
                                if (chunkPattern.test(file)) {
                                    const filePath = path.join(location, file);
                                    fs.unlinkSync(filePath);
                                    console.log(`✓ Cleaned up unwanted chunk: ${file} from ${location}`);
                                }
                            });
                        }
                    });

                    // Delete unwanted folders
                    const unwantedFolders = [
                        'admin/js/build/ar-try-on-dashboard-ui.min',
                        'admin/js/build/ar-try-on-metabox-ui.min',
                        'admin/js/build/chunks'
                    ];

                    unwantedFolders.forEach(folder => {
                        const folderPath = path.join(rootDir, folder);
                        if (fs.existsSync(folderPath)) {
                            fs.rmSync(folderPath, { recursive: true, force: true });
                            console.log(`✓ Cleaned up unwanted folder: ${folder}`);
                        }
                    });
                });
            }
        }
    ]
});

// Override Mix's default behavior
mix.options({
    processCssUrls: false,
});
