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
        var retValFuncs = {};
        var retValWalker = new Walker();

        // create a list of functions return values
        // NOTE: this code doesn't handle reassigning functions to different variables
        // TODO: implement stepping into functions with return values
        retValWalker.exit = function (node) {
            if (node.type === "VariableDeclarator") {
                var name = node.id.name;
                if (node.init.type === "FunctionExpression" || node.init.type === "FunctionDeclaration") {
                    var funcNode = node.init;

                    if (checkForReturnValue(funcNode)) {
                        retValFuncs[name] = true;
                    } else {
                        funcNode.generator = true;
                    }
                }
            }
        };

        retValWalker.walk(ast);

        var yieldInjectionWalker = new Walker();
        /**
         * Called as the walker has walked the node's children.  Inserting
         * yield nodes on exit avoids traversing new nodes which would cause
         * an infinite loop.
         */
        yieldInjectionWalker.exit = function(node) {
            var len, i, name;

            if (node.type === "Program" || node.type === "BlockStatement") {
                len = node.body.length;

                insertYield(node, 0);
                for (i = 0; i < len - 1; i++) {
                    insertYield(node, 2 * i + 2);
                }
            } else if (node.type === "ExpressionStatement") {
                if (node.expression.type === "CallExpression") {
                    name = node.expression.callee.name;

                    if (name !== undefined && !context[name] && !retValFuncs[name]) {
                        // yield only if it's a user defined function and
                        // if it isn't a function that returns a value
                        node.expression = builder.createYieldExpression(
                            builder.createObjectExpression({
                                generator: node.expression,
                                lineno: node.loc.start.line,
                                name: name  // so that we can display a callstack later
                            })
                        );
                    }
                }
            }
        };
        /**
         * Stop recursion early if we hit a function that hasn't been marked as a
         * generator because non-generators can't contain yield statements.
         */
        yieldInjectionWalker.shouldWalk = function(node) {
            if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                return node.generator;
            }
            return true;
        };

        yieldInjectionWalker.walk(ast);
    };

    /**
     * Checks if the given FunctionExpression (or FunctionDeclaration) returns a value.
     * @param funcNode
     * @returns {boolean}
     */
    var checkForReturnValue = function (funcNode) {
        var funcWalker = new Walker();
        var root = false;
        var retval = false;

        funcWalker.shouldWalk = function (node) {
            // stop recursing if we've already encountered a return
            if (retval) {
                return false;
            }
            // stop recursing if we hit a function
            if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
                if (root) {
                    debugger;
                    return false;
                } else {
                    root = true;
                    return true;
                }
            }

            return true;
        };

        funcWalker.enter = function (node) {
            if (node.type === "ReturnStatement") {
                if (node.argument !== null) {
                    retval = true;
                }
            }
        };

        funcWalker.walk(funcNode);

        return retval;
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
