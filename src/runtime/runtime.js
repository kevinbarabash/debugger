var array = require("./array");

function _isGeneratorFunction(value) {
    return value && Object.getPrototypeOf(value).constructor.name === "GeneratorFunction";
}

var methods = ["map", "reduce", "reduceRight", "filter", "forEach", "every", "some"];

methods.forEach(function (methodName) {
    var original = Array.prototype[methodName];
    Array.prototype[methodName] = function() {
        var method = _isGeneratorFunction(arguments[0]) ? array[methodName] : original;
        return method.apply(this, arguments);
    }
});

var self = typeof window !== "undefined" ? window : global;

var originalSetTimeout = self.setTimeout;
var originalSetInterval = self.setInterval;

self.setTimeout = function(callback, delay) {
    if (_isGeneratorFunction(callback)) {
        return originalSetTimeout(function() {
            __schedule__(callback);
        }, delay);
    } else {
        return originalSetTimeout(callback, delay);
    }
};

self.setInterval = function(callback, delay) {
    if (_isGeneratorFunction(callback)) {
        return originalSetInterval(function () {
            __schedule__(callback);
        }, delay);
    } else {
        return originalSetInterval(callback, delay);
    }
};
