/**
 * Simplifies posting messages to another window, iframe, or web worker
 */

function Poster(target) {
    this.target = target;
    this.origin = "*";
    this.listeners = {};

    var self = this;
    window.addEventListener("message", function (e) {
        var channel = e.data.channel;
        var listener = self.listeners[channel];
        if (listener) {
            listener.apply(null, e.data.args);
        }
    });
}

Poster.prototype.post = function (channel) {
    var args = Array.prototype.slice.call(arguments, 1);
    var message = {
        channel: channel,
        args: args
    };
    this.target.postMessage(message, this.origin);
};

// TODO: support multiple listeners in the future
Poster.prototype.listen = function (channel, callback) {
    this.listeners[channel] = callback;
};
