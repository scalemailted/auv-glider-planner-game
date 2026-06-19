import assert from 'node:assert/strict';
import { objectiveDepthWeightProfileById } from '../../src/core/science/DepthAwareScienceValue.js';

const surface = objectiveDepthWeightProfileById('surfaceBloom');
const thermo = objectiveDepthWeightProfileById('thermoclineFront');
const deep = objectiveDepthWeightProfileById('deepPlume');
const integrated = objectiveDepthWeightProfileById('integratedHydrographicProfile');
assert.ok(surface.weights.surface > surface.weights.deep, 'surface bloom favors surface/shallow');
assert.ok(thermo.weights.thermocline > thermo.weights.surface, 'thermocline objective favors thermocline');
assert.ok(deep.weights.deep > deep.weights.surface, 'deep plume favors deep');
assert.ok(integrated.coverageBonus > surface.coverageBonus, 'integrated survey rewards coverage');
assert.equal(surface.explicit, true, 'weights are explicit');
console.log('smoke_depth_objective_weighting: PASS');
