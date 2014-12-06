[![Build Status](https://travis-ci.org/kevinb7/stepper.svg?branch=master)](https://travis-ci.org/kevinb7/stepper)

# stepper #

Step through JavaScript using JavaScript.  Based in part on Amjad Masad's
debugjs project – https://github.com/amasad/debugjs.

This project is currently focused on debugging processing.js programs being
run in Khan Academy's live-editor.  The plan is to eventually make the debugger
more general purpose.  That being said, it already supports a lot of JavaScript
constructs.

## Requirements ##

This project uses ES6 Generators so make sure you're using a browser that supports
them.  The following browsers will work:

- Chrome 39+
- Firefox 26+

As for other browsers: it is under consideration by the IE team according the
chromestatus.com page, it's in development for Safari.

## Running the demo ##
- npm install
- bower install
- compile ace editor (see bower_components/ace/Readme.md)
- open demo/index.html

## Roadmap ##

- handling functional style methods on Array.prototype, e.g. map, et al
- DOM event handlers
- setTimeout, setInterval, and requestAnimationFrame
- other languages that compile to JS, e.g. TypeScript
- more accurate position information so that the actual command can be highlighted
  instead of just highlighting the whole line
- better *for* loop support
- handle processing.js' *frameRate* function
- improve the demo app
    - preserve breakpoints on reload
    - preserve code changes on reload
