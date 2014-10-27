/*global recast */

function Stepper(context) {
    this.context = context;
    this.lines = {};
    this.breakpoints = {};
    this.b = recast.types.builders;
}

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    console.log(this.debugCode);
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

Stepper.prototype.setBreakpoint = function (lineno) {
    this.breakpoints[lineno] = true;
};

Stepper.prototype.clearBreakpoint = function (lineno) {
    delete this.breakpoints[lineno];
};


Stepper.prototype.createObjectExpression = function (obj) {
    var props = [];
    for (var prop in obj) {
        var val = typeof obj[prop] === 'object' ? obj[prop] : this.b.literal(obj[prop]);
        props.push(this.b.property('init', this.b.literal(prop), val));
    }
    return this.b.objectExpression(props);
};

Stepper.prototype.generateDebugCode = function (code) {
    this.ast = recast.parse(code);

    this.ast.program.body.forEach(function (statement) {
        var loc = statement.loc;
        if (loc !== null) {
            this.lines[loc.start.line] = statement;
        }
    }, this);

    this.handleProgram(this.ast.program);

    return "return function*(){\nwith(arguments[0]){\n"
        + recast.print(this.ast).code + "\n}\n}";
};

// TODO: create an Injector object
// TODO: refactor to use ast-walker
Stepper.prototype.handleProgram = function (program) {
    // depth first
    var i;
    var len = program.body.length;

    for (i = 0; i < len; i++) {
        var statement = program.body[i];
        if (statement.type === "ForStatement") {
            this.handleForStatement(statement);
        }
    }

    this.insertYield(program, 0);
    for (i = 0; i < len - 1; i++) {
        this.insertYield(program, 2 * i + 2);
    }
};

Stepper.prototype.handleForStatement = function (forStatement) {
    this.handleBlockStatement(forStatement.body);
};

Stepper.prototype.handleBlockStatement = function (blockStatement) {
    var len = blockStatement.body.length;
    this.insertYield(blockStatement, 0);    // is this necessary?
    for (var i = 0; i < len - 1; i++) {
        this.insertYield(blockStatement, 2 * i + 2);
    }
};

//Stepper.prototype.handleFor

Stepper.prototype.insertYield = function (program, index) {
    var loc = program.body[index].loc;
    var node = this.b.expressionStatement(
        this.b.yieldExpression(
            this.createObjectExpression({
                lineno: loc.start.line
            }),
            false
        )
    );

    program.body.splice(index, 0, node);
};

//module.exports = Stepper;
