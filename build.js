var fs = require("fs");
var browserify = require("browserify");
var to5ify = require("6to5ify");

var options = {
    standalone: "ProcessingDebugger"
};

browserify(options)
    .transform(to5ify)
    .require("./src/processing-debugger.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream("./build/processing-debugger.js"));
