(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var array = require("./array");

function _isGeneratorFunction(value) {
  return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

var methods = ["map", "reduce", "reduceRight", "filter", "forEach", "every", "some"];

methods.forEach(function (methodName) {
  var original = Array.prototype[methodName];
  Array.prototype[methodName] = function () {
    var method = _isGeneratorFunction(arguments[0]) ? array[methodName] : original;
    return method.apply(this, arguments);
  };
});

},{"./array":2}],2:[function(require,module,exports){
"use strict";

/**
 * Re-implementations of Array.prototype functional programming methods
 * that accept generators and are generators themselves so that they can
 * be used with the debugger.
 */

var map = regeneratorRuntime.mark(function _callee(callback, _this) {
  var _this2 = this;
  var result, i;
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (true) switch (_context.prev = _context.next) {
      case 0: result = [];
        i = 0;
      case 2:
        if (!(i < _this2.length)) {
          _context.next = 10;
          break;
        }
        _context.next = 5;
        return {
          gen: callback.call(_this2, _this2[i], i, _this)
        };
      case 5: _context.t0 = _context.sent;
        result.push(_context.t0);

      case 7: i++;
        _context.next = 2;
        break;
      case 10: return _context.abrupt("return", result);
      case 11:
      case "end": return _context.stop();
    }
  }, _callee, this);
});

var reduce = regeneratorRuntime.mark(function _callee2(callback, initialValue) {
  var _this3 = this;
  var _arguments = arguments;
  var start, result, i;
  return regeneratorRuntime.wrap(function _callee2$(_context2) {
    while (true) switch (_context2.prev = _context2.next) {
      case 0: start = 0;
        if (!(_arguments.length === 1)) {
          _context2.next = 6;
          break;
        }
        start = 1;
        if (!(_this3.length === 0)) {
          _context2.next = 5;
          break;
        }
        throw new TypeError("empty array and no initial value");
      case 5:
        initialValue = _this3[0];
      case 6: result = initialValue;
        i = start;
      case 8:
        if (!(i < _this3.length)) {
          _context2.next = 15;
          break;
        }
        _context2.next = 11;
        return {
          gen: callback.call(_this3, result, _this3[i], i, _this3)
        };
      case 11: result = _context2.sent;
      case 12: i++;
        _context2.next = 8;
        break;
      case 15: return _context2.abrupt("return", result);
      case 16:
      case "end": return _context2.stop();
    }
  }, _callee2, this);
});

var reduceRight = regeneratorRuntime.mark(function _callee3(callback, initialValue) {
  var _this4 = this;
  var _arguments2 = arguments;
  var start, result, i;
  return regeneratorRuntime.wrap(function _callee3$(_context3) {
    while (true) switch (_context3.prev = _context3.next) {
      case 0: start = _this4.length - 1;
        if (!(_arguments2.length === 1)) {
          _context3.next = 6;
          break;
        }
        start = _this4.length - 2;
        if (!(_this4.length === 0)) {
          _context3.next = 5;
          break;
        }
        throw new TypeError("empty array and no initial value");
      case 5:
        initialValue = _this4[_this4.length - 1];
      case 6: result = initialValue;
        i = start;
      case 8:
        if (!(i > -1)) {
          _context3.next = 15;
          break;
        }
        _context3.next = 11;
        return {
          gen: callback.call(_this4, result, _this4[i], i, _this4)
        };
      case 11: result = _context3.sent;
      case 12: i--;
        _context3.next = 8;
        break;
      case 15: return _context3.abrupt("return", result);
      case 16:
      case "end": return _context3.stop();
    }
  }, _callee3, this);
});

var filter = regeneratorRuntime.mark(function _callee4(callback, _this) {
  var _this5 = this;
  var result, i, value, cond;
  return regeneratorRuntime.wrap(function _callee4$(_context4) {
    while (true) switch (_context4.prev = _context4.next) {
      case 0: result = [];
        i = 0;
      case 2:
        if (!(i < _this5.length)) {
          _context4.next = 11;
          break;
        }
        value = _this5[i];
        _context4.next = 6;
        return {
          gen: callback.call(_this5, value, i, _this)
        };
      case 6: cond = _context4.sent;
        if (cond) {
          result.push(value);
        }
      case 8: i++;
        _context4.next = 2;
        break;
      case 11: return _context4.abrupt("return", result);
      case 12:
      case "end": return _context4.stop();
    }
  }, _callee4, this);
});

var forEach = regeneratorRuntime.mark(function _callee5(callback, _this) {
  var _this6 = this;
  var i;
  return regeneratorRuntime.wrap(function _callee5$(_context5) {
    while (true) switch (_context5.prev = _context5.next) {
      case 0: i = 0;
      case 1:
        if (!(i < _this6.length)) {
          _context5.next = 7;
          break;
        }
        _context5.next = 4;
        return {
          gen: callback.call(_this6, _this6[i], i, _this)
        };
      case 4: i++;
        _context5.next = 1;
        break;
      case 7:
      case "end": return _context5.stop();
    }
  }, _callee5, this);
});

var every = regeneratorRuntime.mark(function _callee6(callback, _this) {
  var _this7 = this;
  var i, cond;
  return regeneratorRuntime.wrap(function _callee6$(_context6) {
    while (true) switch (_context6.prev = _context6.next) {
      case 0: i = 0;
      case 1:
        if (!(i < _this7.length)) {
          _context6.next = 10;
          break;
        }
        _context6.next = 4;
        return {
          gen: callback.call(_this7, _this7[i], i, _this)
        };
      case 4: cond = _context6.sent;
        if (cond) {
          _context6.next = 7;
          break;
        }
        return _context6.abrupt("return", false);
      case 7: i++;
        _context6.next = 1;
        break;
      case 10: return _context6.abrupt("return", true);
      case 11:
      case "end": return _context6.stop();
    }
  }, _callee6, this);
});

var some = regeneratorRuntime.mark(function _callee7(callback, _this) {
  var _this8 = this;
  var i, cond;
  return regeneratorRuntime.wrap(function _callee7$(_context7) {
    while (true) switch (_context7.prev = _context7.next) {
      case 0: i = 0;
      case 1:
        if (!(i < _this8.length)) {
          _context7.next = 10;
          break;
        }
        _context7.next = 4;
        return {
          gen: callback.call(_this8, _this8[i], i, _this)
        };
      case 4: cond = _context7.sent;
        if (!cond) {
          _context7.next = 7;
          break;
        }
        return _context7.abrupt("return", true);
      case 7: i++;
        _context7.next = 1;
        break;
      case 10: return _context7.abrupt("return", false);
      case 11:
      case "end": return _context7.stop();
    }
  }, _callee7, this);
});

exports.map = map;
exports.reduce = reduce;
exports.reduceRight = reduceRight;
exports.filter = filter;
exports.forEach = forEach;
exports.every = every;
exports.some = some;

},{}]},{},[1]);
