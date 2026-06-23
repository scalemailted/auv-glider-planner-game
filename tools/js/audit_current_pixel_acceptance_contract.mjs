import assert from 'node:assert/strict';
import fs from 'node:fs';

const specPath = 'tests/e2e/flow_r2a_2_visible_currents.spec.js';
assert.equal(fs.existsSync(specPath), true, 'FLOW-R2A.2 E2E spec exists');
const spec = fs.readFileSync(specPath, 'utf8');
for (const required of [
  'captureCurrentPixelEvidence',
  'readPixels',
  'projectCurrentGlyphPositions',
  'projectedNeighborhoods',
  'diffPixelCount',
  'strongPixelCount',
  'Simulation Displays Current Vectors by Default',
  'FLOW-R2A.2 Full Headed Visible Current Vector Walkthrough'
]) {
  assert.ok(spec.includes(required), `pixel acceptance spec includes ${required}`);
}
assert.match(spec, /expect\([^\n]+diffPixelCount[^\n]+\)\.toBeGreaterThan/, 'spec asserts meaningful pixel differences');
assert.match(spec, /projectedNeighborhoods[^\n]+filter/, 'spec evaluates neighborhoods around projected glyph positions');

console.log('audit_current_pixel_acceptance_contract: ok');
