"use strict";

var _slice = Array.prototype.slice;
var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

var Stepper = require("./stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("./transform");

var Debugger = (function () {
  var Debugger =

  // TODO: convert to single "options" param
  function Debugger(context, onBreakpoint, onFunctionDone) {
    this.context = context || {};

    this.onBreakpoint = onBreakpoint || function () {};
    this.onFunctionDone = onFunctionDone || function () {};

    this.scheduler = new Scheduler();

    this.breakpoints = {};
    this.breakpointsEnabled = true; // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
    this._paused = false; // read-only, needs a getter

    this._language = "es5";
  };

  Debugger.isBrowserSupported = function () {
    try {
      var code = "\n" + "var generator = (function* () {\n" + "  yield* (function* () {\n" + "    yield 5; yield 6;\n" + "  }());\n" + "}());\n" + "\n" + "var item = generator.next();\n" + "var passed = item.value === 5 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === 6 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === undefined && item.done === true;\n" + "return passed;";
      return Function(code)();
    } catch (e) {
      return false;
    }
  };

  Debugger.prototype.load = function (code) {
    var debugFunction = transform(code, this.context, { language: this._language });
    //console.log(debugFunction);
    this.mainGeneratorFunction = debugFunction();
  };

  Debugger.prototype.start = function (paused) {
    this.scheduler.clear();
    this.onMainStart();

    var mainGeneratorObject = this.mainGeneratorFunction(this.context);
    var stepper = this._createStepper(mainGeneratorObject, true);

    this.scheduler.addTask(stepper);
    stepper.start(paused); // paused = true -> start paused on the first line
  };

  Debugger.prototype.queueGenerator = function (gen) {
    if (!this.done) {
      var stepper = this._createStepper(gen());
      this.scheduler.addTask(stepper);
    }
  };

  Debugger.prototype.resume = function () {
    if (this._paused) {
      this._paused = false;
      this._currentStepper.resume();
    }
  };

  Debugger.prototype.stepIn = function () {
    if (this._paused) {
      this._currentStepper.stepIn();
    }
  };

  Debugger.prototype.stepOver = function () {
    if (this._paused) {
      this._currentStepper.stepOver();
    }
  };

  Debugger.prototype.stepOut = function () {
    if (this._paused) {
      this._currentStepper.stepOut();
    }
  };

  Debugger.prototype.stop = function () {
    this.done = true;
  };

  Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
  };

  Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
  };

  Debugger.prototype._createStepper = function (genObj, isMain) {
    var _this = this;
    var stepper = new Stepper(genObj, this.breakpoints, function () {
      _this._paused = true;
      _this.onBreakpoint();
    }, function () {
      _this._paused = false;
      _this.onFunctionDone();
      if (isMain) {
        _this.onMainDone();
      }
    }, this._language);

    stepper.breakpointsEnabled = this.breakpointsEnabled;
    return stepper;
  };

  Debugger.prototype.onMainStart = function () {};

  Debugger.prototype.onMainDone = function () {};

  Debugger.prototype.onNewObject = function (classFn, className, obj, args) {};

  _classProps(Debugger, null, {
    context: {
      set: function (context) {
        var _this2 = this;
        this._context = context;
        this._context.__instantiate__ = function (classFn, className) {
          var args = _slice.call(arguments, 2);

          var obj = Object.create(classFn.prototype);
          var gen = classFn.apply(obj, args);

          _this2.onNewObject(classFn, className, obj, args);

          if (gen) {
            gen.obj = obj;
            return gen;
          } else {
            return obj;
          }
        };
        this._context.__usingDebugger = true;
      },
      get: function () {
        return this._context;
      }
    },
    paused: {
      get: function () {
        return this._paused;
      }
    },
    currentStack: {
      get: function () {
        var stepper = this._currentStepper;
        if (stepper !== null) {
          return stepper.stack.toArray().map(function (frame) {
            return {
              name: frame.name,
              line: frame.line
            };
          });
        } else {
          return [];
        }
      }
    },
    currentScope: {
      get: function () {
        var stepper = this._currentStepper;
        if (stepper) {
          var scope = stepper.stack.peek().scope;
          if (scope) {
            return scope;
          }
        }
        return null;
      }
    },
    currentLine: {
      get: function () {
        if (this._paused) {
          return this._currentStepper.line;
        }
      }
    },
    line: {
      get: function () {
        if (this._paused) {
          return this._currentStepper.line;
        }
      }
    },
    _currentStepper: {
      get: function () {
        return this.scheduler.currentTask();
      }
    }
  });

  return Debugger;
})();

module.exports = Debugger;