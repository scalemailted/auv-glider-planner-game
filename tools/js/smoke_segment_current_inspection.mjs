import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';
import { volumetricMissionWorldViewModelSummary, volumetricCurrentDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';

const model = makeVolumetricViewModel({ waterColumnUi: { activeDepthLayerId: 'thermocline', currentDisplayMode: 'activeCurrentSlice' } });
const summary = volumetricMissionWorldViewModelSummary(model);
const debug = volumetricCurrentDebugPayload(model, { glyphInstanceCount: 10, glyphDrawCallCount: 1, activeRendererCount: 1, activeRafCount: 1 });
assert.equal(summary.routeSegmentCount > 0, true);
assert.equal(model.segmentFlightPlans.length > 0, true);
assert.equal(debug.rendererOwnsCurrent, false);
assert.equal(debug.usesNewPlanner, false);
assert.equal(debug.activeVectorCount > 0, true);
console.log('[smoke_segment_current_inspection] PASS', { routeSegmentCount: summary.routeSegmentCount, activeVectorCount: debug.activeVectorCount });
