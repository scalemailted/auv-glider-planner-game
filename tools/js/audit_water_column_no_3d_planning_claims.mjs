import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/core/science', 'src/core/headless', 'src/core/benchmark', 'src/ui/headless', 'src/ui/benchmark'];
const files = ROOTS.flatMap((root) => listJs(root));
const bannedPatterns = [
  /usesFull3DPlanning:\s*true/,
  /calibratedVerticalOceanModel:\s*true/,
  /usesPythonSimulator:\s*true/,
  /usesMARL:\s*true/
];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of bannedPatterns) {
    assert.equal(pattern.test(text), false, `${file} contains banned claim ${pattern}`);
  }
}

console.log('audit_water_column_no_3d_planning_claims: ok', { files: files.length });

function listJs(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listJs(fullPath));
    else if (entry.name.endsWith('.js')) out.push(fullPath);
  }
  return out;
}
