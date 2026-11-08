# Store-Einträge

Gilt für Chrome Web Store und Microsoft Edge Add-ons. Hochgeladen wird `belegtext-1.0.0-store.zip` (Manifest liegt im ZIP-Wurzelverzeichnis).

## Grunddaten

- **Name:** Belegtext
- **Kurzbeschreibung (max. 132 Zeichen, steht im Manifest):**
  Text in der Belegansicht von DATEV Unternehmen online markieren und kopieren – auch bei Scans. Inoffiziell, läuft lokal.
- **Kategorie:** Chrome: „Produktivität → Workflow und Planung“; Edge: „Produktivität“
- **Sprache:** Deutsch
- **Herausgeber:** rasch.finance – Alexander Rasch (Entwicklerkonto über einen rasch.finance-Workspace-Account)
- **Projektseite (Website):** https://rasch.finance/belegtext/
- **Support:** belegtext@rasch.finance (Support-URL: https://rasch.finance/belegtext/#faq)
- **Datenschutzerklärung (URL):** https://github.com/bastiraschi/belegtext/blob/main/PRIVACY.md
- **Grafiken:** Symbol `icons/icon-128.png`, kleine Werbekachel `store/kachel-440x280.png`, Screenshots 1280×800 (siehe `screenshots.md`)

## Ausführliche Beschreibung

```
Schluss mit Abtippen: Belegtext macht Text in der Belegansicht von DATEV Unternehmen online markier- und kopierbar.

Rechnungsnummern, IBANs, Beträge, Kundennummern, Lieferantennamen – per Doppelklick kopiert, per Ziehen markiert. Funktioniert bei digitalen PDF-Rechnungen und bei gescannten Belegen.

SO FUNKTIONIERT ES
• Doppelklick auf einen Wert kopiert ihn sofort – auch Rechnungsnummern mit Bindestrich, Datumsangaben und Beträge
• DATEVs grüne und orange Erkennungskästen bleiben bedienbar
• Ziehen markiert beliebige Stellen, auch über mehrere Zeilen, und kopiert beim Loslassen
• Strg+C funktioniert zusätzlich wie gewohnt
• Digitale PDFs: Die im PDF vorhandene Textebene wird über den Beleg gelegt
• Scans und Belegbilder: Der Text wird lokal per Texterkennung (Tesseract) erkannt

DATENSCHUTZ
• Zugriff nur auf die Belegansicht von Unternehmen online, keine weiteren Berechtigungen
• Keine Übertragung von Belegdaten – Texterkennung und Sprachmodell sind enthalten
• Keine Datenspeicherung, keine Telemetrie
• Einmalig nach der Installation öffnet sich eine kurze Anleitung auf rasch.finance
• Open Source (MIT): https://github.com/bastiraschi/belegtext

HINWEISE
• Bei Scans ist der Text eine Texterkennung. Kritische Werte wie IBAN und Beträge bitte kurz gegenprüfen.
• Inoffizielle Erweiterung ohne Verbindung zur DATEV eG. DATEV ist eine Marke der DATEV eG.
```

## Datenschutzpraktiken (Chrome-Dashboard, Reiter „Datenschutz“)

- **Einziger Zweck (Single purpose):**
  Belegtext macht Text in der Belegansicht von DATEV Unternehmen online markier- und kopierbar, indem es eine unsichtbare Textebene über das angezeigte Belegbild legt.
- **Begründung Hostzugriff (`duo-belegbildanzeige.apps.datev.de`):**
  Die Erweiterung muss in der Belegansicht laufen, um dort die Textebene über den angezeigten Beleg zu legen. Sie läuft auf keiner anderen Seite.
- **Remote-Code:** Nein. Sämtlicher Code einschließlich der Texterkennung ist im Paket enthalten.
- **Service Worker:** öffnet nur einmalig nach der Installation die Anleitung und setzt die Feedbackseite für die Deinstallation (`chrome.tabs.create`, `chrome.runtime.setUninstallURL`, beides ohne Berechtigung).
- **Datennutzung:** Keine der Kategorien ankreuzen (es werden keine Daten erhoben).
- **Bestätigungen:** alle drei Erklärungen bestätigen (kein Verkauf, keine zweckfremde Nutzung, keine Bonitätsprüfung).

## Händlerstatus (EU-Digital-Services-Act)

Beide Stores fragen, ob du als **Händler (Trader)** oder **Nicht-Händler** veröffentlichst.

**Wir veröffentlichen als Händler.** Belegtext ist kostenlos, wird aber von einem Unternehmen herausgegeben und verweist auf dessen Website (Projektseite und Willkommensseite auf rasch.finance). Der Store zeigt die Angaben öffentlich an; sie müssen mit dem Impressum von rasch.finance übereinstimmen:

- **Name:** Alexander Rasch (rasch.finance)
- **Anschrift:** Eosanderstraße 24, 10587 Berlin, Deutschland
- **E-Mail:** belegtext@rasch.finance
- **Telefon:** +49 361 21873622
- **USt-IdNr.:** DE337364072

## Ablauf

1. Chrome: https://chrome.google.com/webstore/devconsole – einmalig 5 USD Registrierung, dann „Neues Element“ → ZIP hochladen → Einträge ausfüllen → zur Prüfung einreichen.
2. Edge: https://partner.microsoft.com/dashboard/microsoftedge – kostenlos, gleiches ZIP, gleiche Texte.
3. Nach Freigabe die Store-Links in README und Community-Post eintragen.
