import { normalizeRoutePath } from './routes.js';
import { cleanupVisuals, renderVisuals as renderDocumentVisuals } from './visuals.js';

function decodeFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

export function normalizeRoutePathname(pathname) {
  return normalizeRoutePath(pathname);
}

export function exportNamespace(index) {
  return `pdf-document-${index + 1}`;
}

export function buildRouteTargets(documents, documentTargets) {
  const targets = new Map();
  documents.forEach((document, index) => {
    const route = normalizeRoutePathname(document.route);
    if (!targets.has(route)) targets.set(route, documentTargets[index]);
  });
  documents.forEach((document, index) => {
    document.aliases.forEach((alias) => {
      const route = normalizeRoutePathname(alias);
      if (!targets.has(route)) targets.set(route, documentTargets[index]);
    });
  });
  return targets;
}

export function exportTargetForHref(href, currentRoute, routeNamespaces, origin = window.location.origin) {
  if (!href) return null;

  let url;
  try {
    url = new URL(href, new URL(currentRoute, origin));
  } catch {
    return null;
  }

  if (url.origin !== origin) return null;
  let normalizedPathname;
  try {
    normalizedPathname = normalizeRoutePathname(url.pathname);
  } catch {
    return null;
  }
  const routeTarget = routeNamespaces.get(normalizedPathname);
  if (!routeTarget) return null;
  const namespace = typeof routeTarget === 'string' ? routeTarget : routeTarget.namespace;
  const fragment = decodeFragment(url.hash.slice(1));
  if (!fragment) return `#${namespace}`;
  const namespacedFragment = typeof routeTarget === 'string'
    ? `${namespace}--${fragment}`
    : routeTarget.idReferences.get(fragment) ?? `${namespace}--${fragment}`;
  return `#${namespacedFragment}`;
}

export function rewriteIdReferenceValue(value, idReferences) {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => idReferences.get(token) ?? token)
    .join(' ');
}

export function namespaceSectionIds(section, namespace) {
  const idReferences = new Map();
  const elements = [...section.querySelectorAll('[id]')];

  elements.forEach((element) => {
    const previousId = element.id;
    const namespacedId = `${namespace}--${previousId}`;
    idReferences.set(previousId, namespacedId);
    if (previousId.startsWith('doc-') && !idReferences.has(previousId.slice(4))) {
      idReferences.set(previousId.slice(4), namespacedId);
    }
  });
  elements.forEach((element) => {
    element.id = idReferences.get(element.id);
  });

  const idReferenceAttributes = [
    'aria-labelledby',
    'aria-describedby',
    'aria-controls',
    'aria-owns',
    'headers',
    'for'
  ];
  const selector = idReferenceAttributes.map((attribute) => `[${attribute}]`).join(', ');
  section.querySelectorAll(selector).forEach((element) => {
    idReferenceAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      element.setAttribute(attribute, rewriteIdReferenceValue(element.getAttribute(attribute), idReferences));
    });
  });

  return idReferences;
}

export function resolveExportAssetUrl(value, assetBase, origin = window.location.origin) {
  if (!value || value.startsWith('#')) return null;

  try {
    const originUrl = new URL(origin);
    const resolved = new URL(value, new URL(assetBase, originUrl));
    return resolved.origin === originUrl.origin ? resolved.href : null;
  } catch {
    return null;
  }
}

export function rewriteExportSrcset(srcset, assetBase, origin = window.location.origin) {
  const candidates = [];
  let index = 0;

  while (index < srcset.length) {
    while (index < srcset.length && /[\s,]/.test(srcset[index])) index += 1;
    if (index >= srcset.length) break;

    const urlStart = index;
    const isDataUrl = srcset.slice(index, index + 5).toLowerCase() === 'data:';
    while (index < srcset.length && !/\s/.test(srcset[index]) && (isDataUrl || srcset[index] !== ',')) index += 1;
    const url = srcset.slice(urlStart, index);

    while (index < srcset.length && /\s/.test(srcset[index])) index += 1;
    const descriptorStart = index;
    while (index < srcset.length && srcset[index] !== ',') index += 1;
    const descriptor = srcset.slice(descriptorStart, index).trim();
    if (srcset[index] === ',') index += 1;

    const resolved = resolveExportAssetUrl(url, assetBase, origin) ?? url;
    candidates.push(descriptor ? `${resolved} ${descriptor}` : resolved);
  }

  return candidates.join(', ');
}

