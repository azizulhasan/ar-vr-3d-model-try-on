const gulp = require('gulp');
const eslint = require('gulp-eslint');
const babel = require('gulp-babel');
const prettify = require('gulp-js-prettify');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const beautify = require('gulp-beautify');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const minifyCSS = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const wpPot = require('gulp-wp-pot');
const zip = require('gulp-zip');
const notify = require('gulp-notify');
const checktextdomain = require('gulp-checktextdomain');
const del = require('del'); // del v7+: use del.deleteAsync()

const productionSrc = [
	'**/*',
	'!.git/**',
	'!.husky/**',
	'!node_modules/**',
	'!production/**',
	'!src/**',
	'!.browserslistrc',
	'!.eslintrc',
	'!.gitignore',
	'!gulpfile.js',
	'!package.json',
	'!composer.lock',
	'!composer.json',
	'!phpcs.xml',
	'!.cpanel.yml',
	'!README.md',
	'!package-lock.json',
	'!mix-manifest.json',
	'!webpack.mix.js',
	'!tailwind.config.js',
	'!public/js/ar-vr-3d-model-try-on-public.js',
	'!admin/js/ar-try-on-media-library.js',
	'!public/js/AtlasAR.js',
	'!tailwind.config.modal.js',
	'!admin/images/.DS_Store',
	'!public/js/single-product.js' // TODO:: this file might be necessary in the near future.
];

const config = {
	babel: {
		presets: ['@babel/preset-env']
	},
	prettify: {
		indent_with_tabs: true
	},
	js: {
		src: ['admin/js/*.js', '!admin/js/**/*.min.js'],
		dist: 'admin/js/.'
	},
	css: {
		src: ['admin/css/*.css', '!*.min.css'],
		dist: 'admin/css/minify'
	},
	scss: {
		src: 'assets/scss/*.scss',
		dist: 'assets/css'
	},
	autoprefixer: {
		options: {
			cascade: false
		}
	},
	pot: {
		src: '**/*.php',
		dist: 'languages/ar-vr-3d-model-try-on.pot',
		options: {
			domain: 'ar-vr-3d-model-try-on',
			package: 'AR VR 3D Try On for WordPress',
			bugReport: '',
			headers: {
				'X-Domain': 'ar-vr-3d-model-try-on'
			}
		}
	},
	zip: {
		src: productionSrc,
		file_name: 'ar-vr-3d-model-try-on', // no ".zip" here
		dist: 'production',
		options: {
			compress: true,
			modifiedTime: undefined
		}
	},
	copy: {
		src: productionSrc,
		output: 'production/ar-vr-3d-model-try-on/'
	},
	test: {
		src: productionSrc,
		output:
			'D://mamp/htdocs/azizulhasan/artest/wp-content/plugins/ar-vr-3d-model-try-on/'
	},
	release: {
		src: productionSrc,
		output:
			'D:/xampp/htdocs/wordpress.org/ar-vr-3d-model-try-on/trunk/'
	},
	copyProButton: {
		src: [], // fill when you need it
		output:
			'D:/mamp/htdocs/azizulhasan/tts/wp-content/plugins/ar-try-on-pro/Assets/js/build/'
	}
	// ftp config stays commented out if needed later
};

// ---------------------- CLEAN ----------------------

gulp.task('clean:production', function () {
	// del v7: use deleteAsync
	return del.deleteAsync(['production/**', '!production']);
});

// ---------------------- JS ----------------------

gulp.task('compile:js', () => {
	return gulp
		.src(config.js.src)
		.pipe(sourcemaps.init({ largeFile: true, loadMaps: true }))
		.pipe(eslint())
		.pipe(eslint.format())
		// .pipe(eslint.failAfterError()) // optional if you want build to fail on lint error
		.pipe(babel(config.babel))
		.on(
			'error',
			notify.onError({
				title: 'Error',
				message: 'Error: <%= error.message %>'
			})
		)
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(config.js.dist))
		.pipe(
			notify({ message: 'TASK: compile:js Completed! 💯', onLast: true })
		);
});

// ---------------------- CSS ----------------------

gulp.task('minify:css', () => {
	return gulp
		.src(config.css.src)
		.pipe(minifyCSS({ compatibility: 'ie8' }))
		.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest(config.css.dist));
});

