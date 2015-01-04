var LinkedList = require("basic-ds").LinkedList;
var Stack = require("basic-ds").Stack;
var b = require("ast-types").builders;
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");


var rewriteVariableDeclarations = function(bodyList, scopeStack, context) {
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
                var scopeName = getScopeName(scopeStack, context, decl.id.name);
                if (scopeName) {
                    var me = memberExpression(scopeName, decl.id.name);
                    var ae = b.assignmentExpression("=", me, decl.init);
                    var stmt = b.expressionStatement(ae);
                    stmt.loc = decl.loc;    // TODO: make "loc"ation faking more robust
                    replacements.push(stmt);
                }
            }
        });

        if (replacements.length > 0) {
            bodyList.replaceNodeWithValues(node, replacements);
        }
    });
    
};

// insert yield { line: <line_number> } in between each line
var insertYields = function(bodyList) {
    bodyList.forEachNode(listNode => {

        var astNode = listNode.value;
        var loc = astNode.loc;
        
        // astNodes without a valid loc are ones that have been inserted
        // and are the result of a yield expression replacing a debugger statement
        // TODO: find a better way to handle debugger statements
        if (loc === null) {
            return;
        }
 
        var yieldExpression = b.expressionStatement(
            b.yieldExpression(
                b.objectExpression([
                    b.property("init", b.identifier("line"), b.literal(loc.start.line))
                ])
            )
        );

        bodyList.insertBeforeNode(listNode, yieldExpression);
    });
};


function stringForId(node) {
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
}


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


var getScopeName = function(scopeStack, context, name) {
    var scopes = scopeStack.items;

    // TODO: store the scope names in the scope variables so they're easier to retrieve
    for (var i = scopes.length - 1; i > -1; i--) {
        var scope = scopes[i];
        if (scope.hasOwnProperty(name)) {
            return "$scope$" + i;
        }
    }
    if (context.hasOwnProperty(name)) {
        return "context";
    }
};


var callInstantiate = function(node) {
    var name = stringForId(node.callee);
    node.arguments.unshift(b.literal(name));    // constructor name
    node.arguments.unshift(node.callee);        // constructor
    return b.callExpression(
        memberExpression("context", "__instantiate__"), node.arguments
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


var addScopeDict = function(scopeStack, bodyList) {
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


var transform = function(code, context, options) {
    var nativeGenerators = !!options.nativeGenerators;

    var ast = esprima.parse(code, { loc: true });
    var scopeManager = escope.analyze(ast);
    scopeManager.attach();
    
    var scopeStack = new Stack();

    estraverse.replace(ast, {
        enter: (node, parent) => {
            if (node.__$escope$__) {
                var scope = {};
                var isRoot = scopeStack.size === 0;
                
                node.__$escope$__.variables.forEach(variable => {
                    // don't include variables from the context in the root scope
                    if (isRoot && context.hasOwnProperty(variable.name)) {
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
            
            node._parent = parent;
        },
        leave: (node, parent) => {
            var line, bodyList, properties, stmt;
            
            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;  // convert all user defined functions to generators
                if (node.type === "FunctionDeclaration") {
                    scopeName = "$scope$" + (scopeStack.size - 1);
                    stmt = b.expressionStatement(
                        b.assignmentExpression(
                            "=",
                            memberExpression(scopeName, node.id.name),
                            b.functionExpression(null, node.params, node.body, true, false)
                        )
                    );

                    stmt.loc = node.loc;
                    return stmt;
                }
            } else if (node.type === "Program" || node.type === "BlockStatement") {
                bodyList = LinkedList.fromArray(node.body);
                
                // rewrite variable declarations first
                rewriteVariableDeclarations(bodyList, scopeStack, context);
                
                // insert yield statements between each statement 
                insertYields(bodyList);

                if (bodyList.first === null) {
                    var yieldExpression = b.expressionStatement(
                        b.yieldExpression(
                            b.objectExpression([
                                b.property("init", b.identifier("line"), b.literal(node.loc.end.line))
                            ])
                        )
                    );

                    bodyList.push_back(yieldExpression);
                }

                var functionName = getFunctionName(node, parent);
                if (functionName) {
                    bodyList.first.value.expression.argument.properties.push(
                        b.property("init", b.identifier("name"), b.literal(functionName))
                    );

                    addScopeDict(scopeStack, bodyList);
                    scopeStack.pop();
                }

                node.body = bodyList.toArray();
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                var gen = node.type === "NewExpression" ? callInstantiate(node) : node;
                line = node.loc.start.line;
                
                properties = [
                    b.property("init", b.identifier("gen"), gen),
                    b.property("init", b.identifier("line"), b.literal(line))
                    // TODO: this is the current line, but we should actually be passing next node's line
                    // TODO: handle this in when the ForStatement is parsed where we have more information
                ];

                // We add an extra property to differentiate function calls
                // that are followed by a statment from those that aren't.
                // The former requires taking an extra _step() to get the
                // next line.
                if (parent._parent.type === "ExpressionStatement" || parent.type === "ExpressionStatement") {
                    properties.push(b.property("init", b.identifier("stepAgain"), b.literal(true)));
                }

                if (parent.type === "VariableDeclarator" && parent._parent.type === "VariableDeclaration" && parent._parent._parent.type !== "ForStatement") {
                    properties.push(b.property("init", b.identifier("stepAgain"), b.literal(true)));
                }

                return b.yieldExpression(b.objectExpression(properties));
            } else if (node.type === "DebuggerStatement") {
                line = node.loc.start.line;
                return b.expressionStatement(
                    b.yieldExpression(
                        b.objectExpression([
                            b.property("init", b.identifier("line"), b.literal(line)),
                            b.property("init", b.identifier("breakpoint"), b.literal(true))
                        ])
                    )
                );
            } else if (node.type === "Identifier" && parent.type !== "FunctionExpression" && parent.type !== "FunctionDeclaration") {
                if (isReference(node, parent)) {
                    var scopeName = getScopeName(scopeStack, context, node.name);
                    if (scopeName) {
                        return memberExpression(scopeName, node.name);
                    }
                }
            } else if (node.type === "VariableDeclaration" && parent.type === "ForStatement") {
                var replacements = [];
                node.declarations.forEach(decl => {
                    if (decl.init !== null) {
                        var scopeName = getScopeName(scopeStack, context, decl.id.name);
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
        }
    });

    var debugCode;

    // TODO: obfuscate "context" more
    if (nativeGenerators) {
        debugCode = "return function*(context){\n" + escodegen.generate(ast) + "\n}";
 
        return new Function(debugCode);
    } else {
        // regenerator likes functions so wrap the code in a function
        var entry = b.functionDeclaration(
            b.identifier("entry"), 
            [b.identifier("context")], 
            b.blockStatement(ast.body), 
            true,   // generator 
            false   // expression
        );

        regenerator.transform(entry);
        debugCode = escodegen.generate(entry);

        return new Function(debugCode + "\n" + "return entry;");
    }
};

module.exports = transform;
