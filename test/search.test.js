import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSearchIndex,
  createSearchSnippet,
  initializeSearch,
  matchSearchEntry,
  normalizeSearchText,
  rankSearchEntry,
  searchDocuments
} from '../core/web/search.js';

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(tagName, documentObject) {
    this.tagName = tagName.toUpperCase();
    this.documentObject = documentObject;
    this.listeners = new Map();
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.id = '';
    this.focusCount = 0;
  }

  set innerHTML(_value) {
    throw new Error('Search must not render through innerHTML');
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  dispatch(name, init = {}) {
    const event = {
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      target: this,
      ...init
    };
    for (const listener of this.listeners.get(name) ?? []) listener(event);
    return event;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }

  focus() {
    this.focusCount += 1;
    this.documentObject.activeElement = this;
    this.dispatch('focus');
  }

  select() { this.selected = true; }
  scrollIntoView() { this.scrolled = true; }

  contains(candidate) {
    return candidate === this || this.children.some((child) => child.contains(candidate));
  }

  closest(selector) {
    if (selector === '[role="option"]' && this.getAttribute('role') === 'option') return this;
    return this.parentElement?.closest(selector) ?? null;
  }

  querySelectorAll(selector) {
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll('*')]);
    if (selector === '*') return descendants;
    if (selector === '[role="option"]') {
      return descendants.filter((element) => element.getAttribute('role') === 'option');
    }
    if (selector.includes('input:not') && selector.includes('button:not')) {
      return descendants.filter((element) => {
        if ((element.tagName === 'INPUT' || element.tagName === 'BUTTON') && !element.disabled) return true;
        return element.getAttribute('tabindex') !== null && element.getAttribute('tabindex') !== '-1';
      });
    }
    return [];
  }
}

class FakeDocument {
  constructor() {
    this.listeners = new Map();
    this.activeElement = null;
  }

  createElement(tagName) { return new FakeElement(tagName, this); }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  dispatch(name, init = {}) {
    const event = {
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...init
    };
    for (const listener of this.listeners.get(name) ?? []) listener(event);
    return event;
  }
}

const manifest = [
  { title: 'Guida introduttiva', route: '/guide/introduzione', aliases: ['/README'], text: 'Installazione rapida e caffè.' },
  { title: 'API Reference', route: '/reference/api', aliases: ['/legacy-api'], text: 'Parametri delle funzioni pubbliche.' },
  { title: 'API Guide', route: '/api-guide', aliases: ['/old-guide'], text: 'Autenticazione e richieste HTTP.' },
  { title: 'API Guide', route: '/api-guide-2', aliases: [], text: 'Esempi avanzati.' }
];

function createFixture() {
  const documentObject = new FakeDocument();
  const elements = {
    launcher: documentObject.createElement('input'),
    overlay: documentObject.createElement('div'),
    dialog: documentObject.createElement('section'),
    input: documentObject.createElement('input'),
    results: documentObject.createElement('div'),
    emptyMessage: documentObject.createElement('p'),
    clearButton: documentObject.createElement('button'),
    closeButton: documentObject.createElement('button'),
    backdrop: documentObject.createElement('button')
  };
  elements.dialog.append(
    elements.closeButton,
    elements.input,
    elements.clearButton,
    elements.results,
    elements.emptyMessage
  );
  const body = documentObject.createElement('body');
  const navigated = [];
  const sidebarCalls = [];
  const controller = initializeSearch({
    manifest,
    elements,
    body,
    documentObject,
    closeSidebar: (...args) => sidebarCalls.push(args),
    onNavigate: (route) => navigated.push(route)
  });
  return { body, controller, documentObject, elements, navigated, sidebarCalls };
}

test('normalizza trim, NFKD, segni combinanti, maiuscole e spazi', () => {
  assert.equal(normalizeSearchText('  Caffè\t DÉJÀ  '), 'caffe deja');
  assert.equal(normalizeSearchText('Cafe\u0301'), 'cafe');
});

