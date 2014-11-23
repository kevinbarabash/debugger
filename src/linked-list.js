(function (exports) {

    function Node (value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }

    Node.prototype.destroy = function () {
        delete this.next;
        delete this.prev;
        delete this.value;
    };

    function LinkedList () {
        this.first = null;
        this.last = null;
    }

    LinkedList.prototype.push_back = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
            node.prev = this.last;
            this.last.next = node;
            this.last = node;
        }
    };

    LinkedList.prototype.push_front = function (value) {
        var node = new Node(value);
        if (this.first === null && this.last === null) {
            this.first = node;
            this.last = node;
        } else {
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
            } else {
                this.last = null;
                this.first = null;
            }
            return value;
        } else {
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
            } else {
                this.first = null;
                this.last = null;
            }
            return value;
        } else {
            return null;
        }
    };

    LinkedList.prototype.clear = function () {
        this.first = this.last = null;
    };

    LinkedList.prototype.insertBeforeNode = function (refNode, value) {
        if (refNode === this.first) {
            this.push_front(value);
        } else {
            var node = new Node(value);
            node.prev = refNode.prev;
            node.next = refNode;
            refNode.prev.next = node;
            refNode.prev = node;
        }
    };

    LinkedList.prototype.inserAfterNode = function (refNode, value) {
        if (refNode === this.last) {
            this.push_back(value);
        } else {
            var node = new Node(value);

        }
    };

    LinkedList.prototype.forEachNode = function (callback, _this) {
        var node = this.first;
        while (node !== null) {
            callback.call(_this, node);
            node = node.next;
        }
    };

    // TODO: provide the index to the callback as well
    LinkedList.prototype.forEach = function (callback, _this) {
        this.forEachNode(function (node) {
            callback.call(_this, node.value);
        });
    };

    LinkedList.prototype.nodeAtIndex = function (index) {
        var i = 0;
        var node = this.first;
        while (node !== null) {
            if (index === i) {
                return node;
            }
            i++;
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

    exports.LinkedList = LinkedList;

})(this);
