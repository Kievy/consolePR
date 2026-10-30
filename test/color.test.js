const test = require("node:test");
const assert = require("node:assert");
const { normalizeHex, hexToRgb, hexToHsv, hsvToHex, soften, glowOpacity } = require("../extension/palette/color.js");

test("normalizeHex accepts the usual ways of writing a color", () => {
    assert.strictEqual(normalizeHex("#c64bf2"), "#C64BF2");
    assert.strictEqual(normalizeHex("c64bf2"), "#C64BF2");
    assert.strictEqual(normalizeHex(" #F0a "), "#FF00AA");
    assert.strictEqual(normalizeHex("abc"), "#AABBCC");
});

test("normalizeHex rejects everything else", () => {
    for (const bad of ["", "#", "#12", "#1234", "#12345", "#1234567", "#GGGGGG", "red"]) {
        assert.strictEqual(normalizeHex(bad), null, bad);
    }
});

test("hexToRgb reads each channel", () => {
    assert.deepStrictEqual(hexToRgb("#102030"), [16, 32, 48]);
});

test("HSV conversion round-trips", () => {
    for (const hex of ["#C64BF2", "#FF0000", "#00FF00", "#0000FF", "#FFFFFF", "#000000", "#808080", "#12AB9F"]) {
        assert.strictEqual(hsvToHex(hexToHsv(hex)), hex);
    }
});

test("HSV values match known colors", () => {
    assert.deepStrictEqual(hexToHsv("#FF0000"), { h: 0, s: 1, v: 1 });
    assert.strictEqual(hexToHsv("#00FF00").h, 120);
    assert.strictEqual(hexToHsv("#0000FF").h, 240);
    assert.strictEqual(hsvToHex({ h: 360, s: 1, v: 1 }), "#FF0000");
});

test("soften moves toward white", () => {
    assert.strictEqual(soften("#000000"), "#737373");
    assert.strictEqual(soften("#FFFFFF"), "#FFFFFF");
});

test("bright colors get a fainter glow", () => {
    assert.strictEqual(glowOpacity("#FFFF00"), 0.4);
    assert.strictEqual(glowOpacity("#C64BF2"), 0.7);
});
