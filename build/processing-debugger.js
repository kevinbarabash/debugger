!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ProcessingDebugger=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*global Debugger */
// defining Debugger as a global instead of requiring it so that we can test it
// independently of ProcessingDebugger

function emptyFunction() {}

var events = ["mouseClicked", "mouseDragged", "mousePressed", "mouseMoved", "mouseReleased", "mouseOver", "mouseOut", "keyPressed", "keyReleased", "keyTyped"];

var ProcessingDebugger = function (_Debugger) {
    _inherits(ProcessingDebugger, _Debugger);

    function ProcessingDebugger(options) {
        _classCallCheck(this, ProcessingDebugger);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ProcessingDebugger).call(this, options));

        _this._repeater = null;
        return _this;
    }

    _createClass(ProcessingDebugger, [{
        key: "stop",
        value: function stop() {
            _get(Object.getPrototypeOf(ProcessingDebugger.prototype), "stop", this).call(this);
            this._repeater.stop();
        }
    }, {
        key: "onMainStart",
        value: function onMainStart() {
            var _this2 = this;

            if (this._repeater) {
                this._repeater.stop();
            }

            // reset all event handlers
            // TODO: write a test for this
            events.forEach(function (event) {
                return _this2.context[event] = emptyFunction;
            });

            // reset draw
            this.context.draw = emptyFunction;
        }
    }, {
        key: "onMainDone",
        value: function onMainDone() {
            var _this3 = this;

            var draw = this.context.draw;

            if (draw !== emptyFunction) {
                this._repeater = this.scheduler.createRepeater(function () {
                    return _this3._createStepper(draw());
                }, 1000 / 60);
                this._repeater.start();
            }

            events.forEach(function (name) {
                var eventHandler = _this3.context[name];

                if (_isGeneratorFunction(eventHandler)) {
                    if (name === "keyTyped") {
                        _this3.context.keyCode = 0; // preserve existing behaviour
                    }

                    _this3.context[name] = function () {
                        _this3.queueGenerator(eventHandler);
                    };
                }
            });
        }
    }]);

    return ProcessingDebugger;
}(Debugger);

function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

module.exports = ProcessingDebugger;

},{}]},{},[1])(1)
});