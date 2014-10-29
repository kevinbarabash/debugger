function sketchProc(processing) {
    window.processing = processing;
}

var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
new Processing(canvas, sketchProc);

var stepper = new Stepper(processing);

var code = "size(400, 400);\n" +
    "background(128);\n" +
    "fill(255,0,0);\n" +
    "ellipse(100,100,50,50);\n" +
    "fill(0,0,255);\n" +
    "for (var i = 0; i < 5; i++) {\n" +
    "  ellipse(100 + i * 60,200,50,50);\n" +
    "}\n" +
    "function foo() {\n" +
    "  console.log('foo');\n" +
    "}\n" +
    "var bar = function() {\n" +
    "  console.log('bar');\n" +
    "}\n" +
    "foo();\n" +
    "bar();";

code = "size(400, 400);\n" +
    "background(128);\n";

stepper.load(code);
stepper.setBreakpoint(3);
stepper.setBreakpoint(5);

var lines = code.split("\n");

var stepCodeSpan = document.getElementById("stepCode");
var stepCodeButton = document.getElementById("stepButton");
var runButton = document.getElementById("runButton");

stepCodeButton.addEventListener("click", function (e) {
    var result = stepper.stepOver();
    if (result.value) {
        stepCodeSpan.innerText = lines[result.value.lineno - 1];
    } else {
        stepCodeSpan.innerText = "";
        runButton.setAttribute("disabled","");
        stepCodeButton.setAttribute("disabled", "");
    }
});

runButton.addEventListener("click", function (e) {
    stepper.run();
    if (stepper.done) {
        runButton.setAttribute("disabled","");
        stepCodeButton.setAttribute("disabled", "");
    }
});

document.getElementById("resetButton").addEventListener("click", function (e) {
    with (processing) {
        background(228);
        fill(255, 255, 255);
        rect(-10, -10, width + 20, height + 20);
    }
    stepper.reset();

    runButton.removeAttribute("disabled");
    stepCodeButton.removeAttribute("disabled");
});
