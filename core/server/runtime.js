import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { createApp } from './app.js';
import { SiteBuilder } from './site-builder.js';
import { createFileEventHandler } from './watch.js';

export function resolveWebDirectory(importMetaUrl = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '..', 'web');
}

export async function createBuiltSite({ sourceDirectory, title, webDirectory } = {}) {
  const builder = new SiteBuilder({
    sourceDirectory,
    title,
    webDirectory: webDirectory ?? resolveWebDirectory()
  });
  await builder.build();
  return builder;
}

export async function serveSite({
  sourceDirectory,
  title,
  port = Number.parseInt(process.env.PORT ?? '3000', 10),
  host = '127.0.0.1',
  logger = console,
  webDirectory
}) {
  const builder = await createBuiltSite({ sourceDirectory, title, webDirectory });
  const { app, reload } = createApp(builder);
  const listenHost = host ?? undefined;
  const server = listenHost
    ? app.listen(port, listenHost)
    : app.listen(port);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  const displayHost = typeof address === 'object' && address?.address && address.address !== '::'
    ? address.address
    : 'localhost';
  const displayPort = typeof address === 'object' && address ? address.port : port;
  logger.log(`easy-mark available at http://${displayHost}:${displayPort}`);

  const watcher = chokidar.watch(builder.sourceDirectory, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 }
  });
  watcher.on('all', createFileEventHandler({ builder, reload, logger }));

  async function close() {
    await watcher.close();
    await new Promise((resolve) => server.close(resolve));
  }

  return { app, builder, close, reload, server, watcher };
}
