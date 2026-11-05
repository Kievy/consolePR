#!/bin/bash
# ConsolePR installer for macOS. Double-click it in Finder, or run: bash install.command
cd "$(dirname "$0")" || exit 1

LANG_PT=0
case "$(defaults read -g AppleLocale 2>/dev/null)" in pt*) LANG_PT=1 ;; esac
msg() { if [ "$LANG_PT" = 1 ]; then echo "$1"; else echo "$2"; fi; }
finish() { echo; read -r -p "$(msg 'Pressione Enter para fechar.' 'Press Enter to close.')" _; exit "$1"; }

SOURCE="$PWD/extension"
TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/com.consolepr"

if [ ! -f "$SOURCE/CSXS/manifest.xml" ]; then
    msg "Arquivos do ConsolePR não encontrados. Extraia o ZIP primeiro." \
        "ConsolePR files were not found. Extract the ZIP first."
    finish 1
fi

rm -rf "$TARGET"
mkdir -p "$(dirname "$TARGET")" && cp -R "$SOURCE" "$TARGET"
if [ ! -f "$TARGET/CSXS/manifest.xml" ]; then
    msg "A instalação falhou. Feche o Premiere e o After Effects e tente de novo." \
        "Installation failed. Close Premiere and After Effects and try again."
    finish 1
fi
# Files from a downloaded ZIP are quarantined, which can stop the helper from running.
xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null

# The extension is unsigned, so CEP debug mode must be on for the apps to load it.
for v in $(seq 9 22); do
    defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
done
# Preferences are cached, so make the apps read the new value.
killall cfprefsd 2>/dev/null

msg "ConsolePR instalado em $TARGET" "ConsolePR installed to $TARGET"
msg "Reinicie o Premiere e o After Effects." "Restart Premiere and After Effects."
msg "Atalho nos dois programas: Control+Espaço." "Shortcut in both apps: Control+Space."
msg "Na primeira vez, o macOS pede para permitir o programa em Monitoramento de Entrada." \
    "The first time, macOS asks you to allow the app under Input Monitoring."
finish 0