function rewriteDocumentAssets(section, documentEntry, origin) {
  const urlAttributes = [
    ['img[src]', 'src'],
    ['source[src]', 'src'],
    ['video[src]', 'src'],
    ['video[poster]', 'poster'],
    ['audio[src]', 'src'],
    ['track[src]', 'src'],
    ['object[data]', 'data'],
    ['iframe[src]', 'src'],
    ['embed[src]', 'src'],
    ['input[src]', 'src'],
    ['image[href]', 'href']
  ];

  for (const [selector, attribute] of urlAttributes) {
    section.querySelectorAll(selector).forEach((element) => {
      const resolved = resolveExportAssetUrl(element.getAttribute(attribute), documentEntry.assetBase, origin);
      if (resolved) element.setAttribute(attribute, resolved);
    });
  }

  section.querySelectorAll('img[srcset], source[srcset]').forEach((element) => {
    element.setAttribute('srcset', rewriteExportSrcset(element.getAttribute('srcset'), documentEntry.assetBase, origin));
  });
}

function rewriteDocument(section, documentEntry, routeNamespaces, origin) {
  section.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    const target = exportTargetForHref(href, documentEntry.route, routeNamespaces, origin);
    const assetUrl = resolveExportAssetUrl(href, documentEntry.assetBase, origin);
    if (target) link.setAttribute('href', target);
    else if (assetUrl) link.setAttribute('href', assetUrl);
  });
  rewriteDocumentAssets(section, documentEntry, origin);
}

export function buildPrintExport(snapshot, container, documentObject, origin) {
  const sections = snapshot.documents.map((documentEntry, index) => {
    const namespace = exportNamespace(index);
    const section = documentObject.createElement('section');
    section.className = 'print-export__document document';
    section.id = namespace;
    section.innerHTML = documentEntry.html;
    return {
      section,
      target: { namespace, idReferences: namespaceSectionIds(section, namespace) }
    };
  });
  const routeNamespaces = buildRouteTargets(snapshot.documents, sections.map(({ target }) => target));

  const navigationSection = documentObject.createElement('section');
  navigationSection.className = 'print-export__navigation';
  const navigationTitle = documentObject.createElement('h1');
  navigationTitle.textContent = 'Indice';
  navigationSection.append(navigationTitle);
  navigationSection.insertAdjacentHTML('beforeend', snapshot.navigation);
  navigationSection.querySelectorAll('a[href]').forEach((link) => {
    const target = exportTargetForHref(link.getAttribute('href'), '/', routeNamespaces, origin);
    if (target) link.setAttribute('href', target);
  });

  const fragment = documentObject.createDocumentFragment();
  fragment.append(navigationSection);
  snapshot.documents.forEach((documentEntry, index) => {
    const { section } = sections[index];
    rewriteDocument(section, documentEntry, routeNamespaces, origin);
    fragment.append(section);
  });
  container.replaceChildren(fragment);
}

export async function waitForExportImages(container) {
  const images = [...container.querySelectorAll('img')];
  await Promise.all(images.map(async (image) => {
    if (typeof image.decode === 'function') {
      try {
        await image.decode();
        return;
      } catch {
        // Broken images still need to let printing proceed.
      }
    }
    if (image.complete) return;
    await new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
}

export function setExportContainerActive(container, active) {
  if (active) container.removeAttribute('aria-hidden');
  else container.setAttribute('aria-hidden', 'true');
}

export function setExportLifecycle(body, container, active) {
  body.classList.toggle('export-printing', active);
  setExportContainerActive(container, active);
}

export function initializePdfExport({
  button,
  status,
  container,
  fetchExport = fetch,
  documentObject = document,
  windowObject = window,
  print = () => windowObject.print(),
  renderVisuals = renderDocumentVisuals
}) {
  let cleanup = () => {};

  button.addEventListener('click', async () => {
    cleanup();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Preparazione PDF\u2026';
    status.classList.add('visually-hidden');
    status.classList.remove('pdf-export-status--error');
    status.textContent = 'Preparazione del documento per la stampa.';

    try {
      const response = await fetchExport('/__export', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Impossibile preparare il PDF.');
      const snapshot = await response.json();
      buildPrintExport(snapshot, container, documentObject, windowObject.location.origin);
      setExportLifecycle(documentObject.body, container, true);
      status.textContent = 'Documento pronto. Usa il dialogo di stampa per salvarlo come PDF.';
      cleanup = () => {
        windowObject.removeEventListener('afterprint', cleanup);
        cleanupVisuals(container);
        setExportLifecycle(documentObject.body, container, false);
        container.replaceChildren();
        cleanup = () => {};
      };
      if (documentObject.fonts?.ready) await documentObject.fonts.ready;
      await renderVisuals(container, { documentObject, print: true });
      await waitForExportImages(container);
      windowObject.addEventListener('afterprint', cleanup, { once: true });
      print();
    } catch (error) {
      cleanup();
      status.classList.remove('visually-hidden');
      status.classList.add('pdf-export-status--error');
      status.textContent = error instanceof Error ? error.message : 'Impossibile preparare il PDF.';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = 'Esporta PDF';
    }
  });
}
