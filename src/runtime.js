var array = require("./array-compiled");

var map = Array.prototype.map;
var reduce = Array.prototype.reduce;
var reduceRight = Array.prototype.reduceRight;
var filter = Array.prototype.filter;
var forEach = Array.prototype.forEach;
var every = Array.prototype.every;
var some = Array.prototype.some;


function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

Array.prototype.map = function(callback, _this) {
    return _isGeneratorFunction(callback) ? array.map.call(this, callback, _this) : map.call(this, callback, _this);
};

Array.prototype.reduce = function(callback, initialValue) {
    return _isGeneratorFunction(callback) ? array.reduce.call(this, callback, initialValue) : reduce.call(this, callback, initialValue);
};

Array.prototype.reduceRight = function(callback, initialValue) {
    return _isGeneratorFunction(callback) ? array.reduceRight.call(this, callback, initialValue) : reduceRight.call(this, callback, initialValue);
};

Array.prototype.filter = function(callback, _this) {
    return _isGeneratorFunction(callback) ? array.filter.call(this, callback, _this) : filter.call(this, callback, _this);
};

Array.prototype.forEach = function(callback, _this) {
    return _isGeneratorFunction(callback) ? array.forEach.call(this, callback, _this) : forEach.call(this, callback, _this);
};

//Array.prototype.every = function(callback, _this) {
//    return _isGeneratorFunction(callback) ? array.every(callback, _this) : every(callback, _this);
//};
//
//Array.prototype.some = function(callback, _this) {
//    return _isGeneratorFunction(callback) ? array.some(callback, _this) : some(callback, _this);
//};
