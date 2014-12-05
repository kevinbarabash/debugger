/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

var Stepper = require("./stepper");
var Scheduler = require("./scheduler");
var transform = require("./transform");
var EventEmitter = require("events").EventEmitter;

function Debugger(context) {
    EventEmitter.call(this);

    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.scheduler = new Scheduler();

    this.breakpoints = {};
    this.breakpointsEnabled = true;     // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
    this._paused = false;               // read-only, needs a getter
}

Debugger.prototype = Object.create(EventEmitter.prototype);
Debugger.prototype.constructor = Debugger;

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
    if (this.repeater) {
        this.repeater.stop();
    }

    // TODO: create a delegate definition so that we can customize the behaviour for processing.js or something else like the DOM
    // clear all of the event handlers in the context
    var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
    events.forEach(function (event) {
        this.context[event] = undefined;
    }, this);

    // TODO: remove all repeating function calls

    var stepper = this._createStepper(this.mainGenerator(this.context));
    stepper.once("done", this.handleMainDone.bind(this));

    // TODO: have the schedule emit a message when its queue is empty so we can toggle buttons
    // if there's a draw function that's being run on a loop then we shouldn't toggle buttons

    this.scheduler.addTask(stepper);    // TODO: figure out how pause the stepper before running it
    this.scheduler.startTask(stepper);
    //stepper.start(paused);   // start the initial task synchronously
};

Debugger.prototype.queueGenerator = function (gen, repeat, delay) {
    if (this.done) {
        return;
    }

    var stepper = this._createStepper(gen());
    var self = this;
    stepper.once("done", function () {
        if (repeat) {
            setTimeout(function () {
                self.queueGenerator(gen, repeat, delay);
            }, delay);
        }
    });

    this.scheduler.addTask(stepper);
};

// This should be run whenever the values of any of the special functions
// are changed.  This suggests using something like observe-js
Debugger.prototype.handleMainDone = function () {
    var draw = this.context.draw;
    var self = this;

    if (draw) {
        this.repeater = this.scheduler.createRepeater(function () {
            return self._createStepper(draw());
        }, 1000 / 60);
        this.repeater.start();
    }

    var wrapProcessingEventHandler = function(name) {
        var eventHandler = self.context[name];
        if (_isGeneratorFunction(eventHandler)) {
            if (name === "keyTyped") {
                self.context[name] = function () {
                    // TODO: need a way to specify delegate method to be called before the task starts
                    self.queueGenerator(eventHandler);
                };
            } else {
                self.context[name] = function () {
                    self.queueGenerator(eventHandler);
                };
            }
        }
    };

    var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
    events.forEach(wrapProcessingEventHandler);
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
        return this._currentStepper().line();
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

Debugger.prototype._createStepper = function (genObj) {
    var stepper = new Stepper(genObj, this.breakpoints);
    stepper.breakpointsEnabled = this.breakpointsEnabled;
    var self = this;
    var breakListener = function () {
        self._paused = true;
        self.emit("break");
    };
    stepper.on("break", breakListener);
    stepper.once("done", function () {
        stepper.removeListener("break", breakListener);
        self._paused = false;
        self.emit("done");
    });
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

function _isGeneratorFunction (value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

module.exports = Debugger;
