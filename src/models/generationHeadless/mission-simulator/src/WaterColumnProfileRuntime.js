const MissionSimulationUtil = require('./MissionSimulationUtil.js')
const WATER_COLUMN_SCHEMA_VERSION = 'water-column-schema-p11';
 const DIVE_PROFILE_MODEL_VERSION = 'dive-profile-model-p11';
 const EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION = 'effective-dive-profile-resolver-dive-r1';
 const CANONICAL_MODERN_DIVE_PROFILE_ID = 'sawtoothProfile';
 const WATER_COLUMN_DEPTH_LAYER_IDS = Object.freeze(['surface', 'shallow', 'thermocline', 'midwater', 'deep', 'bottom', 'integratedWaterColumn']);
 const WATER_COLUMN_DEFAULT_LAYER_IDS = Object.freeze(['surface', 'thermocline', 'deep']);
 const WATER_COLUMN_PROFILE_IDS = Object.freeze(['surfaceOnly', 'shallowDive', 'thermoclineDive', 'deepDive', 'fullProfile', 'sawtoothProfile', 'adaptiveVerticalProfile', 'integratedWaterColumn']);

const LAYER_METADATA = Object.freeze({
  surface: layer('surface', 'Surface', 0, 5),
  shallow: layer('shallow', 'Shallow', 10, 20),
  thermocline: layer('thermocline', 'Thermocline', 35, 35),
  midwater: layer('midwater', 'Midwater', 75, 60),
  deep: layer('deep', 'Deep', 150, 100),
  bottom: layer('bottom', 'Bottom', 250, 150),
  integratedWaterColumn: layer('integratedWaterColumn', 'Integrated Water Column', null, null)
});
const DEPTH_LAYER_ALIASES = Object.freeze({ surface2d: 'surface', top: 'surface', nearSurface: 'surface', thermoclineLayer: 'thermocline', mid: 'midwater', waterColumn: 'integratedWaterColumn', integrated: 'integratedWaterColumn' });
const PROFILE_ALIASES = Object.freeze({ surface: 'surfaceOnly', surface2d: 'surfaceOnly', shallow: 'shallowDive', thermocline: 'thermoclineDive', deep: 'deepDive', full: 'fullProfile', sawtooth: 'sawtoothProfile', standardSawtooth: 'sawtoothProfile', standard_sawtooth: 'sawtoothProfile', adaptive: 'adaptiveVerticalProfile', integrated: 'integratedWaterColumn' });
const SOURCE_PRIORITY = Object.freeze(['segmentOverride', 'agentPlanDefault', 'agentDefault', 'missionWaterColumnDefault', 'modernGeneratedDefault', 'legacySurfaceCompatibility']);

 function normalizeWaterColumnLayerId(id, fallback = 'surface') {
  const value = String(id ?? '').trim();
  if (WATER_COLUMN_DEPTH_LAYER_IDS.includes(value)) return value;
  return DEPTH_LAYER_ALIASES[value] ?? fallback;
}

 function normalizeWaterColumnLayerIds(values = WATER_COLUMN_DEFAULT_LAYER_IDS) {
  const source = Array.isArray(values) ? values : String(values ?? '').split(',');
  const ids = [...new Set(source.map((entry) => normalizeWaterColumnLayerId(entry, null)).filter((entry) => entry && entry !== 'integratedWaterColumn'))];
  return ids.length ? ids : WATER_COLUMN_DEFAULT_LAYER_IDS.slice();
}

 function normalizeWaterColumnProfileId(value = 'sawtoothProfile') {
  const text = String(value ?? '').trim();
  if (WATER_COLUMN_PROFILE_IDS.includes(text)) return text;
  return PROFILE_ALIASES[text] ?? 'sawtoothProfile';
}

 function waterColumnLayerMetadata(id) {
  const normalized = normalizeWaterColumnLayerId(id);
  return { ...LAYER_METADATA[normalized] };
}

 function normalizeWaterColumnConfig(options = {}) {
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
    defaultLayerIds: defaultLayerIds.filter((id) => layerIds.includes(id)).length ? defaultLayerIds.filter((id) => layerIds.includes(id)) : layerIds.slice(0, Math.min(3, layerIds.length)),
    diveProfileId,
    defaultDiveProfileId: source.defaultDiveProfileId ?? diveProfileId,
    defaultTargetDepthLayerId: source.defaultTargetDepthLayerId ?? source.defaultPlanningLayerId ?? layerIds.find((id) => id !== 'surface') ?? layerIds[0] ?? 'surface',
    layerMetadata: Object.fromEntries(layerIds.map((id) => [id, waterColumnLayerMetadata(id)])),
    publicSafe: true,
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    syntheticTeachingModel: true,
    calibratedVerticalOceanModel: false
  };
}

 function normalizeDiveProfile(profileInput = {}, configInput = {}) {
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
    notA: ['not full 3D route planning', 'not calibrated glider pitch control', 'not production vehicle controller', 'not MARL/RL']
  };
}

 function resolveEffectiveDiveProfile(options = {}) {
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options.mission?.world?.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const routeWaypointCount = routeWaypointCountFrom(options);
  const executableSegmentCount = executableSegmentCountFrom(options, routeWaypointCount);
  const routeEmpty = routeWaypointCount === 0 || executableSegmentCount === 0;
  const modern = isModernWaterColumnMission(options, waterColumnConfig);
  const warnings = [];
  if (routeEmpty) {
    warnings.push('No executable surface route is present, so the glider remains surface-only.');
    return buildEffectiveDiveResult({ profile: normalizeDiveProfile('surfaceOnly', waterColumnConfig), source: 'noExecutableRoute', targetDepthLayerId: 'surface', routeWaypointCount, executableSegmentCount, modern, warnings, compatibilityFallback: !modern });
  }
  for (const candidate of profileCandidates(options, waterColumnConfig)) {
    if (!candidate?.id) continue;
    const profileId = normalizeWaterColumnProfileId(candidate.id);
    if (profileId === 'surfaceOnly' && isStaleModernSurfaceDefault(candidate.source, options, waterColumnConfig, modern)) {
      warnings.push(`${candidate.source} surface-only default treated as stale modern water-column metadata.`);
      continue;
    }
    const profile = normalizeDiveProfile(profileId, waterColumnConfig);
    return buildEffectiveDiveResult({ profile, source: candidate.source, targetDepthLayerId: resolveTargetDepthLayerId({ ...options, candidateSource: candidate.source }, waterColumnConfig, profile, modern), routeWaypointCount, executableSegmentCount, modern, warnings, compatibilityFallback: candidate.source === 'legacySurfaceCompatibility' });
  }
  const fallbackProfileId = modern ? CANONICAL_MODERN_DIVE_PROFILE_ID : 'surfaceOnly';
  const profile = normalizeDiveProfile(fallbackProfileId, waterColumnConfig);
  if (modern) warnings.push('Modern water-column mission had no explicit dive profile; applying standard sawtooth default.');
  return buildEffectiveDiveResult({ profile, source: modern ? 'modernGeneratedDefault' : 'legacySurfaceCompatibility', targetDepthLayerId: resolveTargetDepthLayerId(options, waterColumnConfig, profile, modern), routeWaypointCount, executableSegmentCount, modern, warnings, compatibilityFallback: !modern });
}

 function effectiveDiveProfileSummary(result = {}) {
  return {
    type: 'anchor.motion.effective-dive-profile-summary',
    version: EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION,
    profileId: result.profileId ?? result.profile?.id ?? null,
    source: result.source ?? null,
    inherited: result.inherited === true,
    routeEmpty: result.routeEmpty === true,
    modernWaterColumnMission: result.modernWaterColumnMission === true,
    compatibilityFallback: result.compatibilityFallback === true,
    targetDepthLayerId: result.targetDepthLayerId ?? null,
    requestedMaximumDepthMeters: result.requestedMaximumDepthMeters ?? null,
    achievableMaximumDepthMeters: result.achievableMaximumDepthMeters ?? null,
    terrainLimited: result.terrainLimited === true,
    routeWaypointCount: result.routeWaypointCount ?? null,
    executableSegmentCount: result.executableSegmentCount ?? null,
    warnings: [...(result.warnings ?? [])]
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

function profileCandidates(options, waterColumnConfig) {
  const waypoint = options.targetWaypoint ?? options.waypoint ?? options.segment?.targetWaypoint ?? options.target ?? null;
  const route = options.route ?? null;
  const agentPlan = options.agentPlan ?? route?.agentPlan ?? null;
  const agent = options.agent ?? options.glider ?? null;
  const mission = options.mission ?? null;
  return [
    { source: 'segmentOverride', id: waypoint?.diveProfileId ?? waypoint?.profileId ?? options.segment?.flightProfile?.profileId ?? options.segment?.flightProfile?.diveProfileId ?? options.segment?.flightProfileId ?? options.segment?.diveProfileId ?? route?.selectedDiveProfileId ?? options.diveProfileIdOverride },
    { source: 'agentPlanDefault', id: agentPlan?.diveProfileId ?? route?.diveProfileId ?? options.plan?.diveProfileId },
    { source: 'agentDefault', id: agent?.diveProfileId ?? agent?.defaultDiveProfileId ?? agent?.waterColumn?.defaultDiveProfileId },
    { source: 'missionWaterColumnDefault', id: mission?.rules?.waterColumn?.defaultDiveProfileId ?? mission?.waterColumnConfig?.defaultDiveProfileId ?? mission?.world?.waterColumnConfig?.defaultDiveProfileId ?? options.level?.world?.waterColumnConfig?.defaultDiveProfileId ?? waterColumnConfig.defaultDiveProfileId ?? waterColumnConfig.diveProfileId },
    { source: 'modernGeneratedDefault', id: CANONICAL_MODERN_DIVE_PROFILE_ID },
    { source: 'legacySurfaceCompatibility', id: 'surfaceOnly' }
  ];
}

function resolveTargetDepthLayerId(options, config, profile, modern) {
  const waypoint = options.targetWaypoint ?? options.waypoint ?? options.segment?.targetWaypoint ?? options.target ?? null;
  const route = options.route ?? null;
  const agentPlan = options.agentPlan ?? null;
  const agent = options.agent ?? null;
  const mission = options.mission ?? null;
  const explicit = waypoint?.targetDepthLayerId ?? waypoint?.depthLayerId ?? waypoint?.depthLayer ?? route?.targetDepthLayerId ?? options.segment?.flightProfile?.targetDepthLayerId ?? options.segment?.targetDepthLayerId ?? agentPlan?.targetDepthLayerId ?? agentPlan?.depthLayerId ?? agent?.targetDepthLayerId;
  if (explicit) return normalizeWaterColumnLayerId(explicit, config.depthLayerIds[0] ?? 'surface');
  const missionDefault = mission?.rules?.waterColumn?.defaultTargetDepthLayerId ?? mission?.waterColumnConfig?.defaultTargetDepthLayerId ?? mission?.world?.waterColumnConfig?.defaultTargetDepthLayerId ?? options.level?.world?.waterColumnConfig?.defaultTargetDepthLayerId ?? config.defaultTargetDepthLayerId;
  const normalizedMissionDefault = normalizeWaterColumnLayerId(missionDefault, null);
  if (normalizedMissionDefault && !(modern && normalizedMissionDefault === 'surface' && profile.id !== 'surfaceOnly')) return normalizedMissionDefault;
  if (profile.id === 'surfaceOnly') return 'surface';
  const deepestProfileLayer = [...(profile.sequence ?? [])].reverse().find((id) => id && id !== 'surface');
  if (deepestProfileLayer) return normalizeWaterColumnLayerId(deepestProfileLayer, config.depthLayerIds[0] ?? 'surface');
  if (config.depthLayerIds.includes('thermocline')) return 'thermocline';
  return config.depthLayerIds.find((id) => id !== 'surface') ?? config.depthLayerIds[0] ?? 'surface';
}

function buildEffectiveDiveResult({ profile, source, targetDepthLayerId, routeWaypointCount, executableSegmentCount, modern, warnings = [], compatibilityFallback = false }) {
  const requestedMaximumDepthMeters = requestedDepthMeters(profile, targetDepthLayerId);
  return {
    type: 'anchor.motion.effective-dive-profile',
    version: EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION,
    profile,
    profileId: profile.id,
    label: profile.label,
    source,
    inherited: source !== 'segmentOverride',
    sourcePriority: SOURCE_PRIORITY.slice(),
    targetDepthLayerId,
    requestedMaximumDepthMeters,
    achievableMaximumDepthMeters: requestedMaximumDepthMeters,
    terrainLimited: false,
    routeWaypointCount,
    executableSegmentCount,
    routeEmpty: routeWaypointCount === 0 || executableSegmentCount === 0,
    modernWaterColumnMission: modern,
    compatibilityFallback,
    explicitSurfaceOnly: profile.id === 'surfaceOnly' && source !== 'legacySurfaceCompatibility',
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    syntheticTeachingModel: true,
    operationallyCalibrated: false,
    warnings,
    digest: `${profile.id}:${source}:${targetDepthLayerId}:${routeWaypointCount ?? 'n'}:${executableSegmentCount ?? 'n'}`
  };
}

function isModernWaterColumnMission(options, config) {
  const raw = options.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options.mission?.world?.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? config;
  if (isLegacySurfaceOnlyMission(raw)) return false;
  if ((config.depthLayerIds ?? []).filter((id) => id !== 'surface').length > 0) return true;
  return raw?.source === 'generatedModernMission' || raw?.generatedModernMission === true || raw?.compatibility?.modernMissionExpectedVolumetric === true || options.mission?.meta?.waterColumnConfigSource === 'generatedModernMission' || options.level?.meta?.waterColumnConfigSource === 'generatedModernMission';
}

function isLegacySurfaceOnlyMission(config = null) {
  if (!config) return true;
  const normalized = normalizeWaterColumnConfig(config);
  return config.source === 'importedLegacySurfaceFallback' || config.compatibility?.importedLegacySurfaceFallback === true || (normalized.depthLayerIds.length === 1 && normalized.depthLayerIds[0] === 'surface' && config.source !== 'generatedModernMission');
}

function isStaleModernSurfaceDefault(source, options, config, modern) {
  if (!modern) return false;
  if (source === 'segmentOverride' || source === 'agentPlanDefault') return false;
  const raw = options.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options.mission?.world?.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? config;
  return raw?.source === 'generatedModernMission' || raw?.generatedModernMission === true || raw?.compatibility?.modernMissionExpectedVolumetric === true || options.mission?.meta?.waterColumnConfigSource === 'generatedModernMission' || options.level?.meta?.waterColumnConfigSource === 'generatedModernMission';
}

function routeWaypointCountFrom(options) {
  if (Number.isFinite(Number(options.routeWaypointCount))) return Math.max(0, Math.round(Number(options.routeWaypointCount)));
  if (Array.isArray(options.route?.points)) return options.route.points.length;
  if (Array.isArray(options.agentPlan?.waypoints)) return options.agentPlan.waypoints.length + 1;
  if (Array.isArray(options.plan?.waypoints)) return options.plan.waypoints.length + 1;
  if (Array.isArray(options.waypoints)) return options.waypoints.length;
  return null;
}

function executableSegmentCountFrom(options, routeWaypointCount) {
  if (Number.isFinite(Number(options.executableSegmentCount))) return Math.max(0, Math.round(Number(options.executableSegmentCount)));
  if (Array.isArray(options.route?.points)) return Math.max(0, options.route.points.length - 1);
  if (Array.isArray(options.agentPlan?.waypoints)) return Math.max(0, options.agentPlan.waypoints.length);
  if (Array.isArray(options.plan?.waypoints)) return Math.max(0, options.plan.waypoints.length);
  if (Number.isFinite(Number(routeWaypointCount))) return Math.max(0, Number(routeWaypointCount) - 1);
  return null;
}

function requestedDepthMeters(profile, targetDepthLayerId) {
  if (profile.id === 'surfaceOnly') return 0;
  const sequenceDepth = Math.max(0, ...(profile.sequence ?? []).map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)).filter(Number.isFinite));
  const targetDepth = Number(waterColumnLayerMetadata(targetDepthLayerId).nominalDepthMeters ?? 0);
  return Number(Math.max(sequenceDepth, Number.isFinite(targetDepth) ? targetDepth : 0).toFixed(6));
}

