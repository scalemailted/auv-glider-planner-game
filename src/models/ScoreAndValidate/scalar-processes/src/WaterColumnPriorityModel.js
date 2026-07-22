const WaterColumnFieldModel = require('./WaterColumnFieldModel.js')
const WaterColumnSchema = require('./WaterColumnSchema.js')
const WATER_COLUMN_PRIORITY_MODEL_VERSION = 'water-column-priority-model-p11';

 function computeWaterColumnPriority(fieldPack = {}, configInput = {}, options = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig(configInput.waterColumnConfig ?? configInput);
  const priorityField = options.priorityField ?? fieldPack?.fields?.A_global ?? [];
  const accessibilityMask = options.accessibilityMask ?? fieldPack?.fields?.constraintMask ?? null;
  const collapseMethod = options.collapseMethod ?? 'accessibleMax';
  const topDown = WaterColumnFieldModel.collapseWaterColumnField(priorityField, config, { method: collapseMethod, accessibilityMask });
  const best = WaterColumnFieldModel.bestWaterColumnDepthLayer(priorityField, config, { accessibilityMask });
  const diagnostics = WaterColumnFieldModel.waterColumnFieldSummary(priorityField, config, { fieldId: 'A_global', accessibilityMask });
  const summary = {
    type: 'anchor.headless.depth-layer-priority-summary',
    version: WATER_COLUMN_PRIORITY_MODEL_VERSION,
    schemaVersion: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    depthLayerIds: config.depthLayerIds.slice(),
    collapseMethod,
    bestDepthLayerCounts: best.bestDepthLayerCounts,
    topDownStats: field2dStats(topDown),
    excludesRouteTravelCost: true,
    publicSafe: true,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    usesPythonSimulator: false,
    usesMARL: false,
    note: 'A_global_depth is science priority by depth layer; top-down collapse does not include route travel cost or path optimization.'
  };
  return {
    type: 'anchor.headless.depth-layer-priority',
    version: WATER_COLUMN_PRIORITY_MODEL_VERSION,
    schemaVersion: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    waterColumnConfig: WaterColumnSchema.waterColumnConfigSummary(config),
    fieldId: 'A_global',
    depthLayerIds: config.depthLayerIds.slice(),
    A_global_depth: priorityField,
    A_global_topdown: topDown,
    bestDepthLayerByCell: best.bestLayerByCell,
    bestDepthLayerCounts: best.bestDepthLayerCounts,
    diagnostics,
    summary,
    publicSafe: true,
    hiddenTruthIncluded: false,
    excludesRouteTravelCost: true,
    syntheticTeachingModel: true,
    calibratedVerticalOceanModel: false
  };
}

 function summarizeWaterColumnPriority(priorityArtifact = {}) {
  if (priorityArtifact.summary) return priorityArtifact.summary;
  return {
    type: 'anchor.headless.depth-layer-priority-summary',
    version: WATER_COLUMN_PRIORITY_MODEL_VERSION,
    depthLayerIds: priorityArtifact.depthLayerIds ?? [],
    bestDepthLayerCounts: priorityArtifact.bestDepthLayerCounts ?? {},
    topDownStats: field2dStats(priorityArtifact.A_global_topdown ?? []),
    excludesRouteTravelCost: priorityArtifact.excludesRouteTravelCost !== false,
    publicSafe: priorityArtifact.publicSafe !== false,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    usesPythonSimulator: false,
    usesMARL: false
  };
}

 function bestWaterColumnPriorityLayer(priorityArtifact = {}) {
  const counts = priorityArtifact.bestDepthLayerCounts ?? priorityArtifact.summary?.bestDepthLayerCounts ?? {};
  let best = { depthLayerId: null, count: -1 };
  for (const [depthLayerId, count] of Object.entries(counts)) {
    if (Number(count) > best.count) best = { depthLayerId, count: Number(count) };
  }
  return best;
}

 function validateWaterColumnPriorityArtifact(artifact = {}) {
  const errors = [];
  const warnings = [];
  if (artifact?.type !== 'anchor.headless.depth-layer-priority') errors.push(`Expected anchor.headless.depth-layer-priority, got ${artifact?.type ?? 'missing'}.`);
  if (artifact?.hiddenTruthIncluded === true) errors.push('Depth-layer priority must not include hidden truth.');
  if (artifact?.excludesRouteTravelCost !== true) errors.push('Depth-layer priority must explicitly exclude route travel cost.');
  if (!Array.isArray(artifact?.A_global_depth)) warnings.push('Depth-layer priority is missing A_global_depth.');
  if (!Array.isArray(artifact?.A_global_topdown)) warnings.push('Depth-layer priority is missing A_global_topdown.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function field2dStats(field = []) {
  const values = [];
  for (const row of Array.isArray(field) ? field : []) {
    for (const value of Array.isArray(row) ? row : []) {
      const number = Number(value);
      if (Number.isFinite(number)) values.push(number);
    }
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    count: values.length,
    finiteCount: values.length,
    invalidCount: 0,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    mean: values.length ? sum / values.length : null
  };
}

module.exports = {computeWaterColumnPriority, summarizeWaterColumnPriority, bestWaterColumnPriorityLayer, validateWaterColumnPriorityArtifact}