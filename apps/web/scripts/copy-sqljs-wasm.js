import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '../../packages/core/node_modules/sql.js/dist/sql-wasm.wasm');
const targetDir = path.resolve(root, 'public');
const target = path.join(targetDir, 'sql-wasm.wasm');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(source)) {
  fs.copyFileSync(source, target);
  console.log('Copied sql-wasm.wasm to public/');
} else {
  console.warn('sql-wasm.wasm not found, skipping copy');
}
