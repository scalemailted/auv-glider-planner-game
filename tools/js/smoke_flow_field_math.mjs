import assert from 'node:assert/strict';
import {
  advectParticle,
  createVectorGrid,
  crossCurrentMagnitude,
  currentAssist,
  divergence,
  flowSpeedStats,
  maskFlowByTerrain,
  normalizeVector,
  sampleVectorBilinear,
  scalarFieldStats,
  strainRate,
  validateVectorField,
  vectorMagnitude,
  vorticity
} from '../../src/core/demo/flow/FlowFieldMath.js';

const nearlyZero = (value, epsilon = 1e-9) => Math.abs(value) <= epsilon;

assert.equal(vectorMagnitude(3, 4), 5, 'vectorMagnitude computes Euclidean speed');
assert.deepEqual(normalizeVector(0, 0), { u: 0, v: 0, magnitude: 0 }, 'zero vector normalizes safely');
assert.ok(Number.isFinite(normalizeVector(3, 4).u), 'normalized vector remains finite');

const uniform = createVectorGrid(8, 6, { u: 0.4, v: -0.2 });
assert.ok(validateVectorField(uniform).valid, 'uniform vector field validates');
assert.ok(nearlyZero(scalarFieldStats(divergence(uniform)).absMax), 'uniform field divergence is near zero');
assert.ok(nearlyZero(scalarFieldStats(vorticity(uniform)).absMax), 'uniform field vorticity is near zero');
assert.ok(nearlyZero(scalarFieldStats(strainRate(uniform)).absMax), 'uniform field strain is near zero');
assert.equal(flowSpeedStats(uniform).count, 48, 'speed stats count every vector');

const vortex = createVectorGrid(11, 11, (x, y) => {
  const dx = x - 5;
  const dy = y - 5;
  return { u: -dy / 10, v: dx / 10 };
});
assert.ok(scalarFieldStats(vorticity(vortex)).absMean > 0.1, 'vortex fixture has nonzero vorticity');

const convergence = createVectorGrid(11, 11, (x, y) => ({
  u: (5 - x) / 10,
  v: (5 - y) / 10
}));
assert.ok(scalarFieldStats(divergence(convergence)).mean < -0.1, 'convergence fixture has negative mean divergence');

const bilinear = sampleVectorBilinear(vortex, 4.25, 5.75);
assert.ok(Number.isFinite(bilinear.u) && Number.isFinite(bilinear.v), 'bilinear vector sampling stays finite');

assert.ok(currentAssist({ u: 1, v: 0 }, { u: 1, v: 0 }) > 0, 'aligned current assists travel');
assert.ok(currentAssist({ u: -1, v: 0 }, { u: 1, v: 0 }) < 0, 'opposing current resists travel');
assert.ok(crossCurrentMagnitude({ u: 0, v: 1 }, { u: 1, v: 0 }) > 0.9, 'perpendicular current has cross-current magnitude');

const advected = advectParticle({ x: 0.25, y: 0.25 }, () => ({ u: 0.2, v: 0 }), 2, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
assert.ok(advected.x > 0.25 && nearlyZero(advected.y - 0.25), 'advectParticle moves in the sampled flow direction');

const terrainMask = [
  [0, 1],
  [0, 0]
];
const masked = maskFlowByTerrain(createVectorGrid(2, 2, { u: 1, v: 1 }), terrainMask);
assert.deepEqual(masked[0][1], { u: 0, v: 0, masked: true }, 'maskFlowByTerrain suppresses masked land cells');

console.log('Flow field math smoke passed');
