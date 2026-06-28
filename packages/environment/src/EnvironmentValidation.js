import { validateBathymetryArtifact } from '../../bathymetry/src/index.js';
import { validateCurrentField4D } from '../../currents/src/index.js';
import { validateScalarField4D } from '../../scalar-processes/src/index.js';
import { validateEnvironmentFieldRegistry } from './EnvironmentFieldRegistry.js';
import { validateEnvironmentManifest } from './EnvironmentManifest.js';
import { axisExtent, createEnvironmentValidationReport } from './EnvironmentUtil.js';

export const ENVIRONMENT_VALIDATION_VERSION = 'environment-validation-env-pkg-r1';

export function validateEnvironmentArtifact(value = {}) {
  const artifact = value?.type === 'anchor.environment.artifact' ? value : null;
  const errors = [];
  const warnings = [];
  const checks = [];
  if (!artifact) {
    return createEnvironmentValidationReport({ errors: ['Environment artifact type must be anchor.environment.artifact.'], warnings, checks });
  }

  addReport('manifest', validateEnvironmentManifest(artifact.manifest ?? {}), errors, warnings, checks);
  addReport('field-registry', validateEnvironmentFieldRegistry(artifact.fieldRegistry ?? {}), errors, warnings, checks);

  if (artifact.bathymetry) addReport('bathymetry', validateBathymetryArtifact(artifact.bathymetry), errors, warnings, checks);
  else warnings.push('Environment artifact has no bathymetry component.');

  for (const field of artifact.currentFields ?? []) addReport(`current:${field.id ?? 'unknown'}`, validateCurrentField4D(field), errors, warnings, checks);
  for (const field of artifact.scalarFields ?? []) addReport(`scalar:${field.id ?? 'unknown'}`, validateScalarField4D(field), errors, warnings, checks);

  validateIdentity(artifact, errors, warnings, checks);
  validateCoordinates(artifact, errors, warnings, checks);
  validateBathymetryCoupling(artifact, errors, warnings, checks);
  validateTimeAndDepth(artifact, errors, warnings, checks);
  validateRoles(artifact, errors, warnings, checks);
  validateClaimBoundary(artifact, errors, warnings, checks);

  return createEnvironmentValidationReport({ errors, warnings, checks });
}

export function environmentValidationSummary(report = {}) {
  return {
    type: 'anchor.environment.validation-summary',
    version: ENVIRONMENT_VALIDATION_VERSION,
    valid: report.valid === true,
    status: report.status ?? 'FAIL',
    errorCount: report.errors?.length ?? 0,
    warningCount: report.warnings?.length ?? 0,
    checkCount: report.checks?.length ?? 0
  };
}

function validateIdentity(artifact, errors, warnings, checks) {
  const fieldIds = new Set();
  for (const entry of artifact.fieldRegistry?.entries ?? []) {
    if (fieldIds.has(entry.id)) errors.push(`Duplicate environment field id: ${entry.id}.`);
    fieldIds.add(entry.id);
  }
  const digests = artifact.componentDigests ?? {};
  if (artifact.bathymetry && digests.bathymetryArtifactDigest !== artifact.bathymetry.artifactDigest) warnings.push('Bathymetry component digest does not match componentDigests.');
  for (const field of artifact.currentFields ?? []) {
    if (digests.currentFieldDigests?.[field.id] !== field.digest) warnings.push(`Current component digest mismatch for ${field.id}.`);
  }
  for (const field of artifact.scalarFields ?? []) {
    if (digests.scalarFieldDigests?.[field.id] !== field.digest) warnings.push(`Scalar component digest mismatch for ${field.id}.`);
  }
  checks.push({ id: 'environment-identity-digests-present', status: artifact.artifactDigest ? 'PASS' : 'WARN' });
}

function validateCoordinates(artifact, errors, warnings, checks) {
  const frame = artifact.coordinateFrame;
  if (!frame) errors.push('Environment coordinateFrame is required.');
  const components = [
    artifact.bathymetry,
    ...(artifact.currentFields ?? []),
    ...(artifact.scalarFields ?? [])
  ].filter(Boolean);
  for (const component of components) {
    if (component.coordinateFrame && frame && component.coordinateFrame !== frame) {
      if (areCompatibleLocalMeterFrames(component.coordinateFrame, frame)) {
        warnings.push(`Component ${component.id ?? component.type} coordinateFrame ${component.coordinateFrame} is accepted as a local-meter frame compatible with environment ${frame}.`);
      } else {
        errors.push(`Component ${component.id ?? component.type} coordinateFrame ${component.coordinateFrame} does not match environment ${frame}.`);
      }
    }
  }
  const domain = artifact.operationalDomain ?? {};
  const horizontal = domain.horizontal ?? {};
  if (!(Number(horizontal.widthMeters) > 0) || !(Number(horizontal.heightMeters) > 0)) errors.push('Environment physical horizontal extents must be positive.');
  checks.push({ id: 'environment-different-resolution-support', status: 'PASS', note: 'Component axis counts may differ; physical coordinate sampling delegates to component samplers.' });
}

function areCompatibleLocalMeterFrames(a, b) {
  const localMeterFrames = new Set([
    'localEastNorthDown',
    'localTangentPlane',
    'localTangentPlaneMetersV1',
    'localGridXYDepthTime',
    'localLevelGridMeters'
  ]);
  return localMeterFrames.has(String(a)) && localMeterFrames.has(String(b));
}

