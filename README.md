# stepper.js #

Step through JavaScript using JavaScript.  Based in part on Amjad Masad's
debugjs project – https://github.com/amasad/debugjs.

## Difference from debugjs ##
- js-step doesn't use an iframe to isolate the code it's running.  This is your
responsibility.  One way to do this is to run js-step inside a iframe with the
code that you want to step through and communicate with js-step using postMessage.
- js-step is a work in progress and doesn't have support for a lot of things.

## TODO ##
- fix nested calls to non-instrumented methods, e.g. console.log(Math.sqrt(2));

## running the demo ##
- bower install
- compile ace editor (TODO: more detail)
- open demo/index.html
