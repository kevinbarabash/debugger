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

    Node.prototype.destroy = function () {
        delete this.next;
        delete this.prev;
        delete this.value;
    };

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

    LinkedList.prototype.pop_back = function () {
        if (this.last) {
            var value = this.last.value;
            if (this.last.prev) {
                var last = this.last;
                this.last = last.prev;
                this.last.next = null;
                last.destroy();
            } else {
                this.last = null;
                this.first = null;
            }
            return value;
        } else {
            return null;
        }
    };

    LinkedList.prototype.pop_front = function () {
        if (this.first) {
            var value = this.first.value;
            if (this.first.next) {
                var first = this.first;
                this.first = first.next;
                this.first.prev = null;
                first.destroy();
            } else {
                this.first = null;
                this.last = null;
            }
            return value;
        } else {
            return null;
        }
    };

    LinkedList.prototype.clear = function () {
        this.first = this.last = null;
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
    "use strict";

    function getScopeVariables (node, parent, context) {
        var variables = parent.__$escope$__.variables;
        return variables.filter(function (variable) {
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
    function insertYields (bodyList) {
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
    }

    function create__scope__ (node, bodyList, scope) {
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
    }

    function stringForId(node) {
        var name = "";
        if (node.type === "Identifier") {
            name = node.name;
        } else if (node.type === "MemberExpression") {
            name = stringForId(node.object) + "." + node.property.name;
        } else if (node.type === "ThisExpression") {
            name = "this";
        } else {
            throw "can't call stringForId on nodes of type '" + node.type + "'";
        }
        return name;
    }

    function getNameForFunctionExpression(node) {
        var name = "";
        if (node._parent.type === "Property") {
            name = node._parent.key.name;
            if (node._parent._parent.type === "ObjectExpression") {
                name = getNameForFunctionExpression(node._parent._parent) + "." + name;
            }
        } else if (node._parent.type === "AssignmentExpression") {
            name = stringForId(node._parent.left);
        } else if (node._parent.type === "VariableDeclarator") {
            name = stringForId(node._parent.id);
        } else {
            name = "<anonymous>"; // TODO: test anonymous callbacks
        }
        return name;
    }

    function transform(code, context) {
        var ast = esprima.parse(code, { loc: true });
        var scopeManager = escope.analyze(ast);
        scopeManager.attach();

        estraverse.replace(ast, {
            enter: function(node, parent) {
                node._parent = parent;
            },
            leave: function(node, parent) {
                if (node.type === "Program" || node.type === "BlockStatement") {
                    if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                        var scope = getScopeVariables(node, parent, context);
                    }

                    var bodyList = LinkedList.fromArray(node.body);
                    insertYields(bodyList);

                    if (bodyList.first) {
                        if (parent.type === "FunctionDeclaration") {
                            bodyList.first.value.expression.argument.properties.push({
                                type: "Property",
                                key: builder.createIdentifier("name"),
                                value: builder.createLiteral(stringForId(parent.id)),   // NOTE: identifier can be a member expression too!
                                kind: "init"
                            });
                        } else if (parent.type === "FunctionExpression") {
                            var name = getNameForFunctionExpression(parent);
                            bodyList.first.value.expression.argument.properties.push({
                                type: "Property",
                                key: builder.createIdentifier("name"),
                                value: builder.createLiteral(name),
                                kind: "init"
                            });
                        } else if (node.type === "Program") {
                            bodyList.first.value.expression.argument.properties.push({
                                type: "Property",
                                key: builder.createIdentifier("name"),
                                value: builder.createLiteral("<PROGRAM>"),
                                kind: "init"
                            });
                        }
                    }

                    // if there are any variables defined in this scope
                    // create a __scope__ dictionary containing their values
                    // and include in the first yield
                    if (scope && scope.length > 0 && bodyList.first) {
                        // TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
                        create__scope__(node, bodyList, scope);
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

                delete node._parent;
            }
        });

        return "return function*(context){\nwith(context){\n" +
                escodegen.generate(ast) + "\n}\n}";
    }

    exports.transform = transform;
})(this);

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
        this.deferred = $.Deferred();

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new Stack();
        this.stack.push(new Frame(genObj, -1));

        var self = this;
        this.stack.poppedLastItem = function () {
            self._stopped = true;
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
                this.emit('done');
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
            this.emit('done');
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

/**
 * The purpose of the scheduler is to:
 * - add tasks to a queue in a certain order
 * - remove tasks from the queue when they have completed
 * - reschedule recurring tasks
 */

function Scheduler () {
    this.queue = new LinkedList();
}

Scheduler.prototype.addTask = function (task) {
    var self = this;

    task.on('done', function () {
        self.queue.pop_back();
        self.tick();
    });

    this.queue.push_front(task);
    this.tick();
};

Scheduler.prototype.tick = function () {
    var self = this;
    setTimeout(function () {
        var currentTask = self.currentTask();
        if (currentTask !== null && !currentTask.started()) {
            currentTask.start();
        }
    });
};

Scheduler.prototype.currentTask = function () {
    return this.queue.last ? this.queue.last.value : null;
};

Scheduler.prototype.clear = function () {
    this.queue.clear();
};

/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

function Debugger(context) {
    EventEmitter.call(this);

    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.breakpoints = {};
    this.scheduler = new Scheduler();
}

Debugger.prototype = new EventEmitter();

Debugger.isBrowserSupported = function () {
    try {
        var code = "\n" +
            "var generator = (function* () {\n" +
            "  yield* (function* () {\n" +
            "    yield 5; yield 6;\n" +
            "  }());\n" +
            "}());\n" +
            "\n" +
            "var item = generator.next();\n" +
            "var passed = item.value === 5 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === 6 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === undefined && item.done === true;\n" +
            "return passed;";
        return Function(code)()
    } catch(e) {
        return false;
    }
};

Debugger.prototype.load = function (code) {
    var debugCode = transform(code, this.context);
    var debugFunction = new Function(debugCode);
    this.mainGenerator = debugFunction();
};

Debugger.prototype.start = function () {
    this.scheduler.clear();

    var task = new Stepper(this.mainGenerator(this.context), this.breakpoints);
    task.on('done', this.handleMainDone.bind(this));

    // when the scheduler finishes the last task in the queue it should
    // emit a message so that we can toggle buttons appropriately
    // if there's a draw function that's being run on a loop then we shouldn't toggle buttons

    this.scheduler.addTask(task);
};

Debugger.prototype.queueRecurringGenerator = function (gen, delay) {
    if (this.done) {
        return;
    }

    var self = this;

    setTimeout(function () {
        self.queueGenerator(gen)
            .on('done', function () {
                self.queueRecurringGenerator(gen);
            });
    }, delay);
};

Debugger.prototype.queueGenerator = function (gen) {
    var task = new Stepper(gen(), this.breakpoints);
    this.scheduler.addTask(task);
    return task;
};

// This should be run whenever the values of any of the special functions
// are changed.  This suggests using something like observe-js
Debugger.prototype.handleMainDone = function () {
    var draw = this.context.draw;
    if (draw) {
        this.queueRecurringGenerator(draw, 1000/60);
    }

    var self = this;

    var mouseClicked = this.context.mouseClicked;
    if (mouseClicked) {
        this.context.mouseClicked = function () {
            self.queueGenerator(mouseClicked);
        };
    }

    var mouseDragged = this.context.mouseDragged;
    if (mouseDragged) {
        this.context.mouseDragged = function () {
            self.queueGenerator(mouseDragged);
        };
    }
};

Debugger.prototype.pause = function () {
    // if we aren't paused, break at the start of the next stepper task

};

Debugger.prototype.resume = function () {
    // continue running if we paused, run to the next breakpoint

};

Debugger.prototype.stop = function () {
    this.done = true;
};

Debugger.prototype.stepIn = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepIn() : null;
};

Debugger.prototype.stepOver = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepOver() : null;
};

Debugger.prototype.stepOut = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepOut() : null;
};

Debugger.prototype.currentStepper = function () {
    return this.scheduler.currentTask();
};

Debugger.prototype.currentFrameStack = function () {
    var task = scheduler.currentTask();
    if (task !== null) {
        return task.stack;
    } else {
        return null;
    }
};

Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

function __instantiate__ (Class) {
    var obj = Object.create(Class.prototype);
    var args = Array.prototype.slice.call(arguments, 1);
    var gen = Class.apply(obj, args);

    if (gen) {
        gen.obj = obj;
        return gen;
    } else {
        return obj;
    }
}
