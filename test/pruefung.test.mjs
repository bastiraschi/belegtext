/* Regeln aus src/pruefung.js: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(`${readFileSync(new URL('../src/pruefung.js', import.meta.url), 'utf8')}\nthis.BelegtextPruefung = BelegtextPruefung;`, context);
const { ocrLineWords, checkValues } = context.BelegtextPruefung;

const word = (text, confidence, x0, x1, y0 = 0, y1 = 26) => ({ text, confidence, bbox: { x0, x1, y0, y1 } });
/* Ergebnisse kommen aus einem eigenen vm-Kontext, daher als einfache Arrays vergleichen. */
const texts = (words) => [...ocrLineWords(words).map((w) => w.text)];
const messages = (text) => [...checkValues(text).notes.map((note) => note.message)];

test('aneinanderstoßende Wörter werden eins', () => {
  assert.deepEqual(texts([word('USt-IdNr.', 73, 1002, 1136), word('DE', 0, 1160, 1193), word('123456789', 0, 1197, 1359)]), ['USt-IdNr.', 'DE123456789']);
});

test('normale Wortabstände bleiben, ebenso „19 %“ und „61,98 €“', () => {
  assert.deepEqual(texts([word('12345', 93, 318, 405), word('Musterstadt', 92, 419, 590)]), ['12345', 'Musterstadt']);
  assert.deepEqual(texts([word('19', 91, 0, 30), word('%', 90, 33, 50)]), ['19', '%']);
  assert.deepEqual(texts([word('61,98', 91, 0, 90), word('€', 96, 93, 110)]), ['61,98', '€']);
});

test('Tabellenlinien fliegen raus, unsichere Belegnummern und Mengen bleiben', () => {
  assert.deepEqual(texts([word('LLLLLLLa0GßgUu_LLLAL', 0, 0, 2000)]), []);
  assert.deepEqual(texts([word('EEE', 8, 0, 60)]), []);
  assert.deepEqual(texts([word('RE-2026-04711', 15, 0, 200)]), ['RE-2026-04711']);
  assert.deepEqual(texts([word('5', 23, 0, 18)]), ['5']);
  assert.deepEqual(texts([word('|', 23, 0, 4), word('—', 89, 100, 200), word('A', 0, 300, 320)]), []);
});

test('gültige IBAN', () => {
  assert.deepEqual(messages('IBAN DE89 3704 0044 0532 0130 00'), ['IBAN geprüft']);
  assert.deepEqual(messages('DE89370400440532013000'), ['IBAN geprüft']);
  assert.deepEqual(messages('NL91 ABNA 0417 1643 00'), ['IBAN geprüft']);
  assert.deepEqual(messages('DE89 3704 0044 0532 0130 00 BIC COBADEFFXXX'), ['IBAN geprüft']);
});

test('Lesefehler in einer Ziffern-IBAN wird korrigiert', () => {
  const { text, notes } = checkValues('DE89 37O4 0044 O532 0130 00');
  assert.equal(text, 'DE89 3704 0044 0532 0130 00');
  assert.equal(notes[0].ok, false);
});

test('falsche Prüfziffer wird gemeldet, Text bleibt', () => {
  const { text, notes } = checkValues('DE89 3704 0044 0532 0130 01');
  assert.equal(text, 'DE89 3704 0044 0532 0130 01');
  assert.deepEqual([...notes.map((n) => n.message)], ['IBAN-Prüfziffer falsch, bitte prüfen']);
});

test('kein Hinweis bei Teilstücken und Fließtext', () => {
  assert.deepEqual(messages('DE89'), []);
  assert.deepEqual(messages('DE89 3704 0044 0532 0130 0012'), []);
  assert.deepEqual(messages('Rechnung RE-2026-04711 BIC COBADEFFXXX'), []);
  assert.deepEqual(messages('DE Musterbank AG Industriestraße 12 und noch mehr Text'), []);
});

test('USt-IdNr.', () => {
  assert.deepEqual(messages('USt-IdNr. DE 136695976'), ['USt-IdNr. geprüft']);
  assert.deepEqual(messages('DE123456789'), ['USt-IdNr.-Prüfziffer falsch, bitte prüfen']);
});

test('FIN mit gültiger Prüfziffer', () => {
  assert.deepEqual(messages('FIN 1M8GDM9AXKP042788'), ['FIN geprüft']);
});

test('europäische FIN ohne Prüfziffer gilt nicht als falsch', () => {
  assert.deepEqual(messages('WVWZZZ1JZXW000001'), ['FIN-Format stimmt']);
});

test('nordamerikanische FIN mit falscher Prüfziffer wird gemeldet', () => {
  assert.deepEqual(messages('1M8GDM9A1KP042788'), ['FIN-Prüfziffer falsch, bitte prüfen']);
});

test('O, Q und I in einer FIN werden korrigiert', () => {
  const { text, notes } = checkValues('WVWZZZ1JZXW0OO0O1');
  assert.equal(text, 'WVWZZZ1JZXW000001');
  assert.deepEqual([...notes.map((n) => n.message)], ['FIN korrigiert (Lesefehler), bitte prüfen', 'FIN-Format stimmt']);
  assert.equal(checkValues('1M8GDM9AXKPO42788').text, '1M8GDM9AXKP042788');
});

test('kein FIN-Hinweis bei anderen Zeichenketten', () => {
  assert.deepEqual(messages('12345678901234567'), []);
  assert.deepEqual(messages('RECHNUNGSNUMMERAB'), []);
  assert.deepEqual(messages('ORGANISATIONSPLAN'), []);
  assert.deepEqual(messages('WVWZZZ1JZXW0000012'), []);
  assert.deepEqual(messages('Rechnung RE-2026-04711'), []);
});
