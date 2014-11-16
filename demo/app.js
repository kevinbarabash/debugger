// TODO: support for breakpoints
// TODO: show call stack

// setup editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
var session = editor.getSession();
session.setMode("ace/mode/javascript");

var canvas = document.querySelector("canvas");
var ctx = canvas.getContext('2d');
var processing = new Processing(canvas);

// init canvas
processing.size(400,400);
processing.resetMatrix();

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
//size(w, h);
background(255);
noStroke();

var x = 5;
var y = 10;

var randomColor = function () {
    var r;
    r = random(255);
    var g = random(255);
    var b = random(255);
    fill(r,g,b);
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
stepper.reset();
editor.setHighlightActiveLine(false);
updateLocals(stepper.stack.peek().scope);

processing.size(400,400);
processing.resetMatrix();

$("#runButton").click(function () {
    code = session.getValue();
    stepper.load(code);
    stepper.run();
    editor.setHighlightActiveLine(false);
});

function updateLocals(scope) {
    $("#variableList").empty();
    if (!scope) {
        return;
    }
    Object.keys(scope).forEach(function (key) {
        var value = scope[key];
        var cls = typeof(value);
        if (value === undefined) {
            value = "undefined";
        }
        $("#variableList").append(
            $("<li>: </li>")
                .prepend($("<span>").addClass("label").text(key))
                .append($("<span>").addClass(cls).text(value))
        );
    });
}

$("#resetButton").click(function () {
    processing.size(400,400);
    processing.resetMatrix();
    stepper.reset();
    editor.setHighlightActiveLine(false);
    var action = stepper.stepOver();
    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);

    updateLocals(stepper.stack.peek().scope);
});

$("#stepInButton").click(function () {
    var action = stepper.stepIn();
    if (action.type === "stepIn") {
        console.log("stepIn: stack size = " + stepper.stack.size());
    } else if (action.type === "stepOver") {

    } else if (action.type === "stepOut") {
        console.log("stepOut: stack size = " + stepper.stack.size());
    }

    updateLocals(stepper.stack.peek().scope);

    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepOverButton").click(function () {
    var action = stepper.stepOver();
    if (action.type === "stepOut") {
        console.log("stepOut: stack size = " + stepper.stack.size());
    }

    updateLocals(stepper.stack.peek().scope);

    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepOutButton").click(function () {
    var action = stepper.stepOut();
    if (action.type === "stepOut") {
        console.log("stepOut: stack size = " + stepper.stack.size());
    }

    updateLocals(stepper.stack.peek().scope);

    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

