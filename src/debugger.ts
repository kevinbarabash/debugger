/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

/// <reference path="generators.d.ts"/>

import Stepper = require("./stepper");
import Scheduler = require("../external/scheduler/lib/scheduler");
import transform = require("./transform");
import ProcessingDelegate = require("./processing-delegate");

var emptyFunction = function() { };

class Debugger {
    context: any;
    breakCallback: () => void;
    doneCallback: () => void;
    scheduler: Scheduler;
    breakpoints: { [line:number]: boolean };
    breakpointsEnabled: boolean;
    delegate: DebuggerDelegate;
    mainGenerator: Function;

    private _paused: boolean;
    private done: boolean;

    // TODO: change the signuture to constructor(context, delegate)
    constructor(context, breakCallback, doneCallback, newCallback) {
        this.context = context || {};

        this.breakCallback = breakCallback || emptyFunction;
        this.doneCallback = doneCallback || emptyFunction;
        newCallback = newCallback || emptyFunction;

        this.context.__instantiate__ = function (classFn, className) {
            var obj = Object.create(classFn.prototype);
            var args = Array.prototype.slice.call(arguments, 2);
            var gen = classFn.apply(obj, args);

            newCallback(classFn, className, obj, args);

            if (gen) {
                gen.obj = obj;
                return gen;
            } else {
                return obj;
            }
        };

        this.scheduler = new Scheduler();

        this.breakpoints = {};
        this.breakpointsEnabled = true;     // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
        this._paused = false;               // read-only, needs a getter

        this.delegate = new ProcessingDelegate();
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

    load(code: string) {
        var debugCode = transform(code, this.context);
        var debugFunction = new Function(debugCode);
        this.mainGenerator = debugFunction();
    }

    start(paused) {
        this.scheduler.clear();
        this.delegate.debuggerWillStart(this);

        var stepper = this._createStepper(this.mainGenerator(this.context), true);

        this.scheduler.addTask(stepper);
        stepper.start(paused);  // paused = true -> start paused on the first line
    }

    queueGenerator(gen: Function) {
        if (!this.done) {
            var stepper = this._createStepper(gen());
            this.scheduler.addTask(stepper);
        }
    }

    resume() {
        if (this._paused) {
            this._paused = false;
            this._currentStepper().resume();
        }
    }

    stepIn() {
        if (this._paused) {
            this._currentStepper().stepIn();
        }
    }

    stepOver() {
        if (this._paused) {
            this._currentStepper().stepOver();
        }
    }

    stepOut() {
        if (this._paused) {
            this._currentStepper().stepOut();
        }
    }

    paused() {
        return this._paused;
    }

    // used by tests right now to stop execution
    stop() {
        this.done = true;
    }

    currentStack() {
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
    }

    currentScope() {
        var stepper = this._currentStepper();
        if (stepper) {
            var scope = stepper.stack.peek().scope;
            if (scope) {
                return scope;
            }
        }
        return null;
    }

    currentLine() {
        if (this._paused) {
            return this._currentStepper().line;
        }
    }

    setBreakpoint(line: number) {
        this.breakpoints[line] = true;
    }

    clearBreakpoint(line: number) {
        delete this.breakpoints[line];
    }

    private _currentStepper() {
        return <Stepper>this.scheduler.currentTask();
    }

    private _createStepper(genObj: GeneratorObject<any>, isMain?: boolean) {
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
    }
}

export = Debugger;
