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

/* simple tree walker for Parser API style AST trees */

function Walker() {
    this.shouldWalk = function (node) {
        return true;
    };
    this.enter = function (node) { };
    this.exit = function (node) { };
}

Walker.prototype.walk = function (node, name, parent) {
    if (!node) {
        return; // TODO: proper validation
        // for now we assume that the AST is properly formed
    }
    if (this.shouldWalk(node, name, parent)) {
        this.enter(node, name, parent);
        this[node.type](node);
        this.exit(node, name, parent);
    }
};

Walker.prototype.walkEach = function (nodes, name, parent) {
    for (var i = 0; i < nodes.length; i++) {
        this.walk(nodes[i], name + "[" + i + "]", parent);
    }
};

Walker.prototype.AssignmentExpression = function (node) {
    this.walk(node.left, "left", node);
    this.walk(node.right, "right", node);
};

Walker.prototype.ArrayExpression = function (node) {
    this.walkEach(node.elements, "elements", node);
};

Walker.prototype.BlockStatement = function (node) {
    this.walkEach(node.body, "body", node);
};

Walker.prototype.BinaryExpression = function (node) {
    this.walk(node.left, "left", node);
    this.walk(node.right, "left", node);
};

Walker.prototype.BreakStatement = function (node) {
    this.walk(node.label, "label", node);
};

Walker.prototype.CallExpression = function (node) {
    this.walk(node.callee, "callee", node);
    this.walkEach(node.arguments, "arguments", node);
};

