var tsbuild = require("tsbuild");

tsbuild({
    filename: "processing-debugger.ts",
    srcDir: "./src", 
    libDir: "./lib",
    distDir: "./build",
    standalone: "ProcessingDebugger"
});
