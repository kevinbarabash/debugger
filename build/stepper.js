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

var builder = {
    createExpressionStatement: function (expression) {
        return {
            type: "ExpressionStatement",
            expression: expression
        };
    },
    
    createCallExpression: function (name, arguments) {
        return {
            type: "CallExpression",
            callee: this.createIdentifier(name),
            arguments: arguments
        };      
    },

    createYieldExpression: function (argument) {
        return {
            type: "YieldExpression",
            argument: argument
        };
    },

    createObjectExpression: function (obj) {
        var properties = Object.keys(obj).map(function (key) {
            var value = obj[key];
            return this.createProperty(key, value);
        }, this);

        return {
            type: "ObjectExpression",
            properties: properties
        };
    },

    createProperty: function (key, value) {
        var expression;
        if (value instanceof Object) {
            if (value.type === "CallExpression" || value.type === "NewExpression") {
                expression = value;
            } else {
                debugger;
                throw "we don't handle object properties yet";
            }
        } else {
            expression = this.createLiteral(value);
        }

        return {
            type: "Property",
            key: this.createIdentifier(key),
            value: expression,
            kind: "init"
        }
    },

    createIdentifier: function (name) {
        return {
            type: "Identifier",
            name: name
        };
    },

    createLiteral: function (value) {
        if (value === undefined) {
            throw "literal value undefined";
        }
        return {
            type: "Literal",
            value: value
        }
    },
    
    replaceNode: function(parent, name, replacementNode) {
        if (name.indexOf("arguments") === 0) {
            var index = name.match(/\[([0-1]+)\]/)[1];
            parent.arguments[index] = replacementNode;
        } else {
            parent[name] = replacementNode;
        }
    }
};

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
