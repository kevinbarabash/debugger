!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iframeOverlay=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./lib/iframe-overlay.js":[function(require,module,exports){
var Poster = require("../node_modules/poster/lib/poster");
var EventSim = require("../node_modules/eventsim/lib/eventsim");
var basic = require("../node_modules/basic-ds/lib/basic");
function createOverlay(iframe) {
    var wrapper = document.createElement("span");
    wrapper.setAttribute("style", "position:relative;padding:0;margin:0;display:inline-block;");
    wrapper.setAttribute("class", "wrapper");
    var overlay = document.createElement("span");
    overlay.setAttribute("style", "position:absolute;left:0;top:0;width:100%;height:100%;");
    overlay.setAttribute("class", "overlay");
    overlay.setAttribute("tabindex", "0");
    var parent = iframe.parentElement;
    parent.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
    wrapper.appendChild(overlay);
    var down = false;
    var paused = false;
    var queue = new basic.LinkedList();
    var poster = new Poster(iframe.contentWindow);
    function postMouseEvent(e) {
        if (paused) {
            e["timestamp"] = Date.now();
            queue.push_front(e);
        }
        else {
            var bounds = wrapper.getBoundingClientRect();
            poster.post("mouse", {
                type: e.type,
                x: e.pageX - bounds.left,
                y: e.pageY - bounds.top,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            });
        }
    }
    function postKeyboardEvent(e) {
        if (paused) {
            e["timestamp"] = Date.now();
            queue.push_front(e);
        }
        else {
            poster.post("keyboard", {
                type: e.type,
                keyCode: e.keyCode,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            });
        }
    }
    overlay.addEventListener("click", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("dblclick", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mouseover", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mouseout", function (e) { return postMouseEvent(e); });
    overlay.addEventListener("mousedown", function (e) {
        down = true;
        postMouseEvent(e);
    });
    overlay.addEventListener("mousemove", function (e) {
        if (!down) {
            postMouseEvent(e);
        }
    });
    window.addEventListener("mousemove", function (e) {
        if (down) {
            e.preventDefault();
            postMouseEvent(e);
        }
    });
    window.addEventListener("mouseup", function (e) {
        if (down) {
            down = false;
            postMouseEvent(e);
        }
    });
    overlay.addEventListener("keydown", function (e) { return postKeyboardEvent(e); });
    overlay.addEventListener("keypress", function (e) { return postKeyboardEvent(e); });
    overlay.addEventListener("keyup", function (e) { return postKeyboardEvent(e); });
    var keyEventRegex = /key(up|down|press)/;
    var mouseEventRegex = /click|dblclick|mouse(up|down|move|over|out)/;
    return {
        pause: function () {
            paused = true;
        },
        resume: function () {
            if (!paused) {
                return;
            }
            paused = false;
            function pop() {
                if (paused) {
                    return;
                }
                var e = queue.pop_back();
                if (!e) {
                    return;
                }
                if (e instanceof MouseEvent) {
                    postMouseEvent(e);
                }
                else if (e instanceof KeyboardEvent) {
                    postKeyboardEvent(e);
                }
                else if (mouseEventRegex.test(e.type)) {
                    postMouseEvent(e);
                }
                else if (keyEventRegex.test(e.type)) {
                    postKeyboardEvent(e);
                }
                if (queue.last && queue.last.value) {
                    var next = queue.last.value;
                    var delay = next["timestamp"] - e["timestamp"];
                    setTimeout(pop, delay);
                }
            }
            pop();
        }
    };
}
exports.createOverlay = createOverlay;
function createRelay(element) {
    var poster = new Poster(window.parent);
    poster.listen("mouse", function (e) {
        EventSim.simulate(element, e.type, {
            clientX: e.x,
            clientY: e.y,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey
        });
    });
    poster.listen("keyboard", function (e) {
        EventSim.simulate(element, e.type, {
            keyCode: e.keyCode,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey
        });
    });
}
exports.createRelay = createRelay;

},{"../node_modules/basic-ds/lib/basic":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/basic.js","../node_modules/eventsim/lib/eventsim":"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/eventsim.js","../node_modules/poster/lib/poster":"/Users/kevin/iframe-overlay/node_modules/poster/lib/poster.js"}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/LinkedList.js":[function(require,module,exports){
var ListNode = require("./ListNode");
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
module.exports = LinkedList;

},{"./ListNode":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/ListNode.js"}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/ListNode.js":[function(require,module,exports){
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
module.exports = ListNode;

},{}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/Stack.js":[function(require,module,exports){
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
    Stack.prototype.toArray = function () {
        return this.items.map(function (item) { return item; });
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
module.exports = Stack;

},{}],"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/basic.js":[function(require,module,exports){
exports.LinkedList = require("./LinkedList");
exports.Stack = require("./Stack");

},{"./LinkedList":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/LinkedList.js","./Stack":"/Users/kevin/iframe-overlay/node_modules/basic-ds/lib/Stack.js"}],"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/createKeyboardEvent.js":[function(require,module,exports){
var initKeyboardEvent_variant = (function (event) {
    try {
        event.initKeyboardEvent("keyup", false, false, window, "+", 3, true, false, true, false, false);
        if ((event["keyIdentifier"] || event["key"]) == "+" && (event["keyLocation"] || event["location"]) == 3) {
            return event.ctrlKey ? (event.altKey ? 1 : 3) : (event.shiftKey ? 2 : 4);
        }
        return 9;
    }
    catch (e) {
        return 0;
    }
})(document.createEvent("KeyboardEvent"));
var keyboardEventProperties = {
    "char": "",
    "key": "",
    "location": 0,
    "ctrlKey": false,
    "shiftKey": false,
    "altKey": false,
    "metaKey": false,
    "repeat": false,
    "locale": "",
    "detail": 0,
    "bubbles": false,
    "cancelable": false,
    "keyCode": 0,
    "charCode": 0,
    "which": 0
};
function createModifersList(dict) {
    var modifiers = ["Ctrl", "Shift", "Alt", "Meta", "AltGraph"];
    return modifiers.filter(function (mod) {
        return dict.hasOwnProperty([mod.toLowerCase() + "Key"]);
    }).join(" ");
}
function createKeyboardEvent(type, dict) {
    var event;
    if (initKeyboardEvent_variant) {
        event = document.createEvent("KeyboardEvent");
    }
    else {
        event = document.createEvent("Event");
    }
    var propName, localDict = {};
    for (propName in keyboardEventProperties) {
        if (keyboardEventProperties.hasOwnProperty(propName)) {
            if (dict && dict.hasOwnProperty(propName)) {
                localDict[propName] = dict[propName];
            }
            else {
                localDict[propName] = keyboardEventProperties[propName];
            }
        }
    }
    var ctrlKey = localDict["ctrlKey"];
    var shiftKey = localDict["shiftKey"];
    var altKey = localDict["altKey"];
    var metaKey = localDict["metaKey"];
    var altGraphKey = localDict["altGraphKey"];
    var key = localDict["key"] + "";
    var char = localDict["char"] + "";
    var location = localDict["location"];
    var keyCode = localDict["keyCode"] || (localDict["keyCode"] = key && key.charCodeAt(0) || 0);
    var charCode = localDict["charCode"] || (localDict["charCode"] = char && char.charCodeAt(0) || 0);
    var bubbles = localDict["bubbles"];
    var cancelable = localDict["cancelable"];
    var repeat = localDict["repeat"];
    var local = localDict["locale"];
    var view = window;
    localDict["which"] || (localDict["which"] = localDict["keyCode"]);
    if ("initKeyEvent" in event) {
        event.initKeyEvent(type, bubbles, cancelable, view, ctrlKey, altKey, shiftKey, metaKey, keyCode, charCode);
    }
    else if (initKeyboardEvent_variant && "initKeyboardEvent" in event) {
        switch (initKeyboardEvent_variant) {
            case 1:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, ctrlKey, shiftKey, altKey, metaKey, altGraphKey);
                break;
            case 2:
                event.initKeyboardEvent(type, bubbles, cancelable, view, ctrlKey, altKey, shiftKey, metaKey, keyCode, charCode);
                break;
            case 3:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, ctrlKey, altKey, shiftKey, metaKey, altGraphKey);
                break;
            case 4:
                event.initKeyboardEvent(type, bubbles, cancelable, view, key, location, createModifersList(localDict), repeat, local);
                break;
            default:
                event.initKeyboardEvent(type, bubbles, cancelable, view, char, key, location, createModifersList(localDict), repeat, local);
        }
    }
    else {
        event.initEvent(type, bubbles, cancelable);
    }
    for (propName in keyboardEventProperties) {
        if (keyboardEventProperties.hasOwnProperty(propName)) {
            if (event[propName] != localDict[propName]) {
                try {
                    delete event[propName];
                    Object.defineProperty(event, propName, { writable: true, value: localDict[propName] });
                }
                catch (e) {
                }
            }
        }
    }
    return event;
}
module.exports = createKeyboardEvent;

},{}],"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/eventsim.js":[function(require,module,exports){
var createKeyboardEvent = require("./createKeyboardEvent");
var EventSim;
(function (EventSim) {
    var mouseRegex = /click|dblclick|(mouse(down|move|up|over|out|enter|leave))/;
    var pointerRegex = /pointer(down|move|up|over|out|enter|leave)/;
    var keyboardRegex = /key(up|down|press)/;
    function simulate(target, name, options) {
        var event;
        if (mouseRegex.test(name)) {
            event = new MouseEvent(name, options);
        }
        else if (keyboardRegex.test(name)) {
            event = createKeyboardEvent(name, options);
        }
        else if (pointerRegex.test(name)) {
            event = new PointerEvent(name, options);
        }
        target.dispatchEvent(event);
    }
    EventSim.simulate = simulate;
})(EventSim || (EventSim = {}));
module.exports = EventSim;

},{"./createKeyboardEvent":"/Users/kevin/iframe-overlay/node_modules/eventsim/lib/createKeyboardEvent.js"}],"/Users/kevin/iframe-overlay/node_modules/poster/lib/poster.js":[function(require,module,exports){
var posters = [];
if (self.document) {
    self.addEventListener("message", function (e) {
        var channel = e.data.channel;
        posters.forEach(function (poster) {
            if (poster.target === e.source) {
                var listeners = poster.channels[channel];
                if (listeners) {
                    listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
                }
            }
        });
    });
}
else {
    self.addEventListener("message", function (e) {
        var channel = e.data.channel;
        posters.forEach(function (poster) {
            var listeners = poster.channels[channel];
            if (listeners) {
                listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
            }
        });
    });
}
var Poster = (function () {
    function Poster(target, origin) {
        var _this = this;
        if (origin === void 0) { origin = "*"; }
        if (self.window && target instanceof HTMLIFrameElement) {
            target = target.contentWindow;
        }
        this.origin = origin;
        this.target = target;
        this.channels = {};
        if (self.window && target instanceof Worker) {
            target.addEventListener("message", function (e) {
                var channel = e.data.channel;
                var listeners = _this.channels[channel];
                if (listeners) {
                    listeners.forEach(function (listener) { return listener.apply(null, e.data.args); });
                }
            });
        }
        posters.push(this);
    }
    Poster.prototype.post = function (channel) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var message = {
            channel: channel,
            args: args
        };
        if (self.document && !(this.target instanceof Worker)) {
            this.target.postMessage(message, this.origin);
        }
        else {
            this.target.postMessage(message);
        }
    };
    Poster.prototype.emit = function (channel) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        args.unshift(channel);
        this.post.apply(this, args);
    };
    Poster.prototype.listen = function (channel, callback) {
        var listeners = this.channels[channel];
        if (listeners === undefined) {
            listeners = this.channels[channel] = [];
        }
        listeners.push(callback);
        return this;
    };
    Poster.prototype.addListener = function (channel, callback) {
        return this.listen(channel, callback);
    };
    Poster.prototype.on = function (channel, callback) {
        return this.listen(channel, callback);
    };
    Poster.prototype.removeListener = function (channel, callback) {
        var listeners = this.channels[channel];
        if (listeners) {
            var index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    };
    Poster.prototype.removeAllListeners = function (channel) {
        this.channels[channel] = [];
    };
    Poster.prototype.listeners = function (channel) {
        var listeners = this.channels[channel];
        return listeners || [];
    };
    return Poster;
})();
module.exports = Poster;

},{}]},{},["./lib/iframe-overlay.js"])("./lib/iframe-overlay.js")
});