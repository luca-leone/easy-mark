import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRouteTargets,
  exportNamespace,
  exportTargetForHref,
  initializePdfExport,
  normalizeRoutePathname,
  namespaceSectionIds,
  resolveExportAssetUrl,
  rewriteExportSrcset,
  setExportContainerActive,
  setExportLifecycle,
  waitForExportImages
} from '../core/web/pdf-export.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ listener, once: options.once === true });
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(type, listeners.filter((entry) => entry.listener !== listener));
  }

  async emit(type) {
    const listeners = [...(this.listeners.get(type) ?? [])];
    const pending = listeners.map(({ listener, once }) => {
      if (once) this.removeEventListener(type, listener);
      return listener({ type, target: this });
    });
    await Promise.all(pending);
  }

  listenerCount(type) {
    return (this.listeners.get(type) ?? []).length;
  }
}

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, active) {
    if (active) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement extends FakeEventTarget {
  constructor({ classes = [], fragment = false } = {}) {
    super();
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList(classes);
    this.className = '';
    this.disabled = false;
    this.id = '';
    this.innerHTML = '';
    this.insertedHtml = '';
    this.isFragment = fragment;
    this.textContent = '';
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (node.isFragment) this.children.push(...node.children);
      else this.children.push(node);
    });
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  insertAdjacentHTML(position, html) {
    assert.equal(position, 'beforeend');
    this.insertedHtml += html;
  }

  querySelectorAll() {
    return [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function createPdfExportDom() {
  const body = new FakeElement();
  const documentObject = {
    body,
    fonts: { ready: Promise.resolve() },
    createElement: () => new FakeElement(),
    createDocumentFragment: () => new FakeElement({ fragment: true })
  };
  const windowObject = new FakeEventTarget();
  windowObject.location = { origin: 'http://example.test' };
  return { body, documentObject, windowObject };
}

test('assegna namespace stabili e riscrive link interni canonici, alias e Unicode', () => {
  const namespaces = new Map([
    ['/guida', exportNamespace(0)],
    ['/guide/README', exportNamespace(0)],
    ['/api', exportNamespace(1)]
  ]);

  assert.equal(exportNamespace(0), 'pdf-document-1');
  assert.equal(exportTargetForHref('#doc-caff%C3%A8', '/guida', namespaces, 'http://example.test'), '#pdf-document-1--doc-caff\u00e8');
  assert.equal(exportTargetForHref('/guide/README#doc-uso', '/guida', namespaces, 'http://example.test'), '#pdf-document-1--doc-uso');
  assert.equal(exportTargetForHref('/api', '/guida', namespaces, 'http://example.test'), '#pdf-document-2');
});

test('lascia invariati i link esterni e i percorsi non documentali', () => {
  const namespaces = new Map([['/guida', 'pdf-document-1']]);
  assert.equal(exportTargetForHref('https://openai.com', '/guida', namespaces, 'http://example.test'), null);
  assert.equal(exportTargetForHref('/images/schema.png', '/guida', namespaces, 'http://example.test'), null);
});

test('normalizza pathname percent-encoded e Unicode prima del lookup', () => {
  const namespaces = new Map([
    [normalizeRoutePathname('/caff\u00e8'), 'pdf-document-1'],
    [normalizeRoutePathname('/guida/cafe\u0301'), 'pdf-document-2']
  ]);

  assert.equal(exportTargetForHref('/caff%C3%A8#doc-menu', '/', namespaces, 'http://example.test'), '#pdf-document-1--doc-menu');
  assert.equal(exportTargetForHref('/guida/caf%C3%A9', '/', namespaces, 'http://example.test'), '#pdf-document-2');
});

test('distingue canoniche NFC/NFD gia disambiguate e preserva segmenti riservati', () => {
  const first = { namespace: 'pdf-document-1', idReferences: new Map() };
  const second = { namespace: 'pdf-document-2', idReferences: new Map() };
  const special = { namespace: 'pdf-document-3', idReferences: new Map() };
  const targets = buildRouteTargets([
    { route: '/caf%C3%A9', aliases: [] },
    { route: '/caf%C3%A9-2', aliases: ['/cafe%CC%81'] },
    { route: '/guide%20%231%3F/pagina', aliases: ['/guide%20%231%3F/source%20%25'] }
  ], [first, second, special]);

  assert.equal(exportTargetForHref('/cafe%CC%81', '/', targets, 'http://example.test'), '#pdf-document-1');
  assert.equal(exportTargetForHref('/caf%C3%A9-2', '/', targets, 'http://example.test'), '#pdf-document-2');
  assert.equal(exportTargetForHref('/guide%20%231%3F/source%20%25', '/', targets, 'http://example.test'), '#pdf-document-3');
});

test('mantiene la precedenza canonica quando un alias PDF collide su /bar', () => {
  const canonicalBar = { namespace: 'pdf-document-1', idReferences: new Map() };
  const aliasBar = { namespace: 'pdf-document-2', idReferences: new Map() };
  const targets = buildRouteTargets([
    { route: '/bar', aliases: ['/a'] },
    { route: '/baz', aliases: ['/bar'] }
  ], [canonicalBar, aliasBar]);

  assert.equal(targets.get('/bar'), canonicalBar);
  assert.equal(exportTargetForHref('/bar', '/', targets, 'http://example.test'), '#pdf-document-1');
});

test('namespacia ID e attributi IDREF anche quando contengono liste di token', () => {
  class FakeElement {
    constructor(id = '', attributes = {}) {
      this.id = id;
      this.attributes = new Map(Object.entries(attributes));
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    getAttribute(name) {
      return this.attributes.get(name);
    }

    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  }

  const ids = [
    new FakeElement('doc-label'),
    new FakeElement('doc-panel'),
    new FakeElement('doc-field'),
    new FakeElement('doc-head')
  ];
  const reference = new FakeElement('', {
    'aria-labelledby': 'label missing',
    'aria-describedby': 'doc-label',
    'aria-controls': 'panel',
    'aria-owns': 'panel label',
    headers: 'head missing',
    for: 'field'
  });
  const section = {
    querySelectorAll(selector) {
      return selector === '[id]' ? ids : [reference];
    }
  };

  const idReferences = namespaceSectionIds(section, 'pdf-document-1');
  assert.deepEqual(ids.map(({ id }) => id), [
    'pdf-document-1--doc-label',
    'pdf-document-1--doc-panel',
    'pdf-document-1--doc-field',
    'pdf-document-1--doc-head'
  ]);
  assert.equal(reference.getAttribute('aria-labelledby'), 'pdf-document-1--doc-label missing');
  assert.equal(reference.getAttribute('aria-describedby'), 'pdf-document-1--doc-label');
  assert.equal(reference.getAttribute('aria-controls'), 'pdf-document-1--doc-panel');
  assert.equal(reference.getAttribute('aria-owns'), 'pdf-document-1--doc-panel pdf-document-1--doc-label');
  assert.equal(reference.getAttribute('headers'), 'pdf-document-1--doc-head missing');
  assert.equal(reference.getAttribute('for'), 'pdf-document-1--doc-field');
  assert.equal(
    exportTargetForHref('#panel', '/bar', new Map([['/bar', { namespace: 'pdf-document-1', idReferences }]]), 'http://example.test'),
    '#pdf-document-1--doc-panel'
  );
});

test('risolve asset e srcset rispetto alla directory del Markdown', () => {
  assert.equal(
    resolveExportAssetUrl('../images/schema 1.png', '/guide/topic/', 'http://example.test'),
    'http://example.test/guide/images/schema%201.png'
  );
  assert.equal(resolveExportAssetUrl('https://cdn.example/image.png', '/guide/', 'http://example.test'), null);
  assert.equal(resolveExportAssetUrl('data:image/png;base64,AAAA', '/guide/', 'http://example.test'), null);
  assert.equal(
    rewriteExportSrcset('small.png 1x, ../large.png 2x, https://cdn.example/large.png 3x', '/guide/topic/', 'http://example.test'),
    'http://example.test/guide/topic/small.png 1x, http://example.test/guide/large.png 2x, https://cdn.example/large.png 3x'
  );
});

test('attende decoding o completamento delle immagini senza bloccare sugli errori', async () => {
  let decoded = false;
  const decodedImage = {
    async decode() {
      decoded = true;
    }
  };
  const loadedImage = {
    complete: false,
    addEventListener(eventName, listener) {
      if (eventName === 'load') queueMicrotask(listener);
    }
  };

  await waitForExportImages({ querySelectorAll: () => [decodedImage, loadedImage] });
  assert.equal(decoded, true);
});

test('espone il contenitore durante export e ripristina aria-hidden al cleanup', () => {
  const attributes = new Map([['aria-hidden', 'true']]);
  const container = {
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    }
  };

  setExportContainerActive(container, true);
  assert.equal(attributes.has('aria-hidden'), false);
  setExportContainerActive(container, false);
  assert.equal(attributes.get('aria-hidden'), 'true');
});

test('attiva e ripristina insieme stato body e accessibilita del contenitore', () => {
  const classes = new Set();
  const attributes = new Map([['aria-hidden', 'true']]);
  const body = {
    classList: {
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      }
    }
  };
  const container = {
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    }
  };

  setExportLifecycle(body, container, true);
  assert.equal(classes.has('export-printing'), true);
  assert.equal(attributes.has('aria-hidden'), false);
  setExportLifecycle(body, container, false);
  assert.equal(classes.has('export-printing'), false);
  assert.equal(attributes.get('aria-hidden'), 'true');
});

test('initializePdfExport completa fetch, build, print e cleanup afterprint', async () => {
  const { body, documentObject, windowObject } = createPdfExportDom();
  const button = new FakeElement();
  button.textContent = 'Esporta PDF';
  const status = new FakeElement({ classes: ['visually-hidden'] });
  const container = new FakeElement();
  container.setAttribute('aria-hidden', 'true');
  let resolveFetch;
  const fetchPending = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const fetchCalls = [];
  let printCalls = 0;
  let visualRenderCalls = 0;

  initializePdfExport({
    button,
    status,
    container,
    documentObject,
    windowObject,
    fetchExport(url, options) {
      fetchCalls.push({ url, options });
      return fetchPending;
    },
    async renderVisuals(target, options) {
      visualRenderCalls += 1;
      assert.equal(target, container);
      assert.equal(options.documentObject, documentObject);
      assert.equal(options.print, true);
    },
    print() {
      printCalls += 1;
    }
  });

  const clickPending = button.emit('click');
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.textContent, 'Preparazione PDF\u2026');
  assert.equal(status.textContent, 'Preparazione del documento per la stampa.');

  resolveFetch({
    ok: true,
    async json() {
      return {
        navigation: '<nav class="navigation"></nav>',
        documents: [{
          route: '/pagina',
          aliases: ['/page'],
          title: 'Pagina',
          assetBase: '/',
          html: '<h1 id="doc-pagina">Pagina</h1>'
        }]
      };
    }
  });
  await clickPending;

  assert.deepEqual(fetchCalls, [{ url: '/__export', options: { headers: { Accept: 'application/json' } } }]);
  assert.equal(printCalls, 1);
  assert.equal(visualRenderCalls, 1);
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.equal(button.textContent, 'Esporta PDF');
  assert.equal(status.textContent, 'Documento pronto. Usa il dialogo di stampa per salvarlo come PDF.');
  assert.equal(container.hasAttribute('aria-hidden'), false);
  assert.equal(container.children.length, 2);
  assert.equal(container.children[0].className, 'print-export__navigation');
  assert.match(container.children[0].insertedHtml, /class="navigation"/);
  assert.equal(container.children[1].className, 'print-export__document document');
  assert.equal(container.children[1].innerHTML, '<h1 id="doc-pagina">Pagina</h1>');
  assert.equal(body.classList.contains('export-printing'), true);
  assert.equal(windowObject.listenerCount('afterprint'), 1);

  await windowObject.emit('afterprint');
  assert.equal(container.children.length, 0);
  assert.equal(container.getAttribute('aria-hidden'), 'true');
  assert.equal(body.classList.contains('export-printing'), false);
  assert.equal(windowObject.listenerCount('afterprint'), 0);
});

test('initializePdfExport mostra errore testuale e ripristina il bottone', async () => {
  const { body, documentObject, windowObject } = createPdfExportDom();
  const button = new FakeElement();
  button.textContent = 'Esporta PDF';
  const status = new FakeElement({ classes: ['visually-hidden'] });
  const container = new FakeElement();
  container.setAttribute('aria-hidden', 'true');
  let printCalls = 0;

  initializePdfExport({
    button,
    status,
    container,
    documentObject,
    windowObject,
    fetchExport: async () => ({ ok: false }),
    print() {
      printCalls += 1;
    }
  });

  await button.emit('click');

  assert.equal(printCalls, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.equal(button.textContent, 'Esporta PDF');
  assert.equal(status.textContent, 'Impossibile preparare il PDF.');
  assert.equal(status.classList.contains('visually-hidden'), false);
  assert.equal(status.classList.contains('pdf-export-status--error'), true);
  assert.equal(container.getAttribute('aria-hidden'), 'true');
  assert.equal(container.children.length, 0);
  assert.equal(body.classList.contains('export-printing'), false);
  assert.equal(windowObject.listenerCount('afterprint'), 0);
});
