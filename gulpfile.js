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
const gulpCopy = require('gulp-copy');
// var env = require('gulp-env');
// env({file: '.env.json'});
// const gutil = require('gutil');
// const ftp = require('vinyl-ftp');

// import gulp from 'gulp';
// import eslint from 'gulp-eslint';
// import babel from 'gulp-babel';
// import prettify from 'gulp-js-prettify';
// import uglify from 'gulp-uglify';
// import concat from 'gulp-concat';
// import beautify from 'gulp-beautify';
// import rename from 'gulp-rename';
// import sass from 'gulp-sass';
// import sourcemaps from 'gulp-sourcemaps';
// import minifyCSS from 'gulp-clean-css';
// import autoprefixer from 'gulp-autoprefixer';
// import wpPot from 'gulp-wp-pot';
// import zip from 'gulp-zip';
// import notify from 'gulp-notify';
// import checktextdomain from 'gulp-checktextdomain';
// import gulpCopy from 'gulp-copy';

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
]


const config = {
	babel: {
		presets: ['@babel/preset-env']
	},
	prettify: {
		"indent_with_tabs": true
	},
	js: {
		src: ['admin/js/*.js', '!admin/js/**/*.min.js'],
		dist: 'admin/js/.',
	},
	css: {
		src: ['admin/css/*.css', '!*.min.css'],
		dist: 'admin/css/minify',
	},
	scss: {
		src: 'assets/scss/*.scss',
		dist: 'assets/css',
	},
	autoprefixer: {
		options: {
			cascade: false,
		},
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
		file_name: 'ar-vr-3d-model-try-on',
		dist: 'production',
		options: {
			compress: true,
			modifiedTime: undefined
		}
	},
	copy: {
		src: productionSrc,
		output: 'production/ar-vr-3d-model-try-on/',
		options: {
			//compress: true,
			//modifiedTime: undefined
		}
	},
	test: {
		src: productionSrc,
		output: 'D://mamp/htdocs/azizulhasan/artest/wp-content/plugins/ar-vr-3d-model-try-on/',
		options: {
			//compress: true,
			//modifiedTime: undefined
		}
	},
	release: {
		src: productionSrc,
		output: 'D:/xampp/htdocs/wordpress.org/ar-vr-3d-model-try-on/trunk/',
		options: {
			//compress: true,
			//modifiedTime: undefined
		}
	},
	copyProButton: {
		src: [],
		output: 'D:/mamp/htdocs/azizulhasan/tts/wp-content/plugins/ar-try-on-pro/Assets/js/build/',
		options: {
			//compress: true,
			//modifiedTime: undefined
		}
	}

	// ftp:{
	// 	src: [
	// 		'index.php',
	// 		'uninstall.php',
	// 		'woo-invoice.php',
	// 		'LICENSE.txt',
	// 		'README.txt',
	// 		'libs/**',
	// 		'admin/**',
	// 		'includes/**',
	// 		'languages/**',
	// 		'!admin/css/flatpickr.css',
	// 		'!admin/css/selectize.css',
	// 		'!admin/css/selectize.default.css',
	// 		'!admin/css/slick.css',
	// 		'!admin/css/slick-theme.css',
	// 		'!admin/css/webappick-boilerplate-admin.css',
	// 		'!admin/css/webappick-pdf-invoice-for-wordpress-admin.css'
	// 	],
	// 	options: {
	// 		host: process.env.FTP_HOST,
	// 		port: process.env.FTP_PORT,
	// 		user: process.env.FTP_USER,
	// 		password: process.env.FTP_PASSWORD,
	// 		log: gutil.log,
	// 		parallel: 9,
	// 		maxConnections:9,
	// 	},
	// 	base: process.env.FTP_DEPLOYPATH,
	// 	folder: process.env.FTP_DEPLOYFOLDER
	// }
};

