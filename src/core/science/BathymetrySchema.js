export const BATHYMETRY_SCHEMA_VERSION = 'bathymetry-schema-env-r1';

export const BATHYMETRY_FEATURE_IDS = Object.freeze([
  'continentalShelf',
  'shelfBreak',
  'submarineCanyon',
  'trench',
  'seamount',
  'ridge',
  'abyssalPlain',
  'coastalBay',
  'islandArc',
  'riverMouth',
  'estuaryChannel',
  'bottomHazard'
]);

export const BATHYMETRY_LAYER_IDS = Object.freeze([
  'landSeaMask',
  'bathymetricBottom',
  'waterSurface',
  'surface',
  'thermocline',
  'deep'
]);

export const BATHYMETRY_VIEW_MODE_IDS = Object.freeze([
  'topDown',
  'obliqueBathymetry',
  'layerStack',
  'surfaceAndBottom',
  'missionProfile',
  'replayView'
]);

export const BATHYMETRY_SURFACE_IDS = Object.freeze([
  'waterSurface',
  'bathymetricBottom',
  'depthLayerPlane'
]);

const FEATURE_ALIASES = Object.freeze({
  shelf: 'continentalShelf',
  canyon: 'submarineCanyon',
  deepBasin: 'abyssalPlain',
  basin: 'abyssalPlain',
  mount: 'seamount',
  estuary: 'estuaryChannel',
  river: 'riverMouth',
  hazard: 'bottomHazard'
});

const VIEW_MODE_ALIASES = Object.freeze({
  oblique: 'obliqueBathymetry',
  layers: 'layerStack',
  stack: 'layerStack',
  replay: 'replayView',
  profile: 'missionProfile',
  bottom: 'surfaceAndBottom'
});

const REQUIRED_NOT_A = Object.freeze([
  'not full 3D route planning',
  'not calibrated bathymetric survey data',
  'not hydrodynamic current solver',
  'not production navigation chart',
  'not terrain-flow ocean current',
  'not MARL/RL'
]);

export function normalizeBathymetryFeatureId(id) {
  const text = String(id ?? '').trim();
  if (BATHYMETRY_FEATURE_IDS.includes(text)) return text;
  return FEATURE_ALIASES[text] ?? null;
}

export function normalizeBathymetryViewMode(id) {
  const text = String(id ?? '').trim();
  if (BATHYMETRY_VIEW_MODE_IDS.includes(text)) return text;
  return VIEW_MODE_ALIASES[text] ?? 'obliqueBathymetry';
}

export function createBathymetryConfig(options = {}) {
  const source = options.bathymetryConfig ?? options;
  const featureIds = normalizeFeatureIds(source.features ?? source.featureIds ?? [
    'continentalShelf',
    'shelfBreak',
    'submarineCanyon',
    'abyssalPlain',
    'riverMouth'
  ]);
  const layerIds = normalizeLayerIds(source.layerIds ?? source.layers ?? BATHYMETRY_LAYER_IDS);
  const width = positiveInteger(source.width ?? source.grid?.width ?? options.width, 32);
  const height = positiveInteger(source.height ?? source.grid?.height ?? options.height, 24);
  return {
    type: 'anchor.science.bathymetry-config',
    version: BATHYMETRY_SCHEMA_VERSION,
    width,
    height,
    depthUnit: source.depthUnit ?? 'meters',
    minDepthMeters: finiteNumber(source.minDepthMeters, 0),
    maxDepthMeters: Math.max(1, finiteNumber(source.maxDepthMeters, 180)),
    seaLevelMeters: finiteNumber(source.seaLevelMeters, 0),
    verticalExaggeration: clamp(finiteNumber(source.verticalExaggeration, 1.5), 0.1, 8),
    features: featureIds.map((id) => createBathymetryFeatureDescriptor(id, source)),
    coastlineMode: source.coastlineMode ?? 'left-coast-shelf',
    layerIds,
    defaultViewMode: normalizeBathymetryViewMode(source.defaultViewMode ?? source.viewMode),
    notes: Array.isArray(source.notes) ? source.notes.slice() : [
      'Synthetic public-safe bathymetry for environmental context and teaching.'
    ],
    notA: mergeNotA(source.notA)
  };
}

