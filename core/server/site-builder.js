import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { compileMarkdown } from './markdown.js';
import { renderNavigation } from './navigation.js';
import { normalizeRoutePath, routeFromSegments, routeKey } from '../web/routes.js';

const templatePaths = new Map([
  ['index.template.html', 'index.html'],
  ['styles.template.css', 'styles.css']
]);
const shellPlaceholders = ['<!-- NAVIGATION -->', '<!-- DOCUMENT_MANIFEST -->'];

function validateShellTemplate(contents, sourceName) {
  for (const placeholder of shellPlaceholders) {
    if (contents.split(placeholder).length !== 2) {
      throw new Error(`${sourceName} deve contenere esattamente una volta ${placeholder}`);
    }
  }
}

export function compareDocumentPaths(leftPath, rightPath) {
  const caseInsensitiveOrder = leftPath.localeCompare(rightPath, 'en', { sensitivity: 'base' });
  if (caseInsensitiveOrder !== 0) return caseInsensitiveOrder;
  if (leftPath < rightPath) return -1;
  if (leftPath > rightPath) return 1;
  return 0;
}

function documentAssetBase(relativePath) {
  const posixPath = relativePath.split(path.sep).join('/');
  const directory = path.posix.dirname(posixPath);
  if (directory === '.') return '/';
  return `${routeFromSegments(directory.split('/'))}/`;
}

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

export class SiteBuilder {
  constructor({
    sourceDirectory,
    webDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web')
  }) {
    this.sourceDirectory = path.resolve(sourceDirectory);
    this.webDirectory = path.resolve(webDirectory);
    this.virtualDirectory = path.resolve(this.sourceDirectory, '..', '.mem-fs', 'src');
    this.generatedDirectory = path.resolve(this.sourceDirectory, '..', '.mem-fs', 'generated');
    this.store = create();
    this.editor = createEditor(this.store);
    this.documents = new Map();
    this.bundledFiles = new Map();
    this.template = '';
  }

  virtualPath(relativePath) {
    return path.join(this.virtualDirectory, relativePath);
  }

  generatedPath(relativePath) {
    return path.join(this.generatedDirectory, relativePath);
  }

  relativePath(filePath) {
    return path.relative(this.sourceDirectory, path.resolve(filePath));
  }

  async build() {
    await this.validateWebTemplates();
    for (const filePath of await listFiles(this.webDirectory)) await this.copyBundledFile(filePath);
    for (const filePath of await listFiles(this.sourceDirectory)) await this.copySourceFile(filePath);
    if (this.documents.size === 0) throw new Error('La directory src deve contenere almeno un file Markdown.');
    this.renderShell();
  }

  async validateWebTemplates() {
    for (const relativePath of templatePaths.keys()) {
      try {
        await fs.access(path.join(this.webDirectory, relativePath));
      } catch {
        throw new Error(`Template applicativo mancante: core/web/${relativePath}`);
      }
    }
  }

  async copyBundledFile(filePath) {
    const webRelativePath = path.relative(this.webDirectory, filePath);
    if (webRelativePath.startsWith('..')) return;
    const relativePath = templatePaths.get(webRelativePath) ?? webRelativePath;
    const contents = await fs.readFile(filePath);
    if (relativePath === 'index.html') validateShellTemplate(contents.toString('utf8'), 'core/web/index.template.html');
    this.bundledFiles.set(relativePath, contents);
    this.editor.write(this.virtualPath(relativePath), contents);
    if (relativePath === 'index.html') this.template = contents.toString('utf8');
  }

  async copySourceFile(filePath) {
    const relativePath = this.relativePath(filePath);
    if (relativePath.startsWith('..')) return;
    const contents = await fs.readFile(filePath);
    if (relativePath === 'index.html') validateShellTemplate(contents.toString('utf8'), 'src/index.html');
    this.editor.write(this.virtualPath(relativePath), contents);
    if (relativePath === 'index.html') this.template = contents.toString('utf8');

    if (/\.md$/i.test(relativePath)) {
      const document = await compileMarkdown(contents.toString('utf8'), relativePath);
      const htmlPath = relativePath.replace(/\.md$/i, '.html');
      this.editor.write(this.generatedPath(htmlPath), document.html);
      this.documents.set(relativePath, {
        ...document,
        baseRoute: document.route,
        relativePath,
        htmlPath,
        assetBase: documentAssetBase(relativePath)
      });
    }
  }

