'use strict';

const {watch, series, parallel, src, dest, lastRun} = require('gulp');
const path = require('path');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');
const sourcemaps = require('gulp-sourcemaps');
const bs = require('browser-sync').create();
const autoprefixer = require('gulp-autoprefixer');
const remember = require('gulp-remember');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const minifyJS = require('gulp-terser');
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const gulpIf = require('gulp-if');
const concat = require('gulp-concat');
const newer = require('gulp-newer');
const cached = require('gulp-cached');
const del = require('del');
const notify = require('gulp-notify');
const gcmq = require('gulp-group-css-media-queries');

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const paths = {
    styles: {
        src: 'src/styles/**/*.scss',
        dest: 'build/styles',
    },
    html: {
        src: 'src/*.html',
        dest: 'build',
    },
    js: {
        src: 'src/js/**/*.js',
        dest: 'build/js',
    },
    img: {
        src: 'src/assets/images/**/*.*',
        dest: 'build/assets/images',
    },
    fonts: {
        src: 'src/assets/fonts/**/*.*',
        dest: 'build/assets/fonts',
    },
    libs: {
        src: 'src/assets/libs/**/*.*',
        dest: 'build/assets/libs',
    }
};

function styles() {

    return src(paths.styles.src)
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(sass())
        .on('error', notify.onError())
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(remember('styles'))
        .pipe(gulpIf(isDevelopment, sourcemaps.write()))
        .pipe(gulpIf(!isDevelopment, cleanCSS()))
        .pipe(gulpIf(!isDevelopment, gcmq()))
        .pipe(dest(paths.styles.dest))
}

function scripts() {
    return src(paths.js.src, {since: lastRun(scripts)})
        .pipe(gulpIf(isDevelopment, sourcemaps.init()))
        .pipe(newer(paths.js.dest))
        .on('error', notify.onError())
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(gulpIf(!isDevelopment, minifyJS()))
        .pipe(concat('bundle.js'))
        .pipe(gulpIf(isDevelopment, sourcemaps.write()))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(dest(paths.js.dest))
}

function html() {

    return src(paths.html.src, {since: lastRun(html)})
        .pipe(newer(paths.html.dest))
        .on('error', notify.onError())
        .pipe(dest(paths.html.dest));
}

function fonts() {

    return src(paths.fonts.src, {since: lastRun(fonts)})
        .pipe(newer(paths.fonts.dest))
        .pipe(dest(paths.fonts.dest));
}

function libs() {

    return src(paths.libs.src, {since: lastRun(libs)})
        .pipe(newer(paths.libs.dest))
        .pipe(dest(paths.libs.dest));
}

function images() {

    return src(paths.img.src, {since: lastRun(images)})
        .pipe(newer(paths.img.dest))
        .pipe(gulpIf(!isDevelopment, imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.jpegtran({progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ])))
        .pipe(dest(paths.img.dest));
}

function clean() {

    return del('build');
}

function watcher() {

    watch(paths.styles.src, styles).on('unlink', function (filepath) {
        remember.forget('styles', path.resolve(filepath));
        delete cached.caches.styles[path.resolve(filepath)];
    });
    watch(paths.html.src, html);
    watch(paths.styles.src, styles);
    watch(paths.js.src, scripts);
    watch(paths.img.src, images);
    watch(paths.img.src, fonts);
    watch(paths.img.src, libs);
}

function bSync() {

    bs.init({
        server: './build',
    });

    bs.watch('build/**/*.*').on('change', bs.reload);
}

exports.clean = clean;

exports.build = series(clean, series(
    parallel(styles, scripts, images, fonts, libs),
    html)
);

exports.default = series(clean, series(
    parallel(html, styles, scripts, images, fonts, libs),
    parallel(bSync, watcher)
    )
);
