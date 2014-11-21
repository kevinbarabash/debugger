var gulp = require("gulp");
var rename = require("gulp-rename");
var concat = require("gulp-concat");
var testee = require("testee");

var deps = [
    "./bower_components/esprima/esprima.js",
    "./bower_components/escodegen/escodegen.browser.min.js",
    "./build/stepper.js"
];

var src = [
    "./src/stack.js",
    "./src/linked-list.js",
    "./external/ast-walker/walker.js",
    "./src/ast-builder.js",
    "./src/transform.js",
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

gulp.task("test", ["build"], function() {
    testee.test(["test/runner.html"], ["firefox"], { browsers: "firefox" })
        .then(function() {
            process.exit(0);
        }, function() {
            process.exit(1);
        });
});

gulp.task("coverage", ["build"], function() {
    var options = {
        browsers: "firefox",
        coverage: {
            dir: "./report",
            reporters: ["html"]     // requires patch line 383 of node_modules/testee/node_modules/istanbul/lib/report/html.js by prepending a "." to the path
        }
    };
    testee.test(["test/runner.html"], ["firefox"], options)
        .then(function() {
            process.exit(0);
        }, function() {
            process.exit(1);
        });
});

gulp.task("default", ["build", "watch"]);
