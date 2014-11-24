/*global describe, it, beforeEach, afterEach */

describe("Debugger", function () {

    var debugr, context;

    beforeEach(function () {
        context = {
            x: 0,
            y: 0,
            draw: undefined,
            mouseClicked: undefined,
            fill: sinon.stub(),
            rect: sinon.stub()
        };

        debugr = new Debugger(context);
    });

    afterEach(function () {
        debugr.stop();  // stop any recurring tasks from recurring
    });

    describe("Basic Functionality", function () {
        it("should run a simple program", function () {
            var code = getFunctionBody(function () {
                x = 5;
                y = 10;
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
            expect(context.y).to.be(10);
        });

        it("should pause on breakpoints", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.load(code);

            debugr.setBreakpoint(1);
            debugr.start();

            expect(context.fill.called).to.be(false);
        });

        it("should step after hitting a breakpoint", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.load(code);

            debugr.setBreakpoint(1);
            debugr.start();

            expect(context.fill.called).to.be(false);
            debugr.stepOver();
            expect(context.fill.called).to.be(true);
            expect(context.rect.called).to.be(false);
            debugr.stepOver();
            expect(context.rect.called).to.be(true);
        });
    });

    describe("Recurring Tasks (draw)", function () {
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

        it("should pause on breakpoints in 'draw' multiple times", function (done) {
            var code = getFunctionBody(function () {
                draw = function () {
                    fill(255,0,0);
                    rect(100,200,50,50);
                    console.log("inside 'draw'");
                };
                console.log("hello");
            });

            debugr.load(code);

            debugr.setBreakpoint(2);
            debugr.start();

            setTimeout(function () {
                expect(context.fill.callCount).to.be(0);
                expect(context.rect.callCount).to.be(0);

                debugr.stepOut();

                expect(context.fill.callCount).to.be(1);
                expect(context.rect.callCount).to.be(1);

                setTimeout(function () {
                    debugr.stepOut();

                    expect(context.fill.callCount).to.be(2);
                    expect(context.rect.callCount).to.be(2);

                    debugr.stop();

                    done();
                }, 50);
            }, 50);
        });
    });

    describe("Event Handlers (mouseClicked)", function () {
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
});

