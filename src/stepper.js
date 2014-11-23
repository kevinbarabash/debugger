/*global recast, esprima, escodegen, injector */

(function (exports) {
    "use strict";

    function Action (type, line) {
        this.type = type;
        this.line = line;
    }

    function Frame (gen, line) {
        this.gen = gen;
        this.line = line;
    }

    function Stepper (generator) {
        this.breakpoints = {};
        this.deferred = $.Deferred();

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new Stack();
        this.stack.push(new Frame(generator, -1));

        var self = this;
        this.stack.poppedLastItem = function () {
            self._stopped = true;
        };

        this._retVal = undefined;
    }

//    Stepper.prototype.reset = function () {
//        this.stack = new Stack();
//
//        var self = this;
//        this.stack.poppedLastItem = function () {
//            self._stopped = true;
//        };
//        this._stopped = false;
//        this._paused = false;
//        this._retVal = undefined;
//
//        var gen = this.debugGenerator(this.context);
//        this.stack.push(new Frame(gen, -1));
//    };

    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this.line()));
                    this.stepIn();
                    return new Action("stepIn", this.line());
                } else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return new Action("stepOut", this.line());
            }
            return new Action("stepOver", this.line());
        }
    };

    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value);
                    if (result.value.stepAgain) {
                        this.stepOver();
                    }
                    return new Action("stepOver", this.line());
                } else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return new Action("stepOut", this.line());
            }
            return new Action("stepOver", this.line());
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
            return new Action("stepOut", this.line());
        }
    };

    // TODO: implement ignoreBreakpoints
    Stepper.prototype.start = function (ignoreBreakpoints) {
        this._started = true;
        this._paused = false;

        var currentLine = this.line();
        while (true) {
            if (this.stack.isEmpty()) {
                this.deferred.resolve(this);
                break;
            }
            var action = this.stepIn();
            if (this.breakpoints[action.line] && action.type !== "stepOut" && currentLine !== this.line()) {
                this._paused = true;
                break;
            }
            currentLine = this.line();
        }

        return action;
    };

    Stepper.prototype.runWithPromises = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            var currentLine = self.line();
            while (true) {
                if (self.stack.isEmpty()) {
                    resolve(self);
                    break;
                }
                var action = self.stepIn();
                if (self.breakpoints[action.line] && action.type !== "stepOut" && currentLine !== self.line()) {
                    self._paused = true;
                    resolve(self);
                    break;
                }
                currentLine = self.line();
            }
        });
    };

    Stepper.prototype.runGenWithPromises = function (gen) {
        var self = this;

        if (!self.stopped()) {
            return Promise.reject();
        }
        self._stopped = false;

        // assumes the stack is empty... should probably just set the value
        self.stack.push({
            gen: gen,
            line: 0
        });

        return this.runWithPromises();
    };

    Stepper.prototype.started = function () {
        return this._started;
    };

    Stepper.prototype.paused = function () {
        return this._paused;
    };

    Stepper.prototype.stopped = function () {
        return this._stopped;
    };

    Stepper.prototype.line = function () {
        if (!this._stopped) {
            return this.stack.peek().line;
        } else {
            return -1;
        }
    };

    Stepper.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };

    Stepper.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };

    /* PRIVATE */

    var _isGenerator = function (obj) {
        return obj instanceof Object && obj.toString() === "[object Generator]"
    };

    Stepper.prototype._step = function () {
        if (this.stack.isEmpty()) {
            this._stopped = true;
            this.deferred.resolve();
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
    };

    Stepper.prototype._runScope = function (frame) {
        this.stack.push(frame);

        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(new Frame(result.value.gen, this.line()));
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
    };

    exports.Stepper = Stepper;
})(this);
