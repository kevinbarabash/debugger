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
        return {
            type: "Literal",
            value: value
        }
    }
};
