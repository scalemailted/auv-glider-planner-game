import assert from 'node:assert/strict';

import { createIslandArcBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { extractCoastlineSegments, simplifyCoastlineSegments, validateCoastlineGeometry } from '../../src/core/rendering/CoastlineGeometry.js';

const bathymetry = createIslandArcBathymetry({ seed: 'coastline-topology', width: 58, height: 38 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const coastline = simplifyCoastlineSegments({ geometry: extractCoastlineSegments({ surfaceModel: surface }) });
const validation = validateCoastlineGeometry(coastline);
assert.equal(validation.valid, true);
assert.ok(coastline.segmentCount > 0, 'coastline segments are expected');

const degree = new Map();
const segments = new Set();
let duplicate = 0;
for (const segment of coastline.segments) {
  const key = segmentKey(segment);
  if (segments.has(key)) duplicate += 1;
  segments.add(key);
  for (const point of [segment.start, segment.end]) {
    const keyPoint = pointKey(point);
    degree.set(keyPoint, (degree.get(keyPoint) ?? 0) + 1);
  }
}
const openEndpoints = [...degree.entries()].filter(([, count]) => count === 1).map(([key]) => parsePointKey(key));
const interiorOpenEndpoints = openEndpoints.filter((point) => !onDomainBoundary(point, bathymetry.width, bathymetry.height));
const branchEndpoints = [...degree.values()].filter((count) => count > 2).length;
const coastlineOpenChainCount = Math.ceil(openEndpoints.length / 2);
const coastlineClosedLoopCount = Math.max(0, Math.round((coastline.segmentCount - openEndpoints.length) / Math.max(1, coastline.segmentCount / 8)));
const coastlineGapWarningCount = interiorOpenEndpoints.length + branchEndpoints;

assert.equal(duplicate, 0, 'coastline duplicate segment count');
assert.equal(coastlineGapWarningCount, 0, 'coastline has no interior gaps or branches');
assert.ok(surface.landMask.flat().some(Boolean), 'fixture includes land');
assert.ok(surface.waterMask.flat().some(Boolean), 'fixture includes water');

console.log(JSON.stringify({
  ok: true,
  coastlineSegmentCount: coastline.segmentCount,
  coastlineOpenChainCount,
  coastlineClosedLoopCount,
  coastlineDuplicateSegmentCount: duplicate,
  coastlineGapWarningCount,
  landCellCount: surface.landMask.flat().filter(Boolean).length,
  waterCellCount: surface.waterMask.flat().filter(Boolean).length
}));

function segmentKey(segment) {
  const a = pointKey(segment.start);
  const b = pointKey(segment.end);
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
function pointKey(point) {
  return `${Number(point.x).toFixed(6)},${Number(point.y).toFixed(6)}`;
}
function parsePointKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}
function onDomainBoundary(point, width, height) {
  return Math.abs(point.x + 0.5) <= 1e-6 || Math.abs(point.y + 0.5) <= 1e-6 || Math.abs(point.x - (width - 0.5)) <= 1e-6 || Math.abs(point.y - (height - 0.5)) <= 1e-6;
}
