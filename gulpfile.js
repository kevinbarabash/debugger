var gulp = require("gulp");
var browserify = require("gulp-browserify");
var rename = require("gulp-rename");

gulp.task("build", function () {
    gulp.src("src/stepper.js")
        .pipe(browserify({
            debug: false,
            standalone: "Stepper"
        }))
        .pipe(rename("stepper-standalone.js"))
        .pipe(gulp.dest("./build"));
});

gulp.task("build-amd", function () {
    gulp.src("src/stepper.js")
        .pipe(browserify({
            debug: false
        }))
        .pipe(rename("stepper-amd.js"))
        .pipe(gulp.dest("./build"));
});

gulp.task("default", ["build"]);
