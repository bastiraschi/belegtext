# Belegtext – Projektkontext für Claude Code

Chrome-/Edge-Erweiterung (Manifest V3), die Text in der Belegansicht von DATEV Unternehmen online (DUo) markier- und kopierbar macht. Herausgeber: rasch.finance. Projektseite: https://rasch.finance/belegtext/ (Quelle im Website-Repo `MrNic3Guy030/Website` unter `belegtext/`). Veröffentlichungsplan, Händlerangaben und Entwürfe für Community-/LinkedIn-Beiträge liegen privat im Website-Repo unter `docs/`.

Arbeitssprache Deutsch (Code-Kommentare, UI-Texte, Doku). Keine Emojis. Deutsche Anführungszeichen „…“ in Texten.

## Arbeitsweise

- Keine Rückwärtskompatibilität: Bei Interface-Änderungen alle Aufrufstellen im selben Change anpassen, keine Adapter.
- „Rewrite, don't staple“: Bei geänderten Anforderungen so umschreiben, als wäre die neue Version von Anfang an der Plan gewesen.
- Keine Fallbacks oder Defaults, außer für Fehler, die tatsächlich erwartet werden und sinnvoll behandelt werden.
- Als Berater auftreten: eigene Einschätzung, klare Empfehlung, Annahmen hinterfragen.

## Unverhandelbare Invarianten

1. **Keine Browser-Berechtigungen** im Manifest. Hostzugriff nur über `content_scripts.matches` auf `https://duo-belegbildanzeige.apps.datev.de/*` (Chrome zeigt dafür bei der Installation einen Zugriffshinweis; in Texten deshalb „Zugriff nur auf die Belegansicht, keine weiteren Berechtigungen“, nie „keine Berechtigungen“). `chrome.tabs.create` und `chrome.runtime.setUninstallURL` im Service Worker brauchen keine.
2. **Keine Datenübertragung.** Kein fetch/XHR aus der Erweiterung zu Dritten, keine Telemetrie, kein nachgeladener Code (MV3-Regel). OCR-Engine und Sprachmodell liegen gebündelt in `vendor/`. Einzige Verbindung nach außen: `src/background.js` öffnet einmalig nach der Installation `rasch.finance/belegtext/start/?v=<version>` und setzt `rasch.finance/belegtext/feedback/?v=<version>` als Deinstallationsseite – nur die Versionsnummer, nie Daten aus DATEV.
3. **Keine Werbung oder Markenhinweise in der DATEV-Oberfläche.** Der Verweis auf rasch.finance läuft ausschließlich über Store-Eintrag, Projektseite (`rasch.finance/belegtext/`), Willkommensseite nach Installation, README.
4. **Nie echte Belege** in Repo, Issues, Screenshots oder Tests. Nur `store/musterbelege/`. Das Repo ist öffentlich: auch keine Mandanten- oder Beraternummern, Zugangsdaten, DATEV-internen Schnittstellendetails und keine personenbezogenen Daten (Namen, Anschriften, Telefonnummern) – für Anbieterangaben auf das Impressum von rasch.finance verweisen.
5. **In DUo nichts speichern, bereitstellen oder übergeben.** Kein Klick auf „Speichern und weiter“. Den Login macht ausschließlich ein Mensch.

## Architektur

`src/belegtext.js` läuft in der MAIN-World des Viewer-Frames ab `document_start`, `src/bridge.js` in der isolierten Welt (übergibt per `data-belegtext-vendor` den Pfad zu `vendor/`, weil `chrome.runtime` in MAIN nicht existiert). `src/background.js` (Service Worker) öffnet nur Anleitung und Feedbackseite, siehe Invariante 2. Die Seiten liegen im Website-Repo `MrNic3Guy030/Website` unter `belegtext/`.

Zwei Hooks, beide liefern eine **exakte** Zuordnung „was liegt in welchem Canvas“:

- **pdf.js-Pfad:** `PDFPageProxy.prototype.render` wird gepatcht. pdf.js exportiert die Klasse nicht; der Prototyp kommt über ein minimal erzeugtes PDF. Die Zuweisung von `window.pdfjsLib` wird per Setter abgefangen, damit der Hook vor dem ersten Rendern sitzt (Viewer rendert frühestens nach ca. 500 ms).
- **Seitenbild-Pfad:** `CanvasRenderingContext2D.prototype.drawImage` wird gepatcht. Gezeichnete `<img>`-Elemente (Blob-URL) sind direkt die OCR-Quelle.

Layer-Aufbau pro Seite in `.canvas-with-overlays`:
- Seite mit Textebene → pdf.js `TextLayer`.
- Gescannte PDF-Seite → in 300 dpi rendern → Tesseract.
- Seitenbild → 3-fach hochskalieren → Tesseract.

