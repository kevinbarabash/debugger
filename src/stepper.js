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

    function Stepper (genObj, breakpoints) {
        EventEmitter.call(this);

        this.breakpoints = breakpoints || {};
        this.breakpointsEnabled = true;

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new Stack();
        this.stack.push(new Frame(genObj, -1));

        var self = this;
        this.stack.poppedLastItem = function () {
            self._stopped = true;
            self.emit("done");
        };

        this._retVal = undefined;
    }

    Stepper.prototype = new EventEmitter();

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
                    this._runScope(result.value.gen);
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
                        this._runScope(result.value.gen);
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

    Stepper.prototype.start = function (paused) {
        this._started = true;
        this._paused = !!paused;
        this._run();
    };

    Stepper.prototype.resume = function () {
        this._paused = false;
        this._run();
    };

    Stepper.prototype._run = function () {
        var currentLine = this.line();
        while (true) {
            if (this.stack.isEmpty) {
                break;
            }
            var action = this.stepIn();
            if (this.breakpointsEnabled && this.breakpoints[action.line] && action.type !== "stepOut" && currentLine !== this.line()) {
                this._paused = true;
            }
            if (this._paused) {
                this.emit("break");
                break;
            }
            currentLine = this.line();
        }
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
    };

    Stepper.prototype._runScope = function (gen) {
        this.stack.push(new Frame(gen, this.line()));

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
    };

    Stepper.prototype._popAndStoreReturnValue = function (value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen.obj || value;
    };

    exports.Stepper = Stepper;
})(this);
