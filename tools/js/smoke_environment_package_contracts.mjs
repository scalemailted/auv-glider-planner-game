import {
  assert,
  createFixtureBathymetry,
  createFixtureCurrent,
  createFixtureEnvironment,
  createFixtureScalar,
  environment
} from './environment_package_test_helpers.mjs';

const artifact = createFixtureEnvironment();
const validation = environment.validateEnvironmentArtifactContract(artifact);
const summary = environment.environmentArtifactSummary(artifact);
const componentDigests = environment.environmentComponentDigests(artifact);
assert.equal(validation.valid, true);
assert.equal(summary.validationSummary.valid, true);
assert.equal(summary.type, 'anchor.environment.artifact-summary');
assert.equal(summary.coordinateFrame, 'localEastNorthDown');
assert.equal(summary.componentDigests.bathymetryArtifactDigest, artifact.bathymetry.artifactDigest);
assert.equal(componentDigests.currentFieldDigests[artifact.currentFields[0].id], artifact.currentFields[0].digest);
assert.equal(componentDigests.scalarFieldDigests[artifact.scalarFields[0].id], artifact.scalarFields[0].digest);
assert.equal(summary.fieldRoleSummary.some((entry) => entry.fieldType === 'bathymetry'), true);
assert.equal(summary.fieldRoleSummary.some((entry) => entry.fieldType === 'current'), true);
assert.equal(summary.fieldRoleSummary.some((entry) => entry.fieldType === 'scalar'), true);
assert.equal(summary.boundaryFlags.packageOwnsGenerationEquations, false);
assert.equal(summary.boundaryFlags.packageOwnsVisibilityPolicy, false);
assert.equal(summary.boundaryFlags.packageOwnsObservationNoise, false);
assert.equal(summary.boundaryFlags.packageOwnsSimulation, false);
assert.equal(summary.boundaryFlags.packageOwnsScoring, false);
assert.equal(summary.synthetic, true);
assert.equal(summary.calibratedOceanProduct, false);
assert.equal(summary.operationalForecast, false);
assert.equal(summary.certifiedForNavigation, false);
assert.equal(environment.environmentArtifactDigest(artifact), artifact.artifactDigest);
assert.equal(environment.environmentManifestDigest(artifact.manifest), artifact.manifestDigest);
assert.equal(environment.environmentFieldRegistryDigest(artifact.fieldRegistry), artifact.fieldRegistry.registryDigest);
assert.equal(artifact.provenance.componentCount, 3);
assert.equal(artifact.sourceMetadata.componentSourceIds.includes(artifact.currentFields[0].id), true);

const manifestSummary = environment.environmentManifestSummary(artifact.manifest);
assert.equal(manifestSummary.generatorBackendId, 'cpuBathymetryConditionedSyntheticV3');
assert.equal(manifestSummary.currentManifestCount, 1);
assert.equal(manifestSummary.scalarManifestCount, 1);

const sampler = environment.createEnvironmentSampler(artifact);
const combined = environment.sampleEnvironment(sampler, 5, 5, 50, 50, { includeMetadata: true });
assert.equal(combined.valid, true);
assert.equal(Number.isFinite(combined.bathymetry.bottomDepthMeters), true);
assert.equal(Number.isFinite(combined.current.uEastMetersPerSecond), true);
assert.equal(Number.isFinite(combined.current.vNorthMetersPerSecond), true);
const scalarSample = combined.scalars[artifact.scalarFields[0].id];
assert.equal(Number.isFinite(scalarSample.value), true);
assert.equal(combined.metadata.fieldRoleSummary.length, summary.fieldRoleSummary.length);

const outside = environment.sampleEnvironment(sampler, 25, 25, 10, 10);
assert.equal(outside.valid, false);
assert.equal(outside.bathymetry.outsideDomain, true);
const belowBottom = environment.sampleEnvironment(sampler, 5, 5, 200, 50);
assert.equal(belowBottom.valid, false);
assert.equal(belowBottom.current.belowBottom, true);

