// Läuft in der isolierten Welt der Erweiterung und teilt dem Hauptscript mit,
// wo die gebündelten OCR-Dateien liegen (chrome.runtime ist dort nicht verfügbar).
document.documentElement.dataset.belegtextVendor = chrome.runtime.getURL('vendor/');
