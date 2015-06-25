require("babel/register")

var gulp = require("gulp")
var $ = require("gulp-load-plugins")()
var runSequence = require("run-sequence")

gulp.task("build", function() {
  return gulp.src("src/**/*.js")
    .pipe($.babel())
    .pipe(gulp.dest("lib"))
})

gulp.task("lint", function() {
  return gulp.src("src/**/*.js")
    .pipe($.eslint())
    .pipe($.eslint.format())
})

gulp.task("test", function() {
  process.env.NODE_ENV = "test"
  return gulp.src("test/**/*.js")
    .pipe($.mocha({
      reporter: "spec",
      clearRequireCache: true,
      ignoreLeaks: true
    }))
})

gulp.task("default", function(cb) {
  return runSequence("build", "test", cb)
})
