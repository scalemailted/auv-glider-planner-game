import { bathymetryFieldStats } from '../science/BathymetryFieldModel.js';

export const BOTTOM_BOUNDARY_VIEW_MODEL_VERSION = 'bottom-boundary-view-model-three-r1-2a';

export function buildBottomBoundaryViewModel(options = {}) {
  const level = options.level ?? options.missionConfig?.level ?? null;
  const grid = normalizeGrid(options.grid ?? level?.world?.grid ?? level?.world ?? {}, options.width, options.height);
  const depthSource = options.bottomDepthField
    ?? options.depthMeters
    ?? options.bathymetry?.depthMeters
    ?? level?.bathymetry?.depthMeters
    ?? level?.world?.bathymetry?.depthMeters
    ?? level?.layers?.depthMeters
    ?? level?.layers?.depth
    ?? null;
  const terrain = options.landMask ?? level?.layers?.terrain ?? null;
  const bottomDepthField = normalizeDepthField(depthSource, grid, terrain, options.defaultWaterDepthMeters ?? 180);
  const landMask = normalizeLandMask(options.landMask ?? options.bathymetry?.landMask ?? options.bathymetry?.landSeaMask ?? level?.bathymetry?.landMask ?? level?.layers?.terrain, grid, bottomDepthField);
  const coastlineMask = buildCoastlineMask(landMask, grid);
  const values = bottomDepthField.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const hazards = normalizeCellRecords(options.hazards ?? level?.layers?.hazards, grid, 'hazard');
  const constraints = normalizeCellRecords(options.constraints ?? level?.layers?.terrain, grid, 'constraint');
  const bathymetryStats = options.bathymetry ? safeBathymetryStats(options.bathymetry) : null;
  const warnings = [];
  if (!depthSource) warnings.push('No canonical bathymetry depth field was present; using a synthetic flat bottom for display constraints.');
  else if (depthSourceStats(depthSource).max <= 2) warnings.push('Normalized depth field converted to synthetic meters for water-column display constraints.');
  return {
    type: 'anchor.rendering.bottom-boundary-view-model',
    version: BOTTOM_BOUNDARY_VIEW_MODEL_VERSION,
    width: grid.width,
    height: grid.height,
    bottomDepthField,
    landMask,
    coastlineMask,
    minimumDepth: values.length ? round(Math.min(...values)) : 0,
    maximumDepth: values.length ? round(Math.max(...values)) : 0,
    hazards,
    constraints,
    terrainSource: depthSource ? 'level-or-bathymetry-depth-field' : 'synthetic-flat-bottom-fallback',
    synthetic: options.synthetic ?? true,
    calibrated: false,
    bathymetryStats,
    warnings,
    publicSafe: true,
    containsHiddenTruth: false,
    usesFull3DPlanning: false
  };
}

export function validateBottomBoundaryViewModel(model = {}) {
  const errors = [];
  const warnings = [...(model.warnings ?? [])];
  if (model.type !== 'anchor.rendering.bottom-boundary-view-model') errors.push('Bottom boundary view model type must be anchor.rendering.bottom-boundary-view-model.');
  if (!Number.isFinite(Number(model.width)) || Number(model.width) <= 0) errors.push('Bottom boundary width must be positive.');
  if (!Number.isFinite(Number(model.height)) || Number(model.height) <= 0) errors.push('Bottom boundary height must be positive.');
  if (!Array.isArray(model.bottomDepthField) || model.bottomDepthField.length !== Number(model.height)) errors.push('bottomDepthField must be a [row][col] depth grid matching height.');
  if (model.calibrated === true) errors.push('R1.2A bottom boundary must not claim calibrated survey data.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: bottomBoundaryViewModelSummary(model) };
}

export function bottomBoundaryViewModelSummary(model = {}) {
  const waterCellCount = (model.bottomDepthField ?? []).flat().filter((value) => Number(value) > 0).length;
  const landCellCount = (model.landMask ?? []).flat().filter(Boolean).length;
  return {
    type: 'anchor.rendering.bottom-boundary-summary',
    version: BOTTOM_BOUNDARY_VIEW_MODEL_VERSION,
    width: Number(model.width ?? 0),
    height: Number(model.height ?? 0),
    minimumDepth: numberOrNull(model.minimumDepth),
    maximumDepth: numberOrNull(model.maximumDepth),
    waterCellCount,
    landCellCount,
    hazardCount: model.hazards?.length ?? 0,
    constraintCount: model.constraints?.length ?? 0,
    synthetic: model.synthetic !== false,
    calibrated: model.calibrated === true,
    publicSafe: model.publicSafe !== false,
    containsHiddenTruth: model.containsHiddenTruth === true,
    warnings: [...(model.warnings ?? [])]
  };
}

function normalizeGrid(grid = {}, widthFallback = null, heightFallback = null) {
  return {
    width: Math.max(1, Math.round(Number(grid.width ?? widthFallback ?? 10)) || 10),
    height: Math.max(1, Math.round(Number(grid.height ?? heightFallback ?? 10)) || 10)
  };
}

function normalizeDepthField(source, grid, terrain = null, fallbackDepth = 180) {
  const stats = depthSourceStats(source);
  const normalizedUnitDepth = stats.count > 0 && stats.max <= 2;
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => {
    if (terrain?.[y]?.[x]) return 0;
    const value = Number(source?.[y]?.[x]);
    if (!Number.isFinite(value)) return Math.max(1, round(fallbackDepth));
    if (normalizedUnitDepth) return Math.max(1, round(20 + Math.max(0, Math.min(1, value)) * 220));
    return Math.max(0, round(value));
  }));
}

function depthSourceStats(source) {
  const values = Array.isArray(source)
    ? source.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0)
    : [];
  return {
    count: values.length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null
  };
}

function normalizeLandMask(source, grid, depthField) {
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => {
    const value = source?.[y]?.[x];
    if (value === true || value === 'land') return true;
    if (value === false || value === 'water') return false;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric > 0 || Number(depthField?.[y]?.[x] ?? 0) <= 0;
    return Number(depthField?.[y]?.[x] ?? 0) <= 0;
  }));
}

function buildCoastlineMask(landMask, grid) {
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => {
    const here = landMask[y]?.[x] === true;
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => landMask[y + dy]?.[x + dx]);
    return neighbors.some((neighbor) => neighbor !== undefined && Boolean(neighbor) !== here);
  }));
}

function normalizeCellRecords(input, grid, kind) {
  if (Array.isArray(input) && input.length && typeof input[0] === 'object' && !Array.isArray(input[0])) {
    return input.map((record, index) => ({ id: record.id ?? `${kind}-${index + 1}`, x: finiteNumber(record.x), y: finiteNumber(record.y), value: finiteNumber(record.value, 1), kind }));
  }
  const records = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (Number(input?.[y]?.[x] ?? 0) > 0) records.push({ id: `${kind}-${x}-${y}`, x, y, value: Number(input[y][x]), kind });
    }
  }
  return records;
}

function safeBathymetryStats(bathymetry) {
  try { return bathymetryFieldStats(bathymetry); } catch { return null; }
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
