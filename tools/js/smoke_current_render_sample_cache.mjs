import assert from 'node:assert/strict';
import { makeFlowR2A1Level, makeFixtureCurrentField, makeCurrentExplorer } from './flow_r2a1_test_helpers.mjs';
import { resetWaterColumnCurrentRenderSampleCache, waterColumnCurrentRenderSampleCacheSummary } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';

resetWaterColumnCurrentRenderSampleCache();
const level = makeFlowR2A1Level();
const field = makeFixtureCurrentField();
const a = makeCurrentExplorer(level, { currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
const b = makeCurrentExplorer(level, { currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
const c = makeCurrentExplorer(level, { currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 900 });
const stats = waterColumnCurrentRenderSampleCacheSummary();
assert.equal(a.layers[2].currentField, b.layers[2].currentField, 'same field/layer/time reuses render samples');
assert.notEqual(b.layers[2].currentField, c.layers[2].currentField, 'time change invalidates render sample cache');
assert.ok(stats.hitCount >= 1, 'cache records hit');
assert.ok(stats.buildCount >= 2, 'changed time builds a new compact render sample');
console.log('[smoke_current_render_sample_cache] PASS', stats);