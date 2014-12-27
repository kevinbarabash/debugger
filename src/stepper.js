/*global recast, esprima, escodegen, injector */

var Stack = require("../node_modules/basic-ds/lib/Stack");
var Task = require("../external/scheduler/lib/task");

class Stepper {
    constructor(genObj, options) {
        // TODO: align these names with the callback names on Debugger
        this.breakCallback = options.breakCallback || function () {};
        this.doneCallback = options.doneCallback || function () {};
        
        this._breakpoints = options.breakpoints || {};
        this.breakpointsEnabled = true;
        this._language = options.language || "es5";

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new Stack();
        this.stack.push({
            gen: genObj,
            line: -1
        });

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
    }

    stepOver() {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
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
    }

    stepOut() {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
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
    }

    start(paused) {
        this._started = true;
        this._paused = !!paused;
        this._run();
    }

    resume() {
        this._paused = false;
        this._run();
    }

     _run() {
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

    setBreakpoint(line) {
        this._breakpoints[line] = true;
    }

    clearBreakpoint(line) {
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

    _step() {
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
            if (result.value.popAgain) {
                this.stack.peek().popAgain = result.value.popAgain;
            }
            if (result.value.line) {
                frame.line = result.value.line;
            }
        }
        return result;
    }

    _runScope(gen) {
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
    }

    _popAndStoreReturnValue(value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen.obj || value;
    }
    
    _isGenerator(obj) {
        if (this._language.toLowerCase() === "es6") {
            return obj instanceof Object && obj.toString() === "[object Generator]"
        } else {
            // note: the regenerator runtime provides proper prototypes
            return obj && typeof(obj.next) === "function";
        }
    };
}

module.exports = Stepper;
