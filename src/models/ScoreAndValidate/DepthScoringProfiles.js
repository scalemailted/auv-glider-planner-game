const WaterColumnSchema = require('./WaterColumnSchema.js')
const DEPTH_SCIENCE_SCORE_PROFILE_VERSION = 'depth-science-score-profile-three-r1-2a-2';

const PROFILE_DEFINITIONS = Object.freeze({
  legacySurfaceScienceV1: Object.freeze({
    scoreProfileId: 'legacySurfaceScienceV1',
    label: 'Legacy Surface Science v1',
    depthAware: false,
    compatibleGroup: 'legacySurfaceScience',
    objectiveWeightProfileId: 'surfaceLegacy',
    note: 'Preserves historical horizontal cell sampling semantics for imported surface-only missions.'
  }),
  depthAwareScienceV1: Object.freeze({
    scoreProfileId: 'depthAwareScienceV1',
    label: 'Depth-Aware Science v1',
    depthAware: true,
    compatibleGroup: 'depthAwareScience',
    objectiveWeightProfileId: 'generalSurvey',
    note: 'Credits science from actual depth-layer observations with explicit component diagnostics.'
  })
});

 const DEPTH_SCIENCE_SCORE_PROFILE_IDS = Object.freeze(Object.keys(PROFILE_DEFINITIONS));

 function normalizeDepthScienceScoreProfileId(value = 'legacySurfaceScienceV1', fallback = 'legacySurfaceScienceV1') {
  const text = String(value ?? '').trim();
  if (PROFILE_DEFINITIONS[text]) return text;
  if (text === 'depthAware' || text === 'depthAwareScience') return 'depthAwareScienceV1';
  if (text === 'legacy' || text === 'surface' || text === 'surfaceOnly') return 'legacySurfaceScienceV1';
  return PROFILE_DEFINITIONS[fallback] ? fallback : 'legacySurfaceScienceV1';
}

 function depthScienceScoreProfileMetadata(profileInput = 'legacySurfaceScienceV1', options = {}) {
  const rawId = typeof profileInput === 'string'
    ? profileInput
    : profileInput?.scoreProfileId ?? profileInput?.id ?? profileInput?.profileId ?? profileInput?.scoringProfileId;
    const id = normalizeDepthScienceScoreProfileId(rawId, options.defaultProfileId ?? 'legacySurfaceScienceV1');
    const definition = PROFILE_DEFINITIONS[id];
    return {
      type: 'anchor.science.depth-score-profile',
      version: DEPTH_SCIENCE_SCORE_PROFILE_VERSION,
      scoreProfileId: definition.scoreProfileId,
      scoreProfileVersion: DEPTH_SCIENCE_SCORE_PROFILE_VERSION,
      label: definition.label,
      depthAware: definition.depthAware,
      compatibleGroup: definition.compatibleGroup,
      layerSchemaVersion: options.layerSchemaVersion ?? options.waterColumnSchemaVersion ?? WaterColumnSchema.WATER_COLUMN_SCHEMA_VERSION,
      objectiveWeightProfileId: options.objectiveWeightProfileId ?? profileInput?.objectiveWeightProfileId ?? definition.objectiveWeightProfileId,
      officialBrowserScoreSelectable: true,
      hiddenTruthRequired: false,
      publicSafe: true,
      syntheticTeachingModel: true,
      calibratedOceanForecast: false,
      usesActualObservationDepthForScoring: definition.depthAware,
      awardsIntegratedValueToSurfaceSample: false,
      usesFree3DPlanning: false,
      note: definition.note
    };
}

 function depthScienceScoreProfilesCompatible(a = null, b = null) {
  const left = depthScienceScoreProfileMetadata(a ?? 'legacySurfaceScienceV1');
  const right = depthScienceScoreProfileMetadata(b ?? 'legacySurfaceScienceV1');
  return left.compatibleGroup === right.compatibleGroup
    && left.scoreProfileVersion === right.scoreProfileVersion
    && left.layerSchemaVersion === right.layerSchemaVersion;
}

 function depthScienceScoreProfileComparison(a = null, b = null) {
  const left = depthScienceScoreProfileMetadata(a ?? 'legacySurfaceScienceV1');
  const right = depthScienceScoreProfileMetadata(b ?? 'legacySurfaceScienceV1');
  const compatible = depthScienceScoreProfilesCompatible(left, right);
  return {
    type: 'anchor.science.depth-score-profile-comparison',
    version: DEPTH_SCIENCE_SCORE_PROFILE_VERSION,
    compatible,
    left,
    right,
    warnings: compatible ? [] : [
      `Score profiles ${left.scoreProfileId} and ${right.scoreProfileId} are not directly comparable.`
    ]
  };
}

 function depthScienceScoreProfileSummary(profileInput = 'legacySurfaceScienceV1') {
  const profile = depthScienceScoreProfileMetadata(profileInput);
  return {
    type: 'anchor.science.depth-score-profile-summary',
    version: DEPTH_SCIENCE_SCORE_PROFILE_VERSION,
    scoreProfileId: profile.scoreProfileId,
    scoreProfileVersion: profile.scoreProfileVersion,
    depthAware: profile.depthAware,
    objectiveWeightProfileId: profile.objectiveWeightProfileId,
    layerSchemaVersion: profile.layerSchemaVersion,
    publicSafe: true,
    comparableWithinProfileOnly: true,
    usesActualObservationDepthForScoring: profile.usesActualObservationDepthForScoring,
    awardsIntegratedValueToSurfaceSample: false
  };
}

module.exports = {DEPTH_SCIENCE_SCORE_PROFILE_IDS, normalizeDepthScienceScoreProfileId, depthScienceScoreProfileMetadata, depthScienceScoreProfilesCompatible, depthScienceScoreProfileComparison, depthScienceScoreProfileSummary}