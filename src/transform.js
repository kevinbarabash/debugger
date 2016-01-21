var LinkedList = require("basic-ds").LinkedList;
var Stack = require("basic-ds").Stack;
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");


var expressionStatement = function(expression) {
    return {
        type: "ExpressionStatement",
        expression: expression
    };
};

var yieldExpression = function(expression) {
    return {
        type: "YieldExpression",
        argument: expression
    };
};

var assignmentExpression = function(operator, left, right) {
    return {
        type: "AssignmentExpression",
        operator: operator,
        left: left,
        right: right
    };
};

var assignmentStatement = function(left, right, loc) {
    var stmt = expressionStatement(
        assignmentExpression("=", left, right)
    );
    stmt.loc = loc;
    return stmt;
};

var functionDeclaration = function(id, params, body, generator) {
    return {
        type: "FunctionDeclaration",
        id: id,
        params: params,
        body: body,
        generator: generator
    }
};

var functionExpression = function(params, body, generator) {
    return {
        type: "FunctionExpression",
        params: params,
        body: body,
        generator: generator
    }
};

var blockStatement = function(body) {
    return {
        type: "BlockStatement",
        body: body
    };
};

var sequenceExpression = function(expressions) {
    return {
        type: "SequenceExpression",
        expressions: expressions
    };
};

var rewriteVariableDeclarations = function(bodyList) {
    var nodes = [];
    bodyList.forEachNode(listNode => {
        if (listNode.value.type === "VariableDeclaration") {
            nodes.push(listNode);
        }
    });

    nodes.forEach(node => {
        var replacements = [];

        node.value.declarations.forEach(decl => {
            if (decl.init !== null) {
                var name = decl.id.name;
                var scopeName = scopeNameForName(name);
                if (scopeName) {
                    replacements.push(assignmentStatement(
                        memberExpression(identifier(scopeName), identifier(name)), decl.init, decl.loc
                    ));
                }
            }
        });

        if (replacements.length > 0) {
            bodyList.replaceNodeWithValues(node, replacements);
        }
    });
};

var isBreakpoint = function(node) {
    if (node.type === "ExpressionStatement") {
        var expr = node.expression;
        if (expr.type === "YieldExpression") {
            var arg = expr.argument;
            if (arg.type === "ObjectExpression") {
                return arg.properties.some(prop => {
                    return prop.key.name === "breakpoint";
                });
            }
        }
    }
    return false;
};

var makeLocNode = function(loc) {
    // TODO: create a function to handle creating nested object expressions
    // differentiate from objectExpression which assumes that properties
    // that are objects are already AST nodes
    var start = objectExpression([
        property(identifier("line"), literal(loc.start.line)),
        property(identifier("column"), literal(loc.start.column))
    ]);
    var end = objectExpression([
        property(identifier("line"), literal(loc.end.line)),
        property(identifier("column"), literal(loc.end.column))
    ]);

    return objectExpression([
        property(identifier("start"), start),
        property(identifier("end"), end)
    ]);
};

var insertYields = function(bodyList) {
    bodyList.forEachNode(listNode => {
        var astNode = listNode.value;
        if (isBreakpoint(astNode)) {
            return;
        }

        var loc = astNode.loc;
        bodyList.insertBeforeNode(listNode, yieldObject({ loc: makeLocNode(loc) }, loc));
    });
};

var stringForId = function(node) {
    var name = "";
    if (node.type === "Identifier") {
        if (node.name.indexOf("$scope$") === -1) {
            name = node.name;
        }
    } else if (node.type === "MemberExpression") {
        var part = stringForId(node.object);
        if (part.length > 0) {
            name = stringForId(node.object) + "." + node.property.name;
        } else {
            name = node.property.name;
        }
    } else if (node.type === "ThisExpression") {
        name = "this";
    } else if (node.type === "CallExpression") {
        if (node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === "__getPrototype__") {
            return stringForId(node.arguments[0]) + ".prototype";
        } else {
            return stringForId(node.callee) + "()";
        }
    } else {
        throw "can't call stringForId on nodes of type '${node.type}'";
    }
    return name;
};

