export const CONTINUOUS_MISSION_COORDINATES_VERSION = 'continuous-mission-coordinates-three-r1-2a-3';
export const CONTINUOUS_MISSION_COORDINATE_FRAME = 'continuousGridV1';
export const LEGACY_INTEGER_COORDINATE_PROFILE_ID = 'legacyIntegerCellsV1';
export const CONTINUOUS_COORDINATE_PROFILE_ID = 'continuousGridV1';

export function createContinuousMissionPoint(options = {}) {
  return normalizeContinuousMissionPoint({
    x: options.x ?? options.col,
    y: options.y ?? options.row,
    coordinateFrame: options.coordinateFrame ?? CONTINUOUS_MISSION_COORDINATE_FRAME,
    optionalLocalMeters: options.optionalLocalMeters ?? options.localMeters ?? null,
    optionalGeographic: options.optionalGeographic ?? options.geographic ?? null
  }, options.context ?? options);
}

export function normalizeContinuousMissionPoint(point = {}, context = {}) {
  const x = finite(point.x ?? point.col, NaN);
  const y = finite(point.y ?? point.row, NaN);
  const normalized = {
    x,
    y,
    coordinateFrame: point.coordinateFrame ?? CONTINUOUS_MISSION_COORDINATE_FRAME,
    optionalLocalMeters: normalizeLocalMeters(point.optionalLocalMeters ?? point.localMeters),
    optionalGeographic: normalizeGeographic(point.optionalGeographic ?? point.geographic),
    derivedCell: continuousPointToContainingCell({ x, y }, context),
    convention: 'legacy integer cell centers are represented as x = col and y = row; no half-cell migration is applied'
  };
  if (!normalized.optionalLocalMeters && context.transform) {
    normalized.optionalLocalMeters = continuousPointToLocalMeters(normalized, context.transform);
  }
  return normalized;
}

export function validateContinuousMissionPoint(point = {}, context = {}) {
  const normalized = normalizeContinuousMissionPoint(point, context);
  const errors = [];
  const warnings = [];
  if (!Number.isFinite(normalized.x) || !Number.isFinite(normalized.y)) errors.push('Continuous mission point requires finite x and y.');
  if (normalized.coordinateFrame !== CONTINUOUS_MISSION_COORDINATE_FRAME) warnings.push(`Unknown coordinate frame "${normalized.coordinateFrame}" will be treated as continuousGridV1.`);
  const grid = context.grid ?? context.world?.grid ?? context.level?.world?.grid ?? context.transform ?? null;
  if (grid) {
    const width = positive(grid.width, 1);
    const height = positive(grid.height, 1);
    if (normalized.x < -0.5 || normalized.y < -0.5 || normalized.x > width - 0.5 || normalized.y > height - 0.5) {
      errors.push(`Continuous mission point (${round(normalized.x)}, ${round(normalized.y)}) is outside the mission domain.`);
    }
  }
  return { valid: errors.length === 0, errors, warnings, point: normalized };
}

export function legacyCellToContinuousPoint(cell = {}, transform = {}) {
  const col = finite(cell.col ?? cell.x, NaN);
  const row = finite(cell.row ?? cell.y, NaN);
  return normalizeContinuousMissionPoint({
    x: col,
    y: row,
    coordinateFrame: CONTINUOUS_MISSION_COORDINATE_FRAME
  }, { transform, grid: transform });
}

export function continuousPointToContainingCell(point = {}, transform = {}) {
  const grid = transform.grid ?? transform.world?.grid ?? transform.level?.world?.grid ?? transform;
  const width = positive(grid?.width, Infinity);
  const height = positive(grid?.height, Infinity);
  const col = clampInt(Math.round(finite(point.x ?? point.col, 0)), 0, Math.max(0, width - 1));
  const row = clampInt(Math.round(finite(point.y ?? point.row, 0)), 0, Math.max(0, height - 1));
  return { col, row, x: col, y: row, convention: 'center-aware-containing-cell' };
}

export function continuousPointToNearestCell(point = {}, transform = {}) {
  return { ...continuousPointToContainingCell(point, transform), convention: 'nearest-legacy-cell-center' };
}

export function continuousPointToLocalMeters(point = {}, transform = {}) {
  const cellSize = positive(transform.cellSize ?? transform.horizontalScale, 1);
  const width = positive(transform.width ?? transform.grid?.width, 1);
  const height = positive(transform.height ?? transform.grid?.height, 1);
  const x = finite(point.x ?? point.col, 0);
  const y = finite(point.y ?? point.row, 0);
  return {
    east: round((x + 0.5 - width / 2) * cellSize),
    north: round((y + 0.5 - height / 2) * cellSize),
    coordinateFrame: 'localMissionMetersV1'
  };
}

export function localMetersToContinuousPoint(point = {}, transform = {}) {
  const cellSize = positive(transform.cellSize ?? transform.horizontalScale, 1);
  const width = positive(transform.width ?? transform.grid?.width, 1);
  const height = positive(transform.height ?? transform.grid?.height, 1);
  const east = finite(point.east ?? point.x, 0);
  const north = finite(point.north ?? point.z ?? point.y, 0);
  return normalizeContinuousMissionPoint({
    x: east / cellSize + width / 2 - 0.5,
    y: north / cellSize + height / 2 - 0.5,
    optionalLocalMeters: { east, north, coordinateFrame: 'localMissionMetersV1' }
  }, { transform, grid: transform });
}

export function continuousMissionPointSummary(point = {}) {
  const normalized = normalizeContinuousMissionPoint(point);
  return {
    version: CONTINUOUS_MISSION_COORDINATES_VERSION,
    x: round(normalized.x),
    y: round(normalized.y),
    coordinateFrame: normalized.coordinateFrame,
    containingCell: normalized.derivedCell ? { col: normalized.derivedCell.col, row: normalized.derivedCell.row } : null,
    legacyCellCenterConvention: 'x = col, y = row',
    silentHalfCellMigration: false
  };
}

function normalizeLocalMeters(value = null) {
  if (!value || typeof value !== 'object') return null;
  const east = finite(value.east ?? value.x, NaN);
  const north = finite(value.north ?? value.y ?? value.z, NaN);
  if (!Number.isFinite(east) || !Number.isFinite(north)) return null;
  return { east, north, coordinateFrame: value.coordinateFrame ?? 'localMissionMetersV1' };
}

function normalizeGeographic(value = null) {
  if (!value || typeof value !== 'object') return null;
  const latitude = finite(value.latitude ?? value.lat, NaN);
  const longitude = finite(value.longitude ?? value.lon ?? value.lng, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
