# Änderungen

## 1.2.1 – 2026-11-22

- Läuft in der neuen Belegansicht von DATEV Unternehmen online (`duo-belege.apps.datev.de`, Belegdetails mit Seitenpanel). Der Viewer ist dort kein eigener Frame mehr, sondern in die Belege-App eingebettet (Web Component mit Shadow DOM); Textlayer, Doppelklick, Ziehen und DATEVs Erkennungskästen funktionieren dort wieder. Die bisherige Belegansicht (`duo-belegbildanzeige.apps.datev.de`) wird weiter unterstützt
- Chrome fragt beim Update einmal nach Zugriff auf die zusätzliche Adresse `duo-belege.apps.datev.de`

## 1.2.0 – 2026-11-20

- IBAN und deutsche USt-IdNr. werden beim Kopieren an der Prüfziffer geprüft; der Hinweis zeigt „IBAN geprüft“ oder warnt farbig, wenn die Prüfziffer nicht stimmt. Liest die Texterkennung in einer reinen Ziffern-IBAN einen Buchstaben (O statt 0), wird die korrigierte IBAN kopiert, wenn erst sie die Prüfziffer erfüllt
- FIN (Fahrgestellnummer) wird beim Kopieren geprüft: Format (17 Zeichen, I/O/Q als Lesefehler zu 1/0 korrigiert), Prüfziffer an Stelle 9 als Zusatz; eine abweichende Prüfziffer gilt nur bei nordamerikanischen FINs als Fehler. Doppelt gelesene Null („0O“, 18 Zeichen) wird entfernt, wenn danach die Prüfziffer stimmt
- Texterkennung: Müll aus Tabellenlinien („LLLLLLL…“) landet nicht mehr im Textlayer; unsichere Mengen (einzelne Ziffern) bleiben erhalten; ohne Lücke getrennte Zeichenketten werden zusammengefügt („DE“ + „123456789“ ergibt wieder die USt-IdNr.)
- Strg+C zeigt jetzt ebenfalls den Hinweis „Kopiert: …“
- Messskript und Tests für die Texterkennung (`npm test`, `npm run messen`); an der Musterrechnung in fünf Varianten 94 statt 91 von 100 Feldern erkannt, 8 statt 12 Fehlwörter

## 1.1.0 – 2026-11-20

- Popup am Belegtext-Symbol: Feedback in drei Kategorien („Etwas klappt nicht“, „Idee“, „Gefällt mir“) und Link zur Anleitung. Öffnet das Formular auf rasch.finance in einem neuen Tab; das Popup sendet nichts und braucht keine Berechtigung

## 1.0.1 – 2026-11-18

- Name im Store: „Belegtext für DATEV Unternehmen online (DUo)“, Kurzbeschreibung nennt DUo – damit die Erweiterung auch bei der Suche nach „DUo“ gefunden wird

## 1.0.0 – 2026-11-08

Erste öffentliche Version.

- Textlayer für digitale PDFs (pdf.js-Textebene)
- Lokale Texterkennung für gescannte PDFs (300 dpi) und Seitenbilder (3-fach hochskaliert)
- Doppelklick und Ziehen kopieren sofort; Strg+C funktioniert zusätzlich
- Doppelklick markiert die ganze Zeichenkette bis zum nächsten Leerzeichen (Rechnungsnummern mit Bindestrich, Datumsangaben, Beträge)
- DATEVs Erkennungskästen bleiben bedienbar; Doppelklick darauf kopiert DATEVs erkannten Wert
- Eigene Zieh-Markierung ohne Sprünge über Zeilenlücken
- Filter für OCR-Rauschen (Formularlinien, Kästchen)
