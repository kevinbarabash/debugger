/*global recast, esprima, escodegen, injector */

(function (exports) {
    "use strict";

    function Action (type, line) {
        if (line === undefined) {
            debugger;
        }
        this.type = type;
        this.line = line;
    }

    function Frame (gen, line) {
        this.gen = gen;
        this.line = line;
    }

    function Stepper (context) {
        // Only support a single context because using multiple "with" statements
        // hurts performance: http://jsperf.com/multiple-withs
        // Multiple contexts can be simulated by merging the dictionaries.
        this.context = context || {};
        this.context.__instantiate__ = function (Class) {
            var obj = Object.create(Class.prototype);
            var args = Array.prototype.slice.call(arguments, 1);
            var gen = Class.apply(obj, args);
            gen.obj = obj;
            return gen;
        };

        this.breakpoints = {};
    }

    Stepper.isBrowserSupported = function () {
        try {
            return Function("\nvar generator = (function* () {\n  yield* (function* () {\n    yield 5; yield 6;\n  }());\n}());\n\nvar item = generator.next();\nvar passed = item.value === 5 && item.done === false;\nitem = generator.next();\npassed    &= item.value === 6 && item.done === false;\nitem = generator.next();\npassed    &= item.value === undefined && item.done === true;\nreturn passed;\n  ")()
        } catch(e) {
            return false;
        }
    };

    Stepper.prototype.load = function (code) {
        if (this.debugGenerator = this._createDebugGenerator(code)) {
            this.reset();
        }
    };

    Stepper.prototype.reset = function () {
        this.stack = new Stack();

        var self = this;
        this.stack.poppedLastItem = function () {
            self._halted = true;
            if (self.resolve) {
                self.resolve(self);
                delete self.resolve;
            }
        };
        this._halted = false;
        this._paused = false;
        this._line = 0;
        this._retVal = undefined;

        var gen = this.debugGenerator(this.context);
        this.stack.push(new Frame(gen, this._line));
    };

    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this._line));
                    this.stepIn();
                    return new Action("stepIn", this._line);
                } else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return new Action("stepOut", this._line);
            }
            return new Action("stepOver", this._line);
        }
    };

    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value);
                    this.stepOver();
                    return new Action("stepOver", this._line);
                } else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return new Action("stepOut", this._line);
            }
            return new Action("stepOver", this._line);
        }
    };

    Stepper.prototype.stepOut = function () {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
                    if (_isGenerator(result.value.gen)) {
                        this._runScope(result.value);
                    } else {
                        this._retVal = result.value.gen;
                    }
                }
                result = this._step();
            }
            this._popAndStoreReturnValue(result.value);
            return new Action("stepOut", this._line);
        }
    };

    // TODO: figure out how to respond to UI actions while running
    // there should be a callback that's fired after each action that's
    // run and then we can set call pause() to set this._paused to true
    Stepper.prototype.run = function (ignoreBreakpoints) {
        this._paused = false;
        while (!this.stack.isEmpty()) {
            var action = this.stepIn();
            if (this.breakpoints[action.line] && action.type !== "stepOut") {
                if (!ignoreBreakpoints) {
                    this._paused = true;
                    return action;
                }
            }
            if (this.paused()) {
                return action;
            }
        }
        return action;
    };

    Stepper.prototype.runWithPromises = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            self.resolve = resolve;
            while (true) {
                if (self.stack.isEmpty()) {
                    break;
                }
                var action = self.stepIn();
                if (self.breakpoints[action.line] && action.type !== "stepOut") {
                    self._paused = true;
                    break;
                }
            }
        });
    };

    Stepper.prototype.runGenWithPromises = function (gen) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!self.halted()) {
                reject();
            }
            self._halted = false;

            // assumes the stack is empty... should probably just set the value
            self.stack.push({
                gen: gen,
                line: 0
            });

            self.resolve = resolve;
            while (true) {
                if (self.stack.isEmpty()) {
                    break;
                }
                var action = self.stepIn();
                if (self.breakpoints[action.line] && action.type !== "stepOut") {
                    self._paused = true;
                    break;
                }
            }
        });
    };

    Stepper.prototype.halted = function () {
        return this._halted;
    };

    Stepper.prototype.paused = function () {
        return this._paused;
    };

    Stepper.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };

    Stepper.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };

    Stepper.prototype.disableBreakpoint = function (line) {};
    Stepper.prototype.enableBreakpoint = function (line) {};
    Stepper.prototype.disableAllBreakpoints = function () {};
    Stepper.prototype.enableAllBreakpoints = function () {};

    /* PRIVATE */

    var _isGenerator = function (obj) {
        return obj instanceof Object && obj.toString() === "[object Generator]"
    };

    Stepper.prototype._createDebugGenerator = function (code) {
        var debugCode = transform(code, this.context);
        console.log(debugCode);
        var debugFunction = new Function(debugCode);
        return debugFunction(); // returns a generator
    };

    Stepper.prototype._step = function () {
        if (this.stack.isEmpty()) {
            this._halted = true;
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
            if (result.value.line) {
                this._line = result.value.line;
            }
        }
        return result;
    };

    Stepper.prototype._runScope = function (frame) {
        if (this._line !== undefined) {
            this.stack.peek().line = this._line;
        } else {
            // TODO: figure out where this._line is set to "undefined"
        }
        this.stack.push(frame);

        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(new Frame(result.value.gen, this._line));
                } else {
                    this._retVal = result.value.gen;
                }
            }
            result = this._step();
        }

        this._popAndStoreReturnValue(result.value);
    };

    Stepper.prototype._popAndStoreReturnValue = function (value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen.obj || value;
        this._line = frame.line;
        return frame;
    };

    exports.Stepper = Stepper;
})(this);
