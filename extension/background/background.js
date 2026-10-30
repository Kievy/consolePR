// Starts the hotkey helper and turns each hotkey press into opening or closing
// the palette.
(function () {
    var cep = window.__adobe_cep__;
    var childProcess = require("child_process");
    var fs = require("fs");
    var path = require("path");
    var os = require("os");

    var PALETTE_ID = "com.consolepr.palette";
    var DEFAULT_HOTKEY = "Ctrl+Space";

    var extensionDir = path.normalize(
        decodeURI(cep.getSystemPath("extension")).replace(/^file:\/+/, "")
    );
    var logFile = path.join(os.tmpdir(), "consolepr.log");

    var paletteOpen = false;
    var helper = null;

    function log(message) {
        try {
            fs.appendFileSync(logFile, new Date().toISOString() + " " + message + os.EOL);
        } catch (e) { /* logging must never break the hotkey */ }
    }

    function readHotkey() {
        try {
            var config = JSON.parse(fs.readFileSync(path.join(extensionDir, "config.json"), "utf8"));
            return config.hotkey || DEFAULT_HOTKEY;
        } catch (e) {
            return DEFAULT_HOTKEY;
        }
    }

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

    function onHotkey() {
        if (paletteOpen) {
            dispatch("com.consolepr.toggle");
            // If the palette died without saying so, don't leave the hotkey stuck.
            setTimeout(function () {
                if (paletteOpen) {
                    paletteOpen = false;
                    cep.requestOpenExtension(PALETTE_ID, "");
                }
            }, 400);
        } else {
            cep.requestOpenExtension(PALETTE_ID, "");
        }
    }

    function startHelper() {
        var script = path.join(extensionDir, "helper", "hotkey.ps1");
        helper = childProcess.spawn("powershell.exe", [
            "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-File", script, "-Hotkey", readHotkey()
        ], { windowsHide: true });

        var buffered = "";
        helper.stdout.on("data", function (chunk) {
            buffered += chunk.toString();
            var lines = buffered.split(/\r?\n/);
            buffered = lines.pop();
            lines.forEach(function (line) {
                if (line.trim() === "hotkey") {
                    onHotkey();
                } else if (line.trim()) {
                    log("helper: " + line.trim());
                }
            });
        });
        helper.stderr.on("data", function (chunk) {
            log("helper error: " + chunk.toString().trim());
        });
        helper.on("error", function (err) {
            log("could not start helper: " + err.message);
        });
        helper.on("exit", function (code) {
            log("helper exited with code " + code);
            helper = null;
        });
    }

    function tellHelper(command) {
        if (helper) {
            helper.stdin.write(command + "\n");
        }
    }

    cep.addEventListener("com.consolepr.opened", function () {
        paletteOpen = true;
        tellHelper("present");
    });
    cep.addEventListener("com.consolepr.closed", function () {
        paletteOpen = false;
    });

    log("background started, extension at " + extensionDir);
    startHelper();
})();
