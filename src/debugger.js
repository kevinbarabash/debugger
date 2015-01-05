/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

var Stepper = require("./stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("./transform");

require("./runtime/runtime");

var canUseNativeGenerators = function() {
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

class Debugger {

    // TODO: add debug messages flag
    constructor(options) {
        this.context = options.context || {};
        this.onBreakpoint = options.onBreakpoint || function () {};
        this.onFunctionDone = options.onFunctionDone || function () {};
        this.nativeGenerators = options.nativeGenerators && canUseNativeGenerators();
        
        this.scheduler = new Scheduler();
        this.breakpoints = {};
        // TODO: replace with this.enableBreakpoints()/this.disableBreakpoints()?
        this.breakpointsEnabled = true;
        
        this._paused = false;
    }

    set context(context) {
        this._context = context;
        this._context.__instantiate__ = (classFn, className, ...args) => {
            var obj = Object.create(classFn.prototype);
            var gen = classFn.apply(obj, args);

            this.onNewObject(classFn, className, obj, args);

            if (gen) {
                gen.obj = obj;
                return gen;
            } else {
                return obj;
            }
        };
        // TODO: figure out a better way to communicate the __schedule__ function to the runtime
        this._context.__schedule__ = (gen) => {
            this.queueGenerator(gen);
        };
        this._context.__usingDebugger = true;
    }
    
    get context() {
        return this._context;
    }

    static isBrowserSupported() {
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
    }

    load(code) {
        var debugFunction = transform(code, this.context, { nativeGenerators: this.nativeGenerators });
        this.mainGeneratorFunction = debugFunction();
    }

    start(paused) {
        this.scheduler.clear();
        this.onMainStart();

        var mainGeneratorObject = this.mainGeneratorFunction(this.context);
        var stepper = this._createStepper(mainGeneratorObject, true);

        this.scheduler.addTask(stepper);
        stepper.start(paused);  // paused = true -> start paused on the first line
    }

    queueGenerator(gen) {
        if (!this.done) {
            var stepper = this._createStepper(gen(this.context));
            this.scheduler.addTask(stepper);
        }
    }

    resume() {
        if (this._paused) {
            this._paused = false;
            this._currentStepper.resume();
        }
    }

    stepIn() {
        if (this._paused) {
            this._currentStepper.stepIn();
        }
    }

    stepOver() {
        if (this._paused) {
            this._currentStepper.stepOver();
        }
    }

    stepOut() {
        if (this._paused) {
            this._currentStepper.stepOut();
        }
    }

    // TODO: use this in the demo to exit debug mode
    stop() {
        this.done = true;
        this.scheduler.clear();
    }

    get paused() {
        return this._paused;
    }

    get currentStack() {
        var stepper = this._currentStepper;
        if (stepper !== null) {
            
            return stepper.stack.toArray().map(frame => {
                return {
                    name: frame.name,
                    line: frame.line
                };
            });
        } else {
            return [];
        }
    }

    get currentScope() {
        var stepper = this._currentStepper;
        if (stepper) {
            var scope = stepper.stack.peek().scope;
            if (scope) {
                return scope;
            }
        }
        return null;
    }

    get currentLine() {
        if (this._paused) {
            return this._currentStepper.line;
        }
    }

    get line() {
        if (this._paused) {
            return this._currentStepper.line;
        }
    }

    setBreakpoint(line) {
        this.breakpoints[line] = true;
    }

    clearBreakpoint(line) {
        delete this.breakpoints[line];
    }

    get _currentStepper() {
        return this.scheduler.currentTask();
    }

    _createStepper(genObj, isMain) {
        var stepper = new Stepper(genObj, {
            breakpoints: this.breakpoints,
            breakCallback: () => {
                this._paused = true;
                this.onBreakpoint();
            },
            doneCallback: () => {
                this._paused = false;
                this.onFunctionDone();
                if (isMain) {
                    this.onMainDone();
                }
            },
            nativeGenerators: this.nativeGenerators
        });

        stepper.breakpointsEnabled = this.breakpointsEnabled;
        return stepper;
    }

    // event callbacks
    // override to customize behaviour

    onMainStart() {}

    onMainDone() {}

    onNewObject(classFn, className, obj, args) {}
}

module.exports = Debugger;
