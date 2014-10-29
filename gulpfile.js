var gulp = require("gulp");
var rename = require("gulp-rename");
var concat = require("gulp-concat");

var files = [
    "./bower_components/esprima/esprima.js",
    "./bower_components/escodegen/escodegen.browser.min.js",
    "./src/stepper.js"
];

gulp.task("build", function () {
    gulp.src(files)
        .pipe(concat("stepper-standalone.js"))
        .pipe(gulp.dest("./build"))
});

gulp.task("watch", function() {
    gulp.watch("./src/stepper.js", ["build"]);
});

gulp.task("default", ["build"]);
