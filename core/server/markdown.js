import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { routeFromSegments } from '../web/routes.js';

const headingIdPrefix = 'doc-';
const searchSeparatorTagNames = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'caption', 'dd', 'details', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);
const schema = {
  ...defaultSchema,
  clobberPrefix: headingIdPrefix,
  tagNames: [...defaultSchema.tagNames, 'label'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'ariaControls',
      'ariaDescribedBy',
      'ariaLabelledBy',
      'ariaOwns'
    ],
    a: [...(defaultSchema.attributes?.a ?? []), 'ariaCurrent'],
    h1: [...(defaultSchema.attributes?.h1 ?? []), 'id'],
    h2: [...(defaultSchema.attributes?.h2 ?? []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 ?? []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 ?? []), 'id'],
    h5: [...(defaultSchema.attributes?.h5 ?? []), 'id'],
    h6: [...(defaultSchema.attributes?.h6 ?? []), 'id']
  }
};

function textContent(node) {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(textContent).join('');
}

function collectSanitizedSearchText() {
  return (tree, file) => {
    const parts = [];

    function collect(node) {
      if (node.type === 'text') {
        parts.push(node.value);
        return;
      }
      if (node.type !== 'root' && node.type !== 'element') return;

      const separated = node.type === 'element' && searchSeparatorTagNames.has(node.tagName);
      if (separated) parts.push(' ');
      for (const child of node.children ?? []) collect(child);
      if (separated) parts.push(' ');
    }

    collect(tree);
    file.data.searchText = parts.join('').replace(/\s+/gu, ' ').trim();
  };
}

function splitUrl(url) {
  const match = url.match(/^([^?#]*)([?#].*)?$/);
  return { pathname: match?.[1] ?? url, suffix: match?.[2] ?? '' };
}

function isExternal(url) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);
}

function documentRoute(relativeMarkdownPath) {
  const posixPath = relativeMarkdownPath.split(path.sep).join('/');
  const segments = posixPath.split('/');
  segments[segments.length - 1] = segments.at(-1).replace(/\.md$/i, '');
  return routeFromSegments(segments);
}

function titleRoute(relativeMarkdownPath, title) {
  const posixPath = relativeMarkdownPath.split(path.sep).join('/');
  const directory = path.posix.dirname(posixPath);
  const titleSlug = new GithubSlugger().slug(title) || path.posix.basename(posixPath, '.md');
  const segments = directory === '.' ? [titleSlug] : [...directory.split('/'), titleSlug];
  return routeFromSegments(segments);
}

function collectMetadataAndRewriteLinks({ relativePath, headings }) {
  return (tree) => {
    const slugger = new GithubSlugger();

    visit(tree, 'heading', (node) => {
      const title = textContent(node).trim();
      const id = slugger.slug(title || 'section');
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      headings.push({ depth: node.depth, title, id: `${headingIdPrefix}${id}` });
    });

    visit(tree, 'link', (node) => {
      if (!node.url || isExternal(node.url)) return;
      const { pathname, suffix } = splitUrl(node.url);
      if (!/\.md$/i.test(pathname)) return;

      const currentDirectory = path.posix.dirname(relativePath.split(path.sep).join('/'));
      let decodedPathname;
      try {
        decodedPathname = pathname.split('/').map((segment) => decodeURIComponent(segment)).join('/');
      } catch {
        return;
      }
      const target = path.posix.normalize(path.posix.join(currentDirectory, decodedPathname));
      if (target === '..' || target.startsWith('../')) return;
      node.url = `${documentRoute(target)}${suffix}`;
    });
  };
}

export async function compileMarkdown(markdown, relativePath) {
  const headings = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(collectMetadataAndRewriteLinks, { relativePath, headings })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(collectSanitizedSearchText)
    .use(rehypeStringify);

  const file = await processor.process(markdown);
  const html = String(file);
  const fallbackTitle = path.basename(relativePath, path.extname(relativePath));
  const title = headings.find((heading) => heading.depth === 1)?.title || fallbackTitle;
  const sourceRoute = documentRoute(relativePath);

  return {
    html,
    headings,
    route: titleRoute(relativePath, title),
    searchText: file.data.searchText,
    sourceRoute,
    title
  };
}
