// Starts the hotkey helper and turns each hotkey press into opening or closing
// the palette. Premiere and After Effects each run their own copy of this.
(function () {
    var cep = window.__adobe_cep__;
    var childProcess = require("child_process");
    var fs = require("fs");
    var path = require("path");
    var os = require("os");

    var PALETTE_ID = "com.consolepr.palette";
    var APP_ID = JSON.parse(cep.getHostEnvironment()).appId;
    // CEPHtmlEngine's parent process is not always the host, so find it by name.
    var HOST_PROCESSES = { PPRO: "Adobe Premiere", AEFT: "AfterFX" };
    var ACCENT_PATTERN = /^#[0-9A-F]{6}$/i;
    var FRAME_TIMEOUT_MS = 30000;
    var FRAME_POLL_MS = 150;
    var JPEG_QUALITY = 0.95;

    var extensionDir = path.normalize(
        decodeURI(cep.getSystemPath("extension")).replace(/^file:\/+/, "")
    );
    var logFile = path.join(os.tmpdir(), "consolepr.log");
    // Outside the extension folder so that reinstalling keeps the user's hotkey.
    var configDir = path.join(process.env.APPDATA, "ConsolePR");
    var configFile = path.join(configDir, "config.json");

    var paletteOpen = false;
    var helper = null;
    var effectsJson = null;
    var clipboardDone = null;
    var currentHotkey = ConsoleHotkey.DEFAULT;
    // Each host keeps its own hotkey; the accent color is shared.
    var hotkeySetting = ConsoleHotkey.settingFor(APP_ID);

    function log(message) {
        try {
            fs.appendFileSync(logFile, new Date().toISOString() + " " + message + os.EOL);
        } catch (e) { /* logging must never break the hotkey */ }
    }

    function readConfig() {
        try {
            return JSON.parse(fs.readFileSync(configFile, "utf8")) || {};
        } catch (e) {
            return {};
        }
    }

    // Reads before writing because the other host may have saved its own settings.
    function saveSetting(name, value) {
        try {
            var config = readConfig();
            config[name] = value;
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + os.EOL);
        } catch (e) {
            log("could not save settings: " + e.message);
        }
    }

    function dispatch(type, data) {
        // CEP silently drops events without the real appId and extensionId.
        cep.dispatchEvent({
            type: type,
            scope: "APPLICATION",
            appId: APP_ID,
            extensionId: cep.getExtensionId(),
            data: data || ""
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
            "-File", script, "-Hotkey", currentHotkey, "-HostProcess", HOST_PROCESSES[APP_ID]
        ], { windowsHide: true });

        var buffered = "";
        helper.stdout.on("data", function (chunk) {
            buffered += chunk.toString();
            var lines = buffered.split(/\r?\n/);
            buffered = lines.pop();
            lines.forEach(function (line) {
                var text = line.trim();
                if (text === "hotkey") {
                    onHotkey();
                } else if (text.indexOf("hotkey-ok ") === 0) {
                    currentHotkey = text.substring("hotkey-ok ".length);
                    saveSetting(hotkeySetting, currentHotkey);
                    dispatch("com.consolepr.hotkeySaved", currentHotkey);
                } else if (text === "clipboard-ok" || text.indexOf("clipboard-error") === 0) {
                    if (clipboardDone) {
                        var finish = clipboardDone;
                        clipboardDone = null;
                        finish(text === "clipboard-ok" ? null : text.substring("clipboard-error ".length));
                    }
                } else if (text.indexOf("hotkey-error ") === 0) {
                    dispatch("com.consolepr.hotkeyRejected", text.substring("hotkey-error ".length));
                } else if (text) {
                    log("helper: " + text);
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

    // Reading the effects blocks the host for seconds in After Effects, and also
    // delays CEP events, so it happens once and the palette gets the result.
    function loadEffects(done) {
        cep.evalScript("ConsolePR.listEffects()", function (response) {
            try {
                if (!JSON.parse(response).error) {
                    effectsJson = response;
                }
            } catch (e) {
                log("could not list effects: " + response);
            }
            if (done) {
                done();
            }
        });
    }

    function sendEffects() {
        if (effectsJson) {
            dispatch("com.consolepr.effectsCurrent", effectsJson);
        }
    }

    // The hosts write the frame in the background, so wait for it to stop growing.
    function whenFileReady(file, done) {
        var deadline = Date.now() + FRAME_TIMEOUT_MS;
        var lastSize = -1;
        (function check() {
            var size = -1;
            try {
                size = fs.statSync(file).size;
            } catch (e) { /* not there yet */ }
            if (size > 0 && size === lastSize) {
                done(null);
            } else if (Date.now() > deadline) {
                done("O programa não gerou o frame a tempo.");
            } else {
                lastSize = size;
                setTimeout(check, FRAME_POLL_MS);
            }
        })();
    }

    function writeJpeg(pngFile, target, done) {
        var image = new Image();
        image.onerror = function () {
            done("Não foi possível converter o frame para JPEG.");
        };
        image.onload = function () {
            var canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            var context = canvas.getContext("2d");
            // JPEG has no transparency.
            context.fillStyle = "#000";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0);
            var base64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
            fs.writeFile(target, Buffer.from(base64, "base64"), function (err) {
                done(err ? err.message : null);
            });
        };
        image.src = "data:image/png;base64," + fs.readFileSync(pngFile).toString("base64");
    }

    function deliverFrame(request, pngFile, done) {
        if (request.mode === "clipboard") {
            if (!helper) {
                done("O processo do atalho não está em execução.");
                return;
            }
            clipboardDone = done;
            tellHelper("clipboard " + pngFile);
        } else if (request.mode === "jpeg") {
            writeJpeg(pngFile, request.path, done);
        } else {
            fs.copyFile(pngFile, request.path, function (err) {
                done(err ? err.message : null);
            });
        }
    }

    function captureFrame(request) {
        var basePath = path.join(os.tmpdir(), "consolepr-frame-" + Date.now());
        var pngFile = basePath + ".png";

        var restore = null;

        function finish(error) {
            if (restore) {
                cep.evalScript("ConsolePR.finishCapture(" + restore.join(",") + ")", function (response) {
                    if (response.indexOf('"ok":true') < 0) {
                        log("could not restore quality: " + response);
                    }
                });
            }
            fs.unlink(pngFile, function () { /* a leftover temp file is harmless */ });
            if (error) {
                log("frame capture failed: " + error);
            } else if (request.path) {
                saveSetting("saveFolder", path.dirname(request.path));
            }
            dispatch("com.consolepr.frameDone", JSON.stringify({ error: error, path: request.path || null }));
        }

        cep.evalScript("ConsolePR.captureFrame(" + JSON.stringify(basePath) + ")", function (response) {
            var outcome;
            try {
                outcome = JSON.parse(response);
            } catch (e) {
                outcome = { ok: false, message: "Erro ao capturar: " + response };
            }
            if (!outcome.ok) {
                finish(outcome.message);
                return;
            }
            restore = outcome.restore || null;
            whenFileReady(pngFile, function (error) {
                if (error) {
                    finish(error);
                } else {
                    deliverFrame(request, pngFile, finish);
                }
            });
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
        dispatch("com.consolepr.hotkeyCurrent", currentHotkey);
        var settings = readConfig();
        dispatch("com.consolepr.saveFolderCurrent", settings.saveFolder || path.join(os.homedir(), "Desktop"));
        var accent = settings.accent;
        if (ACCENT_PATTERN.test(accent)) {
            dispatch("com.consolepr.accentCurrent", accent);
        }
        if (effectsJson) {
            sendEffects();
        } else {
            loadEffects(sendEffects);
        }
    });
    cep.addEventListener("com.consolepr.closed", function () {
        paletteOpen = false;
        tellHelper("resume-hotkey");
    });
    cep.addEventListener("com.consolepr.suspendHotkey", function () {
        tellHelper("suspend-hotkey");
    });
    cep.addEventListener("com.consolepr.resumeHotkey", function () {
        tellHelper("resume-hotkey");
    });
    cep.addEventListener("com.consolepr.captureFrame", function (event) {
        captureFrame(typeof event.data === "string" ? JSON.parse(event.data) : event.data);
    });
    cep.addEventListener("com.consolepr.present", function () {
        tellHelper("present");
    });
    cep.addEventListener("com.consolepr.setAccent", function (event) {
        if (ACCENT_PATTERN.test(event.data)) {
            saveSetting("accent", event.data);
        }
    });
    cep.addEventListener("com.consolepr.setHotkey", function (event) {
        if (helper) {
            tellHelper("set-hotkey " + event.data);
        } else {
            dispatch("com.consolepr.hotkeyRejected", event.data);
        }
    });

    log(APP_ID + " background started, extension at " + extensionDir);
    currentHotkey = readConfig()[hotkeySetting] || currentHotkey;
    startHelper();
    loadEffects();
})();
