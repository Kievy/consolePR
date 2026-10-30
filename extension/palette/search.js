// Ranking used by the palette. Runs in the browser and in test/search.test.js.
(function (root) {
    function normalize(text) {
        return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    }

    // Lower is better; -1 means no match.
    function score(name, query) {
        var at = name.indexOf(query);
        if (at === 0) {
            return 0;
        }
        if (at > 0) {
            // Start of a later word beats the middle of a word.
            return /[\s\-_(]/.test(name.charAt(at - 1)) ? 1 : 2;
        }
        // Letters in order, e.g. "gblur" -> "Gaussian Blur".
        var from = 0;
        for (var i = 0; i < query.length; i++) {
            var found = name.indexOf(query.charAt(i), from);
            if (found < 0) {
                return -1;
            }
            from = found + 1;
        }
        return 3;
    }

    function normalizeQuery(query) {
        return normalize(query.trim()).replace(/\s+/g, " ");
    }

    // Score of a single name, used to put the group with the best match first.
    function scoreOf(name, query) {
        return score(normalize(name), normalizeQuery(query));
    }

    function rank(names, query) {
        var q = normalizeQuery(query);
        var matches = [];
        names.forEach(function (name) {
            var s = q ? score(normalize(name), q) : 0;
            if (s >= 0) {
                matches.push({ name: name, score: s });
            }
        });
        matches.sort(function (a, b) {
            return a.score - b.score || a.name.localeCompare(b.name);
        });
        return matches.map(function (m) { return m.name; });
    }

    root.ConsoleSearch = { rank: rank, scoreOf: scoreOf };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleSearch;
    }
})(typeof window !== "undefined" ? window : this);
