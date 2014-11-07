/*global recast, esprima, escodegen, injector */

(function (exports) {

    function Action (type, line) {
        this.type = type;
        this.line = line;
    }

    function Stepper (context) {
        this.context = context;
        this.context.instantiate = function (Class) {
            var obj = Object.create(Class.prototype);
            var args = Array.prototype.slice.call(arguments, 1);
            var gen = Class.apply(obj, args);
            gen.obj = obj;
            return gen;
        };

        this.yieldVal = undefined;
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
        if (this.debugCode = this._generateDebugCode(code)) {
            this.reset();
        }
    };

    Stepper.prototype.reset = function () {
        this.stack = new Stack();

        var self = this;
        this.stack.poppedLastItem = function () {
            self.done = true;
        };
        this.done = false;

        this.stack.push({
            gen: ((new Function(this.debugCode))())(this.context),
            line: 0
        });
    };

    Stepper.prototype.halted = function () {
        return this.done;
    };

    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.done) {
                var frame = this._popAndStoreYieldValue(result.value);
                return new Action("stepOut", frame.line);
            } else if (result.value.gen) {
                if (result.value.gen.toString() === "[object Generator]") {
                    this.stack.push(result.value);
                    return new Action("stepIn", this.stepIn().line);
                } else {
                    this.yieldVal = result.value.gen;
                }
            }
            return new Action("stepOver", result.value.line);
        }
    };

    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.done) {
                var frame = this._popAndStoreYieldValue(result.value);
                return new Action("stepOut", frame.line);
            } else if (result.value.gen) {
                if (result.value.gen.toString() === "[object Generator]") {
                    this._runScope(result.value);
                    return new Action("stepOver", this.stepOver().line);
                } else {
                    this.yieldVal = result.value.gen;
                }
            }
            return new Action("stepOver", result.value.line);
        }
    };

    Stepper.prototype.stepOut = function () {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.gen) {
                    if (result.value.gen.toString() === "[object Generator]") {
                        this._runScope(result.value);
                    } else {
                        this.yieldVal = result.value.gen;
                    }
                }
                result = this._step();
            }
            var frame = this._popAndStoreYieldValue(result.value);
            return new Action("stepOut", frame.line);
        }
    };

    Stepper.prototype.run = function (ignoreBreakpoints) {
        while (!this.stack.isEmpty()) {
            var action = this.stepIn();
            if (this.breakpoints[action.line] && action.type !== "stepOut") {
                if (!ignoreBreakpoints) {
                    return action;
                }
            }
        }
        this.done = true;
        return action;
    };

    Stepper.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };

    Stepper.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };

    /* PRIVATE */

    Stepper.prototype._generateDebugCode = function (code) {
        this.ast = esprima.parse(code, { loc: true });

        injector.process(this.ast, this.context);

        return "return function*(){\nwith(arguments[0]){\n"
            + escodegen.generate(this.ast) + "\n}\n}";
    };

    Stepper.prototype._step = function () {
        if (this.stack.isEmpty()) {
            this.done = true;
            return;
        }
        var frame = this.stack.peek();
        var result = frame.gen.next(this.yieldVal);
        this.yieldVal = undefined;
        return result;
    };

    Stepper.prototype._runScope = function (frame) {
        this.stack.push(frame);

        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                this._runScope(result.value);
            }
            result = this._step();
        }

        this._popAndStoreYieldValue(result.value);
    };

    Stepper.prototype._popAndStoreYieldValue = function (value) {
        var frame = this.stack.pop();
        this.yieldVal = frame.gen.obj || value;
        return frame;
    };

    exports.Stepper = Stepper;
})(this);
