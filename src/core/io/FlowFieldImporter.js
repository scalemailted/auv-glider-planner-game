import { normalizeCurrentFieldConfig, summarizeCurrentFieldConfig } from '../generation/FlowFieldConfig.js';

export const FLOW_FIELD_IMPORT_SCHEMA_VERSION = '1.0';
export const FLOW_FIELD_TYPE = 'anchor.flow-field';

export function importFlowFieldJson(json, context = {}) {
  const errors = [];
  const warnings = [];
  if (!json || typeof json !== 'object') {
    return failed('Flow field JSON must be an object.');
  }
  if (json.type && json.type !== FLOW_FIELD_TYPE) errors.push(`Expected type "${FLOW_FIELD_TYPE}".`);
  const grid = normalizeGrid(json.grid, context, errors, warnings);
  const boundaryConditions = normalizeBoundaryConditions(json.boundaryConditions ?? json.boundary ?? {});
  const source = normalizeSource(json.source ?? {});
  const syntheticConfig = json.syntheticConfig
    ? normalizeCurrentFieldConfig({
      ...json.syntheticConfig,
      boundaryConditions,
      topologyAware: boundaryConditions.topologyAware
    }, { mode: context.mode })
    : null;
  const frames = normalizeFrames(json.frames ?? [], grid, errors);
  if (!frames.length && !syntheticConfig) errors.push('Flow field JSON needs either frames[] or syntheticConfig.');
  if (source.usesTruth && !source.usesOracle) warnings.push('Imported field declares truth use without oracle mode.');
  if (errors.length) return failed(errors, warnings);
  const flowField = {
    schemaVersion: String(json.schemaVersion ?? FLOW_FIELD_IMPORT_SCHEMA_VERSION),
    type: FLOW_FIELD_TYPE,
    name: String(json.name ?? json.metadata?.name ?? 'Imported Flow Field'),
    source,
    grid,
    mode: normalizeMode(json.mode ?? (frames.length > 1 ? 'dynamic' : 'static')),
    sampling: normalizeSampling(json.sampling ?? {}, frames),
    frames,
    syntheticConfig,
    boundaryConditions,
    metadata: json.metadata && typeof json.metadata === 'object' ? cloneJson(json.metadata) : {},
    originalSummary: {
      frameCount: frames.length,
      hasSyntheticConfig: Boolean(syntheticConfig)
    }
  };
  return {
    ok: true,
    flowField,
    errors: [],
    warnings,
    summary: summarizeImportedFlowField(flowField, warnings)
  };
}

export function summarizeImportedFlowField(flowField = {}, warnings = []) {
  const source = flowField.source ?? {};
  const fairness = source.usesOracle
    ? 'oracle'
    : source.usesTruth
      ? 'truth-visible'
      : 'forecast-visible';
  const configSummary = flowField.syntheticConfig ? summarizeCurrentFieldConfig(flowField.syntheticConfig) : null;
  return {
    title: flowField.name ?? 'Imported Flow Field',
    mode: flowField.mode ?? 'static',
    frameCount: flowField.frames?.length ?? 0,
    sourceLabel: source.label ?? source.kind ?? 'external',
    fairness,
    boundaryMode: flowField.boundaryConditions?.mode ?? 'deflectAlongShore',
    syntheticSummary: configSummary,
    warnings
  };
}

function normalizeGrid(grid = {}, context = {}, errors = [], warnings = []) {
  const width = finiteInt(grid.width ?? context.width, null);
  const height = finiteInt(grid.height ?? context.height, null);
  if (!width || !height) errors.push('Flow field grid width/height must be positive integers.');
  if (context.width && width && Number(context.width) !== width) errors.push(`Imported grid width ${width} does not match setup width ${context.width}.`);
  if (context.height && height && Number(context.height) !== height) errors.push(`Imported grid height ${height} does not match setup height ${context.height}.`);
  return {
    width: width ?? Number(context.width ?? 1),
    height: height ?? Number(context.height ?? 1),
    coordinateConvention: grid.coordinateConvention ?? 'cell-center',
    timeUnits: grid.timeUnits ?? 'hours'
  };
}

