import { buildBathymetrySurfaceViewModel, stableDigest } from './BathymetrySurfaceViewModel.js';

export const COASTLINE_GEOMETRY_VERSION = 'coastline-geometry-three-r1-2b';

export function extractCoastlineSegments(options = {}) {
  const surface = options.surfaceModel ?? buildBathymetrySurfaceViewModel(options);
  const land = surface.landMask ?? [];
  const width = Number(surface.width ?? land[0]?.length ?? 0);
  const height = Number(surface.height ?? land.length ?? 0);
  const segments = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const here = land[y]?.[x] === true;
      if (x < width - 1 && here !== (land[y]?.[x + 1] === true)) {
        segments.push(segment(x + 0.5, y - 0.5, x + 0.5, y + 0.5, segments.length));
      }
      if (y < height - 1 && here !== (land[y + 1]?.[x] === true)) {
        segments.push(segment(x - 0.5, y + 0.5, x + 0.5, y + 0.5, segments.length));
      }
    }
  }
  return {
    type: 'anchor.rendering.coastline-geometry',
    version: COASTLINE_GEOMETRY_VERSION,
    segments,
    segmentCount: segments.length,
    coordinateProfileId: surface.coordinateProfileId ?? null,
    sourceDigest: stableDigest({ landMask: surface.landMask, coastline: segments.map((entry) => [entry.start.x, entry.start.y, entry.end.x, entry.end.y]) }),
    deterministic: true,
    publicSafe: true,
    warnings: segments.length ? [] : ['No coastline segments were extracted from the land/water mask.']
  };
}

export function simplifyCoastlineSegments(options = {}) {
  const geometry = options.geometry ?? extractCoastlineSegments(options);
  const precision = Number(options.precision ?? 6);
  const seen = new Set();
  const segments = [];
  for (const entry of geometry.segments ?? []) {
    const key = segmentKey(entry, precision);
    if (seen.has(key)) continue;
    seen.add(key);
    segments.push(entry);
  }
  return { ...geometry, segments, segmentCount: segments.length, simplified: true };
}

export function validateCoastlineGeometry(geometry = {}) {
  const errors = [];
  const warnings = [...(geometry.warnings ?? [])];
  if (geometry.type !== 'anchor.rendering.coastline-geometry') errors.push('Coastline geometry type is invalid.');
  if (!Array.isArray(geometry.segments)) errors.push('Coastline geometry requires segments.');
  for (const entry of geometry.segments ?? []) {
    if (!finitePoint(entry.start) || !finitePoint(entry.end)) errors.push(`Coastline segment ${entry.id ?? 'unknown'} has non-finite endpoints.`);
  }
  const unique = new Set((geometry.segments ?? []).map((entry) => segmentKey(entry, 6)));
  if (unique.size !== (geometry.segments ?? []).length) warnings.push('Coastline geometry contains duplicate segments.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: coastlineGeometrySummary(geometry) };
}

export function coastlineGeometrySummary(geometry = {}) {
  return {
    type: 'anchor.rendering.coastline-geometry-summary',
    version: COASTLINE_GEOMETRY_VERSION,
    segmentCount: geometry.segments?.length ?? 0,
    sourceDigest: geometry.sourceDigest ?? null,
    coordinateProfileId: geometry.coordinateProfileId ?? null,
    deterministic: geometry.deterministic === true,
    publicSafe: geometry.publicSafe !== false,
    warnings: [...(geometry.warnings ?? [])]
  };
}

function segment(x1, y1, x2, y2, index) {
  return { id: `coastline-segment-${index + 1}`, start: { x: round(x1), y: round(y1) }, end: { x: round(x2), y: round(y2) } };
}

function segmentKey(entry, precision) {
  const a = `${round(entry.start?.x, precision)},${round(entry.start?.y, precision)}`;
  const b = `${round(entry.end?.x, precision)},${round(entry.end?.y, precision)}`;
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function finitePoint(point = {}) {
  return Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
