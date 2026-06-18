export const MISSION_WORLD_COORDINATES_VERSION = 'mission-world-coordinates-gfx-r3a';

export function createMissionWorldCoordinateTransform(options = {}) {
  const grid = options.grid ?? {};
  const width = positiveNumber(grid.width ?? options.width, 1);
  const height = positiveNumber(grid.height ?? options.height, 1);
  const cellSize = positiveNumber(options.cellSize ?? options.horizontalScale, 1);
  const depthScale = positiveNumber(options.depthScale, 0.045);
  const verticalExaggeration = positiveNumber(options.verticalExaggeration, 1.35);
  const origin = options.origin ?? 'grid-center';
  const row0 = options.row0 ?? 'north/top';
  return {
    type: 'anchor.rendering.mission-world-coordinate-transform',
    version: MISSION_WORLD_COORDINATES_VERSION,
    coordinateFrame: 'grid-cell-center-top-left-row-major',
    origin,
    row0,
    width,
    height,
    cellSize,
    depthScale,
    verticalExaggeration,
    depthPositiveDirection: 'down',
    worldYPositiveDirection: 'up',
    notes: 'col increases east/right, row increases south/down; row 0 appears north/top. Positive depthMeters maps to negative world y.'
  };
}

export function gridCellToWorld(transform, col, row, depthMeters = 0) {
  const tx = validateMissionWorldCoordinateTransform(transform).transform;
  const x = (Number(col) + 0.5 - tx.width / 2) * tx.cellSize;
  const z = (Number(row) + 0.5 - tx.height / 2) * tx.cellSize;
  const y = -finiteNumber(depthMeters, 0) * tx.depthScale * tx.verticalExaggeration;
  return { x: round(x), y: round(y), z: round(z), col: Math.floor(Number(col)), row: Math.floor(Number(row)), depthMeters: finiteNumber(depthMeters, 0) };
}

export function worldToGridCell(transform, x, y, z) {
  const tx = validateMissionWorldCoordinateTransform(transform).transform;
  const col = Math.floor((Number(x) / tx.cellSize) + tx.width / 2);
  const row = Math.floor((Number(z) / tx.cellSize) + tx.height / 2);
  const depthMeters = Math.max(0, -finiteNumber(y, 0) / Math.max(0.000001, tx.depthScale * tx.verticalExaggeration));
  return { col, row, x: col, y: row, depthMeters: round(depthMeters), inside: col >= 0 && row >= 0 && col < tx.width && row < tx.height };
}

export function missionPositionToWorld(transform, position = {}) {
  return gridCellToWorld(transform, position.x ?? position.col ?? 0, position.y ?? position.row ?? 0, position.depthMeters ?? depthForLayer(position.depthLayerId ?? position.depthLayer));
}

export function missionWorldToNormalized(transform, worldPoint = {}) {
  const tx = validateMissionWorldCoordinateTransform(transform).transform;
  const cell = worldToGridCell(tx, worldPoint.x, worldPoint.y, worldPoint.z);
  return {
    x: tx.width <= 1 ? 0 : clamp01((cell.col + 0.5) / tx.width),
    y: tx.height <= 1 ? 0 : clamp01((cell.row + 0.5) / tx.height),
    depthFraction: clamp01(cell.depthMeters / 1000),
    cell
  };
}

export function validateMissionWorldCoordinateTransform(transform = {}) {
  const normalized = {
    ...transform,
    width: positiveNumber(transform.width, 1),
    height: positiveNumber(transform.height, 1),
    cellSize: positiveNumber(transform.cellSize, 1),
    depthScale: positiveNumber(transform.depthScale, 0.045),
    verticalExaggeration: positiveNumber(transform.verticalExaggeration, 1)
  };
  const errors = [];
  if (!Number.isFinite(normalized.width) || normalized.width <= 0) errors.push('Coordinate transform width must be positive.');
  if (!Number.isFinite(normalized.height) || normalized.height <= 0) errors.push('Coordinate transform height must be positive.');
  if (!Number.isFinite(normalized.cellSize) || normalized.cellSize <= 0) errors.push('Coordinate transform cellSize must be positive.');
  return { valid: errors.length === 0, errors, transform: normalized };
}

export function depthForLayer(layerId) {
  if (layerId === 'surface') return 0;
  if (layerId === 'thermocline' || layerId === 'mid') return 90;
  if (layerId === 'deep' || layerId === 'bottom') return 260;
  return 0;
}

function positiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}
