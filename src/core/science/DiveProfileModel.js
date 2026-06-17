import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnProfileId,
  waterColumnLayerMetadata,
  WATER_COLUMN_SCHEMA_VERSION
} from './WaterColumnSchema.js';

export const DIVE_PROFILE_MODEL_VERSION = 'dive-profile-model-p11';

export function normalizeDiveProfile(profileInput = {}, configInput = {}) {
  const config = normalizeWaterColumnConfig(configInput.waterColumnConfig ?? configInput);
  const source = typeof profileInput === 'string' ? { id: profileInput } : profileInput ?? {};
  const id = normalizeWaterColumnProfileId(source.id ?? source.profileId ?? source.mode ?? config.diveProfileId);
  const sequence = normalizeProfileSequence(source.sequence ?? source.depthLayerIds ?? source.layers, id, config);
  return {
    type: 'anchor.science.water-column-profile',
    version: DIVE_PROFILE_MODEL_VERSION,
    id,
    profileId: id,
    label: labelForProfile(id),
    depthLayerIds: config.depthLayerIds.slice(),
    sequence,
    samplesPerCycle: Math.max(1, Math.round(Number(source.samplesPerCycle ?? sequence.length) || sequence.length)),
    verticalResolution: source.verticalResolution ?? 'layer-index',
    assignsDepthLayer: true,
    routeAuthority: 'providedWaypointsOnly',
    generatesWaypoints: false,
    controlsRoutePlanning: false,
    usesFull3DPlanning: false,
    syntheticTeachingModel: true,
    notA: [
      'not full 3D route planning',
      'not calibrated glider pitch control',
      'not production vehicle controller',
      'not MARL/RL'
    ]
  };
}

export function createDiveProfileSequence(profileInput = 'sawtoothProfile', configInput = {}, options = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const count = Math.max(1, Math.round(Number(options.sampleCount ?? options.count ?? profile.samplesPerCycle) || profile.samplesPerCycle));
  return Array.from({ length: count }, (_value, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const layerId = depthLayerForDiveProfile(profile, progress);
    return {
      index,
      routeProgress: Number(progress.toFixed(6)),
      depthLayerId: layerId,
      zIndex: profile.depthLayerIds.indexOf(layerId),
      depthMeters: waterColumnLayerMetadata(layerId).nominalDepthMeters
    };
  });
}

export function depthIndexForDiveProfile(profileInput = 'sawtoothProfile', progress = 0, configInput = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const layerId = depthLayerForDiveProfile(profile, progress);
  return Math.max(0, profile.depthLayerIds.indexOf(layerId));
}

export function depthLayerForDiveProfile(profileInput = 'sawtoothProfile', progress = 0) {
  const profile = profileInput?.type === 'anchor.science.water-column-profile' ? profileInput : normalizeDiveProfile(profileInput);
  if (!profile.sequence.length) return profile.depthLayerIds[0] ?? 'surface';
  if (profile.id === 'sawtoothProfile' || profile.id === 'adaptiveVerticalProfile') {
    const phase = normalizedProgress(progress);
    const triangle = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
    const layers = profile.depthLayerIds.length ? profile.depthLayerIds : profile.sequence;
    const index = Math.round(triangle * (layers.length - 1));
    return layers[index] ?? layers[0];
  }
  const index = Math.min(profile.sequence.length - 1, Math.floor(normalizedProgress(progress) * profile.sequence.length));
  return profile.sequence[index] ?? profile.sequence[0];
}

export function diveProfileCoverage(profileInput = 'sawtoothProfile', configInput = {}, options = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const sequence = createDiveProfileSequence(profile, configInput, { sampleCount: options.sampleCount ?? Math.max(8, profile.samplesPerCycle * 2) });
  const counts = Object.fromEntries(profile.depthLayerIds.map((id) => [id, 0]));
  for (const entry of sequence) counts[entry.depthLayerId] = (counts[entry.depthLayerId] ?? 0) + 1;
  const covered = Object.values(counts).filter((count) => count > 0).length;
  return {
    type: 'anchor.science.water-column-profile-coverage',
    profileId: profile.id,
    countsByDepth: counts,
    coveredLayerCount: covered,
    totalLayerCount: profile.depthLayerIds.length,
    coverageFraction: profile.depthLayerIds.length ? round(covered / profile.depthLayerIds.length) : 0,
    verticalCoverage: covered >= 3 ? 'broad' : covered === 2 ? 'partial' : 'surface-limited'
  };
}

