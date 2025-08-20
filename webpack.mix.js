const mix = require('laravel-mix');


mix.js('src/dashboard/index.js', 'admin/js/build/ar-try-on-dashboard-ui.min.js').react();
mix.js('src/metabox/index.js', 'admin/js/build/ar-try-on-metabox-ui.min.js').react();
// mix.js('admin/js/ar-try-on-media-library.js', 'admin/js/build/ar-try-on-media-library.min.js');
// mix.js('public/js/ar-vr-3d-model-try-on-public.js', 'public/js/ar-vr-3d-model-try-on-public-dist.js');
// mix.js('admin/js/ar-vr-3d-model-try-on-preview.js', 'admin/js/build/ar-vr-3d-model-try-on-preview.min.js');
// mix.js('public/js/AtlasAR.js', 'public/js/AtlasAR.dist.js');


mix.webpackConfig({});
