import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFocusableElements,
  initializeSidebar,
  resolveSidebarMode,
  sidebarStorageKey
} from '../core/web/sidebar.js';

test('filtra gli elementi nascosti dal ciclo di focus', () => {
  const visibleLink = { hidden: false };
  const hiddenButton = { hidden: true };
  const container = { querySelectorAll: () => [visibleLink, hiddenButton] };
  assert.deepEqual(getFocusableElements(container), [visibleLink]);
});

function fakeElement() {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  return {
    hidden: false,
    classList: {
      toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    addEventListener(name, listener) { listeners.set(name, listener); },
    dispatch(name, event = {}) { listeners.get(name)?.(event); },
    focus() {},
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, value); },
    querySelectorAll() { return []; }
  };
}

function fakeMediaQuery(matches) {
  const listeners = [];
  return {
    matches,
    addEventListener(name, listener) { if (name === 'change') listeners.push(listener); },
    setMatches(value) {
      this.matches = value;
      for (const listener of listeners) listener();
    }
  };
}

test('distingue drawer mobile e sidebar inline collassabile', () => {
  assert.equal(resolveSidebarMode({ mobile: true }), 'mobile');
  assert.equal(resolveSidebarMode({ mobile: false }), 'inline');
});

test('collassa e persiste la sidebar a ogni larghezza non mobile', () => {
  const sidebar = fakeElement();
  const openButton = fakeElement();
  const closeButton = fakeElement();
  const backdrop = fakeElement();
  const body = fakeElement();
  const mobileQuery = fakeMediaQuery(false);
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const documentObject = { activeElement: null, addEventListener() {} };
  const controller = initializeSidebar({
    sidebar,
    openButton,
    closeButton,
    backdrop,
    mobileQuery,
    storage,
    body,
    documentObject
  });

  assert.equal(controller.getMode(), 'inline');
  assert.equal(controller.isExpanded(), true);
  controller.toggle();
  assert.equal(controller.isExpanded(), false);
  assert.equal(values.get(sidebarStorageKey), 'true');
  assert.equal(body.classList.contains('sidebar-collapsed'), true);

  mobileQuery.setMatches(true);
  assert.equal(controller.getMode(), 'mobile');
  assert.equal(controller.isExpanded(), false);
  mobileQuery.setMatches(false);
  assert.equal(controller.getMode(), 'inline');
  assert.equal(controller.isExpanded(), false);
});
