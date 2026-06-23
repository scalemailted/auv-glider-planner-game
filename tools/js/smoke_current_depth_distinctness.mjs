import { assertCondition, createProductionCurrentFixture, findDeepWetCurrentPoint, maxPairwiseVectorDifference, sampleCurrentByDepth } from './scientific_baseline_helpers.mjs';

const fixture = createProductionCurrentFixture({ seed: 'sci-valid-r1-depth-current' });
const point = findDeepWetCurrentPoint(fixture.field);
const samples = sampleCurrentByDepth(fixture.field, point, fixture.field.timeAxisSeconds[1] ?? 0);
const maxDifference = maxPairwiseVectorDifference(samples);

assertCondition(fixture.field.sourceMetadata?.depthDependent === true, 'Production current metadata must mark depthDependent=true.');
assertCondition(samples.every((sample) => sample.wet && Number.isFinite(sample.magnitudeMetersPerSecond)), 'Current depth samples must be wet and finite.', samples);
assertCondition(maxDifference >= 0.005, 'Production current depth layers are not materially distinct at the selected wet point.', { point, maxDifference, samples });
assertCondition(new Set(samples.map((sample) => `${sample.uEastMetersPerSecond},${sample.vNorthMetersPerSecond}`)).size >= 2, 'Depth samples collapsed to one vector value.', samples);

console.log('smoke_current_depth_distinctness: ok', JSON.stringify({
  fieldDigest: fixture.field.digest,
  point,
  depthAxisMeters: fixture.field.depthAxisMeters,
  maxDifference,
  samples: samples.map((sample) => ({ depthMeters: sample.depthMeters, u: sample.uEastMetersPerSecond, v: sample.vNorthMetersPerSecond, magnitude: sample.magnitudeMetersPerSecond }))
}, null, 2));
