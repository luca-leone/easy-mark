import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from './app.js';
import { createBuiltSite } from './runtime.js';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    try {
      return await import('playwright-core');
    } catch {
      throw new Error('Playwright non e installato. Installa Playwright e Chromium, poi riesegui easy-mark export.');
    }
  }
}

async function openBrowser(playwrightModule) {
  try {
    return await playwrightModule.chromium.launch();
  } catch (error) {
    throw new Error([
      'Chromium non e disponibile per Playwright.',
      'Installa il browser con `npx playwright install chromium` e riprova.',
      error instanceof Error ? error.message : ''
    ].filter(Boolean).join(' '));
  }
}

export async function exportPdf({
  sourceDirectory,
  pdfPath,
  title,
  webDirectory,
  playwrightModule
}) {
  const builder = await createBuiltSite({ sourceDirectory, title, webDirectory });
  const { app } = createApp(builder);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let browser;

  try {
    const playwright = playwrightModule ?? await loadPlaywright();
    browser = await openBrowser(playwright);
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const exportModule = await import('/pdf-export.js');
      const visualsModule = await import('/visuals.js');
      const response = await fetch('/__export', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Impossibile preparare lo snapshot PDF.');
      const snapshot = await response.json();
      const container = document.querySelector('#print-export');
      exportModule.buildPrintExport(snapshot, container, document, window.location.origin);
      exportModule.setExportLifecycle(document.body, container, true);
      if (document.fonts?.ready) await document.fonts.ready;
      await visualsModule.renderVisuals(container, { documentObject: document, print: true });
      await exportModule.waitForExportImages(container);
    });
    await fs.mkdir(path.dirname(path.resolve(pdfPath)), { recursive: true });
    await page.pdf({
      path: path.resolve(pdfPath),
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
