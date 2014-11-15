/*global recast, esprima, escodegen, injector */

(function (exports) {

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
        };
        this._halted = false;
        this._paused = false;
        this._line = 0;
        // retVal should only be passed to .next() when returning from a
        // function call
        this.retVal = undefined;

        var gen = this.debugGenerator(this.context);
        this.stack.push(new Frame(gen, this._line));
    };

    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            console.log(result);
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this._line));
                    this.stepIn();
                    return new Action("stepIn", this._line);
                } else {
                    this.retVal = result.value.gen;
                    if (result.value.statement) {
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
                    this.retVal = result.value.gen;
                    if (result.value.statement) {
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
                        this.retVal = result.value.gen;
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
        while (!this.stack.isEmpty()) {
            var action = this.stepIn();
            if (this.breakpoints[action.line] && action.type !== "stepOut") {
                if (!ignoreBreakpoints) {
                    return action;
                }
            }
            if (this.paused()) {
                return action;
            }
        }
        this._halted = true;
        return action;
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
        var ast = esprima.parse(code, { loc: true });

        var scopeManager = escope.analyze(ast);
        scopeManager.attach();

        var context = this.context;
        estraverse.replace(ast, {
            leave: function(node, parent) {
                if (node.type === "Program" || node.type === "BlockStatement") {
                    if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                        var variables = parent.__$escope$__.variables;
                        var scope = variables.filter(function (variable) {
                            // don't include context variables in the scopes
                            if (node.type === "Program" && context.hasOwnProperty(variable.name)) {
                                return false;
                            }
                            // function declarations like "function Point() {}"
                            // don't work properly when defining methods on the
                            // prototoype so filter those out as well
                            var isFunctionDeclaration = variable.defs.some(function (def) {
                                return def.type      === "FunctionName" &&
                                       def.node.type === "FunctionDeclaration";
                            });
                            if (isFunctionDeclaration) {
                                return false;
                            }
                            // filter out "arguments"
                            // TODO: make this optional, advanced users may want to inspect this
                            if (variable.name === "arguments") {
                                return false;
                            }
                            return true;
                        });
                    }

                    // insert yield { line: <line_number> } in between each line
                    var bodyList = LinkedList.fromArray(node.body);
                    bodyList.forEachNode(function (node) {
                        var loc = node.value.loc;
                        var yieldExpression = builder.createExpressionStatement(
                            builder.createYieldExpression(
                                builder.createObjectExpression({ line: loc.start.line })
                            )
                        );
                        if (node.value.type === "ExpressionStatement") {
                            if (node.value.expression.type === "YieldExpression") {
                                node.value.expression.argument.properties.push(
                                    builder.createProperty("statement", true)
                                );
                            }
                        }
                        bodyList.insertBeforeNode(node, yieldExpression);
                    });

                    // if there are any variables defined in this scope
                    // create a __scope__ dictionary containing their values
                    // and include in the first yield
                    if (scope && scope.length > 0) {
                        var properties = scope.map(function (variable) {
                            var isParam = variable.defs.some(function (def) {
                                return def.type === "Parameter";
                            });
                            var name = variable.name;

                            // if the variable is a parameter initialize its
                            // value with the value of the parameter
                            var value = isParam ? builder.createIdentifier(name) : builder.createIdentifier("undefined");
                            return {
                                type: "Property",
                                key: builder.createIdentifier(name),
                                value: value,
                                kind: "init"
                            }
                        });

                        // modify the first yield statement to include the scope
                        // as part of the value
                        var firstStatement = bodyList.first.value;
                        firstStatement.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("scope"),
                            value: builder.createIdentifier("__scope__"),
                            kind: "init"
                        });

                        // wrap the body with a yield statement
                        var withStatement = builder.createWithStatement(
                            builder.createIdentifier("__scope__"),
                            builder.createBlockStatement(bodyList.toArray())
                        );
                        var objectExpression = {
                            type: "ObjectExpression",
                            properties: properties
                        };

                        // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
                        node.body = [
                            builder.createVariableDeclaration([
                                builder.createVariableDeclarator("__scope__", objectExpression)
                            ]),
                            withStatement
                        ];
                    } else {
                        node.body = bodyList.toArray();
                    }
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
                            builder.createObjectExpression({ gen: gen })
                        );

                    } else if (node.callee.type === "CallExpression") {
                        // TODO: figure out how to trigger this
                        console.log("chained call expression, ignore for now");
                    } else {
                        throw "we don't handle '" + node.callee.type + "' callees";
                    }
                }
            }
        });

        var debugCode = "return function*(context){\nwith(context){\n" +
            escodegen.generate(ast) + "\n}\n}";

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
        var result = frame.gen.next(this.retVal);
        this.retVal = undefined;

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
        this.stack.push(frame);

        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                this._runScope(new Frame(result.value.gen, this._line));
            }
            result = this._step();
        }

        this._popAndStoreReturnValue(result.value);
    };

    Stepper.prototype._popAndStoreReturnValue = function (value) {
        var frame = this.stack.pop();
        this.retVal = frame.gen.obj || value;
        this._line = frame.line;
        return frame;
    };

    exports.Stepper = Stepper;
})(this);
