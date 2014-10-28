/*global beforeEach */

describe('Stepper', function () {

    var stepper, context;

    beforeEach(function () {
        context = {
            fill: sinon.stub(),
            rect: sinon.stub(),
            x: 0,
            y: 0,
            numbers: []
        };

        stepper = new Stepper(context);
    });

    it("should create a new stepper", function () {
        expect(stepper).not.to.equal(null);
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

        it("should reset the location", function () {
            stepper.run();
            stepper.reset();
            expect(stepper.loc).to.be(null);
        })
    });

    describe("run", function () {
        beforeEach(function () {
            stepper.load("fill(255,0,0);x=5;console.log('hello');_test_global='apple'");
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
    });

    describe("stepOver", function () {
        it("should return the current line number", function () {
            var code = "fill(255,0,0);" +
                "x=5;" +
                "y=10;";
            stepper.load(code);
            var result = stepper.stepOver();
            expect(result.value.lineno).to.be(1);   // line numbers start at 1
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

            expect(stepper.halted()).to.be(true);
        });
    });

    describe.skip("stepIn", function () {
        // TODO: complete tests when stepIn is implemented
    });

    describe.skip("stepOut", function () {
        // TODO: complete tests when stepOut is implemented
    });


    describe("Breakpoints", function () {
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
    });
});
