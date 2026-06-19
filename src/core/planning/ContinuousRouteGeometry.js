import { continuousPointToContainingCell, normalizeContinuousMissionPoint } from '../geometry/ContinuousMissionCoordinates.js';

export const CONTINUOUS_ROUTE_GEOMETRY_VERSION = 'continuous-route-geometry-three-r1-2a-3';

export function continuousSegmentLength(a = {}, b = {}, transform = {}) {
  const start = normalizeContinuousMissionPoint(a, transform);
  const end = normalizeContinuousMissionPoint(b, transform);
  const cellSize = positive(transform.cellSize ?? transform.horizontalScale, 1);
  return Math.hypot(end.x - start.x, end.y - start.y) * cellSize;
}

export function sampleContinuousRouteSegment(segment = {}, options = {}) {
  const from = normalizeContinuousMissionPoint(segment.from ?? segment.a ?? segment.start ?? {}, options);
  const to = normalizeContinuousMissionPoint(segment.to ?? segment.b ?? segment.end ?? {}, options);
  const lengthCells = Math.hypot(to.x - from.x, to.y - from.y);
  const maxSpacingCells = positive(options.maxSpacingCells ?? options.maxSampleSpacingCells ?? 0.25, 0.25);
  const minSamples = Math.max(2, Math.ceil(lengthCells / maxSpacingCells) + 1);
  const sampleCount = Math.min(Math.max(minSamples, Number(options.minimumSamples ?? 2)), Number(options.maximumSamples ?? 2048));
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    const point = normalizeContinuousMissionPoint({ x, y }, options);
    samples.push({
      index,
      progress: round(progress),
      x: point.x,
      y: point.y,
      containingCell: continuousPointToContainingCell(point, options),
      distanceFromStart: round(lengthCells * progress)
    });
  }
  return {
    type: 'anchor.planning.continuous-route-segment-samples',
    version: CONTINUOUS_ROUTE_GEOMETRY_VERSION,
    from,
    to,
    lengthCells: round(lengthCells),
    lengthMeters: round(lengthCells * positive(options.cellSize ?? options.transform?.cellSize, 1)),
    maxSpacingCells,
    sampleCount: samples.length,
    samples
  };
}

export function validateContinuousRouteSegment(segment = {}, environment = {}, options = {}) {
  const context = { ...(options.transform ?? {}), ...(environment.grid ?? {}), grid: environment.grid ?? options.grid ?? options.transform ?? null };
  const sampled = sampleContinuousRouteSegment(segment, { ...context, ...options });
  const errors = [];
  const warnings = [];
  const blockedSamples = [];
  const hazardSamples = [];
  const bathymetryWarnings = [];
  for (const sample of sampled.samples) {
    const cell = sample.containingCell;
    if (!insideGrid(cell, environment.grid ?? options.grid ?? context)) {
      blockedSamples.push({ ...sample, reason: 'outsideMissionBounds' });
      continue;
    }
    if (terrainAt(environment, cell)) blockedSamples.push({ ...sample, reason: 'landIntersection' });
    if (restrictedAt(environment, sample, cell)) blockedSamples.push({ ...sample, reason: 'restrictedRegionIntersection' });
    if (hazardAt(environment, sample, cell)) hazardSamples.push({ ...sample, reason: 'hazardIntersection' });
    const bottomDepth = sampleBathymetry(environment, sample.x, sample.y);
    const requestedDepth = Number(segment.maximumDepthMeters ?? segment.targetDepthMeters ?? options.maximumDepthMeters ?? 0);
    const clearance = bottomDepth - requestedDepth;
    if (requestedDepth > 0 && Number.isFinite(bottomDepth) && clearance < Number(options.minimumBottomClearanceMeters ?? 5)) {
      bathymetryWarnings.push({ ...sample, bottomDepthMeters: bottomDepth, clearanceMeters: round(clearance), reason: 'bottomClearance' });
    }
  }
  if (blockedSamples.length) errors.push(`Continuous segment intersects blocked terrain or restricted space at ${blockedSamples.length} sampled point(s).`);
  if (hazardSamples.length) warnings.push(`Continuous segment intersects hazard volume/cell at ${hazardSamples.length} sampled point(s).`);
  if (bathymetryWarnings.length) warnings.push(`Continuous segment violates bottom-clearance estimate at ${bathymetryWarnings.length} sampled point(s).`);
  return {
    type: 'anchor.planning.continuous-route-segment-validation',
    version: CONTINUOUS_ROUTE_GEOMETRY_VERSION,
    valid: errors.length === 0,
    status: errors.length ? 'blocked' : warnings.length ? 'warning' : 'clear',
    errors,
    warnings,
    sampled,
    blockedSamples,
    hazardSamples,
    bathymetryWarnings,
    adaptiveSampling: true,
    endpointOnlyValidation: false,
    maximumSpacingCells: sampled.maxSpacingCells
  };
}

