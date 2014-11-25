// setup editor
var editor = ace.edit("editor");
var session = editor.getSession();

editor.setTheme("ace/theme/chrome");
editor.setHighlightActiveLine(false);

session.setMode("ace/mode/javascript");


// iframe communication
var iframe = $("iframe").get(0);
var overlay = createIframeOverlay(iframe);
// TODO: remove the need for specific ordering
// createIframeOverlay repositions the iframe in the DOM
// which throws away the contentWindow and probably forces it to reload
var poster = new Poster(iframe.contentWindow);

poster.listen("break", function (line) {
    overlay.paused = true;
    enableButtons();
    if (line > 0) {
        updateView(line);
    } else {
        disableButtons();
        editor.setHighlightActiveLine(false);
    }
});

poster.listen("done", function () {
    overlay.paused = false;
    disableButtons();
    editor.setHighlightActiveLine(false);
});

$("#startButton").click(function () {
    overlay.paused = false;
    var code = session.getValue();
    poster.post("load", code);
    poster.post("start");
});

$("#continueButton").click(function () {
    overlay.paused = false;
    poster.post("resume");
});

$("#stepInButton").click(function () {
    poster.post("stepIn");
});

$("#stepOverButton").click(function () {
    poster.post("stepOver");
});

$("#stepOutButton").click(function () {
    poster.post("stepOut");
});

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
        poster.post("clearBreakpoint", row);
    } else {
        e.editor.session.setBreakpoint(row - 1);
        poster.post("setBreakpoint", row);
    }

    e.stop();
});

function updateView(line) {
    editor.gotoLine(line);
    editor.setHighlightActiveLine(true);
//    updateLocals(debugr, action);
//    updateCallStack(debugr);
}

function disableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").attr("disabled", "");
}

function enableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").removeAttr("disabled");
}

//// TODO: automatically create the wrapper and overlay
//var wrapper = document.querySelector(".wrapper");
//var overlay = document.querySelector(".overlay");
//var down = false;
//
//overlay.addEventListener("mousedown", function (e) {
//    down = true;
//    if (!paused) {
//        poster.post("mouse", {
//            type: "mousedown",
//            x: e.pageX - wrapper.offsetLeft,
//            y: e.pageY - wrapper.offsetTop
//        });
//        e.preventDefault();
//    }
//});
//
//overlay.addEventListener("mousemove", function (e) {
//    if (!down) {
//        if (!paused) {
//            poster.post("mouse", {
//                type: "mousemove",
//                x: e.pageX - wrapper.offsetLeft,
//                y: e.pageY - wrapper.offsetTop
//            });
//        }
//    }
//});
//
//document.addEventListener("mousemove", function (e) {
//    if (down) {
//        if (!paused) {
//            poster.post("mouse", {
//                type: "mousemove",
//                x: e.pageX - wrapper.offsetLeft,
//                y: e.pageY - wrapper.offsetTop
//            });
//        }
//    }
//});
//
//document.addEventListener("mouseup", function (e) {
//    if (down) {
//        if (!paused) {
//            poster.post("mouse", {
//                type: "mouseup",
//                x: e.pageX - wrapper.offsetLeft,
//                y: e.pageY - wrapper.offsetTop
//            });
//        }
//        down = false;
//    }
//});

// TODO: update local variables
// TODO: update call stack
//function updateLocals(debugr, action) {
//    var stepper = debugr.currentStepper();
//    if (!stepper) {
//        return;
//    }
//    if (stepper.done) {
//        return;
//    }
//
//    var stack = debugr.currentStack();
//    var scope = stack.peek().scope;
//    var $variableList = $("#variableList");
//
//    if (action && action.type === "stepOver") {
//        // don't take any action
//    } else {
//        $variableList.empty();
//        if (!scope) {
//            return;
//        }
//        $variableList.append(genPropsList(scope));
//    }
//}
//
//function updateCallStack(debugr) {
//    var $callStack = $("#callStack");
//    $callStack.empty();
//
//    var stepper = debugr.currentStepper();
//    if (!stepper) {
//        return;
//    }
//    if (stepper.done) {
//        return;
//    }
//
//    var $ul = $("<ul></ul>");
//    stepper.stack.values.forEach(function (frame) {
//        var $name = $("<span></span>").text(frame.name);
//        var $line = $("<span></span>").text(frame.line).css({ float: "right" });
//        $ul.prepend($("<li></li>").append($name, $line));
//    });
//    $callStack.append($ul);
//}
//
//function updateView(debugr, action) {
//    if (action && action.line === -1) {
//        editor.setHighlightActiveLine(false);
//    } else {
//        editor.gotoLine(debugr.currentLine());
//        editor.setHighlightActiveLine(true);
//    }
//
//    updateLocals(debugr, action);
//    updateCallStack(debugr);
//}
