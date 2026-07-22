const index = require('./currents/src/index.js')
const SimulationLaunchProfiler = require('./SimulationLaunchProfiler.js')
const CURRENT_FIELD_ARTIFACT_ADAPTER_VERSION = 'current-field-artifact-adapter-flow-pkg-r1';

 function normalizeCurrentFieldArtifact(value = {}, options = {}) {
  const artifact = index.normalizeCurrentField4D(value);
  const validation = index.validateCurrentField4D(artifact);
  if (!validation.valid && options.throwOnInvalid !== false) {
    const error = new Error(`CurrentField4D artifact invalid: ${validation.errors.join('; ') || 'unknown validation failure'}`);
    error.name = 'CurrentFieldArtifactValidationError';
    error.validation = validation;
    throw error;
  }
  SimulationLaunchProfiler.setSimulationLaunchCurrentField(validation.field ?? artifact);
  const summary = index.currentFieldSummary(validation.field ?? artifact);
  return {
    type: 'anchor.environment.current-field-artifact-adapter-result',
    version: CURRENT_FIELD_ARTIFACT_ADAPTER_VERSION,
    artifact: validation.field ?? artifact,
    validation,
    summary,
    digest: (validation.field ?? artifact).digest ?? index.currentFieldDigest(validation.field ?? artifact),
    packageBacked: true
  };
}

 function currentFieldArtifactAdapterSummary(result = {}) {
  const artifact = result.artifact ?? result;
  const summary = result.summary ?? index.currentFieldSummary(artifact);
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
module.exports = {normalizeCurrentFieldArtifact, currentFieldArtifactAdapterSummary}