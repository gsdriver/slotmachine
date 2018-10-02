'use strict';

const gulp = require('gulp');
const eslint = require('gulp-eslint');
const del = require('del');

gulp.task('clean', () => {
  return del(['build/']);
});

gulp.task('build:prepare', gulp.series('clean', () =>
  // copy only what we need for deployment
  gulp.src(['**/*', '!build/**', '!.git', '!.git/**', '!processScores', '!processScores/**',
    '!package.json', '!README.md', '!speechAssets', '!speechAssets/**',
    '!.gitignore', '!.idea', '!.idea/**', '!*.zip'], {dot: true})
    .pipe(gulp.dest('build/'))
));

// task to run es lint.
gulp.task('lint', () =>
  gulp.src(['*.js', '*/**/*.js', '!test/**', '!build/**', '!node_modules/**', '!jargon/**', '!test.js', '!ext/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
);

gulp.task('build', gulp.series('clean', 'lint'));
gulp.task('default', gulp.series('build'));
