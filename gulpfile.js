const gulp = require("gulp");
const rename = require("gulp-rename");
const runSequence = require('run-sequence');
const spawn = require('child_process').spawn;
const concat = require("gulp-concat");
const ts = require('gulp-typescript');
var node;
const bump = require('gulp-bump');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const tsUniversal = require('ts-universal')
const project = ts.createProject('src/tsconfig.json');

// Publish sc
gulp.task('increment-version', function () {
      gulp.src('./package.json')
            .pipe(bump())
            .pipe(gulp.dest('./'));
});
gulp.task('push', function (done) {
      var publish = spawn('npm', ['publish'], {
            stdio: 'inherit'
      })
      publish.on('close', function (code) {
            if (code === 8) {
                  gulp.log('Error detected, waiting for changes...');
            }
            done()
      });
})

gulp.task('dist', function () {


      let result = gulp.src('src/**/*.ts')
            .pipe(sourcemaps.init())
            .pipe(ts(project));

      return merge([
            result.dts.pipe(gulp.dest('dist/')),
            result.js.pipe(tsUniversal('build/', {
                  base : 'build/',
                  expose: 'index'
            }))
            .pipe(rename('index.js'))
            .pipe(gulp.dest('dist/'))
      ]);
});
