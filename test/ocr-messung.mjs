/*
 * Misst die Texterkennung von Belegtext an den Musterbelegen.
 *
 * Bildet beide Wege der Erweiterung nach (gescannte PDF-Seite in 300 dpi, Seitenbild in
 * 96 dpi dreifach hochskaliert) und zusätzlich verschlechterte Scans. Verwendet dieselbe
 * Tesseract-Version, dasselbe Sprachmodell aus vendor/ und dieselben Filterregeln aus
 * src/pruefung.js. Ausgabe: erkannte Felder und Wortqualität je Variante.
 *
 * Nur Musterbelege – nie echte Belege (CLAUDE.md, Invariante 4).
 *
 *   npm install && npm run messen            Übersicht
 *   npm run messen -- --details              zusätzlich fehlende Felder, Fehlwörter und verworfene Wörter
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const details = process.argv.includes('--details');

const context = vm.createContext({});
vm.runInContext(`${readFileSync(`${root}src/pruefung.js`, 'utf8')}\nthis.BelegtextPruefung = BelegtextPruefung;`, context);
const { ocrLineWords } = context.BelegtextPruefung;

/* Gleiche Konstanten wie src/belegtext.js */
const OCR_DPI = 300;
const IMAGE_OCR_UPSCALE = 3;
const OCR_MAX_SIDE = 4200;
const SERVER_IMAGE_DPI = 96;

const korpus = JSON.parse(readFileSync(`${root}test/korpus/musterrechnung.json`, 'utf8'));
const musterbeleg = (name) => `${root}store/musterbelege/${name}`;

async function openPdf(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  return doc.getPage(1);
}

async function renderPage(page, dpi) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(dpi / 72, OCR_MAX_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas;
}

/** Wie recognizeImage(): Seitenbild mit weißem Hintergrund hochskalieren. */
function upscale(image) {
  const scale = Math.min(IMAGE_OCR_UPSCALE, OCR_MAX_SIDE / Math.max(image.width, image.height));
  const canvas = createCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** JPEG-Kompression wie bei Scannern und Seitenbildern. */
async function jpeg(canvas, quality) {
  const image = await loadImage(await canvas.encode('jpeg', quality));
  const result = createCanvas(image.width, image.height);
  result.getContext('2d').drawImage(image, 0, 0);
  return result;
}

/** Seitenbild wie vom Server: niedrige Auflösung, JPEG. */
async function serverImage(page) {
  return jpeg(await renderPage(page, SERVER_IMAGE_DPI), 85);
}

function skew(source, degrees) {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

/** Schlechter Scan: Grauschleier, Körnung mit festem Startwert, starke JPEG-Kompression. */
async function degrade(source) {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let seed = 42;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 40 + img.data[i] * 0.75 + (random() - 0.5) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
  }
  ctx.putImageData(img, 0, 0);
  return jpeg(canvas, 30);
}

async function variants() {
  const scan = await openPdf(musterbeleg('Musterrechnung_scan.pdf'));
  const digital = await openPdf(musterbeleg('Musterrechnung_digital.pdf'));
  const scan300 = await renderPage(scan, OCR_DPI);
  return [
    ['Scan-PDF, 300 dpi', scan300],
    ['Scan-PDF, 1° schief', skew(scan300, 1)],
    ['Scan-PDF, schlechter Scan', await degrade(scan300)],
    ['Seitenbild eines Scans', upscale(await serverImage(scan))],
    ['Seitenbild eines digitalen PDFs', upscale(await serverImage(digital))],
  ];
}

async function referenceWords() {
  const page = await openPdf(`${root}${korpus.referenz}`);
  const { items } = await page.getTextContent();
  return items.flatMap((item) => item.str.split(/\s+/)).filter(Boolean);
}

/** Wie ocr() in src/belegtext.js: Zeilen aus behaltenen Wörtern. */
async function recognize(worker, canvas) {
  const { data } = await worker.recognize(await canvas.encode('png'), {}, { blocks: true });
  const lines = [];
  const dropped = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const kept = ocrLineWords(line.words);
        for (const word of line.words) {
          if (!kept.some((k) => k.bbox.x0 <= word.bbox.x0 && word.bbox.x1 <= k.bbox.x1)) dropped.push(`„${word.text}“ (${Math.round(word.confidence)})`);
        }
        if (kept.length) lines.push(kept.map((word) => word.text));
      }
    }
  }
  return { lines, dropped };
}

function evaluate(lines, reference) {
  const text = lines.map((words) => words.join(' ')).join('\n');
  const missing = Object.entries(korpus.felder).filter(([, value]) => !text.includes(value)).map(([name]) => name);

  const available = new Map();
  for (const word of reference) available.set(word, (available.get(word) ?? 0) + 1);
  const words = lines.flat();
  const wrong = [];
  for (const word of words) {
    const left = available.get(word) ?? 0;
    if (left > 0) available.set(word, left - 1);
    else wrong.push(word);
  }
  return {
    fields: Object.keys(korpus.felder).length - missing.length,
    missing,
    correct: words.length - wrong.length,
    wrong,
  };
}

const worker = await Tesseract.createWorker('deu', 1 /* LSTM */, {
  langPath: `${root}vendor/lang`,
  cacheMethod: 'none',
  gzip: true,
});
const reference = await referenceWords();
const fieldCount = Object.keys(korpus.felder).length;
const totals = { fields: 0, correct: 0, wrong: 0 };

console.log(`Referenz: ${reference.length} Wörter, ${fieldCount} Felder\n`);
console.log('Variante'.padEnd(34), 'Felder'.padStart(7), 'richtige Wörter'.padStart(16), 'Fehlwörter'.padStart(11));
for (const [name, canvas] of await variants()) {
  const { lines, dropped } = await recognize(worker, canvas);
  const result = evaluate(lines, reference);
  totals.fields += result.fields;
  totals.correct += result.correct;
  totals.wrong += result.wrong.length;
  console.log(name.padEnd(34), `${result.fields}/${fieldCount}`.padStart(7), `${result.correct}/${reference.length}`.padStart(16), String(result.wrong.length).padStart(11));
  if (details) {
    if (result.missing.length) console.log('  fehlt:', result.missing.join(', '));
    if (result.wrong.length) console.log('  falsch:', result.wrong.map((w) => `„${w}“`).join(' '));
    if (dropped.length) console.log('  verworfen (Konfidenz):', dropped.join(' '));
  }
}
console.log('Summe'.padEnd(34), `${totals.fields}`.padStart(7), `${totals.correct}`.padStart(16), String(totals.wrong).padStart(11));
await worker.terminate();
