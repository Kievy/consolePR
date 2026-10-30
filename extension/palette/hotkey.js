// Turns a keydown event into the hotkey text understood by helper/hotkey.ps1.
// Runs in the browser and in test/hotkey.test.js.
(function (root) {
    var DEFAULT = "Ctrl+Space";
    var MODIFIER_KEY_CODES = [16, 17, 18, 91, 92];

    // keyCode is the Windows virtual key, so it does not change with the keyboard layout.
    function keyName(keyCode) {
        if (keyCode === 32) {
            return "Space";
        }
        if ((keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57)) {
            return String.fromCharCode(keyCode);
        }
        if (keyCode >= 112 && keyCode <= 135) {
            return "F" + (keyCode - 111);
        }
        return null;
    }

    // Returns null while only modifiers are held, otherwise { hotkey } or { error }.
    function fromKeyEvent(event) {
        if (MODIFIER_KEY_CODES.indexOf(event.keyCode) >= 0) {
            return null;
        }
        var key = keyName(event.keyCode);
        if (!key) {
            return { error: "Essa tecla não pode ser usada no atalho." };
        }
        if (!event.ctrlKey && !event.altKey && !/^F\d+$/.test(key)) {
            return { error: "Use Ctrl ou Alt junto com a tecla." };
        }
        if (event.altKey && key === "F4") {
            return { error: "Alt + F4 é reservado pelo Windows." };
        }
        var parts = [];
        if (event.ctrlKey) {
            parts.push("Ctrl");
        }
        if (event.altKey) {
            parts.push("Alt");
        }
        if (event.shiftKey) {
            parts.push("Shift");
        }
        parts.push(key);
        return { hotkey: parts.join("+") };
    }

    function label(hotkey) {
        return hotkey.replace(/Space/, "Espaço").replace(/\+/g, " + ");
    }

    // Name of the saved setting. Premiere keeps the name it had before the port.
    function settingFor(appId) {
        return appId === "AEFT" ? "hotkeyAfterEffects" : "hotkey";
    }

    root.ConsoleHotkey = {
        DEFAULT: DEFAULT,
        settingFor: settingFor,
        fromKeyEvent: fromKeyEvent,
        label: label
    };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleHotkey;
    }
})(typeof window !== "undefined" ? window : this);
