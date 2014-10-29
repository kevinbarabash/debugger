/* injects yield statements into the AST */

function Injector (context) {
    this.walker = new Walker();
    this.walker.exit = this.onExit.bind(this);
    this.context = context;
}

/**
 * Main entry point.  Injects yield expressions into ast
 * @param ast
 */
Injector.prototype.process = function (ast) {
    this.walker.walk(ast);
};

/**
 * Called as the walker has walked the node's children.  Inserting
 * yield nodes on exit avoids traversing new nodes which would cause
 * an infinite loop.
 * @param node
 */
Injector.prototype.onExit = function(node) {
    var len, i;

    if (node.type === "Program" || node.type === "BlockStatement") {
        len = node.body.length;

        this.insertYield(node, 0);
        for (i = 0; i < len - 1; i++) {
            this.insertYield(node, 2 * i + 2);
        }
    } else if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
        node.generator = true;
    } else if (node.type === "ExpressionStatement") {
        if (node.expression.type === "CallExpression") {
            var name = node.expression.callee.name;
            if (!this.context[name]) {  // yield only if it's a user defined function
                node.expression = builder.createYieldExpression(
                    builder.createObjectExpression({ generator: node.expression })
                );
            }
        }
    }
};

Injector.prototype.insertYield = function (program, index) {
    var loc = program.body[index].loc;
    var node = builder.createExpressionStatement(
        builder.createYieldExpression(
            builder.createObjectExpression({ lineno: loc.start.line })
        )
    );

    program.body.splice(index, 0, node);
};
