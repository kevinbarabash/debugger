var basic = require("../node_modules/basic-ds/lib/basic");
var Frame = (function () {
    function Frame(gen, line) {
        this.gen = gen;
        this.line = line;
    }
    return Frame;
})();
function emptyCallback() {
}
var Stepper = (function () {
    function Stepper(genObj, breakpoints, breakCallback, doneCallback) {
        var _this = this;
        if (breakCallback === void 0) { breakCallback = emptyCallback; }
        if (doneCallback === void 0) { doneCallback = emptyCallback; }
        this.breakCallback = breakCallback;
        this.doneCallback = doneCallback;
        this._breakpoints = breakpoints || {};
        this.breakpointsEnabled = true;
        this._started = false;
        this._paused = false;
        this._stopped = false;
        this.stack = new basic.Stack();
        this.stack.push(new Frame(genObj, -1));
        this.stack.poppedLastItem = function () {
            _this._stopped = true;
            _this.doneCallback();
        };
        this._retVal = undefined;
    }
    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this.line));
                    this.stepIn();
                    return "stepIn";
                }
                else {
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
                    return "stepOver";
                }
                else {
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
    };
    Stepper.prototype.stepOut = function () {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
                    if (_isGenerator(result.value.gen)) {
                        this._runScope(result.value.gen);
                    }
                    else {
                        this._retVal = result.value.gen;
                    }
                }
                result = this._step();
            }
            this._popAndStoreReturnValue(result.value);
            return "stepOut";
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
    };
    Stepper.prototype.setBreakpoint = function (line) {
        this._breakpoints[line] = true;
    };
    Stepper.prototype.clearBreakpoint = function (line) {
        delete this._breakpoints[line];
    };
    Object.defineProperty(Stepper.prototype, "started", {
        get: function () {
            return this._started;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "stopped", {
        get: function () {
            return this._stopped;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "line", {
        get: function () {
            if (!this._stopped) {
                return this.stack.peek().line;
            }
            else {
                return -1;
            }
        },
        enumerable: true,
        configurable: true
    });
    Stepper.prototype._step = function () {
        if (this.stack.isEmpty) {
            return;
        }
        var frame = this.stack.peek();
        var result = frame.gen.next(this._retVal);
        this._retVal = undefined;
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
        this.stack.push(new Frame(gen, this.line));
        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                }
                else {
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
    return Stepper;
})();
var _isGenerator = function (obj) {
    return obj instanceof Object && obj.toString() === "[object Generator]";
};
module.exports = Stepper;
