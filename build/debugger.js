!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Debugger=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
/**
 * The debugger has the following responsibilites:
 * - create debug code and generators from source code
 * - create and schedule steppers
 * - maintain breakpoints and inform steppers of breakpoints
 */

var Stepper = require("./stepper");
var Scheduler = require("./scheduler");
var transform = require("./transform");
var EventEmitter = require("events").EventEmitter;

function Debugger(context) {
    EventEmitter.call(this);

    this.context = context || {};
    this.context.__instantiate__ = __instantiate__;

    this.scheduler = new Scheduler();

    this.breakpoints = {};
    this.breakpointsEnabled = true;     // needs getter/setter, e.g. this.enableBreakpoints()/this.disableBreakpoints();
    this._paused = false;               // read-only, needs a getter
}

Debugger.prototype = Object.create(EventEmitter.prototype);
Debugger.prototype.constructor = Debugger;

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

Debugger.prototype.start = function (paused) {
    this.scheduler.clear();
    // TODO: remove all event handlers

    var stepper = this._createStepper(this.mainGenerator(this.context));
    stepper.once("done", this.handleMainDone.bind(this));

    // TODO: have the schedule emit a message when its queue is empty so we can toggle buttons
    // if there's a draw function that's being run on a loop then we shouldn't toggle buttons

    this.scheduler.addTask(stepper);    // TODO: figure out how pause the stepper before running it
    this.scheduler.startTask(stepper);
    //stepper.start(paused);   // start the initial task synchronously
};

Debugger.prototype.queueGenerator = function (gen, repeat, delay) {
    if (this.done) {
        return;
    }

    var stepper = this._createStepper(gen());
    var self = this;
    stepper.once("done", function () {
        if (repeat) {
            setTimeout(function () {
                self.queueGenerator(gen, repeat, delay);
            }, delay);
        }
    });

    this.scheduler.addTask(stepper);
};

// This should be run whenever the values of any of the special functions
// are changed.  This suggests using something like observe-js
Debugger.prototype.handleMainDone = function () {
    var draw = this.context.draw;
    // TODO: create a repating task object that can be safely stopped
    if (_isGeneratorFunction(draw)) {
        this.queueGenerator(draw, "draw", true, 1000);
    }

    var self = this;
    var wrapProcessingEventHandler = function(name) {
        var eventHandler = self.context[name];
        if (_isGeneratorFunction(eventHandler)) {
            self.context[name] = function () {
                self.queueGenerator(eventHandler);
            };
        }
    };

    var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "keyPressed", "keyReleased", "keyTyped"];
    events.forEach(wrapProcessingEventHandler);
};

// TODO: implement a method to "pause" at the start of the next stepper

Debugger.prototype.resume = function () {
    if (this._paused) {
        this._paused = false;
        this._currentStepper().resume();
    }
};

Debugger.prototype.stepIn = function () {
    if (this._paused) {
        this._currentStepper().stepIn();
    }
};

Debugger.prototype.stepOver = function () {
    if (this._paused) {
        this._currentStepper().stepOver();
    }
};

Debugger.prototype.stepOut = function () {
    if (this._paused) {
        this._currentStepper().stepOut();
    }
};

Debugger.prototype.paused = function () {
    return this._paused;
};

// used by tests right now to stop execution
Debugger.prototype.stop = function () {
    this.done = true;
};

Debugger.prototype.currentStack = function () {
    var stepper = this._currentStepper();
    if (stepper !== null) {
        return stepper.stack.items.map(function (frame) {
            return {
                name: frame.name,
                line: frame.line
            };
        });
    } else {
        return [];
    }
};

Debugger.prototype.currentScope = function () {
    var stepper = this._currentStepper();
    if (stepper) {
        var scope = stepper.stack.peek().scope;
        if (scope) {
            return scope;
        }
    }
    return null;
};

Debugger.prototype.currentLine = function () {
    if (this._paused) {
        return this._currentStepper().line();
    }
};

Debugger.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Debugger.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

/* PRIVATE */

Debugger.prototype._currentStepper = function () {
    return this.scheduler.currentTask();
};

