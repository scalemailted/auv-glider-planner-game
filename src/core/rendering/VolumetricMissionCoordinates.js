import {
  createMissionWorldCoordinateTransform,
  gridCellToWorld,
  gridCellBoundsToWorld,
  worldToGridCell
} from './MissionWorldCoordinates.js';

export const VOLUMETRIC_MISSION_COORDINATES_VERSION = 'volumetric-mission-coordinates-three-r1-2a';

export function createVolumetricMissionCoordinateModel(options = {}) {
  const base = options.coordinateSystem ?? createMissionWorldCoordinateTransform(options);
  const verticalDisplayMode = normalizeMode(options.verticalDisplayMode);
  const layers = Array.isArray(options.depthLayers) ? options.depthLayers : [];
  return {
    type: 'anchor.rendering.volumetric-mission-coordinate-model',
    version: VOLUMETRIC_MISSION_COORDINATES_VERSION,
    base,
    verticalDisplayMode,
    verticalScale: Number(base.depthScale ?? 0.045) * Number(base.verticalExaggeration ?? 1),
    depthPositiveDirection: 'down',
    worldYPositiveDirection: 'up',
    layerWorldY: Object.fromEntries(layers.map((layer) => [layer.id, verticalDisplayMode === 'explodedLayers' ? layer.explodedWorldY : layer.physicalWorldY])),
    layerDepthMeters: Object.fromEntries(layers.map((layer) => [layer.id, layer.representativeDepthMeters])),
    displayMetadataOnly: verticalDisplayMode === 'explodedLayers'
  };
}

export function gridCellDepthToWorld({ col, row, depthMeters, coordinateModel, transform, verticalDisplayMode = null } = {}) {
  const model = normalizeCoordinateModel(coordinateModel ?? { base: transform, verticalDisplayMode });
  const point = gridCellToWorld(model.base, Number(col), Number(row), Number(depthMeters ?? 0));
  return { ...point, y: depthMetersToWorldY(depthMeters ?? 0, verticalDisplayMode ?? model.verticalDisplayMode, model), col: Math.floor(Number(col)), row: Math.floor(Number(row)) };
}

export function worldPointToGridCellDepth(point = {}, coordinateModel = {}) {
  const model = normalizeCoordinateModel(coordinateModel);
  const cell = worldToGridCell(model.base, point.x, point.y, point.z);
  return { ...cell, col: cell.col, row: cell.row, depthMeters: worldYToDepthMeters(point.y, model.verticalDisplayMode, model) };
}

export function depthMetersToWorldY(depthMeters, mode = 'physicalDepth', coordinateModel = {}) {
  const model = normalizeCoordinateModel(coordinateModel);
  if (normalizeMode(mode) === 'physicalDepth') return round(-Math.max(0, Number(depthMeters) || 0) * model.verticalScale);
  const layerId = coordinateModel.layerId ?? null;
  if (layerId && Number.isFinite(Number(model.layerWorldY?.[layerId]))) return round(model.layerWorldY[layerId]);
  return round(-Math.max(0, Number(depthMeters) || 0) * model.verticalScale);
}

export function worldYToDepthMeters(worldY, mode = 'physicalDepth', coordinateModel = {}) {
  const model = normalizeCoordinateModel(coordinateModel);
  if (normalizeMode(mode) === 'physicalDepth') return round(Math.max(0, -Number(worldY || 0) / Math.max(0.000001, model.verticalScale)));
  const layerMatch = Object.entries(model.layerWorldY ?? {}).find(([_id, y]) => Math.abs(Number(y) - Number(worldY)) <= 1e-6);
  if (layerMatch) return round(Number(model.layerDepthMeters?.[layerMatch[0]] ?? 0));
  return round(Math.max(0, -Number(worldY || 0) / Math.max(0.000001, model.verticalScale)));
}

export function depthLayerCellCenterToWorld(layerId, col, row, coordinateModel = {}) {
  const model = normalizeCoordinateModel({ ...coordinateModel, layerId });
  const depthMeters = Number(model.layerDepthMeters?.[layerId] ?? 0);
  const point = gridCellToWorld(model.base, col, row, depthMeters);
  const y = Number.isFinite(Number(model.layerWorldY?.[layerId])) ? Number(model.layerWorldY[layerId]) : depthMetersToWorldY(depthMeters, model.verticalDisplayMode, model);
  return { ...point, y: round(y), depthLayerId: layerId, depthMeters };
}

export function depthLayerWorldBounds(layerId, coordinateModel = {}) {
  const model = normalizeCoordinateModel({ ...coordinateModel, layerId });
  const depthMeters = Number(model.layerDepthMeters?.[layerId] ?? 0);
  const bounds = gridCellBoundsToWorld(model.base, 0, 0, depthMeters);
  const min = gridCellToWorld(model.base, 0, 0, depthMeters);
  const max = gridCellToWorld(model.base, (model.base.width ?? 1) - 1, (model.base.height ?? 1) - 1, depthMeters);
  const y = Number.isFinite(Number(model.layerWorldY?.[layerId])) ? Number(model.layerWorldY[layerId]) : bounds.center.y;
  return {
    min: { x: Math.min(min.x, max.x), y: round(y), z: Math.min(min.z, max.z) },
    max: { x: Math.max(min.x, max.x), y: round(y), z: Math.max(min.z, max.z) },
    center: { x: 0, y: round(y), z: 0 },
    depthLayerId: layerId,
    depthMeters
  };
}

export function validateVolumetricCoordinateRoundtrip(options = {}) {
  const model = createVolumetricMissionCoordinateModel(options);
  const depth = Number(options.depthMeters ?? 35);
  const world = gridCellDepthToWorld({ col: options.col ?? 2, row: options.row ?? 3, depthMeters: depth, coordinateModel: model });
  const cell = worldPointToGridCellDepth(world, model);
  const errors = [];
  if (cell.col !== Math.floor(Number(options.col ?? 2)) || cell.row !== Math.floor(Number(options.row ?? 3))) errors.push('Grid cell did not roundtrip through volumetric coordinates.');
  if (model.verticalDisplayMode === 'physicalDepth' && Math.abs(cell.depthMeters - depth) > 1e-4) errors.push('Physical depth did not roundtrip through world Y.');
  if (depthMetersToWorldY(depth, 'physicalDepth', model) >= 0 && depth > 0) errors.push('Positive canonical depth must map downward to negative world Y.');
  return { valid: errors.length === 0, errors, model, world, cell };
}

function normalizeCoordinateModel(model = {}) {
  if (model.type === 'anchor.rendering.volumetric-mission-coordinate-model') return model;
  const base = model.base ?? model.coordinateSystem ?? model.transform ?? createMissionWorldCoordinateTransform(model);
  return createVolumetricMissionCoordinateModel({ ...model, coordinateSystem: base });
}

function normalizeMode(value) {
  return value === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth';
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
