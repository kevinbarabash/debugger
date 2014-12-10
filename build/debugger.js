!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Debugger=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var basic = require("../node_modules/basic-ds/lib/basic");
var Scheduler = (function () {
    function Scheduler() {
        this.queue = new basic.LinkedList();
    }
    Scheduler.prototype.addTask = function (task) {
        var _this = this;
        var done = task.doneCallback;
        task.doneCallback = function () {
            _this.removeTask(task);
            done();
        };
        this.queue.push_front(task);
        this.tick();
    };
    Scheduler.prototype.tick = function () {
        var _this = this;
        setTimeout(function () {
            var currentTask = _this.currentTask();
            if (currentTask !== null && !currentTask.started) {
                currentTask.start();
                _this.tick();
            }
        }, 0);
    };
    Scheduler.prototype.removeTask = function (task) {
        if (task === this.currentTask()) {
            this.queue.pop_back();
            this.tick();
        }
        else {
            throw "not the current task";
        }
    };
    Scheduler.prototype.currentTask = function () {
        return this.queue.last ? this.queue.last.value : null;
    };
    Scheduler.prototype.clear = function () {
        this.queue.clear();
    };
    Scheduler.prototype.createRepeater = function (createFunc, delay) {
        var _repeat = true;
        var _scheduler = this;
        var _delay = delay;
        function repeatFunc() {
            if (!_repeat) {
                return;
            }
            var task = createFunc();
            var done = task.doneCallback;
            task.doneCallback = function () {
                if (_repeat) {
                    setTimeout(repeatFunc, _delay);
                }
                done();
            };
            _scheduler.addTask(task);
        }
        var repeater = {
            stop: function () {
                _repeat = false;
            },
            start: function () {
                repeatFunc();
            }
        };
        Object.defineProperty(repeater, "delay", {
            get: function () {
                return _delay;
            },
            set: function (delay) {
                _delay = delay;
            }
        });
        return repeater;
    };
    return Scheduler;
})();
module.exports = Scheduler;

},{"../node_modules/basic-ds/lib/basic":2}],2:[function(require,module,exports){
var basic;
(function (basic) {
    var ListNode = (function () {
        function ListNode(value) {
            this.value = value;
            this.next = null;
            this.prev = null;
        }
        ListNode.prototype.destroy = function () {
            this.value = null;
            this.prev = null;
            this.next = null;
        };
        return ListNode;
    })();
    basic.ListNode = ListNode;
    var LinkedList = (function () {
        function LinkedList() {
            this.first = null;
            this.last = null;
        }
        LinkedList.prototype.push_back = function (value) {
            var node = new ListNode(value);
            if (this.first === null && this.last === null) {
                this.first = node;
                this.last = node;
            }
            else {
                node.prev = this.last;
                this.last.next = node;
                this.last = node;
            }
        };
        LinkedList.prototype.push_front = function (value) {
            var node = new ListNode(value);
            if (this.first === null && this.last === null) {
                this.first = node;
                this.last = node;
            }
            else {
                node.next = this.first;
                this.first.prev = node;
                this.first = node;
            }
        };
        LinkedList.prototype.pop_back = function () {
            if (this.last) {
                var value = this.last.value;
                if (this.last.prev) {
                    var last = this.last;
                    this.last = last.prev;
                    this.last.next = null;
                    last.destroy();
                }
                else {
                    this.last = null;
                    this.first = null;
                }
                return value;
            }
            else {
                return null;
            }
        };
        LinkedList.prototype.pop_front = function () {
            if (this.first) {
                var value = this.first.value;
                if (this.first.next) {
                    var first = this.first;
                    this.first = first.next;
                    this.first.prev = null;
                    first.destroy();
                }
                else {
                    this.first = null;
                    this.last = null;
                }
                return value;
            }
            else {
                return null;
            }
        };
        LinkedList.prototype.clear = function () {
            this.first = this.last = null;
        };
        LinkedList.prototype.insertBeforeNode = function (refNode, value) {
            if (refNode === this.first) {
                this.push_front(value);
            }
            else {
                var node = new ListNode(value);
                node.prev = refNode.prev;
                node.next = refNode;
                refNode.prev.next = node;
                refNode.prev = node;
            }
        };
        LinkedList.prototype.forEachNode = function (callback, _this) {
            var node = this.first;
            var index = 0;
            while (node !== null) {
                callback.call(_this, node, index);
                node = node.next;
                index++;
            }
        };
        LinkedList.prototype.forEach = function (callback, _this) {
            this.forEachNode(function (node, index) { return callback.call(_this, node.value, index); }, _this);
        };
        LinkedList.prototype.nodeAtIndex = function (index) {
            var i = 0;
            var node = this.first;
            while (node !== null) {
                if (index === i) {
                    return node;
                }
                i++;
                node = node.next;
            }
            return null;
        };
        LinkedList.prototype.valueAtIndex = function (index) {
            var node = this.nodeAtIndex(index);
            return node ? node.value : undefined;
        };
        LinkedList.prototype.toArray = function () {
            var array = [];
            var node = this.first;
            while (node !== null) {
                array.push(node.value);
                node = node.next;
            }
            return array;
        };
        LinkedList.fromArray = function (array) {
            var list = new LinkedList();
            array.forEach(function (value) {
                list.push_back(value);
            });
            return list;
        };
        return LinkedList;
    })();
    basic.LinkedList = LinkedList;
})(basic || (basic = {}));
var basic;
(function (basic) {
    var Stack = (function () {
        function Stack() {
            this.items = [];
            this.poppedLastItem = function (item) {
            };
        }
        Stack.prototype.push = function (item) {
            this.items.push(item);
        };
        Stack.prototype.pop = function () {
            var item = this.items.pop();
            if (this.isEmpty) {
                this.poppedLastItem(item);
            }
            return item;
        };
        Stack.prototype.peek = function () {
            return this.items[this.items.length - 1];
        };
        Object.defineProperty(Stack.prototype, "size", {
            get: function () {
                return this.items.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Stack.prototype, "isEmpty", {
            get: function () {
                return this.items.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        return Stack;
    })();
    basic.Stack = Stack;
})(basic || (basic = {}));
module.exports = basic;

},{}],3:[function(require,module,exports){
var Stepper = require("./stepper");
var Scheduler = require("../external/scheduler/lib/scheduler");
var transform = require("./transform");
var DefaultDelegate = (function () {
    function DefaultDelegate() {
    }
    DefaultDelegate.prototype.willStart = function (debugr) {
    };
    DefaultDelegate.prototype.finishedMainFunction = function (debugr) {
    };
    DefaultDelegate.prototype.finishedEventLoopFunction = function () {
    };
    DefaultDelegate.prototype.hitBreakpoint = function () {
    };
    DefaultDelegate.prototype.objectInstantiated = function (classFn, className, obj, args) {
    };
    return DefaultDelegate;
})();
var Debugger = (function () {
    function Debugger(context, delegate) {
        var _this = this;
        if (context === void 0) { context = {}; }
        if (delegate === void 0) { delegate = new DefaultDelegate(); }
        this.context = context;
        this.delegate = delegate;
        this.context.__instantiate__ = function (classFn, className) {
            var obj = Object.create(classFn.prototype);
            var args = Array.prototype.slice.call(arguments, 2);
            var gen = classFn.apply(obj, args);
            _this.delegate.objectInstantiated(classFn, className, obj, args);
            if (gen) {
                gen.obj = obj;
                return gen;
            }
            else {
                return obj;
            }
        };
        this.scheduler = new Scheduler();
        this.breakpoints = {};
        this.breakpointsEnabled = true;
        this._paused = false;
    }
    Debugger.isBrowserSupported = function () {
        try {
            var code = "\n" + "var generator = (function* () {\n" + "  yield* (function* () {\n" + "    yield 5; yield 6;\n" + "  }());\n" + "}());\n" + "\n" + "var item = generator.next();\n" + "var passed = item.value === 5 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === 6 && item.done === false;\n" + "item = generator.next();\n" + "passed &= item.value === undefined && item.done === true;\n" + "return passed;";
            return Function(code)();
        }
        catch (e) {
            return false;
        }
    };
    Debugger.prototype.load = function (code) {
        var debugCode = transform(code, this.context);
        var debugFunction = new Function(debugCode);
        this.mainGenerator = debugFunction();
    };
    Debugger.prototype.start = function (paused) {
        this.scheduler.clear();
        this.delegate.willStart(this);
        var stepper = this._createStepper(this.mainGenerator(this.context), true);
        this.scheduler.addTask(stepper);
        stepper.start(paused);
    };
    Debugger.prototype.queueGenerator = function (gen) {
        if (!this.done) {
            var stepper = this._createStepper(gen());
            this.scheduler.addTask(stepper);
        }
    };
    Debugger.prototype.resume = function () {
        if (this._paused) {
            this._paused = false;
            this._currentStepper.resume();
        }
    };
    Debugger.prototype.stepIn = function () {
        if (this._paused) {
            this._currentStepper.stepIn();
        }
    };
    Debugger.prototype.stepOver = function () {
        if (this._paused) {
            this._currentStepper.stepOver();
        }
    };
    Debugger.prototype.stepOut = function () {
        if (this._paused) {
            this._currentStepper.stepOut();
        }
    };
    Debugger.prototype.stop = function () {
        this.done = true;
    };
    Object.defineProperty(Debugger.prototype, "paused", {
        get: function () {
            return this._paused;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentStack", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper !== null) {
                return stepper.stack.items.map(function (frame) {
                    return {
                        name: frame.name,
                        line: frame.line
                    };
                });
            }
            else {
                return [];
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentScope", {
        get: function () {
            var stepper = this._currentStepper;
            if (stepper) {
                var scope = stepper.stack.peek().scope;
                if (scope) {
                    return scope;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Debugger.prototype, "currentLine", {
        get: function () {
            if (this._paused) {
                return this._currentStepper.line;
            }
        },
        enumerable: true,
        configurable: true
    });
    Debugger.prototype.setBreakpoint = function (line) {
        this.breakpoints[line] = true;
    };
    Debugger.prototype.clearBreakpoint = function (line) {
        delete this.breakpoints[line];
    };
    Object.defineProperty(Debugger.prototype, "_currentStepper", {
        get: function () {
            return this.scheduler.currentTask();
        },
        enumerable: true,
        configurable: true
    });
    Debugger.prototype._createStepper = function (genObj, isMain) {
        var _this = this;
        var stepper = new Stepper(genObj, this.breakpoints, function () {
            _this._paused = true;
            _this.delegate.hitBreakpoint();
        }, function () {
            _this._paused = false;
            _this.delegate.finishedEventLoopFunction();
            if (isMain) {
                _this.delegate.finishedMainFunction(_this);
            }
        });
        stepper.breakpointsEnabled = this.breakpointsEnabled;
        return stepper;
    };
    return Debugger;
})();
module.exports = Debugger;

},{"../external/scheduler/lib/scheduler":1,"./stepper":4,"./transform":5}],4:[function(require,module,exports){
var basic = require("../node_modules/basic-ds/lib/basic");
var Frame = (function () {
    function Frame(gen, line) {
        this.gen = gen;
        this.line = line;
    }
    return Frame;
})();
function emptyCallback() {
}
var Stepper = (function () {
    function Stepper(genObj, breakpoints, breakCallback, doneCallback) {
        var _this = this;
        if (breakCallback === void 0) { breakCallback = emptyCallback; }
        if (doneCallback === void 0) { doneCallback = emptyCallback; }
        this.breakCallback = breakCallback;
        this.doneCallback = doneCallback;
        this._breakpoints = breakpoints || {};
        this.breakpointsEnabled = true;
        this._started = false;
        this._paused = false;
        this._stopped = false;
        this.stack = new basic.Stack();
        this.stack.push(new Frame(genObj, -1));
        this.stack.poppedLastItem = function () {
            _this._stopped = true;
            _this.doneCallback();
        };
        this._retVal = undefined;
    }
    Stepper.prototype.stepIn = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this.stack.push(new Frame(result.value.gen, this.line));
                    this.stepIn();
                    return "stepIn";
                }
                else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return "stepOut";
            }
            return "stepOver";
        }
    };
    Stepper.prototype.stepOver = function () {
        var result;
        if (result = this._step()) {
            if (result.value && result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                    if (result.value.stepAgain) {
                        this.stepOver();
                    }
                    return "stepOver";
                }
                else {
                    this._retVal = result.value.gen;
                    if (result.value.stepAgain) {
                        result = this._step();
                    }
                }
            }
            if (result.done) {
                this._popAndStoreReturnValue(result.value);
                return "stepOut";
            }
            return "stepOver";
        }
    };
    Stepper.prototype.stepOut = function () {
        var result;
        if (result = this._step()) {
            while (!result.done) {
                if (result.value.hasOwnProperty('gen')) {
                    if (_isGenerator(result.value.gen)) {
                        this._runScope(result.value.gen);
                    }
                    else {
                        this._retVal = result.value.gen;
                    }
                }
                result = this._step();
            }
            this._popAndStoreReturnValue(result.value);
            return "stepOut";
        }
    };
    Stepper.prototype.start = function (paused) {
        this._started = true;
        this._paused = !!paused;
        this._run();
    };
    Stepper.prototype.resume = function () {
        this._paused = false;
        this._run();
    };
    Stepper.prototype._run = function () {
        var currentLine = this.line;
        while (true) {
            if (this.stack.isEmpty) {
                break;
            }
            var action = this.stepIn();
            if (this.breakpointsEnabled && this._breakpoints[this.line] && action !== "stepOut" && currentLine !== this.line) {
                this._paused = true;
            }
            if (this._paused) {
                this.breakCallback();
                break;
            }
            currentLine = this.line;
        }
    };
    Stepper.prototype.setBreakpoint = function (line) {
        this._breakpoints[line] = true;
    };
    Stepper.prototype.clearBreakpoint = function (line) {
        delete this._breakpoints[line];
    };
    Object.defineProperty(Stepper.prototype, "started", {
        get: function () {
            return this._started;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "stopped", {
        get: function () {
            return this._stopped;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Stepper.prototype, "line", {
        get: function () {
            if (!this._stopped) {
                return this.stack.peek().line;
            }
            else {
                return -1;
            }
        },
        enumerable: true,
        configurable: true
    });
    Stepper.prototype._step = function () {
        if (this.stack.isEmpty) {
            return;
        }
        var frame = this.stack.peek();
        var result = frame.gen.next(this._retVal);
        this._retVal = undefined;
        if (result.value) {
            if (result.value.scope) {
                this.stack.peek().scope = result.value.scope;
            }
            if (result.value.name) {
                this.stack.peek().name = result.value.name;
            }
            if (result.value.line) {
                frame.line = result.value.line;
            }
        }
        return result;
    };
    Stepper.prototype._runScope = function (gen) {
        this.stack.push(new Frame(gen, this.line));
        var result = this._step();
        while (!result.done) {
            if (result.value.gen) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                }
                else {
                    this._retVal = result.value.gen;
                }
            }
            result = this._step();
        }
        this._popAndStoreReturnValue(result.value);
    };
    Stepper.prototype._popAndStoreReturnValue = function (value) {
        var frame = this.stack.pop();
        this._retVal = frame.gen["obj"] || value;
    };
    return Stepper;
})();
var _isGenerator = function (obj) {
    return obj instanceof Object && obj.toString() === "[object Generator]";
};
module.exports = Stepper;

},{"../node_modules/basic-ds/lib/basic":6}],5:[function(require,module,exports){
/*global recast, esprima, escodegen, injector */

var builder = require("./../src/ast-builder");
var basic = require("basic-ds");

function getScopeVariables (node, parent, context) {
    var variables = parent.__$escope$__.variables;
    return variables.filter(function (variable) {
        // don't include context variables in the scopes
        if (node.type === "Program" && context.hasOwnProperty(variable.name)) {
            return false;
        }
        // function declarations like "function Point() {}"
        // don't work properly when defining methods on the
        // prototoype so filter those out as well
        var isFunctionDeclaration = variable.defs.some(function (def) {
            return def.type      === "FunctionName" &&
                def.node.type === "FunctionDeclaration";
        });
        if (isFunctionDeclaration) {
            return false;
        }
        // filter out "arguments"
        // TODO: make this optional, advanced users may want to inspect this
        if (variable.name === "arguments") {
            return false;
        }
        return true;
    });
}

// insert yield { line: <line_number> } in between each line
function insertYields (bodyList) {
    bodyList.forEachNode(function (node) {
        var loc = node.value.loc;
        var yieldExpression = builder.createExpressionStatement(
            builder.createYieldExpression(
                builder.createObjectExpression({ line: loc.start.line })
            )
        );
        // add an extra property to differentiate function calls
        // that are followed by a statment from those that aren't
        // the former requires taking an extra _step() to get the
        // next line
        if (node.value.type === "ExpressionStatement") {
            if (node.value.expression.type === "YieldExpression") {
                node.value.expression.argument.properties.push(
                    builder.createProperty("stepAgain", true)
                );
            }
            if (node.value.expression.type === "AssignmentExpression") {
                var expr = node.value.expression.right;
                if (expr.type === "YieldExpression") {
                    expr.argument.properties.push(
                        builder.createProperty("stepAgain", true)
                    );
                }
            }
        }
        // TODO: add test case for "var x = foo()" stepAgain
        // TODO: add test case for "var x = foo(), y = foo()" stepAgain on last decl
        if (node.value.type === "VariableDeclaration") {
            var lastDecl = node.value.declarations[node.value.declarations.length - 1];
            if (lastDecl.init && lastDecl.init.type === "YieldExpression") {
                lastDecl.init.argument.properties.push(
                    builder.createProperty("stepAgain", true)
                );
            }
        }
        bodyList.insertBeforeNode(node, yieldExpression);
    });
}

function create__scope__ (node, bodyList, scope) {
    var properties = scope.map(function (variable) {
        var isParam = variable.defs.some(function (def) {
            return def.type === "Parameter";
        });
        var name = variable.name;

        // if the variable is a parameter initialize its
        // value with the value of the parameter
        var value = isParam ? builder.createIdentifier(name) : builder.createIdentifier("undefined");
        return {
            type: "Property",
            key: builder.createIdentifier(name),
            value: value,
            kind: "init"
        }
    });

    // modify the first yield statement to include the scope
    // as part of the value
    var firstStatement = bodyList.first.value;
    firstStatement.expression.argument.properties.push({
        type: "Property",
        key: builder.createIdentifier("scope"),
        value: builder.createIdentifier("__scope__"),
        kind: "init"
    });

    // wrap the body with a yield statement
    var withStatement = builder.createWithStatement(
        builder.createIdentifier("__scope__"),
        builder.createBlockStatement(bodyList.toArray())
    );
    var objectExpression = {
        type: "ObjectExpression",
        properties: properties
    };

    // replace the body with "var __scope__ = { ... }; with(__scope___) { body }"
    node.body = [
        builder.createVariableDeclaration([
            builder.createVariableDeclarator("__scope__", objectExpression)
        ]),
        withStatement
    ];
}

function stringForId(node) {
    var name = "";
    if (node.type === "Identifier") {
        name = node.name;
    } else if (node.type === "MemberExpression") {
        name = stringForId(node.object) + "." + node.property.name;
    } else if (node.type === "ThisExpression") {
        name = "this";
    } else {
        throw "can't call stringForId on nodes of type '" + node.type + "'";
    }
    return name;
}

function getNameForFunctionExpression(node) {
    var name = "";
    if (node._parent.type === "Property") {
        name = node._parent.key.name;
        if (node._parent._parent.type === "ObjectExpression") {
            name = getNameForFunctionExpression(node._parent._parent) + "." + name;
        }
    } else if (node._parent.type === "AssignmentExpression") {
        name = stringForId(node._parent.left);
    } else if (node._parent.type === "VariableDeclarator") {
        name = stringForId(node._parent.id);
    } else {
        name = "<anonymous>"; // TODO: test anonymous callbacks
    }
    return name;
}

function transform(code, context) {
    var ast = esprima.parse(code, { loc: true });
    var scopeManager = escope.analyze(ast);
    scopeManager.attach();

    estraverse.replace(ast, {
        enter: function(node, parent) {
            node._parent = parent;
        },
        leave: function(node, parent) {
            if (node.type === "Program" || node.type === "BlockStatement") {
                if (parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration" || node.type === "Program") {
                    var scope = getScopeVariables(node, parent, context);
                }

                var bodyList = basic.LinkedList.fromArray(node.body);
                insertYields(bodyList);

                if (bodyList.first) {
                    if (parent.type === "FunctionDeclaration") {
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral(stringForId(parent.id)),   // NOTE: identifier can be a member expression too!
                            kind: "init"
                        });
                    } else if (parent.type === "FunctionExpression") {
                        var name = getNameForFunctionExpression(parent);
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral(name),
                            kind: "init"
                        });
                    } else if (node.type === "Program") {
                        bodyList.first.value.expression.argument.properties.push({
                            type: "Property",
                            key: builder.createIdentifier("name"),
                            value: builder.createLiteral("<PROGRAM>"),
                            kind: "init"
                        });
                    }
                }

                // if there are any variables defined in this scope
                // create a __scope__ dictionary containing their values
                // and include in the first yield
                if (scope && scope.length > 0 && bodyList.first) {
                    // TODO: inject at least one yield statement into an empty bodyList so that we can step into empty functions
                    create__scope__(node, bodyList, scope);
                } else {
                    node.body = bodyList.toArray();
                }
            } else if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                node.generator = true;
            } else if (node.type === "CallExpression" || node.type === "NewExpression") {
                if (node.callee.type === "Identifier" || node.callee.type === "MemberExpression" || node.callee.type === "YieldExpression") {

                    var gen = node;

                    // if "new" then build a call to "__instantiate__"
                    if (node.type === "NewExpression") {
                        // put the constructor name as the 2nd param
                        if (node.callee.type === "Identifier") {
                            node.arguments.unshift(builder.createLiteral(node.callee.name));
                        } else {
                            node.arguments.unshift(builder.createLiteral(null));
                        }
                        // put the constructor itself as the 1st param
                        node.arguments.unshift(node.callee);
                        gen = builder.createCallExpression("__instantiate__", node.arguments);
                    }

                    // create a yieldExpress to wrap the call
                    return builder.createYieldExpression(
                        builder.createObjectExpression({ gen: gen })
                    );
                } else {
                    throw "we don't handle '" + node.callee.type + "' callees";
                }
            }

            delete node._parent;
        }
    });

    return "return function*(context){\nwith(context){\n" +
            escodegen.generate(ast) + "\n}\n}";
}

module.exports = transform;

},{"./../src/ast-builder":7,"basic-ds":6}],6:[function(require,module,exports){
module.exports=require(2)
},{"/Users/kevin/live-editor/external/stepper/external/scheduler/node_modules/basic-ds/lib/basic.js":2}],7:[function(require,module,exports){
/* build Parser API style AST nodes and trees */

var createExpressionStatement = function (expression) {
    return {
        type: "ExpressionStatement",
        expression: expression
    };
};

var createBlockStatement = function (body) {
    return {
        type: "BlockStatement",
        body: body
    }
};

var createCallExpression = function (name, arguments) {
    return {
        type: "CallExpression",
        callee: createIdentifier(name),
        arguments: arguments
    };
};

var createYieldExpression = function (argument) {
    return {
        type: "YieldExpression",
        argument: argument
    };
};

var createObjectExpression = function (obj) {
    var properties = Object.keys(obj).map(function (key) {
        var value = obj[key];
        return createProperty(key, value);
    });

    return {
        type: "ObjectExpression",
        properties: properties
    };
};

var createProperty = function (key, value) {
    var expression;
    if (value instanceof Object) {
        if (value.type === "CallExpression" || value.type === "NewExpression") {
            expression = value;
        } else {
            expression = createObjectExpression(value);
        }
    } else if (value === undefined) {
        expression = createIdentifier("undefined");
    } else {
        expression = createLiteral(value);
    }

    return {
        type: "Property",
        key: createIdentifier(key),
        value: expression,
        kind: "init"
    }
};

var createIdentifier = function (name) {
    return {
        type: "Identifier",
        name: name
    };
};

var createLiteral = function (value) {
    if (value === undefined) {
        throw "literal value undefined";
    }
    return {
        type: "Literal",
        value: value
    }
};

var createWithStatement = function (obj, body) {
    return {
        type: "WithStatement",
        object: obj,
        body: body
    };
};

var createAssignmentExpression = function (name, value) {
    return {
        type: "AssignmentExpression",
        operator: "=",
        left: createIdentifier(name),
        right: value
    }
};

var createVariableDeclarator = function (name, value) {
    return {
        type: "VariableDeclarator",
        id: createIdentifier(name),
        init: value
    };
};

// a declaration is a subclass of statement
var createVariableDeclaration = function (declarations) {
    return {
        type: "VariableDeclaration",
        declarations: declarations,
        kind: "var"
    };
};

var replaceNode = function (parent, name, replacementNode) {
    if (name.indexOf("arguments") === 0) {
        var index = name.match(/\[([0-1]+)\]/)[1];
        parent.arguments[index] = replacementNode;
    } else {
        parent[name] = replacementNode;
    }
};

exports.createExpressionStatement = createExpressionStatement;
exports.createBlockStatement = createBlockStatement;
exports.createCallExpression = createCallExpression;
exports.createYieldExpression = createYieldExpression;
exports.createObjectExpression = createObjectExpression;
exports.createProperty = createProperty;
exports.createIdentifier = createIdentifier;
exports.createLiteral = createLiteral;
exports.createWithStatement = createWithStatement;
exports.createAssignmentExpression = createAssignmentExpression;
exports.createVariableDeclaration = createVariableDeclaration;
exports.createVariableDeclarator = createVariableDeclarator;
exports.replaceNode = replaceNode;

},{}]},{},[3])(3)
});