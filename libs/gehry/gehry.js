!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gehry=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function deconstruct(root) {
    if (root === null || root === undefined) {
        return null;
    }
    var originalObjects = [];
    var descontructedObjects = [];
    var index = 0;
    var traverse = function (obj) {
        var result = Object.create(null);
        if (originalObjects.indexOf(obj) === -1) {
            originalObjects[index] = obj;
            descontructedObjects[index] = result;
            index++;
        }
        return Object.keys(obj).reduce(function (acc, key) {
            var val = obj[key];
            if (typeof (val) === "object") {
                if (originalObjects.indexOf(val) === -1) {
                    traverse(val);
                }
                acc[key] = {
                    id: originalObjects.indexOf(val),
                    isArray: val instanceof Array
                };
            }
            else if (typeof (val) === "function") {
                acc[key] = "[function]";
            }
            else {
                acc[key] = val;
            }
            return acc;
        }, result);
    };
    traverse(root);
    return descontructedObjects;
}
exports.deconstruct = deconstruct;
function reconstruct(descontructedObjects) {
    if (descontructedObjects === null || descontructedObjects === undefined) {
        return null;
    }
    var originalObjects = [];
    var recurse = function (obj, id, isArray) {
        var result = isArray ? [] : Object.create(null);
        originalObjects[id] = result;
        return Object.keys(obj).reduce(function (acc, key) {
            var val = obj[key];
            if (typeof (val) === "object") {
                var id = val.id;
                var isArray = val.isArray;
                acc[key] = originalObjects[id] || recurse(descontructedObjects[id], id, isArray);
            }
            else {
                acc[key] = val;
            }
            return acc;
        }, result);
    };
    return recurse(descontructedObjects[0], 0);
}
exports.reconstruct = reconstruct;

},{}]},{},[1])(1)
});