#!/bin/bash
# Removes ConsolePR on macOS. CEP debug mode stays on because other extensions may rely on it.
LANG_PT=0
case "$(defaults read -g AppleLocale 2>/dev/null)" in pt*) LANG_PT=1 ;; esac
msg() { if [ "$LANG_PT" = 1 ]; then echo "$1"; else echo "$2"; fi; }
finish() { echo; read -r -p "$(msg 'Pressione Enter para fechar.' 'Press Enter to close.')" _; exit "$1"; }

TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/com.consolepr"

if [ ! -d "$TARGET" ]; then
    msg "ConsolePR não está instalado." "ConsolePR is not installed."
    finish 0
fi

rm -rf "$TARGET"
if [ -d "$TARGET" ]; then
    msg "A remoção falhou. Feche o Premiere e o After Effects e tente de novo." \
        "Removal failed. Close Premiere and After Effects and try again."
    finish 1
fi
rm -rf "$HOME/Library/Application Support/ConsolePR"
msg "ConsolePR removido. Reinicie o Premiere e o After Effects." \
    "ConsolePR removed. Restart Premiere and After Effects."
finish 0
