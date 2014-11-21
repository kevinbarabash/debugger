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

    function timeout() {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, 100 / 60);  // 60 fps
            // TODO: grab the actual fps from processing
        });
    }

    // TODO: create a event handlers to proxy mouseDragged, et al
    // TODO: create a scheduler so that after we step through "draw" we cna step through "mouseDragged" if necessary
    function loop() {
        editor.setHighlightActiveLine(false);
        disableButtons();

        stepper.runGenWithPromises(processing.draw())
            .then(function () {
                return timeout();
            })
            .then(function () {
                loop();
            }, function () {
                // TODO: make a stop button so that we can start reject promises
                console.log("stopped");
            });

        enableButtons();

        if (stepper.paused()) {
            editor.gotoLine(stepper.line());
            editor.setHighlightActiveLine(true);
            updateLocals(stepper);
        }

    }


    editor.setHighlightActiveLine(false);
    disableButtons();
    stepper.reset();

    stepper.runWithPromises().then(function () {
        loop(); // start looping through "draw"
    }, function () {
        console.log("stopped");
    });

    enableButtons();

//    editor.gotoLine(stepper.line());
//    editor.setHighlightActiveLine(true);
//    updateLocals(stepper.stack.peek().scope);
});


$("#continueButton").click(function () {
    stepper.run();
    if (stepper.halted()) {
        editor.setHighlightActiveLine(false);
        disableButtons();
    } else {
        // TODO: make it so continue runs all of the functional call on this line
        // and actually proceeds to the next line
        editor.gotoLine(stepper.line());
        editor.setHighlightActiveLine(true);
        // TODO: determine if we're in the same context
        updateLocals(stepper);
    }
});

function updateLocals(stepper, action) {
    if (stepper.halted()) {
        return;
    }
    var scope = stepper.stack.peek().scope;
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

    updateLocals(stepper, action);

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

    updateLocals(stepper, action);

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

    updateLocals(stepper, action);

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
