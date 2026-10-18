import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const cjsPackageJson = path.join(rootDir, 'dist', 'cjs', 'package.json');
const esmPackageJson = path.join(rootDir, 'dist', 'esm', 'package.json');

fs.mkdirSync(path.dirname(cjsPackageJson), { recursive: true });
fs.writeFileSync(cjsPackageJson, JSON.stringify({ type: "commonjs" }, null, 2) + '\n');

fs.mkdirSync(path.dirname(esmPackageJson), { recursive: true });
fs.writeFileSync(esmPackageJson, JSON.stringify({ type: "module" }, null, 2) + '\n');

console.log('Build post-processing complete: dist/cjs and dist/esm configured.');
