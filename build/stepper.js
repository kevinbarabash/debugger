(function (exports) {

    function Stack () {
        this.values = [];

        // delegate methods
        this.poppedLastItem = function () {};
    }

    Stack.prototype.isEmpty = function () {
        return this.values.length === 0;
    };

    Stack.prototype.push = function (value) {
        this.values.push(value);
    };

    Stack.prototype.pop = function () {
        var item = this.values.pop();
        if (this.isEmpty()) {
            this.poppedLastItem(item);
        }
        return item;
    };

    Stack.prototype.peek = function () {
        return this.values[this.values.length - 1];
    };

    Stack.prototype.size = function () {
        return this.values.length;
    };

    exports.Stack = Stack;

})(this);

(function (exports) {

    function Node (value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }

    function LinkedList () {
        this.first = null;
        this.last = null;
    }
    
    LinkedList.prototype.push_back = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        }
    };
    
    LinkedList.prototype.push_front = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
            node.next = this.first;
            this.first.prev = node;
            this.first = node;
        }
    };
    
    LinkedList.prototype.insertBeforeNode = function (refNode, value) {
        if (refNode === this.first) {
            this.push_front(value);
        } else {
            var node = new Node(value);
            node.prev = refNode.prev;
            node.next = refNode;
            refNode.prev.next = node;
            refNode.prev = node;
        }
    };
    
    LinkedList.prototype.inserAfterNode = function (refNode, value) {
        if (refNode === this.last) {
            this.push_back(value);
        } else {
            var node = new Node(value);
            
        }
    };

    LinkedList.prototype.forEachNode = function (callback, _this) {
        var node = this.first;
        while (node !== null) {
            callback.call(_this, node);
            node = node.next;
        }
    };
    
    // TODO: provide the index to the callback as well
    LinkedList.prototype.forEach = function (callback, _this) {
        this.forEachNode(function (node) {
            callback.call(_this, node.value);  
        });
    };
    
    LinkedList.prototype.nodeAtIndex = function (index) {
        var i = 0;
        var node = this.first;
        while (node !== null) {
            if (index === i) {
                return node;
            }
            i++;
        }
        return null;
    };
    
    LinkedList.prototype.valueAtIndex = function (index) {
        var node = this.nodeAtIndex(index);
        return node ? node.value : undefined;
    };
    
    LinkedList.prototype.toArray = function () {
        var array = [];
        var node = this.first;
        while (node !== null) {
            array.push(node.value);
            node = node.next;
        }
        return array;
    };
    
    LinkedList.fromArray = function (array) {
        var list = new LinkedList();
        array.forEach(function (value) {
            list.push_back(value); 
        });
        return list;
    };
    
    exports.LinkedList = LinkedList;

})(this);

/* build Parser API style AST nodes and trees */

(function (exports) {

    var createExpressionStatement = function (expression) {
        return {
            type: "ExpressionStatement",
            expression: expression
        };
    };

    var createBlockStatement = function (body) {
        return {
            type: "BlockStatement",
            body: body
        }
    };

    var createCallExpression = function (name, arguments) {
        return {
            type: "CallExpression",
            callee: createIdentifier(name),
            arguments: arguments
        };
    };

    var createYieldExpression = function (argument) {
        return {
            type: "YieldExpression",
            argument: argument
        };
    };

    var createObjectExpression = function (obj) {
        var properties = Object.keys(obj).map(function (key) {
            var value = obj[key];
            return createProperty(key, value);
        });

        return {
            type: "ObjectExpression",
            properties: properties
        };
    };

    var createProperty = function (key, value) {
        var expression;
        if (value instanceof Object) {
            if (value.type === "CallExpression" || value.type === "NewExpression") {
                expression = value;
            } else {
                expression = createObjectExpression(value);
            }
        } else if (value === undefined) {
            expression = createIdentifier("undefined");
        } else {
            expression = createLiteral(value);
        }

        return {
            type: "Property",
            key: createIdentifier(key),
            value: expression,
            kind: "init"
        }
    };

    var createIdentifier = function (name) {
        return {
            type: "Identifier",
            name: name
        };
    };

    var createLiteral = function (value) {
        if (value === undefined) {
            throw "literal value undefined";
        }
        return {
            type: "Literal",
            value: value
        }
    };

    var createWithStatement = function (obj, body) {
        return {
            type: "WithStatement",
            object: obj,
            body: body
        };
    };

    var createAssignmentExpression = function (name, value) {
        return {
            type: "AssignmentExpression",
            operator: "=",
            left: createIdentifier(name),
            right: value
        }
    };

    var createVariableDeclarator = function (name, value) {
        return {
            type: "VariableDeclarator",
            id: createIdentifier(name),
            init: value
        };
    };

    // a declaration is a subclass of statement
    var createVariableDeclaration = function (declarations) {
        return {
            type: "VariableDeclaration",
            declarations: declarations,
            kind: "var"
        };
    };

    var replaceNode = function (parent, name, replacementNode) {
        if (name.indexOf("arguments") === 0) {
            var index = name.match(/\[([0-1]+)\]/)[1];
            parent.arguments[index] = replacementNode;
        } else {
            parent[name] = replacementNode;
        }
    };

    exports.builder = {
        createExpressionStatement: createExpressionStatement,
        createBlockStatement: createBlockStatement,
        createCallExpression: createCallExpression,
        createYieldExpression: createYieldExpression,
        createObjectExpression: createObjectExpression,
        createProperty: createProperty,
        createIdentifier: createIdentifier,
        createLiteral: createLiteral,
        createWithStatement: createWithStatement,
        createAssignmentExpression: createAssignmentExpression,
        createVariableDeclaration: createVariableDeclaration,
        createVariableDeclarator: createVariableDeclarator,
        replaceNode: replaceNode
    }

})(this);

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
                        // add an extra property to differentiate function calls
                        // that are followed by a statment from those that aren't
                        // the former requires taking an extra _step() to get the
                        // next line
                        if (node.value.type === "ExpressionStatement") {
                            if (node.value.expression.type === "YieldExpression") {
                                node.value.expression.argument.properties.push(
                                    builder.createProperty("stepAgain", true)
                                );
                            }
                            // TODO: add test case for "x = foo()" stepAgain
                            if (node.value.expression.type === "AssignmentExpression") {
                                var expr = node.value.expression.right;
                                if (expr.type === "YieldExpression") {
                                    expr.argument.properties.push(
                                        builder.createProperty("stepAgain", true)
                                    );
                                }
                            }
                        }
                        // TODO: add test case for "var x = foo()" stepAgain
                        // TODO: add test case for "var x = foo(), y = foo()" stepAgain on last decl
                        if (node.value.type === "VariableDeclaration") {
                            var lastDecl = node.value.declarations[node.value.declarations.length - 1];
                            if (lastDecl.init && lastDecl.init.type === "YieldExpression") {
                                lastDecl.init.argument.properties.push(
                                    builder.createProperty("stepAgain", true)
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
                    if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" || node.callee.type === "YieldExpression") {

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
                    } else {
                        throw "we don't handle '" + node.callee.type + "' callees";
                    }
                }
            }
        });

        var debugCode = "return function*(context){\nwith(context){\n" +
            escodegen.generate(ast) + "\n}\n}";

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
