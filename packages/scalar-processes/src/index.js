export const PACKAGE_VERSION = 'anchor-scalar-processes-process-pkg-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/scalar-processes',
  owns: [
    '4D scalar field contracts',
    'canonical scalar artifacts',
    'scalar source metadata',
    'continuous scalar sampling',
    'water-column scalar field helpers',
    'pure scalar diagnostics',
    'manufactured scalar regression fixtures',
    'depth-layer priority collapse diagnostics'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/currents'],
  doesNotOwn: ['rendering colors', 'route editing', 'vehicle physics', 'observation noise', 'score formulas', 'bathymetry generation', 'current generation', 'teaching-lab process engines']
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
  SCALAR_SOURCE_METADATA_VERSION,
  SCALAR_SOURCE_TIERS,
  SCALAR_REQUIRED_SYNTHETIC_WARNING,
  normalizeScalarSourceMetadata,
  validateScalarSourceMetadata,
  scalarSourceClaimBoundary
} from './ScalarSourceMetadata.js';

export {
  SCALAR_FIELD_DIAGNOSTICS_VERSION,
  computeScalarFieldDiagnostics,
  validateScalarFieldDiagnostics,
  scalarFieldStats,
  scalarFieldMass,
  scalarFieldDigest,
  noCalibratedScalarClaims,
  validateScalarClaimBoundary
} from './ScalarFieldDiagnostics.js';

export {
  SCALAR_FIELD_4D_VERSION,
  createScalarField4D,
  normalizeScalarField4D,
  validateScalarField4D,
  scalarField4DSummary,
  scalarField4DDigest,
  createScalarField4DSampler,
  sampleScalarField4D,
  dimensionsForScalarField,
  getScalarField4DRuntimeCounters,
  resetScalarField4DRuntimeCounters
} from './ScalarField4D.js';

export {
  MANUFACTURED_SCALAR_FIELD_CATALOG_VERSION,
  manufacturedScalarFieldCatalog,
  manufacturedScalarFieldDefinition,
  createManufacturedScalarField,
  evaluateManufacturedScalar
} from './ManufacturedScalarFieldCatalog.js';

export {
  createScalarFieldGrid,
  cellCount,
  createScalarField3d,
  createVectorField3d,
  clamp01,
  normalizeField3d,
  field3dStats,
  sampleNearest3d,
  setCell3d,
  fieldShape,
  validateField3d,
  cloneField3d,
  mapField3d,
  forEachFieldCell
} from './ScalarFieldGrid.js';

export {
  VOLUMETRIC_FIELD_SAMPLER_VERSION,
  FIELD_INTERPOLATION_PROFILES,
  sampleScalarFieldContinuous,
  sampleVectorFieldContinuous,
  sampleMaskFieldContinuous,
  sampleBathymetryContinuous,
  sampleVolumetricFieldContinuous,
  validateVolumetricFieldSample,
  volumetricFieldSampleSummary
} from './VolumetricFieldSampler.js';

export {
  WATER_COLUMN_SCHEMA_VERSION,
  WATER_COLUMN_DEPTH_LAYER_IDS,
  WATER_COLUMN_DEFAULT_LAYER_IDS,
  WATER_COLUMN_PROFILE_IDS,
  WATER_COLUMN_OBSERVATION_TYPES,
  WATER_COLUMN_SUMMARY_IDS,
  normalizeWaterColumnLayerId,
  normalizeWaterColumnLayerIds,
  normalizeWaterColumnProfileId,
  waterColumnLayerMetadata,
  waterColumnLayerOptions,
  waterColumnProfileOptions,
  waterColumnNotA,
  createDefaultWaterColumnConfig,
  normalizeWaterColumnConfig,
  validateWaterColumnConfig,
  waterColumnConfigSummary
} from './WaterColumnSchema.js';

export {
  WATER_COLUMN_FIELD_MODEL_VERSION,
  createWaterColumnScalarField,
  createWaterColumnVectorField,
  sampleWaterColumnScalar,
  sampleWaterColumnVector,
  waterColumnFieldStats,
  collapseWaterColumnField,
  bestWaterColumnDepthLayer,
  validateWaterColumnField,
  waterColumnFieldSummary
} from './WaterColumnFieldModel.js';

export {
  WATER_COLUMN_PRIORITY_MODEL_VERSION,
  computeWaterColumnPriority,
  summarizeWaterColumnPriority,
  bestWaterColumnPriorityLayer,
  validateWaterColumnPriorityArtifact
} from './WaterColumnPriorityModel.js';
