export const WATER_COLUMN_SCHEMA_VERSION = 'water-column-schema-p11';

export const WATER_COLUMN_DEPTH_LAYER_IDS = Object.freeze([
  'surface',
  'shallow',
  'thermocline',
  'midwater',
  'deep',
  'bottom',
  'integratedWaterColumn'
]);

export const WATER_COLUMN_DEFAULT_LAYER_IDS = Object.freeze(['surface', 'thermocline', 'deep']);

export const WATER_COLUMN_PROFILE_IDS = Object.freeze([
  'surfaceOnly',
  'shallowDive',
  'thermoclineDive',
  'deepDive',
  'fullProfile',
  'sawtoothProfile',
  'adaptiveVerticalProfile',
  'integratedWaterColumn'
]);

export const WATER_COLUMN_OBSERVATION_TYPES = Object.freeze([
  'depthLayerSample',
  'profileSample',
  'integratedWaterColumnSample'
]);

export const WATER_COLUMN_SUMMARY_IDS = Object.freeze([
  'observationCountsByDepth',
  'verticalCoverage',
  'bestDepthLayerCounts',
  'depthLayerPriority',
  'diveProfileCoverage'
]);

const LAYER_METADATA = Object.freeze({
  surface: layer('surface', 'Surface', 0, 5),
  shallow: layer('shallow', 'Shallow', 10, 20),
  thermocline: layer('thermocline', 'Thermocline', 35, 35),
  midwater: layer('midwater', 'Midwater', 75, 60),
  deep: layer('deep', 'Deep', 150, 100),
  bottom: layer('bottom', 'Bottom', 250, 150),
  integratedWaterColumn: layer('integratedWaterColumn', 'Integrated Water Column', null, null)
});

const DEPTH_LAYER_ALIASES = Object.freeze({
  surface2d: 'surface',
  top: 'surface',
  nearSurface: 'surface',
  thermoclineLayer: 'thermocline',
  mid: 'midwater',
  waterColumn: 'integratedWaterColumn',
  integrated: 'integratedWaterColumn'
});

const PROFILE_ALIASES = Object.freeze({
  surface: 'surfaceOnly',
  surface2d: 'surfaceOnly',
  shallow: 'shallowDive',
  thermocline: 'thermoclineDive',
  deep: 'deepDive',
  full: 'fullProfile',
  sawtooth: 'sawtoothProfile',
  standardSawtooth: 'sawtoothProfile',
  standard_sawtooth: 'sawtoothProfile',
  adaptive: 'adaptiveVerticalProfile',
  integrated: 'integratedWaterColumn'
});

const REQUIRED_NOT_A = Object.freeze([
  'not full 3D route planning',
  'not calibrated vertical ocean model',
  'not production vehicle controller',
  'not MARL/RL'
]);

export function normalizeWaterColumnLayerId(id, fallback = 'surface') {
  const value = String(id ?? '').trim();
  if (WATER_COLUMN_DEPTH_LAYER_IDS.includes(value)) return value;
  return DEPTH_LAYER_ALIASES[value] ?? fallback;
}

export function normalizeWaterColumnLayerIds(values = WATER_COLUMN_DEFAULT_LAYER_IDS) {
  const source = Array.isArray(values) ? values : String(values ?? '').split(',');
  const ids = [...new Set(source.map((entry) => normalizeWaterColumnLayerId(entry, null)).filter((entry) => (
    entry && entry !== 'integratedWaterColumn'
  )))];
  return ids.length ? ids : WATER_COLUMN_DEFAULT_LAYER_IDS.slice();
}

export function normalizeWaterColumnProfileId(value = 'sawtoothProfile') {
  const text = String(value ?? '').trim();
  if (WATER_COLUMN_PROFILE_IDS.includes(text)) return text;
  return PROFILE_ALIASES[text] ?? 'sawtoothProfile';
}

export function waterColumnLayerMetadata(id) {
  const normalized = normalizeWaterColumnLayerId(id);
  return { ...LAYER_METADATA[normalized] };
}

export function waterColumnLayerOptions() {
  return WATER_COLUMN_DEPTH_LAYER_IDS.map(waterColumnLayerMetadata);
}

export function waterColumnProfileOptions() {
  return WATER_COLUMN_PROFILE_IDS.map((id) => ({ id, label: labelize(id) }));
}

export function waterColumnNotA() {
  return REQUIRED_NOT_A.slice();
}

