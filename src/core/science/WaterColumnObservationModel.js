import { diveProfileSummary, normalizeDiveProfile } from './DiveProfileModel.js';
import {
  normalizeWaterColumnConfig,
  waterColumnConfigSummary,
  waterColumnLayerMetadata,
  WATER_COLUMN_SCHEMA_VERSION
} from './WaterColumnSchema.js';

export const WATER_COLUMN_OBSERVATION_MODEL_VERSION = 'water-column-observation-model-p11';

export function createWaterColumnObservation(options = {}) {
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options);
  const zIndex = Math.max(0, Math.min(config.depthLayerIds.length - 1, Math.round(Number(options.zIndex ?? 0) || 0)));
  const depthLayerId = options.depthLayerId ?? options.depthLayer ?? config.depthLayerIds[zIndex] ?? 'surface';
  const metadata = waterColumnLayerMetadata(depthLayerId);
  return {
    type: 'anchor.science.water-column-observation',
    version: WATER_COLUMN_OBSERVATION_MODEL_VERSION,
    observationId: options.observationId ?? `wc-obs-${String(options.gliderId ?? 'glider-1')}-${Math.round(Number(options.timeSeconds ?? 0) * 1000)}`,
    observationType: options.observationType ?? 'depthLayerSample',
    timeSeconds: finiteNumber(options.timeSeconds, 0),
    gliderId: options.gliderId ?? 'glider-1',
    x: finiteNumber(options.x, 0),
    y: finiteNumber(options.y, 0),
    zIndex,
    depthLayerId,
    depthLayer: depthLayerId,
    depthMeters: finiteOrNull(options.depthMeters ?? metadata.nominalDepthMeters),
    diveProfileId: options.diveProfileId ?? config.diveProfileId,
    observedValue: finiteOrNull(options.observedValue ?? options.value),
    forecastValue: finiteOrNull(options.forecastValue),
    beliefValue: finiteOrNull(options.beliefValue),
    uncertaintyValue: finiteOrNull(options.uncertaintyValue),
    innovation: finiteOrNull(options.innovation),
    surprise: finiteOrNull(options.surprise),
    publicSafe: true,
    hiddenTruthIncluded: false,
    visibilityTier: 'publicScenario',
    note: 'Water-column observation summary is public-safe and carries sampled depth context, not hidden truth field arrays.'
  };
}

export function waterColumnObservationFromHeadlessObservation(observation = {}, configInput = {}, options = {}) {
  return createWaterColumnObservation({
    ...observation,
    waterColumnConfig: configInput.waterColumnConfig ?? configInput,
    depthLayerId: observation.depthLayerId ?? observation.depthLayer,
    diveProfileId: observation.diveProfileId ?? options.diveProfileId
  });
}

export function summarizeWaterColumnObservations(observations = [], configInput = {}) {
  const config = normalizeWaterColumnConfig(configInput.waterColumnConfig ?? configInput);
  const counts = Object.fromEntries(config.depthLayerIds.map((id) => [id, 0]));
  const surpriseByDepth = Object.fromEntries(config.depthLayerIds.map((id) => [id, []]));
  for (const row of Array.isArray(observations) ? observations : []) {
    const layerId = row.depthLayerId ?? row.depthLayer ?? config.depthLayerIds[Math.max(0, Math.round(Number(row.zIndex ?? 0) || 0))] ?? 'surface';
    if (counts[layerId] === undefined) counts[layerId] = 0;
    counts[layerId] += 1;
    if (surpriseByDepth[layerId] === undefined) surpriseByDepth[layerId] = [];
    surpriseByDepth[layerId].push(Number(row.surprise ?? 0));
  }
  const covered = Object.entries(counts).filter(([_id, count]) => count > 0).map(([id]) => id);
  return {
    type: 'anchor.headless.water-column-observation-summary',
    version: WATER_COLUMN_OBSERVATION_MODEL_VERSION,
    count: Array.isArray(observations) ? observations.length : 0,
    observationCountsByDepth: counts,
    meanSurpriseByDepth: Object.fromEntries(Object.entries(surpriseByDepth).map(([id, values]) => [id, mean(values)])),
    coveredDepthLayerIds: covered,
    verticalCoverage: verticalCoverageLabel(covered.length, config.depthLayerIds.length),
    coverageFraction: config.depthLayerIds.length ? round(covered.length / config.depthLayerIds.length) : 0,
    publicSafe: true,
    hiddenTruthIncluded: false
  };
}

