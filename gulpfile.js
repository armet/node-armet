require("babel/register")

var _ = require("lodash")
var gulp = require("gulp")
var del = require("del")
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

gulp.task('watch', function() {
  gulp.watch(["./src/**/*.js"], function() {
    runSequence("build", "dist")
  })
})

gulp.task("clean", function(cb) {
  return del(["dist"], cb)
})

gulp.task("dist", function() {
  return gulp.src(["lib/*", "package.json", "LICENSE", "README.md"])
    .pipe(gulp.dest("dist"))
})

gulp.task("default", function(cb) {
  return runSequence("build", "dist", "watch", cb)
})

function bump(importance) {
  return new Promise(function(resolve) {
    // Select package.json
    gulp.src(["package.json"])

    // Bump version on the package.json
    .pipe($.bump({type: importance}))
    .pipe(gulp.dest("./"))

    // Commit the changes
    .pipe($.git.commit("Bump version"))

    // Tag our version
    .pipe($.tagVersion())

    .on("end", function() {
      resolve()
    })
  })
}

gulp.task("release", function(cb) {
  $.git.push("origin", "master", {args: "--follow-tags"}, function() {
    gulp.src("")
      .pipe($.shell([
        `npm publish ./dist`
      ]))
      .on("end", function() {
        cb()
      })
  })
})

gulp.task("bump:minor", _.partial(bump, "minor"))
gulp.task("bump:major", _.partial(bump, "major"))
gulp.task("bump:patch", _.partial(bump, "patch"))

gulp.task("release:major", function(cb) {
  runSequence("build", "bump:major", "dist", "release", "clean", cb)
})

gulp.task("release:minor", function(cb) {
  runSequence("build", "bump:minor", "dist", "release", "clean", cb)
})

gulp.task("release:patch", function(cb) {
  runSequence("build", "bump:patch", "dist", "release", "clean", cb)
})