export function closestPointOnContinuousSegment(point = {}, segment = {}) {
  const p = normalizeContinuousMissionPoint(point);
  const a = normalizeContinuousMissionPoint(segment.from ?? segment.a ?? segment.start ?? {});
  const b = normalizeContinuousMissionPoint(segment.to ?? segment.b ?? segment.end ?? {});
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denom = dx * dx + dy * dy;
  const progress = denom <= 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / denom));
  const closest = normalizeContinuousMissionPoint({ x: a.x + dx * progress, y: a.y + dy * progress });
  return { point: closest, progress: round(progress), distanceCells: round(Math.hypot(p.x - closest.x, p.y - closest.y)) };
}

export function continuousRouteGeometrySummary(route = {}) {
  const points = route.points ?? route.waypoints ?? [];
  let lengthCells = 0;
  for (let index = 1; index < points.length; index += 1) {
    lengthCells += continuousSegmentLength(points[index - 1], points[index]);
  }
  return {
    type: 'anchor.planning.continuous-route-geometry-summary',
    version: CONTINUOUS_ROUTE_GEOMETRY_VERSION,
    pointCount: points.length,
    segmentCount: Math.max(0, points.length - 1),
    lengthCells: round(lengthCells),
    usesContinuousWaypoints: points.some((point) => !Number.isInteger(Number(point.x)) || !Number.isInteger(Number(point.y))),
    endpointOnlyValidation: false
  };
}

function insideGrid(cell, grid = {}) {
  const width = Number(grid?.width ?? Infinity);
  const height = Number(grid?.height ?? Infinity);
  return cell.col >= 0 && cell.row >= 0 && cell.col < width && cell.row < height;
}

function terrainAt(environment, cell) {
  return Boolean(environment.level?.layers?.terrain?.[cell.row]?.[cell.col] ?? environment.terrain?.[cell.row]?.[cell.col]);
}

function hazardAt(environment, sample, cell) {
  return Number(environment.level?.layers?.hazards?.[cell.row]?.[cell.col] ?? environment.hazards?.[cell.row]?.[cell.col] ?? 0) > 0;
}

function restrictedAt(environment, sample, cell) {
  const regions = environment.restrictedZones ?? environment.level?.layers?.static?.restrictedZones ?? [];
  return regions.some((region) => pointInsideRegion(sample, region, cell));
}

function pointInsideRegion(sample, region, cell) {
  if (Array.isArray(region.cells) && region.cells.some((candidate) => Math.round(candidate.x ?? candidate.col) === cell.col && Math.round(candidate.y ?? candidate.row) === cell.row)) return true;
  if (Number.isFinite(Number(region.x)) && Number.isFinite(Number(region.y)) && Number(region.radius ?? 0) > 0) {
    return Math.hypot(sample.x - Number(region.x), sample.y - Number(region.y)) <= Number(region.radius);
  }
  return false;
}

function sampleBathymetry(environment, x, y) {
  const grid = environment.bathymetry?.depthMeters ?? environment.level?.bathymetry?.depthMeters ?? environment.level?.layers?.bathymetry ?? null;
  if (!Array.isArray(grid) || !grid.length) return Infinity;
  const x0 = Math.max(0, Math.min(grid[0].length - 1, Math.floor(Number(x))));
  const y0 = Math.max(0, Math.min(grid.length - 1, Math.floor(Number(y))));
  const x1 = Math.max(0, Math.min(grid[0].length - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(grid.length - 1, y0 + 1));
  const tx = Math.max(0, Math.min(1, Number(x) - x0));
  const ty = Math.max(0, Math.min(1, Number(y) - y0));
  const top = Number(grid[y0]?.[x0] ?? 0) * (1 - tx) + Number(grid[y0]?.[x1] ?? 0) * tx;
  const bottom = Number(grid[y1]?.[x0] ?? 0) * (1 - tx) + Number(grid[y1]?.[x1] ?? 0) * tx;
  return round(top * (1 - ty) + bottom * ty);
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
