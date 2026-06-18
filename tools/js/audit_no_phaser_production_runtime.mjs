import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const productionRoot = 'src/app';
const bannedPatterns = [
  { label: 'new Phaser', regex: /new\s+Phaser\b/ },
  { label: 'extends Phaser', regex: /extends\s+Phaser\b/ },
  { label: 'Phaser.Scene', regex: /Phaser\.Scene\b/ },
  { label: 'scene.start', regex: /\.scene\.start\s*\(/ },
  { label: 'app.phaser', regex: /\bapp\.phaser\b/ },
  { label: 'globalThis.Phaser', regex: /globalThis\.Phaser\b/ }
];

const files = await collectJs(productionRoot, (file) => !file.includes(`${path.sep}legacy${path.sep}`));
const failures = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const pattern of bannedPatterns) {
    if (pattern.regex.test(text)) failures.push(`${file}: ${pattern.label}`);
  }
}
const indexHtml = await readFile('index.html', 'utf8');
if (!indexHtml.includes('src="src/app/main.js"')) failures.push('index.html should load src/app/main.js as the active entry point.');
if (/<script\s+src="vendor\/phaser\.min\.js"/.test(indexHtml)) failures.push('index.html should not eagerly load vendor/phaser.min.js.');
assert.deepEqual(failures, []);
console.log('audit_no_phaser_production_runtime ok', { filesScanned: files.length });

async function collectJs(root, include) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await collectJs(full, include));
    else if (entry.isFile() && entry.name.endsWith('.js') && include(full)) out.push(full);
  }
  return out;
}
