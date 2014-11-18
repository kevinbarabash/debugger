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

var randomColor = function () {
    var r;
    r = random(255);
    var g = random(255);
    var b = random(255);
    fill(r,g,b);
};

for (var i = 0; i < 3; i++) {
    randomColor();
    ellipse(random(400),random(400),75,75);
}

draw = function () {
    randomColor();
    ellipse(random(400),random(400),75,75);
};
});

editor.getSession().setValue(code);

var stepper = new Stepper(processing);
stepper.load(code);
stepper.run();
editor.setHighlightActiveLine(false);


$("#restartButton").click(function () {
    // reset processing
    processing.size(400,400);
    processing.resetMatrix();

    // reload the code and run it
    code = session.getValue();
    stepper.load(code);
    stepper.run();

    enableButtons();

    if (stepper.halted()) {
        editor.setHighlightActiveLine(false);
        disableButtons();

        stepper.runGen(processing.draw());
        if (!stepper.halted()) {
            enableButtons();

            editor.gotoLine(stepper._line);
            editor.setHighlightActiveLine(true);
            updateLocals(stepper.stack.peek().scope);
        }

    } else {
        editor.gotoLine(stepper._line);
        editor.setHighlightActiveLine(true);
        updateLocals(stepper.stack.peek().scope);
    }
});


$("#continueButton").click(function () {
    stepper.run();
    if (stepper.halted()) {
        editor.setHighlightActiveLine(false);
        disableButtons();
    } else {
        editor.gotoLine(stepper._line);
        editor.setHighlightActiveLine(true);
        updateLocals(stepper.stack.peek().scope);
    }
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


$("#stepInButton").click(function () {
    var action = stepper.stepIn();
    if (stepper.halted()) {
        disableButtons();
        editor.setHighlightActiveLine(false);
        return;
    }
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
    if (stepper.halted()) {
        disableButtons();
        editor.setHighlightActiveLine(false);
        return;
    }
    if (action.type === "stepOut") {
        console.log("stepOut: stack size = " + stepper.stack.size());
    }

    updateLocals(stepper.stack.peek().scope);

    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

$("#stepOutButton").click(function () {
    var action = stepper.stepOut();
    if (stepper.halted()) {
        disableButtons();
        editor.setHighlightActiveLine(false);
        return;
    }
    if (action.type === "stepOut") {
        console.log("stepOut: stack size = " + stepper.stack.size());
    }

    updateLocals(stepper.stack.peek().scope);

    editor.gotoLine(action.line);
    editor.setHighlightActiveLine(true);
});

function disableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").attr("disabled", "");
}

function enableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").removeAttr("disabled");
}

// set/clear breakpoints by clicking in the gutter
editor.on("guttermousedown", function(e){
    var target = e.domEvent.target;
    if (target.className.indexOf("ace_gutter-cell") == -1) {
        return;
    }

    // only set a breakpoint when clicking on the left side of the target
    if (e.clientX > 25 + target.getBoundingClientRect().left) {
        return;
    }

    var row = e.getDocumentPosition().row;

    if (e.editor.session.getBreakpoints()[row]) {
        e.editor.session.clearBreakpoint(row);
        stepper.clearBreakpoint(row + 1);
    } else {
        e.editor.session.setBreakpoint(row);
        stepper.setBreakpoint(row + 1);
    }

    e.stop();
});
