/*!
 * EventEmitter v4.2.9 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */

(function () {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var exports = this;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listeners = this.getListenersAsObject(evt);
        var listener;
        var i;
        var key;
        var response;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                i = listeners[key].length;

                while (i--) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[key][i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}.call(this));

(function (exports) {

    function Stack (values) {
        this.values = values || [];

        // delegate methods
        this.poppedLastItem = function () {};
    }

    Stack.prototype.isEmpty = function () {
        return this.values.length === 0;
    };

    Stack.prototype.push = function (value) {
        this.values.push(value);
    };

    Stack.prototype.pop = function () {
        var item = this.values.pop();
        if (this.isEmpty()) {
            this.poppedLastItem(item);
        }
        return item;
    };

    Stack.prototype.peek = function () {
        return this.values[this.values.length - 1];
    };

    Stack.prototype.size = function () {
        return this.values.length;
    };

    exports.Stack = Stack;

})(this);

(function (exports) {

    function Node (value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }

    Node.prototype.destroy = function () {
        delete this.next;
        delete this.prev;
        delete this.value;
    };

    function LinkedList () {
        this.first = null;
        this.last = null;
    }

    LinkedList.prototype.push_back = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        }
    };

    LinkedList.prototype.push_front = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
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
            } else {
                this.last = null;
                this.first = null;
            }
            return value;
        } else {
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
            } else {
                this.first = null;
                this.last = null;
            }
            return value;
        } else {
            return null;
        }
    };

    LinkedList.prototype.clear = function () {
        this.first = this.last = null;
    };

    LinkedList.prototype.insertBeforeNode = function (refNode, value) {
        if (refNode === this.first) {
            this.push_front(value);
        } else {
            var node = new Node(value);
            node.prev = refNode.prev;
            node.next = refNode;
            refNode.prev.next = node;
            refNode.prev = node;
        }
    };

    LinkedList.prototype.inserAfterNode = function (refNode, value) {
        if (refNode === this.last) {
            this.push_back(value);
        } else {
            var node = new Node(value);

        }
    };

    LinkedList.prototype.forEachNode = function (callback, _this) {
        var node = this.first;
        while (node !== null) {
            callback.call(_this, node);
            node = node.next;
        }
    };

    // TODO: provide the index to the callback as well
    LinkedList.prototype.forEach = function (callback, _this) {
        this.forEachNode(function (node) {
            callback.call(_this, node.value);
        });
    };

    LinkedList.prototype.nodeAtIndex = function (index) {
        var i = 0;
        var node = this.first;
        while (node !== null) {
            if (index === i) {
                return node;
            }
            i++;
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

    exports.LinkedList = LinkedList;

})(this);

/* build Parser API style AST nodes and trees */

(function (exports) {

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

    exports.builder = {
        createExpressionStatement: createExpressionStatement,
        createBlockStatement: createBlockStatement,
        createCallExpression: createCallExpression,
        createYieldExpression: createYieldExpression,
        createObjectExpression: createObjectExpression,
        createProperty: createProperty,
        createIdentifier: createIdentifier,
        createLiteral: createLiteral,
        createWithStatement: createWithStatement,
        createAssignmentExpression: createAssignmentExpression,
        createVariableDeclaration: createVariableDeclaration,
        createVariableDeclarator: createVariableDeclarator,
        replaceNode: replaceNode
    }

})(this);

/*global recast, esprima, escodegen, injector */

(function (exports) {
    "use strict";

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

                    var bodyList = LinkedList.fromArray(node.body);
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

    exports.transform = transform;
})(this);

/*global recast, esprima, escodegen, injector */

(function (exports) {
    "use strict";

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

        this._started = false;
        this._paused = false;
        this._stopped = false;

        this.stack = new Stack();
        this.stack.push(new Frame(genObj, -1));

        var self = this;
        this.stack.poppedLastItem = function () {
            self._stopped = true;
            self.emit("done");
        };

        this._retVal = undefined;
    }

    Stepper.prototype = new EventEmitter();

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

    // TODO: implement ignoreBreakpoints
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
            if (this.stack.isEmpty()) {
                break;
            }
            var action = this.stepIn();
            if (this.breakpoints[action.line] && action.type !== "stepOut" && currentLine !== this.line()) {
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
        if (this.stack.isEmpty()) {
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

    exports.Stepper = Stepper;
})(this);

/**
 * The purpose of the scheduler is to:
 * - add tasks to a queue in a certain order
 * - remove tasks from the queue when they have completed
 * - reschedule recurring tasks
 */

function Scheduler () {
    this.queue = new LinkedList();
}

Scheduler.prototype.addTask = function (task) {
    var self = this;

    task.on('done', function () {
        self.queue.pop_back();
        self.tick();
    });

    this.queue.push_front(task);
    this.tick();
};

Scheduler.prototype.tick = function () {
    var self = this;
    setTimeout(function () {
        var currentTask = self.currentTask();
        if (currentTask !== null && !currentTask.started()) {
            currentTask.start();
        }
    }, 0);  // defer execution
};

Scheduler.prototype.currentTask = function () {
    return this.queue.last ? this.queue.last.value : null;
};

Scheduler.prototype.clear = function () {
    this.queue.clear();
};

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

Debugger.prototype.start = function (paused) {
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
    task.start(paused);   // start the initial task synchronously
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
    if (draw && Object.getPrototypeOf(draw).constructor.name === "GeneratorFunction") {
        this.queueRecurringGenerator(draw, 1000 / 60);
    }

    var self = this;
    var wrapProcessingEventHandler = function(name) {
        var eventHandler = self.context[name];
        if (eventHandler) {
            self.context[name] = function () {
                self.queueGenerator(eventHandler);
            };
        }
    };

    var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased"];
    events.forEach(wrapProcessingEventHandler);
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
    var stepper = this.scheduler.currentTask();
    if (stepper !== null) {
        return stepper.stack.values.map(function (frame) {
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
    var stepper = this.currentStepper();
    if (stepper) {
        var scope = stepper.stack.peek().scope;
        if (scope) {
            return scope;
        }
    }
    return null;
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
