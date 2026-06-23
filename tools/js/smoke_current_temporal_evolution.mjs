import { assertCondition, createProductionCurrentFixture, findDeepWetCurrentPoint, maxPairwiseVectorDifference, sampleCurrentByTime } from './scientific_baseline_helpers.mjs';

const fixture = createProductionCurrentFixture({ seed: 'sci-valid-r1-temporal-current' });
const point = findDeepWetCurrentPoint(fixture.field);
const depthMeters = fixture.field.depthAxisMeters[Math.min(1, fixture.field.depthAxisMeters.length - 1)] ?? 0;
const samples = sampleCurrentByTime(fixture.field, point, depthMeters);
const repeat = sampleCurrentByTime(fixture.field, point, depthMeters);
const maxDifference = maxPairwiseVectorDifference(samples);

assertCondition(fixture.field.sourceMetadata?.timeDependent === true, 'Production current metadata must mark timeDependent=true.');
assertCondition(samples.every((sample) => sample.wet && Number.isFinite(sample.magnitudeMetersPerSecond)), 'Current time samples must be wet and finite.', samples);
assertCondition(maxDifference >= 0.005, 'Production current time axis is not materially distinct at the selected wet point.', { point, depthMeters, maxDifference, samples });
assertCondition(JSON.stringify(samples) === JSON.stringify(repeat), 'Production current temporal sampling is not deterministic.');
assertCondition(samples.every((sample) => sample.timeClampedUnexpectedly === false), 'Time samples should not clamp unexpectedly inside the valid axis.', samples);

console.log('smoke_current_temporal_evolution: ok', JSON.stringify({
  fieldDigest: fixture.field.digest,
  point,
  depthMeters,
  timeAxisSeconds: fixture.field.timeAxisSeconds,
  maxDifference,
  samples: samples.map((sample) => ({ timeSeconds: sample.timeSeconds, u: sample.uEastMetersPerSecond, v: sample.vNorthMetersPerSecond, magnitude: sample.magnitudeMetersPerSecond }))
}, null, 2));
