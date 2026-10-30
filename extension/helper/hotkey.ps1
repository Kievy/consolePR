# Registers the ConsolePR hotkey only while Premiere is the foreground app, so
# the same key combination keeps working normally in every other program.
#
# stdout: prints "hotkey" on each press.
#         "hotkey-ok <combo>" or "hotkey-error <combo>" answers "set-hotkey".
# stdin:  "present" removes the title bar from the palette window, centers it
#         over Premiere and moves keyboard focus into its search box.
#         "set-hotkey <combo>" switches to a new hotkey, keeping the old one if
#         the new one can't be registered.
#         "suspend-hotkey" and "resume-hotkey" release the hotkey while a new
#         combination is being recorded, so it can reach the palette.
# Exits when stdin closes (the extension went away) or Premiere exits.
param([string]$Hotkey = "Ctrl+Space")

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class ConsolePrHotkey {
    const int WM_HOTKEY = 0x0312;
    const uint PM_REMOVE = 1;
    const uint MOD_NOREPEAT = 0x4000;
    const int GWL_STYLE = -16;
    const int GWL_EXSTYLE = -20;
    const long WS_CAPTION = 0x00C00000L;
    const long WS_THICKFRAME = 0x00040000L;
    const long WS_EX_DLGMODALFRAME = 0x00000001L;
    const long WS_EX_CLIENTEDGE = 0x00000200L;
    const long WS_EX_STATICEDGE = 0x00020000L;
    const uint SWP_NOZORDER = 0x0004;
    const uint SWP_FRAMECHANGED = 0x0020;
    const uint WM_LBUTTONDOWN = 0x0201;
    const uint WM_LBUTTONUP = 0x0202;
    const int SEARCH_BOX_X = 220;
    const int SEARCH_BOX_Y = 34;
    const int WINDOW_RADIUS = 26; // keep in sync with --radius in palette/style.css
    const int HOTKEY_ID = 0x4350;
    const int PRESENT_TICKS = 32; // about 800 ms, keep below FOCUS_GRACE_MS in palette.js

    [StructLayout(LayoutKind.Sequential)]
    struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
    [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr hWnd, int id);
    [DllImport("user32.dll")] static extern bool PeekMessage(out MSG msg, IntPtr hWnd, uint min, uint max, uint remove);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int index, IntPtr value);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hWnd, StringBuilder name, int max);
    [DllImport("user32.dll")] static extern int SetWindowRgn(IntPtr hWnd, IntPtr region, bool redraw);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hWnd);
    [DllImport("gdi32.dll")] static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int widthEllipse, int heightEllipse);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    static bool IsHostProcess(uint pid) {
        try {
            string name = Process.GetProcessById((int)pid).ProcessName;
            return name.StartsWith("Adobe Premiere") || name.Equals("CEPHtmlEngine", StringComparison.OrdinalIgnoreCase);
        } catch (Exception) { return false; }
    }

    static bool ForegroundIsHost() {
        uint pid;
        GetWindowThreadProcessId(GetForegroundWindow(), out pid);
        return pid != 0 && IsHostProcess(pid);
    }

    static bool PremiereRunning() {
        foreach (Process p in Process.GetProcesses()) {
            if (p.ProcessName.StartsWith("Adobe Premiere")) return true;
        }
        return false;
    }

    static void ParseHotkey(string text, out uint modifiers, out uint vk) {
        modifiers = MOD_NOREPEAT;
        vk = 0;
        foreach (string raw in text.Split('+')) {
            string part = raw.Trim().ToUpperInvariant();
            if (part == "CTRL" || part == "CONTROL") modifiers |= 2;
            else if (part == "ALT") modifiers |= 1;
            else if (part == "SHIFT") modifiers |= 4;
            else if (part == "WIN") modifiers |= 8;
            else if (part == "SPACE") vk = 0x20;
            else if (part == "TAB") vk = 0x09;
            else if (part == "ENTER") vk = 0x0D;
            else if (part.Length == 1 && char.IsLetterOrDigit(part[0])) vk = part[0];
            else if (part.Length > 1 && part[0] == 'F') vk = (uint)(0x70 + int.Parse(part.Substring(1)) - 1);
            else throw new ArgumentException("Tecla desconhecida no atalho: " + raw);
        }
        if (vk == 0) throw new ArgumentException("Atalho sem tecla principal: " + text);
    }

    static bool TryParseHotkey(string text, out uint modifiers, out uint vk) {
        try {
            ParseHotkey(text, out modifiers, out vk);
            return true;
        } catch (Exception) {
            modifiers = 0;
            vk = 0;
            return false;
        }
    }

    static IntPtr FindWindowByTitle(string title) {
        IntPtr result = IntPtr.Zero;
        EnumWindows(delegate (IntPtr hWnd, IntPtr unused) {
            if (!IsWindowVisible(hWnd)) return true;
            StringBuilder text = new StringBuilder(64);
            GetWindowText(hWnd, text, text.Capacity);
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (text.ToString() == title && IsHostProcess(pid)) {
                result = hWnd;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }

    static IntPtr FindPremiereWindow() {
        foreach (Process p in Process.GetProcesses()) {
            if (p.ProcessName.StartsWith("Adobe Premiere") && p.MainWindowHandle != IntPtr.Zero) return p.MainWindowHandle;
        }
        return IntPtr.Zero;
    }

    static IntPtr FindWebView(IntPtr palette) {
        IntPtr view = IntPtr.Zero;
        EnumChildWindows(palette, delegate (IntPtr hWnd, IntPtr unused) {
            StringBuilder name = new StringBuilder(64);
            GetClassName(hWnd, name, name.Capacity);
            if (name.ToString() == "Chrome_RenderWidgetHostHWND") {
                view = hWnd;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return view;
    }

    // While the palette has keyboard focus, the foreground window is one of its
    // children, never the palette itself.
    static bool PaletteHasFocus(IntPtr palette) {
        IntPtr foreground = GetForegroundWindow();
        bool inside = false;
        EnumChildWindows(palette, delegate (IntPtr hWnd, IntPtr unused) {
            if (hWnd == foreground) {
                inside = true;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return inside;
    }

    // SetForegroundWindow and SetFocus don't reach the web view, which lives in
    // the CEPHtmlEngine process. A posted click does, without moving the mouse.
    static void ClickSearchBox(IntPtr palette) {
        IntPtr view = FindWebView(palette);
        if (view == IntPtr.Zero) return;
        IntPtr position = new IntPtr((SEARCH_BOX_Y << 16) | SEARCH_BOX_X);
        PostMessage(view, WM_LBUTTONDOWN, new IntPtr(1), position);
        PostMessage(view, WM_LBUTTONUP, IntPtr.Zero, position);
    }

    static void Style(IntPtr palette) {
        long style = GetWindowLongPtr(palette, GWL_STYLE).ToInt64();
        SetWindowLongPtr(palette, GWL_STYLE, new IntPtr(style & ~(WS_CAPTION | WS_THICKFRAME)));
        long exStyle = GetWindowLongPtr(palette, GWL_EXSTYLE).ToInt64();
        SetWindowLongPtr(palette, GWL_EXSTYLE, new IntPtr(exStyle & ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE)));

        RECT win, host, viewRect;
        GetWindowRect(palette, out win);
        int width = win.Right - win.Left;
        int height = win.Bottom - win.Top;
        IntPtr view = FindWebView(palette);
        if (view != IntPtr.Zero && GetWindowRect(view, out viewRect)) {
            width = viewRect.Right - viewRect.Left;
            height = viewRect.Bottom - viewRect.Top;
        }
        int x = win.Left, y = win.Top;
        IntPtr premiere = FindPremiereWindow();
        if (premiere != IntPtr.Zero && GetWindowRect(premiere, out host)) {
            x = host.Left + (host.Right - host.Left - width) / 2;
            y = host.Top + (host.Bottom - host.Top) / 4;
        }
        SetWindowPos(palette, IntPtr.Zero, x, y, width, height, SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    // Premiere resizes the window once more after Style, so the rounded corners
    // follow its current size. Returns that size to detect the next change.
    static long RoundCorners(IntPtr palette, long roundedSize) {
        RECT win;
        GetWindowRect(palette, out win);
        int width = win.Right - win.Left;
        int height = win.Bottom - win.Top;
        long size = ((long)width << 32) | (uint)height;
        if (size != roundedSize) {
            // Windows owns the region after this call, so it must not be deleted here.
            int diameter = 2 * WINDOW_RADIUS * (int)GetDpiForWindow(palette) / 96;
            SetWindowRgn(palette, CreateRoundRectRgn(0, 0, width + 1, height + 1, diameter, diameter), true);
        }
        return size;
    }

    public static void Run(string hotkey) {
        uint modifiers, vk;
        ParseHotkey(hotkey, out modifiers, out vk);

        ConcurrentQueue<string> commands = new ConcurrentQueue<string>();
        bool stdinClosed = false;
        Thread reader = new Thread(delegate () {
            string line;
            while ((line = Console.In.ReadLine()) != null) commands.Enqueue(line.Trim());
            stdinClosed = true;
        });
        reader.IsBackground = true;
        reader.Start();

        bool registered = false;
        bool warned = false;
        bool suspended = false;
        int ticks = 0;
        int presentTicks = 0;
        bool styled = false;
        long roundedSize = 0;
        MSG msg;
        while (!stdinClosed) {
            bool wantRegistered = !suspended && ForegroundIsHost();
            if (wantRegistered && !registered) {
                registered = RegisterHotKey(IntPtr.Zero, HOTKEY_ID, modifiers, vk);
                if (!registered && !warned) {
                    Console.Out.WriteLine("Nao foi possivel registrar o atalho " + hotkey + " (ja usado por outro programa).");
                    Console.Out.Flush();
                    warned = true;
                }
            } else if (!wantRegistered && registered) {
                UnregisterHotKey(IntPtr.Zero, HOTKEY_ID);
                registered = false;
            }

            while (PeekMessage(out msg, IntPtr.Zero, 0, 0, PM_REMOVE)) {
                if (msg.message == WM_HOTKEY) {
                    Console.Out.WriteLine("hotkey");
                    Console.Out.Flush();
                }
            }

            string command;
            while (commands.TryDequeue(out command)) {
                if (command == "present") {
                    presentTicks = PRESENT_TICKS;
                    styled = false;
                    roundedSize = 0;
                } else if (command == "suspend-hotkey") {
                    suspended = true;
                } else if (command == "resume-hotkey") {
                    suspended = false;
                } else if (command.StartsWith("set-hotkey ")) {
                    string candidate = command.Substring("set-hotkey ".Length);
                    suspended = false;
                    warned = false;
                    if (registered) UnregisterHotKey(IntPtr.Zero, HOTKEY_ID);
                    registered = false;
                    uint newModifiers, newVk;
                    bool valid = TryParseHotkey(candidate, out newModifiers, out newVk);
                    if (valid && RegisterHotKey(IntPtr.Zero, HOTKEY_ID, newModifiers, newVk)) {
                        registered = true;
                        hotkey = candidate;
                        modifiers = newModifiers;
                        vk = newVk;
                        Console.Out.WriteLine("hotkey-ok " + candidate);
                    } else {
                        Console.Out.WriteLine("hotkey-error " + candidate);
                    }
                    Console.Out.Flush();
                }
            }
            // Premiere takes focus back shortly after opening the window, so
            // keep handing it to the palette for a moment.
            if (presentTicks > 0) {
                presentTicks--;
                IntPtr palette = FindWindowByTitle("ConsolePR");
                if (palette != IntPtr.Zero) {
                    if (!styled) {
                        Style(palette);
                        styled = true;
                    }
                    roundedSize = RoundCorners(palette, roundedSize);
                    if (presentTicks % 4 == 0 && !PaletteHasFocus(palette)) ClickSearchBox(palette);
                }
            }

            if (++ticks >= 100) {
                ticks = 0;
                if (!PremiereRunning()) break;
            }
            Thread.Sleep(25);
        }
        if (registered) UnregisterHotKey(IntPtr.Zero, HOTKEY_ID);
    }
}
"@

[ConsolePrHotkey]::Run($Hotkey)