test('applica ranking deterministico e conserva i tie nell’ordine manifest', () => {
  const index = createSearchIndex(manifest);
  assert.equal(rankSearchEntry(index[2], 'api guide'), 0);
  assert.equal(rankSearchEntry(index[1], 'api'), 1);
  assert.equal(rankSearchEntry(index[0], 'gui intro'), 2);
  assert.equal(rankSearchEntry(index[0], 'rodutt'), 3);
  assert.equal(rankSearchEntry(createSearchIndex([
    { title: 'Documento', route: '/reference', aliases: [], text: '' }
  ])[0], 'reference'), 4);
  assert.equal(rankSearchEntry(index[1], 'legacy'), 5);
  assert.deepEqual(
    searchDocuments(index, 'api guide').map(({ document }) => document.route),
    ['/api-guide', '/api-guide-2', '/guide/introduzione']
  );
});

test('richiede tutti i token, mostra tutti con query vuota e nessuno senza match', () => {
  const index = createSearchIndex(manifest);
  assert.deepEqual(searchDocuments(index, '').map(({ document }) => document.route), manifest.map(({ route }) => route));
  assert.deepEqual(searchDocuments(index, 'api assente'), []);
  assert.deepEqual(searchDocuments(index, 'legacy api').map(({ document }) => document.route), ['/reference/api']);
  assert.deepEqual(searchDocuments(index, 'api api').map(({ document }) => document.route), [
    '/reference/api', '/api-guide', '/api-guide-2', '/guide/introduzione'
  ]);
});

test('cerca route canoniche e alias dopo la decodifica URL', () => {
  const index = createSearchIndex([
    { title: 'Documento', route: '/guide%20API/caf%C3%A9', aliases: ['/vecchia%20guida'], text: '' }
  ]);
  assert.equal(searchDocuments(index, 'guide api')[0].document.route, '/guide%20API/caf%C3%A9');
  assert.equal(searchDocuments(index, 'vecchia guida')[0].document.route, '/guide%20API/caf%C3%A9');
});

test('classifica body phrase, body AND e match misti dopo i metadata', () => {
  const index = createSearchIndex([
    { title: 'Installazione', route: '/setup', aliases: [], text: 'Configura il server locale rapidamente.' },
    { title: 'Server', route: '/network', aliases: [], text: 'La configurazione locale usa TLS.' },
    { title: 'Altro', route: '/misc', aliases: [], text: 'server distante locale' }
  ]);

  assert.deepEqual(matchSearchEntry(index[0], 'server locale'), { rank: 6, matchSource: 'body-phrase', bodyRequired: true });
  assert.deepEqual(matchSearchEntry(index[2], 'server locale'), { rank: 7, matchSource: 'body', bodyRequired: true });
  assert.deepEqual(matchSearchEntry(index[1], 'server locale'), { rank: 8, matchSource: 'mixed-body', bodyRequired: true });
  assert.deepEqual(
    searchDocuments(index, 'server locale').map(({ document, rank, matchSource }) => ({ route: document.route, rank, matchSource })),
    [
      { route: '/setup', rank: 6, matchSource: 'body-phrase' },
      { route: '/misc', rank: 7, matchSource: 'body' },
      { route: '/network', rank: 8, matchSource: 'mixed-body' }
    ]
  );
});

test('genera snippet Unicode deterministici entro 180 code point', () => {
  assert.equal(createSearchSnippet('Testo breve con Caffè.', 'caffe'), 'Testo breve con Caffè.');

  const longText = `${'prima '.repeat(30)}TARGET frase completa ${'dopo '.repeat(35)}`.trim();
  const phraseSnippet = createSearchSnippet(longText, 'target frase completa');
  assert.ok([...phraseSnippet].length <= 180);
  assert.match(phraseSnippet, /^…/);
  assert.match(phraseSnippet, /…$/);
  assert.match(phraseSnippet, /TARGET frase completa/);

  const tokenSnippet = createSearchSnippet(`inizio ${'x '.repeat(120)}secondo token e fine`, 'assente secondo');
  assert.match(tokenSnippet, /secondo/);
  assert.ok([...tokenSnippet].length <= 180);

  const emojiSnippet = createSearchSnippet(`${'😀'.repeat(200)} café`, 'cafe');
  assert.ok([...emojiSnippet].length <= 180);
  assert.match(emojiSnippet, /café/);

  const longMatch = 'z'.repeat(220);
  const cappedMatchSnippet = createSearchSnippet(`prima ${longMatch} dopo`, longMatch);
  assert.equal([...cappedMatchSnippet].length, 180);
  assert.match(cappedMatchSnippet, /^…z+/);
  assert.match(cappedMatchSnippet, /…$/);
});

