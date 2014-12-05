/**
 * ProcessingDelegate is used to create a delegate instance which a
 * Debugger will use to customize its behaviour.  In this case, the
 * delegate resets event handlers and the "draw" method every time
 * the debugger starts.  Also, after the main program is finished
 * running it will set up a repeating "draw" function if "draw" has
 * been defined as well as set up any event handlers.
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

        // reset all event handlers
        ProcessingDelegate.events.forEach(function (event) {
            debugr.context[event] = undefined;
        }, this);

        // reset draw
        debugr.context.draw = undefined;
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