function layer(id, label, nominalDepthMeters, thicknessMeters) {
  return Object.freeze({ id, label, nominalDepthMeters, thicknessMeters, synthetic: true, calibrated: false });
}

function labelForProfile(id) {
  return String(id).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}

 function depthLayerForDiveProfile(profileInput = 'sawtoothProfile', progress = 0) {
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

function normalizedProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const wrapped = number % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

 function layerIndexForDepth(depthMeters = 0, configInput = {}) {
  const config = normalizeWaterColumnConfig(configInput);
  const depth = MissionSimulationUtil.finiteNumber(depthMeters, 0);
  let best = config.depthLayerIds[0] ?? 'surface';
  let bestDistance = Infinity;
  for (const layerId of config.depthLayerIds) {
    const layerDepth = MissionSimulationUtil.finiteNumber(waterColumnLayerMetadata(layerId).nominalDepthMeters, 0);
    const distance = Math.abs(depth - layerDepth);
    if (distance < bestDistance) {
      best = layerId;
      bestDistance = distance;
    }
  }
  return Math.max(0, config.depthLayerIds.indexOf(best));
}
module.exports = {DIVE_PROFILE_MODEL_VERSION, EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION, CANONICAL_MODERN_DIVE_PROFILE_ID, WATER_COLUMN_DEPTH_LAYER_IDS, WATER_COLUMN_DEFAULT_LAYER_IDS, WATER_COLUMN_PROFILE_IDS, normalizeWaterColumnLayerId, normalizeWaterColumnLayerIds, normalizeWaterColumnProfileId, waterColumnLayerMetadata, normalizeWaterColumnConfig, normalizeDiveProfile, resolveEffectiveDiveProfile, effectiveDiveProfileSummary, depthLayerForDiveProfile, layerIndexForDepth}