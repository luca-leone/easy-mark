const logoExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);

export const defaultProjectMetadata = Object.freeze({ title: 'Easy Mark', logo: '/logo.svg' });

export function createDefaultProjectMetadata(title = defaultProjectMetadata.title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('--title deve essere una stringa non vuota');
  }
  return { title: title.trim(), logo: defaultProjectMetadata.logo };
}

function normalizeLogoPath(value, sourceName) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${sourceName}: logo deve essere null o un path locale non vuoto`);
  }

  const logo = value.trim();
  if (!logo.startsWith('/') || logo.startsWith('//') || /[?#\\\u0000-\u001f\u007f]/u.test(logo)) {
    throw new Error(`${sourceName}: logo deve essere un path locale root-relative`);
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(logo);
  } catch {
    throw new Error(`${sourceName}: logo contiene percent-encoding non valido`);
  }

  const segments = decodedPath.slice(1).split('/');
  if (segments.length === 0 || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`${sourceName}: logo contiene segmenti non validi`);
  }
  if (segments[0].startsWith('__')) {
    throw new Error(`${sourceName}: logo usa un namespace riservato`);
  }

  const extension = segments.at(-1).match(/\.[^.]+$/u)?.[0].toLowerCase();
  if (!logoExtensions.has(extension)) {
    throw new Error(`${sourceName}: logo deve usare un formato immagine supportato`);
  }

  return `/${segments.map(encodeURIComponent).join('/')}`;
}

export function parseProjectMetadata(contents, {
  sourceName = 'manifest.json',
  fallbackMetadata = defaultProjectMetadata
} = {}) {
  let manifest;
  try {
    manifest = JSON.parse(contents);
  } catch {
    throw new Error(`${sourceName}: JSON non valido`);
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`${sourceName}: la radice deve essere un oggetto`);
  }

  if (manifest.title !== undefined && (typeof manifest.title !== 'string' || manifest.title.trim() === '')) {
    throw new Error(`${sourceName}: title deve essere una stringa non vuota`);
  }

  return {
    title: manifest.title === undefined ? fallbackMetadata.title : manifest.title.trim(),
    logo: manifest.logo === undefined ? fallbackMetadata.logo : normalizeLogoPath(manifest.logo, sourceName)
  };
}
