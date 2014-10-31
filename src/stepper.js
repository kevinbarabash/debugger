/*global recast, esprima, escodegen, injector */

function Stepper(context) {
    if (!Stepper.isBrowserSupported()) {
        throw "this browser is not supported";
    }
    this.context = context;
    this.lines = {};
    this.breakpoints = {};
}

Stepper.isBrowserSupported = function () {
    try{
        return Function("\nvar generator = (function* () {\n  yield* (function* () {\n    yield 5; yield 6;\n  }());\n}());\n\nvar item = generator.next();\nvar passed = item.value === 5 && item.done === false;\nitem = generator.next();\npassed    &= item.value === 6 && item.done === false;\nitem = generator.next();\npassed    &= item.value === undefined && item.done === true;\nreturn passed;\n  ")()
    }catch(e){
        return false;
    }
};

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
        var result = this.stepIn();

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

Stepper.prototype.runScope = function () {
    if (!this.scopes.isEmpty()) {
        while (true) {
            var result = this.scopes.peek().next();

            if (result.value && result.value.lineno) {
                if (this.breakpoints[result.value.lineno]) {
                    console.log("breakpoint hit");
                    return result;
                }
            }

            if (result.done) {
                break;
            } else if (result.value.generator) {
                this.scopes.push(result.value.generator);
                this.runScope();
                this.scopes.pop();
            }
        }
    }
};

Stepper.prototype.stepOver = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        var result = this.scopes.peek().next();

        if (result.done) {
            this.scopes.pop();
            if (this.scopes.isEmpty()) {
                console.log("halted");
                return { done: true };
            }
            result = this.scopes.peek().next();
        } else if (result.value.generator) {
            this.scopes.push(result.value.generator);
            this.runScope();
            this.scopes.pop();
            result = this.scopes.peek().next();
        }

        value = result.value;   // contains lineno
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
    var value;

    if (!this.scopes.isEmpty()) {
        var result = this.scopes.peek().next();

        if (result.done) {
            this.scopes.pop();
            if (this.scopes.isEmpty()) {
                console.log("halted");
                return { done: true };
            }
            result = this.scopes.peek().next();
        } else if (result.value.generator) {
            this.scopes.push(result.value.generator);
            result = this.scopes.peek().next();
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

Stepper.prototype.stepOut = function () {
    var value;

    if (!this.scopes.isEmpty()) {
        this.runScope();
        this.scopes.pop();

        if (this.scopes.isEmpty()) {
            console.log("halted");
            return { done: true };
        }

        var result = this.scopes.peek().next();
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

    injector.process(this.ast, this.context);

    return "return function*(){\nwith(arguments[0]){\n"
        + escodegen.generate(this.ast) + "\n}\n}";
};
