document.addEventListener('DOMContentLoaded', function() {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('version');
    if (versionElement) {
        versionElement.textContent = `v${manifest.version}`;
    }
});
