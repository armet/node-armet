require("babel/register")

var pkg = require("./package.json")
var _ = require("lodash")
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

gulp.task('watch', function() {
  gulp.watch(["./src/**/*.js"], ["build"])
})

gulp.task("dist", function() {
  return gulp.src(['lib/*', 'package.json', 'LICENSE', 'README.md'])
    .pipe($.tar(`armet-${pkg.version}.tar`))
    .pipe($.gzip())
    .pipe(gulp.dest('dist'));
})

gulp.task("default", function(cb) {
  return runSequence("build", "test", cb)
})

function release(importance) {
  return new Promise(function(resolve) {
    // Select package.json
    gulp.src(["package.json"])

    // Bump version on the package.json
    .pipe($.bump({type: importance}))
    .pipe(gulp.dest('./'))

    // Commit the changes
    .pipe($.git.commit("Bump version"))

    // Tag our version
    .pipe($.tagVersion())

    .on("end", function() {
      $.git.push("origin", "master", {args: "--follow-tags"}, function() {
        gulp.src('')
          .pipe($.shell([
            "npm publish"
          ]))
          .on("end", function() {
            resolve()
          })
      })
    })
  })
}

gulp.task("release:minor", _.partial(release, "minor"));
gulp.task("release:major", _.partial(release, "major"));
gulp.task("release:patch", _.partial(release, "patch"));
