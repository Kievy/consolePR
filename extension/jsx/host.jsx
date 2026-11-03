// ExtendScript side of ConsolePR. ES3 only: no JSON object, no Array.map, etc.
// Both hosts expose the same calls: listEffects(), applyEffect(kind, name),
// frameInfo() and captureFrame(basePath), which writes basePath + ".png" at full
// quality. When its answer has a "restore" list, call finishCapture with those values
// once the file is ready.
// After Effects also has keyframeState(), setEase(side, percent) and
// setInterpolation(type, side) for the selected keyframes; side is "in", "out" or "both".

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

    // Known failures travel as codes. The panel translates them, so the message
    // matches the host language even when $.locale does not.
    function fail(code, detail) {
        return '{"ok":false,"code":' + quote(code) +
            ',"detail":' + quote(detail || "") +
            ',"message":"","count":0}';
    }

    function afterEffects() {
        var UNDO_COMMAND = 16;

        function isFull(comp) {
            var factor = comp.resolutionFactor;
            return factor[0] === 1 && factor[1] === 1;
        }

        var INTERPOLATIONS = {
            hold: KeyframeInterpolationType.HOLD,
            linear: KeyframeInterpolationType.LINEAR,
            bezier: KeyframeInterpolationType.BEZIER
        };

        // Loose equality on purpose: the key's type and the constant are not always
        // the same kind of value, so === can fail for equal types.
        function interpolationName(type) {
            return type == KeyframeInterpolationType.HOLD ? "hold"
                : type == KeyframeInterpolationType.LINEAR ? "linear" : "bezier";
        }

        // Every selected key, as {property, index}. Null when no comp is open.
        function selectedKeys() {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return null;
            }
            var keys = [];
            var properties = comp.selectedProperties;
            for (var i = 0; i < properties.length; i++) {
                var property = properties[i];
                if (property.propertyType === PropertyType.PROPERTY && property.numKeys > 0) {
                    var indexes = property.selectedKeys;
                    for (var j = 0; j < indexes.length; j++) {
                        keys.push({ property: property, index: indexes[j] });
                    }
                }
            }
            return keys;
        }

        // The panel words the outcome in the host language.
        function keysResult(changed, failed) {
            if (!changed) {
                return fail(failed ? "keysRejected" : "selectKeys");
            }
            return '{"ok":true,"count":' + changed + ',"failed":' + failed + "}";
        }

        // Runs change(property, index) on every selected key as one undo step.
        function eachSelectedKey(undoName, change) {
            var keys = selectedKeys();
            if (!keys) {
                return fail("openComp");
            }
            var changed = 0;
            var failed = 0;
            app.beginUndoGroup(undoName);
            try {
                for (var i = 0; i < keys.length; i++) {
                    try {
                        change(keys[i].property, keys[i].index);
                        changed++;
                    } catch (e) {
                        failed++;
                    }
                }
            } finally {
                app.endUndoGroup();
            }
            return keysResult(changed, failed);
        }

        function eases(current, influence, replace) {
            var list = [];
            for (var d = 0; d < current.length; d++) {
                list.push(replace ? new KeyframeEase(0, influence) : current[d]);
            }
            return list;
        }

        function isAudio(effect) {
            return /^[a\u00e1]udio$/i.test(effect.category);
        }

        // Every read of app.effects rebuilds the whole list (about 9 ms for 447
        // effects), so read it once and loop over the copy.
        function matchName(kind, name) {
            var effects = app.effects;
            for (var i = 0; i < effects.length; i++) {
                var effect = effects[i];
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
                    var effects = app.effects;
                    for (var i = 0; i < effects.length; i++) {
                        var effect = effects[i];
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

            keyframeState: function () {
                try {
                    var keys = selectedKeys();
                    if (!keys) {
                        return fail("openComp");
                    }
                    if (!keys.length) {
                        return '{"ok":true,"count":0}';
                    }
                    var property = keys[0].property;
                    var index = keys[0].index;
                    return '{"ok":true,"count":' + keys.length +
                        ',"easeIn":' + property.keyInTemporalEase(index)[0].influence +
                        ',"easeOut":' + property.keyOutTemporalEase(index)[0].influence +
                        ',"mode":' + quote(interpolationName(property.keyOutInterpolationType(index))) + "}";
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            // Easing a side makes it Bezier with speed 0, like Easy Ease.
            setEase: function (side, percent) {
                try {
                    var influence = Math.max(0.1, Math.min(100, Number(percent)));
                    var easeIn = side !== "out";
                    var easeOut = side !== "in";
                    return eachSelectedKey("ConsolePR: suavizar keyframes", function (property, index) {
                        var inType = easeIn ? KeyframeInterpolationType.BEZIER : property.keyInInterpolationType(index);
                        var outType = easeOut ? KeyframeInterpolationType.BEZIER : property.keyOutInterpolationType(index);
                        property.setInterpolationTypeAtKey(index, inType, outType);
                        try {
                            property.setTemporalContinuousAtKey(index, false);
                            property.setTemporalAutoBezierAtKey(index, false);
                        } catch (e) { /* not every property has these */ }
                        property.setTemporalEaseAtKey(index,
                            eases(property.keyInTemporalEase(index), influence, easeIn),
                            eases(property.keyOutTemporalEase(index), influence, easeOut));
                    });
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            setInterpolation: function (type, side) {
                try {
                    var wanted = INTERPOLATIONS[type];
                    return eachSelectedKey("ConsolePR: interpolação " + type.toUpperCase(), function (property, index) {
                        // After Effects turns an incoming HOLD into LINEAR: a hold always
                        // belongs to the segment after a key. Holding the arrival at this
                        // key therefore means holding the previous key's outgoing side.
                        if (wanted === KeyframeInterpolationType.HOLD && side === "in") {
                            if (index === 1) {
                                throw new Error("no previous key");
                            }
                            property.setInterpolationTypeAtKey(index - 1,
                                property.keyInInterpolationType(index - 1), KeyframeInterpolationType.HOLD);
                            return;
                        }
                        property.setInterpolationTypeAtKey(index,
                            side !== "out" ? wanted : property.keyInInterpolationType(index),
                            side !== "in" ? wanted : property.keyOutInterpolationType(index));
                    });
                } catch (e) {
                    return result(false, e.toString());
                }
            },

            frameInfo: function () {
                try {
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) {
                        return fail("openComp");
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
                        return fail("openComp");
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
                        return fail("openComp");
                    }
                    var layers = comp.selectedLayers;
                    if (!layers.length) {
                        return fail("selectLayer");
                    }
                    var match = matchName(kind, name);
                    if (!match) {
                        return fail("effectMissing", name);
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
                        return fail("layerLocked");
                    }
                    return fail(kind === "audio" ? "needAudioLayer" : "needVideoLayer");
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
                    return fail("openSequence");
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
                    return fail("openSequence");
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
                    return fail("noSequence");
                }
                app.enableQE();
                var qeSeq = qe.project.getActiveSequence();
                var isVideo = kind === "video";
                var tracks = isVideo ? seq.videoTracks : seq.audioTracks;

                var effect = isVideo
                    ? qe.project.getVideoEffectByName(name)
                    : qe.project.getAudioEffectByName(name);
                if (!effect) {
                    return fail("effectMissing", name);
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
                    return fail(isVideo ? "needVideoClip" : "needAudioClip");
                }
                if (countSelected(tracks) > 0) {
                    return fail("applyFailed", name);
                }
                return fail("selectClip");
            } catch (e) {
                return result(false, e.toString());
            }
        }
    };
})();
