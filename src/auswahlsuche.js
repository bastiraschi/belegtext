/*
 * Belegtext – Auswahllisten mit Suchfeld in den Belegdetails direkt per Tastatur bedienbar.
 *
 * DATEV öffnet beim Klick auf ein Auswahlfeld wie „Geschäftspartner“ eine Liste mit Suchfeld,
 * lässt den Fokus aber auf dem Auswahlfeld. Wer lostippt, landet nicht in der Suche. Dieses
 * Script setzt den Cursor ins Suchfeld, solange die Liste offen ist. Im Suchfeld wirken
 * Pfeiltasten und Escape bei DATEV nicht, weil das Suchfeld Tastendrücke nicht an die Liste
 * weitergibt; hier markieren die Pfeiltasten einen Eintrag, Enter wählt ihn wie ein Mausklick
 * darauf, und Escape schließt die Liste.
 *
 * Erkannt wird die Liste nur über ARIA (Auswahlfeld mit role="combobox" und aria-controls,
 * Liste mit role="listbox", Einträge mit role="option"), nicht über DATEV-Klassen oder -IDs.
 * Das Script liest keine Werte und setzt keine; gespeichert wird weiterhin nur über DATEVs
 * eigene Knöpfe. Läuft in der isolierten Welt der Erweiterung, nur auf duo-belege.apps.datev.de.
 *
 * Lizenz: MIT
 */
(() => {
  'use strict';

  const SEARCH_FIELD = 'input:not([type]), input[type="text"], input[type="search"]';
  const OPTION = '[role="option"]:not([aria-disabled="true"])';
  const ACTIVE_CLASS = 'belegtext-option-aktiv';
  /* DATEV hängt die Liste erst nach dem Umschalten von aria-expanded ein. */
  const PANEL_WAIT_FRAMES = 30;

  /** Per Pfeiltaste markierter Eintrag der offenen Liste */
  let active = null;

  function searchFieldOf(combobox) {
    if (combobox.getAttribute('role') !== 'combobox' || combobox instanceof HTMLInputElement) return null;
    if (combobox.getAttribute('aria-expanded') !== 'true') return null;
    const panelId = combobox.getAttribute('aria-controls');
    const field = panelId ? document.getElementById(panelId)?.querySelector(SEARCH_FIELD) : null;
    return field && !field.disabled && !field.readOnly ? field : null;
  }

  function focusSearchField(combobox, frame = 0) {
    if (combobox.getAttribute('aria-expanded') !== 'true') return;
    const field = searchFieldOf(combobox);
    if (field) field.focus({ preventScroll: true });
    else if (frame < PANEL_WAIT_FRAMES) requestAnimationFrame(() => focusSearchField(combobox, frame + 1));
  }

  // Liste geht auf: Cursor ins Suchfeld.
  new MutationObserver((records) => {
    for (const { target, oldValue } of records) {
      if (target.getAttribute('role') !== 'combobox') continue;
      if (target.getAttribute('aria-expanded') === 'true') {
        if (oldValue !== 'true') focusSearchField(target);
      } else {
        setActive(null);
      }
    }
  }).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded'],
    attributeOldValue: true,
  });

  // DATEV holt den Fokus nach dem Öffnen auf das Auswahlfeld zurück; solange die Liste offen ist,
  // gehört er ins Suchfeld.
  document.addEventListener(
    'focusin',
    (event) => {
      const field = event.target instanceof Element ? searchFieldOf(event.target) : null;
      if (field) field.focus({ preventScroll: true });
    },
    true,
  );

  function listOf(target) {
    return target instanceof HTMLInputElement ? target.closest('[role="listbox"]') : null;
  }

  function comboboxOf(list) {
    return list.id ? document.querySelector(`[role="combobox"][aria-controls="${CSS.escape(list.id)}"]`) : null;
  }

  function setActive(option) {
    active?.classList.remove(ACTIVE_CLASS);
    active = option;
    if (!option) return;
    option.classList.add(ACTIVE_CLASS);
    option.scrollIntoView({ block: 'nearest' });
  }

  function move(list, step) {
    const options = [...list.querySelectorAll(OPTION)];
    if (!options.length) return;
    const index = options.indexOf(active);
    if (index >= 0) {
      setActive(options[Math.min(options.length - 1, Math.max(0, index + step))]);
      return;
    }
    // Der schon gewählte Eintrag steht bei DATEV oben; der erste Pfeil springt zum ersten Treffer.
    const fresh = options.filter((option) => option.getAttribute('aria-selected') !== 'true');
    const pool = fresh.length ? fresh : options;
    setActive(step > 0 ? pool[0] : pool[pool.length - 1]);
  }

  function close(list) {
    const combobox = comboboxOf(list);
    if (!combobox) return;
    // Escape so zustellen, als käme es vom Auswahlfeld; dort schließt DATEV die Liste selbst.
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    requestAnimationFrame(() => combobox.focus({ preventScroll: true }));
  }

  document.addEventListener(
    'keydown',
    (event) => {
      const list = listOf(event.target);
      if (!list || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        move(list, event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Enter' && active?.isConnected && list.contains(active)) {
        active.click();
      } else if (event.key === 'Escape') {
        close(list);
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  // Neue Suchbegriffe ergeben eine neue Trefferliste; die alte Markierung gilt dann nicht mehr.
  document.addEventListener(
    'input',
    (event) => {
      if (listOf(event.target)) setActive(null);
    },
    true,
  );
})();
