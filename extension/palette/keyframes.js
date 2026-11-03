// Preview math for the keyframe panel. Runs in the browser and in test/keyframes.test.js.
(function (root) {
    // After Effects clamps influence to 0.1-100.
    var MIN_INFLUENCE = 0.1;

    function clampPercent(value) {
        var number = Number(value);
        if (!isFinite(number)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(number)));
    }

    function toInfluence(percent) {
        return Math.max(MIN_INFLUENCE, clampPercent(percent));
    }

    // With speed 0, a key's outgoing influence and the next key's incoming influence
    // shape the curve exactly like a CSS cubic-bezier between the two keys.
    function bezierPoints(easeOut, easeIn) {
        var round = function (n) { return Math.round(n * 10000) / 10000; };
        return [round(toInfluence(easeOut) / 100), 0, round(1 - toInfluence(easeIn) / 100), 1];
    }

    // How the preview animates between two keys, for CSS and for the drawn curve.
    // The curve is drawn in a 100x100 box with y pointing down.
    function preview(mode, easeOut, easeIn) {
        if (mode === "hold") {
            return { timing: "steps(1, end)", path: "M0 100 H100 V0" };
        }
        if (mode === "linear") {
            return { timing: "linear", path: "M0 100 L100 0" };
        }
        var p = bezierPoints(easeOut, easeIn);
        var round = function (n) { return Math.round(n * 1000) / 1000; };
        return {
            timing: "cubic-bezier(" + p.map(round).join(", ") + ")",
            path: "M0 100 C" + round(p[0] * 100) + " 100 " + round(p[2] * 100) + " 0 100 0"
        };
    }

    // The middle slider shows a single value only when both sides agree.
    function bothValue(easeIn, easeOut) {
        return clampPercent(easeIn) === clampPercent(easeOut) ? clampPercent(easeIn) : Math.round((clampPercent(easeIn) + clampPercent(easeOut)) / 2);
    }

    root.ConsoleKeyframes = {
        clampPercent: clampPercent,
        toInfluence: toInfluence,
        bezierPoints: bezierPoints,
        preview: preview,
        bothValue: bothValue
    };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleKeyframes;
    }
})(typeof window !== "undefined" ? window : this);
