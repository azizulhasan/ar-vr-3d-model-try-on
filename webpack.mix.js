const mix = require('laravel-mix');


mix.js('src/dashboard/index.js', 'admin/js/build/ar-try-on-dashboard-ui.min.js').react();
mix.js('src/metabox/index.js', 'admin/js/build/ar-try-on-metabox-ui.min.js').react();
mix.js('admin/js/ar-try-on-media-library.js', 'admin/js/build/ar-try-on-media-library.min.js');


mix.webpackConfig({});
