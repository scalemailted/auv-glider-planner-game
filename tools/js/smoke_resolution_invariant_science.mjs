import assert from 'node:assert/strict';

import { createOperationalDomainSpec } from '../../src/core/domain/OperationalDomainSpec.js';
import { sampleScalarAtPhysicalPoint } from '../../src/core/domain/MultiResolutionFieldSampler.js';
import { evaluateRegionalScienceValueAtUv } from '../../src/core/generation/RegionalMissionDefaults.js';

function field(grid, seed) {
  return Array.from({ length: grid.rows }, (_row, y) => {
    const v = grid.rows <= 1 ? 0 : y / (grid.rows - 1);
    return Array.from({ length: grid.columns }, (_cell, x) => {
      const u = grid.columns <= 1 ? 0 : x / (grid.columns - 1);
      return evaluateRegionalScienceValueAtUv(u, v, { seed });
    });
  });
}

const seed = 'world-r1-resolution-invariant';
const domain = createOperationalDomainSpec();
const coarseGrid = { columns: 48, rows: 30, role: 'coarse science source' };
const fineGrid = { columns: 96, rows: 60, role: 'fine science source' };
const coarse = field(coarseGrid, seed);
const fine = field(fineGrid, seed);
const points = [
  { eastMeters: 18000, northMeters: 33000 },
  { eastMeters: 39000, northMeters: 24500 },
  { eastMeters: 65000, northMeters: 16000 }
];

for (const point of points) {
  const coarseSample = sampleScalarAtPhysicalPoint({ field: coarse, fieldGrid: coarseGrid, point, domain, profile: { profileId: 'coarse', scienceGrid: coarseGrid }, role: 'science' });
  const fineSample = sampleScalarAtPhysicalPoint({ field: fine, fieldGrid: fineGrid, point, domain, profile: { profileId: 'fine', scienceGrid: fineGrid }, role: 'science' });
  assert.ok(Math.abs(coarseSample.value - fineSample.value) <= 0.08, `samples diverged at ${JSON.stringify(point)}: ${coarseSample.value} vs ${fineSample.value}`);
}

console.log('smoke_resolution_invariant_science: ok');
