const mix = require('laravel-mix');
const fs = require('fs');
const path = require('path');

mix.js('admin/js/ar-compression-client.js', 'admin/js/build/ar-compression-client.min.js');

// AR-120: the admin screens are plain scripts on wp.element (admin/js/atlas-ar-*.js), not bundled.
// AR-116: the shop front end is the AtlasAR viewer SDK (public/js/atlasar-sdk, copied by
// scripts/copy-atlasar-sdk.js) plus public/js/atlas-ar-front.js (plain, not bundled).


mix.webpackConfig({
    output: {
        // `publicPath: 'auto'` lets webpack resolve dynamic-import
        // chunk URLs against the location of the entry script at
        // runtime (via `document.currentScript.src`). Without this,
        // chunks like the Draco encoder lazy-loaded by
        // `ar-compression-client.js` would be requested from
        // `/admin/js/build/chunks/...` relative to the site root
        // instead of relative to the plugin URL — which 404s on any
        // WordPress install that isn't at the root of its domain.
        // Caught during Pro-active compression smoke-test 2026-06.
        publicPath: 'auto',

        chunkFilename: 'admin/js/build/chunks/[name].js',
    },
    optimization: {
        splitChunks: false, // Disable shared/vendor splitting; dynamic imports still chunk.
        runtimeChunk: false,
    },
    plugins: [
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

                    // Delete unwanted folders. Note: admin/js/build/chunks is
                    // intentionally kept: it hosts the Draco-encoder chunk
                    // that `ar-compression-client.js` dynamic-imports at
                    // compression time. Deleting either folder breaks the
                    // matching feature with a `ChunkLoadError: Loading
                    // chunk N failed`. Caught during Pro-active compression
                    // smoke-test 2026-06 — used to include
                    // 'admin/js/build/chunks' in this list, which silently
                    // broke Draco compression for every Pro user.
                    const unwantedFolders = [
                        'admin/js/build/ar-try-on-dashboard-ui.min',
                        'admin/js/build/ar-try-on-metabox-ui.min',
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
    // AR-70: strip debug logging from the minified production bundles so
    // the front end / admin console stays clean (wphive "JavaScript error"
    // noise flag). Treating console.log/info/debug as pure lets Terser drop
    // those calls entirely, while console.warn / console.error are kept for
    // genuine diagnostics. Only applies to the NODE_ENV=production build.
    terser: {
        terserOptions: {
            compress: {
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
        },
    },
});
