var LinkedList = require("basic-ds").LinkedList;
var Stack = require("basic-ds").Stack;
var b = require("ast-types").builders;
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");

// TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
// TODO: rewrite without using with, instead rewrite local vars as scope$1.varName

function getScopeVariables (node, parent, context) {
    var locals = parent.__$escope$__.variables.filter(variable => {

        // don't include context variables in the scopes
        if (node.type === "Program" && context.hasOwnProperty(variable.name)) {
            return false;
        }
        
        // function declarations like "function Point() {}"
        // don't work properly when defining methods on the
        // prototoype so filter those out as well
        var isFunctionDeclaration = variable.defs.some(def =>
            def.type === "FunctionName" && def.node.type === "FunctionDeclaration");
        
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
    
    var closure = parent.__$escope$__.through
        .filter(ref => ref.identifier.name !== undefined)
        .map(ref => {
            return ref.identifier.name;
        });
    
    return {
        locals: locals,
        closure: closure
    };
}

// insert yield { line: <line_number> } in between each line
function insertYields (bodyList) {
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
}


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

/**
 * Used by the ES5 transformer to inject a "with(context) { }" statement
 * around the body of a function declaration that has been passed through
 * the regenerator.
 * 
 * @param {esprima.Syntax.FunctionDeclaration} generatorFunction
 */
function injectWithContext(generatorFunction) {
    var body = generatorFunction.body.body;
    var success = false;
    for (var i = 0; i < body.length; i++) {
        var stmt = body[i];
        if (stmt.type === "ReturnStatement" && stmt.argument.type === "CallExpression") {
            var callee = stmt.argument.callee;
            if (callee.object.name === "regeneratorRuntime" && callee.property.name === "wrap") {
                var blockStmt = stmt.argument.arguments[0].body;
                
                var withStmt = b.withStatement(
                    b.identifier("context"),
                    b.blockStatement(blockStmt.body)
                );

                blockStmt.body = [withStmt];
                success = true;
            }
        }
    }
    if (!success) {
        throw "unable to inject 'with' statement";
    }
}

/**
 * Add scope statements for generator functions created with 
 * regenerator
 * 
 * @param entry
 * @param context
 */
function addScopes(entry, context) {
    estraverse.traverse(entry, {
        enter: (node, parent) => {
            node._parent = parent;
        },
        leave: (node, parent) => {
            if (node.type === "ReturnStatement" && node.argument.type === "CallExpression") {
                var callee = node.argument.callee;
                if (callee.object.name === "regeneratorRuntime" && callee.property.name === "wrap") {

                    var properties = parent._parent.params.map(param => 
                        b.property("init", b.identifier(param.name), b.identifier(param.name))
                    );

                    if (parent.body[0].declarations) {
                        parent.body[0].declarations.forEach(decl =>
                            properties.push(b.property(
                                "init",
                                b.identifier(decl.id.name),
                                b.identifier("undefined")
                            ))
                        );
                    }

                    // filter out variables defined in the context from the local vars
                    // but only for the root scope
                    // filter out "context" to so it doesn't appear in the scope
                    // TODO: give "context" a random name so that users don't mess with it
                    var firstArg = node.argument.arguments[0];
                    if (firstArg.id.name === "entry$") {
                        properties = properties.filter(prop =>
                            !context.hasOwnProperty(prop.key.name) && prop.key.name !== "context");
                    }

                    parent.body.unshift(
                        b.variableDeclaration(
                            "var",
                            [b.variableDeclarator(
                                b.identifier("__scope__"), 
                                b.objectExpression(properties)
                            )]
                        )
                    );

                    var blockStmt = firstArg.body;
                    var withStmt = b.withStatement(
                        b.identifier("__scope__"),
                        b.blockStatement(blockStmt.body)
                    );
                    blockStmt.body = [withStmt];
                }
            }
            delete node._parent;
        }
    });
}

var id = 0;
var genId = function() {
    id++;
};

function create__scope__(node, bodyList, scope) {
    var properties = scope.locals.map(local => {
        var isParam = local.defs.some(def => def.type === "Parameter");
        var name = local.name;

        // if the variable is a parameter initialize its
        // value with the value of the parameter
        var value = isParam ? b.identifier(name) : b.identifier("undefined");
        return b.property("init", b.identifier(name), value);
    });

    var id = genId();
    
    // modify the first yield statement to include the scope
    // as part of the value
    var firstStatement = bodyList.first.value;
    firstStatement.expression.argument.properties.push(
        b.property("init", b.identifier("scope"), b.identifier("__scope__" + id))
    );
    
    // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
    node.body = [
        b.variableDeclaration(
            "var",
            [b.variableDeclarator(
                b.identifier("__scope__" + id), 
                b.objectExpression(properties)
            )]
        ),
        b.withStatement(
            b.identifier("__scope__" + id),
            b.blockStatement(bodyList.toArray())
        )
    ];
}

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


function transform(code, context, options) {
    id = 0; // reset the id so we don't run out
    var nativeGenerators = !!options.nativeGenerators;

    var ast = esprima.parse(code, { loc: true });
    var scopeManager = escope.analyze(ast);
    scopeManager.attach();
    
    var scopeStack = new Stack();

    estraverse.replace(ast, {
        enter: (node, parent) => {
            if (node.__$escope$__) {
                console.log(node.type + " has __$escope$__");

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
                var names = node.__$escope$__.variables.map(variable => variable.name);
                console.log(names);
            }
            
            node._parent = parent;
        },
        leave: (node, parent) => {
            var loc, literal, scope, bodyList, properties, scopes, i, stmt;
            
            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                
                // convert all user defined functions to generators
                node.generator = true;

                if (node.type === "FunctionDeclaration") {

                    stmt = b.expressionStatement(
                        b.assignmentExpression(
                            "=",
                            b.memberExpression(
                                b.identifier("$scope$" + (scopeStack.size - 1)),
                                node.id,
                                false   // computed
                            ),
                            b.functionExpression(
                                null,
                                node.params,
                                node.body,
                                true,   // generator 
                                false   // expression
                            )
                        )
                    );

                    stmt.loc = node.loc;
                    return stmt;
                }
                
            } else if (node.type === "Program" || node.type === "BlockStatement") {

                bodyList = LinkedList.fromArray(node.body);
                insertYields(bodyList);

                if (bodyList.first) {
                    if (parent.type === "FunctionDeclaration") {
                        literal = stringForId(parent.id);
                    } else if (parent.type === "FunctionExpression") {
                        literal = getNameForFunctionExpression(parent);
                    } else if (node.type === "Program") {
                        literal = "<PROGRAM>";
                    }

                    if (literal !== undefined) {
                        bodyList.first.value.expression.argument.properties.push(
                            b.property("init", b.identifier("name"), b.literal(literal))
                        );
                    }   
                }

                if (nativeGenerators) {
                    if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                        scope = getScopeVariables(node, parent, context);
                    }

                    if (node.__$escope$__ || parent.__$escope$__) {
                        scope = scopeStack.pop();

                        // guard against empty functions
                        if (bodyList.first) {
                            bodyList.first.value.expression.argument.properties.push(
                                b.property("init", b.identifier("scope"), b.identifier("$scope$" + scopeStack.size))
                            );

                            properties = Object.keys(scope).map(name => {
                                var type = scope[name].type;
                                var value = type === "Parameter" ? name : "undefined";
                                return b.property("init", b.identifier(name), b.identifier(value));
                            });

                            bodyList.push_front(b.variableDeclaration(
                                "var",
                                [b.variableDeclarator(
                                    b.identifier("$scope$" + scopeStack.size),  // zero index
                                    b.objectExpression(properties)
                                )]
                            ));
                        }
                    }

                    // if there are any variables defined in this scope
                    // create a __scope__ dictionary containing their values
                    // and include in the first yield
                    
                    //if (scope && scope.locals.length > 0 && bodyList.first) {
                    //    create__scope__(node, bodyList, scope);
                    //} else {
                        node.body = bodyList.toArray();
                    //}
                } else {
                    // if the function isn't empty create a "scope" property
                    // to the first yield statement
                    if (bodyList.first !== null) {
                        var firstStatement = bodyList.first.value;
                        firstStatement.expression.argument.properties.push(
                            b.property("init", b.identifier("scope"), b.identifier("__scope__"))
                        );
                    }
                    
                    node.body = bodyList.toArray();
                }
                
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {

                if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" || node.callee.type === "YieldExpression") {

                    var gen = node;

                    // if "new" then build a call to "__instantiate__"
                    if (node.type === "NewExpression") {
                        var name = node.callee.type === "Identifier" ? node.callee.name : null;
                        node.arguments.unshift(b.literal(name));    // constructor name
                        node.arguments.unshift(node.callee);        // constructor
                        gen = b.callExpression(
                            b.memberExpression(
                                b.identifier("context"),
                                b.identifier("__instantiate__"),
                                false   // computed
                            ),
                            node.arguments
                        );
                    }

                    // create a yieldExpress to wrap the call
                    loc = node.loc;
                    
                    properties = [
                        b.property("init", b.identifier("gen"), gen),
                        b.property("init", b.identifier("line"), b.literal(loc.start.line))
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

                    // TODO: add test case for "var x = foo()" stepAgain
                    // TODO: add test case for "var x = foo(), y = foo()" stepAgain on last decl
                    if (parent.type === "VariableDeclarator" && parent._parent.type === "VariableDeclaration" && parent._parent._parent.type !== "ForStatement") {
                        var decls = parent._parent.declarations;
                        if (node === decls[decls.length - 1].init) {
                            properties.push(b.property("init", b.identifier("stepAgain"), b.literal(true)));
                        }
                    }

                    return b.yieldExpression(b.objectExpression(properties));
                } else {
                    throw "we don't handle '" + node.callee.type + "' callees";
                }
                
            } else if (node.type === "DebuggerStatement") {
                
                loc = node.loc;
                
                return b.expressionStatement(
                    b.yieldExpression(
                        b.objectExpression([
                            b.property("init", b.identifier("line"), b.literal(loc.start.line)),
                            b.property("init", b.identifier("breakpoint"), b.literal(true))
                        ])
                    )
                );
            } else if (node.type === "Identifier" && parent.type !== "FunctionExpression" && parent.type !== "FunctionDeclaration") {
                if (isReference(node, parent)) {
                    scopes = scopeStack.items;
                    
                    // iterate backwards and replace references with member
                    // expressions, e.g. x -> $scope$0.x
                    for (i = scopes.length - 1; i > -1; i--) {
                        scope = scopes[i];
                        if (scope.hasOwnProperty(node.name)) {
                            return b.memberExpression(
                                b.identifier("$scope$" + i),
                                b.identifier(node.name),
                                false   // "computed" boolean
                            );
                        }
                        if (context.hasOwnProperty(node.name)) {
                            return b.memberExpression(
                                b.identifier("context"),
                                b.identifier(node.name),
                                false   // "computed" boolean
                            );
                        }
                    }
                }
            } else if (node.type === "VariableDeclaration") {
                if (node.declarations.length === 1) {
                    var decl = node.declarations[0];
                    if (decl.init !== null) {
                        scopes = scopeStack.items;
                        
                        var ae, me;

                        for (i = scopes.length - 1; i > -1; i--) {
                            scope = scopes[i];
                            name = decl.id.name;
                            if (scope.hasOwnProperty(name)) {
                                me = b.memberExpression(
                                    b.identifier("$scope$" + i),
                                    b.identifier(name),
                                    false   // "computed" boolean
                                );
                                
                                ae = b.assignmentExpression(
                                    "=",
                                    me,
                                    decl.init
                                );
                                
                                if (parent.type !== "ForStatement") {
                                    stmt = b.expressionStatement(ae);
                                    stmt.loc = decl.loc;    // TODO: make "loc"ation faking more robust
                                    return stmt;
                                } else {
                                    ae.loc = decl.loc;
                                    return ae;
                                }
                            }
                        }
                        
                        if (context.hasOwnProperty(name)) {
                            me = b.memberExpression(
                                b.identifier("context"),
                                b.identifier(name),
                                false   // "computed" boolean
                            );

                            ae = b.assignmentExpression(
                                "=",
                                me,
                                decl.init
                            );

                            if (parent.type !== "ForStatement") {
                                stmt = b.expressionStatement(ae);
                                stmt.loc = decl.loc;    // TODO: make "loc"ation faking more robust
                                return stmt;
                            } else {
                                ae.loc = decl.loc;
                                return ae;
                            }
                        }
                    }
                }
            }

            // clean up
            //delete node._parent;
        }
    });

    if (nativeGenerators) {
        // TODO: obfuscate "context" more
        var debugCode = "return function*(context){\n" +
            escodegen.generate(ast) + "\n}";
        
        console.log(debugCode);

        return new Function(debugCode);
    } else {
        var entry = b.functionDeclaration(
            b.identifier("entry"), 
            [b.identifier("context")], 
            b.blockStatement(ast.body), 
            true,   // generator 
            false   // expression
        );

        regenerator.transform(entry);
        addScopes(entry, context);
        injectWithContext(entry);

        code = escodegen.generate(entry);
        console.log(code);
        return new Function(code + "\n" + "return entry;");
    }
}

module.exports = transform;
