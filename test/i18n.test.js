const test = require("node:test");
const assert = require("node:assert");
const { setLocale, locale, t, keys, hostText } = require("../extension/palette/i18n.js");
const { label, fromKeyEvent } = require("../extension/palette/hotkey.js");

test("portuguese locales stay in portuguese and every other locale uses english", () => {
    setLocale("pt_BR");
    assert.strictEqual(locale(), "pt");
    assert.strictEqual(t("search.placeholder"), "Buscar efeito...");
    assert.strictEqual(hostText({ code: "effectMissing", detail: "Desfoque" }), "Efeito não encontrado: Desfoque");
    setLocale("pt-PT");
    assert.strictEqual(locale(), "pt");
    setLocale("");
    assert.strictEqual(locale(), "pt");
    setLocale("en_US");
    assert.strictEqual(locale(), "en");
    assert.strictEqual(t("search.placeholder"), "Search effects...");
    assert.strictEqual(t("frame.saved", { path: "C:\\frame.png" }), "Saved to C:\\frame.png");
    assert.strictEqual(hostText({ code: "selectClip" }), "Select a clip on the timeline.");
    assert.strictEqual(hostText({ message: "raw engine error" }), "raw engine error");
    assert.strictEqual(t(fromKeyEvent(key(65)).error), "Use Ctrl or Alt with the key.");
    setLocale("pt_BR");
    assert.strictEqual(t(fromKeyEvent(key(65)).error), "Use Ctrl ou Alt junto com a tecla.");
});

test("both languages define the same strings", () => {
    assert.deepStrictEqual(keys("pt").sort(), keys("en").sort());
});

test("hotkey label follows the locale argument", () => {
    assert.strictEqual(label("Ctrl+Space", "pt_BR"), "Ctrl + Espaço");
    assert.strictEqual(label("Ctrl+Space", "en_US"), "Ctrl + Space");
    assert.strictEqual(label("Ctrl+Shift+F", "en_US"), "Ctrl + Shift + F");
});

function key(keyCode, modifiers) {
    return Object.assign({ keyCode: keyCode, ctrlKey: false, altKey: false, shiftKey: false }, modifiers);
}

test("rejected hotkeys use translation keys", () => {
    assert.strictEqual(fromKeyEvent(key(65)).error, "hotkey.needModifier");
    assert.strictEqual(fromKeyEvent(key(115, { altKey: true })).error, "hotkey.altF4");
    assert.strictEqual(fromKeyEvent(key(186, { ctrlKey: true })).error, "hotkey.badKey");
});
