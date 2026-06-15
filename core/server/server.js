import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './runtime.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.resolve(rootDirectory, '..', 'src');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const runtime = await serveSite({
  sourceDirectory,
  port,
  webDirectory: path.join(rootDirectory, 'web')
});

process.once('SIGINT', runtime.close);
process.once('SIGTERM', runtime.close);
