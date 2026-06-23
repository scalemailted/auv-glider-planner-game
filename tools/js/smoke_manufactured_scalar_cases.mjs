import {
  DEFAULT_DEPTH_COORDINATES,
  DEFAULT_TIME_COORDINATES,
  assertCondition,
  createScalarField4d,
  round,
  sampleScalarFixture,
  scalarFieldMass,
  scalarFieldStats
} from './scientific_baseline_helpers.mjs';

const linear = createScalarField4d({
  evaluator: ({ x, y, depthMeters, timeSeconds }) => 1.2 + 0.07 * x + 0.11 * y + 0.003 * depthMeters + 0.0004 * timeSeconds
});
const linearPoint = { x: 2.4, y: 1.7, depthMeters: 55, timeSeconds: 450 };
const linearSample = sampleScalarFixture(linear, linearPoint);
const linearExpected = 1.2 + 0.07 * linearPoint.x + 0.11 * linearPoint.y + 0.003 * linearPoint.depthMeters + 0.0004 * linearPoint.timeSeconds;
assertCondition(Math.abs(linearSample.value - linearExpected) <= 1e-9, 'Quadrilinear scalar sampler should be exact for a multilinear manufactured field.', { linearSample, linearExpected });

const uniform = createScalarField4d({ evaluator: () => 0.42 });
const uniformStats = scalarFieldStats(uniform);
assertCondition(uniformStats.min === 0.42 && uniformStats.max === 0.42, 'Uniform scalar field should remain exactly uniform.', uniformStats);

const gaussianByTime = DEFAULT_TIME_COORDINATES.map((timeSeconds) => createScalarField4d({
  timeCoordinates: [timeSeconds],
  evaluator: ({ x, y, depthMeters }) => {
    const variance = 2.5 + timeSeconds / 300;
    const dx = x - 3.5;
    const dy = y - 2.5;
    return Math.exp(-(dx * dx + dy * dy) / variance) * Math.exp(-depthMeters / 220) / variance;
  }
})[0]);
const masses = gaussianByTime.map((field) => scalarFieldMass([field]));
assertCondition(masses.every(Number.isFinite), 'Gaussian scalar masses must be finite.', masses);
assertCondition(Math.max(...masses) / Math.max(1e-12, Math.min(...masses)) < 2.5, 'Diffusive scalar fixture mass drift is too large for the compact grid.', masses);

const decaying = createScalarField4d({
  evaluator: ({ x, y, depthMeters, timeSeconds }) => (1 + 0.04 * x + 0.02 * y + 0.001 * depthMeters) * Math.exp(-timeSeconds / 1800)
});
const early = sampleScalarFixture(decaying, { x: 3, y: 2, depthMeters: 35, timeSeconds: 0 }).value;
const late = sampleScalarFixture(decaying, { x: 3, y: 2, depthMeters: 35, timeSeconds: 900 }).value;
assertCondition(late < early, 'Decay fixture should decrease over time.', { early, late });

const sourcePatch = createScalarField4d({
  evaluator: ({ x, y, depthMeters, timeSeconds }) => 0.1 + 0.6 * (1 - Math.exp(-timeSeconds / 600)) * Math.exp(-((x - 5) ** 2 + (y - 3) ** 2) / 3) * Math.exp(-depthMeters / 180)
});
const sourceEarly = sampleScalarFixture(sourcePatch, { x: 5, y: 3, depthMeters: 10, timeSeconds: 0 }).value;
const sourceLate = sampleScalarFixture(sourcePatch, { x: 5, y: 3, depthMeters: 10, timeSeconds: 900 }).value;
assertCondition(sourceLate > sourceEarly, 'Source fixture should increase near the source patch.', { sourceEarly, sourceLate });

console.log('smoke_manufactured_scalar_cases: ok', JSON.stringify({
  depthCoordinates: DEFAULT_DEPTH_COORDINATES,
  timeCoordinates: DEFAULT_TIME_COORDINATES,
  linear: { sample: linearSample.value, expected: round(linearExpected), error: round(linearSample.value - linearExpected, 12) },
  uniformStats,
  gaussianMasses: masses,
  decay: { early, late },
  sourcePatch: { early: sourceEarly, late: sourceLate }
}, null, 2));
