var fs = require("fs");
var browserify = require("browserify");
var to5ify = require("6to5ify");
var transform = require("./src/transform");

var options = {};

browserify(options)
    .transform(to5ify)
    .require("./src/runtime/runtime.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./build/runtime.js"));

options = {
    standalone: "Debugger"
};

browserify(options)
    .transform(to5ify)
    .require("./src/debugger.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./build/debugger.js"));

options = {
    standalone: "ProcessingDebugger"
};

browserify(options)
    .transform(to5ify)
    .require("./src/processing-debugger.js", { entry: true })
    .exclude("./src/debugger.js")
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./build/processing-debugger.js"));
