import assert from 'node:assert/strict';

import { createRegionalMissionBundle, createRegionalMissionCompactExport } from '../../src/core/generation/RegionalMissionDefaults.js';

const bundle = createRegionalMissionBundle({ seed: 'world-r1-compact' });
const compact = createRegionalMissionCompactExport({ level: bundle.level, mission: bundle.mission });
const compactJson = JSON.stringify(compact);

assert.equal(compact.compact, true);
assert.equal(compact.containsFullFieldArrays, false);
assert.equal(compact.containsHiddenTruth, false);
assert.ok(compactJson.length < 50000, `compact export is too large: ${compactJson.length}`);
assert.ok(compact.counts.terrainSamples > compact.counts.planningCells, 'compact export should preserve decoupled source/planning counts');
assert.ok(!compactJson.includes('bathymetryDepthMeters'), 'compact export should not inline full bathymetry arrays');
assert.equal(compact.regionalFields, undefined, 'compact export should not include the full regionalFields pack');
assert.equal(/"scienceValue"\s*:\s*\[/.test(compactJson), false, 'compact export should not inline full science arrays');

console.log('audit_regional_export_compactness: ok');
