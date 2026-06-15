import { hashToElementId } from './url.js';
import { currentLinkState, findDocument } from './navigation-state.js';
import { initializeReadingProgress } from './reading-progress.js';
import { initializePdfExport } from './pdf-export.js';
import { initializeSidebar } from './sidebar.js';
import { initializeSearch } from './search.js';
import { initializeTheme } from './theme.js';
import { formatPageTitle } from './page-title.js';

const content = document.querySelector('#content');
const manifest = JSON.parse(document.querySelector('#document-manifest').textContent);
const projectMetadata = JSON.parse(document.querySelector('#project-manifest')?.textContent ?? '{"title":"Easy Mark"}');
const sidebarController = initializeSidebar({
  sidebar: document.querySelector('#app-sidebar'),
  openButton: document.querySelector('#menu-toggle'),
  closeButton: document.querySelector('#menu-close'),
  backdrop: document.querySelector('#sidebar-backdrop'),
  mobileQuery: matchMedia('(max-width: 899px)'),
  storage: localStorage
});
const readingProgress = initializeReadingProgress({
  content,
  progress: document.querySelector('#reading-progress')
});
initializeTheme({
  root: document.documentElement,
  button: document.querySelector('#theme-toggle'),
  storage: localStorage,
  mediaQuery: matchMedia('(prefers-color-scheme: dark)')
});
initializePdfExport({
  button: document.querySelector('#pdf-export'),
  status: document.querySelector('#pdf-export-status'),
  container: document.querySelector('#print-export')
});

const searchController = initializeSearch({
  manifest,
  elements: {
    launcher: document.querySelector('#search-launcher'),
    overlay: document.querySelector('#search-overlay'),
    dialog: document.querySelector('#search-dialog'),
    input: document.querySelector('#search-input'),
    results: document.querySelector('#search-results'),
    emptyMessage: document.querySelector('#search-empty'),
    clearButton: document.querySelector('#search-clear'),
    closeButton: document.querySelector('#search-close'),
    backdrop: document.querySelector('#search-backdrop')
  },
  closeSidebar: sidebarController.close,
  onNavigate(route) {
    history.pushState({}, '', route);
    render(route).catch(showError);
  }
});

function currentRoute() {
  return findDocument(manifest, window.location.pathname)?.route ?? manifest[0]?.route;
}

async function render(route, { push = false } = {}) {
  if (!route) {
    content.innerHTML = '<h1>Nessun documento disponibile</h1>';
    return;
  }

  const response = await fetch(`/__content${route}`);
  if (!response.ok) throw new Error(`Impossibile caricare ${route}`);
  content.innerHTML = await response.text();

  const targetUrl = `${route}${window.location.hash}`;
  if (push) history.pushState({}, '', targetUrl);
  else if (window.location.pathname !== route) history.replaceState({}, '', targetUrl);

  document.querySelectorAll('.navigation a').forEach((link) => {
    link.removeAttribute('aria-current');
    const state = currentLinkState(link.href, route, window.location.hash);
    if (state) link.setAttribute('aria-current', state);
  });

  document.title = formatPageTitle(
    manifest.find((document) => document.route === route)?.title,
    projectMetadata.title
  );
  if (!searchController?.isOpen()) {
    const headingId = hashToElementId(window.location.hash);
    if (headingId) document.getElementById(headingId)?.scrollIntoView();
    else content.focus({ preventScroll: true });
  }
  readingProgress.reset();
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || link.origin !== window.location.origin || event.defaultPrevented) return;
  const document = findDocument(manifest, link.pathname);
  if (!document) return;
  event.preventDefault();
  sidebarController.close(false);
  const hash = link.hash;
  history.pushState({}, '', `${document.route}${hash}`);
  render(document.route).catch(showError);
});

window.addEventListener('popstate', () => render(currentRoute()).catch(showError));

function showError(error) {
  content.replaceChildren();
  const title = document.createElement('h1');
  const message = document.createElement('p');
  title.textContent = 'Errore';
  message.textContent = error.message;
  content.append(title, message);
}

render(currentRoute()).catch(showError);
new EventSource('/__events').addEventListener('reload', () => window.location.reload());
