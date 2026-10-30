// ExtendScript side of ConsolePR. ES3 only: no JSON object, no Array.map, etc.
// Both hosts expose the same calls: listEffects(), applyEffect(kind, name),
// frameInfo() and captureFrame(basePath), which writes basePath + ".png" at full
// quality. When its answer has a "restore" list, call finishCapture with those values
// once the file is ready.

var ConsolePR = (function () {
    function quote(s) {
        return '"' + String(s)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n") + '"';
    }

    function toJsonArray(names) {
        var parts = [];
        for (var i = 0; i < names.length; i++) {
            parts.push(quote(names[i]));
        }
        return "[" + parts.join(",") + "]";
    }

    // getVideoEffectList() returns an array on recent versions and a
    // comma-separated string on some older ones.
    function normalizeList(list) {
        if (!list) {
            return [];
        }
        if (typeof list === "string") {
            return list.split(",");
        }
        var names = [];
        for (var i = 0; i < list.length; i++) {
            names.push(String(list[i]));
        }
        return names;
    }

    function frameResult(name) {
        return '{"ok":true,"name":' + quote(name) + "}";
    }

    function result(ok, message, count) {
        return '{"ok":' + (ok ? "true" : "false") +
            ',"message":' + quote(message || "") +
            ',"count":' + (count || 0) + "}";
    }

    function afterEffects() {
        var UNDO_COMMAND = 16;

        function isFull(comp) {
            var factor = comp.resolutionFactor;
            return factor[0] === 1 && factor[1] === 1;
        }

        function isAudio(effect) {
            return /^[a\u00e1]udio$/i.test(effect.category);
        }

        function matchName(kind, name) {
            for (var i = 0; i < app.effects.length; i++) {
                var effect = app.effects[i];
                if (effect.displayName === name && effect.category && isAudio(effect) === (kind === "audio")) {
                    return effect.matchName;
                }
            }
            return null;
        }

        return {
            listEffects: function () {
                try {
                    var video = [];
                    var audio = [];
                    var seen = {};
                    for (var i = 0; i < app.effects.length; i++) {
                        var effect = app.effects[i];
                        // Effects without a category are internal and hidden from the Effects menu.
                        if (effect.category && !seen["$" + effect.displayName]) {
                            seen["$" + effect.displayName] = true;
                            (isAudio(effect) ? audio : video).push(effect.displayName);
                        }
                    }
                    return '{"video":' + toJsonArray(video) + ',"audio":' + toJsonArray(audio) + "}";
                } catch (e) {
                    return '{"error":' + quote(e.toString()) + "}";
                }
            },

            frameInfo: function () {
                try {
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) {
                        return result(false, "Abra uma composição.");
                    }
                    return frameResult(comp.name + " " + timeToCurrentFormat(comp.time, comp.frameRate));
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            captureFrame: function (basePath) {
                try {
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) {
                        return result(false, "Abra uma composição.");
                    }
                    var file = new File(basePath + ".png");
                    // The frame follows the comp's resolution, as chosen in the viewer.
                    if (isFull(comp)) {
                        comp.saveFrameToPng(comp.time, file);
                        return result(true, "");
                    }
                    var factor = comp.resolutionFactor;
                    comp.resolutionFactor = [1, 1];
                    comp.saveFrameToPng(comp.time, file);
                    return '{"ok":true,"restore":[' + comp.id + "," + factor[0] + "," + factor[1] + "]}";
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            // Undoes the switch to full quality so the print leaves no step in the
            // user's undo history. Checks the state first, in case anything else
            // happened meanwhile, and sets the value directly if undo didn't get it back.
            finishCapture: function (compId, x, y) {
                try {
                    var comp = app.project.itemByID(compId);
                    if (comp && isFull(comp)) {
                        app.executeCommand(UNDO_COMMAND);
                    }
                    comp = app.project.itemByID(compId);
                    if (comp && (comp.resolutionFactor[0] !== x || comp.resolutionFactor[1] !== y)) {
                        comp.resolutionFactor = [x, y];
                    }
                    return result(true, "");
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            applyEffect: function (kind, name) {
                var grouped = false;
                try {
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) {
                        return result(false, "Abra uma composição.");
                    }
                    var layers = comp.selectedLayers;
                    if (!layers.length) {
                        return result(false, "Selecione uma camada na composição.");
                    }
                    var match = matchName(kind, name);
                    if (!match) {
                        return result(false, "Efeito não encontrado: " + name);
                    }
                    app.beginUndoGroup("ConsolePR: " + name);
                    grouped = true;
                    var applied = 0;
                    var locked = 0;
                    for (var i = 0; i < layers.length; i++) {
                        var parade = layers[i].property("ADBE Effect Parade");
                        // canAddProperty alone accepts audio effects on layers without sound.
                        var suitable = kind === "audio" ? layers[i].hasAudio : layers[i].hasVideo;
                        if (layers[i].locked) {
                            locked++;
                        } else if (suitable && parade && parade.canAddProperty(match)) {
                            parade.addProperty(match);
                            applied++;
                        }
                    }
                    if (applied > 0) {
                        return result(true, "", applied);
                    }
                    if (locked === layers.length) {
                        return result(false, "A camada selecionada está bloqueada.");
                    }
                    return result(false, kind === "audio"
                        ? "Efeito de áudio: selecione uma camada com áudio."
                        : "Efeito de vídeo: selecione uma camada com imagem.");
                } catch (e) {
                    return result(false, e.toString());
                } finally {
                    if (grouped) {
                        app.endUndoGroup();
                    }
                }
            }
        };
    }

    // Premiere lists and applies through the QE DOM, the only scripting API
    // there that can add an effect to a clip.
    function findQeItem(qeTrack, clip) {
        var startTicks = String(clip.start.ticks);
        var endTicks = String(clip.end.ticks);
        var fallback = null;
        for (var i = 0; i < qeTrack.numItems; i++) {
            var item = qeTrack.getItemAt(i);
            if (!item || item.type === "Empty" || item.type === "Transition") {
                continue;
            }
            if (String(item.start.ticks) === startTicks) {
                if (String(item.end.ticks) === endTicks) {
                    return item;
                }
                fallback = fallback || item;
            }
        }
        return fallback;
    }

    function applyToTracks(tracks, getQeTrack, addEffect) {
        var applied = 0;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                if (clips[c].isSelected()) {
                    var item = findQeItem(getQeTrack(t), clips[c]);
                    if (item && addEffect(item)) {
                        applied++;
                    }
                }
            }
        }
        return applied;
    }

    function countSelected(tracks) {
        var total = 0;
        for (var t = 0; t < tracks.numTracks; t++) {
            var clips = tracks[t].clips;
            for (var c = 0; c < clips.numItems; c++) {
                if (clips[c].isSelected()) {
                    total++;
                }
            }
        }
        return total;
    }

    // app.effects exists only in After Effects.
    if (typeof app.effects !== "undefined") {
        return afterEffects();
    }

    return {
        listEffects: function () {
            try {
                app.enableQE();
                return '{"video":' + toJsonArray(normalizeList(qe.project.getVideoEffectList())) +
                    ',"audio":' + toJsonArray(normalizeList(qe.project.getAudioEffectList())) + "}";
            } catch (e) {
                return '{"error":' + quote(e.toString()) + "}";
            }
        },

        frameInfo: function () {
            try {
                var seq = app.project.activeSequence;
                if (!seq) {
                    return result(false, "Abra uma sequência.");
                }
                app.enableQE();
                return frameResult(seq.name + " " + qe.project.getActiveSequence().CTI.timecode);
            } catch (e) {
                return result(false, e.toString());
            }
        },

        captureFrame: function (basePath) {
            try {
                if (!app.project.activeSequence) {
                    return result(false, "Abra uma sequência.");
                }
                app.enableQE();
                var qeSeq = qe.project.getActiveSequence();
                // Premiere adds the .png itself.
                // Always at sequence size: the monitor's playback resolution doesn't apply.
                qeSeq.exportFramePNG(qeSeq.CTI.timecode, basePath);
                return result(true, "");
            } catch (e) {
                return result(false, e.toString());
            }
        },

        applyEffect: function (kind, name) {
            try {
                var seq = app.project.activeSequence;
                if (!seq) {
                    return result(false, "Nenhuma sequência ativa.");
                }
                app.enableQE();
                var qeSeq = qe.project.getActiveSequence();
                var isVideo = kind === "video";
                var tracks = isVideo ? seq.videoTracks : seq.audioTracks;

                var effect = isVideo
                    ? qe.project.getVideoEffectByName(name)
                    : qe.project.getAudioEffectByName(name);
                if (!effect) {
                    return result(false, "Efeito não encontrado: " + name);
                }

                var applied = applyToTracks(tracks, function (t) {
                    return isVideo ? qeSeq.getVideoTrackAt(t) : qeSeq.getAudioTrackAt(t);
                }, function (item) {
                    return isVideo ? item.addVideoEffect(effect) : item.addAudioEffect(effect);
                });

                if (applied > 0) {
                    return result(true, "", applied);
                }
                var otherSelected = countSelected(isVideo ? seq.audioTracks : seq.videoTracks);
                if (otherSelected > 0) {
                    return result(false, isVideo
                        ? "Efeito de vídeo: selecione um clipe de vídeo."
                        : "Efeito de áudio: selecione um clipe de áudio.");
                }
                if (countSelected(tracks) > 0) {
                    return result(false, "Não foi possível aplicar: " + name);
                }
                return result(false, "Selecione um clipe na timeline.");
            } catch (e) {
                return result(false, e.toString());
            }
        }
    };
})();