gulp.task('compile:scss', () => {
	return gulp
		.src(config.scss.src)
		.pipe(sass().on('error', sass.logError))
		.on(
			'error',
			notify.onError({
				title: 'Error',
				message: 'Error: <%= error.message %>'
			})
		)
		.pipe(sourcemaps.init())
		.pipe(autoprefixer(config.autoprefixer.options))
		.pipe(beautify.js({ indent_size: 4 }))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(config.scss.dist))
		.pipe(minifyCSS())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest(config.scss.dist))
		.pipe(
			notify({
				message: 'TASK: compile:scss Completed! 💯',
				onLast: true
			})
		);
});

// ---------------------- POT ----------------------

gulp.task('makePot', () => {
	return gulp
		.src(config.pot.src)
		.pipe(wpPot(config.pot.options))
		.on(
			'error',
			notify.onError({
				title: 'Error',
				message: 'Error: <%= error.message %>'
			})
		)
		.pipe(gulp.dest(config.pot.dist))
		.pipe(
			notify({
				message: 'TASK: makePot Completed! 💯',
				onLast: true
			})
		);
});

// ---------------------- COPY / ZIP ----------------------

// Copy plugin files to production folder
gulp.task('copy', () => {
	return gulp
		.src(config.copy.src, { base: '.' })
		.pipe(gulp.dest(config.copy.output))
		.pipe(notify({ message: 'Copy Completed! 💯', onLast: true }));
});

// Zip directly from original sources (productionSrc)
// This avoids re-reading from a potentially broken production folder.
gulp.task('zip', () => {
	return gulp
		.src(config.zip.src, { base: '.', allowEmpty: true })
		.pipe(zip(config.zip.file_name + '.zip', config.zip.options))
		.pipe(gulp.dest(config.zip.dist))
		.pipe(
			notify({
				message: 'Zipping Completed! 💯',
				onLast: true
			})
		);
});

// makeZip = clean production → copy → zip
gulp.task('makeZip', gulp.series('clean:production', 'copy', 'zip'));

// ---------------------- OTHER COPIES ----------------------

gulp.task('copyProButton', () => {
	return gulp
		.src(config.copyProButton.src, { base: '.' })
		.pipe(gulp.dest(config.copyProButton.output))
		.pipe(
			notify({
				message: 'Copy Completed! 💯',
				onLast: true
			})
		);
});

gulp.task('release', () => {
	return gulp
		.src(config.release.src, { base: '.' })
		.pipe(gulp.dest(config.release.output))
		.pipe(
			notify({
				message: 'Release version copy Completed! 💯',
				onLast: true
			})
		);
});

gulp.task('test', () => {
	return gulp
		.src(config.test.src, { base: '.' })
		.pipe(gulp.dest(config.test.output))
		.pipe(
			notify({
				message: 'Release version copy Completed! 💯',
				onLast: true
			})
		);
});

// ---------------------- WATCH ----------------------

gulp.task('watch', () => {
	gulp.watch(config.css.src, gulp.series('minify:css'));
});

// ---------------------- I18N CHECK ----------------------

gulp.task('checktextdomain', () => {
	return gulp
		.src('**/*.php')
		.pipe(
			checktextdomain({
				text_domain: 'ar-vr-3d-model-try-on',
				keywords: [
					'__:1,2d',
					'_e:1,2d',
					'_x:1,2c,3d',
					'esc_html__:1,2d',
					'esc_html_e:1,2d',
					'esc_html_x:1,2c,3d',
					'esc_attr__:1,2d',
					'esc_attr_e:1,2d',
					'esc_attr_x:1,2c,3d',
					'_ex:1,2c,3d',
					'_n:1,2,4d',
					'_nx:1,2,4c,5d',
					'_n_noop:1,2,3d',
					'_nx_noop:1,2,3c,4d'
				]
			})
		);
});

// ---------------------- BUILD ----------------------

gulp.task('build', gulp.series('minify:css', 'compile:js', 'makeZip'));

// deploy task still commented (as original)
// gulp.task('deploy',  function(){
// 	let conn = ftp.create(config.ftp.options);
// 	return gulp.src(config.ftp.src, {base: '.', buffer: false})
// 		.pipe(conn.newer(config.ftp.folder))
// 		.pipe(conn.dest(config.ftp.folder))
// 		.pipe( notify( {message: 'File Upload Completed! 💯', onLast: true} ) );
// });
