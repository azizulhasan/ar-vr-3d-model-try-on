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

// Try-On (TensorFlow.js + MediaPipe) — lazy-loaded entry, never on initial render.
// Worker uses native webpack 5 `new Worker(new URL(...), { type: 'module' })` syntax.
mix.js('public/js/tryon/tryon-bootstrap.js', 'public/js/build/tryon-bootstrap.dist.js');


mix.webpackConfig({
    output: {
        // Route chunks to a path based on chunk name. Try-on chunks include
        // a contenthash in the filename so every rebuild produces a unique
        // URL — prevents browsers from holding on to a stale chunk file
        // whose webpack runtime IDs no longer match the freshly-built
        // bootstrap.dist.js. The cleanup hook below wipes orphaned files
        // each build so the chunks dir doesn't grow forever.
        chunkFilename: (pathData) => {
            const name = (pathData.chunk && pathData.chunk.name) || '';
            if (/tryon|landmarker|mediapipe/i.test(name)) {
                return 'public/js/build/chunks/[name].[contenthash:8].js';
            }
            return 'admin/js/build/chunks/[name].js';
        },
    },
    optimization: {
        splitChunks: false, // Disable shared/vendor splitting; dynamic imports still chunk.
        runtimeChunk: false,
    },
    plugins: [
        // BEFORE-build: wipe the try-on chunks dir so old hashed files
        // don't pile up after repeated rebuilds.
        {
            apply: (compiler) => {
                compiler.hooks.beforeRun.tapAsync('WipeTryonChunks', (_c, cb) => {
                    const dir = path.join(__dirname, 'public/js/build/chunks');
                    if (fs.existsSync(dir)) {
                        for (const f of fs.readdirSync(dir)) {
                            try {
                                fs.unlinkSync(path.join(dir, f));
                            } catch (e) { /* ignore */ }
                        }
                    }
                    cb();
                });
                // Also wipe on `watch` runs.
                compiler.hooks.watchRun.tapAsync('WipeTryonChunksWatch', (_c, cb) => {
                    const dir = path.join(__dirname, 'public/js/build/chunks');
                    if (fs.existsSync(dir)) {
                        for (const f of fs.readdirSync(dir)) {
                            try {
                                fs.unlinkSync(path.join(dir, f));
                            } catch (e) { /* ignore */ }
                        }
                    }
                    cb();
                });
            }
        },
        // Auto-cleanup unwanted chunk files after compilation.
        {
            apply: (compiler) => {
                compiler.hooks.done.tap('CleanupChunks', (stats) => {
                    const rootDir = __dirname;
                    const chunkPattern = /^_[a-f0-9]{4}\.js$/;

                    // Locations to check for unwanted chunk files.
                    const locationsToClean = [
                        rootDir, // Root directory
                        path.join(rootDir, 'admin/js/build'), // Admin build directory
                    ];

                    // Delete chunk files in all locations.
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

                    // Delete unwanted folders. Note: public/js/build/chunks is
                    // INTENTIONALLY kept — it holds the lazy-loaded try-on
                    // controller and MediaPipe worker.
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
