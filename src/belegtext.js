/*
 * Belegtext – macht Text in der Belegansicht von DATEV Unternehmen online markier- und kopierbar.
 *
 * Funktionsweise: Die Belegbildanzeige zeichnet Belege auf ein <canvas> – entweder das
 * Original-PDF mit pdf.js oder ein vom Server gerendertes Seitenbild per drawImage. Eine
 * Textebene blendet sie nicht ein. Belegtext hängt sich in beide Zeichenwege ein, weiß dadurch
 * exakt, was in welchem Canvas liegt, und legt einen unsichtbaren Textlayer darüber:
 *   - digitale PDFs: die im PDF enthaltene Textebene (pdf.js TextLayer)
 *   - gescannte PDFs und Seitenbilder: lokale Texterkennung mit Tesseract (WebAssembly)
 *
 * Keine Netzwerkzugriffe außerhalb der Erweiterung, keine Telemetrie.
 * Inoffiziell, keine Verbindung zur DATEV eG.
 *
 * Lizenz: MIT
 */
(() => {
  'use strict';

  const HOST_SELECTOR = '.canvas-with-overlays';
  const LAYER_CLASS = 'belegtext-layer';
  const STATUS_CLASS = 'belegtext-status';
  const LIB_TIMEOUT_MS = 30000;
  const OCR_DPI = 300;
  /* Seitenbilder liefert DATEV mit ~96 dpi. Ohne Hochskalieren liest Tesseract dort
     nachweislich falsche IBAN-Ziffern. */
  const IMAGE_OCR_UPSCALE = 3;
  const OCR_MAX_SIDE = 4200;
  /* Rauschen (Formularlinien, Kästchen, Flecken) liegt unter dieser Konfidenz und ist kurz.
     Längere Zeichenketten bleiben immer – etwa Belegnummern in farbigen Markierungen. */
  const OCR_MIN_CONFIDENCE = 30;
  const OCR_ALWAYS_KEEP = /[\p{L}\p{N}]{4}/u;
  const OCR_CONTENT = /[\p{L}\p{N}€§%]/u;
  const IMAGE_CACHE_SIZE = 50;

  const warn = (...args) => console.warn('[Belegtext]', ...args);

  /** Canvas -> zuletzt gestarteter Renderauftrag des Viewers */
  const renders = new WeakMap();
  /** PDFPageProxy -> Promise<TextContent> */
  const textContents = new WeakMap();
  /** PDFPageProxy -> Map<rotation, Promise<OcrLine[]>> */
  const pdfOcrResults = new WeakMap();
  /** Bild-URL -> Promise<OcrLine[]> (begrenzt, älteste fliegen raus) */
  const imageOcrResults = new Map();

  let pdfjs;

  /* ------------------------------------------------------------------ */
  /* 1. pdf.js der Belegbildanzeige abfangen                             */
  /* ------------------------------------------------------------------ */

  if (window.pdfjsLib) {
    onPdfjs(window.pdfjsLib);
  } else {
    // pdf.js setzt beim Laden globalThis.pdfjsLib. Wir fangen die Zuweisung ab,
    // um den Hook zu installieren, bevor der Viewer die erste Seite rendert.
    let pending;
    Object.defineProperty(window, 'pdfjsLib', {
      configurable: true,
      enumerable: true,
      get: () => pending,
      set(lib) {
        pending = lib;
        Object.defineProperty(window, 'pdfjsLib', { configurable: true, enumerable: true, writable: true, value: lib });
        onPdfjs(lib);
      },
    });
  }

  function onPdfjs(lib) {
    pdfjs = lib;
    const started = Date.now();
    (function waitForWorker() {
      const { workerSrc, workerPort } = lib.GlobalWorkerOptions;
      if (workerSrc || workerPort) {
        installRenderHook(lib).catch((err) => warn('Hook konnte nicht installiert werden', err));
        return;
      }
      if (Date.now() - started > LIB_TIMEOUT_MS) {
        warn('pdf.js-Worker der Belegbildanzeige wurde nicht konfiguriert');
        return;
      }
      setTimeout(waitForWorker, 25);
    })();
  }

  /**
   * PDFPageProxy wird von pdf.js nicht exportiert. Wir laden ein minimales PDF,
   * um an das Prototyp-Objekt zu kommen, und patchen dort render().
   */
  async function installRenderHook(lib) {
    const loadingTask = lib.getDocument({ data: minimalPdf() });
    const doc = await loadingTask.promise;
    const proto = Object.getPrototypeOf(await doc.getPage(1));
    if (!lib.GlobalWorkerOptions.workerPort) await loadingTask.destroy();

    const originalRender = proto.render;
    proto.render = function belegtextRender(params) {
      const task = originalRender.apply(this, arguments);
      const canvas = params.canvas ?? params.canvasContext?.canvas;
      if (canvas instanceof HTMLCanvasElement) onRenderStart(canvas, this, params.viewport, task);
      return task;
    };

    reportMissedPages();
  }

  /*
   * Belege, deren Original nicht ausgeliefert wird, zeichnet der Viewer als Seitenbild:
   * <img> mit Blob-URL, per drawImage ins Canvas. Der Prototyp existiert ab Dokumentstart,
   * hier gibt es also keine Zeitkonkurrenz.
   */
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function belegtextDrawImage(source) {
    const result = originalDrawImage.apply(this, arguments);
    if (source instanceof HTMLImageElement) onImageDrawn(this, source);
    return result;
  };

  function minimalPdf() {
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((body, i) => {
      const offset = pdf.length;
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
      return offset;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  /** Seiten, die der Viewer vor der Hook-Installation gezeichnet hat, bekommen erst beim nächsten Rendern (Zoom, Blättern) einen Textlayer. */
  function reportMissedPages() {
    const missed = [...document.querySelectorAll(`${HOST_SELECTOR} > canvas`)].filter((c) => c.width > 0 && !renders.has(c));
    if (missed.length) warn(`${missed.length} Seite(n) vor der Initialisierung gerendert – Text erscheint nach Zoom oder Blättern.`);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Textlayer pro gerenderter Seite                                  */
  /* ------------------------------------------------------------------ */

  function onRenderStart(canvas, page, viewport, task) {
    const host = canvas.closest(HOST_SELECTOR);
    if (!host) return; // eigene OCR-Renderings, Miniaturansichten

    // Alter Layer passt ab jetzt nicht mehr zum Canvas-Inhalt.
    clearHost(host);
    const job = { kind: 'pdf', page, rotation: viewport.rotation, rendering: true };
    renders.set(canvas, job);
    watchCanvas(canvas);

    task.promise.then(
      () => {
        job.rendering = false;
        if (renders.get(canvas) === job) buildLayer(host, canvas, job).catch((err) => warn('Textlayer fehlgeschlagen', err));
      },
      (err) => {
        job.rendering = false;
        if (!(err instanceof pdfjs.RenderingCancelledException)) warn('Rendern fehlgeschlagen', err);
      },
    );
  }

  function onImageDrawn(context, image) {
    const canvas = context.canvas;
    const host = canvas.closest(HOST_SELECTOR);
    if (!host) return;
    if (renders.get(canvas)?.rendering) return; // Bild innerhalb einer PDF-Seite, die pdf.js gerade zeichnet

    const { a, b } = context.getTransform();
    clearHost(host);
    const job = { kind: 'image', image, rotated: Math.abs(b) > 1e-6 || a < 0 };
    renders.set(canvas, job);
    watchCanvas(canvas);
    // drawImage ist synchron; der Viewer kann im selben Durchlauf aber noch weitere Aufrufe machen.
    setTimeout(() => {
      if (renders.get(canvas) === job) buildLayer(host, canvas, job).catch((err) => warn('Textlayer fehlgeschlagen', err));
    });
  }

  async function buildLayer(host, canvas, job) {
    if (job.kind === 'pdf') {
      const { page, rotation } = job;
      if (!textContents.has(page)) textContents.set(page, page.getTextContent());
      const textContent = await textContents.get(page);
      if (renders.get(canvas) !== job) return; // inzwischen neu gerendert

      if (textContent.items.some((item) => item.str?.trim())) {
        const scale = canvas.clientWidth / page.getViewport({ scale: 1, rotation }).width;
        const viewport = page.getViewport({ scale, rotation });
        const layer = createLayer(host, scale);
        await new pdfjs.TextLayer({ textContentSource: textContent, container: layer, viewport }).render();
        return;
      }
    }

    if (job.kind === 'image' && job.rotated) {
      warn('Gedrehte Seitenbilder werden nicht unterstützt – Ansicht zurückdrehen.');
      return;
    }

    // Scan oder Seitenbild: Texterkennung.
    const status = showStatus(host, 'Texterkennung …');
    let lines;
    try {
      lines = job.kind === 'pdf' ? await recognizePdfPage(job.page, job.rotation) : await recognizeImage(job.image);
    } finally {
      status.remove();
    }
    if (renders.get(canvas) !== job) return;
    renderOcrLayer(createLayer(host, 1), lines, canvas.clientWidth, canvas.clientHeight);
  }

  function createLayer(host, scale) {
    clearHost(host);
    const layer = document.createElement('div');
    layer.className = LAYER_CLASS;
    layer.tabIndex = -1; // fokussierbar, damit Strg+C in diesem Frame ankommt
    layer.style.setProperty('--total-scale-factor', String(scale));
    layer.style.setProperty('--scale-factor', String(scale));
    host.appendChild(layer);
    return layer;
  }

  function clearHost(host) {
    host.querySelector(`:scope > .${LAYER_CLASS}`)?.remove();
  }

  function showStatus(host, text) {
    host.querySelector(`:scope > .${STATUS_CLASS}`)?.remove();
    const el = document.createElement('div');
    el.className = STATUS_CLASS;
    el.textContent = text;
    host.appendChild(el);
    return el;
  }

  /* Größenänderung ohne neues Rendern (reines CSS-Skalieren) und freigegebene Canvases behandeln. */
  const watched = new WeakSet();
  const resizeObserver = new ResizeObserver((entries) => {
    for (const { target: canvas } of entries) {
      const host = canvas.closest(HOST_SELECTOR);
      const job = renders.get(canvas);
      if (!host || !job || !host.querySelector(`:scope > .${LAYER_CLASS}`)) continue;
      buildLayer(host, canvas, job).catch((err) => warn('Textlayer fehlgeschlagen', err));
    }
  });
  const attributeObserver = new MutationObserver((mutations) => {
    for (const { target: canvas } of mutations) {
      if (canvas.width === 0 || canvas.height === 0) {
        renders.delete(canvas);
        const host = canvas.closest(HOST_SELECTOR);
        if (host) clearHost(host);
      }
    }
  });
  function watchCanvas(canvas) {
    if (watched.has(canvas)) return;
    watched.add(canvas);
    resizeObserver.observe(canvas);
    attributeObserver.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Texterkennung für Seiten ohne Textebene                          */
  /* ------------------------------------------------------------------ */

  let ocrWorkerPromise;

  function ocrWorker() {
    ocrWorkerPromise ??= (async () => {
      const base = document.documentElement.dataset.belegtextVendor;
      if (!base) throw new Error('Pfad zu den OCR-Dateien der Erweiterung fehlt');
      await loadScript(`${base}tesseract.min.js`);
      return window.Tesseract.createWorker('deu', 1 /* LSTM */, {
        workerPath: `${base}worker.min.js`,
        corePath: `${base}core`,
        langPath: `${base}lang`,
        cacheMethod: 'none',
        gzip: true,
      });
    })();
    return ocrWorkerPromise;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Konnte ${src} nicht laden`));
      document.head.appendChild(script);
    });
  }

  /** Gescannte PDF-Seite: in 300 dpi rendern und erkennen. */
  function recognizePdfPage(page, rotation) {
    if (!pdfOcrResults.has(page)) pdfOcrResults.set(page, new Map());
    const byRotation = pdfOcrResults.get(page);
    if (!byRotation.has(rotation)) {
      const result = (async () => {
        const base = page.getViewport({ scale: 1, rotation });
        const scale = Math.min(OCR_DPI / 72, OCR_MAX_SIDE / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale, rotation });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport }).promise;
        return ocr(canvas);
      })();
      result.catch(() => byRotation.delete(rotation)); // nächster Versuch beim nächsten Rendern
      byRotation.set(rotation, result);
    }
    return byRotation.get(rotation);
  }

  /** Seitenbild vom Server: hochskalieren und erkennen. */
  function recognizeImage(image) {
    const key = image.currentSrc || image.src;
    if (!imageOcrResults.has(key)) {
      const scale = Math.min(IMAGE_OCR_UPSCALE, OCR_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const result = ocr(canvas);
      result.catch(() => imageOcrResults.delete(key));
      imageOcrResults.set(key, result);
      if (imageOcrResults.size > IMAGE_CACHE_SIZE) imageOcrResults.delete(imageOcrResults.keys().next().value);
    }
    return imageOcrResults.get(key);
  }

  /** Ergebnis: Zeilen mit Wörtern, Koordinaten relativ zur Seite im Bereich 0..1. */
  async function ocr(canvas) {
    const worker = await ocrWorker();
    const { data } = await worker.recognize(canvas, {}, { blocks: true });

    const w = canvas.width;
    const h = canvas.height;
    const lines = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const words = line.words
            .filter((word) => OCR_CONTENT.test(word.text)
              && (word.confidence >= OCR_MIN_CONFIDENCE || OCR_ALWAYS_KEEP.test(word.text)))
            .map((word) => ({
              text: word.text,
              x0: word.bbox.x0 / w,
              x1: word.bbox.x1 / w,
              y0: word.bbox.y0 / h,
              y1: word.bbox.y1 / h,
            }));
          if (words.length) lines.push(words);
        }
      }
    }
    return lines;
  }

  const measureContext = document.createElement('canvas').getContext('2d');

  /** Jedes Wort bekommt seine eigene Box – Zeilenboxen werden durch Störzeichen zu hoch. */
  function renderOcrLayer(layer, lines, width, height) {
    const fragment = document.createDocumentFragment();
    for (const words of lines) {
      words.forEach((word, i) => {
        const fontSize = Math.max(1, (word.y1 - word.y0) * height);
        measureContext.font = `${fontSize}px sans-serif`;
        const textWidth = measureContext.measureText(word.text).width;
        const boxWidth = (word.x1 - word.x0) * width;
        const span = document.createElement('span');
        span.textContent = i < words.length - 1 ? `${word.text} ` : word.text;
        span.style.cssText = `left:${word.x0 * width}px;top:${word.y0 * height}px;font-size:${fontSize}px;`
          + `font-family:sans-serif;transform:scaleX(${textWidth > 0 ? boxWidth / textWidth : 1});`;
        fragment.appendChild(span);
      });
      fragment.appendChild(document.createElement('br'));
    }
    layer.appendChild(fragment);
  }

  /* ------------------------------------------------------------------ */
  /* 4. Markieren                                                        */
  /* ------------------------------------------------------------------ */

  /*
   * Ziehen: Chromes native Markierung springt auf unsichtbaren, absolut positionierten
   * Textlayern, sobald Start oder Ende in einer Lücke zwischen Zeilen liegt. Deshalb führen
   * wir jede Zieh-Markierung selbst: Anker ist das Zeichen nächst zum Mausklick, Fokus das
   * Zeichen nächst zum Mauszeiger.
   *
   * Doppelklick: Chrome trennt Wörter an Bindestrichen und Punkten („IN-85951534“ ergibt
   * „IN“). Belegwerte sind aber Zeichenketten bis zum nächsten Leerzeichen – Rechnungsnummern,
   * Datumsangaben, Beträge, IBAN-Blöcke. Wir wählen deshalb selbst, auch über Textstücke
   * hinweg, in die das PDF eine Zeichenkette zerlegt hat.
   *
   * DATEVs eigene Erkennungskästen (grün/orange, .ocr-wrapper) liegen per CSS über unserem
   * Layer und bleiben bedienbar. Doppelklick auf einen Kasten kopiert DATEVs erkannten Wert.
   *
   * Dreifachklick (Zeile) bleibt nativ.
   */
  const DATEV_BOX = '.ocr-wrapper:not(.ocr-no-text)';
  const TOKEN_LEAD = /[(\[{"„“‚‘'«]/;
  const TOKEN_TRAIL = /[.,;:!?)\]}"“”‘’'»]/;

  let drag = null;
  let pendingMove = null;

  function textSpans(layer) {
    return [...layer.querySelectorAll('span:not(.markedContent)')].filter((span) => span.firstChild?.nodeType === Node.TEXT_NODE && span.textContent.trim());
  }

  function caretNear(layer, x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const span of textSpans(layer)) {
      const r = span.getBoundingClientRect();
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      const distance = dy * 4 + dx; // Zeile wichtiger als horizontale Nähe
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = span;
      }
    }
    if (!nearest) return null;
    const node = nearest.firstChild;
    return { node, offset: offsetAt(node, x) };
  }

  /** Zeichenposition per Messung der einzelnen Zeichen – unabhängig davon, welches Element am Punkt oben liegt. */
  function offsetAt(node, x) {
    const range = document.createRange();
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (x < (r.left + r.right) / 2) return i;
    }
    return node.length;
  }

  /** Zwei Textstücke gehören zur selben Zeichenkette, wenn sie auf einer Zeile ohne Lücke aneinanderstoßen. */
  function continues(left, right) {
    if (/\s$/.test(left.textContent) || /^\s/.test(right.textContent)) return false;
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    const height = Math.min(a.height, b.height);
    const gap = b.left - a.right;
    return Math.abs(a.top - b.top) < height / 2 && gap > -height && gap < height * 0.3;
  }

  /** Markiert die Zeichenkette bis zum nächsten Leerzeichen um die Klickposition. */
  function selectToken(layer, x, y) {
    const caret = caretNear(layer, x, y);
    if (!caret) return;
    const spans = textSpans(layer);
    const text = (i) => spans[i].firstChild.data;

    let first = spans.indexOf(caret.node.parentElement);
    let start = caret.offset;
    while (start > 0 && !/\s/.test(text(first)[start - 1])) start--;
    while (start === 0 && first > 0 && continues(spans[first - 1], spans[first])) {
      first--;
      start = text(first).length;
      while (start > 0 && !/\s/.test(text(first)[start - 1])) start--;
    }

    let last = spans.indexOf(caret.node.parentElement);
    let end = caret.offset;
    while (end < text(last).length && !/\s/.test(text(last)[end])) end++;
    while (end === text(last).length && last < spans.length - 1 && continues(spans[last], spans[last + 1])) {
      last++;
      end = 0;
      while (end < text(last).length && !/\s/.test(text(last)[end])) end++;
    }

    while ((first < last || start < end) && start < text(first).length && TOKEN_LEAD.test(text(first)[start])) start++;
    while ((first < last || start < end) && end > 0 && TOKEN_TRAIL.test(text(last)[end - 1])) end--;

    window.getSelection().setBaseAndExtent(spans[first].firstChild, start, spans[last].firstChild, end);
  }

  function layerAt(x, y) {
    return document.elementsFromPoint(x, y).find((el) => el.classList.contains(LAYER_CLASS)) ?? null;
  }

  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.button !== 0 || event.detail > 2 || !(event.target instanceof Element)) return;

      if (event.detail === 2) {
        const box = event.target.closest(DATEV_BOX);
        if (box) {
          event.preventDefault();
          box.focus({ preventScroll: true });
          window.getSelection().selectAllChildren(box);
          copySelection();
          return;
        }
        const layer = event.target.closest(`.${LAYER_CLASS}`);
        if (!layer) return;
        event.preventDefault();
        layer.focus({ preventScroll: true });
        selectToken(layer, event.clientX, event.clientY);
        copySelection();
        return;
      }

      const layer = event.target.closest(`.${LAYER_CLASS}`);
      if (!layer) return;
      const anchor = caretNear(layer, event.clientX, event.clientY);
      if (!anchor) return;
      event.preventDefault();
      // preventDefault verhindert den Fokuswechsel in diesen Frame – ohne Fokus ginge
      // Strg+C an das Erfassungsformular im Nachbar-Frame.
      layer.focus({ preventScroll: true });
      drag = { layer, anchor, moved: false };
      window.getSelection().setBaseAndExtent(anchor.node, anchor.offset, anchor.node, anchor.offset);
    },
    true,
  );

  document.addEventListener(
    'mousemove',
    (event) => {
      if (!drag) return;
      drag.moved = true;
      const first = pendingMove === null;
      pendingMove = { x: event.clientX, y: event.clientY };
      if (first) requestAnimationFrame(applyMove);
    },
    true,
  );

  function applyMove() {
    const move = pendingMove;
    pendingMove = null;
    if (!drag || !move) return;
    const layer = layerAt(move.x, move.y) ?? drag.layer;
    const focus = caretNear(layer, move.x, move.y);
    if (!focus) return;
    const { anchor } = drag;
    window.getSelection().setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
  }

  document.addEventListener(
    'mouseup',
    (event) => {
      if (!drag) return;
      const { moved } = drag;
      pendingMove = { x: event.clientX, y: event.clientY };
      applyMove();
      drag = null;
      if (moved) copySelection();
    },
    true,
  );

  /* ------------------------------------------------------------------ */
  /* 5. Kopieren                                                         */
  /* ------------------------------------------------------------------ */

  const inCopyRegion = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest(`.${LAYER_CLASS}, ${DATEV_BOX}`));
  };

  function normalize(text) {
    return text
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  }

  /** Doppelklick und Ziehen kopieren sofort. */
  function copySelection() {
    const text = normalize(window.getSelection().toString());
    if (!text) return;
    if (document.execCommand('copy')) toast(`Kopiert: ${text.replace(/\n/g, ' ')}`);
    else toast('Kopieren nicht möglich – bitte Strg+C verwenden');
  }

  // Strg+C und automatisches Kopieren: ohne angehängte Leerzeichen, Zeilen bereinigt.
  document.addEventListener(
    'copy',
    (event) => {
      const selection = window.getSelection();
      if (!selection.rangeCount || !inCopyRegion(selection.anchorNode)) return;
      event.clipboardData.setData('text/plain', normalize(selection.toString()));
      event.preventDefault();
    },
    true,
  );

  let toastTimer;
  function toast(message) {
    let el = document.querySelector('.belegtext-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'belegtext-toast';
      document.body.appendChild(el);
    }
    el.textContent = message.length > 80 ? `${message.slice(0, 77)}…` : message;
    el.classList.add('belegtext-toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('belegtext-toast--visible'), 1600);
  }
})();
