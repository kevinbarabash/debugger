/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

function Debugger(context) {
    EventEmitter.call(this);

    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.breakpoints = {};
    this.scheduler = new Scheduler();
}

Debugger.prototype = new EventEmitter();

Debugger.isBrowserSupported = function () {
    try {
        var code = "\n" +
            "var generator = (function* () {\n" +
            "  yield* (function* () {\n" +
            "    yield 5; yield 6;\n" +
            "  }());\n" +
            "}());\n" +
            "\n" +
            "var item = generator.next();\n" +
            "var passed = item.value === 5 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === 6 && item.done === false;\n" +
            "item = generator.next();\n" +
            "passed &= item.value === undefined && item.done === true;\n" +
            "return passed;";
        return Function(code)()
    } catch(e) {
        return false;
    }
};

Debugger.prototype.load = function (code) {
    var debugCode = transform(code, this.context);
    var debugFunction = new Function(debugCode);
    this.mainGenerator = debugFunction();
};

Debugger.prototype.start = function () {
    this.scheduler.clear();

    var task = new Stepper(this.mainGenerator(this.context), this.breakpoints);
    task.on('done', this.handleMainDone.bind(this));

    var self = this;
    task.on('break', function () {
        self.emit('break');
    });
    task.on('done', function () {
        self.emit('done');
    });

    // when the scheduler finishes the last task in the queue it should
    // emit a message so that we can toggle buttons appropriately
    // if there's a draw function that's being run on a loop then we shouldn't toggle buttons

    this.scheduler.addTask(task);
    task.start();   // start the initial task synchronously
};

Debugger.prototype.queueRecurringGenerator = function (gen, delay) {
    if (this.done) {
        return;
    }

    var self = this;

    setTimeout(function () {
        self.queueGenerator(gen)
            .on('done', self.queueRecurringGenerator.bind(self, gen, delay))
    }, delay);
};

Debugger.prototype.queueGenerator = function (gen) {
    var task = new Stepper(gen(), this.breakpoints);
    var self = this;
    task.on('break', function () {
        self.emit('break');
    });
    task.on('done', function () {
        self.emit('done');
    });
    this.scheduler.addTask(task);
    return task;
};

// This should be run whenever the values of any of the special functions
// are changed.  This suggests using something like observe-js
Debugger.prototype.handleMainDone = function () {
    var draw = this.context.draw;
    if (draw) {
        this.queueRecurringGenerator(draw, 1000 / 60);
    }

    var self = this;

    var mouseClicked = this.context.mouseClicked;
    if (mouseClicked) {
        this.context.mouseClicked = function () {
            self.queueGenerator(mouseClicked);
        };
    }

    var mouseDragged = this.context.mouseDragged;
    if (mouseDragged) {
        this.context.mouseDragged = function () {
            self.queueGenerator(mouseDragged);
        };
    }
};

Debugger.prototype.pause = function () {
    // if we aren't paused, break at the start of the next stepper task

};

Debugger.prototype.resume = function () {
    // continue running if we paused, run to the next breakpoint
    var stepper = this.currentStepper();
    return stepper ? stepper.resume() : null;
};

Debugger.prototype.stop = function () {
    this.done = true;
};

Debugger.prototype.stepIn = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepIn() : null;
};

Debugger.prototype.stepOver = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepOver() : null;
};

Debugger.prototype.stepOut = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.stepOut() : null;
};

Debugger.prototype.currentStepper = function () {
    return this.scheduler.currentTask();
};

Debugger.prototype.currentStack = function () {
    var task = this.scheduler.currentTask();
    if (task !== null) {
        return task.stack;
    } else {
        return null;
    }
};

Debugger.prototype.currentLine = function () {
    var stepper = this.currentStepper();
    return stepper ? stepper.line() : null;
};

Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

/* PRIVATE */

function __instantiate__ (Class) {
    var obj = Object.create(Class.prototype);
    var args = Array.prototype.slice.call(arguments, 1);
    var gen = Class.apply(obj, args);

    if (gen) {
        gen.obj = obj;
        return gen;
    } else {
        return obj;
    }
}
