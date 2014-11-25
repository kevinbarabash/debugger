// init processing
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext('2d');
var processing = new Processing(canvas);

// init canvas
processing.size(400,400);
processing.resetMatrix();


// TODO: extract into a separate file
function Poster(target) {
    this.target = target;
    this.origin = "*";
    this.listeners = {};

    var self = this;
    window.addEventListener("message", function (e) {
        var channel = e.data.channel;
        var listener = self.listeners[channel];
        if (listener) {
            listener.apply(null, e.data.args);
        }
    });
}

Poster.prototype.post = function (channel) {
    var args = Array.prototype.slice.call(arguments, 1);
    var message = {
        channel: channel,
        args: args
    };
    this.target.postMessage(message, this.origin);
};

// TODO: support multiple listeners in the future
Poster.prototype.listen = function (channel, callback) {
    this.listeners[channel] = callback;
};

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
    poster.post("break", debugr.currentLine());
});

poster.listen("stepOver", function () {
    debugr.stepOver();
    poster.post("break", debugr.currentLine());
});

poster.listen("stepOut", function () {
    debugr.stepOut();
    poster.post("break", debugr.currentLine());
});

poster.listen("setBreakpoint", function (line) {
    debugr.setBreakpoint(line);
});

poster.listen("clearBreakpoint", function (line) {
    debugr.clearBreakpoint(line);
});

debugr.on("break", function () {
    poster.post("break", debugr.currentLine());
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
