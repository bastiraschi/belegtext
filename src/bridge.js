// Läuft in der isolierten Welt der Erweiterung und teilt dem Hauptscript mit, wo die
// Dateien der Erweiterung liegen (OCR, CSS); chrome.runtime ist dort nicht verfügbar.
document.documentElement.dataset.belegtextBase = chrome.runtime.getURL('');
