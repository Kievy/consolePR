const test = require("node:test");
const assert = require("node:assert");
const { clampPercent, toInfluence, bezierPoints, preview, bothValue } = require("../extension/palette/keyframes.js");

test("percentages stay whole numbers from 0 to 100", () => {
    assert.strictEqual(clampPercent("33.4"), 33);
    assert.strictEqual(clampPercent(-5), 0);
    assert.strictEqual(clampPercent(250), 100);
    assert.strictEqual(clampPercent("abc"), 0);
});

test("influence never goes below After Effects' minimum", () => {
    assert.strictEqual(toInfluence(0), 0.1);
    assert.strictEqual(toInfluence(50), 50);
});

test("bezier points follow the outgoing and incoming influence", () => {
    assert.deepStrictEqual(bezierPoints(33, 33), [0.33, 0, 0.67, 1]);
    assert.deepStrictEqual(bezierPoints(100, 0), [1, 0, 0.999, 1]);
});

test("preview describes each interpolation", () => {
    assert.strictEqual(preview("hold", 50, 50).timing, "steps(1, end)");
    assert.strictEqual(preview("linear", 50, 50).timing, "linear");
    assert.strictEqual(preview("bezier", 75, 25).timing, "cubic-bezier(0.75, 0, 0.75, 1)");
    assert.strictEqual(preview("bezier", 75, 25).path, "M0 100 C75 100 75 0 100 0");
});

test("the middle slider averages different sides", () => {
    assert.strictEqual(bothValue(40, 40), 40);
    assert.strictEqual(bothValue(20, 60), 40);
});