const duplicateRegistry = environment.createEnvironmentFieldRegistry({
  entries: [
    { id: 'duplicate-field', fieldType: 'scalar', variableId: 'scienceValue', artifactDigest: 'digest-a' },
    { id: 'duplicate-field', fieldType: 'current', variableId: 'oceanCurrentVector', artifactDigest: 'digest-b' }
  ]
});
const duplicateValidation = environment.validateEnvironmentFieldRegistry(duplicateRegistry);
assert.equal(duplicateValidation.valid, false);
assert.equal(duplicateValidation.errors.some((entry) => entry.includes('Duplicate environment field id')), true);

const hiddenPublicRegistry = environment.createEnvironmentFieldRegistry({
  entries: [{ id: 'hidden-public-field', fieldType: 'scalar', containsHiddenTruth: true, publicVisibility: 'publicScenario', artifactDigest: 'digest-hidden' }]
});
const hiddenPublicValidation = environment.validateEnvironmentFieldRegistry(hiddenPublicRegistry);
assert.equal(hiddenPublicValidation.valid, false);
assert.equal(hiddenPublicValidation.errors.some((entry) => entry.includes('Hidden-truth field')), true);

const hiddenArtifact = createFixtureEnvironment({ hiddenScalar: true, scalarRole: 'truth' });
const hiddenSummary = environment.environmentArtifactSummary(hiddenArtifact);
assert.equal(hiddenArtifact.validationReport.valid, true);
assert.equal(hiddenSummary.fieldRegistry.hiddenTruthFieldCount, 1);
assert.equal(hiddenSummary.fieldRoleSummary.find((entry) => entry.fieldType === 'scalar').publicVisibility, 'hidden');

const coordinateMismatch = environment.createEnvironmentArtifact({
  id: 'coordinate-mismatch-environment',
  bathymetry: artifact.bathymetry,
  currentFields: [{ ...artifact.currentFields[0], id: 'coordinate-mismatch-current', coordinateFrame: 'gridIndexLegacy' }],
  scalarFields: artifact.scalarFields,
  coordinateFrame: 'localEastNorthDown'
});
assert.equal(coordinateMismatch.validationReport.valid, false);
assert.equal(coordinateMismatch.validationReport.errors.some((entry) => entry.includes('coordinateFrame')), true);

const landBathymetry = createFixtureBathymetry({
  id: 'environment-mask-land-bathymetry',
  bottomDepthMeters: [[0, 120], [120, 80]],
  wetMask: [[false, true], [true, true]],
  landMask: [[true, false], [false, false]]
});
const sameResolutionCurrent = createFixtureCurrent({
  id: 'environment-mask-bad-current',
  eastAxisMeters: [0, 10],
  northAxisMeters: [0, 10],
  wetMask: [[true, true], [true, true]],
  bottomDepthMeters: [[120, 120], [120, 80]]
});
const badMaskArtifact = createFixtureEnvironment({ bathymetry: landBathymetry, current: sameResolutionCurrent });
assert.equal(badMaskArtifact.validationReport.valid, false);
assert.equal(badMaskArtifact.validationReport.errors.some((entry) => entry.includes('wet/valid data on bathymetry land')), true);

assert.equal(artifact.validationReport.valid, true);
assert.equal(artifact.validationReport.warnings.some((entry) => entry.includes('mask resolution differs')), true);

const surfaceStatic = createFixtureEnvironment({
  current: createFixtureCurrent({ id: 'surface-static-current', depthAxisMeters: [0], timeAxisSeconds: [0] }),
  scalar: createFixtureScalar({ id: 'surface-static-scalar', depthAxisMeters: [0], timeAxisSeconds: [0] })
});
assert.equal(surfaceStatic.validationReport.valid, true);
assert.equal(surfaceStatic.validationReport.warnings.some((entry) => entry.includes('surface-only') || entry.includes('depth-invariant')), true);
assert.equal(surfaceStatic.validationReport.warnings.some((entry) => entry.includes('static in time')), true);

const cloned = structuredClone(artifact);
assert.equal(environment.environmentArtifactDigest(cloned), artifact.artifactDigest);
assert.equal(JSON.stringify(cloned).includes('function'), false);
console.log('smoke_environment_package_contracts: ok', {
  digest: artifact.artifactDigest,
  validationStatus: summary.validationSummary.status,
  sampleCurrentU: combined.current.uEastMetersPerSecond,
  scalarValue: scalarSample.value
});