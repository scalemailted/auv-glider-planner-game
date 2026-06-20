import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry, sampleBathymetryAt } from '../../src/core/science/BathymetryFieldModel.js';
import { normalizeContinuousScienceTarget } from '../../src/core/science/ContinuousScienceTarget.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'target-clearance', width: 26, height: 16 });

function check(target, minimumClearance = 5) {
  const normalized = normalizeContinuousScienceTarget(target);
  const bottom = sampleBathymetryAt(bathymetry, normalized.position.x, normalized.position.y);
  const clearance = bottom - normalized.position.depthMeters;
  return {
    allowed: bottom > 0 && clearance >= minimumClearance,
    warning: bottom > 0 && clearance >= minimumClearance && clearance < minimumClearance * 2,
    bottom,
    clearance
  };
}

const basin = check({ x: 22, y: 8, depthMeters: 80, depthLayerId: 'deep' });
const below = check({ x: 4, y: 8, depthMeters: 120, depthLayerId: 'deep' });
const nearBottomDepth = Math.max(0, sampleBathymetryAt(bathymetry, 10, 8) - 6);
const near = check({ x: 10, y: 8, depthMeters: nearBottomDepth, depthLayerId: 'thermocline' });

assert.equal(basin.allowed, true, 'valid target above basin bottom is allowed');
assert.equal(below.allowed, false, 'below-bottom target is hard invalid');
assert.equal(near.allowed, true, 'low-clearance but above-bottom target can remain allowed');
assert.equal(near.warning, true, 'low-clearance target warns');
console.log('smoke_terrain_target_clearance: ok');
