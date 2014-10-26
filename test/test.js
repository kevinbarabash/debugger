function sketchProc(processing) {
    window.processing = processing;
}

var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
new Processing(canvas, sketchProc);

var stepper = new Stepper(processing);

var code = "size(400, 400);\n" +
    "background(128);\n" +
    "fill(255,0,0);\n" +
    "ellipse(100,100,50,50);\n" +
    "fill(0,0,255);\n" +
    "ellipse(200,200,50,50);";

stepper.load(code);

var lines = code.split("\n");

window.step = function () {
    var result = stepper.stepOver();
    if (result.value) {
        return lines[result.value.start.line - 1];
    }
};

window.run = function () {
    var result = stepper.stepOver();
    while (!result.done && !result.value.breakpoint) {
        result = stepper.stepOver();
    }
    return result;
};

window.reset = function () {
    with (processing) {
        background(228);
        fill(255, 255, 255);
        rect(-10, -10, width + 20, height + 20);
    }
    stepper.reset();
};
