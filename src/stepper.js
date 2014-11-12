/*global recast, esprima, escodegen, injector */

(function (exports) {

    function Action (type, line) {
        if (line === undefined) {
            debugger;
        }
        this.type = type;
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
        if (this.debugGenerator = this._createDebugGenerator(code)) {
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
            gen: this.debugGenerator(this.context),
            line: 0
        });
    };

    Stepper.prototype.halted = function () {
        return this.done;
    };

    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(result.value);
                    return new Action("stepIn", this.stepIn().line);
                } else {
                    this.yieldVal = result.value.gen;
                    result = this._step();
                }
            }
            if (result.done) {
                var frame = this._popAndStoreYieldValue(result.value);
                return new Action("stepOut", frame.line);
            }
            return new Action("stepOver", result.value.line);
        }
    };

    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value);
                    return new Action("stepOver", this.stepOver().line);
                } else {
                    this.yieldVal = result.value.gen;
                    result = this._step();
                }
            }
            if (result.done) {
                var frame = this._popAndStoreYieldValue(result.value);
                return new Action("stepOut", frame.line);
            }
            return new Action("stepOver", result.value.line);
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

    var _isGenerator = function (obj) {
        return obj instanceof Object && obj.toString() === "[object Generator]"
    };

    Stepper.prototype._createDebugGenerator = function (code) {
        var ast = esprima.parse(code, { loc: true });

        estraverse.replace(ast, {
            leave: function(node, parent) {
                if (node.type === "Program" || node.type === "BlockStatement") {
                    var bodyList = LinkedList.fromArray(node.body);

                    bodyList.forEachNode(function (node) {
                        var loc = node.value.loc;
                        var yieldExpression = builder.createExpressionStatement(
                            builder.createYieldExpression(
                                builder.createObjectExpression({ line: loc.start.line })
                            )
                        );

                        bodyList.insertBeforeNode(node, yieldExpression);
                    });
                    node.body = bodyList.toArray();
                } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                    node.generator = true;
                } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                    if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression") {

                        var gen = node;

                        // if "new" then build a call to "__instantiate__"
                        if (node.type === "NewExpression") {
                            node.arguments.unshift(node.callee);
                            gen = builder.createCallExpression("__instantiate__", node.arguments);
                        }

                        // create a yieldExpress to wrap the call
                        return builder.createYieldExpression(
                            builder.createObjectExpression({
                                gen: gen,
                                line: node.loc.start.line
                            })
                        );

                    } else if (node.callee.type === "CallExpression") {
                        console.log("chained call expression, ignore for now");
                    } else {
                        throw "we don't handle '" + node.callee.type + "' callees";
                    }
                }
            }
        });

        var debugCode = "return function*(){\nwith(arguments[0]){\n" +
            escodegen.generate(ast) + "\n}\n}";

        var debugFunction = new Function(debugCode);
        return debugFunction(); // returns a generator
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
