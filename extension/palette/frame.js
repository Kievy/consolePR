// File names for saved frames. Runs in the browser and in test/frame.test.js.
(function (root) {
    // Characters Windows doesn't allow in file names, such as the ":" of a timecode.
    function fileNameFor(name, extension) {
        var clean = String(name).replace(/[\\/:*?"<>|;]+/g, "-").replace(/\s+/g, " ").trim();
        return (clean || "frame") + "." + extension;
    }

    // The save dialog doesn't always add the extension of the chosen type.
    function withExtension(filePath, extension) {
        var accepted = extension === "jpeg" ? /\.jpe?g$/i : /\.png$/i;
        return accepted.test(filePath) ? filePath : filePath + "." + extension;
    }

    root.ConsoleFrame = { fileNameFor: fileNameFor, withExtension: withExtension };
    if (typeof module !== "undefined") {
        module.exports = root.ConsoleFrame;
    }
})(typeof window !== "undefined" ? window : this);
