var gulp = require("gulp");
var browserify = require("gulp-browserify");
var rename = require("gulp-rename");

gulp.task("browserify", function() {
    gulp.src("node_modules/recast/main.js")
        .pipe(browserify({
            debug: false,
            standalone: "recast"
        }))
        .pipe(rename("recast.js"))
        .pipe(gulp.dest("./lib"))
});
