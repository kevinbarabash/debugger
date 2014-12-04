/*global describe, it, beforeEach, afterEach */

describe("Scheduler", function () {

    it("should run a single task after adding it", function (done) {
        var scheduler = new Scheduler();
        var task = new Task(function () {
            task.complete();
        });
        task.once("done", function () {
            expect(true).to.be(true);
            done();
        });
        scheduler.addTask(task);
    });

    it("should run a tasks in the order that they were added", function (done) {
        var num;
        var scheduler = new Scheduler();
        var task1 = new Task(function () {
            task1.complete();
        });
        var task2 = new Task(function () {
            task2.complete();
        });
        var task3 = new Task(function () {
            task3.complete();
        });
        task1.once("done", function () {
            expect(num).to.be(undefined);
            num = 1;
        });
        task2.once("done", function () {
            expect(num).to.be(1);
            num = 2;
        });
        task3.once("done", function () {
            expect(num).to.be(2);
            num = 3;
            done();
        });
        scheduler.addTask(task1);
        scheduler.addTask(task2);
        scheduler.addTask(task3);
    });

    it("clear() should discard pending tasks", function (done) {
        var num;
        var scheduler = new Scheduler();
        var task1 = new Task(function () {
            task1.complete();
        });
        var task2 = new Task(function () {
            task2.complete();
        });
        var task3 = new Task(function () {
            task3.complete();
        });
        task1.once("done", function () {
            expect(num).to.be(undefined);
            num = 1;
            scheduler.clear();
        });
        task2.once("done", function () {
            expect(num).to.be(1);
            num = 2;
        });
        task3.once("done", function () {
            expect(num).to.be(2);
            num = 5;
        });
        scheduler.addTask(task1);
        scheduler.addTask(task2);
        scheduler.addTask(task3);
        setTimeout(function () {
            expect(num).to.be(1);
            done();
        }, 200);
    });
});