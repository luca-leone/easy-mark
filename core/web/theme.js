export const themeStorageKey = 'documentation-theme';

export function resolveTheme(storedTheme, prefersDark) {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return prefersDark ? 'dark' : 'light';
}

export function oppositeTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function initializeTheme({ root, button, storage, mediaQuery }) {
  let theme = resolveTheme(storage.getItem(themeStorageKey), mediaQuery.matches);

  function apply(nextTheme, persist = false) {
    theme = nextTheme;
    root.dataset.theme = theme;
    button.dataset.theme = theme;
    button.setAttribute('aria-label', theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro');
    if (persist) storage.setItem(themeStorageKey, theme);
  }

  button.addEventListener('click', () => apply(oppositeTheme(theme), true));
  apply(theme);
  return { getTheme: () => theme };
}
