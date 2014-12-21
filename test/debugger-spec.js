/*global describe, it, beforeEach, afterEach */

describe("Debugger", function () {

    var debugr, context;
    var fill, rect, print;

    beforeEach(function () {
        fill = sinon.stub();
        rect = sinon.stub();
        print = sinon.stub();

        context = {
            fill: fill,
            rect: rect,
            x: 0,
            y: 0,
            p: null,
            numbers: [],
            print: print,
            Vector: function (x,y) {
                this.x = x;
                this.y = y;
            }
        };

        debugr = new ProcessingDebugger();
        debugr.context = context;
    });

    describe("start", function () {
        beforeEach(function () {
            debugr.load("fill(255,0,0);x=5;console.log('hello');_test_global='apple';var z=23;");
            sinon.stub(console, "log");
            window._test_global = "";
        });

        afterEach(function () {
            console.log.restore();
            delete window._test_global;
        });

        it("should call functions in the context", function () {
            debugr.start();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
        });

        it("should run again", function () {
            debugr.start();
            debugr.start();
            expect(context.fill.callCount).to.be(2);
        });

        it("should set variables in the context", function () {
            debugr.start();
            expect(context.x).to.equal(5);
        });

        it("should call global functions", function () {
            debugr.start();
            expect(console.log.calledWith("hello")).to.be(true);
        });

        it("should set global variables", function () {
            debugr.start();
            expect(window._test_global).to.be("apple");
        });

        it("shouldn't set local variables on the context", function () {
            debugr.start();
            expect(context.z).to.be(undefined);
        });
    });

    describe("stepOver", function () {
        it("should return the current line number", function () {
            var code = "fill(255,0,0);" +
                "x=5;" +
                "y=10;";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            expect(debugr.line).to.be(1);   // line numbers start at 1
        });

        it("should call run each step one at a time", function () {
            var code = "fill(255,0,0);x=5;y=10;";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.x).to.equal(0);
            expect(context.y).to.equal(0);

            debugr.stepOver();
            expect(context.x).to.equal(5);
            expect(context.y).to.equal(0);

            debugr.stepOver();
            expect(context.y).to.equal(10);
        });

        it("should step through loops", function () {
            var code = getFunctionBody(function () {
                for (var i = 0; i < 3; i++) {
                    numbers[i] = i + 1;
                }
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver(); // for(...)
            debugr.stepOver(); // numbers[0] = 0 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(undefined);
            expect(context.numbers[2]).to.be(undefined);

            debugr.stepOver(); // numbers[1] = 1 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(undefined);

            debugr.stepOver(); // numbers[2] = 2 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(3);

            debugr.stepOver();
        });

        describe("Functions", function () {
            var code;

            it("should run all commands in a function", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();

                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            });

            it("should return the correct line numbers", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    foo();
                });

                debugr.load(code);
                debugr.start(true);

                expect(debugr.line).to.be(1);
                debugr.stepOver();
                expect(debugr.line).to.be(5);
                debugr.stepOver();
                expect(debugr.line).to.be(undefined);
            });

            it("should return the correct line numbers with loops", function () {
                code = getFunctionBody(function () {
                    for (var i = 0; i < 3; i++) {
                        rect(i * 100, 100, 50, 50);
                    }
                });

                debugr.load(code);
                debugr.start(true);

                expect(debugr.line).to.be(1);
                debugr.stepOver();
                expect(debugr.line).to.be(2);
                debugr.stepOver();
                expect(debugr.line).to.be(2);
                debugr.stepOver();
                expect(debugr.line).to.be(2);
                debugr.stepOver();
                expect(debugr.line).to.be(undefined);
            });

            it("should handle nested function calls", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    var bar = function () {
                        fill(0,255,255);
                        foo();
                        rect(200,200,100,100);
                    };
                    bar();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();
                debugr.stepOver();

                expect(context.fill.calledWith(0,255,255)).to.be(true);
                expect(context.rect.calledWith(200,200,100,100)).to.be(true);
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            });

            it("should handle functions with return values", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        return 5;
                    };
                    x = foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();
                debugr.stepOver();

                expect(context.x).to.be(5);
            });

            it("should handle nested function calls in the same expression", function () {
                code = getFunctionBody(function () {
                    var add = function (x,y) {
                        return x + y;
                    };
                    print(add(add(1,2),add(3,4)));
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver(); // var add = ...
                debugr.stepOver(); // add(1,2)
                debugr.stepOver(); // add(3,4)
                debugr.stepOver(); // add(3,7)
                debugr.stepOver(); // print(10)

                expect(context.print.calledWith(10)).to.be(true);
            });

            it("should hanlde stepping over user defined functions containing non-instrumented function calls", function () {
                var code = getFunctionBody(function () {
                    var quadRoot = function (x) {
                        return Math.sqrt(Math.sqrt(x));
                    };
                    x = quadRoot(16);
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();

                expect(context.x).to.be(2);
            });
        });
    });

    describe("stepIn", function () {
        it("should return the current line number", function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                x = 5;
                y = 10;
            });

            debugr.load(code);
            debugr.start(true);
            expect(debugr.line).to.be(1);   // line numbers start at 1
        });

        it("should call run each step one at a time", function () {
            debugr.load("fill(255,0,0);x=5;y=10;");
            debugr.start(true);

            debugr.stepIn();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.x).to.equal(0);
            expect(context.y).to.equal(0);

            debugr.stepIn();
            expect(context.x).to.equal(5);
            expect(context.y).to.equal(0);

            debugr.stepIn();
            expect(context.y).to.equal(10);
        });

        it("should step through loops", function () {
            debugr.load("for(var i=0;i<3;i++){numbers[i]=i+1;}");
            debugr.start(true);

            debugr.stepOver(); // for
            debugr.stepOver(); // numbers[0] = 0 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(undefined);
            expect(context.numbers[2]).to.be(undefined);

            debugr.stepOver(); // numbers[1] = 1 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(undefined);

            debugr.stepOver(); // numbers[2] = 2 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(3);

            debugr.stepOver();
            expect(debugr.line).to.be(undefined);
        });

        describe("Functions", function () {
            var code;

            it("should run only the commands it's stepped to so-far", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepIn();
                debugr.stepIn();
                debugr.stepIn();

                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            });

            it("should return the correct line numbers", function () {
                code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    foo();
                });

                debugr.load(code);
                debugr.start(true);

                var lineNumbers = [1,5,2,3,5];
                lineNumbers.forEach(function (line) {
                    expect(debugr.line).to.be(line);
                    debugr.stepIn();
                });
                expect(debugr.line).to.be(undefined);
            });

            it("should handle nested function calls", function () {
                code = getFunctionBody(function () {
                    var foo = function() {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    var bar = function() {
                        fill(0, 255, 255);
                        foo();
                        rect(200, 200, 100, 100);
                    };
                    bar();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();
                debugr.stepIn();
                debugr.stepOver();
                debugr.stepIn();
                debugr.stepOver();

                expect(context.fill.calledWith(0,255,255)).to.be(true);
                expect(context.fill.calledWith(255,0,0)).to.be(true);

                // these are false because they haven't been reached yet
                expect(context.rect.calledWith(200,200,100,100)).to.be(false);
                expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            });

            it("should return the correct line numbers with nested function calls", function () {
                code = getFunctionBody(function () {
                    var foo = function() {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    };
                    var bar = function() {
                        fill(0, 255, 255);
                        foo();
                        rect(200, 200, 100, 100);
                    };
                    bar();
                });

                debugr.load(code);
                debugr.start(true);

                var lineNumbers = [1,5,10,6,7,2,3,7,8,10];
                lineNumbers.forEach(function (line) {
                    expect(debugr.line).to.be(line);
                    debugr.stepIn();
                });
                expect(debugr.line).to.be(undefined);
            });

            it("should handle nested function calls in the same expression", function () {
                code = getFunctionBody(function () {
                    var add = function (x,y) {
                        return x + y;
                    };
                    print(add(add(1,2),add(3,4)));
                });

                debugr.load(code);
                debugr.start(true);

                expect(debugr.line).to.be(1);
                debugr.stepIn();
                expect(debugr.line).to.be(4);
                debugr.stepIn();
                expect(debugr.line).to.be(2);  // add(1,2)
                debugr.stepIn();
                expect(debugr.line).to.be(4);
                debugr.stepIn();
                expect(debugr.line).to.be(2);  // add(3,4)
                debugr.stepIn();
                expect(debugr.line).to.be(4);
                debugr.stepIn();
                expect(debugr.line).to.be(2);  // add(3,7)
                debugr.stepIn();
                expect(debugr.line).to.be(4);  // print(10)
                debugr.stepIn();

                expect(context.print.calledWith(10)).to.be(true);
            });

            it("should handle nested function calls to non-instrument functions", function () {
                var code = getFunctionBody(function () {
                    x = Math.sqrt(Math.sqrt(16));
                });

                debugr.load(code);
                debugr.start();

                expect(context.x).to.be(2);
            });
        });
    });

    describe("stepOut", function () {
        var code;

        beforeEach(function () {
            code = getFunctionBody(function () {
                var foo = function() {
                    fill(255,0,0);
                    rect(50,50,100,100);
                };
                var bar = function() {
                    fill(0,255,255);
                    foo();
                    rect(200,200,100,100);
                };
            });
        });

        it("should run to the end of the scope after stepping in", function () {
            code += "foo();";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();   // foo();
            expect(context.fill.calledWith(255,0,0)).to.be(false);
            expect(context.rect.calledWith(50,50,100,100)).to.be(false);

            debugr.stepOut();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
        });

        it("should return the correct line numbers", function () {
            code += "foo();\nrect(0,0,10,10);";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();

            debugr.stepIn();
            expect(debugr.line).to.be(2); // for();
            debugr.stepOut();
            expect(debugr.line).to.be(10);
            debugr.stepOver();
            expect(debugr.line).to.be(11);
            debugr.stepOut();
            expect(debugr.line).to.be(undefined);
        });

        it("should handle nested function calls", function () {
            code += "bar();";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();   // bar();
            debugr.stepOver();
            debugr.stepIn();   // foo();

            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(false);
            expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            expect(context.rect.calledWith(200,200,100,100)).to.be(false);

            debugr.stepOut();
            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            expect(context.rect.calledWith(200,200,100,100)).to.be(false);

            debugr.stepOut();
            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            expect(context.rect.calledWith(200,200,100,100)).to.be(true);
        });

        it("should return the correct line numbers with nested functions", function () {
            code += "bar();\nrect(0,0,10,10);";
            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();   // foo();
            debugr.stepOver();
            debugr.stepIn();   // foo();

            debugr.stepOut();
            expect(debugr.line).to.be(7);
            debugr.stepOut();
            expect(debugr.line).to.be(10);
            debugr.stepOut();
            expect(debugr.line).to.be(undefined);
        });
    });

    describe("Objects", function () {
        it("should work with user defined constructors", function () {
            var code = getFunctionBody(function () {
                function Point(x,y) {
                    this.x = x;
                    this.y = y;

                    console.log("end of new Point");
                }
                p = new Point(5,10);
            });

            debugr.load(code);
            debugr.start();

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should work with non-instrumented constructors", function () {
            var code = getFunctionBody(function () {
                p = new Vector(5,10);
            });

            debugr.load(code);
            debugr.start();

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should work with functional expression constructors", function () {
            var code = getFunctionBody(function () {
                var Point = function (x,y) {
                    this.x = x;
                    this.y = y;
                };
                p = new Point(5,10);
            });

            debugr.load(code);
            debugr.start();

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should step into constructors", function () {
            var code = getFunctionBody(function () {
                var Point = function (x,y) {
                    this.x = x;
                    this.y = y;
                };
                p = new Point(5,10);
            });

            debugr.load(code);
            debugr.start(true);

            expect(debugr.line).to.be(1);
            debugr.stepIn();
            expect(debugr.line).to.be(5);
            debugr.stepIn();
            expect(debugr.line).to.be(2);
            debugr.stepIn();
            expect(debugr.line).to.be(3);
            debugr.stepIn();
            expect(debugr.line).to.be(5);
            debugr.stepIn();
            expect(debugr.line).to.be(undefined);

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should work with calling methods on object literals", function () {
            var code = getFunctionBody(function () {
                var obj = {
                    foo: function () {
                        fill(255,0,0);
                        rect(50,50,100,100);
                    },
                    bar: function () {
                        fill(0,255,255);
                        this.foo();
                        rect(200,200,100,100);
                    }
                };
                obj.bar();
            });

            debugr.load(code);
            debugr.start();

            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            expect(context.rect.calledWith(200,200,100,100)).to.be(true);
        });

        it("shouldn't wrap globals", function () {
            var code = getFunctionBody(function () {
                x = Math.sqrt(4);
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(2);
        });

        it("should be able to step over new expresssions", function () {
            var code = getFunctionBody(function () {
                function Point(x,y) {
                    this.x = x;
                    this.y = y;
                }
                p = new Point(5,10);
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should be able to step out of a new expression", function () {
            var code = getFunctionBody(function () {
                function Point(x,y) {
                    this.x = x;
                    this.y = y;
                }
                p = new Point(5,10);
            });

            debugr.load(code);
            debugr.start(true);

            expect(debugr.line).to.be(1);
            debugr.stepOver();
            expect(debugr.line).to.be(5);
            debugr.stepIn();
            expect(debugr.line).to.be(2);
            debugr.stepOut();
            expect(debugr.line).to.be(5);
            debugr.stepOver();
            expect(debugr.line).to.be(undefined);

            expect(context.p.x).to.be(5);
            expect(context.p.y).to.be(10);
        });

        it("should handle defining methods this", function () {
            var code = getFunctionBody(function () {
                var Point = function(x,y) {
                    this.x = x;
                    this.y = y;
                    this.dist = function () {
                        return Math.sqrt(this.x * this.x + this.y * this.y);
                    };
                };
                var p = new Point(3,4);
                x = p.dist();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
        });

        it("should handle defining methods on the prototype", function () {
            var code = getFunctionBody(function () {
                var Point = function(x,y) {
                    this.x = x;
                    this.y = y;
                };
                Point.prototype.dist = function () {
                    return Math.sqrt(this.x * this.x + this.y * this.y);
                };
                var p = new Point(3,4);
                x = p.dist();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
        });

        it("should handle calling methods on chained member expressions", function () {
            var code = getFunctionBody(function () {
                var Point = function(x,y) {
                    this.x = x;
                    this.y = y;
                };
                Point.prototype.dist = function () {
                    return Math.sqrt(this.x * this.x + this.y * this.y);
                };
                var circle = {
                    center: new Point(3,4),
                    radius: 1
                };
                x = circle.center.dist();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
        });

        it("should support inheritance using Object.create", function () {
            var code = getFunctionBody(function () {
                function Foo() {
                    this.x = 5;
                }

                function Bar() {
                    Foo.call(this);
                    this.y = 10;
                }

                Bar.prototype = Object.create(Foo.prototype);

                var bar = new Bar();
                x = bar.x;
                y = bar.y;
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
            expect(context.y).to.be(10);
        });

        // TODO: change how the code is transformed to handle this case
        it.skip("should objects with a next method", function () {
            var code = getFunctionBody(function () {
                var Iterator = function() {
                    this.value = 0;
                };
                Iterator.prototype.next = function () {
                    return this.value++;
                };
                var iter = new Iterator();
                iter.next();
                iter.next();
                iter.next();
                x = iter.next();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(3);
        });
    });

    describe("Breakpoints", function () {
        beforeEach(function () {
            var code = getFunctionBody(function () {
                fill(255,0,0);
                rect(100,100,300,200);
                x = 5;
                y = 10;
                fill(0,255,255);
                rect(x,y,100,100);
            });

            debugr.load(code);
        });

        it("should pause on the correct lines", function () {
            debugr.setBreakpoint(3);
            debugr.start();
            expect(debugr.line).to.be(3);
            expect(context.x).to.be(0);
            debugr.stepOver();
            expect(context.x).to.be(5);
        });

        it("should run after after hitting a breakpoint", function () {
            debugr.setBreakpoint(3);
            debugr.start();
            expect(debugr.line).to.be(3);
            debugr.start();
            expect(context.rect.callCount).to.be(2);
        });

        it("should hit a breakpoint after hitting a breakpoint", function () {
            debugr.setBreakpoint(2);
            debugr.setBreakpoint(4);
            debugr.start();
            expect(debugr.line).to.be(2);
            debugr.resume();
            expect(debugr.line).to.be(4);
            expect(context.y).to.be(0);
            debugr.stepOver();
            expect(context.y).to.be(10);
        });

        it("should set breakpoints when paused", function () {
            debugr.setBreakpoint(2);
            debugr.start();
            debugr.setBreakpoint(4);
            debugr.resume();
            expect(context.y).to.be(0);
            debugr.stepOver();
            expect(context.y).to.be(10);
        });

        it("should clear breakpoints when paused", function () {
            debugr.setBreakpoint(2);
            debugr.setBreakpoint(4);
            debugr.start();
            debugr.clearBreakpoint(4);
            debugr.resume();
            expect(context.rect.callCount).to.be(2);
        });

        describe("Functions", function () {
            beforeEach(function () {
                var code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(100,100,300,200);
                    };
                    foo();
                });

                debugr.load(code);
            });

            it("should break inside functions", function () {
                debugr.setBreakpoint(3);
                debugr.start();
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.callCount).to.be(0);
                debugr.resume();
                expect(context.rect.calledWith(100,100,300,200)).to.be(true);
            });

            it("shouldn't hit a breakpoint one a function call when calling 'run' from inside", function () {
                var code = getFunctionBody(function () {
                    var foo = function () {
                        fill(255,0,0);
                        rect(100,100,300,200);
                    };
                    foo();
                    fill(0,255,255);
                    rect(200,200,50,50);
                });

                debugr.load(code);

                debugr.setBreakpoint(5);

                debugr.start();
                expect(context.fill.callCount).to.be(0);

                debugr.stepIn();
                debugr.stepOver();
                expect(context.fill.callCount).to.be(1);

                debugr.resume();
                expect(debugr.line).to.be(undefined);
                expect(context.fill.callCount).to.be(2);
                expect(context.rect.callCount).to.be(2);
            });
        });
    });

    describe("Scopes and Context", function () {
        it("should update the values of in scope variables", function () {
            var code = getFunctionBody(function () {
                var dist = function (x1, y1, x2, y2) {
                    var dx, dy, d_sq;
                    dx = x2 - x1;
                    dy = y2 - y1;
                    d_sq = dx * dx + dy * dy;
                    return Math.sqrt(d_sq);
                };
                print(dist(8, 5, 4, 2));
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();
            debugr.stepOver();

            var scope = debugr.currentScope;
            expect(scope.x1).to.be(8);
            expect(scope.y1).to.be(5);
            expect(scope.x2).to.be(4);
            expect(scope.y2).to.be(2);

            expect(scope.dx).to.be(undefined);
            expect(scope.dy).to.be(undefined);
            expect(scope.d_sq).to.be(undefined);

            debugr.stepOver();
            expect(scope.dx).to.be(-4);

            debugr.stepOver();
            expect(scope.dy).to.be(-3);

            debugr.stepOver();
            expect(scope.d_sq).to.be(25);

            debugr.stepOut();
            debugr.stepOut();

            expect(context.print.calledWith(5)).to.be(true);
        });

        it("should update variables in the root scope", function () {
            var code = getFunctionBody(function () {
                var a, b, c;
                a = 5;
                b = 10;
                c = a + b;
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            var scope = debugr.currentScope;
            expect(scope.a).to.be(undefined);
            expect(scope.b).to.be(undefined);
            expect(scope.c).to.be(undefined);

            debugr.stepOver();
            expect(scope.a).to.be(5);

            debugr.stepOver();
            expect(scope.b).to.be(10);

            debugr.stepOver();
            expect(scope.c).to.be(15);
        });

        it("should not include variables from the context in the root scope", function () {
            var code = getFunctionBody(function () {
                var x, y, a, b;
                x = 5;
                y = 10;
                a = x;
                b = y;
            });

            debugr.load(code);
            debugr.start(true);

            var scope = debugr.currentScope;
            expect(scope.a).to.be(undefined);
            expect(scope.b).to.be(undefined);
            expect(scope.hasOwnProperty("x")).to.be(false);
            expect(scope.hasOwnProperty("y")).to.be(false);

            debugr.resume();
            expect(context.x).to.be(5);
            expect(context.y).to.be(10);

            expect(scope.a).to.be(5);
            expect(scope.b).to.be(10);
        });

        it("should allow you to redeclare variables in context and have them still be accessible", function () {
            var code = getFunctionBody(function () {
                var x = 5;
                var y = 10;
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
            expect(context.y).to.be(10);
        });
        
        it("should support changing the context after running", function () {
            var code1 = getFunctionBody(function () {
                var x = 5;
                var y = 10;
            });

            debugr.load(code1);
            debugr.start();

            expect(context.x).to.be(5);
            expect(context.y).to.be(10);

            var code2 = getFunctionBody(function () {
                var Vector = function (x,y) {
                    this.x = x;
                    this.y = y;
                    console.log("end of new Vector");
                };
                v = new Vector(5,10);
            });
            
            var newContext = {
                v: undefined
            };

            debugr.context = newContext;
            debugr.load(code2);
            debugr.start();
            
            expect(newContext.v.x).to.be(5);
            expect(newContext.v.y).to.be(10);
        });
        
        it("should inject a __usingDebugger variable into the context", function () {
            expect(context.__usingDebugger).to.be(true);
        });
    });

    // all function calls are treated as ambiguous by _createDebugGenerator
    // the stepper resolves whether the function being called returns a
    // generator or not
    describe("Ambiguous method calls", function () {
        // Sometimes it's not possible to tell if a method call is to a built-in
        // function that we can't step into or if it's been properly converted
        // to a generate because it is a user-defined function.  These tests
        // make sure that we can handle these cases.  Original test code taken
        // from live-editor/output/pjs/output_test.js

        it("Verify that toString() Works", function () {
            var code = getFunctionBody(function () {
                var num = 50;
                num = parseInt(num.toString(), 10);
            });

            debugr.load(code);
            debugr.start();
        });

        it("Verify that toString() Works with stepOver", function () {
            var code = getFunctionBody(function () {
                var num = 50;
                num = parseInt(num.toString(), 10);
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepOver();
        });

        it("Verify that toString() works with stepOut", function () {
            var code = getFunctionBody(function () {
                var foo = function () {
                    var num = 50;
                    num = parseInt(num.toString(), 10);
                };
                foo();
            });

            debugr.load(code);
            debugr.start(true);

            expect(debugr.line).to.be(1);
            debugr.stepOver();
            expect(debugr.line).to.be(5);
            debugr.stepIn();
            expect(debugr.line).to.be(2);
            debugr.stepOut();
        });
    });

    describe("Functions returning functions", function () {
        it("should run a function returned by another function", function () {
            var code = getFunctionBody(function () {
                var foo = function () {
                    return function () {
                        x = 5;
                    };
                };
                var bar = foo();
                bar();
            });

            debugr.load(code);

            debugr.start();

            expect(context.x).to.be(5);
        });

        it("should step into a function returned by another function", function () {
            var code = getFunctionBody(function () {
                var foo = function () {
                    return function () {
                        x = 5;
                    };
                };
                var bar = foo();
                bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();
            expect(debugr.line).to.be(3);
            debugr.stepOut();
        });

        it("should be able to call a returned function immediately", function () {
            var code = getFunctionBody(function () {
                var foo = function () {
                    return function () {
                        x = 5;
                    };
                };
                foo()();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
        });

        it("should be able to step into a returned function immediately", function () {
            var code = getFunctionBody(function () {
                var foo = function () {
                    return function () {
                        x = 5;
                    };
                };
                foo()();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();
            expect(debugr.line).to.be(2);
            debugr.stepOut();
            expect(debugr.line).to.be(6);
            debugr.stepIn();
            expect(debugr.line).to.be(3);
            debugr.stepOut();
        });

        it("should be able to call a method that returns a function", function () {
            var code = getFunctionBody(function () {
                var obj = {
                    foo: function () {
                        return function () {
                            x = 5;
                        };
                    }
                };
                obj.foo()();
            });

            debugr.load(code);
            debugr.start();

            expect(context.x).to.be(5);
        });
        
        it("should be able to access variables from the closure", function () {
            var code = getFunctionBody(function () {
                var a = "hello";
                var foo = function () {
                    var a = "goodbye";
                    return function () {
                        return a;
                    }
                };
                
                y = foo()();
                x = a;
            });

            debugr.load(code);
            debugr.start();
            
            expect(context.x).to.be("hello");
            expect(context.y).to.be("goodbye");
        });
    });

    describe("calling functions in various places", function () {
        describe("var declarations", function () {
            it("should step into var x = foo()", function () {
                var code = getFunctionBody(function (){
                    var foo = function () {
                        print("foo");
                    };
                    var x = foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                expect(debugr.line).to.be(4);
                debugr.stepOver();
                expect(debugr.line).to.be(undefined);
            });

            it("should step over var x = foo()", function () {
                var code = getFunctionBody(function (){
                    var foo = function () {
                        print("foo");
                    };
                    var bar = function () {
                        print("bar");
                    };
                    var x = foo();
                    var y = foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();
                expect(debugr.line).to.be(7);
                debugr.stepOver();
                expect(debugr.line).to.be(8);
                debugr.stepOver();
                expect(debugr.line).to.be(undefined);
            });

            it("should step over var x = foo(), y = bar()", function () {
                var code = getFunctionBody(function (){
                    var foo = function () {
                        print("foo");
                    };
                    var bar = function () {
                        print("bar");
                    };
                    var x = foo(), y = foo();
                });

                debugr.load(code);
                debugr.start(true);

                debugr.stepOver();
                debugr.stepOver();
                expect(debugr.line).to.be(7);
                debugr.stepOver();
                expect(debugr.line).to.be(7);
                debugr.stepOver();
                expect(debugr.line).to.be(undefined);
            });
        });

        describe("for loops", function () {
            // TODO: yield on init, test, and update parts of the ForExpression
            it.skip("should step over each part of the ForStatement separately", function () {
                var code = getFunctionBody(function () {
                    for (var i = 0; i < 2; i++) {
                        x = i + 1;
                    }
                });
                
                debugr.load(code);
                debugr.start(true);

                expect(debugr.line).to.be(1);   // var i = 0
                debugr.stepOver();
                expect(debugr.line).to.be(1);   // i < 2
                debugr.stepOver();
                expect(debugr.line).to.be(1);   // i++
                debugr.stepOver();
                expect(debugr.line).to.be(2);   // x = i + 1
                debugr.stepOver();
                expect(debugr.line).to.be(1);   // i < 2
                debugr.stepOver();
                expect(debugr.line).to.be(1);   // i++
                debugr.stepOver();
                expect(debugr.line).to.be(2);   // x = i + 1
                debugr.stepOver();
                
                expect(context.x).to.be(2);
            });

            it("should step through function calls appear in the ForStatement", function () {
                var code = getFunctionBody(function () {
                    var init = function () {
                        return 0;
                    };
                    var cmp = function (i) {
                        return i < 2;
                    };
                    var inc = function (i) {
                        return i + 1;
                    };
                    for (var i = init(); cmp(i); i = inc(i)) {
                        x = i + 1;
                    }
                });

                debugr.load(code);
                debugr.start(true);
                
                expect(debugr.line).to.be(1);
                debugr.stepOver();
                expect(debugr.line).to.be(4);
                debugr.stepOver();
                expect(debugr.line).to.be(7);
                debugr.stepOver();
                expect(debugr.line).to.be(10);  // var i = init();
                debugr.stepOver();
                expect(debugr.line).to.be(10);  // cmp(i);
                debugr.stepOver();
                expect(debugr.line).to.be(10);  // i = inc(i);
                debugr.stepOver();
                expect(debugr.line).to.be(11);  // x = i + 1;
                debugr.stepOver();
                expect(context.x).to.be(1);
                expect(debugr.line).to.be(10);  // cmp(i);
                debugr.stepOver();
                expect(debugr.line).to.be(10);  // i = inc(i);
                debugr.stepOver();
                expect(debugr.line).to.be(11);  // x = i + 1;
                debugr.stepOver();
                expect(context.x).to.be(2);
            });
        });
    });

    describe("Functions", function () {
        it("should work with empty functions", function () {
            var code = getFunctionBody(function () {
                function foo(x,y) {}
                foo(x,y);
            });

            debugr.load(code);

            debugr.start();
        });
    });

    describe("Call Stack", function () {

        it("should work with anonymous object literals", function () {
            var code = getFunctionBody(function () {
                function bar(obj) {
                    obj.foo();
                }
                bar({
                    foo: function () {
                        x = 5;
                    }
                });
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();
            debugr.stepIn();

            expect(debugr.line).to.be(6);
            expect(debugr.currentStack[2].name).to.be("<anonymous>.foo");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with anonymous functions", function () {
            var code = getFunctionBody(function () {
                function bar(callback) {
                    callback();
                }
                bar(function () {
                    x = 5;
                });
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();
            debugr.stepIn();

            expect(debugr.line).to.be(5);
            expect(debugr.currentStack[2].name).to.be("<anonymous>");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with object literals (variable declaration)", function () {
            var code = getFunctionBody(function () {
                var obj = {
                    foo: {
                        bar: function () {
                            x = 5;
                        }
                    }
                };
                obj.foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(4);
            expect(debugr.currentStack[1].name).to.be("obj.foo.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with object literals (assignment expression)", function () {
            var code = getFunctionBody(function () {
                var obj;
                obj = {
                    foo: {
                        bar: function () {
                            x = 5;
                        }
                    }
                };
                obj.foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(5);
            expect(debugr.currentStack[1].name).to.be("obj.foo.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with methods defined on the prototype (function declaration)", function () {
            var code = getFunctionBody(function () {
                function Foo () {}
                Foo.prototype.bar = function () {
                    x = 5;
                };
                var foo = new Foo();
                foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(3);
            expect(debugr.currentStack[1].name).to.be("Foo.prototype.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with methods defined on the prototype (function expression)", function () {
            var code = getFunctionBody(function () {
                var Foo = function () {};
                Foo.prototype.bar = function () {
                    x = 5;
                };
                var foo = new Foo();
                foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(3);
            expect(debugr.currentStack[1].name).to.be("Foo.prototype.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        it("should work with methods defined on 'this'", function () {
            var code = getFunctionBody(function () {
                var Foo = function() {
                    this.bar = function () {
                        x = 5;
                    }
                };
                var foo = new Foo();
                foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(3);
            // TODO: fix this so that it says Foo.prototype.bar
            expect(debugr.currentStack[1].name).to.be("this.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });

        // TODO: fix the stepper so that this test case passes
        it.skip("should work with methods defined on 'this' (function declaration constructor)", function () {
            var code = getFunctionBody(function () {
                function Foo() {
                    this.bar = function () {
                        x = 5;  // Foo is hoisted outside of the "with" statement which cause x to refer to window.x
                    }
                }
                var foo = new Foo();
                foo.bar();
            });

            debugr.load(code);
            debugr.start(true);

            debugr.stepOver();
            debugr.stepOver();
            debugr.stepIn();

            expect(debugr.line).to.be(3);
            // TODO: fix this so that it says Foo.prototype.bar
            expect(debugr.currentStack[1].name).to.be("this.bar");

            debugr.resume();

            expect(context.x).to.be(5);
        });
    });

    describe("lifecyle", function () {
        it("should call 'onFunctionDone' when complete", function (done) {
            var code = getFunctionBody(function (done) {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.onFunctionDone = function () {
                done();
            };
            debugr.load(code);
            debugr.start();
        });

        it("should call 'onBreakpoint' when a breakpoint is hit", function (done) {
            var code = getFunctionBody(function (done) {
                fill(255,0,0);
                rect(100,200,50,50);
            });

            debugr.breakpoints = {
                "1": true
            };
            debugr.onBreakpoint = function () {
                debugr.resume();
                done();
            };
            debugr.load(code);
            debugr.start();
        })
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

            var emptyFunction = "functionemptyFunction(){}";

            context.mouseClicked();
            setTimeout(function () {
                expect(context.x).to.be(5);
                expect(context.y).to.be(0);

                debugr.load(code2);
                debugr.start();

                expect(context.mouseClicked.toString().replace(/\s/g,"")).to.be(emptyFunction);

                done();
            }, 50);
        });
    });

    describe("Callbacks", function () {
        it("should pass constructor, constructor name, constructed object, and args to onNewObject callback", function () {
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

                var draw = function() {
                    tiles[0].drawFaceUp();
                };
            });

            debugr = new ProcessingDebugger(context);
            debugr.onNewObject = sinon.stub();
            debugr.load(code);
            debugr.start();

            expect(context.tiles[0].pic).to.be("creatures/Winston");
            expect(debugr.onNewObject.called).to.be(true);

            var args = debugr.onNewObject.getCall(0).args;
            expect(args[1]).to.be("Tile");
            expect(args[2].pic).to.be("creatures/Winston");
            expect(args[3][0]).to.be("creatures/Winston");
        });
    });
});
