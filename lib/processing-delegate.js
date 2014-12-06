var emptyFunction = function () {
};
var ProcessingDelegate = (function () {
    function ProcessingDelegate() {
        this.repeater = null;
    }
    ProcessingDelegate.prototype.debuggerWillStart = function (debugr) {
        if (this.repeater) {
            this.repeater.stop();
        }
        ProcessingDelegate.events.forEach(function (event) {
            debugr.context[event] = undefined;
        }, this);
        debugr.context.draw = emptyFunction;
    };
    ProcessingDelegate.prototype.debuggerFinishedMain = function (debugr) {
        var draw = debugr.context.draw;
        if (draw !== emptyFunction) {
            this.repeater = debugr.scheduler.createRepeater(function () {
                return debugr._createStepper(draw());
            }, 1000 / 60);
            this.repeater.start();
        }
        ProcessingDelegate.events.forEach(function (name) {
            var eventHandler = debugr.context[name];
            if (_isGeneratorFunction(eventHandler)) {
                if (name === "keyTyped") {
                    debugr.context.keyCode = 0;
                }
                debugr.context[name] = function () {
                    debugr.queueGenerator(eventHandler);
                };
            }
        }, this);
    };
    ProcessingDelegate.events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
    return ProcessingDelegate;
})();
function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}
module.exports = ProcessingDelegate;