Debugger.prototype._createStepper = function (genObj) {
    var stepper = new Stepper(genObj, this.breakpoints);
    stepper.breakpointsEnabled = this.breakpointsEnabled;
    var self = this;
    var breakListener = function () {
        self._paused = true;
        self.emit("break");
    };
    stepper.on("break", breakListener);
    // TODO: write a test to detect the memory leak
    stepper.once("done", function () {
        stepper.removeListener("break", breakListener);
        self._paused = false;
        self.emit("done");
    });
    return stepper;
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

function _isGeneratorFunction (value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

module.exports = Debugger;

},{"./scheduler":5,"./stepper":6,"./transform":7,"events":2}],5:[function(require,module,exports){
/**
 * The purpose of the scheduler is to:
 * - add tasks to a queue in a certain order
 * - remove tasks from the queue when they have completed
 * - reschedule recurring tasks
 */

var basic = require("basic-ds");

function Scheduler () {
    this.queue = new basic.LinkedList();
}

Scheduler.prototype.addTask = function (task) {
    this.queue.push_front(task);
    this.tick();
};

Scheduler.prototype.tick = function () {
    var self = this;
    setTimeout(function () {
        var currentTask = self.currentTask();
        if (currentTask !== null && !currentTask.started()) {
            self.startTask(currentTask);
        }
    }, 0);  // defer execution
};

Scheduler.prototype.startTask = function (task) {
    var self = this;
    task.once("done", function () {
        var poppedTask = self.queue.pop_back();
        if (poppedTask !== null && !poppedTask.started()) {
            throw "popping a task that hasn't started";
        }
        self.tick();
    });
    task.start();
};

Scheduler.prototype.currentTask = function () {
    return this.queue.last ? this.queue.last.value : null;
};

Scheduler.prototype.clear = function () {
    this.queue.forEach(function (task) {
        task.removeAllListeners("done");
    });
    this.queue.clear();
};

module.exports = Scheduler;

},{"basic-ds":1}],6:[function(require,module,exports){
/*global recast, esprima, escodegen, injector */

var EventEmitter = require("events").EventEmitter;
var basic = require("basic-ds");

function Action (type, line) {
    this.type = type;
    this.line = line;
}

function Frame (gen, line) {
    this.gen = gen;
    this.line = line;
}

function Stepper (genObj, breakpoints) {
    EventEmitter.call(this);

    this.breakpoints = breakpoints || {};
    this.breakpointsEnabled = true;

    this._started = false;
    this._paused = false;
    this._stopped = false;

    this.stack = new basic.Stack();
    this.stack.push(new Frame(genObj, -1));

    var self = this;
    this.stack.poppedLastItem = function () {
        self._stopped = true;
        self.emit("done");
    };

    this._retVal = undefined;
}

Stepper.prototype = Object.create(EventEmitter.prototype);
Stepper.prototype.constructor = Stepper;

Stepper.prototype.stepIn = function () {
    var result;
    if (result = this._step()) {
        if (result.value && result.value.hasOwnProperty('gen')) {
            if (_isGenerator(result.value.gen)) {
                this.stack.push(new Frame(result.value.gen, this.line()));
                this.stepIn();
                return new Action("stepIn", this.line());
            } else {
                this._retVal = result.value.gen;
                if (result.value.stepAgain) {
                    result = this._step();
                }
            }
        }
        if (result.done) {
            this._popAndStoreReturnValue(result.value);
            return new Action("stepOut", this.line());
        }
        return new Action("stepOver", this.line());
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
                return new Action("stepOver", this.line());
            } else {
                this._retVal = result.value.gen;
                if (result.value.stepAgain) {
                    result = this._step();
                }
            }
        }
        if (result.done) {
            this._popAndStoreReturnValue(result.value);
            return new Action("stepOut", this.line());
        }
        return new Action("stepOver", this.line());
    }
};

Stepper.prototype.stepOut = function () {
    var result;
    if (result = this._step()) {
        while (!result.done) {
            if (result.value.hasOwnProperty('gen')) {
                if (_isGenerator(result.value.gen)) {
                    this._runScope(result.value.gen);
                } else {
                    this._retVal = result.value.gen;
                }
            }
            result = this._step();
        }
        this._popAndStoreReturnValue(result.value);
        return new Action("stepOut", this.line());
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
    var currentLine = this.line();
    while (true) {
        if (this.stack.isEmpty) {
            break;
        }
        var action = this.stepIn();
        if (this.breakpointsEnabled && this.breakpoints[action.line] && action.type !== "stepOut" && currentLine !== this.line()) {
            this._paused = true;
        }
        if (this._paused) {
            this.emit("break");
            break;
        }
        currentLine = this.line();
    }
};

Stepper.prototype.started = function () {
    return this._started;
};

Stepper.prototype.paused = function () {
    return this._paused;
};

Stepper.prototype.stopped = function () {
    return this._stopped;
};

Stepper.prototype.line = function () {
    if (!this._stopped) {
        return this.stack.peek().line;
    } else {
        return -1;
    }
};

Stepper.prototype.setBreakpoint = function (line) {
    this.breakpoints[line] = true;
};

Stepper.prototype.clearBreakpoint = function (line) {
    delete this.breakpoints[line];
};

/* PRIVATE */

var _isGenerator = function (obj) {
    return obj instanceof Object && obj.toString() === "[object Generator]"
};

Stepper.prototype._step = function () {
    if (this.stack.isEmpty) {
        return;
    }
    var frame = this.stack.peek();
    var result = frame.gen.next(this._retVal);
    this._retVal = undefined;

    // if the result.value contains scope information add it to the
    // current stack frame
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
    this.stack.push(new Frame(gen, this.line()));

    var result = this._step();
    while (!result.done) {
        if (result.value.gen) {
            if (_isGenerator(result.value.gen)) {
                this._runScope(result.value.gen);
            } else {
                this._retVal = result.value.gen;
            }
        }
        result = this._step();
    }

    this._popAndStoreReturnValue(result.value);
};

Stepper.prototype._popAndStoreReturnValue = function (value) {
    var frame = this.stack.pop();
    this._retVal = frame.gen.obj || value;
};

module.exports = Stepper;

},{"basic-ds":1,"events":2}],7:[function(require,module,exports){
/*global recast, esprima, escodegen, injector */

var builder = require("./ast-builder");
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

},{"./ast-builder":3,"basic-ds":1}]},{},[4])(4)
});