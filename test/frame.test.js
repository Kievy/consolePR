const test = require("node:test");
const assert = require("node:assert");
const { fileNameFor, withExtension } = require("../extension/palette/frame.js");

test("file names drop characters Windows rejects", () => {
    assert.strictEqual(fileNameFor("Sequence 01 00:00:01:10", "png"), "Sequence 01 00-00-01-10.png");
    assert.strictEqual(fileNameFor("a/b\\c*d?e\"f<g>h|i;j", "jpeg"), "a-b-c-d-e-f-g-h-i-j.jpeg");
});

test("empty names still produce a file name", () => {
    assert.strictEqual(fileNameFor("  ", "png"), "frame.png");
    assert.strictEqual(fileNameFor(":::", "png"), "-.png");
});

test("withExtension adds the extension only when missing", () => {
    assert.strictEqual(withExtension("C:\\a\\frame", "png"), "C:\\a\\frame.png");
    assert.strictEqual(withExtension("C:\\a\\frame.PNG", "png"), "C:\\a\\frame.PNG");
    assert.strictEqual(withExtension("C:\\a\\frame.jpg", "jpeg"), "C:\\a\\frame.jpg");
    assert.strictEqual(withExtension("C:\\a\\frame.jpeg", "jpeg"), "C:\\a\\frame.jpeg");
    assert.strictEqual(withExtension("C:\\a\\frame.png", "jpeg"), "C:\\a\\frame.png.jpeg");
});
