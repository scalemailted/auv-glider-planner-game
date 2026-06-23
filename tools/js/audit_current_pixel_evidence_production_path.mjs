import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = readFileSync('tests/e2e/flow_r2a_4_production_current_visibility.spec.js', 'utf8');

assert.match(spec, /Normal Generated Challenge Displays Current Vectors in Planning/, 'planning current visibility E2E exists');
assert.match(spec, /Normal Generated Challenge Displays Current Vectors in Simulation/, 'simulation current visibility E2E exists');
assert.match(spec, /collectCurrentPixelEvidence/, 'E2E captures pixel evidence for current visibility');
assert.match(spec, /flow-r2a-4-owner-review/, 'E2E writes owner-review screenshot package');
assert.match(spec, /\/auv-glider-planner-game\//, 'E2E covers GitHub Pages subpath static hosting');
assert.match(spec, /FLOW-R2A\.4 Full Headed Production Current Visibility Walkthrough/, 'headed owner walkthrough test exists');

console.log('audit_current_pixel_evidence_production_path: ok');
