/**
 *
 */

/// <reference path="./debugger-delegate.ts"/>

class ProcessingDelegate implements DebuggerDelegate {
    repeater: { stop: () => void; start: () => void; delay: number };

    constructor() {
        this.repeater = null;
    }

    debuggerWillStart(debugr) {
        if (this.repeater) {
            this.repeater.stop();
        }

        ProcessingDelegate.events.forEach(function (event) {
            debugr.context[event] = undefined;
        }, this);
    }

    debuggerFinishedMain(debugr) {
        var draw = debugr.context.draw;

        if (draw) {
            this.repeater = debugr.scheduler.createRepeater(function () {
                return debugr._createStepper(draw());
            }, 1000 / 60);
            this.repeater.start();
        }

        ProcessingDelegate.events.forEach(name => {
            var eventHandler = debugr.context[name];
            if (_isGeneratorFunction(eventHandler)) {
                if (name === "keyTyped") {
                    debugr.context.keyCode = 0;    // preserve existing behaviour
                }
                debugr.context[name] = function () {
                    debugr.queueGenerator(eventHandler);
                };
            }
        }, this);
    }

    static events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
}

function _isGeneratorFunction (value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

export = ProcessingDelegate;
