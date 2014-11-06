var gulp = require("gulp");
var rename = require("gulp-rename");
var concat = require("gulp-concat");

var deps = [
    "./bower_components/esprima/esprima.js",
    "./bower_components/escodegen/escodegen.browser.min.js",
    "./build/stepper.js"
];

var src = [
    "./external/ast-walker/walker.js",
    "./src/ast-builder.js",
    "./src/injector.js",
    "./src/stack.js",
    "./src/stepper.js"
];

gulp.task("build", function () {
    gulp.src(src)
        .pipe(concat("stepper.js"))
        .pipe(gulp.dest("./build"))
});

gulp.task("build-standalone", ["build"], function () {
    gulp.src(deps)
        .pipe(concat("stepper-standalone.js"))
        .pipe(gulp.dest("./build"))
});

gulp.task("watch", function() {
    gulp.watch(src, ["build"]);
});

gulp.task("default", ["build"]);
