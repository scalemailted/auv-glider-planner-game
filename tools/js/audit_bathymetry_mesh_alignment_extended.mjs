import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { compareBathymetryMeshAndCanonicalSampler } from '../../src/core/rendering/BathymetryMeshSampler.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'extended-mesh-alignment', width: 56, height: 36 });
const transform = createMissionWorldCoordinateTransform({ grid: { width: bathymetry.width, height: bathymetry.height } });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height }, coordinateSystem: transform });
const geometry = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const samples = [];
for (let y = 0; y < geometry.height; y += 1) {
  for (let x = 0; x < geometry.width; x += 1) samples.push({ x, y, kind: 'vertex' });
}
for (let y = 0.5; y < geometry.height - 1; y += 3) {
  for (let x = 0.5; x < geometry.width - 1; x += 4) samples.push({ x, y, kind: 'cell-center' });
}
for (let i = 0; i < 180; i += 1) {
  samples.push({
    x: seeded(i * 17 + 3) * (geometry.width - 1),
    y: seeded(i * 31 + 7) * (geometry.height - 1),
    kind: 'fractional'
  });
}
for (const point of [
  { x: geometry.width * 0.52, y: geometry.height * 0.5, kind: 'shelf-break' },
  { x: geometry.width * 0.58, y: geometry.height * 0.58, kind: 'canyon' },
  { x: geometry.width * 0.74, y: geometry.height * 0.34, kind: 'seamount' },
  { x: geometry.width - 1, y: geometry.height * 0.5, kind: 'domain-edge' }
]) samples.push({ x: Math.max(0, Math.min(geometry.width - 1, point.x)), y: Math.max(0, Math.min(geometry.height - 1, point.y)), kind: point.kind });

const comparison = compareBathymetryMeshAndCanonicalSampler({ geometry, surfaceModel: surface, samples, toleranceMeters: 1e-6 });
assert.equal(comparison.status, 'PASS');
assert.equal(comparison.failedSamples.length, 0);
console.log(JSON.stringify({
  ok: true,
  sampleCount: comparison.sampleCount,
  meanAbsoluteErrorMeters: comparison.meanAbsoluteErrorMeters,
  p95AbsoluteErrorMeters: comparison.p95AbsoluteErrorMeters,
  maximumAbsoluteErrorMeters: comparison.maximumAbsoluteErrorMeters,
  failedSampleCount: comparison.failedSamples.length,
  terrainMeshDigest: geometry.meshDigest
}));

function seeded(value) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
