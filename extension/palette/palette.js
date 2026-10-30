(function () {
    var cep = window.__adobe_cep__;
    var CACHE_KEY = "consolepr.effects";
    var FOCUS_GRACE_MS = 1000; // Premiere briefly takes focus while the window opens
    var openedAt = Date.now();
    var GROUPS = [
        { kind: "video", label: "Efeitos de vídeo" },
        { kind: "audio", label: "Efeitos de áudio" }
    ];

    var search = document.getElementById("search");
    var list = document.getElementById("list");
    var status = document.getElementById("status");

    var effects = { video: [], audio: [] };
    var rows = [];
    var selected = 0;
    var applying = false;

    function dispatch(type) {
        // CEP silently drops events without the real appId and extensionId.
        cep.dispatchEvent({
            type: type,
            scope: "APPLICATION",
            appId: JSON.parse(cep.getHostEnvironment()).appId,
            extensionId: cep.getExtensionId(),
            data: ""
        });
    }

    function close() {
        dispatch("com.consolepr.closed");
        cep.closeExtension();
    }

    function showStatus(message) {
        status.textContent = message;
        status.hidden = !message;
    }

    function select(index, scroll) {
        if (!rows.length) {
            return;
        }
        selected = Math.max(0, Math.min(rows.length - 1, index));
        rows.forEach(function (row, i) {
            row.el.classList.toggle("selected", i === selected);
        });
        if (scroll) {
            rows[selected].el.scrollIntoView({ block: "nearest" });
            if (selected === 0) {
                list.scrollTop = 0;
            }
        }
    }

    function render() {
        list.textContent = "";
        rows = [];
        var ranked = GROUPS.map(function (group) {
            var names = ConsoleSearch.rank(effects[group.kind], search.value);
            return {
                group: group,
                names: names,
                best: names.length ? ConsoleSearch.scoreOf(names[0], search.value) : Infinity
            };
        });
        // On a tie video stays above audio. Enter applies the first row, so a strong
        // audio match must not sit below weak video matches.
        ranked.sort(function (a, b) {
            return a.best - b.best;
        });
        ranked.forEach(function (entry) {
            var group = entry.group;
            var names = entry.names;
            if (!names.length) {
                return;
            }
            var header = document.createElement("div");
            header.className = "group " + group.kind;
            header.textContent = group.label;
            list.appendChild(header);
            names.forEach(function (name) {
                var el = document.createElement("div");
                el.className = "item";
                el.textContent = name;
                el.title = name;
                var index = rows.length;
                el.addEventListener("mousemove", function () {
                    if (selected !== index) {
                        select(index);
                    }
                });
                el.addEventListener("click", function () {
                    select(index);
                    apply();
                });
                list.appendChild(el);
                rows.push({ el: el, kind: group.kind, name: name });
            });
        });
        if (!rows.length) {
            var empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "Nenhum efeito encontrado";
            list.appendChild(empty);
        }
        select(0, true);
    }

    function apply() {
        var row = rows[selected];
        if (!row || applying) {
            return;
        }
        applying = true;
        var call = "ConsolePR.applyEffect(" + JSON.stringify(row.kind) + "," + JSON.stringify(row.name) + ")";
        cep.evalScript(call, function (response) {
            applying = false;
            var outcome;
            try {
                outcome = JSON.parse(response);
            } catch (e) {
                outcome = { ok: false, message: "Erro ao aplicar: " + response };
            }
            if (outcome.ok) {
                close();
            } else {
                showStatus(outcome.message);
                search.focus();
            }
        });
    }

    function loadEffects() {
        try {
            var cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && cached.video) {
                effects = cached;
                render();
            }
        } catch (e) { /* no usable cache: wait for Premiere's list */ }

        cep.evalScript("ConsolePR.listEffects()", function (response) {
            var fresh;
            try {
                fresh = JSON.parse(response);
            } catch (e) {
                fresh = { error: response };
            }
            if (fresh.error) {
                showStatus("Não foi possível listar os efeitos: " + fresh.error);
                return;
            }
            var changed = JSON.stringify(fresh) !== JSON.stringify(effects);
            effects = fresh;
            if (changed) {
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
                } catch (e) { /* cache is only an optimization */ }
                render();
            }
        });
    }

    // Clicking a row or the scrollbar must not take the caret out of the search box.
    list.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });

    search.addEventListener("input", function () {
        showStatus("");
        render();
    });

    document.addEventListener("keydown", function (event) {
        switch (event.key) {
            case "ArrowDown":
                select(selected + 1, true);
                break;
            case "ArrowUp":
                select(selected - 1, true);
                break;
            case "PageDown":
                select(selected + 8, true);
                break;
            case "PageUp":
                select(selected - 8, true);
                break;
            case "Enter":
                apply();
                break;
            case "Escape":
                close();
                break;
            default:
                return;
        }
        event.preventDefault();
    });

    window.addEventListener("blur", function () {
        if (!applying && Date.now() - openedAt > FOCUS_GRACE_MS) {
            close();
        }
    });

    window.addEventListener("focus", function () {
        search.focus();
    });

    // Second hotkey press closes the window.
    cep.addEventListener("com.consolepr.toggle", close);

    render();
    loadEffects();
    search.focus();
    dispatch("com.consolepr.opened");
})();
