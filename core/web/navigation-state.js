import { normalizeRoutePath, routeKey } from './routes.js';

export function findDocument(manifest, pathname) {
  let route;
  try {
    route = routeKey(pathname);
  } catch {
    return undefined;
  }
  return manifest.find((document) =>
    routeKey(document.route) === route || document.aliases.some((alias) => routeKey(alias) === route)
  );
}

export function currentLinkState(linkUrl, documentRoute, currentHash) {
  const url = new URL(linkUrl, 'http://localhost');
  if (normalizeRoutePath(url.pathname) !== normalizeRoutePath(documentRoute)) return null;
  if (url.hash) return url.hash === currentHash ? 'location' : null;
  return currentHash ? null : 'page';
}
