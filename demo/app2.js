// TODO: create a event handlers to proxy mouseDragged, et al
// TODO: create a scheduler so that after we step through "draw" we cna step through "mouseDragged" if necessary

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
var stepper = new Stepper(processing);

var finishedMain = false;

function timeout() {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, 100 / 60);  // 60 fps
        // TODO: grab the actual fps from processing
    });
}

//function loop() {
//    editor.setHighlightActiveLine(false);
//    disableButtons();
//
//    if (finishedMain) {
//        if (stepper.halted()) {
//            stepper.runGenWithPromises(processing.draw())
//                .then(function () {
//                    return timeout();
//                })
//                .then(function () {
//                    enableButtons();
//                    if (stepper.halted()) {
//                        loop();
//                    } else {
//                        updateView(stepper);
//                    }
//                }, function () {
//                    console.log("stopped");
//                });
//        } else {
//            stepper.runWithPromises()
//                .then(function () {
//                    enableButtons();
//                    if (stepper.halted()) {
//                        loop();
//                    } else {
//                        updateView(stepper);
//                    }
//                }, function () {
//                    console.log("stopped");
//                });
//        }
//    } else {
//        stepper.runWithPromises()
//            .then(function () {
//                enableButtons();
//                if (stepper.halted()) {
//                    finishedMain = true;
//                    loop();
//                } else {
//                    updateView(stepper);
//                }
//            }, function () {
//                console.log("stopped");
//            });
//    }
//}


function Scheduler(callback) {
    this.queue = new LinkedList();
    this.callback = callback; // callback is called when we've run out of tasks to run
}

Scheduler.prototype.addTask = function (task) {
    var self = this;

    // there's an assumption of implicit ordering here
    // TODO: make the ordering more explicit
    task.deferred.then(function () {
        self.queue.pop_back();
        console.log(task.message);

        if (task.delay > 0) {
            setTimeout(function () {
                scheduler.addTask(new Task(randomColor(), 500));
            }, task.delay);
        }

        self.startCurrentTask();
    });

    this.queue.push_front(task);
    this.startCurrentTask();
};

Scheduler.prototype.startCurrentTask = function () {
    var currentTask = this.currentTask();
    if (currentTask !== null && currentTask.state === "waiting") {
        currentTask.start();
    }
};

Scheduler.prototype.currentTask = function () {
    if (this.queue.last) {
        return this.queue.last.value;
    } else {
        return null;
    }
};


$("#startButton").click(function () {
    // reset processing
    processing.size(400,400);
    processing.resetMatrix();

    // reload the code and run it
    code = session.getValue();
    stepper.load(code);
    finishedMain = false;



    loop();
});

$("#continueButton").click(function () {
    loop();
});

$("#stepInButton").click(function () {
    var action = stepper.stepIn();
    if (stepper.halted()) {
        finishedMain = true;
        disableButtons();
        editor.setHighlightActiveLine(false);
        loop();
        return;
    }

    updateView(stepper, action);
});

$("#stepOverButton").click(function () {
    var action = stepper.stepOver();
    if (stepper.halted()) {
        disableButtons();
        editor.setHighlightActiveLine(false);
        if (finishedMain) {
            loop();
        }
        return;
    }

    updateView(stepper, action);
});

$("#stepOutButton").click(function () {
    var action = stepper.stepOut();
    if (stepper.halted()) {
        disableButtons();
        editor.setHighlightActiveLine(false);
        if (finishedMain) {
            loop();
        }
        return;
    }

    updateView(stepper, action);
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
        stepper.clearBreakpoint(row);
    } else {
        e.editor.session.setBreakpoint(row - 1);
        stepper.setBreakpoint(row);
    }

    e.stop();
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

function updateCallStack(stepper) {
    var $callStack = $("#callStack");
    $callStack.empty();

    if (stepper.halted()) {
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

function updateView(stepper, action) {
    updateLocals(stepper, action);
    updateCallStack(stepper);
    editor.gotoLine(stepper.line());
    editor.setHighlightActiveLine(true);
}
