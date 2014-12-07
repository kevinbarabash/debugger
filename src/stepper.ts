/*global recast, esprima, escodegen, injector */

/// <reference path="generators.d.ts"/>

import basic = require("../node_modules/basic-ds/lib/basic");
import Task = require("../external/scheduler/lib/task");

interface YieldValue {
    gen: any;
    line: number;
    stepAgain?: boolean;
    scope?: Object;
    name?: string;
}

class Frame {
    gen: GeneratorObject<YieldValue>;
    line: number;
    name: string;
    scope: Object;

    constructor(gen, line) {
        this.gen = gen;
        this.line = line;
    }
}

function emptyCallback() { }

class Stepper implements Task {
    breakpointsEnabled: boolean;
    private _breakpoints: { [line: number]: boolean };

    stack: basic.Stack<Frame>;

    // state variables
    private _started: boolean;
    private _paused: boolean;
    private _stopped: boolean;

    // stores the return value when calling functions so that it can be passed
    // to the generator next time we call .next()
    private _retVal: any;

    constructor(genObj,
                breakpoints: { [line: number]: boolean },
                public breakCallback = emptyCallback,
                public doneCallback = emptyCallback
    ) {
        this._breakpoints = breakpoints || {};
        this.breakpointsEnabled = true;

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new basic.Stack<Frame>();
        this.stack.push(new Frame(genObj, -1));

        this.stack.poppedLastItem = () => {
            this._stopped = true;
            this.doneCallback();
        };

        this._retVal = undefined;
    }

    stepIn() {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this.line));
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
    }

    stepOver() {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
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
    }

    stepOut() {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
                    if (_isGenerator(result.value.gen)) {
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
    }

    start(paused?: boolean) {
        this._started = true;
        this._paused = !!paused;
        this._run();
    }

    resume() {
        this._paused = false;
        this._run();
    }

    private _run() {
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
    }

    setBreakpoint(line: number) {
        this._breakpoints[line] = true;
    }

    clearBreakpoint(line: number) {
        delete this._breakpoints[line];
    }

    get started() {
        return this._started;
    }

    get stopped() {
        return this._stopped;
    }

    get line() {
        if (!this._stopped) {
            return this.stack.peek().line;
        } else {
            return -1;
        }
    }

    private _step() {
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
    }

    private _runScope(gen) {
        this.stack.push(new Frame(gen, this.line));

        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                } else {
                    this._retVal = result.value.gen;
                }
            }
            result = this._step();
        }

        this._popAndStoreReturnValue(result.value);
    }

    private _popAndStoreReturnValue(value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen["obj"] || value;
    }
}

var _isGenerator = function (obj) {
    return obj instanceof Object && obj.toString() === "[object Generator]"
};

export = Stepper;
