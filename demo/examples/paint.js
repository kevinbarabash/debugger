background(255);

var lineWidth = 10;
var col;

strokeWeight(lineWidth);

mousePressed = function () {
    col = color(random(255), random(255), random(255));
    fill(col);
    noStroke();
    ellipse(mouseX, mouseY, lineWidth, lineWidth);
};

mouseDragged = function () {
    stroke(col);
    line(pmouseX, pmouseY, mouseX, mouseY);
};