Markieren: eigene Zieh-Logik (`caretNear` + zeichengenaue Messung `offsetAt` per Range-Rects). Doppelklick ebenfalls eigen (`selectToken`): markiert die Zeichenkette bis zum nächsten Leerzeichen, auch über Textstücke hinweg, in die das PDF sie zerlegt hat (Chrome trennt nativ an Bindestrich und Punkt: „IN-85951534“ ergäbe „IN“); umschließende Klammern, Anführungszeichen und Satzzeichen am Ende fallen weg. Dreifachklick bleibt nativ. Ziehen und Doppelklick kopieren sofort; Strg+C zusätzlich. Der Layer holt sich beim Mausklick den Fokus.

DATEVs eigene Erkennungskästen (grün/orange, `.ocr-wrapper:not(.ocr-no-text)`) liegen per CSS über dem Layer (z-index 6, Status-Hinweis 7) und bleiben bedienbar; Doppelklick auf einen Kasten kopiert DATEVs erkannten Wert.

## Erkenntnisse über DUo (Stand 08.11.2026)

- **Frame-Kette:** `duo-apphost.apps.datev.de` → `duo-belegebank.apps.datev.de` (AngularJS, Erfassungsformular) → `duo-belegbildanzeige.apps.datev.de` (Viewer, Angular, pdf.js 5.4.54 als `window.pdfjsLib`). Alle cross-origin zueinander.
- **Viewer-DOM:** `abba-document-wrapper` > … > `abba-file-wrapper` > `.canvas-wrapper` > `.canvas-with-overlays` (position: relative) > `canvas`. Nicht sichtbare Seiten haben Canvas-Puffer 0×0 (Lazy Rendering).
- Strg+C ging anfangs an den Belegebank-Frame, weil `preventDefault` auf `mousedown` den Fokuswechsel verhindert – daher `layer.focus()`.
- Weitere Notizen (Schnittstellen, Testaufbau) liegen privat im Website-Repo unter `docs/belegtext-duo-notes.md`. Nichts davon ins öffentliche Repo, in Issues oder Commit-Texte übernehmen.

## Verworfene Ansätze (nicht erneut versuchen)

- **Pixelvergleich** zur Zuordnung Canvas ↔ PDF-Seite: unterscheidet keine Belege mit gleichem Layout und anderen Ziffern (gemessen) – Gefahr, Text des falschen Belegs zu kopieren.
- **PerformanceObserver / „zuletzt geladenes Dokument“** als Zuordnung: unsicher bei Vorabladen und Zurückblättern.
- **pdf.js-`endOfContent`-Selection-Logik** portiert: kollidiert mit nativer Markierung, Sprünge. Ersetzt durch eigene Zieh-Logik.
- **`caretPositionFromPoint`** für die Zeichenposition: trifft an Wortkanten den Layer statt des Spans.
- **OCR ohne Hochskalieren** bei Seitenbildern: falsche IBAN-Ziffern mit Konfidenz 77.

## OCR-Parameter (begründet, nicht ohne Messung ändern)

- `OCR_MIN_CONFIDENCE = 30`: Rauschen (Linien, Kästchen) lag bei 0–15, echte Felder meist > 60.
- `OCR_ALWAYS_KEEP = 4 Buchstaben/Ziffern`: Belegnummer in DATEVs grüner Markierung hatte Konfidenz 15.
- Tesseract.js 7.0.0, Core 7.0.0 (nur LSTM-Varianten), Sprachmodell `deu` 4.0.0_best_int. Prüfsummen im README.

## Testen

- Mit `claude --chrome` in einer eingeloggten Sitzung. Den Login macht immer ein Mensch, nie Claude.
- Nach Änderungen an der installierten Erweiterung: `chrome://extensions` → Belegtext → Neu laden, DUo-Tab neu laden.
- Testaufbau ohne Neuinstallation: siehe private Notizen.

## Release

`store/listing.md` ist die einzige Quelle für alle Texte in den Store-Dashboards (Beschreibung, Datenschutzpraktiken, Testanweisungen, Händlerangaben), `store/screenshots.md` für die Screenshot-Motive. Wer Verhalten, Berechtigungen, Netzwerkzugriffe oder Bedienung ändert, passt im selben Change `store/listing.md`, bei sichtbaren Änderungen `store/screenshots.md`, README, PRIVACY.md und die Landingpage (`belegtext/index.html` im Website-Repo, inkl. FAQ) an und überträgt die Änderungen beim nächsten Upload in beide Dashboards.

1. Version in `manifest.json` erhöhen, `CHANGELOG.md` ergänzen.
2. `./scripts/build.sh` → `dist/belegtext-<version>-store.zip`.
3. Git-Tag `v<version>`, GitHub-Release mit dem ZIP.
4. Store-Uploads (Erstveröffentlichung manuell in den Dashboards; Updates können später per Store-API automatisiert werden). Dabei abgleichen: Beschreibung, Datenschutz-Reiter und Testanweisungen mit `store/listing.md`, Screenshots mit `store/screenshots.md` – stimmt alles noch zur neuen Version?
