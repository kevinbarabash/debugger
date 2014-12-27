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
