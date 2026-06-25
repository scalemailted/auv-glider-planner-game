import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'packages/codecs');
const files = walk(path.join(packageRoot, 'src')).filter((file) => file.endsWith('.js'));
const failures = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (spec.startsWith('../../../src/') || spec.includes('/src/core/') || spec.includes('/src/game/') || spec.includes('/src/ui/')) failures.push(`${rel(file)} imports app source ${spec}`);
    if (/^(three|phaser)(\/|$)/.test(spec)) failures.push(`${rel(file)} imports forbidden runtime ${spec}`);
    if (spec.startsWith('../../') && !spec.startsWith('../../contracts/')) failures.push(`${rel(file)} imports another package besides contracts: ${spec}`);
  }
  for (const pattern of [/\bdocument\b/, /\bwindow\b/, /\brequestAnimationFrame\b/, /\bTHREE\b/, /ANCHOR_[A-Z0-9_]+_DEBUG/]) {
    if (pattern.test(source)) failures.push(`${rel(file)} contains forbidden package-runtime term ${pattern}`);
  }
}
assert.deepEqual(failures, []);
console.log(JSON.stringify({ ok: true, checked: files.map(rel) }, null, 2));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
function rel(file) { return path.relative(root, file).replace(/\\/g, '/'); }