test('omette snippet per risultati metadata-only e lo include quando serve il body', () => {
  const index = createSearchIndex(manifest);
  assert.equal(searchDocuments(index, 'legacy')[0].snippet, null);
  const bodyResult = searchDocuments(index, 'installazione caffe')[0];
  assert.equal(bodyResult.matchSource, 'body');
  assert.match(bodyResult.snippet, /Installazione rapida e caffè/);

  const mixedMetadata = searchDocuments(createSearchIndex([
    { title: 'Server', route: '/locale', aliases: [], text: 'corpo irrilevante' }
  ]), 'server locale')[0];
  assert.equal(mixedMetadata.matchSource, 'mixed-metadata');
  assert.equal(mixedMetadata.snippet, null);
});

test('non inizializza parzialmente quando manca un hook', () => {
  const documentObject = new FakeDocument();
  const launcher = documentObject.createElement('input');
  const launcherContainer = documentObject.createElement('label');
  const overlay = documentObject.createElement('div');
  launcherContainer.classList.add('app-header__search');
  launcherContainer.append(launcher);
  const controller = initializeSearch({
    manifest,
    elements: { launcher, overlay },
    onNavigate() {},
    body: documentObject.createElement('body'),
    documentObject
  });
  assert.equal(controller, null);
  assert.equal(launcher.listeners.size, 0);
  assert.equal(launcher.hidden, true);
  assert.equal(launcherContainer.hidden, true);
  assert.equal(overlay.hidden, true);
});

test('non nasconde un contenitore estraneo quando neutralizza un launcher incompleto', () => {
  const documentObject = new FakeDocument();
  const header = documentObject.createElement('header');
  const launcher = documentObject.createElement('input');
  header.append(launcher);

  initializeSearch({
    manifest,
    elements: { launcher },
    onNavigate() {},
    body: documentObject.createElement('body'),
    documentObject
  });

  assert.equal(launcher.hidden, true);
  assert.equal(header.hidden, false);
});

test('neutralizza in modo atomico un override ADR-0026 a cui manca solo search-clear', () => {
  const documentObject = new FakeDocument();
  const elements = {
    launcher: documentObject.createElement('input'),
    overlay: documentObject.createElement('div'),
    dialog: documentObject.createElement('section'),
    input: documentObject.createElement('input'),
    results: documentObject.createElement('div'),
    emptyMessage: documentObject.createElement('p'),
    closeButton: documentObject.createElement('button'),
    backdrop: documentObject.createElement('button')
  };
  const launcherContainer = documentObject.createElement('label');
  launcherContainer.classList.add('app-header__search');
  launcherContainer.append(elements.launcher);

  const controller = initializeSearch({
    manifest,
    elements,
    onNavigate() {},
    body: documentObject.createElement('body'),
    documentObject
  });

  assert.equal(controller, null);
  assert.equal(elements.launcher.hidden, true);
  assert.equal(launcherContainer.hidden, true);
  assert.equal(elements.overlay.hidden, true);
  assert.equal(elements.input.listeners.size, 0);
});

test('apre dal launcher e aggiorna draft, risultati, snippet e clear senza cambiare il launcher', () => {
  const { body, controller, elements, sidebarCalls } = createFixture();
  elements.launcher.focus();
  assert.equal(controller.isOpen(), true);
  assert.equal(elements.overlay.hidden, false);
  assert.equal(body.classList.contains('search-open'), true);
  assert.deepEqual(sidebarCalls, [[false]]);
  assert.equal(elements.results.children.length, manifest.length);
  assert.equal(elements.input.selected, true);

  elements.input.value = 'legacy';
  elements.input.dispatch('input');
  assert.equal(elements.launcher.value, '');
  assert.equal(elements.clearButton.hidden, false);
  assert.equal(elements.results.children.length, 1);
  assert.equal(elements.results.children[0].children[0].textContent, 'API Reference');
  assert.equal(elements.results.children[0].children.length, 1);
  assert.equal(elements.results.children[0].children[0].className, 'search-result__title');

  elements.input.value = 'nessun risultato';
  elements.input.dispatch('input');
  assert.equal(elements.emptyMessage.hidden, false);
  assert.equal(elements.results.children.length, 0);
});

