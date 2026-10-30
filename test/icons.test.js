const test = require("node:test");
const assert = require("node:assert");
const { ICONS } = require("../extension/palette/icons.js");

const names = Object.keys(ICONS);

function filled(rows, x, y) {
    return y >= 0 && y < rows.length && rows[y][x] === "#";
}

test("every icon is drawn on the same 12x12 grid", () => {
    for (const name of names) {
        assert.strictEqual(ICONS[name].length, 12, name);
        for (const row of ICONS[name]) {
            assert.match(row, /^[#.]{12}$/, name);
        }
    }
});

test("no icon has filled areas, so all share the same line weight", () => {
    for (const name of names) {
        const rows = ICONS[name];
        for (let y = 0; y < 11; y++) {
            for (let x = 0; x < 11; x++) {
                const block = filled(rows, x, y) && filled(rows, x + 1, y) && filled(rows, x, y + 1) && filled(rows, x + 1, y + 1);
                assert.ok(!block, `${name} has a filled 2x2 block at ${x},${y}`);
            }
        }
    }
});

test("every icon uses the full height or width of the grid", () => {
    for (const name of names) {
        const rows = ICONS[name];
        const used = rows.filter((row) => row.includes("#")).length;
        const left = Math.min(...rows.map((row) => (row.includes("#") ? row.indexOf("#") : 12)));
        const right = Math.max(...rows.map((row) => row.lastIndexOf("#")));
        assert.ok(used === 12 || right - left === 11, name);
    }
});
