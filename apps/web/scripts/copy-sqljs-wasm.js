import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceDir = path.resolve(root, '../../node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist');
const targetDir = path.resolve(root, 'public');
const files = ['sql-wasm.wasm', 'sql-wasm-browser.wasm'];

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const file of files) {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to public/`);
  } else {
    console.warn(`${file} not found, skipping copy`);
  }
}
