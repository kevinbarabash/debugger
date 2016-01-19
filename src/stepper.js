/*global recast, esprima, escodegen, injector */

var Stack = require("../node_modules/basic-ds/lib/Stack");

var frameProps = ["scope", "name", "loc", "stepInAgain"];

class Stepper {
    constructor(genObj, options) {
        // TODO: align these names with the callback names on Debugger
        this.breakCallback = options.breakCallback || function () {};
        this.doneCallback = options.doneCallback || function () {};

        this._breakpoints = options.breakpoints || {};
        this.breakpointsEnabled = true;
        this.nativeGenerators = !!options.nativeGenerators;

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
            if (result.value && result.value.hasOwnProperty("value")) {
                var value = result.value.value;

                if (this._isGenerator(value)) {
                    this.stack.push({
                        gen: value,
                        line: this.line
                    });
                    this.stepIn();
                    return "stepIn";
                } else {
                    this._retVal = value;
                    if (result.value.stepAgain) {
                        return this.stepIn();
                    }
                }
            }

            if (result.done) {
                // when the generator is done, result.value contains the return value
                // of the generator function
                this._popAndStoreReturnValue(result.value);
                return "stepOut";
            }
            return "stepOver";
        }
    }

    stepOver() {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty("value")) {
                var value = result.value.value;

                if (this._isGenerator(value)) {
                    this._runScope(value);
                    if (result.value.stepAgain) {
                        this.stepOver();
                    }
                    return "stepOver";
                } else {
                    this._retVal = value;
                    if (result.value.stepAgain) {
                        return this.stepOver();
                    }
                }
            }

            if (result.done) {
                // when the generator is done, result.value contains the return value
                // of the generator function
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
                if (result.value.hasOwnProperty("value")) {
                    var value = result.value.value;

                    if (this._isGenerator(value)) {
                        this._runScope(value);
                    } else {
                        this._retVal = value;
                    }
                }
                result = this._step();
            }

            // when the generator is done, result.value contains the return value
            // of the generator function
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
        if (!this._stopped && this.stack.peek().loc) {
            return this.stack.peek().loc.start.line;
        } else {
            return -1;
        }
    }

    get loc() {
        if (!this._stopped && this.stack.peek().loc) {
            return this.stack.peek().loc;
        } else {
            return null;
        }
    }

    propError(e) {
        while (!this.stack.isEmpty) {
            this.stack.pop();
            var frame = this.stack.peek();

            try {
                var result = frame.gen.throw(e);
                return result;
            } catch (e2) {
                e = e2;
            }
        }
        // TODO: communicate uncaught errors to the debugger
        //return {
        //    done: true
        //};
    }

    _step() {
        if (this.stack.isEmpty) {
            return;
        }
        try {
            var frame = this.stack.peek();
            var result = frame.gen.next(this._retVal);
            this._retVal = undefined;

            // if the result.value contains scope information add it to the
            // current stack frame
            // TODO: make this list static

            if (result.value) {
                frameProps.forEach(prop => {
                    if (result.value.hasOwnProperty(prop)) {
                        frame[prop] = result.value[prop];
                    }
                });

                // TODO: think about use locations in stack trace instead
                if (result.value.hasOwnProperty("loc")) {
                    frame.line = result.value.loc.start.line;
                }

                if (result.value.breakpoint) {
                    this._paused = true;
                    this.breakCallback();
                }
            }
        } catch(e) {
            var result = this.propError(e);
            if (result) {
                var frame = this.stack.peek();
                this._retVal = undefined;

                // if the result.value contains scope information add it to the
                // current stack frame
                // TODO: make this list static

                if (result.value) {
                    frameProps.forEach(prop => {
                        if (result.value.hasOwnProperty(prop)) {
                            frame[prop] = result.value[prop];
                        }
                    });

                    if (result.value.breakpoint) {
                        this._paused = true;
                        this.breakCallback();
                    }
                }
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
            var value = result.value.value;
            if (result.value.value) {
                if (this._isGenerator(value)) {
                    this._runScope(value);
                } else {
                    this._retVal = value;
                }
            }
            result = this._step();
        }

        // when the generator is done, result.value contains the return value
        // of the generator function
        this._popAndStoreReturnValue(result.value);
    }

    _popAndStoreReturnValue(value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen.obj || value;

        // Handle a non user code call site.
        // This happens when stepping out of our resuming execution when paused
        // inside a callback to Array.prototype.map, reduce, etc.
        // we don't want to the debugger to stop inside of our custom implementation
        // of those methods.
        // The reason why we call stepIn() is because if we're at the end of the
        // callback there's a possibility that the callback should be called
        // again because we haven't finished iterating.
        // If it is the last iteration and we call stepIn(), we'll be returned
        // immediately because the generator for Array.prototype.map, reduce,
        // etc. is done.
        if (this.stack.peek() && this.stack.peek().stepInAgain) {
            var currentLine = this.line;
            var action = this.stepIn();
            if (this.breakpointsEnabled && this._breakpoints[this.line] && action !== "stepOut" && currentLine !== this.line) {
                this._paused = true;
            }
            if (this._paused) {
                this.breakCallback();
            }
        }
    }

    _isGenerator(obj) {
        return obj instanceof Object && obj.toString() === "[object Generator]";
    };
}

module.exports = Stepper;
