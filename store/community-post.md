# Entwurf: DATEV-Community

Zwei Orte:

1. **Antwort im bestehenden Ideen-Thread** „Belegdaten zusätzlich manuell per OCR auslesen“ (Ideen zu Unternehmen online). Dort sitzen die Leute mit dem Problem. Kurzfassung, Link zum eigenen Beitrag.
2. **Eigener Beitrag** im Bereich „Unternehmen online“, damit er gefunden wird.

Vor dem Posten: Store-Links eintragen, GIF anhängen (nur Musterbeleg).

---

## 1. Antwort im Ideen-Thread

> Bis DATEV das nativ umsetzt, habe ich mir eine kleine Browser-Erweiterung gebaut, die genau das macht: Text in der Belegansicht von Unternehmen online markieren und kopieren, per Doppelklick oder durch Ziehen, auch bei gescannten Belegen. Kostenlos, Open Source, ohne Berechtigungen, alles läuft lokal im Browser. Details und Link hier: [Link zum eigenen Beitrag]
>
> Die eigentliche Bitte an DATEV bleibt: In „Digitale Belege Steuern“ gibt es die manuelle Übernahme von OCR-Werten aus dem Belegbild seit 2023. Bitte dieselbe Funktion auch in Unternehmen online.

---

## 2. Eigener Beitrag

**Titel:** Text aus Belegen in Unternehmen online markieren und kopieren – kostenlose Browser-Erweiterung (Open Source)

> Hallo zusammen,
>
> wer in Unternehmen online Belege vorerfasst, kennt das: Rechnungsnummer, IBAN oder Kundennummer stehen im Beleg, lassen sich aber nicht markieren. Also abtippen oder per Screenshot-OCR übertragen. Die Idee, das nativ einzubauen, liegt hier seit Jahren mit vielen Unterstützern.
>
> Ich habe mir dafür eine Browser-Erweiterung gebaut und stelle sie kostenlos zur Verfügung. Kurz zum Hintergrund: Mit meinem Bruder betreibe ich rasch.finance, wir automatisieren Buchhaltungsprozesse – Belegtext ist bei dieser Arbeit entstanden.
>
> **Belegtext** – Chrome: [Link] · Edge: [Link] · Anleitung: https://rasch.finance/belegtext/ · Quellcode: https://github.com/bastiraschi/belegtext
>
> **Was sie macht**
> - Doppelklick auf einen Wert im Beleg kopiert ihn sofort – die ganze Rechnungsnummer, auch mit Bindestrich, oder den Betrag.
> - Ziehen markiert beliebige Stellen, auch mehrzeilig, und kopiert beim Loslassen. Strg+C geht auch.
> - Digitale PDFs: Die im PDF ohnehin vorhandene Textebene wird über den Beleg gelegt – exakt, ohne Erkennungsfehler.
> - Scans und Belegbilder: Der Text wird lokal per Texterkennung erkannt.
>
> **Datenschutz** – mir war klar, dass das die erste Frage ist:
> - Die Erweiterung fordert keine einzige Browser-Berechtigung an und läuft nur in der Belegansicht von Unternehmen online.
> - Sie baut keine Netzwerkverbindungen auf. Die Texterkennung samt Sprachmodell ist enthalten, Belegdaten verlassen den Rechner nicht.
> - Keine Speicherung, keine Telemetrie. Der Code ist offen und überschaubar; jede Store-Version entspricht einem Stand auf GitHub.
>
> **Grenzen**
> - Bei Scans ist der Text eine Texterkennung. IBAN und Beträge bitte kurz gegenprüfen.
> - Sehr kleine Schrift auf schlecht aufgelösten Belegbildern wird nicht immer richtig erkannt; Handschrift kaum.
> - Die Erweiterung ist inoffiziell und hängt am aktuellen Aufbau der Belegansicht. Ändert DATEV dort etwas, kann es kurz dauern, bis ich nachziehe.
>
> Fehler und Wünsche gern über GitHub-Issues, an belegtext@rasch.finance (bitte ohne echte Belege oder Mandantendaten) oder hier im Thread.
>
> Und an DATEV: Das sollte eigentlich eine Grundfunktion sein. In Digitale Belege Steuern gibt es die Übernahme von OCR-Werten aus dem Belegbild bereits – bitte auch in Unternehmen online.
>
> Viele Grüße
> Sebastian Rasch · rasch.finance
