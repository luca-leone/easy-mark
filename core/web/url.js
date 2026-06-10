export function hashToElementId(hash) {
  if (!hash || hash === '#') return '';

  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}
