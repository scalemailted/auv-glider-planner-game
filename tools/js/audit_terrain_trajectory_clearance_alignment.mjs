import assert from 'node:assert/strict';

import { buildPlannedDiveSegmentViewModel, validatePlannedDiveSegmentViewModel } from '../../src/core/rendering/PlannedDiveSegmentViewModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { sampleBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshSampler.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';

const bottomDepthField = Array.from({ length: 8 }, (_row, y) => Array.from({ length: 14 }, (_cell, x) => x < 6 ? 42 + y * 2 : 182 + y));
const bottomBoundary = { bottomDepthField, landMask: bottomDepthField.map((row) => row.map((depth) => depth <= 0)), width: 14, height: 8 };
const segment = buildPlannedDiveSegmentViewModel({
  agentId: 'glider-terrain-clearance',
  segmentId: 'clearance-audit-segment',
  startWaypoint: { id: 'wp-a', x: 1, y: 4 },
  targetWaypoint: { id: 'wp-b', x: 12, y: 4, diveProfileId: 'deepDive', targetDepthLayerId: 'deep' },
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'deepDive' },
  bottomBoundary,
  requestedMaximumDepthMeters: 150,
  requiredBottomClearanceMeters: 10,
  sampleCount: 90
});
const validation = validatePlannedDiveSegmentViewModel(segment);
assert.equal(validation.valid, true);
assert.equal(segment.bottomClearance.terrainLimited, true, 'terrain-limited profile should be exposed');
assert.ok(segment.predictedDivePath.every((point) => Number(point.clearanceMeters ?? 0) >= 9.999999), 'canonical predicted path stays above terrain');

const surface = buildBathymetrySurfaceViewModel({ bottomBoundary, grid: { width: 14, height: 8 } });
const transform = createMissionWorldCoordinateTransform({ grid: { width: 14, height: 8 } });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const clearanceDeltas = segment.predictedDivePath.map((point) => {
  const meshBottom = sampleBathymetryMeshGeometry({ geometry: mesh, x: point.x, y: point.y }).bottomDepthMeters;
  const visualClearance = meshBottom - point.depthMeters;
  return Math.abs(visualClearance - point.clearanceMeters);
});
const maximumDifference = Math.max(...clearanceDeltas);
const visualToleranceMeters = 1e-3;
assert.ok(maximumDifference <= visualToleranceMeters, `visual/canonical clearance mismatch ${maximumDifference}`);

console.log(JSON.stringify({
  ok: true,
  canonicalMinimumClearanceMeters: segment.bottomClearance.minimumClearanceMeters,
  visualMinimumClearanceMeters: Number(Math.min(...segment.predictedDivePath.map((point) => sampleBathymetryMeshGeometry({ geometry: mesh, x: point.x, y: point.y }).bottomDepthMeters - point.depthMeters)).toFixed(6)),
  clearanceDifferenceMeters: Number(maximumDifference.toFixed(9)),
  visualToleranceMeters,
  predictedPointCount: segment.predictedDivePath.length,
  terrainLimited: segment.bottomClearance.terrainLimited
}));
