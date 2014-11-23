function Scheduler(callback) {
    this.queue = new LinkedList();
    this.callback = callback; // callback is called when we've run out of tasks to run
}

Scheduler.prototype.addTask = function (task) {
    var self = this;

    // there's an assumption of implicit ordering here
    // TODO: make the ordering more explicit
    task.deferred.then(function () {
        self.queue.pop_back();
        console.log(task.message);

        if (task.delay > 0) {
            setTimeout(function () {
                scheduler.addTask(new Task(randomColor(), 500));
            }, task.delay);
        }

        self.startCurrentTask();
    });

    this.queue.push_front(task);
    this.startCurrentTask();
};

Scheduler.prototype.startCurrentTask = function () {
    var currentTask = this.currentTask();
    if (currentTask !== null && currentTask.state === "waiting") {
        currentTask.start();
    }
};

Scheduler.prototype.currentTask = function () {
    if (this.queue.last) {
        return this.queue.last.value;
    } else {
        return null;
    }
};

function randomColor() {
    var r = 255 * Math.random() | 0;
    var g = 255 * Math.random() | 0;
    var b = 255 * Math.random() | 0;
    return "rgb(" + [r,g,b].join(",") + ")";
}
