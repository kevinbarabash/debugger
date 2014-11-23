/**
 * The purpose of the scheduler is to:
 * - add tasks to a queue in a certain order
 * - remove tasks from the queue when they have completed
 * - reschedule recurring tasks
 */

function Scheduler () {
    this.queue = new LinkedList();
}

Scheduler.prototype.addTask = function (task) {
    var self = this;

    task.deferred.then(function () {
        self.queue.pop_back();

        if (task.delay) {
            task.reset();
            setTimeout(function () {
                self.addTask(task);
            });
        }

        var currentTask = self.currentTask();
        if (currentTask !== null && !currentTask.started()) {
            currentTask.start();
        }
    });

    this.queue.push_front(task);

    var currentTask = self.currentTask();
    if (currentTask !== null && !currentTask.started()) {
        currentTask.start();
    }
};

Scheduler.prototype.currentTask = function () {
    return this.queue.last ? this.queue.last.value : null;
};


Scheduler.prototype.clear = function () {
    debugger;
    this.queue.clear();
};
