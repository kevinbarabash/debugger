/*global recast, esprima, escodegen, Injector */

function Stepper(context) {
    this.context = context;
    this.injector = new Injector(this.context);
    this.lines = {};
    this.breakpoints = {};
}

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    this.reset();
};

Stepper.prototype.reset = function () {
    this.scopes = new Stack();

    this.scopes.push(
        ((new Function(this.debugCode))())(this.context)
    );

    this.done = false;
};

Stepper.prototype.run = function () {
    while (!this.halted()) {
        var result = this.stepOver();

        // result returns the lineno of the next line
        if (result.value && result.value.lineno) {
            if (this.breakpoints[result.value.lineno]) {
                console.log("breakpoint hit");
                return result;
            }
        }
    }
    console.log("run finished");
};

Stepper.prototype.stepOver = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        var result = this.scopes.peek().next();

        if (result.done) {
            this.scopes.pop();
        } else if (result.value.generator) {
            this.scopes.push(result.value.generator);
        } 

        value = result.value;
        this.done = false;
    } else {
        this.done = true;
    }
    return {
        done: this.done,
        value: value
    }
};

Stepper.prototype.stepIn = function () {
    throw "'stepIn' isn't implemented yet";
};

Stepper.prototype.stepOut = function () {
    throw "'stepOut' isn't implemented yet";
};

Stepper.prototype.halted = function () {
    return this.done;
};

Stepper.prototype.paused = function () {

};

Stepper.prototype.setBreakpoint = function (lineno) {
    this.breakpoints[lineno] = true;
};

Stepper.prototype.clearBreakpoint = function (lineno) {
    delete this.breakpoints[lineno];
};


Stepper.prototype.generateDebugCode = function (code) {
    this.ast = esprima.parse(code, { loc: true });

    this.ast.body.forEach(function (statement) {
        var loc = statement.loc;
        if (loc !== null) {
            this.lines[loc.start.line] = statement;
        }
    }, this);

    this.injector.process(this.ast);

    return "return function*(){\nwith(arguments[0]){\n"
        + escodegen.generate(this.ast) + "\n}\n}";
};

function Stack () {
    this.values = [];
}

Stack.prototype.isEmpty = function () {
    return this.values.length === 0;
};

Stack.prototype.push = function (value) {
    this.values.push(value);
};

Stack.prototype.pop = function () {
    return this.values.pop();
};

Stack.prototype.peek = function () {
    return this.values[this.values.length - 1];
};
