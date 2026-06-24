import { assert, currents } from './current_package_test_helpers.mjs';

const manifest = currents.createCurrentFieldManifest({
  id: 'manifest-smoke',
  seed: 77,
  generatorId: 'bathymetryConditionedStreamfunctionSyntheticV2',
  generatorVersion: 'flow-pkg-r1-smoke',
  generatorBackend: 'javascriptCpuV1',
  grid: { width: 4, height: 3 },
  depthAxisMeters: [0, 10, 35],
  timeAxisSeconds: [0, 28800, 57600],
  temporalBoundaryMode: 'bounded',
  sourceMetadata: { sourceTier: 'scientificallyConstrainedSynthetic' }
});
const validation = currents.validateCurrentFieldManifest(manifest);
assert.equal(validation.valid, true);
assert.equal(manifest.coordinateFrame, 'localEastNorthDown');
assert.equal(manifest.claimBoundary.calibratedForecast, false);
assert.equal(currents.currentFieldManifestDigest(manifest), manifest.digest);
assert.deepEqual(currents.currentFieldManifestSummary(manifest).sourceResolution, { eastCount: 4, northCount: 3, depthCount: 3, timeCount: 3 });
console.log('smoke_current_package_manifest: ok', { digest: manifest.digest });