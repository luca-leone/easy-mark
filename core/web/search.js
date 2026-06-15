const requiredElementNames = [
  'launcher',
  'overlay',
  'dialog',
  'input',
  'results',
  'emptyMessage',
  'clearButton',
  'closeButton',
  'backdrop'
];

const snippetLimit = 180;
const snippetLeadingTarget = 60;

function decodeSearchPath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeSearchText(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function queryTokens(normalizedQuery) {
  return [...new Set(normalizedQuery.split(' ').filter(Boolean))];
}

export function createSearchIndex(manifest) {
  return manifest.map((document, manifestIndex) => {
    const title = normalizeSearchText(document.title);
    const route = normalizeSearchText(decodeSearchPath(document.route));
    const aliases = (document.aliases ?? []).map((alias) => normalizeSearchText(decodeSearchPath(alias)));
    const body = normalizeSearchText(document.text);
    return {
      document,
      manifestIndex,
      title,
      titleWords: title.split(' ').filter(Boolean),
      route,
      aliases,
      body,
      metadataFields: [title, route, ...aliases],
      searchableFields: [title, route, ...aliases, body]
    };
  });
}

function includesAllTokens(value, tokens) {
  return tokens.every((token) => value.includes(token));
}

function fieldsIncludeAllTokens(fields, tokens) {
  return tokens.every((token) => fields.some((field) => field.includes(token)));
}

export function matchSearchEntry(entry, normalizedQuery) {
  if (!normalizedQuery) return { rank: 9, matchSource: 'all', bodyRequired: false };
  const tokens = queryTokens(normalizedQuery);
  if (!fieldsIncludeAllTokens(entry.searchableFields, tokens)) return null;
  if (entry.title === normalizedQuery) return { rank: 0, matchSource: 'title-exact', bodyRequired: false };
  if (entry.title.startsWith(normalizedQuery)) return { rank: 1, matchSource: 'title-prefix', bodyRequired: false };
  if (tokens.every((token) => entry.titleWords.some((word) => word.startsWith(token)))) {
    return { rank: 2, matchSource: 'title-word-prefix', bodyRequired: false };
  }
  if (includesAllTokens(entry.title, tokens)) return { rank: 3, matchSource: 'title', bodyRequired: false };
  if (includesAllTokens(entry.route, tokens)) return { rank: 4, matchSource: 'route', bodyRequired: false };
  if (entry.aliases.some((alias) => includesAllTokens(alias, tokens))) {
    return { rank: 5, matchSource: 'alias', bodyRequired: false };
  }
  if (entry.body.includes(normalizedQuery)) return { rank: 6, matchSource: 'body-phrase', bodyRequired: true };
  if (includesAllTokens(entry.body, tokens)) return { rank: 7, matchSource: 'body', bodyRequired: true };
  const bodyRequired = !fieldsIncludeAllTokens(entry.metadataFields, tokens);
  return { rank: 8, matchSource: bodyRequired ? 'mixed-body' : 'mixed-metadata', bodyRequired };
}

export function rankSearchEntry(entry, normalizedQuery) {
  return matchSearchEntry(entry, normalizedQuery)?.rank ?? null;
}

function normalizeWithCodePointMap(value) {
  const source = [...String(value ?? '')];
  const normalized = [];
  const sourceIndexes = [];
  let pendingWhitespaceIndex = null;

  for (const [sourceIndex, character] of source.entries()) {
    const piece = character.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
    for (const normalizedCharacter of piece) {
      if (/\s/u.test(normalizedCharacter)) {
        if (normalized.length > 0 && pendingWhitespaceIndex === null) pendingWhitespaceIndex = sourceIndex;
        continue;
      }
      if (pendingWhitespaceIndex !== null) {
        normalized.push(' ');
        sourceIndexes.push(pendingWhitespaceIndex);
        pendingWhitespaceIndex = null;
      }
      normalized.push(normalizedCharacter);
      sourceIndexes.push(sourceIndex);
    }
  }

  return { source, normalized, sourceIndexes };
}

function findSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  outer: for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function locateSnippetMatch(text, normalizedQuery) {
  const mapped = normalizeWithCodePointMap(text);
  const tokens = queryTokens(normalizedQuery);
  const candidates = [[...normalizedQuery], ...tokens.map((token) => [...token])];

  for (const candidate of candidates) {
    const normalizedIndex = findSequence(mapped.normalized, candidate);
    if (normalizedIndex === -1) continue;
    return {
      source: mapped.source,
      start: mapped.sourceIndexes[normalizedIndex],
      end: mapped.sourceIndexes[normalizedIndex + candidate.length - 1] + 1
    };
  }
  return null;
}

function preferWhitespaceBoundaries(source, start, end, matchStart, matchEnd) {
  let preferredStart = start;
  let preferredEnd = end;

  if (preferredStart > 0 && !/\s/u.test(source[preferredStart - 1]) && !/\s/u.test(source[preferredStart])) {
    const whitespace = source.findIndex((character, index) => index >= preferredStart && index < matchStart && /\s/u.test(character));
    if (whitespace !== -1) preferredStart = whitespace + 1;
  }
  if (preferredEnd < source.length && !/\s/u.test(source[preferredEnd - 1]) && !/\s/u.test(source[preferredEnd])) {
    for (let index = preferredEnd - 1; index >= matchEnd; index -= 1) {
      if (/\s/u.test(source[index])) {
        preferredEnd = index;
        break;
      }
    }
  }
  return { start: preferredStart, end: preferredEnd };
}

export function createSearchSnippet(text, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;
  const match = locateSnippetMatch(text, normalizedQuery);
  if (!match) return null;
  const { source, start: matchStart, end: matchEnd } = match;
  if (source.length <= snippetLimit) return source.join('');

  const matchLength = matchEnd - matchStart;
  if (matchLength >= snippetLimit) {
    const leftEllipsis = matchStart > 0 ? '…' : '';
    const available = snippetLimit - leftEllipsis.length - 1;
    const snippetEnd = Math.min(source.length, matchStart + available);
    const rightEllipsis = snippetEnd < source.length ? '…' : '';
    return `${leftEllipsis}${source.slice(matchStart, snippetEnd).join('')}${rightEllipsis}`;
  }
  let before = Math.min(snippetLeadingTarget, matchStart, Math.max(0, snippetLimit - matchLength));
  let after = 0;

  for (let pass = 0; pass < 3; pass += 1) {
    const leftTruncated = before < matchStart;
    const baseLength = before + matchLength + (leftTruncated ? 1 : 0);
    after = Math.min(source.length - matchEnd, Math.max(0, snippetLimit - baseLength));
    const rightTruncated = after < source.length - matchEnd;
    if (rightTruncated && baseLength + after + 1 > snippetLimit) after -= 1;
    const used = before + matchLength + after + (leftTruncated ? 1 : 0) + (rightTruncated ? 1 : 0);
    before += Math.min(matchStart - before, Math.max(0, snippetLimit - used));
  }

  let snippetStart = matchStart - before;
  let snippetEnd = matchEnd + after;
  ({ start: snippetStart, end: snippetEnd } = preferWhitespaceBoundaries(
    source,
    snippetStart,
    snippetEnd,
    matchStart,
    matchEnd
  ));

  const leftEllipsis = snippetStart > 0 ? '…' : '';
  const rightEllipsis = snippetEnd < source.length ? '…' : '';
  return `${leftEllipsis}${source.slice(snippetStart, snippetEnd).join('').trim()}${rightEllipsis}`;
}

export function searchDocuments(index, query) {
  const normalizedQuery = normalizeSearchText(query);
  return index
    .map((entry) => ({ entry, match: matchSearchEntry(entry, normalizedQuery) }))
    .filter(({ match }) => match !== null)
    .sort((left, right) => left.match.rank - right.match.rank || left.entry.manifestIndex - right.entry.manifestIndex)
    .map(({ entry, match }) => ({
      document: entry.document,
      rank: match.rank,
      matchSource: match.matchSource,
      snippet: match.bodyRequired ? createSearchSnippet(entry.document.text, normalizedQuery) : null
    }));
}

export function getSearchFocusableElements(container) {
  return [...container.querySelectorAll('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden);
}

function hasCompleteElements(elements) {
  return requiredElementNames.every((name) => elements?.[name]);
}

function disableIncompleteSearch(elements) {
  if (elements?.launcher) {
    elements.launcher.hidden = true;
    const launcherContainer = elements.launcher.parentElement;
    if (launcherContainer?.classList?.contains('app-header__search')) launcherContainer.hidden = true;
  }
  if (elements?.overlay) elements.overlay.hidden = true;
}

export function initializeSearch({
  manifest,
  elements,
  onNavigate,
  closeSidebar = () => {},
  body = document.body,
  documentObject = document
}) {
  if (!Array.isArray(manifest) || !hasCompleteElements(elements) || typeof onNavigate !== 'function') {
    disableIncompleteSearch(elements);
    return null;
  }

  const {
    launcher,
    overlay,
    dialog,
    input,
    results,
    emptyMessage,
    clearButton,
    closeButton,
    backdrop
  } = elements;
  const index = createSearchIndex(manifest);
  let open = false;
  let activeIndex = -1;
  let renderedResults = [];
  let previousFocus = null;
  let restoringFocus = false;

  function setActiveIndex(nextIndex) {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (options.length === 0) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    activeIndex = Math.max(0, Math.min(nextIndex, options.length - 1));
    options.forEach((option, optionIndex) => {
      const selected = optionIndex === activeIndex;
      option.setAttribute('aria-selected', String(selected));
      if (selected) option.scrollIntoView?.({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', options[activeIndex].id);
  }

  function renderResults() {
    renderedResults = searchDocuments(index, input.value);
    results.replaceChildren();
    emptyMessage.hidden = renderedResults.length !== 0;
    clearButton.hidden = input.value.length === 0;

    for (const [resultIndex, result] of renderedResults.entries()) {
      const option = documentObject.createElement('div');
      const title = documentObject.createElement('span');
      option.id = `search-option-${resultIndex}`;
      option.className = 'search-result';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.resultIndex = String(resultIndex);
      title.className = 'search-result__title';
      title.textContent = result.document.title;
      option.append(title);
      if (result.snippet) {
        const snippet = documentObject.createElement('p');
        snippet.className = 'search-result__snippet';
        snippet.textContent = result.snippet;
        option.append(snippet);
      }
      results.append(option);
    }

    setActiveIndex(renderedResults.length === 0 ? -1 : 0);
  }

  function updateDraftQuery() {
    renderResults();
  }

  function commitQuery() {
    launcher.value = input.value;
  }

  function show() {
    if (open || restoringFocus) return;
    previousFocus = documentObject.activeElement;
    closeSidebar(false);
    open = true;
    overlay.hidden = false;
    body.classList.add('search-open');
    launcher.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-expanded', 'true');
    input.value = launcher.value;
    renderResults();
    input.focus();
    input.select?.();
  }

  function close(restoreFocus = true) {
    if (!open) return;
    commitQuery();
    open = false;
    overlay.hidden = true;
    body.classList.remove('search-open');
    launcher.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (restoreFocus && previousFocus?.focus) {
      restoringFocus = true;
      previousFocus.focus();
      restoringFocus = false;
    }
  }

  function selectResult(resultIndex = activeIndex) {
    const result = renderedResults[resultIndex];
    if (!result) return;
    close(false);
    onNavigate(result.document.route);
  }

  function clearQuery() {
    input.value = '';
    renderResults();
    input.focus();
  }

  launcher.addEventListener('focus', show);
  launcher.addEventListener('click', show);
  launcher.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      show();
    }
  });
  input.addEventListener('input', updateDraftQuery);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(activeIndex <= 0 ? renderedResults.length - 1 : activeIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(renderedResults.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectResult();
    }
  });
  results.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]');
    if (option && results.contains(option)) selectResult(Number(option.dataset.resultIndex));
  });
  clearButton.addEventListener('click', clearQuery);
  closeButton.addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  documentObject.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getSearchFocusableElements(dialog);
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
  documentObject.addEventListener('focusin', (event) => {
    if (open && !dialog.contains(event.target)) input.focus();
  });

  overlay.hidden = true;
  clearButton.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-expanded', 'false');
  return { close, isOpen: () => open, open: show, sync: updateDraftQuery };
}
