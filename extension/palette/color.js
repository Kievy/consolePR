// Color conversions for the accent setting. Runs in the browser and in test/color.test.js.
(function (root) {
    var DEFAULT = "#C64BF2";

    // Accepts "#RRGGBB", "RRGGBB", "#RGB" or "RGB". Returns "#RRGGBB" or null.
    function normalizeHex(text) {
        var value = String(text).trim().replace(/^#/, "");
        if (/^[0-9a-f]{3}$/i.test(value)) {
            value = value.replace(/./g, "$&$&");
        }
        return /^[0-9a-f]{6}$/i.test(value) ? "#" + value.toUpperCase() : null;
    }

    function hexToRgb(hex) {
        var number = parseInt(hex.slice(1), 16);
        return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
    }

    function rgbToHex(rgb) {
        return "#" + rgb.map(function (channel) {
            var part = Math.round(channel).toString(16).toUpperCase();
            return part.length < 2 ? "0" + part : part;
        }).join("");
    }

    // h in 0-360, s and v in 0-1.
    function hexToHsv(hex) {
        var rgb = hexToRgb(hex).map(function (channel) { return channel / 255; });
        var max = Math.max(rgb[0], rgb[1], rgb[2]);
        var delta = max - Math.min(rgb[0], rgb[1], rgb[2]);
        var h = 0;
        if (delta) {
            if (max === rgb[0]) {
                h = ((rgb[1] - rgb[2]) / delta + 6) % 6;
            } else if (max === rgb[1]) {
                h = (rgb[2] - rgb[0]) / delta + 2;
            } else {
                h = (rgb[0] - rgb[1]) / delta + 4;
            }
        }
        return { h: h * 60, s: max ? delta / max : 0, v: max };
    }

    function hsvToHex(hsv) {
        function channel(n) {
            var k = (n + hsv.h / 60) % 6;
            return 255 * hsv.v * (1 - hsv.s * Math.max(0, Math.min(k, 4 - k, 1)));
        }
        return rgbToHex([channel(5), channel(3), channel(1)]);
    }

    // Lighter version of the color, readable as text on the dark window.
    function soften(hex) {
        return rgbToHex(hexToRgb(hex).map(function (channel) {
            return channel + (255 - channel) * 0.45;
        }));
    }

    // Opacity of the glow behind white text: bright colors must stay fainter
    // for the text on top of them to remain readable.
    function glowOpacity(hex) {
        var rgb = hexToRgb(hex);
        var brightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        return brightness > 0.6 ? 0.4 : 0.7;
    }

    root.ConsoleColor = {
        DEFAULT: DEFAULT,
        normalizeHex: normalizeHex,
        hexToRgb: hexToRgb,
        hexToHsv: hexToHsv,
        hsvToHex: hsvToHex,
        soften: soften,
        glowOpacity: glowOpacity
    };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleColor;
    }
})(typeof window !== "undefined" ? window : this);
