(function () {
    var cep = window.__adobe_cep__;
    try {
        ConsoleI18n.setLocale(JSON.parse(cep.getHostEnvironment()).appLocale);
    } catch (e) {
        ConsoleI18n.setLocale("");
    }
    ConsoleI18n.apply(document);
    var EFFECTS_FALLBACK_MS = 3000;
    var FRAME_DONE_MS = 1200;
    var FOCUS_GRACE_MS = 1000; // Premiere briefly takes focus while the window opens
    var openedAt = Date.now();
    var GROUPS = [
        { kind: "video", labelKey: "group.video" },
        { kind: "audio", labelKey: "group.audio" }
    ];

    var search = document.getElementById("search");
    var list = document.getElementById("list");
    var status = document.getElementById("status");
    var settingsButton = document.getElementById("settings-button");
    var settingsTitle = document.getElementById("settings-title");
    var settings = document.getElementById("settings");
    var hotkeyField = document.getElementById("hotkey-field");
    var hotkeyDefault = document.getElementById("hotkey-default");
    var hotkeyMessage = document.getElementById("hotkey-message");
    var frameButton = document.getElementById("frame-button");
    var keysButton = document.getElementById("keys-button");
    var keysView = document.getElementById("keys");
    var easeInputs = {
        in: { range: document.getElementById("ease-in"), number: document.getElementById("ease-in-value") },
        out: { range: document.getElementById("ease-out"), number: document.getElementById("ease-out-value") },
        both: { range: document.getElementById("ease-both"), number: document.getElementById("ease-both-value") }
    };
    var easeCurve = document.getElementById("ease-curve");
    var easeDot = document.getElementById("ease-dot");
    var frameMenu = document.getElementById("frame-menu");
    var accentControl = document.getElementById("accent-control");
    var accentSwatch = document.getElementById("accent-swatch");
    var accentHex = document.getElementById("accent-hex");
    var accentDefault = document.getElementById("accent-default");
    var accentMessage = document.getElementById("accent-message");
    var accentPicker = document.getElementById("accent-picker");
    var accentSv = document.getElementById("accent-sv");
    var accentThumb = document.getElementById("accent-sv-thumb");
    var accentHue = document.getElementById("accent-hue");

    var effects = { video: [], audio: [] };
    var rows = [];
    var selected = 0;
    var applying = false;
    var currentHotkey = ConsoleHotkey.DEFAULT;
    var capturing = false;
    var saveTimer = null;
    var framing = false;
    // What the keys get (and the preview shows), and where each slider sits.
    // Sliders are independent: moving one never moves another.
    var ease = { in: 33, out: 33 };
    var sliders = { in: 33, out: 33, both: 33 };
    var previewMode = "bezier";
    var saveFolder = "";
    var accent = ConsoleColor.DEFAULT;
    var accentHsv = ConsoleColor.hexToHsv(accent);

    function dispatch(type, data) {
        // CEP silently drops events without the real appId and extensionId.
        cep.dispatchEvent({
            type: type,
            scope: "APPLICATION",
            appId: JSON.parse(cep.getHostEnvironment()).appId,
            extensionId: cep.getExtensionId(),
            data: data || ""
        });
    }

    function close() {
        dispatch("com.consolepr.closed");
        cep.closeExtension();
    }

    function showStatus(message, isInfo) {
        status.textContent = message;
        status.title = message;
        status.hidden = !message;
        status.classList.toggle("info", !!isInfo);
    }

    function showFrameMenu(visible) {
        frameMenu.hidden = !visible;
        frameButton.setAttribute("aria-expanded", String(visible));
        if (visible) {
            frameMenu.querySelector("button").focus();
        }
    }

    function hostCall(script, done) {
        cep.evalScript(script, function (response) {
            try {
                done(JSON.parse(response));
            } catch (e) {
                done({ ok: false, message: ConsoleI18n.t("status.error", { detail: response }) });
            }
        });
    }

    function finishFraming(message) {
        framing = false;
        openedAt = Date.now();
        showStatus(message);
        search.focus();
        dispatch("com.consolepr.present");
    }

    function requestFrame(request) {
        showStatus(ConsoleI18n.t("frame.capturing"), true);
        dispatch("com.consolepr.captureFrame", JSON.stringify(request));
    }

    function askWhereToSave(mode, frameName) {
        var result = window.cep.fs.showSaveDialogEx(
            ConsoleI18n.t("frame.saveTitle"),
            saveFolder,
            [mode === "jpeg" ? "jpg" : "png", mode === "jpeg" ? "jpeg" : "png"],
            ConsoleFrame.fileNameFor(frameName, mode === "jpeg" ? "jpg" : "png")
        );
        return result && !result.err && result.data ? ConsoleFrame.withExtension(result.data, mode) : null;
    }

    function takeFrame(mode) {
        if (framing) {
            return;
        }
        framing = true;
        showFrameMenu(false);
        hostCall("ConsolePR.frameInfo()", function (info) {
            if (!info.ok) {
                finishFraming(ConsoleI18n.hostText(info));
            } else if (mode === "clipboard") {
                requestFrame({ mode: mode });
            } else {
                var target = askWhereToSave(mode, info.name);
                if (target) {
                    requestFrame({ mode: mode, path: target });
                } else {
                    finishFraming("");
                }
            }
        });
    }

    frameButton.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });
    frameButton.addEventListener("click", function () {
        showFrameMenu(frameMenu.hidden);
    });
    Array.prototype.forEach.call(frameMenu.querySelectorAll("button"), function (item) {
        item.addEventListener("click", function () {
            takeFrame(item.getAttribute("data-frame"));
        });
    });
    document.addEventListener("mousedown", function (event) {
        if (!frameMenu.hidden && !frameMenu.contains(event.target) && event.target !== frameButton && !frameButton.contains(event.target)) {
            showFrameMenu(false);
            search.focus();
        }
    });

    cep.addEventListener("com.consolepr.saveFolderCurrent", function (event) {
        saveFolder = event.data;
    });
    cep.addEventListener("com.consolepr.frameDone", function (event) {
        var outcome = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (outcome.error) {
            finishFraming(outcome.error);
            return;
        }
        showStatus(outcome.path
            ? ConsoleI18n.t("frame.saved", { path: outcome.path })
            : ConsoleI18n.t("frame.copied"), true);
        setTimeout(close, FRAME_DONE_MS);
    });

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
            header.className = "group";
            var label = document.createElement("span");
            label.textContent = ConsoleI18n.t(group.labelKey);
            var badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = names.length;
            header.appendChild(label);
            header.appendChild(badge);
            list.appendChild(header);
            names.forEach(function (name) {
                var el = document.createElement("div");
                el.className = "item";
                el.title = name;
                el.appendChild(ConsoleIcons.create(group.kind));
                var text = document.createElement("span");
                text.textContent = name;
                el.appendChild(text);
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
            empty.textContent = ConsoleI18n.t("empty");
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
                outcome = { ok: false, message: ConsoleI18n.t("apply.failed", { detail: response }) };
            }
            if (outcome.ok) {
                close();
            } else {
                showStatus(ConsoleI18n.hostText(outcome));
                search.focus();
            }
        });
    }

    function showEffects(response) {
        var list;
        try {
            list = JSON.parse(response);
        } catch (e) {
            list = { error: response };
        }
        if (list.error) {
            showStatus(ConsoleI18n.t("effects.listFailed", { detail: list.error }));
            return;
        }
        effects = list;
        render();
    }

    cep.addEventListener("com.consolepr.effectsCurrent", function (event) {
        showEffects(typeof event.data === "string" ? event.data : JSON.stringify(event.data));
    });

    // The background extension normally sends the list right after opening.
    setTimeout(function () {
        if (!effects.video.length && !effects.audio.length) {
            cep.evalScript("ConsolePR.listEffects()", showEffects);
        }
    }, EFFECTS_FALLBACK_MS);

    function showHotkeyMessage(message, isError) {
        hotkeyMessage.textContent = message;
        hotkeyMessage.classList.toggle("error", !!isError);
    }

    function showCurrentHotkey() {
        hotkeyField.textContent = ConsoleHotkey.label(currentHotkey);
        hotkeyField.classList.remove("capturing");
    }

    function startCapture() {
        capturing = true;
        dispatch("com.consolepr.suspendHotkey");
        hotkeyField.textContent = ConsoleI18n.t("hotkey.press");
        hotkeyField.classList.add("capturing");
        showHotkeyMessage(ConsoleI18n.t("hotkey.cancel"));
    }

    function stopCapture() {
        capturing = false;
        showCurrentHotkey();
    }

    function saveHotkey(hotkey) {
        capturing = false;
        hotkeyField.textContent = ConsoleHotkey.label(hotkey);
        hotkeyField.classList.remove("capturing");
        showHotkeyMessage(ConsoleI18n.t("hotkey.saving"));
        dispatch("com.consolepr.setHotkey", hotkey);
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            showCurrentHotkey();
            showHotkeyMessage(ConsoleI18n.t("hotkey.saveFailed"), true);
        }, 3000);
    }

    function onCaptureKey(event) {
        if (event.keyCode === 27) {
            dispatch("com.consolepr.resumeHotkey");
            stopCapture();
            showHotkeyMessage("");
            return;
        }
        var result = ConsoleHotkey.fromKeyEvent(event);
        if (!result) {
            return;
        }
        if (result.error) {
            showHotkeyMessage(ConsoleI18n.t(result.error), true);
        } else {
            saveHotkey(result.hotkey);
        }
    }

    function paintAccent(hex) {
        var style = document.documentElement.style;
        accent = hex;
        style.setProperty("--accent", hex);
        style.setProperty("--accent-rgb", ConsoleColor.hexToRgb(hex).join(", "));
        style.setProperty("--accent-soft", ConsoleColor.soften(hex));
        style.setProperty("--accent-glow", ConsoleColor.glowOpacity(hex));
    }

    function paintPicker() {
        accentSv.style.backgroundColor = ConsoleColor.hsvToHex({ h: accentHsv.h, s: 1, v: 1 });
        accentThumb.style.left = accentHsv.s * 100 + "%";
        accentThumb.style.top = (1 - accentHsv.v) * 100 + "%";
        accentHue.value = accentHsv.h;
    }

    function showAccentError(message) {
        accentMessage.textContent = message;
        accentMessage.hidden = !message;
        accentHex.classList.toggle("invalid", !!message);
    }

    // For a color typed or loaded: everything follows it, including the picker.
    function setAccent(hex) {
        paintAccent(hex);
        accentHsv = ConsoleColor.hexToHsv(hex);
        accentHex.value = hex;
        showAccentError("");
        paintPicker();
    }

    // For a color picked: hue and saturation stay where the user left them even
    // if the color alone can't express them, as with black or white.
    function pickAccent() {
        var hex = ConsoleColor.hsvToHex(accentHsv);
        paintAccent(hex);
        accentHex.value = hex;
        showAccentError("");
        paintPicker();
    }

    function saveAccent() {
        dispatch("com.consolepr.setAccent", accent);
    }

    function showAccentPicker(visible) {
        accentPicker.hidden = !visible;
        accentSwatch.setAttribute("aria-expanded", String(visible));
    }

    accentSwatch.addEventListener("click", function () {
        showAccentPicker(accentPicker.hidden);
    });
    accentDefault.addEventListener("click", function () {
        setAccent(ConsoleColor.DEFAULT);
        saveAccent();
    });
    accentHex.addEventListener("input", function () {
        var hex = ConsoleColor.normalizeHex(accentHex.value);
        if (hex) {
            paintAccent(hex);
            accentHsv = ConsoleColor.hexToHsv(hex);
            showAccentError("");
            paintPicker();
            saveAccent();
        } else {
            showAccentError(ConsoleI18n.t("accent.invalid"));
        }
    });
    accentHex.addEventListener("blur", function () {
        accentHex.value = accent;
        showAccentError("");
    });
    accentHue.addEventListener("input", function () {
        accentHsv.h = Number(accentHue.value);
        pickAccent();
    });
    accentHue.addEventListener("change", saveAccent);

    function pickFromPointer(event) {
        var box = accentSv.getBoundingClientRect();
        accentHsv.s = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
        accentHsv.v = 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
        pickAccent();
    }

    accentSv.addEventListener("pointerdown", function (event) {
        accentSv.setPointerCapture(event.pointerId);
        pickFromPointer(event);
    });
    accentSv.addEventListener("pointermove", function (event) {
        if (accentSv.hasPointerCapture(event.pointerId)) {
            pickFromPointer(event);
        }
    });
    accentSv.addEventListener("pointerup", saveAccent);

    document.addEventListener("mousedown", function (event) {
        if (!accentPicker.hidden && !accentControl.contains(event.target)) {
            showAccentPicker(false);
        }
    });

    cep.addEventListener("com.consolepr.accentCurrent", function (event) {
        setAccent(event.data);
    });

    function showEase() {
        Object.keys(easeInputs).forEach(function (side) {
            easeInputs[side].range.value = sliders[side];
            easeInputs[side].range.style.setProperty("--fill", sliders[side] + "%");
            if (document.activeElement !== easeInputs[side].number) {
                easeInputs[side].number.value = sliders[side];
            }
        });
        Array.prototype.forEach.call(keysView.querySelectorAll(".interp-button"), function (button) {
            button.classList.toggle("current", button.getAttribute("data-interp") === previewMode);
        });
        // The preview shows one key leaving (its out) and the next arriving (its in).
        var look = ConsoleKeyframes.preview(previewMode, ease.out, ease.in);
        easeCurve.setAttribute("d", look.path);
        easeDot.style.setProperty("--ease-timing", look.timing);
        easeDot.style.animation = "none";
        void easeDot.offsetWidth;
        easeDot.style.animation = "";
    }

    function setEaseValue(side, value) {
        var percent = ConsoleKeyframes.clampPercent(value);
        sliders[side] = percent;
        if (side === "both") {
            ease.in = percent;
            ease.out = percent;
        } else {
            ease[side] = percent;
        }
        previewMode = "bezier";
        showEase();
    }

    function keysResult(outcome) {
        if (!outcome.ok) {
            showStatus(ConsoleI18n.hostText(outcome));
            return;
        }
        var text = ConsoleI18n.t(outcome.count === 1 ? "keys.appliedOne" : "keys.applied", { count: outcome.count });
        if (outcome.failed) {
            text += " " + ConsoleI18n.t("keys.rejected", { count: outcome.failed });
        }
        showStatus(text, true);
    }

    function applyEase(side) {
        var value = sliders[side];
        hostCall("ConsolePR.setEase(" + JSON.stringify(side) + "," + value + ")", keysResult);
    }

    function applyInterpolation(type, side) {
        previewMode = type;
        showEase();
        hostCall("ConsolePR.setInterpolation(" + JSON.stringify(type) + "," + JSON.stringify(side) + ")", keysResult);
    }

    function loadKeyState() {
        hostCall("ConsolePR.keyframeState()", function (state) {
            if (!state.ok) {
                showStatus(ConsoleI18n.hostText(state));
                return;
            }
            if (state.count) {
                ease.in = ConsoleKeyframes.clampPercent(state.easeIn);
                ease.out = ConsoleKeyframes.clampPercent(state.easeOut);
                sliders.in = ease.in;
                sliders.out = ease.out;
                sliders.both = ConsoleKeyframes.bothValue(ease.in, ease.out);
                previewMode = state.mode;
                showStatus(ConsoleI18n.t(state.count === 1 ? "keys.selectedOne" : "keys.selected", { count: state.count }), true);
            } else {
                showStatus(ConsoleI18n.hostText({ code: "selectKeys" }));
            }
            showEase();
        });
    }

    function showKeys(visible) {
        if (visible) {
            showSettings(false);
        }
        showFrameMenu(false);
        keysView.hidden = !visible;
        settingsTitle.hidden = !visible && settings.hidden;
        settingsTitle.textContent = ConsoleI18n.t(visible ? "keys.title" : "settings.title");
        list.hidden = visible || !settings.hidden;
        search.hidden = visible || !settings.hidden;
        document.body.classList.toggle("keys-open", visible);
        keysButton.classList.toggle("active", visible);
        showStatus("");
        if (visible) {
            showEase();
            loadKeyState();
            easeInputs.both.range.focus();
        } else if (settings.hidden) {
            search.focus();
        }
    }

    Object.keys(easeInputs).forEach(function (side) {
        var inputs = easeInputs[side];
        inputs.range.addEventListener("input", function () {
            setEaseValue(side, inputs.range.value);
        });
        // Applying on release keeps the undo history to one step per adjustment.
        inputs.range.addEventListener("change", function () {
            applyEase(side);
        });
        inputs.number.addEventListener("change", function () {
            setEaseValue(side, inputs.number.value);
            applyEase(side);
        });
        inputs.number.addEventListener("keydown", function (event) {
            if (event.keyCode === 13) {
                inputs.number.blur();
            }
        });
    });

    Array.prototype.forEach.call(keysView.querySelectorAll(".interp-button"), function (button) {
        button.addEventListener("click", function (event) {
            var side = event.altKey ? "in" : event.shiftKey ? "out" : "both";
            applyInterpolation(button.getAttribute("data-interp"), side);
        });
    });

    keysButton.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });
    keysButton.addEventListener("click", function () {
        showKeys(keysView.hidden);
    });

    function showSettings(visible) {
        if (visible && !keysView.hidden) {
            showKeys(false);
        }
        if (capturing) {
            dispatch("com.consolepr.resumeHotkey");
            stopCapture();
        }
        showAccentPicker(false);
        showFrameMenu(false);
        settings.hidden = !visible;
        document.body.classList.toggle("settings-open", visible);
        settingsTitle.hidden = !visible;
        list.hidden = visible;
        search.hidden = visible;
        settingsButton.classList.toggle("active", visible);
        showHotkeyMessage("");
        showStatus("");
        if (visible) {
            showCurrentHotkey();
            hotkeyField.focus();
        } else {
            search.focus();
        }
    }

    settingsButton.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });
    settingsButton.addEventListener("click", function () {
        showSettings(settings.hidden);
    });
    hotkeyField.addEventListener("click", startCapture);
    // A plain link would navigate this window instead of opening the browser.
    document.getElementById("credit-link").addEventListener("click", function (event) {
        event.preventDefault();
        window.cep.util.openURLInDefaultBrowser(event.currentTarget.href);
    });
    hotkeyDefault.addEventListener("click", function () {
        saveHotkey(ConsoleHotkey.DEFAULT);
    });

    cep.addEventListener("com.consolepr.hotkeyCurrent", function (event) {
        currentHotkey = event.data;
        if (!capturing) {
            showCurrentHotkey();
        }
    });
    cep.addEventListener("com.consolepr.hotkeySaved", function (event) {
        clearTimeout(saveTimer);
        currentHotkey = event.data;
        showCurrentHotkey();
        showHotkeyMessage(ConsoleI18n.t("hotkey.saved", { label: ConsoleHotkey.label(currentHotkey) }));
    });
    cep.addEventListener("com.consolepr.hotkeyRejected", function (event) {
        clearTimeout(saveTimer);
        showCurrentHotkey();
        showHotkeyMessage(ConsoleI18n.t("hotkey.inUse", { label: ConsoleHotkey.label(event.data) }), true);
    });

    // macOS only: the hotkey can't be seen until the host app is allowed to.
    cep.addEventListener("com.consolepr.hotkeyPermission", function () {
        showStatus(ConsoleI18n.t("hotkey.macPermission"), true);
    });

    // Clicking a row or the scrollbar must not take the caret out of the search box.
    list.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });

    search.addEventListener("input", function () {
        showStatus("");
        render();
    });

    document.addEventListener("keydown", function (event) {
        if (capturing) {
            onCaptureKey(event);
            event.preventDefault();
            return;
        }
        if (!frameMenu.hidden) {
            if (event.keyCode === 27) {
                showFrameMenu(false);
                search.focus();
                event.preventDefault();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                var items = Array.prototype.slice.call(frameMenu.querySelectorAll("button"));
                var step = event.key === "ArrowDown" ? 1 : items.length - 1;
                items[(items.indexOf(document.activeElement) + step) % items.length].focus();
                event.preventDefault();
            }
            return;
        }
        if (!keysView.hidden) {
            if (event.keyCode === 27) {
                showKeys(false);
                event.preventDefault();
            }
            return;
        }
        if (!settings.hidden) {
            if (event.keyCode === 27) {
                if (accentPicker.hidden) {
                    showSettings(false);
                } else {
                    showAccentPicker(false);
                }
                event.preventDefault();
            }
            return;
        }
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
        if (!applying && !framing && Date.now() - openedAt > FOCUS_GRACE_MS) {
            close();
        }
    });

    window.addEventListener("focus", function () {
        if (settings.hidden && frameMenu.hidden && keysView.hidden) {
            search.focus();
        }
    });

    // Second hotkey press closes the window.
    cep.addEventListener("com.consolepr.toggle", close);

    hotkeyDefault.textContent = ConsoleI18n.t("hotkey.restore", { label: ConsoleHotkey.label(ConsoleHotkey.DEFAULT) });
    document.body.classList.add("host-" + JSON.parse(cep.getHostEnvironment()).appId);
    // macOS keeps the window's title bar and square corners.
    document.body.classList.toggle("platform-mac", ConsoleHotkey.IS_MAC);
    setAccent(accent);
    render();
    search.focus();
    dispatch("com.consolepr.opened");
})();
