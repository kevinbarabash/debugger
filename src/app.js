define(function (require) {

    var code = "size(400, 400);\n" +
        "background(128);\n" +
        "fill(255,0,0);\n" +
        "ellipse(100,100,50,50);\n" +
        "fill(0,0,255);\n" +
        "ellipse(200,200,50,50);";

    var lines = code.split("\n");

    var ast = recast.parse(code);
    console.log(ast);

    var b = recast.types.builders;

    // from amasad/debugjs/lib/transform.js
    function createObjectExpression(obj) {
        var props = [];
        for (var prop in obj) {
            var val = typeof obj[prop] === 'object' ? obj[prop] : b.literal(obj[prop]);
            props.push(b.property('init', b.literal(prop), val));
        }
        return b.objectExpression(props);
    }

    var node;
    var len = ast.program.body.length;

    for (var i = 0; i < len; i++) {
        var loc = ast.program.body[2 * i].loc;
        node = b.expressionStatement(
            b.yieldExpression(
                createObjectExpression({
                    start: createObjectExpression(loc.start),
                    end: createObjectExpression(loc.end)
                }),
                false
            )
        );
        ast.program.body.splice(2 * i + 1, 0, node);
    }

    var output = recast.print(ast).code;
    console.log(output);

    var debugCode = "return function*(){\nwith(arguments[0]){\n" + output + "\n}\n}";
    var createRunner = (new Function(debugCode))();

    function sketchProc(processing) {
        window.processing = processing;
    }

    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    new Processing(canvas, sketchProc);

    var runner = createRunner(processing);
    window.step = function () {
        var result = runner.next();
        if (result.value) {
            var stepCode = lines[result.value.start.line - 1];
            console.log("step: " + stepCode);
            return stepCode;
        }
    };

});
