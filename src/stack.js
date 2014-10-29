function Stack () {
    this.values = [];
}

Stack.prototype.isEmpty = function () {
    return this.values.length === 0;
};

Stack.prototype.push = function (value) {
    this.values.push(value);
};

Stack.prototype.pop = function () {
    return this.values.pop();
};

Stack.prototype.peek = function () {
    return this.values[this.values.length - 1];
};
