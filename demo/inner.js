// init processing
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext('2d');
var processing = new Processing(canvas);

// init canvas
processing.size(400,400);
processing.resetMatrix();

var poster = new Poster(window.parent);
var debugr = new Debugger(processing);

// TODO: remote procedure calling
// TODO: remote object proxying
poster.listen("load", function (code) {
    debugr.load(code);
});

poster.listen("start", function () {
    debugr.start();
});

poster.listen("resume", function () {
    debugr.resume();
});

poster.listen("stepIn", function () {
    debugr.stepIn();
    var scope = flatten(debugr.currentScope());
    poster.post("break", debugr.currentLine(), debugr.currentStack(), scope);
});

poster.listen("stepOver", function () {
    debugr.stepOver();
    var scope = flatten(debugr.currentScope());
    poster.post("break", debugr.currentLine(), debugr.currentStack(), scope);
});

poster.listen("stepOut", function () {
    debugr.stepOut();
    var scope = flatten(debugr.currentScope());
    poster.post("break", debugr.currentLine(), debugr.currentStack(), scope);
});

poster.listen("setBreakpoint", function (line) {
    debugr.setBreakpoint(line);
});

poster.listen("clearBreakpoint", function (line) {
    debugr.clearBreakpoint(line);
});

debugr.on("break", function () {
    var scope = flatten(debugr.currentScope());
    poster.post("break", debugr.currentLine(), debugr.currentStack(), scope);
//    enableButtons();
//    updateView(debugr);
});

debugr.on("done", function () {
    poster.post("done");
//    disableButtons();
//    editor.setHighlightActiveLine(false);
});

poster.listen("mouse", function (e) {
    $(canvas).simulate(e.type, {
        clientX: e.x,
        clientY: e.y
    });
});