test('clear cancella il draft, mostra tutti i risultati e mantiene overlay e focus', () => {
  const { controller, documentObject, elements } = createFixture();
  controller.open();
  elements.input.value = 'legacy';
  elements.input.dispatch('input');

  elements.clearButton.dispatch('click');

  assert.equal(elements.input.value, '');
  assert.equal(elements.clearButton.hidden, true);
  assert.equal(elements.results.children.length, manifest.length);
  assert.equal(controller.isOpen(), true);
  assert.equal(documentObject.activeElement, elements.input);
  assert.equal(elements.launcher.value, '');
});

test('gestisce frecce, Home, End ed Enter navigando sempre alla route canonica', () => {
  const { controller, elements, navigated } = createFixture();
  controller.open();
  elements.input.value = 'api';
  elements.input.dispatch('input');
  elements.input.dispatch('keydown', { key: 'End' });
  assert.equal(elements.input.getAttribute('aria-activedescendant'), 'search-option-3');
  elements.input.dispatch('keydown', { key: 'Home' });
  assert.equal(elements.input.getAttribute('aria-activedescendant'), 'search-option-0');
  elements.input.dispatch('keydown', { key: 'ArrowDown' });
  elements.input.dispatch('keydown', { key: 'ArrowUp' });
  elements.input.dispatch('keydown', { key: 'Enter' });
  assert.deepEqual(navigated, ['/reference/api']);
  assert.equal(controller.isOpen(), false);
  assert.equal(elements.launcher.value, 'api');
  assert.equal(elements.launcher.focusCount, 0);
});

test('Escape, backdrop, close e controller.close committano il draft e la riapertura lo ripristina', () => {
  const { body, controller, documentObject, elements } = createFixture();
  elements.launcher.focus();
  elements.input.value = 'escape';
  elements.input.dispatch('input');
  documentObject.dispatch('keydown', { key: 'Escape' });
  assert.equal(controller.isOpen(), false);
  assert.equal(elements.launcher.focusCount, 2);
  assert.equal(body.classList.contains('search-open'), false);
  assert.equal(elements.launcher.value, 'escape');

  elements.launcher.focus();
  assert.equal(elements.input.value, 'escape');
  elements.input.value = 'backdrop';
  elements.backdrop.dispatch('click');
  assert.equal(controller.isOpen(), false);
  assert.equal(elements.launcher.focusCount, 4);
  assert.equal(elements.launcher.value, 'backdrop');

  elements.launcher.dispatch('click');
  assert.equal(controller.isOpen(), true);
  elements.input.value = 'close';
  elements.closeButton.dispatch('click');
  assert.equal(controller.isOpen(), false);
  assert.equal(elements.launcher.focusCount, 5);
  assert.equal(elements.launcher.value, 'close');

  controller.open();
  elements.input.value = 'controller';
  controller.close();
  assert.equal(elements.launcher.value, 'controller');
});

test('contiene il focus nel dialog e seleziona i risultati con click', () => {
  const { controller, documentObject, elements, navigated } = createFixture();
  controller.open();
  elements.closeButton.focus();
  const backward = documentObject.dispatch('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(backward.defaultPrevented, true);
  assert.equal(documentObject.activeElement, elements.input);
  const forward = documentObject.dispatch('keydown', { key: 'Tab' });
  assert.equal(forward.defaultPrevented, true);
  assert.equal(documentObject.activeElement, elements.closeButton);

  const secondOptionTitle = elements.results.children[1].children[0];
  elements.results.dispatch('click', { target: secondOptionTitle });
  assert.deepEqual(navigated, ['/reference/api']);
  assert.equal(elements.launcher.value, '');
});

test('recupera il focus se un aggiornamento esterno lo sposta dietro il dialog', () => {
  const { controller, documentObject, elements } = createFixture();
  const background = documentObject.createElement('main');
  controller.open();

  documentObject.activeElement = background;
  documentObject.dispatch('focusin', { target: background });

  assert.equal(documentObject.activeElement, elements.input);
});
