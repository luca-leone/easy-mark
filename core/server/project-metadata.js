export const defaultProjectMetadata = Object.freeze({ title: 'easy-mark' });

export function parseProjectMetadata(contents) {
  let manifest;
  try {
    manifest = JSON.parse(contents);
  } catch {
    throw new Error('src/manifest.json: JSON non valido');
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('src/manifest.json: la radice deve essere un oggetto');
  }

  if (typeof manifest.title !== 'string' || manifest.title.trim() === '') {
    throw new Error('src/manifest.json: title deve essere una stringa non vuota');
  }

  return { title: manifest.title.trim() };
}
