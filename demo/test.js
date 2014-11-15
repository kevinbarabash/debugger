function sketchProc(processing) {
    window.processing = processing;
}

var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
new Processing(canvas, sketchProc);

var stepper = new Stepper(processing);

var code = "size(400, 400);\n" +
    "background(128);\n" +
//    "fill(255,0,0);\n" +
//    "ellipse(100,100,50,50);\n" +
//    "fill(0,0,255);\n" +
//    "for (var i = 0; i < 2; i++) {\n" +
//    "  ellipse(100 + i * 60,200,50,50);\n" +
//    "}\n" +
    "function foo() {\n" +
    "  console.log('foo');\n" +
    "  console.log('foo');\n" +
    "}\n" +
    "var bar = function() {\n" +
    "  console.log('bar');\n" +
    "  console.log('bar');\n" +
    "  foo();\n" +
    "}\n" +
    "foo();\n" +
    "bar();";

//code = "size(400, 400);\n" +
//    "background(128);\n";

stepper.load(code);
//stepper.setBreakpoint(3);
//stepper.setBreakpoint(5);
console.log(stepper.debugCode);

var lines = code.split("\n");

var stepCodeSpan = document.getElementById("stepCode");

var stepOverButton = document.getElementById("stepOverButton");
var stepInButton = document.getElementById("stepInButton");
var stepOutButton = document.getElementById("stepOutButton");

stepOverButton.addEventListener("click", function (e) {
    var result = stepper.stepOver();
    if (result.value) {
        stepCodeSpan.innerText = lines[result.value.lineno - 1];
    }
});

stepInButton.addEventListener("click", function (e) {
    var result = stepper.stepIn();
    if (result.value) {
        stepCodeSpan.innerText = lines[result.value.lineno - 1];
    }
});

stepOutButton.addEventListener("click", function (e) {
    var result = stepper.stepOut();
    if (result.value) {
        stepCodeSpan.innerText = lines[result.value.lineno - 1];
    }
});

var runButton = document.getElementById("runButton");
runButton.addEventListener("click", function (e) {
    stepper.run();
    if (stepper.done) {
        runButton.setAttribute("disabled","");
        stepOverButton.setAttribute("disabled", "");
        stepInButton.setAttribute("disabled", "");
        stepOutButton.setAttribute("disabled", "");
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
    stepOverButton.removeAttribute("disabled");
    stepInButton.removeAttribute("disabled");
    stepOutButton.removeAttribute("disabled");
});
