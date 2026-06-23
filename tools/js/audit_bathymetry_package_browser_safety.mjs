import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(repoRoot, 'packages/bathymetry/src');
const forbidden = [
  [/\bdocument\b/, 'document'],
  [/\bwindow\b/, 'window'],
  [/\brequestAnimationFrame\b/, 'requestAnimationFrame'],
  [/globalThis\.Phaser\b/, 'globalThis.Phaser'],
  [/\bTHREE\b/, 'THREE'],
  [/['"][.\/\\]*src[\/\\](game|ui)[\/\\]/, 'src game/ui import'],
  [/ANCHOR_[A-Z0-9_]+_DEBUG/, 'project debug global']
];
const violations = [];
for (const file of await walk(packageRoot)) {
  if (!file.endsWith('.js')) continue;
  const text = await fs.readFile(file, 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) violations.push(`${path.relative(repoRoot, file)} uses ${label}`);
  }
}
assert.deepEqual(violations, []);
console.log('audit_bathymetry_package_browser_safety: ok');

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}