export function createDefaultWaterColumnConfig(options = {}) {
  return normalizeWaterColumnConfig(options);
}

export function normalizeWaterColumnConfig(options = {}) {
  const source = options.waterColumnConfig ?? options;
  const layerIds = normalizeWaterColumnLayerIds(source.depthLayerIds ?? source.layerIds ?? source.depthLayers ?? options.depthLayers);
  const defaultLayerIds = normalizeWaterColumnLayerIds(source.defaultLayerIds ?? source.defaultLayers ?? layerIds);
  const diveProfileId = normalizeWaterColumnProfileId(source.diveProfileId ?? source.profileId ?? source.diveProfile ?? options.diveProfileId);
  return {
    type: 'anchor.science.water-column-config',
    version: WATER_COLUMN_SCHEMA_VERSION,
    enabled: source.enabled !== false,
    model: 'top-down-2p5d-depth-layer-sampling',
    depthLayerIds: layerIds,
    defaultLayerIds: defaultLayerIds.filter((id) => layerIds.includes(id)).length
      ? defaultLayerIds.filter((id) => layerIds.includes(id))
      : layerIds.slice(0, Math.min(3, layerIds.length)),
    diveProfileId,
    layerMetadata: Object.fromEntries(layerIds.map((id) => [id, waterColumnLayerMetadata(id)])),
    observationTypes: WATER_COLUMN_OBSERVATION_TYPES.slice(),
    summaryIds: WATER_COLUMN_SUMMARY_IDS.slice(),
    publicSafe: true,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    usesPythonSimulator: false,
    usesMARL: false,
    syntheticTeachingModel: true,
    calibratedVerticalOceanModel: false,
    boundary: '2.5D means the tactical map remains top-down, while each cell can contain simplified depth layers.',
    notA: waterColumnNotA()
  };
}

export function validateWaterColumnConfig(config = {}) {
  const normalized = normalizeWaterColumnConfig(config);
  const errors = [];
  const warnings = [];
  if (config?.type && config.type !== 'anchor.science.water-column-config') errors.push(`Expected type anchor.science.water-column-config, got ${config.type}.`);
  if (!normalized.depthLayerIds.length) errors.push('Water-column config needs at least one depth layer.');
  for (const id of normalized.depthLayerIds) {
    if (!WATER_COLUMN_DEPTH_LAYER_IDS.includes(id) || id === 'integratedWaterColumn') errors.push(`Unsupported depth layer ${id}.`);
  }
  if (!WATER_COLUMN_PROFILE_IDS.includes(normalized.diveProfileId)) errors.push(`Unsupported dive profile ${normalized.diveProfileId}.`);
  const notAText = (normalized.notA ?? []).join(' ').toLowerCase();
  for (const required of REQUIRED_NOT_A) {
    if (!notAText.includes(required.toLowerCase())) errors.push(`notA must include "${required}".`);
  }
  if (normalized.calibratedVerticalOceanModel) errors.push('Water-column config must not claim a calibrated vertical ocean model.');
  if (normalized.usesFull3DPlanning) errors.push('Water-column config must not claim full 3D route planning.');
  if (normalized.usesNewPlanner) errors.push('Water-column config must not claim a new planner.');
  if (normalized.usesPythonSimulator) errors.push('Water-column config must not claim a Python simulator.');
  if (normalized.usesMARL) errors.push('Water-column config must not claim MARL/RL.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, config: normalized };
}

export function waterColumnConfigSummary(configInput = {}) {
  const config = normalizeWaterColumnConfig(configInput);
  const validation = validateWaterColumnConfig(config);
  return {
    type: 'anchor.headless.water-column-config-summary',
    version: WATER_COLUMN_SCHEMA_VERSION,
    enabled: config.enabled,
    depthLayerIds: config.depthLayerIds.slice(),
    defaultLayerIds: config.defaultLayerIds.slice(),
    diveProfileId: config.diveProfileId,
    layerCount: config.depthLayerIds.length,
    publicSafe: config.publicSafe,
    valid: validation.valid,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    usesPythonSimulator: false,
    usesMARL: false,
    calibratedVerticalOceanModel: false,
    boundary: config.boundary,
    notA: config.notA.slice()
  };
}

function layer(id, label, nominalDepthMeters, thicknessMeters) {
  return Object.freeze({ id, label, nominalDepthMeters, thicknessMeters, synthetic: true, calibrated: false });
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}
