/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

var Stepper = require("../lib/stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("./transform");
var ProcessingDelegate = require("../lib/processing-delegate");

function Debugger(context, breakCallback, doneCallback) {
    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.scheduler = new Scheduler();

    this.breakpoints = {};
    this.breakpointsEnabled = true;     // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
    this._paused = false;               // read-only, needs a getter

    this.delegate = new ProcessingDelegate(context);

    this.breakCallback = breakCallback || function () {};
    this.doneCallback = doneCallback || function () {};
}

Debugger.isBrowserSupported = function () {
    try {
        var code = "\n" +
            "var generator = (function* () {\n" +
            "  yield* (function* () {\n" +
            "    yield 5; yield 6;\n" +
            "  }());\n" +
            "}());\n" +
            "\n" +
            "var item = generator.next();\n" +
            "var passed = item.value === 5 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === 6 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === undefined && item.done === true;\n" +
            "return passed;";
        return Function(code)()
    } catch(e) {
        return false;
    }
};

Debugger.prototype.load = function (code) {
    var debugCode = transform(code, this.context);
    var debugFunction = new Function(debugCode);
    this.mainGenerator = debugFunction();
};

Debugger.prototype.start = function (paused) {
    this.scheduler.clear();
    this.delegate.debuggerWillStart(this);

    var stepper = this._createStepper(this.mainGenerator(this.context), true);

    this.scheduler.addTask(stepper);
    stepper.start(paused);  // paused = true -> start paused on the first line
};

Debugger.prototype.queueGenerator = function (gen) {
    if (!this.done) {
        var stepper = this._createStepper(gen());
        this.scheduler.addTask(stepper);
    }
};

// TODO: implement a method to "pause" at the start of the next stepper

Debugger.prototype.resume = function () {
    if (this._paused) {
        this._paused = false;
        this._currentStepper().resume();
    }
};

Debugger.prototype.stepIn = function () {
    if (this._paused) {
        this._currentStepper().stepIn();
    }
};

Debugger.prototype.stepOver = function () {
    if (this._paused) {
        this._currentStepper().stepOver();
    }
};

Debugger.prototype.stepOut = function () {
    if (this._paused) {
        this._currentStepper().stepOut();
    }
};

Debugger.prototype.paused = function () {
    return this._paused;
};

// used by tests right now to stop execution
Debugger.prototype.stop = function () {
    this.done = true;
};

Debugger.prototype.currentStack = function () {
    var stepper = this._currentStepper();
    if (stepper !== null) {
        return stepper.stack.items.map(function (frame) {
            return {
                name: frame.name,
                line: frame.line
            };
        });
    } else {
        return [];
    }
};

Debugger.prototype.currentScope = function () {
    var stepper = this._currentStepper();
    if (stepper) {
        var scope = stepper.stack.peek().scope;
        if (scope) {
            return scope;
        }
    }
    return null;
};

Debugger.prototype.currentLine = function () {
    if (this._paused) {
        return this._currentStepper().line;
    }
};

Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

/* PRIVATE */

Debugger.prototype._currentStepper = function () {
    return this.scheduler.currentTask();
};

Debugger.prototype._createStepper = function (genObj, isMain) {
    var self = this;
    var stepper = new Stepper(
        genObj,
        this.breakpoints,
        function () {   // break
            self._paused = true;
            self.breakCallback();
        },
        function () {   // done
            self._paused = false;
            self.doneCallback();
            if (isMain) {
                self.delegate.debuggerFinishedMain(self);
            }
        });

    stepper.breakpointsEnabled = this.breakpointsEnabled;
    return stepper;
};

function __instantiate__ (Class) {
    var obj = Object.create(Class.prototype);
    var args = Array.prototype.slice.call(arguments, 1);
    var gen = Class.apply(obj, args);

    if (gen) {
        gen.obj = obj;
        return gen;
    } else {
        return obj;
    }
}

module.exports = Debugger;
