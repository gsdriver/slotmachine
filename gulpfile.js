'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const reporter = require('eslint-html-reporter');
const path = require('path');
const fs = require('fs');
const zip = require('gulp-zip');
const tap = require('gulp-tap');
const del = require('del');

gulp.task('build:prepare', ['clean'], () =>
  // copy only what we need for deployment
  gulp.src(['**/*', '!build/**', '!.git', '!.git/**', '!processScores', '!processScores/**', '!package.json', '!README.md', '!speechAssets', '!speechAssets/**', '!.gitignore', '!.idea', '!.idea/**', '!*.zip'], {dot: true})
    .pipe(gulp.dest('build/'))
);

// task to run es lint.
gulp.task('lint', () =>
  gulp.src(['*.js', '*/**/*.js', '!test/**', '!build/**', '!node_modules/**', '!ext/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.format(reporter, (results) => {
      fs.writeFileSync(path.join(__dirname, 'build/lint-report.html'), results);
    }))
    .pipe(eslint.failAfterError())
);

gulp.task('zip', ['build:prepare', 'clean'], () => {
  const buildArtifact = ['build/**'];
  const pjson = require('./package.json');
  const zipFile = pjson.name + '.zip';
  return gulp.src(buildArtifact, {base: './build', dot: true})
        .pipe(tap((file) => {
          if (file.isDirectory()) {
            file.stat.mode = parseInt('40777', 8);
          }
        }))
        .pipe(zip(zipFile))
        .pipe(gulp.dest('.'));
});

gulp.task('clean', () => {
  return del(['build/']);
});

gulp.task('build', ['clean', 'lint', 'zip']);
gulp.task('default', ['build']);
