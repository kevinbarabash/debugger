/*global describe, it, beforeEach, afterEach */

describe("Debugger", function () {

    var debugr, context;

    beforeEach(function () {
        context = {
            x: 0,
            y: 0,
            draw: undefined,
            mouseClicked: undefined
        };

        debugr = new Debugger(context);
    });

    describe("Start", function () {
        it("should work", function (done) {
             var code = getFunctionBody(function () {
                 x = 5;
                 y = 10;
             });

            debugr.load(code);
            debugr.start();

            setTimeout(function () {
                expect(context.x).to.be(5);
                expect(context.y).to.be(10);
                done();
            }, 100);
        });

        it("should run 'draw' if defined", function (done) {
            var code = getFunctionBody(function () {
                draw = function () {
                    x = 5;
                    y = 10;
                };
            });

            debugr.load(code);

            var check = function () {
                if (context.x === 5 && context.y === 10) {
                    expect(context.x).to.be(5);
                    expect(context.y).to.be(10);

                    debugr.stop();
                    done();
                } else {
                    setTimeout(check, 50);
                }
            };

            debugr.start();

            check();
        });

        it("should run 'draw' until stopped", function (done) {
            var code = getFunctionBody(function () {
                draw = function () {
                    x = x + 1;
                    y = y + 1;
                };
            });

            debugr.load(code);

            var check = function () {
                if (context.x > 3) {
                    expect(context.x > 3).to.be(true);

                    debugr.stop();
                    done();
                } else {
                    setTimeout(check, 50);
                }
            };

            debugr.start();

            check();
        });

        it("should run 'mouseClicked' if defined when the mouse is clicked", function (done) {
            var code = getFunctionBody(function () {
                mouseClicked = function () {
                    x = 5;
                    y = 10;
                };
            });

            debugr.load(code);
            debugr.start();

            setTimeout(function () {
                context.mouseClicked();
                setTimeout(function () {
                    expect(context.x).to.be(5);
                    expect(context.y).to.be(10);
                    done();
                }, 50);
            }, 50);
        });
    });

    describe("Breakpoints", function () {
        it("should pause on breakpoints", function () {

        });


    });
});

