var Stepper = require("./stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("./transform");
var Debugger = (function () {
    function Debugger(context, onBreakpoint, onFunctionDone) {
        var _this = this;
        this.context = context;
        this.context.__instantiate__ = function (classFn, className) {
            var obj = Object.create(classFn.prototype);
            var args = Array.prototype.slice.call(arguments, 2);
            var gen = classFn.apply(obj, args);
            _this.onNewObject(classFn, className, obj, args);
            if (gen) {
                gen.obj = obj;
                return gen;
            }
            else {
                return obj;
            }
        };
        this.onBreakpoint = onBreakpoint || function () {
        };
        this.onFunctionDone = onFunctionDone || function () {
        };
        this.scheduler = new Scheduler();
        this.breakpoints = {};
        this.breakpointsEnabled = true;
        this._paused = false;
    }
    Debugger.isBrowserSupported = function () {
        try {
            var code = "\n" + "var generator = (function* () {\n" + "  yield* (function* () {\n" + "    yield 5; yield 6;\n" + "  }());\n" + "}());\n" + "\n" + "var item = generator.next();\n" + "var passed = item.value === 5 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === 6 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === undefined && item.done === true;\n" + "return passed;";
            return Function(code)();
        }
        catch (e) {
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
        this.onMainStart();
        var stepper = this._createStepper(this.mainGenerator(this.context), true);
        this.scheduler.addTask(stepper);
        stepper.start(paused);
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
    Object.defineProperty(Debugger.prototype, "paused", {
        get: function () {
            return this._paused;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentStack", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper !== null) {
                return stepper.stack.items.map(function (frame) {
                    return {
                        name: frame.name,
                        line: frame.line
                    };
                });
            }
            else {
                return [];
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentScope", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper) {
                var scope = stepper.stack.peek().scope;
                if (scope) {
                    return scope;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentLine", {
        get: function () {
            if (this._paused) {
                return this._currentStepper.line;
            }
        },
        enumerable: true,
        configurable: true
    });
    Debugger.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };
    Debugger.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };
    Object.defineProperty(Debugger.prototype, "_currentStepper", {
        get: function () {
            return this.scheduler.currentTask();
        },
        enumerable: true,
        configurable: true
    });
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
        });
        stepper.breakpointsEnabled = this.breakpointsEnabled;
        return stepper;
    };
    Debugger.prototype.onMainStart = function () {
    };
    Debugger.prototype.onMainDone = function () {
    };
    Debugger.prototype.onNewObject = function (classFn, className, obj, args) {
    };
    return Debugger;
})();
module.exports = Debugger;
