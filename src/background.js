/*
 * Belegtext – Service Worker.
 *
 * Öffnet einmalig nach der Installation die Anleitung auf rasch.finance und hinterlegt die
 * Feedbackseite, die der Browser beim Entfernen der Erweiterung öffnet. Beides braucht keine
 * Berechtigung. Übergeben wird nur die Versionsnummer, keine Daten aus DATEV.
 */
'use strict';

const SITE = 'https://rasch.finance/belegtext';
const VERSION = chrome.runtime.getManifest().version;

chrome.runtime.setUninstallURL(`${SITE}/feedback/?v=${VERSION}`);

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: `${SITE}/start/?v=${VERSION}` });
  }
});