var getNameForFunctionExpression = function(node, path) {
    var name = "";
    var parent = path[path.length - 1];
    var grandparent = path[path.length - 2];

    if (parent.type === "Property") {
        name = parent.key.name;
        if (grandparent.type === "ObjectExpression") {
            name = getNameForFunctionExpression(grandparent, path.slice(0, path.length - 2)) + "." + name;
        }
    } else if (parent.type === "AssignmentExpression") {
        name = stringForId(parent.left);
    } else if (parent.type === "VariableDeclarator") {
        name = stringForId(parent.id);
    } else {
        name = "<anonymous>"; // TODO: test anonymous callbacks
    }
    return name;
};

var isReference = function(node, parent) {
    // we're a property key so we aren't referenced
    if (parent.type === "Property" && parent.key === node) return false;

    if (parent.type === "CatchClause" && parent.param === node) return false;

    // we're a variable declarator id so we aren't referenced
    if (parent.type === "VariableDeclarator" && parent.id === node) return false;

    var isMemberExpression = parent.type === "MemberExpression";

    // we're in a member expression and we're the computed property so we're referenced
    var isComputedProperty = isMemberExpression && parent.property === node && parent.computed;

    // we're in a member expression and we're the object so we're referenced
    var isObject = isMemberExpression && parent.object === node;

    // we are referenced
    return !isMemberExpression || isComputedProperty || isObject;
};

var assignmentForDeclarator = function(scopeName, decl) {
    var ae = assignmentExpression(
        "=", memberExpression(identifier(scopeName), identifier(decl.id.name)), decl.init);
    ae.loc = decl.loc;
    return ae;
};

var contextHasProperty = function(key) {
    return context[key] !== undefined || context.hasOwnProperty(key);
};

var scopeNameForName = function(name) {
    var scopes = scopeStack.items;

    for (let i = scopes.length - 1; i > -1; i--) {
        var scope = scopes[i];
        if (scope.hasOwnProperty(name)) {
            return "$scope$" + i;
        }
    }
    if (contextHasProperty(name)) {
        return contextName;
    }
};

var callExpression = function(callee, args) {
    return {
        type: "CallExpression",
        callee: callee,
        arguments: args
    };
};

var callInstantiate = function(node) {
    var name = stringForId(node.callee);
    node.arguments.unshift(literal(name));    // constructor name
    node.arguments.unshift(node.callee);        // constructor
    return callExpression(
        memberExpression(identifier(contextName), identifier("__instantiate__")),
        node.arguments
    );
};

var variableDeclaration = function(declarations, kind = "var") {
    return {
        type: "VariableDeclaration",
        declarations: declarations,
        kind: kind
    };
};

var variableDeclarator = function(id, init = null) {
    return {
        type: "VariableDeclarator",
        id: id,
        init: init
    };
};

var declareVariable = function(name, value) {
    return variableDeclaration(
        [variableDeclarator(
            identifier(name),
            value
        )]
    );
};

var memberExpression = function(object, property, computed = false) {
    return {
        type: "MemberExpression",
        object: object,
        property: property,
        computed: computed
    };
};

var identifier = function(name) {
    return {
        type: "Identifier",
        name: name
    };
};

var literal = function(value) {
    return {
        type: "Literal",
        value: value
    };
};

var property = function(key, value, kind = "init") {
    return {
        type: "Property",
        key: key,
        value: value,
        kind: kind
    };
};

var objectExpression = function(properties) {
    return {
        type: "ObjectExpression",
        properties: properties
    }
};

var shallowObjectExpression = function(obj) {
    return objectExpression(Object.keys(obj).map(key => {
        var val = typeof obj[key] === "object" ? obj[key] : literal(obj[key]);
        return property(identifier(key), val);
    }));
};

var yieldObject = function(obj, loc) {
    var stmt = expressionStatement(yieldExpression(shallowObjectExpression(obj)));
    if (loc) {
        stmt.loc = loc;
    }
    return stmt;
};

