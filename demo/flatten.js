/**
 *  The purpose of flatten/unflatten is serialize objects containing
 *  cyclic references so that they can be ferried between execution
 *  contexts, e.g. iframes, web workers, other windows
 */

// NOTE: autotests in https://github.com/kevinb7/flatten
// TODO: figure out a better name for flatten and put it on bower

/**
 * Converts the root object to an array of smaller objects where
 * each object in the array contains properties that are either
 * basic data types or objects of the form { id: number } to
 * reference other objects/arrays in the original tree.
 *
 * @param {Object} root
 * @returns {Array}
 */
function flatten(root) {
    if (root === undefined || root === null) {
        return null;
    }
    var originalObjects = [];
    var flattenedObjects = [];
    var index = 0;
    var traverse = function(obj) {
        var result = Object.create(null);

        if (originalObjects.indexOf(obj) === -1) {
            originalObjects[index] = obj;
            flattenedObjects[index] = result;

            index++;
        }

        return Object.keys(obj).reduce(function (acc, key) {
            var val = obj[key];

            if (typeof(val) === "object") {
                if (originalObjects.indexOf(val) === -1) {
                    traverse(val);
                }
                acc[key] = {
                    id: originalObjects.indexOf(val),
                    isArray: val instanceof Array
                };
            } else if (typeof(val) === "function") {
                acc[key] = "[function]";
            } else {
                acc[key] = val;
            }

            return acc;
        }, result);
    };

    traverse(root);
    return flattenedObjects;
}

/**
 * Converts an array produced by flatten back to an object with the
 * same structure and data as the original root object passed into
 * flatten.
 *
 * @param {Array} flattenedObjects
 */
function unflatten(flattenedObjects) {
    if (flattenedObjects === null) {
        return null;
    }
    var originalObjects = [];

    var recurse = function (obj, id, isArray) {
        var result = isArray ? [] : Object.create(null);
        originalObjects[id] = result;

        return Object.keys(obj).reduce(function (acc, key) {
            var val = obj[key];

            if (typeof(val) === "object") {
                var id = val.id;
                var isArray = val.isArray;
                acc[key] = originalObjects[id] || recurse(flattenedObjects[id], id, isArray);
            } else {
                acc[key] = val;
            }

            return acc;
        }, result);
    };

    return recurse(flattenedObjects[0], 0);    // root object's id is always 0
}
