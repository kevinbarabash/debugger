// setup editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
var session = editor.getSession();
session.setMode("ace/mode/javascript");

var canvas = document.querySelector("canvas");
var processing = new Processing(canvas);

//with (processing) {
//    // preamble
//    size(400, 400);
//    background(255);
//
//    setup = function () {
//        noStroke();
//        fill(255,0,0);
//        ellipse(200,200,75,75);
//    };
//
//    draw = function () {
//        fill(random(255),random(255),random(255));
//        ellipse(random(400),random(400),75,75);
//    };
//
//    // start
//    setup();
//    noLoop();   // call "loop();" when the draw function has been defined
//}

var getFunctionBody = function(func) {
    var funcString = func.toString();
    var start = funcString.indexOf("{") + 2;
    var end = funcString.lastIndexOf("}");
    return funcString.substring(start, end);
};

var code = getFunctionBody(function () {
size(400, 400);
background(255);
noStroke();

var randomColor = function () {
    // TODO: handle nested method calls to non-user code
    fill(random(255),random(255),random(255));
};

for (var i = 0; i < 10; i++) {
    randomColor();
    ellipse(random(400),random(400),75,75);
}
});

editor.getSession().setValue(code);

var stepper = new Stepper(processing);
stepper.load(code);
stepper.run();

$("#runButton").click(function () {
    code = session.getValue();
    stepper.load(code);
    stepper.run();
});

$("#resetButton").click(function () {
    stepper.reset();
    editor.setHighlightActiveLine(false);
    var action = stepper.stepOver();
    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepInButton").click(function () {
    var action = stepper.stepIn();
    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepOverButton").click(function () {
    var action = stepper.stepOver();
    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepOutButton").click(function () {
    var action = stepper.stepOver();
    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

////stepper.setBreakpoint(3);
////stepper.setBreakpoint(5);
//console.log(stepper.debugCode);
//
//var lines = code.split("\n");
//
//var stepCodeSpan = document.getElementById("stepCode");
//
//var stepOverButton = document.getElementById("stepOverButton");
//var stepInButton = document.getElementById("stepInButton");
//var stepOutButton = document.getElementById("stepOutButton");
//
//stepOverButton.addEventListener("click", function (e) {
//    var result = stepper.stepOver();
//    if (result.value) {
//        stepCodeSpan.innerText = lines[result.value.lineno - 1];
//    }
//});
//
//stepInButton.addEventListener("click", function (e) {
//    var result = stepper.stepIn();
//    if (result.value) {
//        stepCodeSpan.innerText = lines[result.value.lineno - 1];
//    }
//});
//
//stepOutButton.addEventListener("click", function (e) {
//    var result = stepper.stepOut();
//    if (result.value) {
//        stepCodeSpan.innerText = lines[result.value.lineno - 1];
//    }
//});
//
//var runButton = document.getElementById("runButton");
//runButton.addEventListener("click", function (e) {
//    stepper.run();
//    if (stepper.done) {
//        runButton.setAttribute("disabled","");
//        stepOverButton.setAttribute("disabled", "");
//        stepInButton.setAttribute("disabled", "");
//        stepOutButton.setAttribute("disabled", "");
//    }
//});
//
//document.getElementById("resetButton").addEventListener("click", function (e) {
//    with (processing) {
//        background(228);
//        fill(255, 255, 255);
//        rect(-10, -10, width + 20, height + 20);
//    }
//    stepper.reset();
//
//    runButton.removeAttribute("disabled");
//    stepOverButton.removeAttribute("disabled");
//    stepInButton.removeAttribute("disabled");
//    stepOutButton.removeAttribute("disabled");
//});
