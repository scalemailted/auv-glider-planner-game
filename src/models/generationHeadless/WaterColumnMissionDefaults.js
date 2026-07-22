const WaterColumnSchema = require('./WaterColumnSchema.js')
const DepthScoringProfiles = require('./mission-simulator/src/DepthScoringProfiles.js')
const WATER_COLUMN_MISSION_DEFAULTS_VERSION = 'water-column-mission-defaults-dive-r1';

 const MODERN_OPERATIONAL_DEPTH_LAYER_IDS = Object.freeze([
  'surface',
  'shallow',
  'thermocline',
  'midwater',
  'deep'
]);

 function buildDefaultWaterColumnMissionConfig(options = {}) {
  const source = normalizeSource(options.source ?? 'generatedModernMission');
  const layerIds = normalizeLayerSet(options.layerIds ?? options.depthLayerIds ?? defaultLayerIdsForLevel(options.level));
  const config = WaterColumnSchema.normalizeWaterColumnConfig({
    enabled: true,
    depthLayerIds: layerIds,
    defaultLayerIds: layerIds,
    diveProfileId: 'sawtoothProfile'
  });
  const defaultPlanningLayerId = config.depthLayerIds.includes('thermocline') ? 'thermocline' : config.depthLayerIds.find((id) => id !== 'surface') ?? config.depthLayerIds[0] ?? 'surface';
  const availableDiveProfileIds = WaterColumnSchema.WATER_COLUMN_PROFILE_IDS.filter((id) => id !== 'integratedWaterColumn');
  const scoreProfile = DepthScoringProfiles.depthScienceScoreProfileMetadata('depthAwareScienceV1', {
    layerSchemaVersion: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    objectiveWeightProfileId: options.objectiveWeightProfileId ?? 'generalSurvey'
  });
  return {
    ...config,
    version: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    defaultsVersion: WaterColumnSchema.WATER_COLUMN_MISSION_DEFAULTS_VERSION,
    source,
    synthetic: true,
    calibrated: false,
    generatedModernMission: source === 'generatedModernMission' || source === 'scenarioSpecificGeneratedConfig' || source === 'tutorialGeneratedMission',
    scoreProfile,
    scoreProfileId: scoreProfile.scoreProfileId,
    scoreProfileVersion: scoreProfile.scoreProfileVersion,
    depthAwareScienceScoring: scoreProfile,
    layerIds: config.depthLayerIds.slice(),
    layerDefinitions: Object.fromEntries(config.depthLayerIds.map((id) => [id, {
      ...WaterColumnSchema.waterColumnLayerMetadata(id),
      fieldPolicy: fieldPolicyForLayer(id),
      validCellMaskSource: 'bottomBoundaryClearance',
      currentSource: 'publicScenarioDepthShear',
      synthetic: true,
      calibrated: false
    }])),
    defaultDiveProfileId: config.diveProfileId,
    availableDiveProfileIds,
    defaultPlanningLayerId,
    defaultTargetDepthLayerId: defaultPlanningLayerId,
    defaultDisplayMode: config.depthLayerIds.length > 1 ? 'explodedLayers' : 'physicalDepth',
    defaultPlanningCameraPresetId: config.depthLayerIds.length > 1 ? 'obliqueWaterColumn' : 'tacticalTopDown',
    bottomBoundaryReference: bottomBoundaryReference(options.level),
    fieldLayout: buildFieldLayout(config.depthLayerIds),
    compatibility: {
      modernMissionExpectedVolumetric: config.depthLayerIds.length > 1,
      importedLegacySurfaceFallback: false,
      surfaceOnlyDefaultPreservesCanonicalRoute: false,
      routeModel: 'horizontalWaypointsWithOptionalDiveProfiles',
      free3DPlanning: false,
      explodedModeVisualizationOnly: true
    },
    warnings: [
      'Synthetic educational water-column configuration; not a calibrated ocean forecast.',
      'Routed modern missions default to a standard sawtooth dive profile; explicit surface-only selections remain supported.',
      'Depth-aware science scoring is versioned and credits actual depth-layer observations.'
    ],
    notA: WaterColumnSchema.waterColumnNotA()
  };
}

 function buildLegacySurfaceOnlyWaterColumnConfig(options = {}) {
  const config = WaterColumnSchema.normalizeWaterColumnConfig({
    enabled: true,
    depthLayerIds: ['surface'],
    defaultLayerIds: ['surface'],
    diveProfileId: 'surfaceOnly'
  });
  const scoreProfile = DepthScoringProfiles.depthScienceScoreProfileMetadata('legacySurfaceScienceV1', {
    layerSchemaVersion: WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
    objectiveWeightProfileId: 'surfaceLegacy'
  });
  return {
    ...config,
    defaultsVersion: WaterColumnSchema.WATER_COLUMN_MISSION_DEFAULTS_VERSION,
    source: 'importedLegacySurfaceFallback',
    synthetic: true,
    calibrated: false,
    scoreProfile,
    scoreProfileId: scoreProfile.scoreProfileId,
    scoreProfileVersion: scoreProfile.scoreProfileVersion,
    depthAwareScienceScoring: scoreProfile,
    layerIds: ['surface'],
    layerDefinitions: {
      surface: {
        ...WaterColumnSchema.waterColumnLayerMetadata('surface'),
        fieldPolicy: fieldPolicyForLayer('surface'),
        synthetic: true,
        calibrated: false
      }
    },
    defaultDiveProfileId: config.diveProfileId,
    availableDiveProfileIds: ['surfaceOnly'],
    defaultPlanningLayerId: 'surface',
    defaultTargetDepthLayerId: 'surface',
    defaultDisplayMode: 'physicalDepth',
    defaultPlanningCameraPresetId: 'tacticalTopDown',
    bottomBoundaryReference: bottomBoundaryReference(options.level),
    fieldLayout: buildFieldLayout(['surface']),
    compatibility: {
      modernMissionExpectedVolumetric: false,
      importedLegacySurfaceFallback: true,
      fallbackReason: options.reason ?? 'Mission JSON did not declare waterColumnConfig.',
      sourceArtifactType: options.sourceArtifactType ?? null,
      sourceSchemaVersion: options.sourceSchemaVersion ?? null,
      surfaceOnlyDefaultPreservesCanonicalRoute: true,
      free3DPlanning: false,
      explodedModeVisualizationOnly: true
    },
    warnings: [
      'This imported mission has no water-column configuration. It is displayed in surface-only compatibility mode.',
      'Legacy surface-only scoring is preserved as legacySurfaceScienceV1.'
    ],
    notA: WaterColumnSchema.waterColumnNotA()
  };
}

 function ensureModernWaterColumnMissionConfig(level, mission, options = {}) {
  if (hasWaterColumnConfig(level, mission)) return existingWaterColumnConfig(level, mission);
  const config = buildDefaultWaterColumnMissionConfig({ level, mission, ...options, source: options.source ?? 'generatedModernMission' });
  attachWaterColumnConfig(level, mission, config);
  return config;
}

 function ensureLegacySurfaceOnlyWaterColumnConfig(level, mission, options = {}) {
  if (hasWaterColumnConfig(level, mission)) return existingWaterColumnConfig(level, mission);
  const config = buildLegacySurfaceOnlyWaterColumnConfig({ level, mission, ...options });
  attachWaterColumnConfig(level, mission, config);
  return config;
}

 function validateWaterColumnMissionConfig(config = {}) {
  const validation = WaterColumnSchema.validateWaterColumnConfig(config);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings, ...(config.warnings ?? [])];
  const source = config?.source ?? null;
  const layers = normalizeLayerSet(config?.depthLayerIds ?? config?.layerIds ?? []);
  if (!source) errors.push('Water-column mission config requires a source.');
  if (config?.calibrated === true || config?.calibratedVerticalOceanModel === true) errors.push('Water-column mission config must not claim calibration.');
  if (config?.compatibility?.free3DPlanning === true || config?.usesFull3DPlanning === true) errors.push('Water-column mission config must not enable free 3D planning.');
  if (!layers.length) errors.push('Water-column mission config requires at least one operational layer.');
  if (!WATER_COLUMN_PROFILE_IDS.includes(config?.defaultDiveProfileId ?? config?.diveProfileId ?? 'surfaceOnly')) errors.push('Unsupported default dive profile.');
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    config: WaterColumnSchema.normalizeWaterColumnConfig(config)
  };
}

 function waterColumnMissionConfigSummary(config = {}) {
  const normalized = WaterColumnSchema.normalizeWaterColumnConfig(config ?? {});
  const source = config?.source ?? (isLegacySurfaceOnlyMission(config) ? 'importedLegacySurfaceFallback' : 'unknown');
  const validation = validateWaterColumnMissionConfig({ ...config, ...normalized, source });
  return {
    type: 'anchor.science.water-column-mission-config-summary',
    version: WATER_COLUMN_MISSION_DEFAULTS_VERSION,
    schemaVersion: normalized.version,
    source,
    configVersion: config?.defaultsVersion ?? config?.version ?? normalized.version,
    depthLayerIds: normalized.depthLayerIds.slice(),
    layerCount: normalized.depthLayerIds.length,
    defaultDiveProfileId: config?.defaultDiveProfileId ?? normalized.diveProfileId,
    defaultDisplayMode: config?.defaultDisplayMode ?? (normalized.depthLayerIds.length > 1 ? 'explodedLayers' : 'physicalDepth'),
    synthetic: config?.synthetic !== false,
    calibrated: config?.calibrated === true,
    importedLegacySurfaceFallback: isLegacySurfaceOnlyMission(config),
    modernMissionExpectedVolumetric: !isLegacySurfaceOnlyMission(config) && normalized.depthLayerIds.length > 1,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

 function isLegacySurfaceOnlyMission(config = null) {
  if (!config) return true;
  const normalized = WaterColumnSchema.normalizeWaterColumnConfig(config);
  return config.source === 'importedLegacySurfaceFallback'
    || config.compatibility?.importedLegacySurfaceFallback === true
    || (normalized.depthLayerIds.length === 1 && normalized.depthLayerIds[0] === 'surface' && config.source !== 'generatedModernMission');
}

 function hasWaterColumnConfig(level = null, mission = null) {
  return Boolean(existingWaterColumnConfig(level, mission));
}

 function existingWaterColumnConfig(level = null, mission = null) {
  return level?.world?.waterColumnConfig
    ?? mission?.world?.waterColumnConfig
    ?? mission?.waterColumnConfig
    ?? null;
}

 function attachWaterColumnConfig(level = null, mission = null, config = null) {
  if (!config) return null;
  if (level) {
    level.world ??= {};
    level.world.waterColumnConfig = cloneJson(config);
    level.meta ??= {};
    level.meta.waterColumnConfigSource = config.source ?? null;
    level.meta.scoreProfileId = config.scoreProfileId ?? config.scoreProfile?.scoreProfileId ?? null;
    level.meta.scoreProfileVersion = config.scoreProfileVersion ?? config.scoreProfile?.scoreProfileVersion ?? null;
  }
  if (mission) {
    mission.waterColumnConfig = cloneJson(config);
    mission.world ??= {};
    mission.world.waterColumnConfig = cloneJson(config);
    mission.meta ??= {};
    mission.meta.waterColumnConfigSource = config.source ?? null;
    mission.meta.scoreProfileId = config.scoreProfileId ?? config.scoreProfile?.scoreProfileId ?? null;
    mission.meta.scoreProfileVersion = config.scoreProfileVersion ?? config.scoreProfile?.scoreProfileVersion ?? null;
    mission.rules ??= {};
    mission.scoring ??= {};
    mission.scoring.depthScience = cloneJson(config.scoreProfile ?? config.depthAwareScienceScoring ?? null);
    mission.scoring.scoreProfileId = config.scoreProfileId ?? config.scoreProfile?.scoreProfileId ?? mission.scoring.scoreProfileId;
    mission.rules.waterColumn = {
      configSource: config.source ?? null,
      defaultDiveProfileId: config.defaultDiveProfileId ?? config.diveProfileId ?? 'surfaceOnly',
      defaultTargetDepthLayerId: config.defaultTargetDepthLayerId ?? config.defaultPlanningLayerId ?? 'surface',
      surfaceOnlyDefaultPreservesCanonicalRoute: config.compatibility?.surfaceOnlyDefaultPreservesCanonicalRoute ?? ((config.defaultDiveProfileId ?? config.diveProfileId) === 'surfaceOnly'),
      scoreProfileId: config.scoreProfileId ?? config.scoreProfile?.scoreProfileId ?? null,
      scoreProfileVersion: config.scoreProfileVersion ?? config.scoreProfile?.scoreProfileVersion ?? null
    };
    for (const agent of mission.agents ?? []) {
      agent.diveProfileId ??= config.defaultDiveProfileId ?? config.diveProfileId ?? 'surfaceOnly';
      agent.targetDepthLayerId ??= config.defaultTargetDepthLayerId ?? config.defaultPlanningLayerId ?? 'surface';
    }
  }
  return config;
}

function defaultLayerIdsForLevel(level = null) {
  const maxDepth = estimateMaximumBottomDepthMeters(level);
  const ids = ['surface', 'shallow', 'thermocline', 'midwater'];
  if (maxDepth >= 130) ids.push('deep');
  return ids.length >= 5 ? ids : MODERN_OPERATIONAL_DEPTH_LAYER_IDS.slice();
}

function estimateMaximumBottomDepthMeters(level = null) {
  const values = (level?.layers?.depthMeters ?? level?.bathymetry?.depthMeters ?? level?.layers?.depth ?? [])
    .flat?.()
    ?.map(Number)
    ?.filter((value) => Number.isFinite(value) && value > 0) ?? [];
  if (!values.length) return 180;
  const max = Math.max(...values);
  if (max <= 2) return 20 + max * 220;
  return max;
}

function bottomBoundaryReference(level = null) {
  const depth = level?.layers?.depthMeters ? 'level.layers.depthMeters'
    : level?.bathymetry?.depthMeters ? 'level.bathymetry.depthMeters'
      : level?.layers?.depth ? 'level.layers.depth normalized-to-meters'
        : 'synthetic fallback bottom depth';
  return {
    source: depth,
    calibrated: false,
    synthetic: true,
    notes: 'Bottom constraints are public-safe educational constraints, not calibrated bathymetric survey data.'
  };
}

function buildFieldLayout(layerIds) {
  return {
    validCellMask: 'bottomBoundaryClearance',
    bottomClearance: 'bottomDepthMeters - layerDepthMeters',
    scalarFields: ['sampleValue', 'A_global_depth', 'A_global_topdown'],
    currentFields: layerIds.map((id) => ({ id: `current-${id}`, depthLayerId: id, includesVerticalCue: id === 'thermocline' || id === 'deep' })),
    optionalFields: ['belief', 'uncertainty', 'hazard', 'constraint'],
    hiddenTruthIncluded: false
  };
}

function fieldPolicyForLayer(id) {
  return {
    validCellMask: 'required',
    bottomClearance: id === 'surface' ? 'not-applicable' : 'required',
    scalar: 'public synthetic value or documented neutral fallback',
    currentUV: 'public synthetic vector shear from top-down current field',
    currentW: id === 'thermocline' || id === 'deep' ? 'synthetic vertical cue' : 'optional',
    hazardConstraint: 'public map layer only',
    hiddenTruth: false
  };
}

function normalizeLayerSet(values) {
  const source = Array.isArray(values) ? values : String(values ?? '').split(',');
  const ids = source.map((id) => String(id ?? '').trim()).filter(Boolean);
  const unique = [...new Set(ids.filter((id) => id !== 'integratedWaterColumn' && id !== 'bottom'))];
  return unique.length ? unique : ['surface'];
}

function normalizeSource(value) {
  const text = String(value ?? '').trim();
  return text || 'generatedModernMission';
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}

module.exports = {MODERN_OPERATIONAL_DEPTH_LAYER_IDS, buildDefaultWaterColumnMissionConfig, buildLegacySurfaceOnlyWaterColumnConfig, ensureModernWaterColumnMissionConfig, ensureLegacySurfaceOnlyWaterColumnConfig, validateWaterColumnMissionConfig, waterColumnMissionConfigSummary, isLegacySurfaceOnlyMission, hasWaterColumnConfig, existingWaterColumnConfig, attachWaterColumnConfig}