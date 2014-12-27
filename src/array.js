/**
 * Re-implementations of Array.prototype functional programming methods
 * that accept generators and are generators themselves so that they can
 * be used with the debugger.
 */

var map = function *(callback, _this) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        result.push(yield {
            gen: callback.call(this, this[i], i, _this)
        });
    }
    return result;
};
map.hidden = true;  // don't report in the stack

var reduce = function *(callback, initialValue) {
    var start = 0;
    if (arguments.length === 1) {
        start = 1;
        if (this.length === 0) {
            throw new TypeError("empty array and no initial value");
        }
        initialValue = this[0]; 
    }
    var result = initialValue;
    for (var i = start; i < this.length; i++) {
        result = yield {
            gen: callback.call(this, initialValue, this[i], i, this)
        };
    }
    return result;
};
reduce.hidden = true;

var reduceRight = function *(callback, initialValue) {
    var start = this.length - 1;
    if (arguments.length === 1) {
        start = this.length - 2;
        if (this.length === 0) {
            throw new TypeError("empty array and no initial value")
        }
        initialValue = this[0];
    }
    var result = initialValue;
    for (var i = start; i > -1; i--) {
        result = yield {
            gen: callback.call(this, initialValue, this[i], i, this)
        };
    }
    return result;
};
reduceRight.hidden = true;

var filter = function *(callback, _this) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        var value = this[i];
        if (yield { gen: callback.call(this, value, i, _this) }) {
            result.push(value);
        }
    }
    return result;
};
filter.hidden = true;

var forEach = function *(callback, _this) {
    for (var i = 0; i < this.length; i++) {
        yield {
            gen: callback.call(this, this[i], i, _this)
        };
    }
};

var every = function *(callback, _this) {
    for (var i = 0; i < this.length; i++) {
        var result = yield { 
            gen: callback.call(this, this[i], i, _this)
        };
        if (!result) {
            return false;
        }
    }
    return true;
};

var some = function *(callback, _this) {
    for (var i = 0; i < this.length; i++) {
        var result = yield {
            gen: callback.call(this, this[i], i, _this)
        };
        if (result) {
            return true;
        }
    }
    return false;
};

exports.map = map;
exports.reduce = reduce;
exports.reduceRight = reduceRight;
exports.filter = filter;
exports.forEach = forEach;
exports.every = every;
exports.some = some;
