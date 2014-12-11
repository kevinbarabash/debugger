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

class Debugger {
    context: any;
    scheduler: Scheduler;
    breakpoints: { [line:number]: boolean };
    breakpointsEnabled: boolean;
    mainGenerator: Function;

    onBreakpoint: () => void;
    onFunctionDone: () => void;

    private _paused: boolean;
    private done: boolean;

    constructor(context: Object, onBreakpoint?: () => void, onFunctionDone?: () => void) {
        this.context = context;
        this.context.__instantiate__ = (classFn, className) => {
            var obj = Object.create(classFn.prototype);
            var args = Array.prototype.slice.call(arguments, 2);
            var gen = classFn.apply(obj, args);

            this.onNewObject(classFn, className, obj, args);

            if (gen) {
                gen.obj = obj;
                return gen;
            } else {
                return obj;
            }
        };

        this.onBreakpoint = onBreakpoint || function () {};
        this.onFunctionDone = onFunctionDone || function () {};

        this.scheduler = new Scheduler();

        this.breakpoints = {};
        this.breakpointsEnabled = true;     // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
        this._paused = false;               // read-only, needs a getter
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
        this.onMainStart();

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

    // used by tests right now to stop execution
    stop() {
        this.done = true;
    }

    get paused() {
        return this._paused;
    }

    get currentStack() {
        var stepper = this._currentStepper;
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

    setBreakpoint(line: number) {
        this.breakpoints[line] = true;
    }

    clearBreakpoint(line: number) {
        delete this.breakpoints[line];
    }

    private get _currentStepper() {
        return <Stepper>this.scheduler.currentTask();
    }

    // TODO: make this protected in the future
    _createStepper(genObj: GeneratorObject<any>, isMain?: boolean) {
        var stepper = new Stepper(
            genObj,
            this.breakpoints,
            () => {
                this._paused = true;
                this.onBreakpoint();
            },
            () => {
                this._paused = false;
                this.onFunctionDone();
                if (isMain) {
                    this.onMainDone();
                }
            });

        stepper.breakpointsEnabled = this.breakpointsEnabled;
        return stepper;
    }

    // event callbacks
    // override to customize behaviour

    onMainStart() {

    }

    onMainDone() {

    }

    onNewObject(classFn: Function, className: string, obj: Object, args: any[]) {

    }
}

export = Debugger;
