export function encodeRouteSegment(segment) {
  return encodeURIComponent(segment.normalize('NFC'));
}

export function routeFromSegments(segments) {
  const encoded = segments.filter((segment) => segment !== '').map(encodeRouteSegment);
  return encoded.length === 0 ? '/' : `/${encoded.join('/')}`;
}

export function normalizeRoutePath(route) {
  const pathname = route.replace(/^\/+|\/+$/g, '');
  if (!pathname) return '/';
  const segments = pathname.split('/').map((segment) => decodeURIComponent(segment));
  return routeFromSegments(segments);
}

export function routeKey(route) {
  return normalizeRoutePath(route);
}
