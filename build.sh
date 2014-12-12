#!/bin/bash
./node_modules/.bin/tsc --target ES5 --removeComments --outDir lib --module commonjs src/processing-debugger.ts &&
./node_modules/.bin/tsc --target ES5 --removeComments --outDir lib --module commonjs src/stepper.ts &&
mkdir -p build &&

# TODO: remove the need for these separate files (used by tests)
./node_modules/.bin/browserify ./lib/stepper.js --outfile ./build/stepper.js --standalone Stepper &&
./node_modules/.bin/browserify ./lib/processing-debugger.js --outfile ./build/processing-debugger.js --standalone ProcessingDebugger
