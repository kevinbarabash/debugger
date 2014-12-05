#!/bin/bash
mkdir -p build &&
./node_modules/.bin/browserify ./src/debugger.js --outfile ./build/debugger.js --standalone Debugger &&

# TODO: remove the need for these separate files (used by tests) - move the Scheduler into its own project
./node_modules/.bin/browserify ./src/stepper.js --outfile ./build/stepper.js --standalone Stepper &&
./node_modules/.bin/browserify ./src/scheduler.js --outfile ./build/scheduler.js --standalone Scheduler
