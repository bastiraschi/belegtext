/*
 * Belegtext – Popup am Erweiterungssymbol.
 *
 * Öffnet das Feedbackformular oder die Anleitung auf rasch.finance in einem neuen Tab.
 * Das Popup selbst sendet nichts; übergeben werden nur Versionsnummer und gewählte Kategorie.
 */
'use strict';

const SITE = 'https://rasch.finance/belegtext';
const VERSION = chrome.runtime.getManifest().version;

function open(url) {
  chrome.tabs.create({ url });
  window.close();
}

document.getElementById('version').textContent = `v${VERSION}`;

for (const button of document.querySelectorAll('[data-typ]')) {
  button.addEventListener('click', () => {
    open(`${SITE}/feedback/?v=${VERSION}&typ=${button.dataset.typ}`);
  });
}

document.querySelector('[data-page="start"]').addEventListener('click', (event) => {
  event.preventDefault();
  open(`${SITE}/start/?v=${VERSION}`);
});
