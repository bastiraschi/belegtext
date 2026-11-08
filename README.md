# Belegtext

Ein Projekt von [rasch.finance](https://rasch.finance/belegtext/).

Chrome- und Edge-Erweiterung, die Text in der Belegansicht von **DATEV Unternehmen online** markier- und kopierbar macht – Rechnungsnummern, IBANs, Beträge, Fahrgestellnummern, Namen. Funktioniert bei digitalen PDFs und bei Scans. Kein Abtippen, kein Umweg über Screenshot-OCR.

> Inoffiziell. Keine Verbindung zur DATEV eG. „DATEV“ ist eine Marke der DATEV eG und wird hier nur beschreibend verwendet.

## Installation

- **Chrome:** Chrome Web Store – *Link folgt nach Freigabe*
- **Edge:** Microsoft Edge Add-ons – *Link folgt nach Freigabe*
- **Manuell:** Release-ZIP herunterladen und entpacken, `chrome://extensions` öffnen, Entwicklermodus einschalten, **Entpackte Erweiterung laden** und den Ordner wählen. Eine bereits geöffnete DATEV-Seite einmal neu laden.

## Bedienung

- **Doppelklick** auf einen Wert kopiert ihn sofort – die ganze Zeichenkette bis zum nächsten Leerzeichen, also auch Rechnungsnummern mit Bindestrich (`IN-85951534`), Datumsangaben und Beträge.
- **DATEVs Erkennungskästen** (grün/orange) bleiben bedienbar. Ein Doppelklick auf einen Kasten kopiert den Wert, den DATEV erkannt hat.
- **Ziehen** markiert beliebige Textstellen, auch über mehrere Zeilen, und kopiert beim Loslassen.
- **Strg+C** funktioniert zusätzlich wie gewohnt.
- Ein kurzer Hinweis „Kopiert: …“ bestätigt jeden Kopiervorgang. Kopierter Text wird bereinigt (keine angehängten oder doppelten Leerzeichen).
- Bei **Scans und Seitenbildern** erscheint oben rechts kurz „Texterkennung …“. Beim ersten Scan einer Sitzung dauert das einige Sekunden, danach meist 2–4 Sekunden pro Seite.

## Wie es funktioniert

Die Belegbildanzeige von DATEV Unternehmen online zeichnet Belege auf ein Canvas, blendet aber keine Textebene ein. Je nach Beleg auf zwei Wegen: Entweder lädt sie das Original-PDF und zeichnet es mit [pdf.js](https://github.com/mozilla/pdf.js), oder sie lädt ein vom Server gerendertes Seitenbild (ca. 96 dpi) und zeichnet es per `drawImage`.

Belegtext hängt sich in beide Zeichenwege ein. Dadurch ist bei jeder Seite exakt bekannt, was in welchem Canvas liegt – inklusive Zoom. Über das Canvas wird ein unsichtbarer Textlayer gelegt:

- **Digitale PDFs:** die im PDF enthaltene Textebene (pdf.js TextLayer).
- **Gescannte PDFs:** Die Seite wird in 300 dpi gerendert und mit [Tesseract.js](https://github.com/naptha/tesseract.js) (WebAssembly, deutsches Sprachmodell) erkannt.
- **Seitenbilder:** Das Bild wird dreifach hochskaliert und ebenfalls mit Tesseract erkannt. Ohne Hochskalieren liest Tesseract bei 96 dpi nachweislich falsche Ziffern.

Formularlinien, Kästchen und Flecken werden herausgefiltert. Es gibt keine Heuristik zur Zuordnung von Seiten und keinen Bildabgleich, also keine Gefahr, Text eines anderen Belegs zu kopieren.

## Datenschutz und Sicherheit

- **Nur die Belegansicht.** Die Erweiterung läuft ausschließlich im Frame `duo-belegbildanzeige.apps.datev.de` und fordert keine weiteren Berechtigungen an (kein `permissions`- oder `host_permissions`-Eintrag). Chrome weist bei der Installation darauf hin, dass sie diese eine Seite lesen und ändern darf – das ist der Textlayer über dem Beleg.
- **Keine Übertragung von Belegdaten.** Gearbeitet wird mit dem, was der DATEV-Viewer ohnehin geladen hat. Texterkennung und Sprachmodell sind in der Erweiterung enthalten – Belegdaten verlassen den Rechner nicht.
- **Anleitung und Feedback.** Einmalig nach der Installation öffnet sich die [Anleitung auf rasch.finance](https://rasch.finance/belegtext/start/), beim Entfernen eine kurze Feedbackseite. Übergeben wird nur die Versionsnummer. Sonst öffnet oder sendet die Erweiterung nichts.
- **Keine Telemetrie, keine externen Dienste, kein nachgeladener Code.**
- **Nachprüfbar:** Die eigene Logik steht vollständig in `src/belegtext.js` (rund 630 Zeilen, kommentiert), `src/bridge.js` (eine Zeile) und `src/background.js` (Anleitung und Feedbackseite, rund 10 Zeilen). Jede Store-Version entspricht einem Git-Tag in diesem Repository.

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
- **Erkennungsfehler:** Bei Scans ist der Text eine Texterkennung, kein Originaltext. Kritische Werte (IBAN, Beträge) kurz gegenprüfen.
- **Abhängig von DATEV-Interna.** Ändert DATEV den Aufbau oder die Sicherheitseinstellungen der Belegbildanzeige, kann eine Anpassung nötig sein.

## Fehler melden und Feedback

Bitte über [GitHub Issues](https://github.com/bastiraschi/belegtext/issues) oder per E-Mail an [belegtext@rasch.finance](mailto:belegtext@rasch.finance). **Keine echten Belege, Mandantendaten oder Screenshots davon anhängen.** Für Beispiele eignen sich die Musterbelege in `store/musterbelege/`.

Hilfreich für Fehlermeldungen: Meldungen aus der Entwicklerkonsole (F12) mit dem Präfix `[Belegtext]`. Die Belegansicht läuft in einem eingebetteten Frame – in der Konsole oben links im Kontext-Auswahlfeld `duo-belegbildanzeige.apps.datev.de` wählen.

## Herausgeber

rasch.finance – Alexander Rasch, Eosanderstraße 24, 10587 Berlin, [belegtext@rasch.finance](mailto:belegtext@rasch.finance). Entwicklung: Sebastian Rasch. Anleitung und Fragen: [rasch.finance/belegtext](https://rasch.finance/belegtext/).

## Lizenz

MIT, siehe [LICENSE](LICENSE).

Enthaltene Drittkomponenten in `vendor/`: Tesseract.js, Tesseract.js-core und das deutsche Tesseract-Sprachmodell (jeweils Apache-2.0, Lizenztexte in `vendor/`). Die Styles des Textlayers sind an `pdf_viewer.css` von pdf.js (Apache-2.0) angelehnt.
