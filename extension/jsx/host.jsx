// ExtendScript side of ConsolePR. ES3 only: no JSON object, no Array.map, etc.
// Effects are listed and applied through the QE DOM, which is the only scripting
// API in Premiere that can add an effect to a clip.

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

    function result(ok, message, count) {
        return '{"ok":' + (ok ? "true" : "false") +
            ',"message":' + quote(message || "") +
            ',"count":' + (count || 0) + "}";
    }

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