export function createBathymetryLayerDescriptor(options = {}) {
  const id = String(options.id ?? options.layerId ?? 'bathymetricBottom');
  return {
    id,
    label: options.label ?? labelize(id),
    kind: options.kind ?? (id === 'waterSurface' ? 'surface-plane' : id === 'bathymetricBottom' ? 'bottom-surface' : 'depth-layer-plane'),
    depthMeters: finiteOrNull(options.depthMeters),
    opacity: clamp(finiteNumber(options.opacity, id === 'waterSurface' ? 0.25 : 0.18), 0, 1),
    publicSafe: true
  };
}

export function validateBathymetryConfig(config = {}) {
  const normalized = createBathymetryConfig(config);
  const errors = [];
  const warnings = [];
  if (config?.type && config.type !== 'anchor.science.bathymetry-config') {
    errors.push(`Expected type anchor.science.bathymetry-config, got ${config.type}.`);
  }
  if (normalized.width < 2 || normalized.height < 2) errors.push('Bathymetry config requires width and height >= 2.');
  if (normalized.maxDepthMeters <= normalized.minDepthMeters) errors.push('maxDepthMeters must be greater than minDepthMeters.');
  if (!normalized.features.length) warnings.push('Bathymetry config has no feature descriptors.');
  for (const feature of normalized.features) {
    if (!BATHYMETRY_FEATURE_IDS.includes(feature.id)) errors.push(`Unsupported bathymetry feature ${feature.id}.`);
  }
  const notAText = normalized.notA.join(' ').toLowerCase();
  for (const required of REQUIRED_NOT_A) {
    if (!notAText.includes(required.toLowerCase())) errors.push(`notA must include "${required}".`);
  }
  if (!BATHYMETRY_VIEW_MODE_IDS.includes(normalized.defaultViewMode)) errors.push(`Unsupported view mode ${normalized.defaultViewMode}.`);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, config: normalized };
}

export function bathymetryConfigSummary(configInput = {}) {
  const config = createBathymetryConfig(configInput);
  const validation = validateBathymetryConfig(config);
  return {
    type: 'anchor.science.bathymetry-config-summary',
    version: BATHYMETRY_SCHEMA_VERSION,
    width: config.width,
    height: config.height,
    depthUnit: config.depthUnit,
    minDepthMeters: config.minDepthMeters,
    maxDepthMeters: config.maxDepthMeters,
    verticalExaggeration: config.verticalExaggeration,
    featureIds: config.features.map((feature) => feature.id),
    layerIds: config.layerIds.slice(),
    defaultViewMode: config.defaultViewMode,
    publicSafe: true,
    valid: validation.valid,
    usesFull3DPlanning: false,
    usesHydrodynamicSolver: false,
    usesTerrainFlowAsOceanCurrent: false,
    usesPythonSimulator: false,
    usesMARL: false,
    notA: config.notA.slice()
  };
}

function createBathymetryFeatureDescriptor(id, source = {}) {
  return {
    id,
    label: labelize(id),
    enabled: source.disabledFeatures?.includes?.(id) ? false : true,
    synthetic: true,
    calibratedSurveyData: false
  };
}

function normalizeFeatureIds(values) {
  const list = Array.isArray(values) ? values : String(values ?? '').split(',');
  const normalized = list.map((entry) => typeof entry === 'string' ? normalizeBathymetryFeatureId(entry) : normalizeBathymetryFeatureId(entry?.id))
    .filter(Boolean);
  return [...new Set(normalized)].length ? [...new Set(normalized)] : ['continentalShelf', 'shelfBreak', 'abyssalPlain'];
}

function normalizeLayerIds(values) {
  const list = Array.isArray(values) ? values : String(values ?? '').split(',');
  const normalized = list.map((entry) => String(entry ?? '').trim()).filter((id) => BATHYMETRY_LAYER_IDS.includes(id));
  return [...new Set(normalized)].length ? [...new Set(normalized)] : BATHYMETRY_LAYER_IDS.slice();
}

function mergeNotA(values) {
  const source = Array.isArray(values) ? values.map(String) : [];
  return [...new Set([...source, ...REQUIRED_NOT_A])];
}

function positiveInteger(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}
