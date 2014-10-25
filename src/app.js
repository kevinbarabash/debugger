define(function (require) {

    var code = "size(400, 400);\n" +
        "background(128);\n" +
        "fill(255,0,0);\n" +
        "ellipse(100,100,50,50);";

    var ast = recast.parse(code);
    console.log(ast);

    var output = recast.print(ast).code;

    var debugCode = "return function*(){\nwith(arguments[0]){\n" + output + "\n}\n}";
    var createRunner = (new Function(debugCode))();

    function sketchProc(processing) {
        var runner = createRunner(processing);
        runner.next();
    }

    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    new Processing(canvas, sketchProc);

});