var wrapExpression = function(expr, nextExpr) {
    var obj = {
        value: expr
    };
    if (nextExpr) {
        obj.loc = makeLocNode(nextExpr.loc);
    } else {
        obj.stepAgain = true;
    }
    return yieldExpression(shallowObjectExpression(obj));
};


var wrapSequenceExpressions = function(seqNode, nextExpr) {
    var replacements = [];
    var expressions = seqNode.expressions;
    for (var i = 0; i < expressions.length - 1; i++) {
        replacements.push(wrapExpression(expressions[i], expressions[i+1]));
    }
    replacements.push(expressions[i], nextExpr);
    return replacements;
};


var addScopeDict = function(bodyList) {
    var scopeName = "$scope$" + (scopeStack.size - 1);
    var scope = scopeStack.peek();

    bodyList.first.value.expression.argument.properties.push(
        property(identifier("scope"), identifier(scopeName))
    );

    var scopeDict = objectExpression(Object.keys(scope).map(name => {
        var value = scope[name].type === "Parameter" ? name : "undefined";
        return property(identifier(name), identifier(value));
    }));

    bodyList.push_front(declareVariable(scopeName, scopeDict));
};


var getFunctionName = function(node, path) {
    var parent = path[path.length - 1];

    if (node.type === "Program") {
        return "<PROGRAM>";
    } else if (parent.type === "FunctionDeclaration") {
        return stringForId(parent.id);
    } else if (parent.type === "FunctionExpression") {
        return getNameForFunctionExpression(parent, path.slice(0, path.length - 1));
    }
};


var compile = function(ast, options) {
    var debugCode, generator;

    if (options.nativeGenerators) {
        debugCode = `return function*(${contextName}) {
            ${escodegen.generate(ast)}
        }`;

        generator = new Function(debugCode);
    } else {
        var entry = {
            type: "Program",
            body: [functionDeclaration(
                identifier("entry"),
                [identifier(contextName)],
                blockStatement(ast.body),
                true
            )]
        };

        debugCode = escodegen.generate(regenerator.transform(entry));

        generator = new Function(debugCode + "\n" + "return entry;");
    }

    if (options.debug) {
        console.log(debugCode);
    }

    return generator;
};


var context;
var contextName;
var scopeStack;
var path;

