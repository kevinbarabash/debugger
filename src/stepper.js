/*global recast, esprima, escodegen, injector */

function Stepper (context) {
    this.context = context;

    this.yieldVal = undefined;
}

Stepper.prototype.generateDebugCode = function (code) {
    this.ast = esprima.parse(code, { loc: true });

    injector.process(this.ast, this.context);

    return "return function*(){\nwith(arguments[0]){\n"
        + escodegen.generate(this.ast) + "\n}\n}";
};

Stepper.prototype.load = function (code) {
    this.debugCode = this.generateDebugCode(code);
    this.reset();
};

Stepper.prototype.reset = function () {
    this.stack = new Stack();
    this.done = false;
    
    this.stack.push({
        gen: ((new Function(this.debugCode))())(this.context),
        lineno: 0
    });
};

Stepper.prototype.halted = function () {
    return this.done;
};

Stepper.prototype.step = function () {
    if (this.stack.isEmpty()) {
        this.done = true;
        return;
    }
    var frame = this.stack.peek();
    var result = frame.gen.next(this.yieldVal);
    this.yieldVal = undefined;
    return result;
};

Stepper.prototype.stepIn = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    if (result.done) {
        var frame = this.stack.pop();
        this.yieldVal = result.value;
        return frame.lineno;
    } else if (result.value.gen) {
        this.stack.push(result.value);
        result = this.step();   // step in
    }
    return result.value && result.value.lineno;
};

Stepper.prototype.stepOver = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    if (result.done) {
        var frame = this.stack.pop();
        
        if (this.stack.isEmpty()) {
            this.done = true;
        }
        
        this.yieldVal = result.value;
        return frame.lineno;
    } else if (result.value.gen) {
        this.stack.push(result.value);
        this.yieldVal = this.runScope();
        this.stack.pop();

        if (this.stack.isEmpty()) {
            this.done = true;
        }
        
        return this.stepOver();
    }
    return result.value && result.value.lineno;
};

Stepper.prototype.stepOut = function () {
    var result = this.step();
    if (this.done) {
        return;
    }
    while (!result.done) {
        if (result.value.gen) {
            this.stack.push(result.value);
            this.yieldVal = this.runScope();
            this.stack.pop();
        }
        result = this.step();
    }
    var frame = this.stack.pop();
    this.yieldVal = result.value;

    if (this.stack.isEmpty()) {
        this.done = true;
    }
    return frame.lineno;
};

Stepper.prototype.run = function () {
    while (!this.stack.isEmpty()) {
        var lineno = this.stepIn();
        if (lineno) {
            console.log("lineno: " + lineno);
        } else {
            console.log("no lineno");
        }
    }
    this.done = true;
};

Stepper.prototype.runScope = function () {
    var result = this.step();
    while (!result.done) {
        if (result.value.gen) {
            this.stack.push(result.value);
            this.yieldVal = this.runScope();
            this.stack.pop();
        }
        result = this.step();
    }
    return result.value;
};
