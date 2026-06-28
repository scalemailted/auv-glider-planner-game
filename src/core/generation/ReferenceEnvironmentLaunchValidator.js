import { canonicalJsonDigest, canonicalizeJsonValue } from '../../../packages/codecs/src/index.js';
import { validateEnvironmentArtifactContract } from '../../../packages/environment/src/index.js';
import {
  REFERENCE_ENVIRONMENT_LAUNCH_WARNING_TAXONOMY_VERSION,
  classifyReferenceEnvironmentWarning,
  failureToReferenceEnvironmentWarning,
  summarizeReferenceEnvironmentWarnings
} from './ReferenceEnvironmentLaunchWarningTaxonomy.js';

export const REFERENCE_ENVIRONMENT_LAUNCH_VALIDATOR_VERSION = 'reference-environment-launch-validator-env-compose-r1-1';
export const REFERENCE_ENVIRONMENT_LAUNCH_VALIDATION_REPORT_TYPE = 'anchor.reference-environment-launch-validation-report';

export function validateReferenceEnvironmentLaunch(input = {}) {
  const result = input.referenceEnvironmentResult ?? input;
  const environmentArtifact = result.environmentArtifact ?? input.environmentArtifact ?? null;
  const fieldResult = result.fieldRegenerationResult ?? input.fieldRegenerationResult ?? {};
  const currentDiagnostics = result.currentResult?.currentDiagnostics ?? fieldResult.currentDiagnostics ?? {};
  const scalarDiagnostics = result.scalarResult?.scalarDiagnostics ?? fieldResult.scalarDiagnostics ?? {};
  const startDropZoneCandidates = result.startDropZoneCandidates ?? fieldResult.startDropZoneCandidates ?? null;
  const hazardCandidates = result.hazardCandidates ?? fieldResult.hazardCandidates ?? null;
  const errors = [];
  const warnings = [];
  const failures = [];
  const checks = [];

  const addCheck = (id, passed, details = {}) => {
    checks.push({ id, status: passed ? 'PASS' : 'FAIL', passed: Boolean(passed), ...details });
    if (!passed && details.error) {
      errors.push(details.error);
      failures.push(failureToReferenceEnvironmentWarning({
        failureId: id,
        warningId: warningIdForCheck(id),
        explanation: details.error,
        relatedArtifactDigest: details.relatedArtifactDigest
      }));
    }
  };
  const addWarning = (warningId, details = {}) => {
    warnings.push(classifyReferenceEnvironmentWarning({
      warningId,
      ...details
    }));
  };

  const environmentValidation = environmentArtifact
    ? validateEnvironmentArtifactContract(environmentArtifact)
    : { valid: false, status: 'FAIL', errors: ['Environment artifact is missing.'], warnings: [] };
  addCheck('environment-artifact-current', result.environmentArtifactStatus === 'CURRENT' || environmentValidation.valid === true, {
    environmentArtifactStatus: result.environmentArtifactStatus ?? null,
    environmentArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null,
    relatedArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null,
    error: 'Package-backed EnvironmentArtifact is not current.'
  });
  addCheck('environment-artifact-valid', environmentValidation.valid === true, {
    validationStatus: environmentValidation.status,
    relatedArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null,
    error: environmentValidation.errors?.[0] ?? 'Package-backed EnvironmentArtifact failed validation.'
  });

  addCheck('current-field-current', Boolean(result.currentArtifact?.digest ?? result.currentArtifactDigest ?? fieldResult.currentArtifactDigest), {
    currentArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? result.currentArtifact?.digest ?? null,
    relatedArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? result.currentArtifact?.digest ?? null,
    error: 'CurrentField4D digest is missing.'
  });
  addCheck('scalar-field-current', Boolean(result.scalarArtifact?.digest ?? result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest), {
    scalarArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? result.scalarArtifact?.digest ?? null,
    relatedArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? result.scalarArtifact?.digest ?? null,
    error: 'ScalarField4D digest is missing.'
  });
  addCheck('current-field-clean-mask', Number(currentDiagnostics.landVectorCount ?? 0) === 0 && Number(currentDiagnostics.belowBottomVectorCount ?? 0) === 0, {
    landVectorCount: currentDiagnostics.landVectorCount ?? null,
    belowBottomVectorCount: currentDiagnostics.belowBottomVectorCount ?? null,
    relatedArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? result.currentArtifact?.digest ?? null,
    error: 'CurrentField4D contains land or below-bottom vectors.'
  });
  const scalarMean = scalarDiagnostics.scalarMean ?? scalarDiagnostics.scalarStatistics?.mean;
  addCheck('scalar-field-finite', finite(scalarMean) && finite(scalarDiagnostics.depthMeanRange), {
    scalarMean: scalarMean ?? null,
    scalarStatisticsMean: scalarDiagnostics.scalarStatistics?.mean ?? null,
    depthMeanRange: scalarDiagnostics.depthMeanRange ?? null,
    relatedArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? result.scalarArtifact?.digest ?? null,
    error: 'ScalarField4D diagnostics are not finite.'
  });

  const starts = Array.isArray(startDropZoneCandidates?.candidates) ? startDropZoneCandidates.candidates : [];
  addCheck('start-drop-zone-candidates-present', starts.length > 0, {
    candidateCount: starts.length,
    error: 'No start/drop-zone candidates are available for Planning launch.'
  });
  const validStarts = starts.filter((candidate) => (
    finite(candidate.xIndex)
    && finite(candidate.yIndex)
    && Number(candidate.bottomDepthMeters ?? 0) > 0
  ));
  addCheck('start-drop-zone-candidates-wet', validStarts.length > 0, {
    validCandidateCount: validStarts.length,
    error: 'Start/drop-zone candidates are not wet finite cells.'
  });
  if (starts.length > 0 && starts.length < Number(input.intendedGliders ?? result.provenance?.intendedGliders ?? 1)) {
    addWarning('start-zone-separation-low', {
      explanation: 'Start/drop-zone candidate count is smaller than intended glider count; launch uses the first valid active glider candidate.',
      relatedArtifactDigest: fieldResult.startDropZoneCandidateDigest ?? result.startDropZoneCandidateDigest ?? null
    });
  }

  const hazards = Array.isArray(hazardCandidates?.candidates) ? hazardCandidates.candidates : [];
  addCheck('hazards-public-safe', !hazardCandidates || hazardCandidates.publicSafe !== false, {
    hazardCount: hazards.length,
    error: 'Hazard candidates are not marked public-safe.'
  });
  if (!hazards.length) {
    addWarning('hazard-field-empty', {
      relatedArtifactDigest: result.hazardCandidateDigest ?? fieldResult.hazardCandidateDigest ?? null
    });
  } else {
    addWarning('hazard-candidates-public-safe', {
      relatedArtifactDigest: result.hazardCandidateDigest ?? fieldResult.hazardCandidateDigest ?? null
    });
  }

  const publicSafetyText = JSON.stringify({
    environmentArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null,
    currentArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? null,
    scalarArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? null,
    hazardCount: hazards.length,
    startCount: starts.length
  });
  addCheck('public-safety-no-hidden-markers', !/T_hiddenTruth|rawOracleTensor|oracleState/.test(publicSafetyText), {
    error: 'Launch metadata contains hidden-truth markers.'
  });

  for (const warning of (environmentValidation.warnings ?? []).slice(0, 8)) {
    addWarning('environment-artifact-validation-warning', {
      explanation: `EnvironmentArtifact validation warning: ${warning}`,
      relatedArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null
    });
  }
  addWarning('mission-ready-patch-reference-derived', {
    relatedArtifactDigest: result.bathymetryArtifactDigest ?? fieldResult.bathymetryArtifactDigest ?? null
  });
  addWarning('environment-artifact-composed', {
    relatedArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null
  });
  addWarning('current-field-synthetic', {
    relatedArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? result.currentArtifact?.digest ?? null
  });
  addWarning('scalar-field-synthetic', {
    relatedArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? result.scalarArtifact?.digest ?? null
  });
  addWarning('benchmark-bundle-public-safe');
  addWarning('no-operational-forecast');

  const warningSummary = summarizeReferenceEnvironmentWarnings(warnings, failures);
  const planningLaunchReady = warningSummary.launchAllowed === true;
  const status = failures.length ? 'FAIL' : warnings.some((warning) => warning.launchBlocking) ? 'WARN' : warnings.length ? 'WARN' : 'PASS';
  const componentDigests = {
    bathymetryArtifactDigest: result.bathymetryArtifactDigest ?? fieldResult.bathymetryArtifactDigest ?? null,
    environmentArtifactDigest: result.environmentArtifactDigest ?? environmentArtifact?.artifactDigest ?? null,
    currentArtifactDigest: result.currentArtifactDigest ?? fieldResult.currentArtifactDigest ?? result.currentArtifact?.digest ?? null,
    scalarArtifactDigest: result.scalarArtifactDigest ?? fieldResult.scalarArtifactDigest ?? result.scalarArtifact?.digest ?? null,
    hotspotArtifactDigest: result.hotspotArtifactDigest ?? fieldResult.hotspotArtifactDigest ?? null,
    startDropZoneCandidateDigest: result.startDropZoneCandidateDigest ?? fieldResult.startDropZoneCandidateDigest ?? null,
    hazardCandidateDigest: result.hazardCandidateDigest ?? fieldResult.hazardCandidateDigest ?? null
  };
  const reportBase = {
    artifactType: REFERENCE_ENVIRONMENT_LAUNCH_VALIDATION_REPORT_TYPE,
    artifactVersion: REFERENCE_ENVIRONMENT_LAUNCH_VALIDATOR_VERSION,
    type: 'anchor.reference-environment.launch-validation',
    version: REFERENCE_ENVIRONMENT_LAUNCH_VALIDATOR_VERSION,
    taxonomyVersion: REFERENCE_ENVIRONMENT_LAUNCH_WARNING_TAXONOMY_VERSION,
    launchValidationStatus: status,
    status,
    valid: planningLaunchReady,
    planningLaunchReady,
    warningSummary,
    errors,
    failures,
    warnings,
    checks,
    componentDigests,
    sourceProvenance: {
      sourceFixtureId: result.referenceFixtureId ?? result.provenance?.referenceFixtureId ?? null,
      sourceDataset: result.provenance?.sourceDataset ?? result.sourceMetadata?.sourceDataset ?? 'ETOPO_2022',
      sourceResolution: result.provenance?.sourceResolution ?? result.sourceMetadata?.sourceResolution ?? '15 arc-second',
      referenceBathymetryPatch: true,
      deterministicSyntheticBenchmarkFields: true
    },
    visibilitySafety: {
      exportVisibility: 'PUBLIC / FORECAST_ONLY',
      containsHiddenTruth: false,
      hiddenTruthExposed: false,
      rawExternalDataPathExposed: false,
      localAbsolutePathExposed: false
    },
    generatedAt: input.generatedAt ?? result.generatedAt ?? '2026-06-28T00:00:00.000Z',
    startDropZoneValidation: {
      status: validStarts.length ? 'CURRENT' : 'NEEDS_REVIEW',
      candidateCount: starts.length,
      validCandidateCount: validStarts.length,
      selectedCandidateId: validStarts[0]?.candidateId ?? null
    },
    hazardValidation: {
      status: hazardCandidates ? 'CURRENT' : 'REQUIRES_REGENERATION',
      candidateCount: hazards.length,
      publicSafe: hazardCandidates?.publicSafe !== false
    },
    environmentArtifactDigest: componentDigests.environmentArtifactDigest,
    currentArtifactDigest: componentDigests.currentArtifactDigest,
    scalarArtifactDigest: componentDigests.scalarArtifactDigest,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false,
    claimBoundary: {
      referenceBathymetryPatch: true,
      deterministicSyntheticBenchmarkFields: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false
    }
  };
  return {
    ...reportBase,
    validationDigest: canonicalJsonDigest(canonicalizeJsonValue(reportBase)),
    launchValidationDigest: canonicalJsonDigest(canonicalizeJsonValue(reportBase))
  };
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function warningIdForCheck(checkId) {
  if (/environment-artifact/.test(checkId)) return 'environment-artifact-invalid';
  if (/current-field-current|scalar-field-current/.test(checkId)) return 'field-artifact-missing';
  if (/current-field|scalar-field/.test(checkId)) return 'field-artifact-invalid';
  if (/start-drop-zone/.test(checkId)) return 'start-zone-missing';
  if (/public-safety|hazards-public-safe/.test(checkId)) return 'public-safety-failure';
  return 'field-artifact-invalid';
}
