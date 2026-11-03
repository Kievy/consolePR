// Portuguese and English copy for the palette and the background extension.
// Portuguese when the host locale starts with "pt"; English for every other locale.
// Runs in the browser and in test/i18n.test.js.
(function (root) {
    var STRINGS = {
        pt: {
            "search.placeholder": "Buscar efeito...",
            "settings.title": "Configurações",
            "frame.title": "Print do frame atual",
            "frame.clipboard": "Copiar para a área de transferência",
            "frame.png": "Salvar como PNG",
            "frame.jpeg": "Salvar como JPEG",
            "frame.capturing": "Capturando o frame...",
            "frame.saveTitle": "Salvar print do frame",
            "frame.saved": "Salvo em {path}",
            "frame.copied": "Copiado para a área de transferência",
            "frame.timeout": "O programa não gerou o frame a tempo.",
            "frame.jpegFailed": "Não foi possível converter o frame para JPEG.",
            "frame.helperDown": "O processo do atalho não está em execução.",
            "frame.captureFailed": "Erro ao capturar: {detail}",
            "hotkey.label": "Atalho para abrir o ConsolePR",
            "hotkey.hint": "Clique no campo e pressione a combinação: Ctrl ou Alt com letra, número ou Espaço, ou uma tecla F. Com o programa em foco, ela tem prioridade sobre comandos iguais dele.",
            "hotkey.press": "Pressione a nova combinação...",
            "hotkey.cancel": "Esc cancela.",
            "hotkey.saving": "Salvando...",
            "hotkey.saveFailed": "Não foi possível salvar o atalho.",
            "hotkey.saved": "Atalho salvo: {label}",
            "hotkey.inUse": "{label} já está em uso por outro programa.",
            "hotkey.restore": "Restaurar padrão ({label})",
            "hotkey.badKey": "Essa tecla não pode ser usada no atalho.",
            "hotkey.needModifier": "Use Ctrl ou Alt junto com a tecla.",
            "hotkey.altF4": "Alt + F4 é reservado pelo Windows.",
            "accent.label": "Cor de destaque",
            "accent.open": "Abrir seletor de cores",
            "accent.default": "Padrão",
            "accent.sv": "Saturação e brilho",
            "accent.hue": "Matiz",
            "accent.invalid": "Use um código como #C64BF2.",
            "credit.by": "Feito por",
            "group.video": "Efeitos de vídeo",
            "group.audio": "Efeitos de áudio",
            "empty": "Nenhum efeito encontrado",
            "status.error": "Erro: {detail}",
            "apply.failed": "Erro ao aplicar: {detail}",
            "effects.listFailed": "Não foi possível listar os efeitos: {detail}",
            "host.openComp": "Abra uma composição.",
            "host.selectLayer": "Selecione uma camada na composição.",
            "host.effectMissing": "Efeito não encontrado: {detail}",
            "host.layerLocked": "A camada selecionada está bloqueada.",
            "host.needAudioLayer": "Efeito de áudio: selecione uma camada com áudio.",
            "host.needVideoLayer": "Efeito de vídeo: selecione uma camada com imagem.",
            "host.openSequence": "Abra uma sequência.",
            "host.noSequence": "Nenhuma sequência ativa.",
            "host.applyFailed": "Não foi possível aplicar: {detail}",
            "host.needVideoClip": "Efeito de vídeo: selecione um clipe de vídeo.",
            "host.needAudioClip": "Efeito de áudio: selecione um clipe de áudio.",
            "host.selectClip": "Selecione um clipe na timeline."
        },
        en: {
            "search.placeholder": "Search effects...",
            "settings.title": "Settings",
            "frame.title": "Capture current frame",
            "frame.clipboard": "Copy to clipboard",
            "frame.png": "Save as PNG",
            "frame.jpeg": "Save as JPEG",
            "frame.capturing": "Capturing the frame...",
            "frame.saveTitle": "Save frame capture",
            "frame.saved": "Saved to {path}",
            "frame.copied": "Copied to the clipboard",
            "frame.timeout": "The app did not finish the frame in time.",
            "frame.jpegFailed": "Could not convert the frame to JPEG.",
            "frame.helperDown": "The shortcut process is not running.",
            "frame.captureFailed": "Could not capture: {detail}",
            "hotkey.label": "Shortcut to open ConsolePR",
            "hotkey.hint": "Click the field and press the combination: Ctrl or Alt with a letter, number, or Space, or a function key. While this app is in front, the shortcut overrides the same command inside it.",
            "hotkey.press": "Press the new combination...",
            "hotkey.cancel": "Esc cancels.",
            "hotkey.saving": "Saving...",
            "hotkey.saveFailed": "Could not save the shortcut.",
            "hotkey.saved": "Shortcut saved: {label}",
            "hotkey.inUse": "{label} is already used by another program.",
            "hotkey.restore": "Restore default ({label})",
            "hotkey.badKey": "That key can't be used in the shortcut.",
            "hotkey.needModifier": "Use Ctrl or Alt with the key.",
            "hotkey.altF4": "Alt + F4 is reserved by Windows.",
            "accent.label": "Accent color",
            "accent.open": "Open color picker",
            "accent.default": "Default",
            "accent.sv": "Saturation and brightness",
            "accent.hue": "Hue",
            "accent.invalid": "Use a code like #C64BF2.",
            "credit.by": "Made by",
            "group.video": "Video effects",
            "group.audio": "Audio effects",
            "empty": "No effects found",
            "status.error": "Error: {detail}",
            "apply.failed": "Could not apply: {detail}",
            "effects.listFailed": "Could not list effects: {detail}",
            "host.openComp": "Open a composition.",
            "host.selectLayer": "Select a layer in the composition.",
            "host.effectMissing": "Effect not found: {detail}",
            "host.layerLocked": "The selected layer is locked.",
            "host.needAudioLayer": "Audio effect: select a layer with audio.",
            "host.needVideoLayer": "Video effect: select a layer with video.",
            "host.openSequence": "Open a sequence.",
            "host.noSequence": "No active sequence.",
            "host.applyFailed": "Could not apply: {detail}",
            "host.needVideoClip": "Video effect: select a video clip.",
            "host.needAudioClip": "Audio effect: select an audio clip.",
            "host.selectClip": "Select a clip on the timeline."
        }
    };

    var locale = "pt";

    function setLocale(code) {
        var name = String(code || "").replace(/_/g, "-");
        locale = !name || /^pt/i.test(name) ? "pt" : "en";
    }

    function t(key, vars) {
        var table = STRINGS[locale] || STRINGS.pt;
        var text = table[key] || STRINGS.pt[key] || STRINGS.en[key] || key;
        if (!vars) {
            return text;
        }
        return text.replace(/\{(\w+)\}/g, function (_, name) {
            return vars[name] == null ? "" : String(vars[name]);
        });
    }

    function fill(nodes, attribute, write) {
        for (var i = 0; i < nodes.length; i++) {
            write(nodes[i], t(nodes[i].getAttribute(attribute)));
        }
    }

    function apply(scope) {
        if (!scope || !scope.querySelectorAll) {
            return;
        }
        fill(scope.querySelectorAll("[data-i18n]"), "data-i18n", function (node, text) {
            node.textContent = text;
        });
        fill(scope.querySelectorAll("[data-i18n-placeholder]"), "data-i18n-placeholder", function (node, text) {
            node.setAttribute("placeholder", text);
        });
        fill(scope.querySelectorAll("[data-i18n-title]"), "data-i18n-title", function (node, text) {
            node.title = text;
            if (node.hasAttribute("aria-label") && !node.hasAttribute("data-i18n-aria")) {
                node.setAttribute("aria-label", text);
            }
        });
        fill(scope.querySelectorAll("[data-i18n-aria]"), "data-i18n-aria", function (node, text) {
            node.setAttribute("aria-label", text);
        });
        var doc = scope.documentElement ? scope : scope.ownerDocument;
        if (doc && doc.documentElement) {
            doc.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
        }
    }

    // Host failures arrive as { code, detail }. Anything else is shown as message.
    function hostText(payload) {
        if (payload && payload.code) {
            return t("host." + payload.code, { detail: payload.detail || "" });
        }
        return (payload && payload.message) || "";
    }

    function keys(lang) {
        return Object.keys(STRINGS[lang] || {});
    }

    root.ConsoleI18n = {
        setLocale: setLocale,
        locale: function () { return locale; },
        t: t,
        hostText: hostText,
        apply: apply,
        keys: keys
    };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleI18n;
    }
})(typeof window !== "undefined" ? window : this);
