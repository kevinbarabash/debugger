/* simple tree walker for Parser API style AST trees */

function Walker() {
    this.enter = function (node) { };
    this.exit = function (node) { };
}

Walker.prototype.walk = function (node) {
    if (!node) {
        return; // TODO: proper validation
        // for now we assume that the AST is properly formed
    }
    this.enter(node);
    this[node.type](node);
    this.exit(node);
};

Walker.prototype.walkEach = function (nodes) {
    for (var i = 0; i < nodes.length; i++) {
        this.walk(nodes[i]);
    }
};

Walker.prototype.AssignmentExpression = function (node) {
    this.walk(node.left);
    this.walk(node.right);
};

Walker.prototype.ArrayExpression = function (node) {
    this.walkEach(node.elements);
};

Walker.prototype.BlockStatement = function (node) {
    this.walkEach(node.body);
};

Walker.prototype.BinaryExpression = function (node) {
    this.walk(node.left);
    this.walk(node.right);
};

Walker.prototype.BreakStatement = function (node) {
    this.walk(node.label);
};

Walker.prototype.CallExpression = function (node) {
    this.walk(node.callee);
    this.walkEach(node.arguments);
};

Walker.prototype.CatchClause = function (node) {
    this.walk(node.param);
    this.walk(node.guard);
    this.walk(node.body);
};

Walker.prototype.ConditionalExpression = function (node) {
    this.walk(node.test);
    this.walk(node.alternate);
    this.walk(node.consequent);
};

Walker.prototype.ContinueStatement = function (node) {
    this.walk(node.label);
};

Walker.prototype.DoWhileStatement = function (node) {
    this.walk(node.body);
    this.walk(node.test);
};

Walker.prototype.DebuggerStatement = function (node) {

};

Walker.prototype.EmptyStatement = function (node) {

};

Walker.prototype.ExpressionStatement = function (node) {
    this.walk(node.expression);
};

Walker.prototype.ForStatement = function (node) {
    this.walk(node.init);
    this.walk(node.test);
    this.walk(node.update);
    this.walk(node.body);
};

Walker.prototype.ForInStatement = function (node) {
    this.walk(node.left);
    this.walk(node.right);
    this.walk(node.body);
};

Walker.prototype.ForOfStatement = function (node) {
    this.walk(node.left);
    this.walk(node.right);
    this.walk(node.body);
};

Walker.prototype.FunctionDeclaration = function (node) {
    this.walk(node.id);
    this.walkEach(node.params);
    this.walk(node.rest);
    this.walk(node.body);
};

Walker.prototype.FunctionExpression = function (node) {
    this.walk(node.id);
    this.walkEach(node.params);
    this.walk(node.rest);
    this.walk(node.body);
};

Walker.prototype.Identifier = function (node) {

};

Walker.prototype.IfStatement = function (node) {
    this.walk(node.text);
    this.walk(node.consequent);
    this.walk(node.alternate);
};

Walker.prototype.Literal = function (node) {

};

Walker.prototype.LabeledStatement = function (node) {
    this.walk(node.body);
};

Walker.prototype.LogicalExpression = function (node) {
    this.walk(node.left);
    this.walk(node.right);
};

Walker.prototype.MemberExpression = function (node) {
    this.walk(node.object);
    this.walk(node.property);
};

Walker.prototype.NewExpression = function (node) {
    this.walk(node.callee);
    this.walk(node.arguments);
};

Walker.prototype.ObjectExpression = function (node) {
    this.walkEach(node.properties);
};

Walker.prototype.Program = function (node) {
    this.walkEach(node.body);
};

Walker.prototype.Property = function (node) {
    this.walk(node.key);
    this.walk(node.value);
};

Walker.prototype.ReturnStatement = function (node) {
    this.walk(node.argument);
};

Walker.prototype.SequenceExpression = function (node) {
    this.walkEach(node.expressions);
};

Walker.prototype.SwitchStatement = function (node) {
    this.walk(node.discriminant);
    this.walkEach(node.cases);
};

Walker.prototype.SwitchCase = function (node) {
    this.walk(node.test);
    this.walkEach(node.consequent);
};

Walker.prototype.ThisExpression = function (node) {

};

Walker.prototype.ThrowStatement = function (node) {
    this.walk(node.argument);
};

Walker.prototype.TryStatement = function (node) {
    this.walk(node.block);
    this.walk(node.handler);
    this.walkEach(node.guardedHandlers);
    this.walk(node.finalizer);
};

Walker.prototype.UnaryExpression = function (node) {
    this.walk(node.argument);
};

Walker.prototype.UpdateExpression = function (node) {
    this.walk(node.argument);
};

Walker.prototype.VariableDeclaration = function (node) {
    this.walkEach(node.declarations);
};

Walker.prototype.VariableDeclarator = function (node) {
    this.walk(node.id);
    this.walk(node.init);
};

Walker.prototype.WhileStatement = function (node) {
    this.walk(node.test);
    this.walk(node.body);
};

Walker.prototype.WithStatement = function (node) {
    this.walk(node.object);
    this.walk(node.body);
};

// TODO: bring browserify into the workflow
//    module.exports = {
//        walk: walk,
//        setCallback: setCallback
//    };

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

function Injector (context) {
    this.walker = new Walker();
    this.walker.exit = this.onExit.bind(this);
    this.context = context;
}

/**
 * Main entry point.  Injects yield expressions into ast
 * @param ast
 */
Injector.prototype.process = function (ast) {
    this.walker.walk(ast);
};

