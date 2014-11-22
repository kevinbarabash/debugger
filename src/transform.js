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
