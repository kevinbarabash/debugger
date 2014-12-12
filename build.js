var browserify = require("browserify");
var watchify = require("watchify");
var fs = require('fs');
var spawn = require("child_process").spawn;

var args = [
    "--target", "ES5",
    "--removeComments",
    "--module", "commonjs",
    "--outDir", "lib",
    "src/processing-debugger.ts",
    "--watch"
];

var tsc = spawn("./node_modules/.bin/tsc", args);

tsc.stdout.on('data', function (data) {
    console.log("tsc: " + data);
});

var options = {
    cache: {},
    packageCache: {},
    //fullPaths: true,
    standalone: "ProcessingDebugger"
};

var b = browserify(__dirname + "/lib/processing-debugger.js", options);
var w = watchify(b);

w.on('update', function (ids) {
    var writable = fs.createWriteStream(__dirname + '/build/processing-debugger.js');
    w.bundle().pipe(writable);
});

w.on('time', function (time) {
    console.log("build took " + time + "ms");
});
