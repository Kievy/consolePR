// macOS version of helper/hotkey.ps1, run with: osascript -l JavaScript hotkey-mac.js <hotkey> <bundle id prefix>
//
// Watches the keyboard while the host app (Premiere or After Effects) is the
// frontmost app and prints "hotkey" each time the combination is pressed.
// macOS needs the host app to be allowed under Privacy & Security > Input
// Monitoring for this; until then it prints "permission-needed" once.
//
// stdout: "ready" once the hotkey is understood, or "bad-hotkey" and exits.
//         "hotkey" on each press.
// Exits when the host app quits or the extension that started it goes away.
// Everything else (changing the hotkey, the clipboard) is done by background.js.
ObjC.import("Cocoa");
ObjC.import("CoreGraphics");

ObjC.bindFunction("CGEventSourceKeyState", ["bool", ["int", "unsigned short"]]);
ObjC.bindFunction("CGEventSourceFlagsState", ["unsigned long long", ["int"]]);
ObjC.bindFunction("CGPreflightListenEventAccess", ["bool", []]);
ObjC.bindFunction("CGRequestListenEventAccess", ["bool", []]);
ObjC.bindFunction("getppid", ["int", []]);

var COMBINED_SESSION_STATE = 0;
var POLL_SECONDS = 0.025;
var FLAGS = { CTRL: 0x40000, ALT: 0x80000, SHIFT: 0x20000, CMD: 0x100000 };
var ALL_FLAGS = FLAGS.CTRL | FLAGS.ALT | FLAGS.SHIFT | FLAGS.CMD;

// macOS virtual key codes follow the key position on an ANSI keyboard.
var KEY_CODES = {
    A: 0, S: 1, D: 2, F: 3, H: 4, G: 5, Z: 6, X: 7, C: 8, V: 9, B: 11, Q: 12, W: 13, E: 14, R: 15,
    Y: 16, T: 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "9": 25, "7": 26, "8": 28,
    "0": 29, O: 31, U: 32, I: 34, P: 35, L: 37, J: 38, K: 40, N: 45, M: 46, SPACE: 49,
    F1: 122, F2: 120, F3: 99, F4: 118, F5: 96, F6: 97, F7: 98, F8: 100, F9: 101, F10: 109,
    F11: 103, F12: 111, F13: 105, F14: 107, F15: 113, F16: 106, F17: 64, F18: 79, F19: 80, F20: 90
};

function say(text) {
    // console.log goes to stderr in osascript, so write to stdout directly.
    $.NSFileHandle.fileHandleWithStandardOutput.writeData(
        $.NSString.alloc.initWithUTF8String(text + "\n").dataUsingEncoding($.NSUTF8StringEncoding)
    );
}

function parseHotkey(text) {
    var result = { flags: 0, key: -1 };
    var unknown = false;
    String(text).split("+").forEach(function (raw) {
        var part = raw.trim().toUpperCase();
        if (part === "CONTROL") part = "CTRL";
        if (part === "OPTION") part = "ALT";
        if (part === "COMMAND") part = "CMD";
        if (FLAGS[part]) {
            result.flags |= FLAGS[part];
        } else if (KEY_CODES.hasOwnProperty(part)) {
            result.key = KEY_CODES[part];
        } else {
            unknown = true;
        }
    });
    return !unknown && result.key >= 0 ? result : null;
}

function findHost(bundlePrefix) {
    var apps = $.NSWorkspace.sharedWorkspace.runningApplications;
    for (var i = 0; i < apps.count; i++) {
        var app = apps.objectAtIndex(i);
        var id = ObjC.unwrap(app.bundleIdentifier) || "";
        if (id.indexOf(bundlePrefix) === 0) {
            return app;
        }
    }
    return null;
}

function run(argv) {
    var hotkey = parseHotkey(argv[0] || "Ctrl+Space");
    if (!hotkey) {
        say("bad-hotkey");
        return;
    }
    var host = findHost(argv[1] || "");
    if (!host) {
        say("host not found: " + argv[1]);
        return;
    }
    var hostPid = host.processIdentifier;
    var parentPid = $.getppid();
    say("ready");

    var allowed = $.CGPreflightListenEventAccess();
    if (!allowed) {
        $.CGRequestListenEventAccess();
        say("permission-needed");
    }

    var wasDown = false;
    var ticks = 0;
    while (true) {
        // Also lets NSWorkspace update the frontmost app.
        $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(POLL_SECONDS));

        if (++ticks >= 40) {
            ticks = 0;
            if (host.terminated || $.getppid() !== parentPid) {
                return;
            }
            if (!allowed) {
                allowed = $.CGPreflightListenEventAccess();
            }
        }

        var front = $.NSWorkspace.sharedWorkspace.frontmostApplication;
        var down = false;
        if (front && front.processIdentifier === hostPid
            && $.CGEventSourceKeyState(COMBINED_SESSION_STATE, hotkey.key)) {
            var flags = Number($.CGEventSourceFlagsState(COMBINED_SESSION_STATE)) & ALL_FLAGS;
            down = flags === hotkey.flags;
        }
        // Only the moment the key goes down counts, not holding it.
        if (down && !wasDown) {
            say("hotkey");
        }
        wasDown = down;
    }
}
