const ScalarFieldGrid = require('./ScalarFieldGrid.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const WATER_COLUMN_FIELD_MODEL_VERSION = 'water-column-field-model-p11';

 function createWaterColumnScalarField(gridInput = {}, fill = 0) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(gridInput.waterColumnConfig ?? gridInput);
  return ScalarFieldGrid.createScalarField3d({ ...gridInput, depthLayers: config.depthLayerIds }, fill);
}

 function createWaterColumnVectorField(gridInput = {}, fillU = 0, fillV = 0) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(gridInput.waterColumnConfig ?? gridInput);
  return ScalarFieldGrid.createVectorField3d({ ...gridInput, depthLayers: config.depthLayerIds }, fillU, fillV);
}

 function sampleWaterColumnScalar(field, x, y, layerOrIndex = 0, configInput = {}, options = {}) {
  const z = depthIndexForLayer(layerOrIndex, configInput);
  return options.method === 'nearest' ? ScalarFieldGrid.sampleNearest3d(field, x, y, z) : sampleBilinearLayer(field, x, y, z);
}

 function sampleWaterColumnVector(vectorField = {}, x, y, layerOrIndex = 0, configInput = {}, options = {}) {
  return {
    u: sampleWaterColumnScalar(vectorField.u ?? vectorField.F_u, x, y, layerOrIndex, configInput, options),
    v: sampleWaterColumnScalar(vectorField.v ?? vectorField.F_v, x, y, layerOrIndex, configInput, options)
  };
}

 function waterColumnFieldStats(field, configInput = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput);
  const shape = ScalarFieldGrid.fieldShape(field);
  const stats = ScalarFieldGrid.field3dStats(field);
  const byLayer = {};
  const layers = config.depthLayerIds.length === shape.depth
    ? config.depthLayerIds
    : WaterColumnSchema.normalizeWaterColumnLayerIds(configInput.depthLayers).slice(0, shape.depth);
  for (let z = 0; z < shape.depth; z += 1) {
    byLayer[layers[z] ?? `layer-${z}`] = ScalarFieldGrid.field3dStats([field[z]]);
  }
  return { ...stats, shape: shape.shape, byLayer };
}

 function collapseWaterColumnField(field, configInput = {}, options = {}) {
  const shape = ScalarFieldGrid.fieldShape(field);
  if (!shape.valid) return [];
  const method = options.method ?? options.collapseMethod ?? 'maxValue';
  const out = Array.from({ length: shape.height }, () => Array.from({ length: shape.width }, () => 0));
  for (let y = 0; y < shape.height; y += 1) {
    for (let x = 0; x < shape.width; x += 1) {
      const values = [];
      for (let z = 0; z < shape.depth; z += 1) {
        const inaccessible = Number(options.accessibilityMask?.[z]?.[y]?.[x] ?? 0) >= 0.5;
        values.push({ z, value: Number(field[z]?.[y]?.[x] ?? 0), inaccessible });
      }
      out[y][x] = collapseCell(values, method, options, x, y);
    }
  }
  return out;
}

 function bestWaterColumnDepthLayer(field, configInput = {}, options = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput);
  const shape = ScalarFieldGrid.fieldShape(field);
  const bestLayerByCell = Array.from({ length: shape.height || 0 }, () => Array.from({ length: shape.width || 0 }, () => null));
  const bestDepthLayerCounts = Object.fromEntries(config.depthLayerIds.map((id) => [id, 0]));
  if (!shape.valid) return { bestLayerByCell, bestDepthLayerCounts, layerIds: config.depthLayerIds };
  for (let y = 0; y < shape.height; y += 1) {
    for (let x = 0; x < shape.width; x += 1) {
      let best = { z: 0, value: -Infinity };
      for (let z = 0; z < shape.depth; z += 1) {
        if (Number(options.accessibilityMask?.[z]?.[y]?.[x] ?? 0) >= 0.5) continue;
        const value = Number(field[z]?.[y]?.[x] ?? 0);
        if (value > best.value) best = { z, value };
      }
      const layerId = config.depthLayerIds[best.z] ?? `layer-${best.z}`;
      bestLayerByCell[y][x] = layerId;
      bestDepthLayerCounts[layerId] = (bestDepthLayerCounts[layerId] ?? 0) + 1;
    }
  }
  return { bestLayerByCell, bestDepthLayerCounts, layerIds: config.depthLayerIds };
}

 function validateWaterColumnField(field, configInput = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput);
  const grid = ScalarFieldGrid.createScalarFieldGrid({
    ...(configInput.grid ?? configInput),
    depthLayers: config.depthLayerIds
  });
  const validation = ScalarFieldGrid.validateField3d(field, grid);
  return {
    ...validation,
    type: 'anchor.science.water-column-field-validation',
    layerIds: config.depthLayerIds,
    supports25d: true,
    usesFull3DPlanning: false
  };
}

 function waterColumnFieldSummary(field, configInput = {}, options = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput);
  const stats = waterColumnFieldStats(field, config);
  const best = bestWaterColumnDepthLayer(field, config, options);
  return {
    type: 'anchor.headless.depth-layer-diagnostics',
    version: WATER_COLUMN_FIELD_MODEL_VERSION,
    schemaVersion: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    fieldId: options.fieldId ?? null,
    depthLayerIds: config.depthLayerIds.slice(),
    layerMetadata: Object.fromEntries(config.depthLayerIds.map((id) => [id, WaterColumnSchema.waterColumnLayerMetadata(id)])),
    shape: stats.shape,
    stats,
    bestDepthLayerCounts: best.bestDepthLayerCounts,
    publicSafe: true,
    syntheticTeachingModel: true,
    calibratedVerticalOceanModel: false,
    usesFull3DPlanning: false,
    note: 'Depth-layer diagnostics summarize field[z][row][col] data for a top-down 2.5D teaching model.'
  };
}

