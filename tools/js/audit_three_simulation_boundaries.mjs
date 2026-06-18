import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const failures = [];
for (const file of await walk('src')) {
  if (!file.endsWith('.js')) continue;
  const text = await readFile(file, 'utf8');
  if (file.includes(`${path.sep}core${path.sep}`) && /from ['"]three['"]|from ['"]three\//.test(text)) failures.push(`${file} imports Three from portable core.`);
  if (/advancesSimulationClock:\s*true|ownsSimulationState:\s*true|ownsScoring:\s*true|generatesObservations:\s*true/.test(text) && /SimulationWorld|Three/.test(file)) failures.push(`${file} violates renderer/simulation boundary flags.`);
  if (/usesMARL:\s*true|usesNewPlanner:\s*true|usesRouteOptimizer:\s*true/.test(text)) failures.push(`${file} enables forbidden MIG-R1 planner/optimizer flags.`);
}
assert.deepEqual(failures, []);
console.log('audit_three_simulation_boundaries: ok');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
