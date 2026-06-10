function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function capitalizeMenuLabel(value) {
  return value.replace(/(^|\s)([^\p{L}]*)(\p{Ll})/gu, (match, spacing, prefix, letter) =>
    `${spacing}${prefix}${letter.toLocaleUpperCase()}`
  );
}

function renderHeadingList(headings, startIndex = 0, parentDepth = 0) {
  let html = '<ol>';
  let index = startIndex;

  while (index < headings.length) {
    const heading = headings[index];
    if (heading.depth <= parentDepth) break;

    html += `<li><a href="${escapeHtml(heading.route)}#${encodeURIComponent(heading.id)}">${escapeHtml(capitalizeMenuLabel(heading.title))}</a>`;
    index += 1;

    if (index < headings.length && headings[index].depth > heading.depth) {
      const result = renderHeadingList(headings, index, heading.depth);
      html += result.html;
      index = result.nextIndex;
    }

    html += '</li>';
  }

  html += '</ol>';
  return { html, nextIndex: index };
}

function renderHeadings(document) {
  if (document.headings.length === 0) return '';
  const titleHeadingIndex = document.headings.findIndex((heading) => heading.depth === 1);
  const headings = document.headings
    .filter((heading, index) => index !== titleHeadingIndex)
    .map((heading) => ({ ...heading, route: document.route }));
  if (headings.length === 0) return '';
  const result = renderHeadingList(headings);
  return result.html.replace('<ol>', '<ol class="navigation__headings">');
}

export function renderNavigation(documents) {
  const items = documents.map((document) => `
    <li class="navigation__document">
      <a href="${escapeHtml(document.route)}">${escapeHtml(capitalizeMenuLabel(document.title))}</a>
      ${renderHeadings(document)}
    </li>`).join('');

  return `<nav class="navigation" aria-label="Documentazione"><ol>${items}</ol></nav>`;
}
