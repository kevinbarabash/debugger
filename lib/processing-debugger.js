"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Debugger = require("./debugger");

function emptyFunction() {}

var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];

var ProcessingDebugger = (function (Debugger) {
  var ProcessingDebugger =

  // TODO: change to single options param
  function ProcessingDebugger(context, onBreakpoint, onFunctionDone) {
    Debugger.call(this, context, onBreakpoint, onFunctionDone);
    this._repeater = null;
  };

  _extends(ProcessingDebugger, Debugger);

  ProcessingDebugger.prototype.onMainStart = function () {
    var _this = this;
    if (this._repeater) {
      this._repeater.stop();
    }

    // reset all event handlers
    // TODO: write a test for this
    events.forEach(function (event) {
      return _this.context[event] = emptyFunction;
    });

    // reset draw
    this.context.draw = emptyFunction;
  };

  ProcessingDebugger.prototype.onMainDone = function () {
    var _this2 = this;
    var draw = this.context.draw;

    if (draw !== emptyFunction) {
      this._repeater = this.scheduler.createRepeater(function () {
        return _this2._createStepper(draw());
      }, 1000 / 60);
      this._repeater.start();
    }

    events.forEach(function (name) {
      var eventHandler = _this2.context[name];

      if (_isGeneratorFunction(eventHandler)) {
        if (name === "keyTyped") {
          _this2.context.keyCode = 0; // preserve existing behaviour
        }

        _this2.context[name] = function () {
          _this2.queueGenerator(eventHandler);
        };
      }
    });
  };

  return ProcessingDebugger;
})(Debugger);

function _isGeneratorFunction(value) {
  return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

module.exports = ProcessingDebugger;