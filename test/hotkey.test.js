const test = require("node:test");
const assert = require("node:assert");
const { defaultFor, settingFor, fromKeyEvent, label } = require("../extension/palette/hotkey.js");

function key(keyCode, modifiers) {
    return Object.assign({ keyCode: keyCode, ctrlKey: false, altKey: false, shiftKey: false }, modifiers);
}

test("builds the combination in a fixed order", () => {
    assert.deepStrictEqual(fromKeyEvent(key(70, { shiftKey: true, ctrlKey: true })), { hotkey: "Ctrl+Shift+F" });
    assert.deepStrictEqual(fromKeyEvent(key(32, { ctrlKey: true, altKey: true })), { hotkey: "Ctrl+Alt+Space" });
    assert.deepStrictEqual(fromKeyEvent(key(49, { altKey: true })), { hotkey: "Alt+1" });
});

test("function keys work without a modifier", () => {
    assert.deepStrictEqual(fromKeyEvent(key(113)), { hotkey: "F2" });
    assert.deepStrictEqual(fromKeyEvent(key(135)), { hotkey: "F24" });
});

test("keeps waiting while only modifiers are held", () => {
    assert.strictEqual(fromKeyEvent(key(17, { ctrlKey: true })), null);
    assert.strictEqual(fromKeyEvent(key(16, { shiftKey: true })), null);
});

test("rejects combinations that would break typing or Windows", () => {
    assert.ok(fromKeyEvent(key(65)).error);
    assert.ok(fromKeyEvent(key(65, { shiftKey: true })).error);
    assert.ok(fromKeyEvent(key(115, { altKey: true })).error);
    assert.ok(fromKeyEvent(key(186, { ctrlKey: true })).error);
});

test("each host has its own default and saved setting", () => {
    assert.strictEqual(defaultFor("PPRO"), "Ctrl+Space");
    assert.strictEqual(defaultFor("AEFT"), "Ctrl+Shift+Space");
    assert.strictEqual(settingFor("PPRO"), "hotkey");
    assert.strictEqual(settingFor("AEFT"), "hotkeyAfterEffects");
});

test("label is readable", () => {
    assert.strictEqual(label("Ctrl+Space"), "Ctrl + Espaço");
    assert.strictEqual(label("Ctrl+Shift+F"), "Ctrl + Shift + F");
});
