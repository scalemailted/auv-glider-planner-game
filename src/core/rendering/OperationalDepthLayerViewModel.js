import {
  normalizeWaterColumnConfig,
  waterColumnLayerMetadata,
  WATER_COLUMN_DEPTH_LAYER_IDS,
  WATER_COLUMN_SCHEMA_VERSION
} from '../science/WaterColumnSchema.js';
import { buildBottomBoundaryViewModel } from './BottomBoundaryViewModel.js';

export const OPERATIONAL_DEPTH_LAYER_VIEW_MODEL_VERSION = 'operational-depth-layer-view-model-three-r1-2a';

export function buildOperationalDepthLayerViewModel(options = {}) {
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? options.missionConfig?.waterColumnConfig ?? options);
  const bottomBoundary = options.bottomBoundary ?? buildBottomBoundaryViewModel({ level: options.level, grid: options.grid });
  const grid = { width: bottomBoundary.width, height: bottomBoundary.height };
  const verticalDisplayMode = normalizeVerticalDisplayMode(options.verticalDisplayMode ?? options.displaySettings?.verticalDisplayMode ?? 'physicalDepth');
  const activeDepthLayerId = normalizeLayerForView(options.activeDepthLayerId ?? options.selectedDepthLayerId ?? options.displaySettings?.activeDepthLayerId, config.depthLayerIds[0] ?? 'surface');
  const visibleSet = visibleLayerSet(options, config);
  const layers = buildLayerRecords({ config, bottomBoundary, grid, options, activeDepthLayerId, visibleSet });
  const validDepthMask = Object.fromEntries(layers.map((layer) => [layer.id, layer.validCellMask]));
  const maskedBySeabedCounts = Object.fromEntries(layers.map((layer) => [layer.id, grid.width * grid.height - layer.waterCellCount]));
  return {
    type: 'anchor.rendering.operational-depth-layer-view-model',
    version: OPERATIONAL_DEPTH_LAYER_VIEW_MODEL_VERSION,
    schemaVersion: WATER_COLUMN_SCHEMA_VERSION,
    verticalDisplayMode,
    activeDepthLayerId,
    layerIds: layers.map((layer) => layer.id),
    canonicalLayerIds: config.depthLayerIds.slice(),
    layers,
    validDepthMask,
    maskedBySeabedCounts,
    bottomBoundary,
    warnings: layers.flatMap((layer) => layer.warnings ?? []),
    publicSafe: true,
    usesFull3DPlanning: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false
  };
}