// Tasks
gulp.task(
	'compile:js',
	() => {
		return gulp.src(config.js.src)
			.pipe(sourcemaps.init({ largeFile: true, loadMaps: true }))
			.pipe(eslint.format())
			.pipe(eslint())
			.pipe(babel(config.babel))
			.on('error', notify.onError({ title: "Error", message: "Error: <%= error.message %>" })) // phpcs:ignore WordPressVIPMinimum.Security.Underscorejs.OutputNotation
			.pipe(uglify())
			.pipe(rename({ suffix: '.min' }))
			.pipe(sourcemaps.write())
			.pipe(gulp.dest(config.js.dist))
			.pipe(notify({ message: 'TASK: compile:js Completed! 💯', onLast: true }));
	}
);
// minify:css
gulp.task(
	'minify:css',
	() => {
		return gulp.src(config.css.src)
			.pipe(minifyCSS({ compatibility: 'ie8' }))
			.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
			.pipe(rename({ suffix: '.min' }))
			.pipe(gulp.dest(config.css.dist));
	}
);
// compile:scss
gulp.task(
	'compile:scss',
	() => {
		return gulp.src(config.scss.src)
			.pipe(sass().on('error', sass.logError))
			.on('error', notify.onError({ title: "Error", message: "Error: <%= error.message %>" })) // phpcs:ignore WordPressVIPMinimum.Security.Underscorejs.OutputNotation
			.pipe(sourcemaps.init())
			.pipe(autoprefixer(config.autoprefixer.options))
			.pipe(beautify.js({ indent_size: 4 }))
			.pipe(sourcemaps.write('.'))
			.pipe(gulp.dest(config.scss.dist))
			.pipe(minifyCSS())
			.pipe(rename({ suffix: '.min' }))
			.pipe(gulp.dest(config.scss.dist))
			.pipe(notify({ message: 'TASK: compile:scss Completed! 💯', onLast: true }));
	}
);
//makePot
gulp.task(
	'makePot',
	() => {
		return gulp.src(config.pot.src)
			.pipe(wpPot(config.pot.options))
			.on('error', notify.onError({ title: "Error", message: "Error: <%= error.message %>" })) // phpcs:ignore WordPressVIPMinimum.Security.Underscorejs.OutputNotation
			.pipe(gulp.dest(config.pot.dist))
			.pipe(notify({ message: 'TASK: makePot Completed! 💯', onLast: true }));
	}
);

// makeZip
gulp.task(
	'makeZip',
	function () {
		return gulp.series('copy', 'zip')()
	}
);

gulp.task('zip', function () {
	return gulp.src('production/**')
		.pipe(zip(config.zip.file_name.replace('.zip', '') + '.zip'), config.zip.options)
		.pipe(gulp.dest(config.zip.dist))
		.pipe(notify({ message: 'Zipping Completed! 💯', onLast: true }))
})


gulp.task('copy', function () {
	return gulp.src(config.copy.src)
		.pipe(gulpCopy(config.copy.output, config.copy.src.options))
		.pipe(notify({ message: 'Copy Completed! 💯', onLast: true }))

})

// Copy pro button
gulp.task('copyProButton', function () {
	return gulp.src(config.copyProButton.src)
		.pipe(gulpCopy(config.copyProButton.output, config.copyProButton.src.options))
		.pipe(notify({ message: 'Copy Completed! 💯', onLast: true }))
})

gulp.task('release', function () {
	return gulp.src(config.release.src)
		.pipe(gulpCopy(config.release.output, config.release.options))
		.pipe(notify({ message: 'Release version copy Completed! 💯', onLast: true }))
})

gulp.task('test', function () {
	return gulp.src(config.test.src)
		.pipe(gulpCopy(config.test.output, config.test.options))
		.pipe(notify({ message: 'Release version copy Completed! 💯', onLast: true }))
})

// watch
gulp.task(
	'watch',
	function () {
		gulp.watch(config.css.src, gulp.series('minify:css'));
	}
);
// checktextdomain
gulp.task('checktextdomain', function () {
	return gulp
		.src('**/*.php')
		.pipe(checktextdomain({
			text_domain: 'ar-vr-3d-model-try-on', //Specify allowed domain(s)
			keywords: [ //List keyword specifications
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
			],
		}));
});

// build
gulp.task('build', gulp.series('minify:css', 'compile:js', 'makeZip'));


// gulp.task('deploy',  function(){
// 	let conn = ftp.create(config.ftp.options);
// 	return gulp.src(config.ftp.src, {base: '.', buffer: false})
// 		.pipe(conn.newer(config.ftp.folder))
// 		.pipe(conn.dest(config.ftp.folder))
// 		.pipe( notify( {message: 'File Upload Completed! 💯', onLast: true} ) );
// });