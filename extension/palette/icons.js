// Pixel art icons, drawn on a 12x12 grid. Render at multiples of 12px so that
// every grid cell covers whole screen pixels and stays sharp.
(function () {
    var SVG_NS = "http://www.w3.org/2000/svg";

    var ICONS = {
        search: [
            "..####......",
            ".#....#.....",
            "#......#....",
            "#......#....",
            "#......#....",
            "#......#....",
            ".#....#.....",
            "..####.#....",
            ".......##...",
            "........##..",
            ".........##.",
            "..........##"
        ],
        gear: [
            ".....##.....",
            ".##..##..##.",
            ".##########.",
            "..###..###..",
            "..##....##..",
            "####....####",
            "####....####",
            "..##....##..",
            "..###..###..",
            ".##########.",
            ".##..##..##.",
            ".....##....."
        ],
        video: [
            "############",
            "#.#......#.#",
            "###......###",
            "#.#......#.#",
            "###......###",
            "#.#......#.#",
            "###......###",
            "#.#......#.#",
            "###......###",
            "#.#......#.#",
            "###......###",
            "############"
        ],
        audio: [
            "......#.....",
            ".....##...#.",
            "....###....#",
            "#######.#..#",
            "#######..#.#",
            "#######..#.#",
            "#######..#.#",
            "#######.#..#",
            "....###....#",
            ".....##...#.",
            "......#.....",
            "............"
        ]
    };

    function toPath(rows) {
        var path = "";
        rows.forEach(function (row, y) {
            row.replace(/#+/g, function (run, x) {
                path += "M" + x + " " + y + "h" + run.length + "v1h-" + run.length + "z";
                return run;
            });
        });
        return path;
    }

    function create(name) {
        var svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "pixel-icon");
        svg.setAttribute("viewBox", "0 0 12 12");
        svg.setAttribute("aria-hidden", "true");
        var path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", toPath(ICONS[name]));
        svg.appendChild(path);
        return svg;
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-icon]"), function (el) {
        el.appendChild(create(el.getAttribute("data-icon")));
    });

    window.ConsoleIcons = { create: create };
})();
