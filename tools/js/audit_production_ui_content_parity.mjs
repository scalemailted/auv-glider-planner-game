import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const specPath = 'docs/production_shell_parity_specification.md';
assert.ok(existsSync(specPath), 'production shell parity specification must exist');
const spec = readFileSync(specPath, 'utf8');
for (const token of ['Product Hub', 'Mission Setup', 'Mission Briefing', 'Mission Planning', 'Mission Simulation', 'Surfacing Decision', 'Mission Debrief', 'Replay Review', 'Mission Editor', 'Import / Export', 'Headless Bundle Viewer', 'Planner Benchmark', 'Adaptive Benchmark']) {
  assert.ok(spec.includes(token), `parity spec must include ${token}`);
}
const views = readFileSync('src/app/production/views/RouteViewFactory.js', 'utf8');
for (const token of ['Challenge Mode', 'Simulation Lab', 'Learning Labs', 'Headless Bundle Viewer', 'Mission Debrief', 'Mission Editor']) {
  assert.ok(views.includes(token), `next shell views must preserve ${token}`);
}
console.log('production UI content parity audit passed');
