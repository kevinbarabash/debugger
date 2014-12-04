!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Scheduler=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"basic-ds":1}]},{},[2])(2)
});