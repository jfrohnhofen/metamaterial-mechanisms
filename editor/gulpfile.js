var browserify = require('browserify');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var livereload = require('gulp-livereload');
var merge = require('merge-stream');
var source = require('vinyl-source-stream');
var webserver = require('gulp-webserver');

var files = {
  static: [
    {
      src: './src/css/**/*.css',
      dest: './public/css',
    }, {
      src: './src/index.html',
      dest: './public',
    }, {
      src: './src/img/**/*.png',
      dest: './public/img',
    },
  ],
  js: {
    src: './src/js/**/*.js',
    entry: './src/js/index.js',
    dest: './public/js',
    bundle: 'bundle.js',
    fix: './src/js',
  },
  server: './public',
};

gulp.task('build:static', function() {
  return merge(files.static.map(function(entry) {
    return gulp
      .src(entry.src)
      .pipe(gulp.dest(entry.dest));
  })).pipe(livereload());
});

gulp.task('build:js', function() {
  return browserify(files.js.entry, { debug: true, detectGlobals: false })
    .bundle()
    .pipe(source(files.js.bundle))
    .pipe(gulp.dest(files.js.dest))
    .pipe(livereload());
});

gulp.task('lint', function() {
  return gulp
    .src(files.js.src)
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('fix', function() {
  return gulp
    .src(files.js.src)
    .pipe(eslint({ fix: true }))
    .pipe(eslint.format())
    .pipe(gulp.dest(files.js.fix));
});

gulp.task('server', function() {
  livereload.listen();

  gulp.watch(files.static.map(function(entry) { return entry.src; }), gulp.series('build:static'));
  gulp.watch(files.js.src, gulp.series('build:js'));

  return gulp
    .src(files.server)
    .pipe(webserver({ open: true }));
});

gulp.task('build', gulp.parallel('build:static', 'build:js'));
gulp.task('default', gulp.series('build', 'server'));