  async handleFileEvent(eventName, filePath) {
    const relativePath = this.relativePath(filePath);
    if (relativePath.startsWith('..')) return;

    if (eventName === 'unlink' || eventName === 'unlinkDir') {
      const bundledContents = this.bundledFiles.get(relativePath);
      if (bundledContents) {
        this.editor.write(this.virtualPath(relativePath), bundledContents);
        if (relativePath === 'index.html') this.template = bundledContents.toString('utf8');
      } else {
        this.editor.delete(this.virtualPath(relativePath));
      }
      if (/\.md$/i.test(relativePath)) {
        this.editor.delete(this.generatedPath(relativePath.replace(/\.md$/i, '.html')));
        this.documents.delete(relativePath);
      }
    } else if (eventName === 'add' || eventName === 'change') {
      await this.copySourceFile(filePath);
    }

    if (this.documents.size === 0) throw new Error('La directory src deve contenere almeno un file Markdown.');
    this.renderShell();
  }

  getDocuments() {
    const documents = [...this.documents.values()].sort((left, right) =>
      compareDocumentPaths(left.relativePath, right.relativePath)
    );
    const canonicalBases = new Set(documents.map((document) => routeKey(document.baseRoute)));
    const assignedCanonicalRoutes = new Set();

    for (const document of documents) {
      const baseRoute = normalizeRoutePath(document.baseRoute);
      let route = baseRoute;
      let suffix = 2;
      while (assignedCanonicalRoutes.has(routeKey(route))) {
        route = `${baseRoute}-${suffix}`;
        suffix += 1;
        while (canonicalBases.has(routeKey(route)) || assignedCanonicalRoutes.has(routeKey(route))) {
          route = `${baseRoute}-${suffix}`;
          suffix += 1;
        }
      }
      document.route = route;
      assignedCanonicalRoutes.add(routeKey(route));
    }

    const assignedRoutes = new Set(assignedCanonicalRoutes);
    for (const document of documents) {
      const alias = normalizeRoutePath(document.sourceRoute);
      const aliasKey = routeKey(alias);
      if (aliasKey === routeKey(document.route) || assignedRoutes.has(aliasKey)) {
        document.aliases = [];
        continue;
      }
      document.aliases = [alias];
      assignedRoutes.add(aliasKey);
    }

    return documents;
  }

  renderShell() {
    const documents = this.getDocuments();
    const navigation = renderNavigation(documents);
    const manifest = JSON.stringify(documents.map(({ route, aliases, title }) => ({ route, aliases, title }))).replaceAll('<', '\\u003c');
    const shell = this.template
      .replace('<!-- NAVIGATION -->', navigation)
      .replace('<!-- DOCUMENT_MANIFEST -->', `<script id="document-manifest" type="application/json">${manifest}</script>`);
    this.editor.write(this.virtualPath('index.html'), shell);
  }

  read(relativePath) {
    const targetPath = this.virtualPath(relativePath);
    if (!this.editor.exists(targetPath)) return null;
    return this.editor.read(targetPath, { raw: true });
  }

  readGenerated(relativePath) {
    const targetPath = this.generatedPath(relativePath);
    if (!this.editor.exists(targetPath)) return null;
    return this.editor.read(targetPath, { raw: true });
  }

  routeToHtmlPath(route) {
    let requestedRoute;
    try {
      requestedRoute = normalizeRoutePath(route);
    } catch {
      return null;
    }
    if (requestedRoute === '/' || requestedRoute.split('/').includes('..')) return null;
    const requestedKey = routeKey(requestedRoute);
    const document = this.getDocuments().find((candidate) =>
      routeKey(candidate.route) === requestedKey || candidate.aliases.some((alias) => routeKey(alias) === requestedKey)
    );
    return document?.htmlPath ?? null;
  }

  getExportSnapshot() {
    const documents = this.getDocuments();

    return {
      navigation: renderNavigation(documents),
      documents: documents.map(({ route, aliases, title, htmlPath, assetBase }) => {
        const contents = this.readGenerated(htmlPath);
        if (!contents) throw new Error(`Frammento virtuale mancante: ${htmlPath}`);
        return { route, aliases, title, assetBase, html: contents.toString('utf8') };
      })
    };
  }
}