export function estimateDiveProfileEnergy(profileInput = 'sawtoothProfile', configInput = {}, options = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const sequence = createDiveProfileSequence(profile, configInput, { sampleCount: options.sampleCount ?? profile.samplesPerCycle });
  let transitions = 0;
  for (let index = 1; index < sequence.length; index += 1) transitions += Math.abs(sequence[index].zIndex - sequence[index - 1].zIndex);
  return {
    profileId: profile.id,
    transitionCount: transitions,
    relativeEnergy: round(1 + transitions * 0.08),
    educationalEstimate: true,
    note: 'Relative profile energy is a teaching proxy, not a calibrated glider dynamics model.'
  };
}

export function validateDiveProfile(profileInput = {}, configInput = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const errors = [];
  const warnings = [];
  if (profile.type !== 'anchor.science.water-column-profile') errors.push('Dive profile must normalize to anchor.science.water-column-profile.');
  if (!profile.sequence.length) errors.push('Dive profile needs at least one depth layer in its sequence.');
  for (const layerId of profile.sequence) {
    if (!profile.depthLayerIds.includes(layerId)) errors.push(`Dive profile references depth layer ${layerId} outside the water-column config.`);
  }
  if (profile.generatesWaypoints !== false) errors.push('Dive profile must not generate waypoints.');
  if (profile.controlsRoutePlanning !== false) errors.push('Dive profile must not control route planning.');
  if (profile.usesFull3DPlanning !== false) errors.push('Dive profile must not claim full 3D planning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, profile };
}

export function diveProfileSummary(profileInput = 'sawtoothProfile', configInput = {}) {
  const profile = normalizeDiveProfile(profileInput, configInput);
  const validation = validateDiveProfile(profile, configInput);
  return {
    type: 'anchor.headless.water-column-profile-summary',
    version: DIVE_PROFILE_MODEL_VERSION,
    schemaVersion: WATER_COLUMN_SCHEMA_VERSION,
    profileId: profile.id,
    label: profile.label,
    sequence: profile.sequence.slice(),
    coverage: diveProfileCoverage(profile, configInput),
    energy: estimateDiveProfileEnergy(profile, configInput),
    assignsDepthLayer: true,
    generatesWaypoints: false,
    controlsRoutePlanning: false,
    usesFull3DPlanning: false,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function normalizeProfileSequence(values, profileId, config) {
  const explicit = Array.isArray(values) ? values.map((entry) => String(entry?.depthLayerId ?? entry)).filter(Boolean) : [];
  if (explicit.length) return explicit.filter((id) => config.depthLayerIds.includes(id));
  const has = (id) => config.depthLayerIds.includes(id);
  if (profileId === 'surfaceOnly') return [config.depthLayerIds[0] ?? 'surface'];
  if (profileId === 'shallowDive') return [config.depthLayerIds[0], has('shallow') ? 'shallow' : config.defaultLayerIds[1] ?? config.depthLayerIds[0]].filter(Boolean);
  if (profileId === 'thermoclineDive') return [config.depthLayerIds[0], has('thermocline') ? 'thermocline' : config.defaultLayerIds[1] ?? config.depthLayerIds.at(-1), config.depthLayerIds[0]].filter(Boolean);
  if (profileId === 'deepDive') return [config.depthLayerIds[0], has('thermocline') ? 'thermocline' : config.depthLayerIds[0], has('deep') ? 'deep' : config.depthLayerIds.at(-1)].filter(Boolean);
  if (profileId === 'fullProfile' || profileId === 'adaptiveVerticalProfile' || profileId === 'integratedWaterColumn') return config.depthLayerIds.slice();
  return [...config.depthLayerIds, ...config.depthLayerIds.slice(0, -1).reverse()];
}

function normalizedProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const wrapped = number % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function labelForProfile(id) {
  return String(id).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