export function buildWaterColumnSummary({
  config: configInput = {},
  observations = [],
  tracks = [],
  diveProfile = null,
  depthLayerPriority = null
} = {}) {
  const config = normalizeWaterColumnConfig(configInput.waterColumnConfig ?? configInput);
  const profile = normalizeDiveProfile(diveProfile ?? config.diveProfileId, config);
  const observationSummary = summarizeWaterColumnObservations(observations, config);
  const trackSummary = summarizeTrackDepthCoverage(tracks, config);
  return {
    type: 'anchor.headless.water-column-summary',
    version: WATER_COLUMN_OBSERVATION_MODEL_VERSION,
    schemaVersion: WATER_COLUMN_SCHEMA_VERSION,
    waterColumnConfig: waterColumnConfigSummary(config),
    diveProfile: diveProfileSummary(profile, config),
    observationSummary,
    observationCountsByDepth: observationSummary.observationCountsByDepth,
    trackCountsByDepth: trackSummary.trackCountsByDepth,
    verticalCoverage: observationSummary.verticalCoverage,
    depthLayerPrioritySummary: depthLayerPriority?.summary ?? null,
    bestDepthLayerCounts: depthLayerPriority?.summary?.bestDepthLayerCounts ?? depthLayerPriority?.bestDepthLayerCounts ?? null,
    publicSafe: true,
    hiddenTruthIncluded: false,
    syntheticTeachingModel: true,
    calibratedVerticalOceanModel: false,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    usesPythonSimulator: false,
    usesMARL: false,
    boundary: [
      '2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers.',
      'Dive profile controls which layer the glider samples along the route.',
      'Recommended dive profile is context for the next leg; it does not generate a route.',
      'P11 does not add full 3D planning, new route planning, production data assimilation, or MARL/RL.'
    ]
  };
}

export function validateWaterColumnObservationSummary(summary = {}) {
  const errors = [];
  const warnings = [];
  if (summary?.type !== 'anchor.headless.water-column-summary' && summary?.type !== 'anchor.headless.water-column-observation-summary') {
    errors.push(`Unknown water-column summary type ${summary?.type ?? 'missing'}.`);
  }
  if (summary?.hiddenTruthIncluded === true) errors.push('Water-column summaries must not include hidden truth.');
  if (summary?.usesFull3DPlanning === true) errors.push('Water-column summaries must not claim full 3D planning.');
  if (summary?.usesNewPlanner === true) errors.push('Water-column summaries must not claim a new planner.');
  if (summary?.usesPythonSimulator === true) errors.push('Water-column summaries must not claim a Python simulator.');
  if (summary?.usesMARL === true) errors.push('Water-column summaries must not claim MARL/RL.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function summarizeTrackDepthCoverage(tracks = [], config) {
  const counts = Object.fromEntries(config.depthLayerIds.map((id) => [id, 0]));
  for (const row of Array.isArray(tracks) ? tracks : []) {
    const layerId = row.depthLayerId ?? row.depthLayer ?? config.depthLayerIds[Math.max(0, Math.round(Number(row.zIndex ?? 0) || 0))] ?? 'surface';
    counts[layerId] = (counts[layerId] ?? 0) + 1;
  }
  return { trackCountsByDepth: counts };
}

function verticalCoverageLabel(coveredCount, totalCount) {
  if (coveredCount <= 1) return 'surface-limited';
  if (coveredCount < Math.min(3, totalCount)) return 'partial';
  return 'broad';
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : null;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

