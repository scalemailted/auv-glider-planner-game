import { buildBathymetrySurfaceViewModel, stableDigest } from './BathymetrySurfaceViewModel.js';

export const BATHYMETRY_CONTOUR_GEOMETRY_VERSION = 'bathymetry-contour-geometry-three-r1-2b';

export function buildBathymetryContourGeometry(options = {}) {
  const surface = options.surfaceModel ?? buildBathymetrySurfaceViewModel(options);
  const levels = normalizeContourLevels(options.levels ?? options.contourDepthsMeters, surface);
  const field = surface.bottomDepthField ?? [];
  const land = surface.landMask ?? [];
  const segments = [];
  for (const level of levels) {
    for (let y = 0; y < field.length - 1; y += 1) {
      for (let x = 0; x < (field[y]?.length ?? 0) - 1; x += 1) {
        if (land[y]?.[x] && land[y]?.[x + 1] && land[y + 1]?.[x] && land[y + 1]?.[x + 1]) continue;
        const points = contourPointsForCell(field, x, y, level);
        if (points.length === 2) segments.push({ id: `contour-${level}-${segments.length + 1}`, levelMeters: level, start: points[0], end: points[1] });
        else if (points.length === 4) {
          segments.push({ id: `contour-${level}-${segments.length + 1}`, levelMeters: level, start: points[0], end: points[1] });
          segments.push({ id: `contour-${level}-${segments.length + 1}`, levelMeters: level, start: points[2], end: points[3] });
        }
      }
    }
  }
  return {
    type: 'anchor.rendering.bathymetry-contour-geometry',
    version: BATHYMETRY_CONTOUR_GEOMETRY_VERSION,
    levelsMeters: levels,
    segments,
    segmentCount: segments.length,
    coordinateProfileId: surface.coordinateProfileId ?? null,
    sourceDigest: stableDigest({ sourceDigest: surface.sourceDigest, levels }),
    publicSafe: true,
    warnings: segments.length ? [] : ['No contour segments are available for the selected levels.']
  };
}

export function validateBathymetryContourGeometry(geometry = {}) {
  const errors = [];
  const warnings = [...(geometry.warnings ?? [])];
  if (geometry.type !== 'anchor.rendering.bathymetry-contour-geometry') errors.push('Bathymetry contour geometry type is invalid.');
  if (!Array.isArray(geometry.levelsMeters) || !geometry.levelsMeters.length) errors.push('Contour geometry requires at least one level.');
  if (!Array.isArray(geometry.segments)) errors.push('Contour geometry requires segments.');
  for (const segment of geometry.segments ?? []) {
    if (!Number.isFinite(Number(segment.levelMeters))) errors.push(`Contour ${segment.id ?? 'unknown'} has invalid level.`);
    if (!finitePoint(segment.start) || !finitePoint(segment.end)) errors.push(`Contour ${segment.id ?? 'unknown'} has non-finite endpoints.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: bathymetryContourGeometrySummary(geometry) };
}

export function bathymetryContourGeometrySummary(geometry = {}) {
  return {
    type: 'anchor.rendering.bathymetry-contour-geometry-summary',
    version: BATHYMETRY_CONTOUR_GEOMETRY_VERSION,
    levelCount: geometry.levelsMeters?.length ?? 0,
    levelsMeters: [...(geometry.levelsMeters ?? [])],
    segmentCount: geometry.segments?.length ?? 0,
    sourceDigest: geometry.sourceDigest ?? null,
    warnings: [...(geometry.warnings ?? [])]
  };
}

function normalizeContourLevels(levels, surface) {
  const max = Number(surface.maximumWaterDepthMeters ?? surface.depthRange?.maxDepthMeters ?? 0);
  const defaults = [10, 25, 50, 100, 250, 500].filter((level) => level > 0 && level < max);
  const raw = Array.isArray(levels) && levels.length ? levels : defaults;
  return [...new Set(raw.map(Number).filter((level) => Number.isFinite(level) && level > 0 && level <= max))].sort((a, b) => a - b);
}

function contourPointsForCell(field, x, y, level) {
  const corners = [
    { x, y, value: Number(field[y]?.[x] ?? 0) },
    { x: x + 1, y, value: Number(field[y]?.[x + 1] ?? 0) },
    { x: x + 1, y: y + 1, value: Number(field[y + 1]?.[x + 1] ?? 0) },
    { x, y: y + 1, value: Number(field[y + 1]?.[x] ?? 0) }
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const points = [];
  for (const [aIndex, bIndex] of edges) {
    const a = corners[aIndex];
    const b = corners[bIndex];
    if ((a.value < level && b.value < level) || (a.value > level && b.value > level) || a.value === b.value) continue;
    const t = (level - a.value) / (b.value - a.value);
    points.push({ x: round(a.x + (b.x - a.x) * t), y: round(a.y + (b.y - a.y) * t) });
  }
  return points;
}

function finitePoint(point = {}) {
  return Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
