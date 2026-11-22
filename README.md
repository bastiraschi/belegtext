# Belegtext

Ein Projekt von [rasch.finance](https://rasch.finance/belegtext/).

Chrome- und Edge-Erweiterung, die Text in der Belegansicht von **DATEV Unternehmen online (DUo)** markier- und kopierbar macht – Rechnungsnummern, IBANs, Beträge, Fahrgestellnummern, Namen. Funktioniert bei digitalen PDFs und bei Scans. Kein Abtippen, kein Umweg über Screenshot-OCR.

> Inoffiziell. Keine Verbindung zur DATEV eG. „DATEV“ ist eine Marke der DATEV eG und wird hier nur beschreibend verwendet.

## Installation

- **Chrome:** [Belegtext im Chrome Web Store](https://chromewebstore.google.com/detail/belegtext/cfflgepphklkecaeemcmlbkokeojidgh)
- **Edge:** Microsoft Edge Add-ons – *Link folgt nach Freigabe*. Bis dahin lässt sich Belegtext auch in Edge aus dem Chrome Web Store installieren („Erweiterungen aus anderen Stores zulassen“).
- **Manuell:** Release-ZIP herunterladen und entpacken, `chrome://extensions` öffnen, Entwicklermodus einschalten, **Entpackte Erweiterung laden** und den Ordner wählen. Eine bereits geöffnete DATEV-Seite einmal neu laden.

## Bedienung

- **Doppelklick** auf einen Wert kopiert ihn sofort – die ganze Zeichenkette bis zum nächsten Leerzeichen, also auch Rechnungsnummern mit Bindestrich (`IN-85951534`), Datumsangaben und Beträge.
- **DATEVs Erkennungskästen** (grün/orange) bleiben bedienbar. Ein Doppelklick auf einen Kasten kopiert den Wert, den DATEV erkannt hat.
- **Ziehen** markiert beliebige Textstellen, auch über mehrere Zeilen, und kopiert beim Loslassen.
- **Strg+C** funktioniert zusätzlich wie gewohnt.
- Ein kurzer Hinweis „Kopiert: …“ bestätigt jeden Kopiervorgang. Kopierter Text wird bereinigt (keine angehängten oder doppelten Leerzeichen).
- **IBAN und USt-IdNr. werden geprüft.** Enthält der kopierte Text eine IBAN oder eine deutsche USt-IdNr., rechnet Belegtext die Prüfziffer nach: „IBAN geprüft – Kopiert: …“. Stimmt sie nicht, bleibt ein farbiger Hinweis „IBAN-Prüfziffer falsch“ einige Sekunden stehen. Hat die Texterkennung in einer IBAN, die nur aus Ziffern besteht, einen Buchstaben gelesen (O statt 0) und stimmt die Prüfziffer erst nach dem Ersetzen, wird die korrigierte IBAN kopiert und kurz „IBAN korrigiert“ angezeigt.
- **FIN (Fahrgestellnummer) wird ebenfalls geprüft.** 17 Zeichen, I, O und Q kommen in einer FIN nicht vor und werden als Lesefehler zu 1 bzw. 0 korrigiert („FIN korrigiert“). Stimmt die Prüfziffer an Stelle 9, zeigt der Hinweis „FIN geprüft“, sonst wird ohne Zusatz kopiert – europäische Hersteller müssen diese Prüfziffer nicht verwenden, deshalb gilt eine abweichende nur bei nordamerikanischen FINs (beginnen mit 1–5) als Fehler („FIN-Prüfziffer falsch“). Liest die Texterkennung eine Null doppelt (Schreibmaschinenschrift: „0O“ statt „0“) und hat die FIN dadurch 18 Zeichen, wird das überzählige Zeichen nur entfernt, wenn danach die Prüfziffer stimmt; sonst bleibt der Text, und der Hinweis lautet „FIN unsicher, bitte prüfen“.
- **Woran die Werte erkannt werden:** nur an der Form der kopierten Zeichenkette, nicht an der Beschriftung daneben. IBAN: Ländercode, zwei Prüfziffern und genau die Länge, die das Land vorschreibt. USt-IdNr.: „DE“ und neun Ziffern. FIN: genau 17 Buchstaben und Ziffern ohne Leerzeichen, mit mindestens zwei Buchstaben und fünf Ziffern. Andere Werte bleiben unverändert und ohne Prüfhinweis.
- **Feedback:** Ein Klick auf das Belegtext-Symbol in der Symbolleiste öffnet ein kleines Menü („Etwas klappt nicht“, „Idee“, „Gefällt mir“). Tipp: Symbol über das Puzzle-Menü anheften.
- Bei **Scans und Seitenbildern** erscheint oben rechts kurz „Texterkennung …“. Beim ersten Scan einer Sitzung dauert das einige Sekunden, danach meist 2–4 Sekunden pro Seite.

## Wie es funktioniert

Die Belegbildanzeige von DATEV Unternehmen online zeichnet Belege auf ein Canvas, blendet aber keine Textebene ein. Je nach Beleg auf zwei Wegen: Entweder lädt sie das Original-PDF und zeichnet es mit [pdf.js](https://github.com/mozilla/pdf.js), oder sie lädt ein vom Server gerendertes Seitenbild (ca. 96 dpi) und zeichnet es per `drawImage`.

Belegtext hängt sich in beide Zeichenwege ein. Dadurch ist bei jeder Seite exakt bekannt, was in welchem Canvas liegt – inklusive Zoom. Über das Canvas wird ein unsichtbarer Textlayer gelegt:

- **Digitale PDFs:** die im PDF enthaltene Textebene (pdf.js TextLayer).
- **Gescannte PDFs:** Die Seite wird in 300 dpi gerendert und mit [Tesseract.js](https://github.com/naptha/tesseract.js) (WebAssembly, deutsches Sprachmodell) erkannt.
- **Seitenbilder:** Das Bild wird dreifach hochskaliert und ebenfalls mit Tesseract erkannt. Ohne Hochskalieren liest Tesseract bei 96 dpi nachweislich falsche Ziffern.

Formularlinien, Kästchen und Flecken werden herausgefiltert; Zeichenketten, die Tesseract ohne Lücke in zwei Wörter zerlegt („DE“ + „123456789“), werden wieder zusammengefügt. Die Regeln stehen in `src/pruefung.js` und werden an den Musterbelegen gemessen (siehe „Entwickeln“). Es gibt keine Heuristik zur Zuordnung von Seiten und keinen Bildabgleich, also keine Gefahr, Text eines anderen Belegs zu kopieren.

## Datenschutz und Sicherheit

- **Nur die Belegansicht.** Die Erweiterung läuft ausschließlich auf `duo-belege.apps.datev.de` (neue Belegansicht, Viewer direkt in der Belege-App) und `duo-belegbildanzeige.apps.datev.de` (bisherige Belegansicht als eingebetteter Frame) und fordert keine weiteren Berechtigungen an (kein `permissions`- oder `host_permissions`-Eintrag). Aktiv wird sie dort nur am Belegbild. Chrome weist bei der Installation darauf hin, dass sie diese Seiten lesen und ändern darf – das ist der Textlayer über dem Beleg.
- **Keine Übertragung von Belegdaten.** Gearbeitet wird mit dem, was der DATEV-Viewer ohnehin geladen hat. Texterkennung und Sprachmodell sind in der Erweiterung enthalten – Belegdaten verlassen den Rechner nicht.
- **Anleitung und Feedback.** Einmalig nach der Installation öffnet sich die [Anleitung auf rasch.finance](https://rasch.finance/belegtext/start/), beim Entfernen eine kurze Feedbackseite. Das Popup am Symbol öffnet auf Klick dieselbe Feedbackseite in einem neuen Tab; abgeschickt wird erst dort. Übergeben werden nur Versionsnummer und gewählte Kategorie. Sonst öffnet oder sendet die Erweiterung nichts.
- **Keine Telemetrie, keine externen Dienste, kein nachgeladener Code.**
- **Nachprüfbar:** Die eigene Logik steht vollständig in `src/belegtext.js` (rund 630 Zeilen, kommentiert), `src/pruefung.js` (Filterregeln der Texterkennung und Prüfziffern, rund 160 Zeilen), `src/bridge.js` (eine Zeile), `src/background.js` (Anleitung und Feedbackseite, rund 10 Zeilen) und `src/popup.js` (Popup am Symbol, rund 25 Zeilen). Jede Store-Version entspricht einem Git-Tag in diesem Repository.

Datenschutzerklärung: [PRIVACY.md](PRIVACY.md)

### Drittkomponenten prüfen

Die Dateien in `vendor/` sind unverändert aus den offiziellen npm-Paketen übernommen:

| Datei | Paket | SHA-256 |
|---|---|---|
| `vendor/tesseract.min.js` | tesseract.js 7.0.0 (`dist/`) | `000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e` |
| `vendor/worker.min.js` | tesseract.js 7.0.0 (`dist/`) | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| `vendor/core/tesseract-core-lstm.wasm.js` | tesseract.js-core 7.0.0 | `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680` |
| `vendor/core/tesseract-core-simd-lstm.wasm.js` | tesseract.js-core 7.0.0 | `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38` |
| `vendor/core/tesseract-core-relaxedsimd-lstm.wasm.js` | tesseract.js-core 7.0.0 | `861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3` |
| `vendor/lang/deu.traineddata.gz` | @tesseract.js-data/deu 1.0.0 (`4.0.0_best_int/`) | `306c4280d0cbed46fbff727486bd43b92730181bae80f56941a091f363bdf28b` |

Selbst nachprüfen:

```bash
npm pack tesseract.js@7.0.0 tesseract.js-core@7.0.0 @tesseract.js-data/deu@1.0.0
for f in *.tgz; do mkdir -p "${f%.tgz}" && tar -xzf "$f" -C "${f%.tgz}"; done
sha256sum tesseract.js-7.0.0/package/dist/tesseract.min.js \
          tesseract.js-7.0.0/package/dist/worker.min.js \
          tesseract.js-core-7.0.0/package/tesseract-core-*lstm.wasm.js \
          tesseract.js-data-deu-1.0.0/package/4.0.0_best_int/deu.traineddata.gz
```

## Grenzen

- **Handschrift** wird kaum erkannt.
- **Seitenbilder (96 dpi):** Normale Schrift, Nummern und Beträge werden zuverlässig erkannt, sehr kleine Schrift (z. B. Anschriften im Sichtfenster) oft fehlerhaft. Das liegt an der Auflösung, die DATEV ausliefert.
- **Mehrspaltige Formulare bei Scans:** Die Texterkennung liest zeilenweise über die ganze Breite. Markiert man mehrere Zeilen in einer Spalte, kann Text aus der Nachbarspalte mitkommen. Einzelne Felder sind nicht betroffen.
- **Gedrehte Seitenbilder** bekommen keinen Textlayer, bis die Ansicht zurückgedreht ist.
- **Erkennungsfehler:** Bei Scans ist der Text eine Texterkennung, kein Originaltext. IBAN und USt-IdNr. prüft Belegtext an der Prüfziffer, Beträge und andere Werte nicht – kurz gegenprüfen.
- **Doppelklick auf eine IBAN** kopiert nur den Viererblock. Zum Prüfen die ganze IBAN markieren (Ziehen oder Dreifachklick).
- **Abhängig von DATEV-Interna.** Ändert DATEV den Aufbau oder die Sicherheitseinstellungen der Belegbildanzeige, kann eine Anpassung nötig sein.

## Entwickeln

Für Tests und Messungen (nicht Teil des Store-Pakets) einmal `npm install`, dann:

- `npm test` prüft die Regeln aus `src/pruefung.js` (Filter, IBAN, USt-IdNr.).
- `npm run messen` lässt die Musterrechnung in fünf Varianten durch dieselbe Texterkennung wie die Erweiterung laufen (Scan-PDF in 300 dpi, schief, schlechter Scan, Seitenbild eines Scans, Seitenbild eines digitalen PDFs) und zählt erkannte Felder und Fehlwörter. `-- --details` zeigt fehlende Felder, Fehlwörter und verworfene Wörter. Erwartete Werte: `test/korpus/musterrechnung.json`.

Änderungen an der Texterkennung nur übernehmen, wenn die Messung nicht schlechter wird. Nur Musterbelege verwenden, nie echte Belege.

## Fehler melden und Feedback

Am einfachsten über das Belegtext-Symbol in der Symbolleiste. Alternativ über [GitHub Issues](https://github.com/bastiraschi/belegtext/issues) oder per E-Mail an [belegtext@rasch.finance](mailto:belegtext@rasch.finance). **Keine echten Belege, Mandantendaten oder Screenshots davon anhängen.** Für Beispiele eignen sich die Musterbelege in `store/musterbelege/`.

Hilfreich für Fehlermeldungen: Meldungen aus der Entwicklerkonsole (F12) mit dem Präfix `[Belegtext]`. In der neuen Belegansicht (`duo-belege.apps.datev.de`) erscheinen sie direkt in der Konsole; in der bisherigen Ansicht läuft der Beleg in einem eingebetteten Frame – dort oben links im Kontext-Auswahlfeld `duo-belegbildanzeige.apps.datev.de` wählen.

## Herausgeber

[rasch.finance](https://rasch.finance/belegtext/) · [Impressum](https://rasch.finance/impressum.html) · [belegtext@rasch.finance](mailto:belegtext@rasch.finance)

## Lizenz

MIT, siehe [LICENSE](LICENSE).

Enthaltene Drittkomponenten in `vendor/`: Tesseract.js, Tesseract.js-core und das deutsche Tesseract-Sprachmodell (jeweils Apache-2.0, Lizenztexte in `vendor/`). Die Styles des Textlayers sind an `pdf_viewer.css` von pdf.js (Apache-2.0) angelehnt.
