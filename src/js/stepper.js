define(function (require) {

    var recast = require("recast");

    function Stepper(context) {
        this.context = context;
        this.lines = {};
        this.b = recast.types.builders;
    }

    Stepper.prototype.load = function (code) {
        this.debugCode = this.generateDebugCode(code);
        this.stepIterator = ((new Function(this.debugCode))())(this.context);
    };

    Stepper.prototype.reset = function () {
        this.stepIterator = ((new Function(this.debugCode))())(this.context);
    };

    Stepper.prototype.run = function () {
        while (!this.halted()) {
            this.stepOver();
        }
    };

    Stepper.prototype.stepOver = function () {
        return this.stepIterator.next();
    };

    Stepper.prototype.stepIn = function () {
        throw "'stepIn' isn't implemented yet";
    };

    Stepper.prototype.stepOut = function () {
        throw "'stepOut' isn't implemented yet";
    };


    Stepper.prototype.halted = function () {

    };

    Stepper.prototype.paused = function () {

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
        var ast = recast.parse(code);

        ast.program.body.forEach(function (statement) {
            var loc = statement.loc;
            if (loc !== null) {
                this.lines[loc.start.line] = statement;
            }
        }, this);

        var len = ast.program.body.length;
        this.insertYield(ast.program, 0);
        for (var i = 0; i < len - 1; i++) {
            this.insertYield(ast.program, 2 * i + 2);
        }

        return "return function*(){\nwith(arguments[0]){\n"
            + recast.print(ast).code + "\n}\n}"
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
        program.body.splice(index, 0, node);
    };

    return Stepper;
});