export function validateOperationalDepthLayerViewModel(model = {}) {
  const errors = [];
  const warnings = [...(model.warnings ?? [])];
  if (model.type !== 'anchor.rendering.operational-depth-layer-view-model') errors.push('Operational depth layer view model type is invalid.');
  if (!Array.isArray(model.layers) || !model.layers.length) errors.push('Operational depth layer view model needs at least one layer.');
  for (const layer of model.layers ?? []) {
    if (!layer.id) errors.push('Every operational depth layer needs an id.');
    if (layer.id !== 'integratedWaterColumn' && layer.id !== 'waterSurface' && !WATER_COLUMN_DEPTH_LAYER_IDS.includes(layer.id)) errors.push(`Unsupported depth layer id ${layer.id}.`);
    if (layer.representativeDepthMeters !== null && !Number.isFinite(Number(layer.representativeDepthMeters))) errors.push(`Layer ${layer.id} representativeDepthMeters must be finite or null.`);
    if (layer.representativeDepthMeters !== null && Number(layer.representativeDepthMeters) < 0) errors.push(`Layer ${layer.id} canonical depth must be positive downward.`);
    if (!Array.isArray(layer.validCellMask)) errors.push(`Layer ${layer.id} requires validCellMask.`);
  }
  if (model.usesFull3DPlanning === true) errors.push('Operational depth layers must not claim free-flight 3D planning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: operationalDepthLayerViewModelSummary(model) };
}

export function operationalDepthLayerViewModelSummary(model = {}) {
  return {
    type: 'anchor.rendering.operational-depth-layer-summary',
    version: OPERATIONAL_DEPTH_LAYER_VIEW_MODEL_VERSION,
    verticalDisplayMode: model.verticalDisplayMode ?? null,
    activeDepthLayerId: model.activeDepthLayerId ?? null,
    canonicalLayerCount: model.canonicalLayerIds?.length ?? 0,
    layerCount: model.layers?.length ?? 0,
    visibleLayerCount: (model.layers ?? []).filter((layer) => layer.visible !== false).length,
    interactiveLayerCount: (model.layers ?? []).filter((layer) => layer.interactive !== false && layer.visible !== false).length,
    layerIds: (model.layers ?? []).map((layer) => layer.id),
    layerDepthMeters: Object.fromEntries((model.layers ?? []).map((layer) => [layer.id, layer.representativeDepthMeters])),
    layerWorldY: Object.fromEntries((model.layers ?? []).map((layer) => [layer.id, model.verticalDisplayMode === 'explodedLayers' ? layer.explodedWorldY : layer.physicalWorldY])),
    waterCellCounts: Object.fromEntries((model.layers ?? []).map((layer) => [layer.id, layer.waterCellCount ?? 0])),
    usesFull3DPlanning: model.usesFull3DPlanning === true,
    ownsPlanning: model.ownsPlanning === true,
    ownsSimulation: model.ownsSimulation === true,
    ownsScoring: model.ownsScoring === true,
    publicSafe: model.publicSafe !== false,
    warnings: [...(model.warnings ?? [])]
  };
}

function buildLayerRecords({ config, bottomBoundary, grid, options, activeDepthLayerId, visibleSet }) {
  const ids = ['waterSurface', ...config.depthLayerIds];
  if (!ids.includes('integratedWaterColumn')) ids.push('integratedWaterColumn');
  const scale = finiteNumber(options.verticalScale ?? options.coordinateSystem?.depthScale, 0.045) * finiteNumber(options.verticalExaggeration ?? options.coordinateSystem?.verticalExaggeration, 1.35);
  const explodedSpacing = finiteNumber(options.explodedLayerSpacingWorldUnits, Math.max(0.72, Math.min(4, grid.height * 0.08)));
  return ids.map((id, index) => {
    const metadata = metadataForLayer(id);
    const representativeDepthMeters = representativeDepthForLayer(id, metadata);
    const minimumDepthMeters = minDepthForLayer(id, metadata, representativeDepthMeters);
    const maximumDepthMeters = maxDepthForLayer(id, metadata, representativeDepthMeters);
    const requiredDepth = id === 'waterSurface' || id === 'integratedWaterColumn' ? 0 : Math.max(0, representativeDepthMeters ?? minimumDepthMeters ?? 0);
    const mask = validMaskForLayer(bottomBoundary, grid, requiredDepth, id);
    const visible = visibleSet.has(id);
    const warnings = [];
    if (id === 'integratedWaterColumn') warnings.push('Integrated water-column view is a top-down collapse, not a physical depth slab.');
    return {
      id,
      label: id === 'waterSurface' ? 'Water Surface' : metadata.label ?? labelize(id),
      representativeDepthMeters,
      minimumDepthMeters,
      maximumDepthMeters,
      canonicalIndex: id === 'waterSurface' ? -1 : id === 'integratedWaterColumn' ? null : config.depthLayerIds.indexOf(id),
      renderOrder: index,
      visible,
      interactive: visible && id !== 'waterSurface' && id !== 'bottom',
      selected: id === activeDepthLayerId,
      fieldAvailability: fieldAvailabilityForLayer(id, options),
      currentAvailability: currentAvailabilityForLayer(id, options),
      validCellMask: mask,
      waterCellCount: mask.flat().filter(Boolean).length,
      physicalWorldY: representativeDepthMeters === null ? 0.02 : round(-representativeDepthMeters * scale),
      explodedWorldY: round(-index * explodedSpacing),
      opacity: opacityForLayer(id, options, id === activeDepthLayerId),
      warnings
    };
  });
}

function metadataForLayer(id) {
  if (id === 'waterSurface') return { id, label: 'Water Surface', nominalDepthMeters: 0, thicknessMeters: 0 };
  if (id === 'integratedWaterColumn') return { id, label: 'Integrated Water Column', nominalDepthMeters: null, thicknessMeters: null };
  return waterColumnLayerMetadata(id);
}

function representativeDepthForLayer(id, metadata) {
  if (id === 'integratedWaterColumn') return null;
  return finiteOrNull(metadata.nominalDepthMeters ?? metadata.representativeDepthMeters ?? 0);
}

function minDepthForLayer(id, metadata, representative) {
  if (id === 'integratedWaterColumn') return null;
  const thickness = finiteNumber(metadata.thicknessMeters, 0);
  return round(Math.max(0, Number(representative ?? 0) - thickness / 2));
}

function maxDepthForLayer(id, metadata, representative) {
  if (id === 'integratedWaterColumn') return null;
  const thickness = finiteNumber(metadata.thicknessMeters, 0);
  return round(Math.max(Number(representative ?? 0), Number(representative ?? 0) + thickness / 2));
}

function validMaskForLayer(bottomBoundary, grid, requiredDepth, layerId) {
  return Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => {
    if (bottomBoundary.landMask?.[row]?.[col]) return false;
    const bottom = Number(bottomBoundary.bottomDepthField?.[row]?.[col] ?? 0);
    if (layerId === 'integratedWaterColumn') return bottom > 0;
    return bottom >= requiredDepth;
  }));
}

