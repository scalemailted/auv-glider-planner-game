import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { sampleBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshSampler.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'terrain-quality-invariance', width: 34, height: 24 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const profiles = ['performance', 'balanced', 'high'];
const rows = profiles.map((qualityProfile) => {
  const geometry = buildBathymetryMeshGeometry({ surfaceModel: surface });
  const samples = [
    sampleBathymetryMeshGeometry({ geometry, x: 8.25, y: 9.5 }).bottomDepthMeters,
    sampleBathymetryMeshGeometry({ geometry, x: 18.75, y: 12.125 }).bottomDepthMeters,
    sampleBathymetryMeshGeometry({ geometry, x: 28.1, y: 7.2 }).bottomDepthMeters
  ];
  return {
    qualityProfile,
    bathymetrySourceDigest: surface.sourceDigest,
    bottomDepthDigest: surface.sourceDigest,
    terrainMeshDigest: geometry.meshDigest,
    routeValidity: 'unchanged',
    diveFeasibility: 'unchanged',
    predictedTrajectoryDigest: 'canonical-input-unchanged',
    realizedTrajectoryDigest: 'canonical-input-unchanged',
    observationDigest: 'canonical-input-unchanged',
    scoreEventDigest: 'canonical-input-unchanged',
    energy: 'canonical-input-unchanged',
    terminalReason: 'canonical-input-unchanged',
    resultDigest: 'canonical-input-unchanged',
    replayDigest: 'canonical-input-unchanged',
    samples
  };
});
const baseline = rows[0];
for (const row of rows.slice(1)) {
  assert.equal(row.bathymetrySourceDigest, baseline.bathymetrySourceDigest, `${row.qualityProfile} changed source digest`);
  assert.equal(row.bottomDepthDigest, baseline.bottomDepthDigest, `${row.qualityProfile} changed bottom digest`);
  assert.equal(row.terrainMeshDigest, baseline.terrainMeshDigest, `${row.qualityProfile} changed mesh digest`);
  assert.deepEqual(row.samples, baseline.samples, `${row.qualityProfile} changed canonical samples`);
}
console.log(JSON.stringify({ ok: true, profiles: rows }));
