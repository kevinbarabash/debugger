"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

/*global recast, esprima, escodegen, injector */

var Stack = require("../node_modules/basic-ds/lib/Stack");
var Task = require("../external/scheduler/lib/task");

var Stepper = (function () {
  var Stepper = function Stepper(genObj, breakpoints, breakCallback, doneCallback, language) {
    var _this = this;
    this.breakCallback = breakCallback || function () {};
    this.doneCallback = doneCallback || function () {};
    this._breakpoints = breakpoints || {};
    this.breakpointsEnabled = true;
    this._language = language;

    this._started = false;
    this._paused = false;
    this._stopped = false;

    this.stack = new Stack();
    this.stack.push({
      gen: genObj,
      line: -1
    });

    this.stack.poppedLastItem = function () {
      _this._stopped = true;
      _this.doneCallback();
    };

    this._retVal = undefined;
  };

  Stepper.prototype.stepIn = function () {
    var result;
    if (result = this._step()) {
      if (result.value && result.value.hasOwnProperty("gen")) {
        if (this._isGenerator(result.value.gen)) {
          this.stack.push({
            gen: result.value.gen,
            line: this.line
          });
          this.stepIn();
          return "stepIn";
        } else {
          this._retVal = result.value.gen;
          if (result.value.stepAgain) {
            result = this._step();
          }
        }
      }
      if (result.done) {
        this._popAndStoreReturnValue(result.value);
        return "stepOut";
      }
      return "stepOver";
    }
  };

  Stepper.prototype.stepOver = function () {
    var result;
    if (result = this._step()) {
      if (result.value && result.value.hasOwnProperty("gen")) {
        if (this._isGenerator(result.value.gen)) {
          this._runScope(result.value.gen);
          if (result.value.stepAgain) {
            this.stepOver();
          }
          return "stepOver";
        } else {
          this._retVal = result.value.gen;
          if (result.value.stepAgain) {
            result = this._step();
          }
        }
      }
      if (result.done) {
        this._popAndStoreReturnValue(result.value);
        return "stepOut";
      }
      return "stepOver";
    }
  };

  Stepper.prototype.stepOut = function () {
    var result;
    if (result = this._step()) {
      while (!result.done) {
        if (result.value.hasOwnProperty("gen")) {
          if (this._isGenerator(result.value.gen)) {
            this._runScope(result.value.gen);
          } else {
            this._retVal = result.value.gen;
          }
        }
        result = this._step();
      }
      this._popAndStoreReturnValue(result.value);
      return "stepOut";
    }
  };

  Stepper.prototype.start = function (paused) {
    this._started = true;
    this._paused = !!paused;
    this._run();
  };

  Stepper.prototype.resume = function () {
    this._paused = false;
    this._run();
  };

  Stepper.prototype._run = function () {
    var currentLine = this.line;
    while (true) {
      if (this.stack.isEmpty) {
        break;
      }
      var action = this.stepIn();
      if (this.breakpointsEnabled && this._breakpoints[this.line] && action !== "stepOut" && currentLine !== this.line) {
        this._paused = true;
      }
      if (this._paused) {
        this.breakCallback();
        break;
      }
      currentLine = this.line;
    }
  };

  Stepper.prototype.setBreakpoint = function (line) {
    this._breakpoints[line] = true;
  };

  Stepper.prototype.clearBreakpoint = function (line) {
    delete this._breakpoints[line];
  };

  Stepper.prototype._step = function () {
    if (this.stack.isEmpty) {
      return;
    }
    var frame = this.stack.peek();
    var result = frame.gen.next(this._retVal);
    this._retVal = undefined;

    // if the result.value contains scope information add it to the
    // current stack frame
    if (result.value) {
      if (result.value.scope) {
        this.stack.peek().scope = result.value.scope;
      }
      if (result.value.name) {
        this.stack.peek().name = result.value.name;
      }
      if (result.value.line) {
        frame.line = result.value.line;
      }
    }
    return result;
  };

  Stepper.prototype._runScope = function (gen) {
    this.stack.push({
      gen: gen,
      line: this.line
    });

    var result = this._step();
    while (!result.done) {
      if (result.value.gen) {
        if (this._isGenerator(result.value.gen)) {
          this._runScope(result.value.gen);
        } else {
          this._retVal = result.value.gen;
        }
      }
      result = this._step();
    }

    this._popAndStoreReturnValue(result.value);
  };

  Stepper.prototype._popAndStoreReturnValue = function (value) {
    var frame = this.stack.pop();
    this._retVal = frame.gen.obj || value;
  };

  Stepper.prototype._isGenerator = function (obj) {
    if (this._language.toLowerCase() === "es6") {
      return obj instanceof Object && obj.toString() === "[object Generator]";
    } else {
      // note: the regenerator runtime provides proper prototypes
      return obj && typeof (obj.next) === "function";
    }
  };

  _classProps(Stepper, null, {
    started: {
      get: function () {
        return this._started;
      }
    },
    stopped: {
      get: function () {
        return this._stopped;
      }
    },
    line: {
      get: function () {
        if (!this._stopped) {
          return this.stack.peek().line;
        } else {
          return -1;
        }
      }
    }
  });

  return Stepper;
})();

module.exports = Stepper;