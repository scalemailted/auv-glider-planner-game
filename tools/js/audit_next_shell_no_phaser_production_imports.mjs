import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = 'src/app/production';
const allowed = new Set(['LegacyLearningLabHost.js']);
const offenders = [];
for (const file of walk(root)) {
  const base = path.basename(file);
  const source = readFileSync(file, 'utf8');
  if (allowed.has(base)) continue;
  if (/from\s+['"][^'"]*phaser/i.test(source) || /vendor\/phaser\.min\.js/i.test(source) || /new\s+Phaser\.Game/.test(source) || /window\.anchorGame\.phaser/.test(source)) offenders.push(file);
}
assert.equal(offenders.length, 0, `Next-shell production modules must not statically import/load Phaser: ${offenders.join(', ')}`);
console.log('next shell no Phaser production import audit passed');
function* walk(dir) { for (const name of readdirSync(dir)) { const full = path.join(dir, name); if (statSync(full).isDirectory()) yield* walk(full); else if (full.endsWith('.js')) yield full; } }