Walker.prototype.CatchClause = function (node) {
    this.walk(node.param, "param", node);
    this.walk(node.guard, "guard", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.ConditionalExpression = function (node) {
    this.walk(node.test, "test", node);
    this.walk(node.alternate, "alternate", node);
    this.walk(node.consequent, "consequent", node);
};

Walker.prototype.ContinueStatement = function (node) {
    this.walk(node.label, "label", node);
};

Walker.prototype.DoWhileStatement = function (node) {
    this.walk(node.body, "body", node);
    this.walk(node.test, "test", node);
};

Walker.prototype.DebuggerStatement = function (node) {

};

Walker.prototype.EmptyStatement = function (node) {

};

Walker.prototype.ExpressionStatement = function (node) {
    this.walk(node.expression, "expression", node);
};

Walker.prototype.ForStatement = function (node) {
    this.walk(node.init, "init", node);
    this.walk(node.test, "init", node);
    this.walk(node.update, "update", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.ForInStatement = function (node) {
    this.walk(node.left, "left", node);
    this.walk(node.right, "right", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.ForOfStatement = function (node) {
    this.walk(node.left, "left", node);
    this.walk(node.right, "right", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.FunctionDeclaration = function (node) {
    this.walk(node.id, "id", node);
    this.walkEach(node.params, "params", node);
    this.walk(node.rest, "rest", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.FunctionExpression = function (node) {
    this.walk(node.id, "id", node);
    this.walkEach(node.params, "params", node);
    this.walk(node.rest, "rest", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.Identifier = function (node) {

};

Walker.prototype.IfStatement = function (node) {
    this.walk(node.text, "test", node);
    this.walk(node.consequent, "consequent", node);
    this.walk(node.alternate, "alternate", node);
};

Walker.prototype.Literal = function (node) {

};

Walker.prototype.LabeledStatement = function (node) {
    this.walk(node.body, "body", node);
};

Walker.prototype.LogicalExpression = function (node) {
    this.walk(node.left, "left", node);
    this.walk(node.right, "right", node);
};

Walker.prototype.MemberExpression = function (node) {
    this.walk(node.object, "object", node);
    this.walk(node.property, "property", node);
};

Walker.prototype.NewExpression = function (node) {
    this.walk(node.callee, "callee", node);
    this.walkEach(node.arguments, "arguments", node);
};

Walker.prototype.ObjectExpression = function (node) {
    this.walkEach(node.properties, "properties", node);
};

Walker.prototype.Program = function (node) {
    this.walkEach(node.body, "body", node);
};

Walker.prototype.Property = function (node) {
    this.walk(node.key, "key", node);
    this.walk(node.value, "value", node);
};

Walker.prototype.ReturnStatement = function (node) {
    this.walk(node.argument, "argument", node);
};

Walker.prototype.SequenceExpression = function (node) {
    this.walkEach(node.expressions, "expressions", node);
};

Walker.prototype.SwitchStatement = function (node) {
    this.walk(node.discriminant, "discriminant", node);
    this.walkEach(node.cases, "cases", node);
};

Walker.prototype.SwitchCase = function (node) {
    this.walk(node.test, "test", node);
    this.walkEach(node.consequent, "consequent", node);
};

Walker.prototype.ThisExpression = function (node) {

};

Walker.prototype.ThrowStatement = function (node) {
    this.walk(node.argument, "argument", node);
};

Walker.prototype.TryStatement = function (node) {
    this.walk(node.block, "block", node);
    this.walk(node.handler, "handler", node);
    this.walkEach(node.guardedHandlers, "guardedHandlers", node);
    this.walk(node.finalizer, "finalizer", node);
};

Walker.prototype.UnaryExpression = function (node) {
    this.walk(node.argument, "argument", node);
};

Walker.prototype.UpdateExpression = function (node) {
    this.walk(node.argument, "argument", node);
};

Walker.prototype.VariableDeclaration = function (node) {
    this.walkEach(node.declarations, "declarations", node);
};

Walker.prototype.VariableDeclarator = function (node) {
    this.walk(node.id, "id", node);
    this.walk(node.init, "init", node);
};

Walker.prototype.WhileStatement = function (node) {
    this.walk(node.test, "test", node);
    this.walk(node.body, "body", node);
};

Walker.prototype.WithStatement = function (node) {
    this.walk(node.object, "object", node);
    this.walk(node.body, "body", node);
};

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

/* injects yield statements into the AST */

(function (exports) {

    /**
     * Injects yield expressions into AST and converts functions (that don't
     * return values) into generators.
     *
     * @param ast
     * @param context
     */
    var process = function (ast, context) {
        var yieldInjectionWalker = new Walker();
        
        /**
         * Called as the walker has walked the node's children.  Inserting
         * yield nodes on exit avoids traversing new nodes which would cause
         * an infinite loop.
         */
        yieldInjectionWalker.exit = function(node, name, parent) {
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
                
                if (node.callee.type === "Identifier") {
                    if (!context[node.callee.name] && !window[node.callee.name]) {
                        wrapCallWithYield(node, name, parent);
                    }
                } else if (node.callee.type === "MemberExpression") {
                    if (node.callee.object.type === "Identifier" &&
                        node.callee.property.type === "Identifier") {

                        var objName = node.callee.object.name;
                        var propName = node.callee.property.name;

                        if (window[objName] && window[objName][propName]) {
                            console.log("%s.%s defined on window, don't wrap", objName, propName);
                        } else if (context[objName] && context[objName][propName]) {
                            console.log("%s.%s defined on context, don't wrap", objName, propName);
                        } else {
                            wrapCallWithYield(node, name, parent);
                        }
                    } else {
                        wrapCallWithYield(node, name, parent);
                    }
                } else if (node.callee.type === "CallExpression") {
                    console.log("chained call expression, ignore for now");
                } else {
                    throw "we don't handle '" + node.callee.type + "' callees";
                }
                
                
            }
        };

        yieldInjectionWalker.walk(ast);
    };

    var wrapCallWithYield = function (node, name, parent) {
        var gen = node;

        // if "new" then build a call to "instantiate"
        if (node.type === "NewExpression") {
            node.arguments.unshift(node.callee);
            gen = builder.createCallExpression("instantiate", node.arguments);
            // NOTE: "instantiate" is defined in stepper.js
        }

        // create a yieldExpress to wrap the call
        var yieldExpression = builder.createYieldExpression(
            builder.createObjectExpression({
                gen: gen,
                line: node.loc.start.line
            })
        );

        // replace node with yieldExpression
        builder.replaceNode(parent, name, yieldExpression);
    };

    exports.injector = {
        process: process
    };
})(this);

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