function visibleLayerSet(options, config) {
  const supported = new Set(['waterSurface', ...config.depthLayerIds, 'integratedWaterColumn']);
  const hidden = new Set(options.hiddenLayerIds ?? options.displaySettings?.hiddenLayerIds ?? []);
  const explicit = options.visibleLayerIds ?? options.displaySettings?.visibleLayerIds ?? null;
  if (Array.isArray(explicit) && explicit.length) return new Set(explicit.filter((id) => supported.has(id)));
  return new Set([...supported].filter((id) => !hidden.has(id)));
}

function fieldAvailabilityForLayer(id, options) {
  const fields = options.layerFields ?? {};
  return {
    scalar: id === 'integratedWaterColumn' || Boolean(fields[id] ?? fields.A_global_depth?.[id] ?? fields.sampleValue?.[id]),
    priority: id === 'integratedWaterColumn' || Boolean(fields.A_global_depth ?? fields.A_global_topdown),
    belief: Boolean(fields.belief?.[id]),
    uncertainty: Boolean(fields.uncertainty?.[id]),
    hiddenTruth: false
  };
}

function currentAvailabilityForLayer(id, options) {
  const currents = options.layerCurrents ?? {};
  return {
    horizontal: id !== 'integratedWaterColumn' && Boolean(currents[id] ?? options.currentField),
    vertical: id !== 'integratedWaterColumn' && Boolean(currents[id]?.vectors?.some?.((vector) => Number.isFinite(Number(vector.w)) && Math.abs(Number(vector.w)) > 0)),
    hiddenTruth: false
  };
}

function opacityForLayer(id, options, active) {
  const globalOpacity = finiteNumber(options.globalOpacity ?? options.displaySettings?.globalOpacity, 0.26);
  const activeEmphasis = finiteNumber(options.activeLayerEmphasis ?? options.displaySettings?.activeLayerEmphasis, 1.85);
  if (id === 'waterSurface') return round(Math.min(0.32, globalOpacity * 0.72));
  if (id === 'integratedWaterColumn') return round(Math.min(0.42, globalOpacity * 0.88));
  return round(Math.max(0.04, Math.min(0.84, active ? globalOpacity * activeEmphasis : globalOpacity)));
}

function normalizeLayerForView(value, fallback) {
  const text = String(value ?? '').trim();
  if (text === 'waterSurface' || text === 'integratedWaterColumn') return text;
  if (WATER_COLUMN_DEPTH_LAYER_IDS.includes(text)) return text;
  return fallback;
}

function normalizeVerticalDisplayMode(value) {
  return value === 'explodedLayers' ? 'explodedLayers' : 'physicalDepth';
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
