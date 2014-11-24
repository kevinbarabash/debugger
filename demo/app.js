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

// code to run
var code = getFunctionBody(function () {
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
    var p = new PVector(random(400), random(400));
    ellipse(p.x, p.y, 75, 75);
    p.x += 10;
    p.y += 20;
    var x = p.x;
    var y = p.y;
    ellipse(x, y, 75, 75);
};
});

editor.getSession().setValue(code);
editor.setHighlightActiveLine(false);
var debugr = new Debugger(processing);

var finishedMain = false;

function timeout() {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, 100 / 60);  // 60 fps
        // TODO: grab the actual fps from processing
    });
}

debugr.on('break', function () {
    enableButtons();
    updateView(debugr);
});

$("#startButton").click(function () {
    // reset processing
    processing.size(400,400);
    processing.resetMatrix();

    // reload the code and run it
    code = session.getValue();
    debugr.load(code);
    disableButtons();
    debugr.start();
});

$("#continueButton").click(function () {
    disableButtons();
    debugr.resume();
});

$("#stepInButton").click(function () {
    var action = debugr.stepIn();
    updateView(debugr, action);
});

$("#stepOverButton").click(function () {
    var action = debugr.stepOver();
    updateView(debugr, action);
});

$("#stepOutButton").click(function () {
    var action = debugr.stepOut();
    updateView(debugr, action);
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

    var row = parseInt(e.domEvent.target.innerText);

    if (e.editor.session.getBreakpoints()[row - 1]) {
        e.editor.session.clearBreakpoint(row - 1);
        debugr.clearBreakpoint(row);
    } else {
        e.editor.session.setBreakpoint(row - 1);
        debugr.setBreakpoint(row);
    }

    e.stop();
});

function updateLocals(debugr, action) {
    var stepper = debugr.currentStepper();
    if (!stepper) {
        return;
    }
    if (stepper.done) {
        return;
    }

    var stack = debugr.currentStack();
    var scope = stack.peek().scope;
    var $variableList = $("#variableList");

    if (action && action.type === "stepOver") {
        // don't take any action
    } else {
        $variableList.empty();
        if (!scope) {
            return;
        }
        $variableList.append(genPropsList(scope));
    }
}

function updateCallStack(debugr) {
    var $callStack = $("#callStack");
    $callStack.empty();

    var stepper = debugr.currentStepper();
    if (!stepper) {
        return;
    }
    if (stepper.done) {
        return;
    }

    var scope = stepper.stack.peek().scope;

    if (!scope) {
        return;
    }

    var $ul = $("<ul></ul>");
    stepper.stack.values.forEach(function (frame) {
        var $name = $("<span></span>").text(frame.name);
        var $line = $("<span></span>").text(frame.line).css({ float: "right" });
        $ul.prepend($("<li></li>").append($name, $line));
    });
    $callStack.append($ul);
}

function updateView(debugr, action) {
    editor.gotoLine(debugr.currentLine());
    editor.setHighlightActiveLine(true);

    updateLocals(debugr, action);
    updateCallStack(debugr);
}
