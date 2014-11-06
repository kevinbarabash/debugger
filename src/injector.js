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
            var len, i;

            if (node.type === "Program" || node.type === "BlockStatement") {
                len = node.body.length;

                insertYield(node, 0);
                var j = 2;
                for (i = 0; i < len - 1; i++) {
                    insertYield(node, j);
                    j += 2;
                }
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression") {
                if (!context[node.callee.name]) {

                    var yieldExpression = builder.createYieldExpression(
                        builder.createObjectExpression({
                            gen: node,
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


    var insertYield = function (program, index) {
        var loc = program.body[index].loc;
        var node = builder.createExpressionStatement(
            builder.createYieldExpression(
                builder.createObjectExpression({ lineno: loc.start.line })
            )
        );

        program.body.splice(index, 0, node);
    };

    // TODO: fix this so it's a proper export
    exports.injector = {
        process: process
    };
})(window);
