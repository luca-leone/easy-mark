export function getFocusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden);
}

export const sidebarStorageKey = 'documentation-sidebar-collapsed';

export function resolveSidebarMode({ mobile }) {
  if (mobile) return 'mobile';
  return 'inline';
}

export function initializeSidebar({
  sidebar,
  openButton,
  closeButton,
  backdrop,
  mobileQuery,
  storage,
  body = document.body,
  documentObject = document
}) {
  let mobileOpen = false;
  let compactCollapsed = storage.getItem(sidebarStorageKey) === 'true';

  function mode() {
    return resolveSidebarMode({ mobile: mobileQuery.matches });
  }

  function apply({ restoreFocus = false, focusDrawer = false } = {}) {
    const currentMode = mode();
    const drawerOpen = currentMode === 'mobile' && mobileOpen;
    const collapsed = currentMode === 'inline' && compactCollapsed;
    const expanded = (currentMode === 'inline' && !collapsed) || drawerOpen;

    body.classList.toggle('sidebar-open', drawerOpen);
    body.classList.toggle('sidebar-collapsed', collapsed);
    sidebar.classList.toggle('is-open', drawerOpen);
    sidebar.setAttribute('aria-hidden', String(!expanded));
    backdrop.classList.toggle('is-visible', drawerOpen);
    openButton.setAttribute('aria-expanded', String(expanded));
    openButton.setAttribute('aria-label', expanded ? 'Chiudi navigazione' : 'Apri navigazione');

    if (focusDrawer && drawerOpen) closeButton.focus();
    else if (restoreFocus) openButton.focus();
  }

  function toggle() {
    const currentMode = mode();
    if (currentMode === 'mobile') {
      mobileOpen = !mobileOpen;
      apply({ restoreFocus: !mobileOpen, focusDrawer: mobileOpen });
    } else if (currentMode === 'inline') {
      compactCollapsed = !compactCollapsed;
      storage.setItem(sidebarStorageKey, String(compactCollapsed));
      apply();
    }
  }

  function close(restoreFocus = true) {
    if (mode() !== 'mobile' || !mobileOpen) return;
    mobileOpen = false;
    apply({ restoreFocus });
  }

  openButton.addEventListener('click', toggle);
  closeButton.addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) close(false);
  });

  documentObject.addEventListener('keydown', (event) => {
    if (mode() !== 'mobile' || !mobileOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(sidebar);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && documentObject.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && documentObject.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function handleBreakpointChange() {
    mobileOpen = false;
    apply();
  }

  mobileQuery.addEventListener('change', handleBreakpointChange);
  apply();
  return {
    close,
    getMode: mode,
    isExpanded: () => openButton.getAttribute('aria-expanded') === 'true',
    toggle
  };
}
