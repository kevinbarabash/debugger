"use strict";

var basic = require("basic-ds");
var builder = require("./ast-builder"); // TODO: replace with recast
var escodegen = require("escodegen");
var escope = require("escope");
var esprima = require("esprima-fb");
var estraverse = require("estraverse");
var regenerator = require("regenerator");

// TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
// TODO: rewrite without using with, instead rewrite local vars as scope$1.varName

function getScopeVariables(node, parent, context) {
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
      return def.type === "FunctionName" && def.node.type === "FunctionDeclaration";
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
function insertYields(bodyList) {
  bodyList.forEachNode(function (node) {
    // this is a linked list node
    // TODO: separate vars for list nodes and ast nodes
    var loc = node.value.loc;
    var yieldExpression = builder.createExpressionStatement(builder.createYieldExpression(builder.createObjectExpression({ line: loc.start.line })));
    // add an extra property to differentiate function calls
    // that are followed by a statment from those that aren't
    // the former requires taking an extra _step() to get the
    // next line
    if (node.value.type === "ExpressionStatement") {
      if (node.value.expression.type === "YieldExpression") {
        node.value.expression.argument.properties.push(builder.createProperty("stepAgain", true));
      }
      if (node.value.expression.type === "AssignmentExpression") {
        var expr = node.value.expression.right;
        if (expr.type === "YieldExpression") {
          expr.argument.properties.push(builder.createProperty("stepAgain", true));
        }
      }
    }
    // TODO: add test case for "var x = foo()" stepAgain
    // TODO: add test case for "var x = foo(), y = foo()" stepAgain on last decl
    if (node.value.type === "VariableDeclaration") {
      var lastDecl = node.value.declarations[node.value.declarations.length - 1];
      if (lastDecl.init && lastDecl.init.type === "YieldExpression") {
        lastDecl.init.argument.properties.push(builder.createProperty("stepAgain", true));
      }
    }
    bodyList.insertBeforeNode(node, yieldExpression);
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
    if (stmt.type === "ReturnStatement") {
      var arg = stmt.argument;
      if (arg.type === "CallExpression") {
        var callee = arg.callee;
        if (callee.type === "MemberExpression") {
          if (callee.object.type === "Identifier" && callee.property.type === "Identifier") {
            var objName = callee.object.name;
            var propName = callee.property.name;

            if (objName === "regeneratorRuntime" && propName === "wrap") {
              var firstArg = arg.arguments[0];
              var blockStmt = firstArg.body;

              var withStmt = builder.createWithStatement(builder.createIdentifier("context"), builder.createBlockStatement(blockStmt.body));

              blockStmt.body = [withStmt];
              success = true;
            }
          }
        }
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
    enter: function (node, parent) {
      node._parent = parent;
    },
    leave: function (node, parent) {
      if (node.type === "ReturnStatement") {
        if (node.argument.type === "CallExpression") {
          var callee = node.argument.callee;
          var firstArg = node.argument.arguments[0];

          if (callee.object.name === "regeneratorRuntime" && callee.property.name === "wrap") {
            var properties = node._parent._parent.params.map(function (param) {
              return {
                type: "Property",
                key: builder.createIdentifier(param.name),
                value: builder.createIdentifier(param.name),
                kind: "init"
              };
            });

            if (node._parent.body[0].declarations) {
              node._parent.body[0].declarations.forEach(function (decl) {
                properties.push({
                  type: "Property",
                  key: builder.createIdentifier(decl.id.name),
                  value: builder.createIdentifier("undefined"),
                  kind: "init"
                });
              });
            }

            // filter out variables defined in the context from the local vars
            // but only for the root scope
            // filter out "context" to so it doesn't appear in the scope
            // TODO: give "context" a random name so that users don't mess with it
            if (firstArg.id.name === "generatorFunction$") {
              properties = properties.filter(function (prop) {
                return !context.hasOwnProperty(prop.key.name) && prop.key.name !== "context";
              });
            }

            var objectExpression = {
              type: "ObjectExpression",
              properties: properties
            };

            node._parent.body.unshift(builder.createVariableDeclaration([builder.createVariableDeclarator("__scope__", objectExpression)]));

            var blockStmt = firstArg.body;
            var withStmt = builder.createWithStatement(builder.createIdentifier("__scope__"), builder.createBlockStatement(blockStmt.body));
            blockStmt.body = [withStmt];
          }
        }
      }
      delete node._parent;
    }
  });
}


function create__scope__(node, bodyList, scope) {
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
    };
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
  var withStatement = builder.createWithStatement(builder.createIdentifier("__scope__"), builder.createBlockStatement(bodyList.toArray()));
  var objectExpression = {
    type: "ObjectExpression",
    properties: properties
  };

  // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
  node.body = [builder.createVariableDeclaration([builder.createVariableDeclarator("__scope__", objectExpression)]), withStatement];
}

function transform(code, context, options) {
  var es6 = options && options.language.toLowerCase() === "es6";

  var ast = esprima.parse(code, { loc: true });
  var scopeManager = escope.analyze(ast);
  scopeManager.attach();

  estraverse.replace(ast, {
    enter: function (node, parent) {
      node._parent = parent;
    },
    leave: function (node, parent) {
      if (node.type === "Program" || node.type === "BlockStatement") {
        if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
          var scope = getScopeVariables(node, parent, context);
        }

        var bodyList = basic.LinkedList.fromArray(node.body);
        insertYields(bodyList);

        if (bodyList.first) {
          if (parent.type === "FunctionDeclaration") {
            bodyList.first.value.expression.argument.properties.push({
              type: "Property",
              key: builder.createIdentifier("name"),
              value: builder.createLiteral(stringForId(parent.id)), // NOTE: identifier can be a member expression too!
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
            firstStatement.expression.argument.properties.push({
              type: "Property",
              key: builder.createIdentifier("scope"),
              value: builder.createIdentifier("__scope__"),
              kind: "init"
            });
          }

          node.body = bodyList.toArray();
        }
      } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
        node.generator = true;
      } else if (node.type === "CallExpression" || node.type === "NewExpression") {
        if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" || node.callee.type === "YieldExpression") {
          var gen = node;

          // if "new" then build a call to "__instantiate__"
          if (node.type === "NewExpression") {
            // put the constructor name as the 2nd param
            if (node.callee.type === "Identifier") {
              node.arguments.unshift(builder.createLiteral(node.callee.name));
            } else {
              node.arguments.unshift(builder.createLiteral(null));
            }
            // put the constructor itself as the 1st param
            node.arguments.unshift(node.callee);
            gen = builder.createCallExpression("__instantiate__", node.arguments);
          }

          // create a yieldExpress to wrap the call
          var loc = node.loc;
          return builder.createYieldExpression(
          // TODO: this is the current line, but we should actually be passing next node's line
          // TODO: handle this in when the ForStatement is parsed where we have more information
          builder.createObjectExpression({ gen: gen, line: loc.start.line }));
        } else {
          throw "we don't handle '" + node.callee.type + "' callees";
        }
      }

      delete node._parent;
    }
  });

  if (es6) {
    var debugCode = "return function*(context){\nwith(context){\n" + escodegen.generate(ast) + "\n}\n}";

    return new Function(debugCode);
  } else {
    var generatorFunction = {
      type: "FunctionDeclaration",
      id: builder.createIdentifier("generatorFunction"),
      params: [builder.createIdentifier("context")],
      defaults: [],
      rest: null,
      body: {
        type: "BlockStatement",
        body: ast.body
      },
      generator: true,
      expression: false
    };

    regenerator.transform(generatorFunction);
    injectWithContext(generatorFunction);
    addScopes(generatorFunction, context);

    return new Function(escodegen.generate(generatorFunction) + "\n" + "return generatorFunction;");
  }
}

module.exports = transform;