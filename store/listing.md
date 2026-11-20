# Store-Einträge

Gilt für Chrome Web Store und Microsoft Edge Add-ons. Hochgeladen wird `belegtext-1.2.0-store.zip` (Manifest liegt im ZIP-Wurzelverzeichnis).

## Grunddaten

- **Name (max. 75 Zeichen, steht im Manifest):** Belegtext für DATEV Unternehmen online (DUo)
- **Kurzbeschreibung (max. 132 Zeichen, steht im Manifest):**
  Text in der Belegansicht von DATEV Unternehmen online (DUo) markieren und kopieren – auch bei Scans. Inoffiziell, läuft lokal.
- **Kategorie:** Chrome: „Produktivität → Workflow und Planung“; Edge: „Produktivität“
- **Sprache:** Deutsch
- **Herausgeber:** rasch.finance
- **Projektseite (Website):** https://rasch.finance/belegtext/
- **Support:** belegtext@rasch.finance (Support-URL: https://rasch.finance/belegtext/#faq)
- **Datenschutzerklärung (URL):** https://github.com/bastiraschi/belegtext/blob/main/PRIVACY.md
- **Grafiken:** Symbol `icons/icon-128.png`, kleine Werbekachel `store/kachel-440x280.png`, Screenshots 1280×800 (siehe `screenshots.md`)

## Ausführliche Beschreibung

```
Schluss mit Abtippen: Belegtext macht Text in der Belegansicht von DATEV Unternehmen online (DUo) markier- und kopierbar.

Rechnungsnummern, IBANs, Beträge, Kundennummern, Lieferantennamen – per Doppelklick kopiert, per Ziehen markiert. Funktioniert bei digitalen PDF-Rechnungen und bei gescannten Belegen.

SO FUNKTIONIERT ES
• Doppelklick auf einen Wert kopiert ihn sofort – auch Rechnungsnummern mit Bindestrich, Datumsangaben und Beträge
• DATEVs grüne und orange Erkennungskästen bleiben bedienbar
• Ziehen markiert beliebige Stellen, auch über mehrere Zeilen, und kopiert beim Loslassen
• Strg+C funktioniert zusätzlich wie gewohnt
• IBAN, USt-IdNr. und Fahrgestellnummer (FIN) werden beim Kopieren geprüft – mit Warnung, wenn etwas nicht stimmt
• Digitale PDFs: Die im PDF vorhandene Textebene wird über den Beleg gelegt
• Scans und Belegbilder: Der Text wird lokal per Texterkennung (Tesseract) erkannt

DATENSCHUTZ
• Zugriff nur auf die Belegansicht von Unternehmen online, keine weiteren Berechtigungen
• Keine Übertragung von Belegdaten – Texterkennung und Sprachmodell sind enthalten
• Keine Datenspeicherung, keine Telemetrie
• Einmalig nach der Installation öffnet sich eine kurze Anleitung auf rasch.finance
• Feedback über das Symbol in der Symbolleiste: öffnet ein Formular auf rasch.finance, aus DATEV wird nichts übernommen
• Open Source (MIT): https://github.com/bastiraschi/belegtext

HINWEISE
• Bei Scans ist der Text eine Texterkennung. IBAN und USt-IdNr. prüft Belegtext an der Prüfziffer, Beträge bitte kurz gegenprüfen.
• Inoffizielle Erweiterung ohne Verbindung zur DATEV eG. DATEV ist eine Marke der DATEV eG.
```

## Datenschutzpraktiken (Chrome-Dashboard, Reiter „Datenschutz“)

- **Einziger Zweck (Single purpose):**
  Belegtext macht Text in der Belegansicht von DATEV Unternehmen online markier- und kopierbar, indem es eine unsichtbare Textebene über das angezeigte Belegbild legt.
- **Begründung Hostzugriff (`duo-belegbildanzeige.apps.datev.de`):**
  Die Erweiterung muss in der Belegansicht laufen, um dort die Textebene über den angezeigten Beleg zu legen. Sie läuft auf keiner anderen Seite.
- **Remote-Code:** Nein. Sämtlicher Code einschließlich der Texterkennung ist im Paket enthalten.
- **Service Worker:** öffnet nur einmalig nach der Installation die Anleitung und setzt die Feedbackseite für die Deinstallation (`chrome.tabs.create`, `chrome.runtime.setUninstallURL`, beides ohne Berechtigung).
- **Popup (`action`):** keine Berechtigung. Öffnet auf Klick die Feedbackseite oder die Anleitung auf rasch.finance in einem neuen Tab (`chrome.tabs.create`) und sendet selbst nichts.
- **Datennutzung:** Keine der Kategorien ankreuzen (es werden keine Daten erhoben).
- **Bestätigungen:** alle drei Erklärungen bestätigen (kein Verkauf, keine zweckfremde Nutzung, keine Bonitätsprüfung).
- **Datenschutzerklärung (URL):** https://github.com/bastiraschi/belegtext/blob/main/PRIVACY.md

## Testanweisungen (Chrome-Reiter „Testanweisungen“, Edge „Hinweise für die Zertifizierung“)

Benutzername und Passwort leer lassen (kein Testzugang möglich). Zusätzliche Anweisungen, Englisch, höchstens 500 Zeichen:

```
Runs only in the document viewer of DATEV Unternehmen online (duo-belegbildanzeige.apps.datev.de). Login needs a hardware token, so no test account is possible. It overlays a selectable text layer on the shown invoice (PDF text layer or bundled Tesseract OCR). Only access: content script on that host. No data sent, no remote code. Guide on rasch.finance once after install; toolbar popup and uninstall open a feedback page (version, category only). Code: github.com/bastiraschi/belegtext
```

## Händlerstatus (EU-Digital-Services-Act)

Beide Stores fragen, ob du als **Händler (Trader)** oder **Nicht-Händler** veröffentlichst.

**Wir veröffentlichen als Händler.** Belegtext ist kostenlos, wird aber von einem Unternehmen herausgegeben und verweist auf dessen Website. Die Händlerangaben (Name, Anschrift, E-Mail, Telefon) entsprechen dem [Impressum von rasch.finance](https://rasch.finance/impressum.html) und werden nur in den Dashboards eingetragen, nicht hier.

Im Chrome Web Store kommen Telefonnummer und Anschrift aus der Händlerverifizierung, nicht aus einem Kontaktfeld. Die Telefonnummer wird per SMS bestätigt und muss deshalb SMS-fähig sein. Ändern lassen sich Name, Telefonnummer und Land nur über eine neue Verifizierung: Händlerstatus kurz auf „Nicht-Händler“ und wieder auf „Händler“ stellen.

## Ablauf

1. Chrome: https://chrome.google.com/webstore/devconsole – einmalig 5 USD Registrierung, dann „Neues Element“ → ZIP hochladen → Einträge ausfüllen → zur Prüfung einreichen.
2. Edge: https://partner.microsoft.com/dashboard/microsoftedge – kostenlos, gleiches ZIP, gleiche Texte.
3. Nach Freigabe die Store-Links in README und auf der Projektseite (rasch.finance/belegtext) eintragen.
