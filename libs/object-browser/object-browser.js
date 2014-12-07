function createSpan(text, cls) {
    return $("<span class='" + cls + "'>" + text + "</span>");
}

function createLabel(text) {
    return createSpan(text, "label");
}

function createString(text) {
    return createSpan('"' + text + '"', "string");
}

function genPreview(value, stop) {
    if (typeof(value) === "object") {
        var text = "";
        if (value instanceof Array) {
            text += "Array[" + value.length + "]";
        } else {
            if (stop) {
                text += "Object";
            } else {
                text += "Object {";
                var keys = Object.keys(value);
                for (var i = 0; i < keys.length; i++) {
                    if (i > 0) {
                        text += ", ";
                    }
                    var key = keys[i];
                    text += createLabel(key) + ": ";
                    text += genPreview(value[key], true);
                }
                text += "}";
                return text;
            }
        }
        return createSpan(text, "");
    } else if (typeof(value) === "number") {
        return createSpan(value, "number");
    } else if (typeof(value) === "string") {
        return createString(value);
    } else if (typeof(value) === "boolean") {
        return createSpan(value, "boolean");
    } else if (typeof(value) === "undefined") {
        return createSpan(value, "undefined");
    }
}

function genPropsList(obj, hidden) {
    var $root = $("<ul></ul>").addClass("props");

    if (hidden) {
        $root.hide();
    } else {
    }

    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (typeof(obj[key]) === "object") {
            var $triangle = createSpan("\u25B6", "triangle");
            $root.append(
                $("<li></li>")
                    .css({ position: "relative" })
                    .text(": ")
                    .prepend($triangle, createLabel(key))
                    .append(genPreview(obj[key], true))
            );
            (function (val) {
                $triangle.click(function () {
                    if ($(this).parent().find('> ul').length === 0) {
                        $(this).parent().append(genPropsList(val, true));
                    }
                    var $ul = $(this).parent().find('> ul');
                    $ul.toggle();
                    if ($ul.is(':visible')) {
                        $(this).text('\u25BC');
                    } else {
                        $(this).text('\u25B6');
                    }
                });
            })(obj[key]);
        } else {
            $root.append(
                $("<li></li>")
                    .text(": ")
                    .prepend(createLabel(key))
                    .append(genPreview(obj[key], true))
            );
        }
    }
    if (obj instanceof Array) {
        $root.append(
            $("<li></li>")
                .text(": ")
                .prepend(createSpan("length", "read-only"))
                .append(genPreview(obj.length))
        );
    }

    return $root;
}
