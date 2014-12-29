var LinkedList = require("basic-ds").LinkedList;
var b = require("ast-types").builders;
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");

// TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
// TODO: rewrite without using with, instead rewrite local vars as scope$1.varName

function getScopeVariables (node, parent, context) {
    var variables = parent.__$escope$__.variables;

    return variables.filter(variable => {

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
}

// insert yield { line: <line_number> } in between each line
function insertYields (bodyList) {
    bodyList.forEachNode(listNode => {

        var astNode = listNode.value;
        var loc = astNode.loc;
        
        // astNodes without a valid loc are ones that have been inserted
        // and are the result of a yield expression replacing a debugger statement
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
 * @param generatorFunction
 * @param context
 */
function addScopes(generatorFunction, context) {
    estraverse.traverse(generatorFunction, {
        enter: (node, parent) => {
            node._parent = parent;
        },
        leave: (node, parent) => {
            if (node.type === "ReturnStatement" && node.argument.type === "CallExpression") {
                var callee = node.argument.callee;
                if (callee.object.name === "regeneratorRuntime" && callee.property.name === "wrap") {

                    var properties = node._parent._parent.params.map(param => 
                        b.property("init", b.identifier(param.name), b.identifier(param.name))
                    );

                    if (node._parent.body[0].declarations) {
                        node._parent.body[0].declarations.forEach(decl =>
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
                    if (firstArg.id.name === "generatorFunction$") {
                        properties = properties.filter(prop =>
                            !context.hasOwnProperty(prop.key.name) && prop.key.name !== "context");
                    }

                    node._parent.body.unshift(
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


function create__scope__(node, bodyList, scope) {
    var properties = scope.map(variable => {
        var isParam = variable.defs.some(def => def.type === "Parameter");
        var name = variable.name;

        // if the variable is a parameter initialize its
        // value with the value of the parameter
        var value = isParam ? b.identifier(name) : b.identifier("undefined");
        return b.property("init", b.identifier(name), value);
    });

    // modify the first yield statement to include the scope
    // as part of the value
    var firstStatement = bodyList.first.value;
    firstStatement.expression.argument.properties.push(
        b.property("init", b.identifier("scope"), b.identifier("__scope__"))
    );
    
    // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
    node.body = [
        b.variableDeclaration(
            "var",
            [b.variableDeclarator(
                b.identifier("__scope__"), 
                b.objectExpression(properties)
            )]
        ),
        b.withStatement(
            b.identifier("__scope__"),
            b.blockStatement(bodyList.toArray())
        )
    ];
}



function transform(code, context, options) {
    var es6 = options && options.language.toLowerCase() === "es6";

    var ast = esprima.parse(code, { loc: true });
    var scopeManager = escope.analyze(ast);
    scopeManager.attach();

    estraverse.replace(ast, {
        enter: (node, parent) => {
            node._parent = parent;
        },
        leave: (node, parent) => {
            var loc, literal, scope, bodyList;

            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                
                // convert all user defined functions to generators
                node.generator = true;
                
            } else if (node.type === "Program" || node.type === "BlockStatement") {
                
                if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                    scope = getScopeVariables(node, parent, context);
                }

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

                if (es6) {
                    // if there are any variables defined in this scope
                    // create a __scope__ dictionary containing their values
                    // and include in the first yield
                    
                    if (scope && scope.length > 0 && bodyList.first) {
                        create__scope__(node, bodyList, scope);
                    } else {
                        node.body = bodyList.toArray();
                    }
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
                            b.identifier("__instantiate__"), 
                            node.arguments
                        );
                    }

                    // create a yieldExpress to wrap the call
                    loc = node.loc;
                    
                    var properties = [
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
            }

            // clean up
            delete node._parent;
        }
    });

    if (es6) {
        var debugCode = "return function*(context){\nwith(context){\n" +
            escodegen.generate(ast) + "\n}\n}";

        return new Function(debugCode);
    } else {
        var generatorFunction = b.functionDeclaration(
            b.identifier("generatorFunction"), 
            [b.identifier("context")], 
            b.blockStatement(ast.body), 
            true,   // generator 
            false   // expression
        );

        regenerator.transform(generatorFunction);
        injectWithContext(generatorFunction);
        addScopes(generatorFunction, context);
        code = escodegen.generate(generatorFunction);
        console.log(code);
        
        return new Function(code + "\n" + "return generatorFunction;");
    }
}

module.exports = transform;
