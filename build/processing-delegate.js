!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ProcessingDelegate=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var emptyFunction = function () {
};
var ProcessingDelegate = (function () {
    function ProcessingDelegate() {
        this.repeater = null;
    }
    ProcessingDelegate.prototype.willStart = function (debugr) {
        if (this.repeater) {
            this.repeater.stop();
        }
        ProcessingDelegate.events.forEach(function (event) {
            debugr.context[event] = undefined;
        }, this);
        debugr.context.draw = emptyFunction;
    };
    ProcessingDelegate.prototype.finishedMainFunction = function (debugr) {
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
    ProcessingDelegate.prototype.finishedEventLoopFunction = function () {
    };
    ProcessingDelegate.prototype.hitBreakpoint = function () {
    };
    ProcessingDelegate.prototype.objectInstantiated = function () {
    };
    ProcessingDelegate.events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
    return ProcessingDelegate;
})();
function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}
module.exports = ProcessingDelegate;

},{}]},{},[1])(1)
});