/*
 * Belegtext – Regeln für erkannte Wörter und Prüfung kopierter Werte. Ohne DOM, damit
 * test/ dieselben Regeln prüft, die im Browser laufen (npm test, npm run messen).
 */
const BelegtextPruefung = (() => {
  'use strict';

  /* Rauschen (Formularlinien, Kästchen, Flecken) liegt unter dieser Konfidenz. */
  const OCR_MIN_CONFIDENCE = 30;
  /* Längere Zeichenketten bleiben auch unsicher – etwa Belegnummern in farbigen Markierungen
     (Konfidenz 15) oder die USt-IdNr. der Musterrechnung (Konfidenz 0). Ebenso reine Zahlen
     wie Mengen. */
  const OCR_ALWAYS_KEEP = /[\p{L}\p{N}]{4}|^[\d.,]+$/u;
  /* Tabellenlinien liest Tesseract als Folgen gleicher Buchstaben („LLLLLLLa0Gß…“, „EEE“). */
  const OCR_LINE_NOISE = /(\p{L})\1\1/u;
  const OCR_CONTENT = /[\p{L}\p{N}€§%]/u;
  /* Tesseract trennt manche Zeichenketten trotz fehlender Lücke („DE“ + „123456789“).
     Echte Wortabstände liegen bei etwa der halben Zeichenhöhe. Nur zwischen Buchstaben und
     Ziffern – „19 %“ und „61,98 €“ stehen in Seitenbildern ebenso eng. */
  const OCR_JOIN_GAP = 0.25;
  const OCR_JOIN_END = /[\p{L}\p{N}]$/u;
  const OCR_JOIN_START = /^[\p{L}\p{N}]/u;

  function keepOcrWord(word) {
    if (!OCR_CONTENT.test(word.text)) return false;
    if (word.confidence >= OCR_MIN_CONFIDENCE) return true;
    return OCR_ALWAYS_KEEP.test(word.text) && !OCR_LINE_NOISE.test(word.text);
  }

  /** Wörter einer Zeile: aneinanderstoßende zusammenfügen, dann Rauschen verwerfen. */
  function ocrLineWords(words) {
    const joined = [];
    for (const word of words) {
      const previous = joined.at(-1);
      const height = Math.min(word.bbox.y1 - word.bbox.y0, previous ? previous.bbox.y1 - previous.bbox.y0 : Infinity);
      if (previous && word.bbox.x0 - previous.bbox.x1 < height * OCR_JOIN_GAP
        && OCR_JOIN_END.test(previous.text) && OCR_JOIN_START.test(word.text)) {
        joined[joined.length - 1] = {
          text: previous.text + word.text,
          confidence: Math.min(previous.confidence, word.confidence),
          bbox: {
            x0: previous.bbox.x0,
            x1: word.bbox.x1,
            y0: Math.min(previous.bbox.y0, word.bbox.y0),
            y1: Math.max(previous.bbox.y1, word.bbox.y1),
          },
        };
      } else {
        joined.push({ text: word.text, confidence: word.confidence, bbox: word.bbox });
      }
    }
    return joined.filter(keepOcrWord);
  }

  /* ------------------------------------------------------------------ */
  /* Prüfziffern beim Kopieren                                           */
  /* ------------------------------------------------------------------ */

  /* IBAN-Längen der SEPA-Länder. */
  const IBAN_LENGTH = {
    AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24,
    FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21,
    LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24,
    SI: 19, SK: 24, SM: 27, VA: 22,
  };
  /* Länder, deren IBAN nach dem Ländercode nur Ziffern enthält. Dort sind Buchstaben sicher
     Lesefehler der Texterkennung. */
  const IBAN_DIGITS_ONLY = new Set(['AT', 'BE', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'HR', 'HU', 'LT', 'NO', 'PL', 'PT', 'SE', 'SI', 'SK']);
  /* Typische Verwechslungen von Ziffern mit Buchstaben. */
  const DIGIT_FOR = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', i: '1', Z: '2', z: '2', S: '5', s: '5', G: '6', b: '6', B: '8' };
  /* Möglicher IBAN-Anfang: Ländercode, danach zwei (ggf. verlesene) Prüfziffern. */
  const IBAN_START = /(?<![\p{L}\p{N}])([A-Z]{2})(?=[\dOoIlZSB]{2})/gu;
  const VAT_ID = /(?<![\p{L}\p{N}])DE ?([1-9]\d{8})(?![\p{L}\p{N}])/gu;
  /* FIN/VIN (ISO 3779): 17 Zeichen aus Ziffern und Großbuchstaben. I, O und Q kommen nicht vor;
     liest die Texterkennung sie dort, ist es ein Lesefehler für 1 bzw. 0. Erkannt wird eine FIN
     nur am Muster: eine Zeichenkette aus genau 17 Zeichen mit Buchstaben und Ziffern. */
  const VIN_CANDIDATE = /(?<![\p{L}\p{N}])[A-Z0-9]{17}(?![\p{L}\p{N}])/gu;
  const VIN_FIX = { I: '1', O: '0', Q: '0' };
  const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const VIN_LETTER_VALUE = 'A1B2C3D4E5F6G7H8J1K2L3M4N5P7R9S2T3U4V5W6X7Y8Z9';
  /* In Nordamerika (Herstellercode beginnt mit 1–5) ist die Prüfziffer an Stelle 9 Pflicht,
     in Europa nicht – dort ist eine abweichende Prüfziffer kein Fehler. */
  const VIN_CHECK_DIGIT_REQUIRED = /^[1-5]/;

  function ibanValid(iban) {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let rest = 0;
    for (const char of rearranged) {
      const value = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
      for (const digit of value) rest = (rest * 10 + Number(digit)) % 97;
    }
    return rest === 1;
  }

  /** Deutsche USt-IdNr.: Prüfziffer nach ISO 7064, MOD 11,10. */
  function vatIdValid(digits) {
    let product = 10;
    for (const digit of digits.slice(0, 8)) {
      let sum = (Number(digit) + product) % 10;
      if (sum === 0) sum = 10;
      product = (2 * sum) % 11;
    }
    const check = (11 - product) % 10;
    return check === Number(digits[8]);
  }

  /** Prüfziffer an Stelle 9 (gewichtete Summe modulo 11, 10 wird zu X). */
  function vinCheckDigitValid(vin) {
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = /\d/.test(char) ? Number(char) : Number(VIN_LETTER_VALUE[VIN_LETTER_VALUE.indexOf(char) + 1]);
      sum += value * VIN_WEIGHTS[i];
    }
    const check = sum % 11;
    return vin[8] === (check === 10 ? 'X' : String(check));
  }

  /**
   * Eine FIN hat Buchstaben (Herstellercode) und Ziffern (Seriennummer). Schon vor der
   * Korrektur müssen echte Ziffern drinstehen, sonst würde aus langen Wörtern in Großbuchstaben
   * eine „FIN“.
   */
  function looksLikeVin(token, vin) {
    const digits = (text) => text.match(/\d/g)?.length ?? 0;
    return (vin.match(/[A-Z]/g)?.length ?? 0) >= 2 && digits(vin) >= 5 && digits(token) >= 3;
  }

  /**
   * Liest ab dem Ländercode so viele Zeichen (ohne einzelne Leerzeichen), wie das Land
   * vorschreibt. Eine IBAN besteht überwiegend aus Ziffern; sonst ist es Fließtext.
   */
  function takeIban(text, start, country) {
    const length = IBAN_LENGTH[country];
    if (!length) return null;
    let compact = '';
    let end = start;
    while (compact.length < length && end < text.length) {
      const char = text[end];
      if (/[\p{L}\p{N}]/u.test(char)) compact += char;
      else if (char !== ' ' || text[end + 1] === ' ') break;
      end++;
    }
    if (compact.length < length || /[\p{L}\p{N}]/u.test(text[end] ?? '')) return null;
    if (!/\d/.test(compact.slice(2, 4)) || compact.replace(/\D/g, '').length < length / 2) return null;
    return { compact, end };
  }

  /**
   * Prüft IBAN, deutsche USt-IdNr. und FIN im kopierten Text. Woran ein Wert erkannt wird,
   * steht an den Mustern oben – es zählt nur die Form der Zeichenkette, nicht ihre Beschriftung.
   * Liest die Texterkennung in einer reinen Ziffern-IBAN einen Buchstaben (O statt 0) und
   * stimmt die Prüfziffer erst nach dem Ersetzen, wird die korrigierte Fassung kopiert. In einer
   * FIN werden I, O und Q immer ersetzt, weil sie dort nicht vorkommen dürfen.
   * Ergebnis: { text, notes: [{ ok, message }] }
   */
  function checkValues(text) {
    const notes = [];
    let result = '';
    let last = 0;
    for (const match of text.matchAll(IBAN_START)) {
      if (match.index < last) continue;
      const taken = takeIban(text, match.index, match[1]);
      if (!taken) continue;
      const original = text.slice(match.index, taken.end);
      let replacement = original;
      if (ibanValid(taken.compact)) {
        notes.push({ ok: true, message: 'IBAN geprüft' });
      } else {
        const fixed = IBAN_DIGITS_ONLY.has(match[1])
          ? original.slice(0, 2) + original.slice(2).replace(/[^\d ]/g, (c) => DIGIT_FOR[c] ?? c)
          : original;
        if (fixed !== original && /^[A-Z]{2}[\d ]+$/.test(fixed) && ibanValid(fixed.replace(/ /g, ''))) {
          replacement = fixed;
          notes.push({ ok: false, message: 'IBAN korrigiert (Lesefehler), bitte prüfen' });
        } else {
          notes.push({ ok: false, message: 'IBAN-Prüfziffer falsch, bitte prüfen' });
        }
      }
      result += text.slice(last, match.index) + replacement;
      last = taken.end;
    }
    result += text.slice(last);

    for (const match of result.matchAll(VAT_ID)) {
      notes.push(vatIdValid(match[1])
        ? { ok: true, message: 'USt-IdNr. geprüft' }
        : { ok: false, message: 'USt-IdNr.-Prüfziffer falsch, bitte prüfen' });
    }

    result = result.replace(VIN_CANDIDATE, (token) => {
      const vin = token.replace(/[IOQ]/g, (c) => VIN_FIX[c]);
      if (!looksLikeVin(token, vin)) return token;
      if (vin !== token) notes.push({ ok: false, message: 'FIN korrigiert (Lesefehler), bitte prüfen' });
      if (vinCheckDigitValid(vin)) notes.push({ ok: true, message: 'FIN geprüft' });
      else if (VIN_CHECK_DIGIT_REQUIRED.test(vin)) notes.push({ ok: false, message: 'FIN-Prüfziffer falsch, bitte prüfen' });
      else notes.push({ ok: true, message: 'FIN-Format stimmt' });
      return vin;
    });
    return { text: result, notes };
  }

  return { ocrLineWords, checkValues };
})();
