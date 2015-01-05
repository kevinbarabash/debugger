var LinkedList = require("basic-ds").LinkedList;
var Stack = require("basic-ds").Stack;
var b = require("ast-types").builders;
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");


var assignmentStatement = function(left, right, loc) {
    var stmt = b.expressionStatement(
        b.assignmentExpression("=", left, right)
    );
    stmt.loc = loc;
    return stmt;
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
                        memberExpression(scopeName, name), decl.init, decl.loc
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


var insertYields = function(bodyList) {
    bodyList.forEachNode(listNode => {
        var astNode = listNode.value;
        if (isBreakpoint(astNode)) {
            return;
        }

        var loc = astNode.loc;
        var line = loc.start.line;
        bodyList.insertBeforeNode(listNode, yieldObject({ line: line }, loc));
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
    } else {
        throw "can't call stringForId on nodes of type '" + node.type + "'";
    }
    return name;
};


var getNameForFunctionExpression = function(node) {
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
};


var isReference = function(node, parent) {
    // we're a property key so we aren't referenced
    if (parent.type === "Property" && parent.key === node) return false;

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
    var ae = b.assignmentExpression(
        "=", memberExpression(scopeName, decl.id.name), decl.init);
    ae.loc = decl.loc;
    return ae;
};


var contextHasProperty = function(key) {
    return context[key] !== undefined || context.hasOwnProperty(key);
};


var scopeNameForName = function(name) {
    var scopes = scopeStack.items;

    for (var i = scopes.length - 1; i > -1; i--) {
        var scope = scopes[i];
        if (scope.hasOwnProperty(name)) {
            return "$scope$" + i;
        }
    }
    if (contextHasProperty(name)) {
        return contextName;
    }
};


var callInstantiate = function(node) {
    var name = stringForId(node.callee);
    node.arguments.unshift(b.literal(name));    // constructor name
    node.arguments.unshift(node.callee);        // constructor
    return b.callExpression(
        memberExpression(contextName, "__instantiate__"), node.arguments
    );
};


var declareVariable = function(name, value) {
    return b.variableDeclaration(
        "var",
        [b.variableDeclarator(
            b.identifier(name),
            value
        )]
    );
};


var memberExpression = function(objName, propName) {
    return b.memberExpression(
        b.identifier(objName),
        b.identifier(propName),
        false
    );
};


var objectExpression = function(obj) {
    return b.objectExpression(Object.keys(obj).map(key => {
        var val = obj[key];
        if (typeof val === "object") {
            return b.property("init", b.identifier(key), val);
        } else {
            return b.property("init", b.identifier(key), b.literal(obj[key]));
        }
    }));
};


var yieldObject = function(obj, loc) {
    var stmt = b.expressionStatement(b.yieldExpression(objectExpression(obj)));
    if (loc) {
        stmt.loc = loc;
    }
    return stmt;
};


var addScopeDict = function(bodyList) {
    var scopeName = "$scope$" + (scopeStack.size - 1);
    var scope = scopeStack.peek();

    bodyList.first.value.expression.argument.properties.push(
        b.property("init", b.identifier("scope"), b.identifier(scopeName))
    );

    var scopeDict = b.objectExpression(Object.keys(scope).map(name => {
        var type = scope[name].type;
        var value = type === "Parameter" ? name : "undefined";
        return b.property("init", b.identifier(name), b.identifier(value));
    }));

    bodyList.push_front(declareVariable(scopeName, scopeDict));
};


var getFunctionName = function(node, parent) {
    if (parent.type === "FunctionDeclaration") {
        return stringForId(parent.id);
    } else if (parent.type === "FunctionExpression") {
        return getNameForFunctionExpression(parent);
    } else if (node.type === "Program") {
        return "<PROGRAM>";
    }
};


var compile = function(ast, options) {
    var debugCode, generator;
    
    if (options.nativeGenerators) {
        debugCode = "return function*(" + contextName + "){\n" + escodegen.generate(ast) + "\n}";

        generator = new Function(debugCode);
    } else {
        // regenerator likes functions so wrap the code in a function
        var entry = b.functionDeclaration(
            b.identifier("entry"),
            [b.identifier(contextName)],
            b.blockStatement(ast.body),
            true,   // generator 
            false   // expression
        );

        regenerator.transform(entry);
        debugCode = escodegen.generate(entry);

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


var transform = function(code, _context, options) {
    var ast, scopeManager;
    
    ast = esprima.parse(code, { loc: true });
    scopeManager = escope.analyze(ast);
    scopeManager.attach();
    
    scopeStack = new Stack();
    context = _context;
    contextName = "context" + Date.now();

    estraverse.replace(ast, {
        enter: (node, parent) => {
            if (node.__$escope$__) {
                var scope = {};
                var isRoot = scopeStack.size === 0;
                
                node.__$escope$__.variables.forEach(variable => {
                    // don't include variables from the context in the root scope
                    if (isRoot && contextHasProperty(variable.name)) {
                        return;
                    }

                    if (variable.defs.length > 0) {
                        scope[variable.name] = {
                            type: variable.defs[0].type
                        };
                    }
                });

                scopeStack.push(scope);
            }
            
            if (node.type === "Program" || node.type === "BlockStatement") {
                node.body.forEach((stmt, index) => stmt._index = index);
            }
            
            node._parent = parent;
        },
        leave: (node, parent) => {
            var obj, replacements;
            
            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                // convert all user defined functions to generators
                node.generator = true;
                
                if (node.type === "FunctionDeclaration") {
                    scopeName = "$scope$" + (scopeStack.size - 1);
                    return assignmentStatement(
                        memberExpression(scopeName, node.id.name),
                        b.functionExpression(null, node.params, node.body, true, false),
                        node.loc
                    );
                }
            } else if (node.type === "Program" || node.type === "BlockStatement") {
                var bodyList = LinkedList.fromArray(node.body);
                
                // rewrite variable declarations first
                rewriteVariableDeclarations(bodyList);
                
                // insert yield statements between each statement 
                insertYields(bodyList);

                if (bodyList.first === null) {
                    bodyList.push_back(yieldObject({ line: node.loc.end.line }, node.loc));
                }

                var functionName = getFunctionName(node, parent);
                if (functionName) {
                    // modify the first yield statement so that the object
                    // returned contains the function's name
                    bodyList.first.value.expression.argument.properties.push(
                        b.property("init", b.identifier("name"), b.literal(functionName))
                    );

                    addScopeDict(bodyList);
                    scopeStack.pop();
                }

                node.body = bodyList.toArray();
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                obj = {
                    gen: node.type === "NewExpression" ? callInstantiate(node) : node,
                    line: node.loc.start.line
                };

                // TODO: obj.line is the current line, but we should actually be passing next node's line
                // TODO: handle this in when the ForStatement is parsed where we have more information

                // We add an extra property to differentiate function calls
                // that are followed by a statment from those that aren't.
                // The former requires taking an extra _step() to get the
                // next line.
                if (parent._parent.type === "ExpressionStatement" || parent.type === "ExpressionStatement") {
                    obj.stepAgain = true;
                }

                // TODO: should also check to make sure that it's not part another kind of loop
                // this function call is part of a variable declaration but not part of a "ForStatement"
                if (parent.type === "VariableDeclarator" && parent._parent._parent.type !== "ForStatement") {
                    obj.stepAgain = true;
                } else if (parent._parent._parent.type === "ForStatement") {
                    obj.stepAgain = false;
                }

                var expr = b.yieldExpression(objectExpression(obj));
                expr.loc = node.loc;
                return expr;
            } else if (node.type === "DebuggerStatement") {
                return yieldObject({
                    line: node.loc.start.line,
                    breakpoint: true
                }, node.loc);
            } else if (node.type === "Identifier" && parent.type !== "FunctionExpression" && parent.type !== "FunctionDeclaration") {
                if (isReference(node, parent)) {
                    var scopeName = scopeNameForName(node.name);
                    if (scopeName) {
                        return memberExpression(scopeName, node.name);
                    }
                }

            } else if (node.type === "ForStatement") {
                var i;
                
                // TODO: if the body of a ForStatement isn't a BlockStatement, convert it to one
                // TODO: write tests with programs that don't use a BlockStatement with a for loop
                
                node.body.body.shift(); // remove the first yield... this will be covered by the test node

                // loop back to the update
                // do this first because we replace node.update and it loses its location info
                // TODO: maintain location informtion
                var lastChild = node.body.body[node.body.body.length - 1];
                if (lastChild.type === "ExpressionStatement" && lastChild.expression.type === "YieldExpression") {
                    lastChild.expression.argument.properties.forEach(prop => {
                        if (prop.key.name === "line") {
                            prop.value = b.literal(node.update.loc.start.line);
                        }
                    });
                } else {
                    node.body.body.push(yieldObject({ line: node.update.loc.start.line }));
                }

                // TODO: come up with a set of tests that check all of these cases
                if (node.init.type === "SequenceExpression") {
                    replacements = [];
                    for (i = 0; i < node.init.expressions.length - 1; i++) {
                        obj = {
                            value: node.init.expressions[i],
                            line: node.init.expressions[i + 1].loc.start.line
                        };
                        replacements.push(objectExpression(obj));
                    }
                    obj = {
                        value: node.init.expressions[i],
                        line: node.test.loc.start.line  // TODO: check if test is null and set line to be after body
                    };
                    replacements.push(objectExpression(obj));
                    node.init.expressions = replacements;
                } else {
                    obj = {
                        value: node.init,
                        line: node.test.loc.start.line
                    };
                    
                    // TODO: this is brittle, need to a better way to make sure only those calls that need it get to stepAgain
                    if (obj.value.type === "AssignmentExpression" && obj.value.right.type === "YieldExpression") {
                        obj.value.right.argument.properties.forEach(prop => {
                            if (prop.key.name === "stepAgain") {
                                prop.value = b.literal(true);
                            }
                        });
                    }
                    node.init = b.yieldExpression(objectExpression(obj));
                }

                if (node.update.type === "SequenceExpression") {
                    replacements = [];
                    for (i = 0; i < node.update.expressions.length - 1; i++) {
                        obj = {
                            value: node.update.expressions[i],
                            line: node.update.expressions[i + 1].loc.start.line
                        };
                        replacements.push(objectExpression(obj));
                    }
                    obj = {
                        value: node.update.expressions[i],
                        line: node.test.loc.start.line  // TODO: check if test is null and set line to be after body
                    };
                    replacements.push(objectExpression(obj));
                    node.update.expressions = replacements;
                } else {
                    obj = {
                        value: node.update,
                        line: node.test.loc.start.line
                    };
                    
                    // TODO: this is brittle, need to a better way to make sure only those calls that need it get to stepAgain
                    if (obj.value.type === "AssignmentExpression" && obj.value.right.type === "YieldExpression") {
                        obj.value.right.argument.properties.push(b.property("init", b.identifier("stepAgain"), b.literal(true)));
                    }
                    node.update = b.yieldExpression(objectExpression(obj));
                }

                // process the test node last because both init and update 
                // jump to test so they need to know its location
                if (node.test !== null) {
                    var trueLine, falseLine;
                    
                    var body = node.body;
                    if (body.type === "BlockStatement") {
                        trueLine = body.body[0].loc.start.line;
                    } else {
                        trueLine = body.loc.start.line;
                    }
                    
                    // TODO: handle cases where there isn't a statement that follows
                    // we could add a yield statement with the line set to be the 
                    // end of the block statement
                    if (node._index + 1 < node._parent.body.length) {
                        falseLine = node._parent.body[node._index + 1].loc.start.line;
                    } else {
                        falseLine = 0;
                        console.error("we don't handle loops that aren't followed by a statement yet");
                    }
                    
                    obj = {
                        type: "branch",
                        value: node.test,
                        trueLine: trueLine,
                        falseLine: falseLine
                    };
                    
                    if (obj.value.type === "YieldExpression") {
                        obj.value.argument.properties.push(b.property("init", b.identifier("stepAgain"), b.literal(true)));
                    }

                    node.test = b.yieldExpression(objectExpression(obj));
                }

            } else if (node.type === "VariableDeclaration" && parent.type === "ForStatement") {
                replacements = [];
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
                    return b.sequenceExpression(replacements);
                } else {
                    return null;
                }
            }

            // clean up
            delete node._parent;
            delete node._index;
        }
    });
 
    return compile(ast, options);
};

module.exports = transform;