function normalizeFrames(frames = [], grid, errors = []) {
  if (!Array.isArray(frames)) {
    errors.push('frames must be an array.');
    return [];
  }
  const normalized = frames.map((frame, frameIndex) => {
    const t = finiteNumber(frame?.time ?? frame?.t, NaN);
    if (!Number.isFinite(t)) errors.push(`Frame ${frameIndex + 1} needs a finite time.`);
    const vectors = frame?.vectors ?? frame?.current;
    const current = normalizeVectorGrid(vectors, grid, frameIndex, errors);
    return { t, current, source: 'importedFlowField' };
  }).filter((frame) => Number.isFinite(frame.t) && frame.current.length);
  normalized.sort((a, b) => a.t - b.t);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].t <= normalized[index - 1].t) errors.push(`Frame ${index + 1} time must be greater than the previous frame time.`);
  }
  return normalized;
}

function normalizeVectorGrid(vectors, grid, frameIndex, errors) {
  if (!Array.isArray(vectors)) {
    errors.push(`Frame ${frameIndex + 1} vectors must be a 2D array.`);
    return [];
  }
  const height = Number(grid.height ?? vectors.length);
  const width = Number(grid.width ?? vectors[0]?.length);
  if (vectors.length !== height) errors.push(`Frame ${frameIndex + 1} height ${vectors.length} does not match grid height ${height}.`);
  return Array.from({ length: height }, (_, y) => {
    const row = vectors[y];
    if (!Array.isArray(row)) {
      errors.push(`Frame ${frameIndex + 1} row ${y + 1} is not an array.`);
      return Array.from({ length: width }, () => [0, 0]);
    }
    if (row.length !== width) errors.push(`Frame ${frameIndex + 1} row ${y + 1} width ${row.length} does not match grid width ${width}.`);
    return Array.from({ length: width }, (_, x) => {
      const vector = row[x];
      const u = finiteNumber(Array.isArray(vector) ? vector[0] : vector?.u, NaN);
      const v = finiteNumber(Array.isArray(vector) ? vector[1] : vector?.v, NaN);
      if (!Number.isFinite(u) || !Number.isFinite(v)) errors.push(`Frame ${frameIndex + 1} vector (${x}, ${y}) contains a non-finite u/v value.`);
      return [Number.isFinite(u) ? u : 0, Number.isFinite(v) ? v : 0];
    });
  });
}

function normalizeBoundaryConditions(boundary = {}) {
  const modes = ['none', 'riskOnly', 'dampenIntoLand', 'deflectAlongShore', 'wakeApproximation'];
  return {
    mode: modes.includes(boundary.mode) ? boundary.mode : 'deflectAlongShore',
    topologyAware: boundary.topologyAware !== false,
    shoreRiskRadius: clamp(finiteNumber(boundary.shoreRiskRadius, 3), 1, 8),
    dampenIntoLand: clamp(finiteNumber(boundary.dampenIntoLand, 0.78), 0, 1),
    deflectStrength: clamp(finiteNumber(boundary.deflectStrength, 0.42), 0, 1)
  };
}

function normalizeSource(source = {}) {
  return {
    kind: String(source.kind ?? 'external'),
    label: String(source.label ?? source.name ?? 'Imported Flow Field'),
    usesForecast: source.usesForecast !== false,
    usesTruth: Boolean(source.usesTruth),
    usesOracle: Boolean(source.usesOracle)
  };
}

function normalizeSampling(sampling = {}, frames = []) {
  const modes = ['clamped', 'looping', 'continuous', 'frames'];
  return {
    kind: sampling.kind ?? (frames.length ? 'frames' : 'synthetic'),
    interpolation: sampling.interpolation === 'nearest' || sampling.frameInterpolation === 'nearest' ? 'nearest' : 'linear',
    timeMode: modes.includes(sampling.timeMode) ? sampling.timeMode : 'clamped'
  };
}

function normalizeMode(value) {
  return value === 'static' ? 'static' : 'dynamic';
}

function failed(messageOrErrors, warnings = []) {
  const errors = Array.isArray(messageOrErrors) ? messageOrErrors : [messageOrErrors];
  return {
    ok: false,
    flowField: null,
    errors,
    warnings,
    summary: { title: 'Flow Field Import Failed', errors, warnings }
  };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteInt(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}
