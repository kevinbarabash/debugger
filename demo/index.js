// setup editor
var editor = ace.edit("editor");
var session = editor.getSession();
var browser = new ObjectBrowser(document.querySelector("#variableList"));

editor.setTheme("ace/theme/chrome");
editor.setHighlightActiveLine(false);

session.setMode("ace/mode/javascript");

// iframe communication
var iframe = $("iframe").get(0);
var overlay = iframeOverlay.createOverlay(iframe);
// TODO: remove the need for specific ordering
// createIframeOverlay repositions the iframe in the DOM
// which throws away the contentWindow and probably forces it to reload
var poster = new Poster(iframe.contentWindow);

poster.listen("break", function (line, stackValues, scope) {
    enableButtons();
    if (line > 0) {
        overlay.pause();
        updateView(line);
        updateCallStack(stackValues);
        updateLocals(gehry.reconstruct(scope));
    } else {
        disableButtons();
        editor.setHighlightActiveLine(false);
    }
});

poster.listen("done", function () {
    overlay.resume();
    disableButtons();
    editor.setHighlightActiveLine(false);

    // clear call stack and locals
    updateCallStack([]);
    updateLocals();
    overlay.resume();
});

$("#startButton").click(function () {
    overlay.resume();
    var code = session.getValue();
    poster.post("load", code);
    poster.post("start");
});

$("#continueButton").click(function () {
    poster.post("resume");
    overlay.resume();
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
}

function disableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").attr("disabled", "");
}

function enableButtons() {
    $("#continueButton,#stepOverButton,#stepInButton,#stepOutButton").removeAttr("disabled");
}

function updateCallStack(stackValues) {
    var $callStack = $("#callStack");
    $callStack.empty();

    var $ul = $("<ul></ul>");
    stackValues.forEach(function (frame) {
        var $name = $("<span></span>").text(frame.name);
        var $line = $("<span></span>").text(frame.line).css({ float: "right" });
        $ul.prepend($("<li></li>").append($name, $line));
    });
    $callStack.append($ul);
}

function updateLocals(scope) {
    browser.object = scope;
}

poster.listen("ready", function () {
    var code = session.getValue();
    poster.post("load", code);
    poster.post("start");
});
