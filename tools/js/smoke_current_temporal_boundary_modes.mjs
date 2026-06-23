import assert from 'node:assert/strict';
import { createOceanCurrentField4D } from '../../src/core/science/OceanCurrentField4D.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';

const shortBounded = createOceanCurrentField4D({
  grid: { width: 2, height: 2 },
  depthAxisMeters: [0],
  timeAxisSeconds: [0, 200, 400, 600],
  temporalBoundaryMode: 'bounded',
  validTimeStartSeconds: 0,
  validTimeEndSeconds: 14040,
  uEastMetersPerSecond: [0.1, 0.2, 0.3, 0.4].map((u) => [[Array.from({ length: 2 }, () => u), Array.from({ length: 2 }, () => u)]]),
  vNorthMetersPerSecond: [0, 0, 0, 0].map((v) => [[Array.from({ length: 2 }, () => v), Array.from({ length: 2 }, () => v)]])
});
const clamped = sampleOceanCurrent({ field: shortBounded, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 14040 });
assert.equal(clamped.temporalBoundaryMode, 'bounded');
assert.equal(clamped.upperTimeSeconds, 600);
assert.equal(clamped.timeClampedUnexpectedly, true, 'bounded short-axis fields must report unexpected mission-time clamping');

const extended = createBathymetryConditionedCurrentField({
  grid: { width: 6, height: 5 },
  level: { world: { grid: { width: 6, height: 5 }, operationalDomain: { time: { durationSeconds: 14040 } } } },
  timeAxisSeconds: [0, 200, 400, 600],
  temporalBoundaryMode: 'bounded'
});
assert.ok(extended.timeAxisSeconds.at(-1) >= 14040, 'generated bounded fields extend to mission duration');
const late = sampleOceanCurrent({ field: extended, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 14040 });
assert.equal(late.timeClampedUnexpectedly, false, 'extended generated fields do not unexpectedly clamp at mission time');
assert.ok(late.lowerTimeSeconds <= 14040 && late.upperTimeSeconds >= 14040);

const periodic = createOceanCurrentField4D({
  grid: { width: 2, height: 2 },
  depthAxisMeters: [0],
  timeAxisSeconds: [0, 300, 600],
  temporalBoundaryMode: 'periodic',
  temporalPeriodSeconds: 600,
  validTimeStartSeconds: 0,
  validTimeEndSeconds: 600,
  uEastMetersPerSecond: [0.1, 0.2, 0.3].map((u) => [[Array.from({ length: 2 }, () => u), Array.from({ length: 2 }, () => u)]]),
  vNorthMetersPerSecond: [0, 0, 0].map((v) => [[Array.from({ length: 2 }, () => v), Array.from({ length: 2 }, () => v)]])
});
const wrapped = sampleOceanCurrent({ field: periodic, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 750 });
assert.equal(wrapped.temporalBoundaryMode, 'periodic');
assert.equal(wrapped.timeWrappedPeriodically, true);
assert.equal(wrapped.wrappedCurrentTimeSeconds, 150);
assert.equal(wrapped.timeClampedUnexpectedly, false);
console.log('PASS smoke_current_temporal_boundary_modes');