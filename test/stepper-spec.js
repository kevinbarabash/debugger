/*global describe, it, beforeEach, afterEach */

describe('Stepper', function () {

    var stepper, context;

    beforeEach(function () {
        context = {
            fill: sinon.stub(),
            rect: sinon.stub(),
            x: 0,
            y: 0,
            numbers: [],
            print: console.log.bind(console)
        };

        stepper = new Stepper(context);
    });

    describe("load", function () {
        it("should reset the halted", function () {
            stepper.load("fill(255,0,0);");
            stepper.run();
            stepper.load("fill(255,0,0);x=5;");

            expect(stepper.halted()).to.be(false);
        });

        it("should regenerate debug code", function () {
            stepper.load("fill(255,0,0);");
            var debug1 = stepper.debugCode;
            stepper.run();
            stepper.load("fill(255,0,0);x=5;");
            var debug2 = stepper.debugCode;

            expect(debug1).not.to.equal(debug2);
        });
    });

    describe("reset", function () {
        beforeEach(function () {
            stepper.load("fill(255,0,0);");
        });

        it("should allow run() to be called again", function () {
            stepper.run();
            stepper.reset();
            stepper.run();
            expect(context.fill.callCount).to.be(2);
        });

        it("should reset halted", function () {
            stepper.run();
            stepper.reset();
            expect(stepper.halted()).to.be(false);
        });
    });

    describe("run", function () {
        beforeEach(function () {
            stepper.load("fill(255,0,0);x=5;console.log('hello');_test_global='apple';var z=23;");
            sinon.stub(console, "log");
            window._test_global = "";
        });

        afterEach(function () {
            console.log.restore();
            delete window._test_global;
        });

        it("should call functions in the context", function () {
            stepper.run();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
        });

        it("shouldn't run again", function () {
            stepper.run();
            stepper.run();
            expect(context.fill.callCount).to.be(1);
        });

        it("should be halted after running", function () {
            stepper.run();
            expect(stepper.halted()).to.be(true);
        });

        it("should set variables in the context", function () {
            stepper.run();
            expect(context.x).to.equal(5);
        });

        it("should call global functions", function () {
            stepper.run();
            expect(console.log.calledWith("hello")).to.be(true);
        });

        it("should set global variables", function () {
            stepper.run();
            expect(window._test_global).to.be("apple");
        });

        it("shouldn't set local variabls on the context", function () {
            stepper.run();
            expect(context.z).to.be(undefined);
        });
    });

    describe("stepOver", function () {
        it("should return the current line number", function () {
            var code = "fill(255,0,0);" +
                "x=5;" +
                "y=10;";
            stepper.load(code);
            var lineno = stepper.stepOver();
            expect(lineno).to.be(1);   // line numbers start at 1
        });

        it("should call run each step one at a time", function () {
            stepper.load("fill(255,0,0);x=5;y=10;");

            stepper.stepOver(); // prime the stepper

            stepper.stepOver();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.x).to.equal(0);
            expect(context.y).to.equal(0);

            stepper.stepOver();
            expect(context.x).to.equal(5);
            expect(context.y).to.equal(0);

            stepper.stepOver();
            expect(context.y).to.equal(10);
        });

        it("should step through loops", function () {
            stepper.load("for(var i=0;i<3;i++){numbers[i]=i+1;}");

            console.log(stepper.debugCode);
            stepper.stepOver(); // prime the stepper

            stepper.stepOver(); // for
            stepper.stepOver(); // numbers[0] = 0 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(undefined);
            expect(context.numbers[2]).to.be(undefined);

            stepper.stepOver(); // numbers[1] = 1 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(undefined);

            stepper.stepOver(); // numbers[2] = 2 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(3);

            stepper.stepOver();

            expect(stepper.halted()).to.be(true);
        });

        describe("Functions", function () {
            var code, lineno;

            beforeEach(function () {
                code = "var foo = function() {\n" +
                    "  fill(255,0,0);\n" +
                    "  rect(50,50,100,100);\n" +
                    "}\n" +
                    "var bar = function() {\n" +
                    "  fill(0,255,255);\n" +
                    "  foo();\n" +
                    "  rect(200,200,100,100);\n" +
                    "}\n";
            });

            it("should run all commands in a function", function () {
                code += "foo();";
                stepper.load(code);
                console.log(stepper.debugCode);

                stepper.stepOver(); // prime the stepper
                stepper.stepOver();
                stepper.stepOver();
                stepper.stepOver();
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            });

            it("should return the correct line numbers", function () {
                code += "foo();";
                stepper.load(code);

                lineno = stepper.stepOver(); // prime the stepper
                expect(lineno).to.be(1);
                lineno = stepper.stepOver();
                expect(lineno).to.be(5);
                lineno = stepper.stepOver();
                expect(lineno).to.be(10);
                lineno = stepper.stepOver();
                expect(lineno).to.be(0);
                expect(stepper.halted()).to.be(true);
            });

            it("should handle nested function calls", function () {
                code += "bar();";
                stepper.load(code);

                stepper.stepOver(); // prime the stepper
                stepper.stepOver();
                stepper.stepOver();
                stepper.stepOver();
                expect(context.fill.calledWith(0,255,255)).to.be(true);
                expect(context.rect.calledWith(200,200,100,100)).to.be(true);
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            });

            it("should handle functions with return values", function () {
                code = "var foo = function() {\n" +
                    "  return 5;\n" +
                    "};\n" +
                    "x = foo();";

                stepper.load(code);
                console.log(stepper.debugCode);

                stepper.stepOver(); // prime the stepper
                stepper.stepOver();
                stepper.stepOver();
                stepper.stepOver();
                expect(context.x).to.be(5);
            });
            
            it("should handle nested function calls in the same expression", function () {
                code = "var add = function (x,y) {\n" +
                    "  return x + y;\n" +
                    "};\n" +
//                    "print(add(1,2));\n" +
                    "print(add(add(1,2),add(3,4)));";

                stepper.load(code);
                console.log(stepper.debugCode);
                console.log(stepper.ast);
                stepper.stepOver(); // prime the stepper
                stepper.stepOver();
                stepper.stepOver();
                stepper.stepOver();
                stepper.stepOver();
            });
        });
    });

    describe("stepIn", function () {
        it("should return the current line number", function () {
            var code = "fill(255,0,0);" +
                "x=5;" +
                "y=10;";
            stepper.load(code);
            var lineno = stepper.stepIn();
            expect(lineno).to.be(1);   // line numbers start at 1
        });

        it("should call run each step one at a time", function () {
            stepper.load("fill(255,0,0);x=5;y=10;");

            stepper.stepIn(); // prime the stepper

            stepper.stepIn();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.x).to.equal(0);
            expect(context.y).to.equal(0);

            stepper.stepIn();
            expect(context.x).to.equal(5);
            expect(context.y).to.equal(0);

            stepper.stepIn();
            expect(context.y).to.equal(10);
        });

        it("should step through loops", function () {
            stepper.load("for(var i=0;i<3;i++){numbers[i]=i+1;}");

            stepper.stepOver(); // prime the stepper

            stepper.stepOver(); // for
            stepper.stepOver(); // numbers[0] = 0 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(undefined);
            expect(context.numbers[2]).to.be(undefined);

            stepper.stepOver(); // numbers[1] = 1 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(undefined);

            stepper.stepOver(); // numbers[2] = 2 + 1;
            expect(context.numbers[0]).to.be(1);
            expect(context.numbers[1]).to.be(2);
            expect(context.numbers[2]).to.be(3);

            stepper.stepOver();

            expect(stepper.halted()).to.be(true);
        });

        describe("Functions", function () {
            var code, lineno;

            beforeEach(function () {
                code = "var foo = function() {\n" +
                    "  fill(255,0,0);\n" +
                    "  rect(50,50,100,100);\n" +
                    "}\n" +
                    "var bar = function() {\n" +
                    "  fill(0,255,255);\n" +
                    "  foo();\n" +
                    "  rect(200,200,100,100);\n" +
                    "}\n";
            });

            it("should run only the commands it's stepped to so-far", function () {
                code += "foo();";
                stepper.load(code);
                console.log(stepper.debugCode);

                stepper.stepIn(); // prime the stepper
                stepper.stepIn();
                stepper.stepIn();
                stepper.stepIn();
                stepper.stepIn();
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            });

            it("should return the correct line numbers", function () {
                code += "foo();";
                stepper.load(code);
                console.log(stepper.debugCode);

                lineno = stepper.stepIn();  // prime the stepper
                expect(lineno).to.be(1);
                lineno = stepper.stepIn();
                expect(lineno).to.be(5);
                lineno = stepper.stepIn();
                expect(lineno).to.be(10);
                lineno = stepper.stepIn();
                expect(lineno).to.be(2);
                lineno = stepper.stepIn();
                expect(lineno).to.be(3);
                lineno = stepper.stepIn();
                expect(lineno).to.be(10);   // end of function
                lineno = stepper.stepIn();
                expect(lineno).to.be(0);    // end of program
                lineno = stepper.stepIn();
                expect(stepper.halted()).to.be(true);
            });

            it("should handle nested function calls", function () {
                code += "bar();";
                stepper.load(code);

                stepper.stepOver(); 
                stepper.stepOver(); 
                stepper.stepOver();
                stepper.stepIn();
                stepper.stepOver();
                stepper.stepIn();
                stepper.stepOver();
                expect(context.fill.calledWith(0,255,255)).to.be(true);
                expect(context.fill.calledWith(255,0,0)).to.be(true);

                // these are false because they haven't been reached yet
                expect(context.rect.calledWith(200,200,100,100)).to.be(false);
                expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            });

            it("should return the correct line numbers with nested function calls", function () {
                code += "bar();";
                stepper.load(code);

                lineno = stepper.stepIn(); // prime the stepper
                expect(lineno).to.be(1);
                lineno = stepper.stepIn();
                expect(lineno).to.be(5);
                lineno = stepper.stepIn();
                expect(lineno).to.be(10);
                lineno = stepper.stepIn();  // bar();
                expect(lineno).to.be(6);
                lineno = stepper.stepIn();
                expect(lineno).to.be(7);
                lineno = stepper.stepIn();  // foo();
                expect(lineno).to.be(2);
                lineno = stepper.stepIn();
                expect(lineno).to.be(3);
                lineno = stepper.stepIn();
                expect(lineno).to.be(7);    // exit foo();
                lineno = stepper.stepIn();
                expect(lineno).to.be(8);
                lineno = stepper.stepIn();
                expect(lineno).to.be(10);   // exit bar();
                lineno = stepper.stepIn();
                expect(lineno).to.be(0);    // end of program
                lineno = stepper.stepIn();
                expect(stepper.halted()).to.be(true);
            });
        });
    });

    describe("stepOut", function () {
        var code, lineno;

        beforeEach(function () {
            code = "var foo = function() {\n" +
                "  fill(255,0,0);\n" +
                "  rect(50,50,100,100);\n" +
                "}\n" +
                "var bar = function() {\n" +
                "  fill(0,255,255);\n" +
                "  foo();\n" +
                "  rect(200,200,100,100);\n" +
                "}\n";
        });

        it("should run to the end of the scope after stepping in", function () {
            code += "foo();";
            stepper.load(code);

            stepper.stepOver();
            stepper.stepOver();
            stepper.stepIn();   // foo();
            expect(context.fill.calledWith(255,0,0)).to.be(false);
            expect(context.rect.calledWith(50,50,100,100)).to.be(false);

            stepper.stepOut();
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
        });

        it("should return the correct line numbers", function () {
            code += "foo();\n" +
                "rect(0,0,10,10);";
            stepper.load(code);

            stepper.stepOver(); // prime the stepper
            stepper.stepOver();
            stepper.stepOver();

            lineno = stepper.stepIn();   // foo();
            expect(lineno).to.be(2);
            lineno = stepper.stepOut();
            expect(lineno).to.be(10);
            lineno = stepper.stepOver();
            expect(lineno).to.be(11);
            lineno = stepper.stepOut();
            expect(lineno).to.be(0);  // halted
        });

        it("should handle nested function calls", function () {
            code += "bar();";
            stepper.load(code);

            stepper.stepOver(); // prime the stepper
            stepper.stepOver();
            stepper.stepOver();
            stepper.stepIn();   // bar();
            stepper.stepOver();
            stepper.stepIn();   // foo();

            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(false);
            expect(context.rect.calledWith(50,50,100,100)).to.be(false);
            expect(context.rect.calledWith(200,200,100,100)).to.be(false);

            stepper.stepOut();
            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            expect(context.rect.calledWith(200,200,100,100)).to.be(false);

            stepper.stepOut();
            expect(context.fill.calledWith(0,255,255)).to.be(true);
            expect(context.fill.calledWith(255,0,0)).to.be(true);
            expect(context.rect.calledWith(50,50,100,100)).to.be(true);
            expect(context.rect.calledWith(200,200,100,100)).to.be(true);
        });

        it("should return the correct line numbers with nested functions", function () {
            code += "bar();\n" +
                "rect(0,0,10,10);";
            stepper.load(code);
            console.log(code);
            console.log(stepper.debugCode);

            stepper.stepOver(); // prime the stepper
            stepper.stepOver();
            stepper.stepOver();
            stepper.stepIn();   // foo();
            stepper.stepOver();
            console.log(stepper.stepIn());   // foo();

            lineno = stepper.stepOut();
            expect(lineno).to.be(7);            
            lineno = stepper.stepOut();
            expect(lineno).to.be(10);
            lineno = stepper.stepOut();
            expect(lineno).to.be(0);
            expect(stepper.halted()).to.be(true);
        });

    });

    describe.skip("Breakpoints", function () {
        beforeEach(function () {
            var code = "fill(255,0,0);\n" +
                "rect(100,100,300,200);\n" +
                "x = 5;\n" +
                "y = 10;\n" +
                "fill(0,255,255);\n" +
                "rect(x,y,100,100);";

            stepper.load(code);
        });

        it("should pause on the correct lines", function () {
            stepper.setBreakpoint(3);
            stepper.run();
            expect(context.x).to.be(0);
            stepper.stepOver();
            expect(context.x).to.be(5);
        });

        it("should run after after hitting a breakpoint", function () {
            stepper.setBreakpoint(3);
            stepper.run();
            stepper.run();
            expect(context.rect.callCount).to.be(2);
        });

        it("should hit a breakpoint after hitting a breakpoint", function () {
            stepper.setBreakpoint(2);
            stepper.setBreakpoint(4);
            stepper.run();
            stepper.run();
            expect(context.y).to.be(0);
            stepper.stepOver();
            expect(context.y).to.be(10);
        });

        it("should set breakpoints when paused", function () {
            stepper.setBreakpoint(2);
            stepper.run();
            stepper.setBreakpoint(4);
            stepper.run();
            expect(context.y).to.be(0);
            stepper.stepOver();
            expect(context.y).to.be(10);
        });

        it("should clear breakpoints when paused", function () {
            stepper.setBreakpoint(2);
            stepper.setBreakpoint(4);
            stepper.run();
            stepper.clearBreakpoint(4);
            stepper.run();
            expect(context.rect.callCount).to.be(2);
        });

        describe("Functions", function () {
            beforeEach(function () {
                var code = "var foo = function () {\n" +
                    "  fill(255,0,0);\n" +
                    "  rect(100,100,300,200);\n" +
                    "};\n" +
                    "foo();";

                stepper.load(code);
            });

            it("should break inside functions", function () {
                stepper.setBreakpoint(3);
                stepper.run();
                expect(context.fill.calledWith(255,0,0)).to.be(true);
                expect(context.rect.callCount).to.be(0);
                stepper.run();
                expect(context.rect.calledWith(100,100,300,200)).to.be(true);
            });
        });
    });
});
