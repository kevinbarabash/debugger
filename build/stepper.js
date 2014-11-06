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
    this.walk(node.arguments, "arguments", node);
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
            if (value.type === "CallExpression") {
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
            var len, i;

            if (node.type === "Program" || node.type === "BlockStatement") {
                len = node.body.length;

                insertYield(node, 0);
                var j = 2;
                for (i = 0; i < len - 1; i++) {
                    insertYield(node, j);
                    j += 2;
                }
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression") {
                if (!context[node.callee.name]) {

                    var yieldExpression = builder.createYieldExpression(
                        builder.createObjectExpression({
                            gen: node,
                            lineno: node.loc.start.line
                        })
                    );
                    
                    if (name.indexOf("arguments") === 0) {
                        var index = name.match(/\[([0-1]+)\]/)[1];
                        parent.arguments[index] = yieldExpression;
                    } else {
                        parent[name] = yieldExpression;
                    }
                }
            }
        };

        yieldInjectionWalker.walk(ast);
    };


    var insertYield = function (program, index) {
        var loc = program.body[index].loc;
        var node = builder.createExpressionStatement(
            builder.createYieldExpression(
                builder.createObjectExpression({ lineno: loc.start.line })
            )
        );

        program.body.splice(index, 0, node);
    };

    // TODO: fix this so it's a proper export
    exports.injector = {
        process: process
    };
})(window);

function Stack () {
    this.values = [];
}

Stack.prototype.isEmpty = function () {
    return this.values.length === 0;
};

Stack.prototype.push = function (value) {
    this.values.push(value);
};

Stack.prototype.pop = function () {
    return this.values.pop();
};

Stack.prototype.peek = function () {
    return this.values[this.values.length - 1];
};

/*global recast, esprima, escodegen, injector */

function Stepper (context) {
    this.context = context;

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

Stepper.prototype.generateDebugCode = function (code) {
    this.ast = esprima.parse(code, { loc: true });

    injector.process(this.ast, this.context);

    return "return function*(){\nwith(arguments[0]){\n"
        + escodegen.generate(this.ast) + "\n}\n}";
};

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    this.reset();
};

Stepper.prototype.reset = function () {
    this.stack = new Stack();
    this.done = false;
    
    this.stack.push({
        gen: ((new Function(this.debugCode))())(this.context),
        lineno: 0
    });
};

Stepper.prototype.halted = function () {
    return this.done;
};

Stepper.prototype.step = function () {
    if (this.stack.isEmpty()) {
        this.done = true;
        return;
    }
    var frame = this.stack.peek();
    var result = frame.gen.next(this.yieldVal);
    this.yieldVal = undefined;
    return result;
};

Stepper.prototype.stepIn = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    if (result.done) {
        var frame = this.stack.pop();

        if (this.stack.isEmpty()) {
            this.done = true;
        }
        
        this.yieldVal = result.value;
        return frame.lineno;
    } else if (result.value.gen) {
        this.stack.push(result.value);
        result = this.step();   // step in
    }
    return result.value && result.value.lineno;
};

Stepper.prototype.stepOver = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    if (result.done) {
        var frame = this.stack.pop();
        // TODO: create a delegate for the stack
        // so when you pop the last frame it can call a callback
        if (this.stack.isEmpty()) {
            this.done = true;
        }
        
        this.yieldVal = result.value;
        return frame.lineno;
    } else if (result.value.gen) {
        this.stack.push(result.value);
        this.yieldVal = this.runScope();
        this.stack.pop();

        if (this.stack.isEmpty()) {
            this.done = true;
        }
        
        return this.stepOver();
    }
    return result.value && result.value.lineno;
};

Stepper.prototype.stepOut = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    while (!result.done) {
        if (result.value.gen) {
            this.stack.push(result.value);
            this.yieldVal = this.runScope();
            this.stack.pop();
        }
        result = this.step();
    }
    var frame = this.stack.pop();
    this.yieldVal = result.value;

    if (this.stack.isEmpty()) {
        this.done = true;
    }
    return frame.lineno;
};

Stepper.prototype.run = function () {
    while (!this.stack.isEmpty()) {
        var lineno = this.stepIn();
        if (this.breakpoints[lineno]) {
            return lineno;
        }
    }
    this.done = true;
    return lineno;
};

Stepper.prototype.runScope = function () {
    var result = this.step();
    while (!result.done) {
        if (result.value.gen) {
            this.stack.push(result.value);
            this.yieldVal = this.runScope();
            this.stack.pop();
        }
        result = this.step();
    }
    return result.value;
};

Stepper.prototype.setBreakpoint = function (lineno) {
    this.breakpoints[lineno] = true;
};

Stepper.prototype.clearBreakpoint = function (lineno) {
    delete this.breakpoints[lineno];
};
