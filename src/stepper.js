var recast = require("recast");

function Stepper(context) {
    this.context = context;
    this.lines = {};
    this.yields = {};
    this.b = recast.types.builders;
}

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    this.reset();
};

Stepper.prototype.reset = function () {
    this.stepIterator = ((new Function(this.debugCode))())(this.context);
    this.done = false;
    this.loc = null;
};

Stepper.prototype.run = function () {
    while (!this.halted()) {
        var result = this.stepOver();

        if (result.value && result.value.breakpoint) {
            console.log("breakpoint hit");
            return;
        }
    }
    console.log("run finished");
};

Stepper.prototype.stepOver = function () {
    var result = this.stepIterator.next();
    this.done = result.done;
    this.loc = result.value;
    return result;
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

Stepper.prototype.addBreakpoint = function (lineno) {
    if (this.yields.hasOwnProperty(lineno)) {
        var props = this.yields[lineno].argument.properties;
        // TODO: replace with lodash
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (prop.key.value === "breakpoint") {
                prop.value.value = true;

                // TODO: figure out how to set breakpoints while stepping
                this.debugCode = "return function*(){\nwith(arguments[0]){\n"
                    + recast.print(this.ast).code + "\n}\n}";
                this.stepIterator = ((new Function(this.debugCode))())(this.context);
            }
        }
    }
};

Stepper.prototype.removeBreakpoint = function (lineno) {

};


Stepper.prototype.createObjectExpression = function (obj) {
    var props = [];
    for (var prop in obj) {
        var val = typeof obj[prop] === 'object' ? obj[prop] : this.b.literal(obj[prop]);
        props.push(this.b.property('init', this.b.literal(prop), val));
    }
    return this.b.objectExpression(props);
};

// TODO: split this into generateAST and generateDebugCode
Stepper.prototype.generateDebugCode = function (code) {
    this.ast = recast.parse(code);

    this.ast.program.body.forEach(function (statement) {
        var loc = statement.loc;
        if (loc !== null) {
            this.lines[loc.start.line] = statement;
        }
    }, this);

    var len = this.ast.program.body.length;
    this.insertYield(this.ast.program, 0);
    for (var i = 0; i < len - 1; i++) {
        this.insertYield(this.ast.program, 2 * i + 2);
    }

    return "return function*(){\nwith(arguments[0]){\n"
        + recast.print(this.ast).code + "\n}\n}";
};

Stepper.prototype.insertYield = function (program, index) {
    var loc = program.body[index].loc;
    var node = this.b.expressionStatement(
        this.b.yieldExpression(
            this.createObjectExpression({
                breakpoint: false,
                start: this.createObjectExpression(loc.start),
                end: this.createObjectExpression(loc.end)
            }),
            false
        )
    );

    this.yields[loc.start.line] = node.expression;
    program.body.splice(index, 0, node);
};

module.exports = Stepper;
