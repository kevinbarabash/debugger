var gulp = require("gulp");
var browserify = require("gulp-browserify");
var rename = require("gulp-rename");
var concat = require("gulp-concat");

gulp.task("lib", function () {
    gulp.src("node_modules/recast/main.js")
        .pipe(browserify({
            debug: false,
            standalone: "recast"
        }))
        .pipe(rename("recast.js"))
        .pipe(gulp.dest("./lib"))
});

gulp.task("build", function () {
    gulp.src(["./lib/recast.js", "./src/stepper.js"])
        .pipe(concat("stepper-standalone.js"))
        .pipe(gulp.dest("./build"))
});

gulp.task("watch", function() {
    gulp.watch("./src/stepper.js", ["build"]);
});

gulp.task("default", ["lib", "build"]);
