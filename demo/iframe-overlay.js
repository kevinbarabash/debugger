/**
 * Creates an overlay on top of an iframe that intercepts and retriggers mouse
 * events.  The purpose of this is two-fold:
 * - provide better user experience when a drag operation leaves iframe's bounds
 * - allow events to be filtered to toggle interactivity without having to modify
 *   the code runing inside the iframe
 */

function createIframeOverlay(iframe) {

    var wrapper = $("<span></span>").css({
        position: "relative",
        padding: 0,
        margin: 0,
        display: "inline-block"
    }).addClass("wrapper").get(0);

    var overlay = $("<span></span>").css({
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%"
    }).addClass("overlay").get(0);

    var parent = iframe.parentElement;

    parent.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
    wrapper.appendChild(overlay);

    var state = {
        down: false,
        paused: false
    };

    var poster = new Poster(iframe.contentWindow);

    overlay.addEventListener("mousedown", function (e) {
        state.down = true;
        if (!state.paused) {
            poster.post("mouse", {
                type: "mousedown",
                x: e.pageX - wrapper.offsetLeft,
                y: e.pageY - wrapper.offsetTop
            });
            e.preventDefault();
        }
    });

    overlay.addEventListener("mousemove", function (e) {
        if (!state.down) {
            if (!state.paused) {
                poster.post("mouse", {
                    type: "mousemove",
                    x: e.pageX - wrapper.offsetLeft,
                    y: e.pageY - wrapper.offsetTop
                });
            }
        }
    });

    document.addEventListener("mousemove", function (e) {
        if (state.down) {
            if (!state.paused) {
                poster.post("mouse", {
                    type: "mousemove",
                    x: e.pageX - wrapper.offsetLeft,
                    y: e.pageY - wrapper.offsetTop
                });
            }
        }
    });

    document.addEventListener("mouseup", function (e) {
        if (state.down) {
            if (!state.paused) {
                poster.post("mouse", {
                    type: "mouseup",
                    x: e.pageX - wrapper.offsetLeft,
                    y: e.pageY - wrapper.offsetTop
                });
            }
            state.down = false;
        }
    });

    return state;
}
