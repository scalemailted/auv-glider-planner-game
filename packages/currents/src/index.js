export const PACKAGE_VERSION = 'anchor-currents-flow-pkg-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/currents',
  owns: [
    '4D current field contracts',
    'canonical current artifacts',
    'current source metadata',
    'current temporal boundary resolution',
    'current sampling',
    'pure current diagnostics',
    'deterministic synthetic current generation backends',
    'declared vertical current profile contracts'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry'],
  doesNotOwn: ['external ocean data import', 'rendering glyph density', 'mission scoring', 'browser controls', 'Three.js presentation']
});

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

export {
  CURRENT_FIELD_MANIFEST_VERSION,
  CURRENT_FIELD_REQUIRED_SYNTHETIC_CLAIM_BOUNDARY,
  createCurrentFieldManifest,
  normalizeCurrentFieldManifest,
  validateCurrentFieldManifest,
  currentFieldManifestSummary,
  currentFieldManifestDigest
} from './CurrentFieldManifest.js';

export {
  OCEAN_CURRENT_FIELD_4D_VERSION,
  OCEAN_CURRENT_FIELD_4D_VERSION as CURRENT_FIELD_ARTIFACT_VERSION,
  createOceanCurrentField4D,
  createOceanCurrentField4D as createCurrentField4D,
  normalizeOceanCurrentField4D,
  normalizeOceanCurrentField4D as normalizeCurrentField4D,
  validateOceanCurrentField4D,
  validateOceanCurrentField4D as validateCurrentField4D,
  oceanCurrentField4DSummary,
  oceanCurrentField4DSummary as currentFieldSummary,
  oceanCurrentField4DDigest,
  oceanCurrentField4DDigest as currentFieldDigest,
  dimensionsForField,
  getOceanCurrentFieldRuntimeCounters,
  resetOceanCurrentFieldRuntimeCounters
} from './OceanCurrentField4D.js';

export {
  OCEAN_CURRENT_FIELD_SAMPLER_VERSION,
  OCEAN_CURRENT_FIELD_SAMPLER_VERSION as CURRENT_FIELD_SAMPLER_VERSION,
  createOceanCurrentSampler,
  getOceanCurrentSampler,
  sampleOceanCurrent,
  sampleOceanCurrentVector,
  sampleCurrentDepthProfile,
  sampleCurrentTimeSeries,
  normalizeCurrentTemporalBoundary,
  resolveCurrentSamplingTime,
  samplePreparedOceanCurrent,
  validateOceanCurrentSample,
  oceanCurrentSampleSummary,
  getOceanCurrentSamplerRuntimeCounters,
  resetOceanCurrentSamplerRuntimeCounters
} from './OceanCurrentFieldSampler.js';

export {
  OCEAN_CURRENT_SOURCE_METADATA_VERSION,
  OCEAN_CURRENT_SOURCE_METADATA_VERSION as CURRENT_SOURCE_METADATA_VERSION,
  OCEAN_CURRENT_SOURCE_TIERS,
  OCEAN_CURRENT_REQUIRED_SYNTHETIC_WARNING,
  normalizeOceanCurrentSourceMetadata,
  normalizeOceanCurrentSourceMetadata as createOceanCurrentSourceMetadata,
  validateOceanCurrentSourceMetadata,
  currentSourceClaimBoundary
} from './OceanCurrentSourceMetadata.js';

export {
  CURRENT_FIELD_SCIENTIFIC_DIAGNOSTICS_VERSION,
  CURRENT_FIELD_SCIENTIFIC_DIAGNOSTICS_VERSION as CURRENT_DIAGNOSTICS_VERSION,
  computeCurrentFieldScientificDiagnostics,
  bathymetrySteeringAt
} from './CurrentFieldScientificDiagnostics.js';

export {
  CURRENT_TERRAIN_BOUNDARY_CONDITION_VERSION,
  createWetMaskFromBathymetry,
  isWetAtDepth,
  enforceCurrentTerrainBoundary,
  projectCoastlineNoNormalVelocity,
  coastlineNormal,
  terrainBoundaryDigest
} from './CurrentTerrainBoundaryCondition.js';

export {
  MANUFACTURED_CURRENT_FIELD_CATALOG_VERSION,
  manufacturedCurrentFieldCatalog,
  createManufacturedCurrentField,
  evaluateExpectedCurrent,
  manufacturedCurrentFieldDefinition
} from './ManufacturedCurrentFieldCatalog.js';
export {
  BATHYMETRY_CONDITIONED_CURRENT_BUILDER_VERSION,
  CURRENT_GENERATION_BACKEND_V2_ID,
  CURRENT_GENERATION_BACKEND_V3_ID,
  createBathymetryConditionedCurrentField,
  evaluateSyntheticCurrentAt,
  bathymetryConditionedComponentCatalog
} from './generation/BathymetryConditionedCurrentBuilder.js';

export {
  ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION,
  createAtlasConditionedCurrentField,
  buildAtlasConditionedCurrentArtifact,
  atlasCurrentComponentPlan
} from './generation/AtlasConditionedCurrentBuilder.js';

export {
  CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION,
  CURRENT_VERTICAL_PROFILE_FAMILIES,
  createCurrentVerticalStructureDescriptor,
  applyVerticalProfileToVector,
  applyVerticalProfileSequence,
  materialVectorDeltaForColumn
} from './generation/CurrentVerticalProfileContract.js';
