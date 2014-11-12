/* injects yield statements into the AST */

(function (exports) {

    /**
     * Injects yield expressions into AST and converts functions (that don't
     * return values) into generators.
     *
     * @param ast
     */
    var process = function (ast) {
        var yieldInjectionWalker = new Walker();

        /**
         * Called as the walker has walked the node's children.  Inserting
         * yield nodes on exit avoids traversing new nodes which would cause
         * an infinite loop.
         */
        yieldInjectionWalker.exit = function(node, name, parent) {
            if (node.type === "Program" || node.type === "BlockStatement") {
                var bodyList = LinkedList.fromArray(node.body);

                bodyList.forEachNode(function (node) {
                    var loc = node.value.loc;
                    var yieldExpression = builder.createExpressionStatement(
                        builder.createYieldExpression(
                            builder.createObjectExpression({ line: loc.start.line })
                        )
                    );

                    bodyList.insertBeforeNode(node, yieldExpression);
                });
                node.body = bodyList.toArray();
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                if (node.callee.type === "Identifier") {
                    wrapCallWithYield(node, name, parent);
                } else if (node.callee.type === "MemberExpression") {
                    wrapCallWithYield(node, name, parent);
                } else if (node.callee.type === "CallExpression") {
                    console.log("chained call expression, ignore for now");
                } else {
                    throw "we don't handle '" + node.callee.type + "' callees";
                }
            }
        };

        yieldInjectionWalker.walk(ast);
    };

    var wrapCallWithYield = function (node, name, parent) {
        var gen = node;

        // if "new" then build a call to "__instantiate__"
        if (node.type === "NewExpression") {
            node.arguments.unshift(node.callee);
            gen = builder.createCallExpression("__instantiate__", node.arguments);
            // NOTE: "instantiate" is defined in stepper.js
        }

        // create a yieldExpress to wrap the call
        var yieldExpression = builder.createYieldExpression(
            builder.createObjectExpression({
                gen: gen,
                line: node.loc.start.line
            })
        );

        // replace node with yieldExpression
        builder.replaceNode(parent, name, yieldExpression);
    };

    exports.injector = {
        process: process
    };
})(this);
