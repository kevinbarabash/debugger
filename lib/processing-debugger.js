var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Debugger = require("./debugger");
function emptyFunction() {
}
var ProcessingDebugger = (function (_super) {
    __extends(ProcessingDebugger, _super);
    function ProcessingDebugger(context, onBreakpoint, onFunctionDone) {
        _super.call(this, context, onBreakpoint, onFunctionDone);
        this._repeater = null;
    }
    ProcessingDebugger.prototype.onMainStart = function () {
        var _this = this;
        if (this._repeater) {
            this._repeater.stop();
        }
        ProcessingDebugger.events.forEach(function (event) { return _this.context[event] = emptyFunction; });
        this.context.draw = emptyFunction;
    };
    ProcessingDebugger.prototype.onMainDone = function () {
        var _this = this;
        var draw = this.context.draw;
        if (draw !== emptyFunction) {
            this._repeater = this.scheduler.createRepeater(function () { return _this._createStepper(draw()); }, 1000 / 60);
            this._repeater.start();
        }
        ProcessingDebugger.events.forEach(function (name) {
            var eventHandler = _this.context[name];
            if (_isGeneratorFunction(eventHandler)) {
                if (name === "keyTyped") {
                    _this.context.keyCode = 0;
                }
                _this.context[name] = function () {
                    _this.queueGenerator(eventHandler);
                };
            }
        });
    };
    ProcessingDebugger.events = [
        "mouseClicked",
        "mouseDragged",
        "mousePressed",
        "mouseMoved",
        "mouseReleased",
        "keyPressed",
        "keyReleased",
        "keyTyped"
    ];
    return ProcessingDebugger;
})(Debugger);
function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}
module.exports = ProcessingDebugger;