function depthIndexForLayer(layerOrIndex, configInput = {}) {
  if (Number.isFinite(Number(layerOrIndex))) return Math.max(0, Math.round(Number(layerOrIndex)));
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput);
  const index = config.depthLayerIds.indexOf(String(layerOrIndex));
  return index >= 0 ? index : 0;
}

function sampleBilinearLayer(field, x, y, zIndex) {
  const shape = ScalarFieldGrid.fieldShape(field);
  if (!shape.valid) return 0;
  const z = clampInt(zIndex, 0, shape.depth - 1);
  const fx = clamp(Number(x), 0, shape.width - 1);
  const fy = clamp(Number(y), 0, shape.height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(shape.width - 1, x0 + 1);
  const y1 = Math.min(shape.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = Number(field[z]?.[y0]?.[x0] ?? 0);
  const v10 = Number(field[z]?.[y0]?.[x1] ?? v00);
  const v01 = Number(field[z]?.[y1]?.[x0] ?? v00);
  const v11 = Number(field[z]?.[y1]?.[x1] ?? v10);
  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return top * (1 - ty) + bottom * ty;
}

function collapseCell(values, method, options, x, y) {
  const accessible = values.filter((entry) => !entry.inaccessible);
  const source = method === 'accessibleMax' ? accessible : values;
  if (!source.length) return 0;
  if (method === 'meanValue' || method === 'integratedProfile') return source.reduce((sum, entry) => sum + entry.value, 0) / source.length;
  if (method === 'weightedByObjective' || method === 'priorityWeighted' || method === 'uncertaintyWeighted') {
    const weightField = options.weightField ?? options.priorityField ?? options.uncertaintyField;
    let weighted = 0;
    let totalWeight = 0;
    for (const entry of source) {
      const weight = Math.max(0, Number(weightField?.[entry.z]?.[y]?.[x] ?? 1));
      weighted += entry.value * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weighted / totalWeight : 0;
  }
  return Math.max(...source.map((entry) => entry.value));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

module.exports = {createWaterColumnScalarField, createWaterColumnVectorField, sampleWaterColumnScalar, sampleWaterColumnVector, waterColumnFieldStats, collapseWaterColumnField, bestWaterColumnDepthLayer, validateWaterColumnField, waterColumnFieldSummary}