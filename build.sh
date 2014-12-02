#!/bin/bash
mkdir -p build &&
./node_modules/.bin/browserify ./src/debugger.js --outfile ./build/debugger.js --standalone Debugger &&

# TODO: remove the need for this separate file (used by tests)
./node_modules/.bin/browserify ./src/stepper.js --outfile ./build/stepper.js --standalone Stepper