var transform = function(code, _context, options) {
    let ast = esprima.parse(code, { loc: true });
    let scopeManager = escope.analyze(ast);
    scopeManager.attach();

    scopeStack = new Stack();
    context = _context;
    contextName = "context" + Date.now();
    path = [];

    estraverse.replace(ast, {
        enter: (node, parent) => {
            if (node.__$escope$__) {
                let scope = {};
                let isRoot = scopeStack.size === 0;

                node.__$escope$__.variables.forEach(variable => {
                    // don't include variables from the context in the root scope
                    if (isRoot && contextHasProperty(variable.name)) {
                        return;
                    }

                    if (variable.defs.length > 0) {
                        if (variable.defs.every(def => def.type !== "CatchClause")) {
                            scope[variable.name] = {
                                type: variable.defs[0].type
                            };
                        }
                    }
                });

                scopeStack.push(scope);
            }

            if (node.type === "Program" || node.type === "BlockStatement") {
                node.body.forEach((stmt, index) => stmt._index = index);
            }

            path.push(node);
        },
        leave: (node, parent) => {
            path.pop();

            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                // convert all user defined functions to generators
                node.generator = true;

                if (node.type === "FunctionDeclaration") {
                    let scopeName = "$scope$" + (scopeStack.size - 1);
                    return assignmentStatement(
                        memberExpression(identifier(scopeName), identifier(node.id.name)),
                        functionExpression(node.params, node.body, true),
                        node.loc
                    );
                }
            } else if (node.type === "Program" || node.type === "BlockStatement") {
                let bodyList = LinkedList.fromArray(node.body);

                // rewrite variable declarations first
                rewriteVariableDeclarations(bodyList);

                // insert yield statements between each statement
                insertYields(bodyList);

                if (bodyList.first === null) {
                    bodyList.push_back(yieldObject({loc: makeLocNode(node.loc)}, node.loc));
                }

                let functionName = getFunctionName(node, path);
                if (functionName) {
                    // modify the first yield statement so that the object
                    // returned contains the function's name
                    bodyList.first.value.expression.argument.properties.push(
                        property(identifier("name"), literal(functionName))
                    );

                    addScopeDict(bodyList);

                    bodyList.push_front(assignmentStatement(identifier("that"), {
                        type: "ThisExpression"
                    }));

                    scopeStack.pop();
                }

                node.body = bodyList.toArray();
            } else if (node.type === "CatchClause") {
                scopeStack.pop();
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                let properties = [
                    property(identifier("value"), node.type === "NewExpression" ? callInstantiate(node) : node),
                    property(identifier("stepAgain"), literal(true))
                ];

                let expr = yieldExpression(objectExpression(properties));
                expr.loc = node.loc;
                return expr;
            } else if (node.type === "DebuggerStatement") {
                return yieldObject({
                    loc: makeLocNode(node.loc),
                    breakpoint: true
                }, node.loc);
            } else if (node.type === "Identifier" && parent.type !== "FunctionExpression" && parent.type !== "FunctionDeclaration") {
                if (isReference(node, parent)) {
                    let scopeName = scopeNameForName(node.name);
                    if (scopeName) {
                        return memberExpression(identifier(scopeName), identifier(node.name));
                    }
                }

            } else if (node.type === "ForStatement") {
                // TODO: if the body of a ForStatement isn't a BlockStatement, convert it to one
                // TODO: write tests with programs that don't use a BlockStatement with a for loop

                // loop back to the update
                // do this first because we replace node.update and it loses its location info
                node.body.body.push(yieldObject({ loc: makeLocNode(node.update.loc) }));

                // TODO: come up with a set of tests that check all of these cases
                if (node.init.type === "SequenceExpression") {
                    node.init.epxressions = wrapSequenceExpressions(node.init, node.test);
                } else {
                    node.init = wrapExpression(node.init, node.test);
                }

                if (node.update.type === "SequenceExpression") {
                    node.update.expressions = wrapSequenceExpressions(node.update, node.test);
                } else {
                    node.update = wrapExpression(node.update, node.test);
                }

                if (node.test !== null) {
                    node.test = wrapExpression(node.test);
                }
            } else if (node.type === "WhileStatement" || node.type === "DoWhileStatement") {
                node.body.body.push(yieldObject({ loc: makeLocNode(node.test.loc) }));
                if (node.test !== null) {
                    node.test = wrapExpression(node.test);
                }
            } else if (node.type === "VariableDeclaration" && parent.type === "ForStatement") {
                let replacements = [];
                node.declarations.forEach(decl => {
                    if (decl.init !== null) {
                        var scopeName = scopeNameForName(decl.id.name);
                        if (scopeName) {
                            replacements.push(assignmentForDeclarator(scopeName, decl));
                        }
                    }
                });

                if (replacements.length === 1) {
                    return replacements[0];
                } else if (replacements.length > 1) {
                    return sequenceExpression(replacements);
                } else {
                    return null;
                }
            } else if (node.type === "MemberExpression" && node.object.type === "MemberExpression" && node.property.name === "prototype") { 
                return callExpression( 
                     memberExpression(identifier(contextName), identifier("__getPrototype__")), 
                     [node.object] 
                ); 
            } else if (node.type === "AssignmentExpression" && node.left.type === "CallExpression") {
                return callExpression(
                    memberExpression(identifier(contextName), identifier("__assignPrototype__")),
                    [
                        node.left.arguments[0],
                        node.right.argument.properties[0].value // access the yield statement to grab the right hand side
                    ]
                );
            }

            // clean up
            delete node._index;
        }
    });

    return compile(ast, options);
};

module.exports = transform;
