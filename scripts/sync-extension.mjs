import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, '.output/chrome-mv3');
const target = resolve(root, 'extension');

if (!existsSync(source)) {
  console.error('Missing build output at .output/chrome-mv3 — run wxt build first.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('Synced loadable extension → ./extension (Load unpacked this folder)');
