import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { extractCoastlineSegments } from '../../src/core/rendering/CoastlineGeometry.js';
import { buildBathymetryContourGeometry } from '../../src/core/rendering/BathymetryContourGeometry.js';
import { createMissionWorldCoordinateTransform, gridCellCenterToWorld } from '../../src/core/rendering/MissionWorldCoordinates.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'scene-coordinate-alignment', width: 44, height: 30 });
const transform = createMissionWorldCoordinateTransform({ grid: { width: bathymetry.width, height: bathymetry.height }, depthScale: 0.045, verticalExaggeration: 1.35 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height }, coordinateSystem: transform });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface, coordinateSystem: transform });
const coastline = extractCoastlineSegments({ surfaceModel: surface });
const contours = buildBathymetryContourGeometry({ surfaceModel: surface });

const samples = [
  { label: 'northwest-corner', x: 0, y: 0 },
  { label: 'northeast-corner', x: bathymetry.width - 1, y: 0 },
  { label: 'southwest-corner', x: 0, y: bathymetry.height - 1 },
  { label: 'southeast-corner', x: bathymetry.width - 1, y: bathymetry.height - 1 },
  { label: 'shelf-break', x: Math.round(bathymetry.width * 0.52), y: Math.round(bathymetry.height * 0.5) },
  { label: 'canyon-center', x: Math.round(bathymetry.width * 0.58), y: Math.round(bathymetry.height * 0.58) },
  { label: 'basin-center', x: Math.round(bathymetry.width * 0.82), y: Math.round(bathymetry.height * 0.54) },
  { label: 'seamount-peak', x: Math.round(bathymetry.width * 0.74), y: Math.round(bathymetry.height * 0.34) }
];

let maxDelta = 0;
for (const sample of samples) {
  const index = sample.y * mesh.width + sample.x;
  const actual = vectorAt(mesh.positions, index);
  const depth = surface.landMask[sample.y]?.[sample.x] ? -Math.abs(surface.optionalLandElevationField[sample.y]?.[sample.x] ?? 3) : surface.bottomDepthField[sample.y]?.[sample.x];
  const expected = gridCellCenterToWorld(transform, sample.x, sample.y, depth);
  if (surface.landMask[sample.y]?.[sample.x]) expected.y = Math.max(0.06, Math.abs(surface.optionalLandElevationField[sample.y]?.[sample.x] ?? 3) * transform.depthScale * transform.verticalExaggeration);
  const delta = Math.max(Math.abs(actual.x - expected.x), Math.abs(actual.y - expected.y), Math.abs(actual.z - expected.z));
  maxDelta = Math.max(maxDelta, delta);
  assert.ok(delta <= 1e-6, `${sample.label} terrain vertex alignment delta ${delta}`);
}

for (const segment of coastline.segments.slice(0, 50)) {
  for (const point of [segment.start, segment.end]) {
    assert.ok(point.x >= -0.5 && point.x <= bathymetry.width - 0.5, 'coastline x stays on canonical cell-boundary domain');
    assert.ok(point.y >= -0.5 && point.y <= bathymetry.height - 0.5, 'coastline y stays on canonical cell-boundary domain');
  }
}
for (const segment of contours.segments.slice(0, 50)) {
  for (const point of [segment.start, segment.end]) {
    assert.ok(point.x >= 0 && point.x <= bathymetry.width - 1, 'contour x stays on canonical sample domain');
    assert.ok(point.y >= 0 && point.y <= bathymetry.height - 1, 'contour y stays on canonical sample domain');
  }
}

console.log(JSON.stringify({
  ok: true,
  terrainSourceDigest: surface.sourceDigest,
  terrainMeshDigest: mesh.meshDigest,
  terrainCoordinateProfileId: mesh.coordinateProfileId,
  checkedPointCount: samples.length,
  maximumCoordinateDelta: Number(maxDelta.toFixed(9)),
  coastlineSegmentCount: coastline.segmentCount,
  contourSegmentCount: contours.segmentCount
}));

function vectorAt(values, index) {
  return { x: Number(values[index * 3]), y: Number(values[index * 3 + 1]), z: Number(values[index * 3 + 2]) };
}
