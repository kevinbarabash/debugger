import Debugger = require("./debugger");

function emptyFunction() {}

class ProcessingDebugger extends Debugger {
    private _repeater: { stop: () => void; start: () => void; };

    // TODO: change to single options param
    constructor(context: Object, onBreakpoint?: () => void, onFunctionDone?: () => void) {
        super(context, onBreakpoint, onFunctionDone);
        this._repeater = null;
    }

    onMainStart() {
        if (this._repeater) {
            this._repeater.stop();
        }

        // reset all event handlers
        // TODO: write a test for this
        ProcessingDebugger.events.forEach(event => this.context[event] = emptyFunction);

        // reset draw
        this.context.draw = emptyFunction;
    }

    onMainDone() {
        var draw = this.context.draw;

        if (draw !== emptyFunction) {
            this._repeater = this.scheduler.createRepeater(
                () => this._createStepper(draw()),
                1000 / 60
            );
            this._repeater.start();
        }

        ProcessingDebugger.events.forEach(name => {
            var eventHandler = this.context[name];

            if (_isGeneratorFunction(eventHandler)) {
                if (name === "keyTyped") {
                    this.context.keyCode = 0;    // preserve existing behaviour
                }

                this.context[name] = () => {
                    this.queueGenerator(eventHandler);
                };
            }
        });
    }

    static events = [
        "mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased",
        "keyPressed", "keyReleased", "keyTyped"
    ];
}

function _isGeneratorFunction (value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

export = ProcessingDebugger;
