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

    var node, loc;
    var len = ast.program.body.length;

    loc = ast.program.body[0].loc;
    node = b.expressionStatement(
        b.yieldExpression(
            createObjectExpression({
                breakpoint: false,
                start: createObjectExpression(loc.start),
                end: createObjectExpression(loc.end)
            }),
            false
        )
    );
    ast.program.body.splice(0, 0, node);

    for (var i = 0; i < len - 1; i++) {
        var loc = ast.program.body[2 * i + 2].loc;
        var breakpoint = loc.start.line === 3;
        node = b.expressionStatement(
            b.yieldExpression(
                createObjectExpression({
                    breakpoint: breakpoint,
                    start: createObjectExpression(loc.start),
                    end: createObjectExpression(loc.end)
                }),
                false
            )
        );
        ast.program.body.splice(2 * i + 2, 0, node);
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

    // TODO: export thes using requirejs
    window.step = function () {
        var result = runner.next();
        if (result.value) {
            console.log(result);
            var stepCode = lines[result.value.start.line - 1];
            console.log("step: " + stepCode);
            return stepCode;
        }
    };

    window.run = function () {
        var result = runner.next();
        while (!result.done && !result.value.breakpoint) {
            result = runner.next();
        }
        return result;
    };

    window.reset = function () {
        with (processing) {
            background(228);
            fill(255, 255, 255);
            rect(-10, -10, width + 20, height + 20);
        }
        runner = createRunner(processing);
    };

});
