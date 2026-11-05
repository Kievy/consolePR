// Turns a keydown event into the hotkey text understood by helper/hotkey.ps1
// (Windows) and helper/hotkey-mac.js (macOS).
// Runs in the browser and in test/hotkey.test.js.
(function (root) {
    var DEFAULT = "Ctrl+Space";
    var IS_MAC = !!(root.navigator && /Mac/i.test(root.navigator.platform));
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
    // mac is optional and defaults to the platform this runs on. On macOS the
    // Command key can be part of the hotkey too.
    function fromKeyEvent(event, mac) {
        mac = mac === undefined ? IS_MAC : mac;
        var cmd = !!(mac && event.metaKey);
        if (MODIFIER_KEY_CODES.indexOf(event.keyCode) >= 0) {
            return null;
        }
        var key = keyName(event.keyCode);
        if (!key) {
            return { error: "hotkey.badKey" };
        }
        if (!event.ctrlKey && !event.altKey && !cmd && !/^F\d+$/.test(key)) {
            return { error: mac ? "hotkey.needModifierMac" : "hotkey.needModifier" };
        }
        if (!mac && event.altKey && key === "F4") {
            return { error: "hotkey.altF4" };
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
        if (cmd) {
            parts.push("Cmd");
        }
        parts.push(key);
        return { hotkey: parts.join("+") };
    }

    // locale is optional. Without it, the label follows ConsoleI18n, or Portuguese
    // when that module has not been loaded (the hotkey tests). mac is optional and
    // defaults to the platform; macOS calls the Alt key Option.
    function label(hotkey, locale, mac) {
        mac = mac === undefined ? IS_MAC : mac;
        var code = locale;
        if (!code && root.ConsoleI18n) {
            code = root.ConsoleI18n.locale();
        }
        var space = !code || /^pt/i.test(String(code).replace(/_/g, "-")) ? "Espaço" : "Space";
        var text = String(hotkey).replace(/Space/g, space);
        if (mac) {
            text = text.replace(/\bAlt\b/g, "Option");
        }
        return text.replace(/\+/g, " + ");
    }

    // Name of the saved setting. Premiere keeps the name it had before the port.
    function settingFor(appId) {
        return appId === "AEFT" ? "hotkeyAfterEffects" : "hotkey";
    }

    root.ConsoleHotkey = {
        DEFAULT: DEFAULT,
        IS_MAC: IS_MAC,
        settingFor: settingFor,
        fromKeyEvent: fromKeyEvent,
        label: label
    };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleHotkey;
    }
})(typeof window !== "undefined" ? window : this);
