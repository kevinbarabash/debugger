#!/bin/bash
./node_modules/.bin/tsc --target ES5 --removeComments --outDir lib --module commonjs src/processing-delegate.ts &&
mkdir -p build &&
./node_modules/.bin/browserify ./src/debugger.js --outfile ./build/debugger.js --standalone Debugger &&

# TODO: remove the need for these separate files (used by tests)
./node_modules/.bin/browserify ./src/stepper.js --outfile ./build/stepper.js --standalone Stepper