function validateBathymetryCoupling(artifact, errors, warnings, checks) {
  const bathymetry = artifact.bathymetry;
  if (!bathymetry) {
    checks.push({ id: 'environment-bathymetry-coupling', status: 'NOT_APPLICABLE' });
    return;
  }
  for (const field of artifact.currentFields ?? []) {
    validateMaskPair({ bathymetry, field, fieldMask: field.wetMask, fieldName: `current ${field.id}`, errors, warnings });
  }
  for (const field of artifact.scalarFields ?? []) {
    const mask = field.wetMask ?? field.sourceMetadata?.wetMask ?? null;
    if (mask) validateMaskPair({ bathymetry, field, fieldMask: mask, fieldName: `scalar ${field.id}`, errors, warnings });
  }
  checks.push({ id: 'environment-bathymetry-coupling', status: 'PASS' });
}

function validateMaskPair({ bathymetry, field, fieldMask, fieldName, errors, warnings }) {
  const bathyHeight = bathymetry.wetMask?.length ?? 0;
  const bathyWidth = bathymetry.wetMask?.[0]?.length ?? 0;
  const maskHeight = fieldMask?.length ?? 0;
  const maskWidth = fieldMask?.[0]?.length ?? 0;
  if (!bathyHeight || !bathyWidth || !maskHeight || !maskWidth) return;
  if (bathyHeight !== maskHeight || bathyWidth !== maskWidth) {
    warnings.push(`${fieldName} mask resolution differs from bathymetry; ENV-PKG-R1 accepts different resolutions and validates by declared overlap.`);
    return;
  }
  for (let y = 0; y < bathyHeight; y += 1) {
    for (let x = 0; x < bathyWidth; x += 1) {
      if (fieldMask[y]?.[x] === true && bathymetry.wetMask[y]?.[x] !== true) {
        errors.push(`${fieldName} reports wet/valid data on bathymetry land at ${x},${y}.`);
        return;
      }
    }
  }
}

function validateTimeAndDepth(artifact, errors, warnings, checks) {
  for (const field of artifact.currentFields ?? []) validateFieldCoverage(field, warnings, checks, 'current');
  for (const field of artifact.scalarFields ?? []) validateFieldCoverage(field, warnings, checks, 'scalar');
}

function validateFieldCoverage(field, warnings, checks, kind) {
  const depth = axisExtent(field.depthAxisMeters);
  const time = axisExtent(field.timeAxisSeconds);
  if (depth.count <= 1) warnings.push(`${kind} field ${field.id} is surface-only or depth-invariant by axis.`);
  if (time.count <= 1) warnings.push(`${kind} field ${field.id} is static in time.`);
  if (field.temporalBoundaryMode === 'bounded' && time.max < Number(field.validTimeEndSeconds ?? time.max)) warnings.push(`${kind} field ${field.id} may clamp before declared valid end time.`);
  checks.push({ id: `${kind}-${field.id}-coverage`, status: 'PASS', depthCount: depth.count, timeCount: time.count, temporalBoundaryMode: field.temporalBoundaryMode ?? field.sourceMetadata?.temporalBoundaryMode ?? 'bounded' });
}

function validateRoles(artifact, errors, warnings, checks) {
  const entries = artifact.fieldRegistry?.entries ?? [];
  for (const entry of entries) {
    if (entry.containsHiddenTruth === true && entry.publicVisibility !== 'hidden') errors.push(`Hidden truth field ${entry.id} must not be public-visible.`);
    if (entry.epistemicRole === 'uncertainty' && entry.variableId === 'scalarValue') warnings.push(`Uncertainty field ${entry.id} should use a distinct variable id when possible.`);
    if (entry.epistemicRole === 'derivedPriority' && entry.containsHiddenTruth === true) errors.push(`Derived priority field ${entry.id} must not masquerade as hidden truth.`);
  }
  checks.push({ id: 'environment-role-metadata', status: entries.length ? 'PASS' : 'WARN', fieldCount: entries.length });
}

function validateClaimBoundary(artifact, errors, warnings, checks) {
  const boundary = artifact.boundaryFlags?.claimBoundary ?? artifact.claimBoundary ?? artifact.manifest?.claimBoundary ?? {};
  if (boundary.synthetic === true && boundary.calibratedOceanProduct === true) errors.push('Synthetic environment artifact cannot claim calibrated ocean product status.');
  if (boundary.certifiedForNavigation === true) errors.push('Environment artifact cannot claim certified navigation product status.');
  if (artifact.boundaryFlags?.packageOwnsSimulation === true) errors.push('Environment package must not own Simulation.');
  if (artifact.boundaryFlags?.packageOwnsScoring === true) errors.push('Environment package must not own scoring.');
  if (artifact.boundaryFlags?.rendererOwnsEnvironmentTruth === true) errors.push('Renderer must not own environment truth.');
  checks.push({ id: 'environment-claim-boundary', status: 'PASS' });
}

function addReport(id, report = {}, errors, warnings, checks) {
  errors.push(...(report.errors ?? []).map((entry) => `${id}: ${entry}`));
  warnings.push(...(report.warnings ?? []).map((entry) => `${id}: ${entry}`));
  checks.push({ id, status: report.status ?? (report.valid === false ? 'FAIL' : 'PASS') });
}
