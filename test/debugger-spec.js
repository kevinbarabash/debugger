/*global describe, it, beforeEach, afterEach */

describe("Debugger", function () {

    var debugr, context, delegate;

    beforeEach(function () {
        context = {
            x: 0,
            y: 0,
            draw: undefined,
            mouseClicked: undefined,
            fill: sinon.stub(),
            rect: sinon.stub()
        };

        delegate = new ProcessingDelegate();

        debugr = new Debugger(context, delegate);
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

        it("should shouldn't hit breakpoints if they're disabled", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.load(code);

            debugr.setBreakpoint(1);
            debugr.breakpointsEnabled = false;
            debugr.start();

            expect(context.fill.called).to.be(true);
            expect(context.rect.called).to.be(true);
        });

        it("should be paused after hitting a breakpoint", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.load(code);

            debugr.setBreakpoint(1);
            debugr.start();

            expect(debugr.paused).to.be(true);
        });

        it("should not be paused after it finishes running", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.load(code);
            debugr.start();

            expect(debugr.paused).to.be(false);
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

        it("should stop calling the old 'draw'", function (done) {
            var fillCount = 0;

            var code1 = getFunctionBody(function () {
                draw = function () {
                    fill(255,0,0);
                };
            });

            var code2 = getFunctionBody(function () {
                draw = function () {
                    rect(100,200,50,50);
                };
            });

            debugr.load(code1);
            debugr.start();

            setTimeout(function () {
                fillCount = context.fill.callCount;
                debugr.stop();

                expect(context.fill.callCount).to.be.greaterThan(3);

                debugr.load(code2);
                debugr.start();

                setTimeout(function () {
                    debugr.stop();

                    // we don't expect fill to be call any more
                    expect(context.fill.callCount).to.be(fillCount);
                    done();
                }, 100);
            }, 100);
        });
    });

    describe("Event Handlers", function () {
        it("should run 'mouseClicked' if defined when the mouse is clicked", function (done) {
            var code = getFunctionBody(function () {
                mouseClicked = function () {
                    x = 5;
                    y = 10;
                };
            });

            debugr.load(code);
            debugr.start();

            context.mouseClicked();
            setTimeout(function () {
                expect(context.x).to.be(5);
                expect(context.y).to.be(10);
                done();
            }, 50);
        });

        it("should replace 'mouseClicked' with a new event handler", function (done) {
            var code1 = getFunctionBody(function () {
                mouseClicked = function () {
                    x = 5;
                };
            });

            var code2 = getFunctionBody(function () {
                mouseClicked = function () {
                    y = 10;
                };
            });

            debugr.load(code1);
            debugr.start();

            context.mouseClicked();
            setTimeout(function () {
                expect(context.x).to.be(5);
                expect(context.y).to.be(0);

                context.x = 0;  // reset x

                debugr.load(code2);
                debugr.start();

                context.mouseClicked();

                setTimeout(function () {
                    expect(context.x).to.be(0);
                    expect(context.y).to.be(10);

                    done();
                }, 50);
            }, 50);
        });

        it("should clear 'mouseClicked' if the new program doesn't have one", function (done) {
            var code1 = getFunctionBody(function () {
                mouseClicked = function () {
                    x = 5;
                };
            });

            var code2 = getFunctionBody(function () {
                x = 0;
            });

            debugr.load(code1);
            debugr.start();

            context.mouseClicked();
            setTimeout(function () {
                expect(context.x).to.be(5);
                expect(context.y).to.be(0);

                debugr.load(code2);
                debugr.start();

                expect(context.mouseClicked).to.be(undefined);

                done();
            }, 50);
        });
    });

    describe("Delegates", function () {
        // TODO: create a test that exercises the newCallback
        // TODO: re-organize delegate callbacks into a single delegate object on Debugger
        it("should pass", function (done) {
            var debugr;

            function getImage(name) {
                return name;
            }

            var context = {
                //PJSOutput: PJSOutput,
                getImage: getImage,
                tiles: []
            };

            var code = getFunctionBody(function () {
                var Tile = function(pic) {
                    this.pic = pic;
                };

                Tile.prototype.drawFaceUp = function() {
                    image(this.pic, 10, 10);
                };

                var tiles = [];
                tiles.push(new Tile(getImage("creatures/Winston")));
                //tiles.push(PJSOutput.applyInstance(Tile,'Tile')(getImage("creatures/Winston")));

                var draw = function() {
                    tiles[0].drawFaceUp();
                };
            });

            debugr = new Debugger(context);
            //debugr.context = context;
            debugr.load(code);
            debugr.start();

            setTimeout(function () {
                expect(context.tiles[0].pic).to.be("creatures/Winston");
                done();
            }, 100);
        });
    });
});

