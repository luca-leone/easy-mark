import express from 'express';
import mime from 'mime-types';

const publicAssetExtensions = new Set([
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.txt'
]);

function securityHeaders(request, response, next) {
  response.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  });
  next();
}

function safeDecodePath(urlPath) {
  try {
    return decodeURIComponent(urlPath).replace(/^\/+/, '');
  } catch {
    return null;
  }
}

function isPublicAssetPath(relativePath) {
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('__')) return false;
  return publicAssetExtensions.has(`.${relativePath.split('.').pop()?.toLowerCase()}`);
}

function sendVirtualFile(response, builder, relativePath, { generated = false } = {}) {
  const contents = generated ? builder.readGenerated(relativePath) : builder.read(relativePath);
  if (!contents) return false;
  response.type(mime.lookup(relativePath) || 'application/octet-stream').send(contents);
  return true;
}

export function createApp(builder) {
  const app = express();
  const clients = new Set();

  app.disable('x-powered-by');
  app.use(securityHeaders);

  app.get('/__events', (request, response) => {
    response.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive'
    });
    response.flushHeaders();
    response.write('event: connected\ndata: ready\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
  });

  app.get(/^\/__content\/(.+)$/, (request, response) => {
    const htmlPath = builder.routeToHtmlPath(request.path.slice('/__content'.length));
    if (!htmlPath || !sendVirtualFile(response, builder, htmlPath, { generated: true })) {
      response.status(404).json({ error: 'Documento non trovato' });
    }
  });

  app.get('/__export', (request, response) => {
    try {
      response.set('Cache-Control', 'no-store').json(builder.getExportSnapshot());
    } catch {
      response.status(500).json({ error: 'Impossibile preparare l\u2019esportazione' });
    }
  });

  app.get('*', (request, response) => {
    const assetPath = safeDecodePath(request.path);
    if (assetPath === null) {
      response.sendStatus(400);
      return;
    }

    if (assetPath.includes('.') && !isPublicAssetPath(assetPath)) {
      response.sendStatus(404);
      return;
    }

    if (isPublicAssetPath(assetPath) && sendVirtualFile(response, builder, assetPath)) return;

    if (assetPath.includes('.')) {
      response.sendStatus(404);
      return;
    }

    if (request.accepts('html')) {
      sendVirtualFile(response, builder, 'index.html');
      return;
    }
    response.sendStatus(404);
  });

  return {
    app,
    reload() {
      for (const response of clients) response.write(`event: reload\ndata: ${Date.now()}\n\n`);
    }
  };
}