/**
 * Called as the walker has walked the node's children.  Inserting
 * yield nodes on exit avoids traversing new nodes which would cause
 * an infinite loop.
 * @param node
 */
Injector.prototype.onExit = function(node) {
    var len, i;

    if (node.type === "Program" || node.type === "BlockStatement") {
        len = node.body.length;

        this.insertYield(node, 0);
        for (i = 0; i < len - 1; i++) {
            this.insertYield(node, 2 * i + 2);
        }
//    } else if (node.type === "BlockStatement") {
//        len = node.body.length;
//        for (i = 0; i < len - 1; i++) {
//            this.insertYield(node, 2 * i + 1);
//        }
    } else if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
        node.generator = true;
    } else if (node.type === "ExpressionStatement") {
        if (node.expression.type === "CallExpression") {
            var name = node.expression.callee.name;
            if (name !== undefined && !this.context[name]) {  // yield only if it's a user defined function
                node.expression = builder.createYieldExpression(
                    builder.createObjectExpression({
                        generator: node.expression,
                        lineno: node.loc.start.line,
                        name: name  // so that we can display a callstack later
                    })
                );
            }
        }
    }
};

Injector.prototype.insertYield = function (program, index) {
    var loc = program.body[index].loc;
    var node = builder.createExpressionStatement(
        builder.createYieldExpression(
            builder.createObjectExpression({ lineno: loc.start.line })
        )
    );

    program.body.splice(index, 0, node);
};

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

/*global recast, esprima, escodegen, Injector */

function Stepper(context) {
    if (!this.willYield()) {
        throw "this browser is not supported";
    }
    this.context = context;
    this.injector = new Injector(this.context);
    this.lines = {};
    this.breakpoints = {};
}

Stepper.prototype.willYield = function () {
    try{
        return Function("\nvar generator = (function* () {\n  yield* (function* () {\n    yield 5; yield 6;\n  }());\n}());\n\nvar item = generator.next();\nvar passed = item.value === 5 && item.done === false;\nitem = generator.next();\npassed    &= item.value === 6 && item.done === false;\nitem = generator.next();\npassed    &= item.value === undefined && item.done === true;\nreturn passed;\n  ")()
    }catch(e){
        return false;
    }
};

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    this.reset();
};

Stepper.prototype.reset = function () {
    this.scopes = new Stack();

    this.scopes.push(
        ((new Function(this.debugCode))())(this.context)
    );

    this.done = false;
};

Stepper.prototype.run = function () {
    while (!this.halted()) {
        var result = this.stepIn();

        // result returns the lineno of the next line
        if (result.value && result.value.lineno) {
            if (this.breakpoints[result.value.lineno]) {
                console.log("breakpoint hit");
                return result;
            }
        }
    }
    console.log("run finished");
};

Stepper.prototype.runScope = function () {
    if (!this.scopes.isEmpty()) {
        while (true) {
            var result = this.scopes.peek().next();

            if (result.value && result.value.lineno) {
                if (this.breakpoints[result.value.lineno]) {
                    console.log("breakpoint hit");
                    return result;
                }
            }

            if (result.done) {
                break;
            } else if (result.value.generator) {
                this.scopes.push(result.value.generator);
                this.runScope();
                this.scopes.pop();
            }
        }
    }
};

Stepper.prototype.stepOver = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        var result = this.scopes.peek().next();

        if (result.done) {
            this.scopes.pop();
            if (this.scopes.isEmpty()) {
                console.log("halted");
                return { done: true };
            }
            result = this.scopes.peek().next();
        } else if (result.value.generator) {
            this.scopes.push(result.value.generator);
            this.runScope();
            this.scopes.pop();
            result = this.scopes.peek().next();
        }

        value = result.value;   // contains lineno
        this.done = false;
    } else {
        this.done = true;
    }
    return {
        done: this.done,
        value: value
    }
};

Stepper.prototype.stepIn = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        var result = this.scopes.peek().next();

        if (result.done) {
            this.scopes.pop();
            if (this.scopes.isEmpty()) {
                console.log("halted");
                return { done: true };
            }
            result = this.scopes.peek().next();
        } else if (result.value.generator) {
            this.scopes.push(result.value.generator);
            result = this.scopes.peek().next();
        }

        value = result.value;
        this.done = false;
    } else {
        this.done = true;
    }
    return {
        done: this.done,
        value: value
    }
};

Stepper.prototype.stepOut = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        this.runScope();
        this.scopes.pop();

        if (this.scopes.isEmpty()) {
            console.log("halted");
            return { done: true };
        }

        var result = this.scopes.peek().next();
        value = result.value;
        this.done = false;
    } else {
        this.done = true;
    }
    return {
        done: this.done,
        value: value
    }
};

Stepper.prototype.halted = function () {
    return this.done;
};

Stepper.prototype.paused = function () {

};

Stepper.prototype.setBreakpoint = function (lineno) {
    this.breakpoints[lineno] = true;
};

Stepper.prototype.clearBreakpoint = function (lineno) {
    delete this.breakpoints[lineno];
};


Stepper.prototype.generateDebugCode = function (code) {
    this.ast = esprima.parse(code, { loc: true });

    this.ast.body.forEach(function (statement) {
        var loc = statement.loc;
        if (loc !== null) {
            this.lines[loc.start.line] = statement;
        }
    }, this);

    this.injector.process(this.ast);

    return "return function*(){\nwith(arguments[0]){\n"
        + escodegen.generate(this.ast) + "\n}\n}";
};
