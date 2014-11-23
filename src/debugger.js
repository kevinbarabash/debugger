/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

function Debugger(context) {
    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.breakpoints = {};
    this.scheduler = new Scheduler();
}

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
    this.main = debugFunction();
};

Debugger.prototype.start = function () {
    this.scheduler.clear();

    var generator = this.main(this.context);
    var task = new Stepper(generator);
    this.scheduler.addTask(task);

    // clear all task from the scheduler
    // schedule a single run of the main generator
    // after the main generator completes schedule any recurring tasks, e.g. draw
    // need to wait until main completes, because main defines "draw"
};

Debugger.prototype.pause = function () {
    // if we aren't paused, break at the start of the next stepper task

};

Debugger.prototype.resume = function () {
    // continue running if we paused, run to the next breakpoint

};

Debugger.prototype.currentFrameStack = function () {
    var task = scheduler.currentTask();
    if (task !== null) {
        return task.stack;
    } else {
        return null;
    }
};

Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

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
