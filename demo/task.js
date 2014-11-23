var inc = function* () {
    var i = 0;
    while (i < 5) {
        yield i++;
    }
};

function Task(message, delay) {
    this.delay = delay || 0;
    this.message = message;
    this.deferred = $.Deferred();
    this.gen = inc();
    this.state = "waiting"; // possible states waiting, running, and finished
}

Task.prototype.start = function () {
    this.state = "running";
    var self = this;

    while (true) {
        var result = self.gen.next();
        if (result.done) {
            self.state = "done";
            self.deferred.resolve();
            break;
        }
        if (result.value && result.value === this.breakpoint) {
            break;
        }
    }
};

// TODO: modify this to hit the next breakpoint
// right now it just runs to the end
Task.prototype.resume = function () {
    if (this.state !== "running") {
        return;
    }
    while (true) {
        var result = this.gen.next();
        if (result.done) {
            this.state = "done";
            this.deferred.resolve();
            break;
        }
    }
};