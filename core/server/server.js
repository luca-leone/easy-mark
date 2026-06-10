import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { createApp } from './app.js';
import { SiteBuilder } from './site-builder.js';
import { createFileEventHandler } from './watch.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.resolve(rootDirectory, '..', 'src');
const webDirectory = path.join(rootDirectory, 'web');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const builder = new SiteBuilder({ sourceDirectory, webDirectory });

await builder.build();

const { app, reload } = createApp(builder);
const server = app.listen(port, () => {
  console.log(`easy-mark available at http://localhost:${port}`);
});

const watcher = chokidar.watch(sourceDirectory, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 }
});

watcher.on('all', createFileEventHandler({ builder, reload }));

async function shutdown() {
  await watcher.close();
  server.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
