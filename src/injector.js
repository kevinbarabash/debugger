/* injects yield statements into the AST */

(function (exports) {

    /**
     * Injects yield expressions into AST and converts functions (that don't
     * return values) into generators.
     *
     * @param ast
     * @param context
     */
    var process = function (ast, context) {
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
                            builder.createObjectExpression({ lineno: loc.start.line })
                        )
                    );
                    
                    bodyList.insertBeforeNode(node, yieldExpression);
                });
                node.body = bodyList.toArray();
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                if (!context[node.callee.name]) {
                    
                    var gen = node;
                    if (node.type === "NewExpression") {
                        node.arguments.unshift(node.callee);
                        gen = builder.createCallExpression("instantiate", node.arguments);
                    }

                    var yieldExpression = builder.createYieldExpression(
                        builder.createObjectExpression({
                            gen: gen,
                            lineno: node.loc.start.line
                        })
                    );
                    
                    if (name.indexOf("arguments") === 0) {
                        var index = name.match(/\[([0-1]+)\]/)[1];
                        parent.arguments[index] = yieldExpression;
                    } else {
                        parent[name] = yieldExpression;
                    }
                }
            }
        };

        yieldInjectionWalker.walk(ast);
    };

    // TODO: fix this so it's a proper export
    exports.injector = {
        process: process
    };
})(self);
