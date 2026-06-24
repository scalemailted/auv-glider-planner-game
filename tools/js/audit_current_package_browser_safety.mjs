import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('packages/currents/src');
const forbidden = [/\bwindow\b/, /\bdocument\b/, /requestAnimationFrame/, /WebGLRenderer/, /\bTHREE\b/, /\bPhaser\b/, /ANCHOR_[A-Z0-9_]+_DEBUG/];
for (const file of await walk(root)) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) assert.equal(pattern.test(text), false, `${path.relative(process.cwd(), file)} contains browser/runtime-only term ${pattern}`);
}
await import('../../packages/currents/src/index.js');
console.log('audit_current_package_browser_safety: ok');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}