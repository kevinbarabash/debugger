"use strict";

/* build Parser API style AST nodes and trees */

var createExpressionStatement = function (expression) {
  return {
    type: "ExpressionStatement",
    expression: expression
  };
};

var createBlockStatement = function (body) {
  return {
    type: "BlockStatement",
    body: body
  };
};

var createCallExpression = function (name, args) {
  return {
    type: "CallExpression",
    callee: createIdentifier(name),
    arguments: args
  };
};

var createYieldExpression = function (argument) {
  return {
    type: "YieldExpression",
    argument: argument
  };
};

var createObjectExpression = function (obj) {
  var properties = Object.keys(obj).map(function (key) {
    var value = obj[key];
    return createProperty(key, value);
  });

  return {
    type: "ObjectExpression",
    properties: properties
  };
};

var createProperty = function (key, value) {
  var expression;
  if (value instanceof Object) {
    if (value.type === "CallExpression" || value.type === "NewExpression") {
      expression = value;
    } else {
      expression = createObjectExpression(value);
    }
  } else if (value === undefined) {
    expression = createIdentifier("undefined");
  } else {
    expression = createLiteral(value);
  }

  return {
    type: "Property",
    key: createIdentifier(key),
    value: expression,
    kind: "init"
  };
};

var createIdentifier = function (name) {
  return {
    type: "Identifier",
    name: name
  };
};

var createLiteral = function (value) {
  if (value === undefined) {
    throw "literal value undefined";
  }
  return {
    type: "Literal",
    value: value
  };
};

var createWithStatement = function (obj, body) {
  return {
    type: "WithStatement",
    object: obj,
    body: body
  };
};

var createAssignmentExpression = function (name, value) {
  return {
    type: "AssignmentExpression",
    operator: "=",
    left: createIdentifier(name),
    right: value
  };
};

var createVariableDeclarator = function (name, value) {
  return {
    type: "VariableDeclarator",
    id: createIdentifier(name),
    init: value
  };
};

// a declaration is a subclass of statement
var createVariableDeclaration = function (declarations) {
  return {
    type: "VariableDeclaration",
    declarations: declarations,
    kind: "var"
  };
};

var replaceNode = function (parent, name, replacementNode) {
  if (name.indexOf("arguments") === 0) {
    var index = name.match(/\[([0-1]+)\]/)[1];
    parent.arguments[index] = replacementNode;
  } else {
    parent[name] = replacementNode;
  }
};

exports.createExpressionStatement = createExpressionStatement;
exports.createBlockStatement = createBlockStatement;
exports.createCallExpression = createCallExpression;
exports.createYieldExpression = createYieldExpression;
exports.createObjectExpression = createObjectExpression;
exports.createProperty = createProperty;
exports.createIdentifier = createIdentifier;
exports.createLiteral = createLiteral;
exports.createWithStatement = createWithStatement;
exports.createAssignmentExpression = createAssignmentExpression;
exports.createVariableDeclaration = createVariableDeclaration;
exports.createVariableDeclarator = createVariableDeclarator;
exports.replaceNode = replaceNode;