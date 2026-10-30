const test = require("node:test");
const assert = require("node:assert");
const { rank } = require("../extension/palette/search.js");

const names = ["Fractal", "Fractal Noise", "VR Fractal Noise", "Gaussian Blur", "Desfoque gaussiano", "Correção de cor", "Refração"];

test("prefix matches come before later-word and mid-word matches", () => {
    assert.deepStrictEqual(rank(names, "fr"), ["Fractal", "Fractal Noise", "VR Fractal Noise", "Refração"]);
});

test("search ignores case and accents", () => {
    assert.deepStrictEqual(rank(names, "CORRECAO"), ["Correção de cor"]);
    assert.deepStrictEqual(rank(names, "refraçao"), ["Refração"]);
});

test("letters in order match across words", () => {
    assert.deepStrictEqual(rank(names, "gblur"), ["Gaussian Blur"]);
});

test("empty query lists everything alphabetically", () => {
    assert.strictEqual(rank(names, "  ").length, names.length);
    assert.strictEqual(rank(names, "")[0], "Correção de cor");
});

test("no match returns nothing", () => {
    assert.deepStrictEqual(rank(names, "zzz"), []);
});

test("scoreOf separates direct matches from letters in order", () => {
    const { scoreOf } = require("../extension/palette/search.js");
    assert.strictEqual(scoreOf("Reverb", "rev"), 0);
    assert.strictEqual(scoreOf("Convolution Reverb", "rev"), 1);
    assert.strictEqual(scoreOf("Lens Distortion", "lst"), 3);
    assert.strictEqual(scoreOf("Levels", "zzz"), -1);
});
