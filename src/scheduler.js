/**
 * The purpose of the scheduler is to:
 * - add tasks to a queue in a certain order
 * - remove tasks from the queue when they have completed
 * - reschedule recurring tasks
 */

var LinkedList = require("basic-ds").LinkedList;

class Scheduler {

    constructor() {
        this.queue = new LinkedList();
    }

    addTask(task) {
        var done = task.doneCallback;
        task.doneCallback = () => {
            this.removeTask(task);
            done();
        };
        this.queue.push_front(task);
        this.tick();
    }

    tick() {
        setTimeout(() => {
            var currentTask = this.currentTask();
            if (currentTask !== null && !currentTask.started) {
                currentTask.start();
                this.tick();
            }
        }, 0);  // defer execution
    }

    removeTask(task) {
        if (task === this.currentTask()) {
            this.queue.pop_back();
            this.tick();
        } else {
            throw "not the current task";
        }
    }

    currentTask() {
        return this.queue.last ? this.queue.last.value : null;
    }

    clear() {
        this.queue.clear();
    }

    createRepeater(createFunc, delay) {
        var _repeat = true;
        var _scheduler = this;
        var _delay = delay;

        // TODO: replace setTimeout with setInterval and clearInterval
        function repeatFunc() {
            if (!_repeat) {
                return;
            }
            var task = createFunc();
            var done = task.doneCallback;
            task.doneCallback = function () {
                if (_repeat) {
                    setTimeout(repeatFunc, _delay);
                }
                done();
            };
            _scheduler.addTask(task);
        }

        var repeater = {
            stop: () => _repeat = false,
            start: () => repeatFunc()
        };

        Object.defineProperty(repeater, "delay", {
            get: () => _delay,
            set: (delay) => _delay = delay
        });

        return repeater;
    }
}

module.exports = Scheduler;
