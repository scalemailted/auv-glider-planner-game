import {
  normalizeCurrentField4D,
  validateCurrentField4D,
  currentFieldSummary,
  currentFieldDigest
} from '../../../packages/currents/src/index.js';
import { setSimulationLaunchCurrentField } from '../runtime/SimulationLaunchProfiler.js';

export const CURRENT_FIELD_ARTIFACT_ADAPTER_VERSION = 'current-field-artifact-adapter-flow-pkg-r1';

export function normalizeCurrentFieldArtifact(value = {}, options = {}) {
  const artifact = normalizeCurrentField4D(value);
  const validation = validateCurrentField4D(artifact);
  if (!validation.valid && options.throwOnInvalid !== false) {
    const error = new Error(`CurrentField4D artifact invalid: ${validation.errors.join('; ') || 'unknown validation failure'}`);
    error.name = 'CurrentFieldArtifactValidationError';
    error.validation = validation;
    throw error;
  }
  setSimulationLaunchCurrentField(validation.field ?? artifact);
  const summary = currentFieldSummary(validation.field ?? artifact);
  return {
    type: 'anchor.environment.current-field-artifact-adapter-result',
    version: CURRENT_FIELD_ARTIFACT_ADAPTER_VERSION,
    artifact: validation.field ?? artifact,
    validation,
    summary,
    digest: (validation.field ?? artifact).digest ?? currentFieldDigest(validation.field ?? artifact),
    packageBacked: true
  };
}

export function currentFieldArtifactAdapterSummary(result = {}) {
  const artifact = result.artifact ?? result;
  const summary = result.summary ?? currentFieldSummary(artifact);
  return {
    type: 'anchor.environment.current-field-artifact-adapter-summary',
    version: CURRENT_FIELD_ARTIFACT_ADAPTER_VERSION,
    packageBacked: true,
    currentPackageVersion: 'anchor-currents-flow-pkg-r1',
    currentArtifactDigest: artifact.digest ?? summary.digest ?? null,
    currentManifestDigest: artifact.manifestDigest ?? artifact.sourceMetadata?.environmentManifestDigest ?? null,
    currentSourceTier: summary.sourceTier ?? artifact.sourceMetadata?.sourceTier ?? null,
    currentCoordinateFrame: summary.coordinateFrame ?? artifact.coordinateFrame ?? null,
    currentAxisCounts: {
      east: summary.eastSampleCount ?? artifact.eastAxisMeters?.length ?? 0,
      north: summary.northSampleCount ?? artifact.northAxisMeters?.length ?? 0,
      depth: summary.depthSampleCount ?? artifact.depthAxisMeters?.length ?? 0,
      time: summary.timeSampleCount ?? artifact.timeAxisSeconds?.length ?? 0
    },
    currentTemporalBoundaryMode: summary.temporalBoundaryMode ?? artifact.temporalBoundaryMode ?? null,
    currentValidationStatus: result.validation?.status ?? null,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    packageAcceptsDisplayHours: false,
    packageTimeUnit: 'seconds'
  };
}