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

    describe("createRepeater", function () {
        it("should run a task until stopped", function (done) {
            var count = 0;
            var expectedCount = 0;
            var scheduler = new Scheduler();
            var repeater = scheduler.createRepeater(function () {
                var task = new Task(function () {
                    count++;
                    task.complete();
                });
                return task;
            }, 1000 / 60);

            repeater.start();
            setTimeout(function () {
                expectedCount = count;
                expect(count).to.be.greaterThan(2);
                repeater.stop();

                setTimeout(function () {
                    expect(count).to.be(expectedCount);
                    done();
                }, 100);
            }, 100);
        });

        it("should change the delay", function (done) {
            var count = 0;
            var scheduler = new Scheduler();
            var repeater = scheduler.createRepeater(function () {
                var task = new Task(function () {
                    count++;
                    task.complete();
                });
                return task;
            }, 1000 / 60);

            repeater.start();
            setTimeout(function () {
                repeater.delay = 1000 / 240;
                expect(count).to.be.greaterThan(2);

                setTimeout(function () {
                    expect(count).to.be.greaterThan(20);
                    repeater.stop();
                    done();
                }, 100);
            }, 100);
        });
    });
});