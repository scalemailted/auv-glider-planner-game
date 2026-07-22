const bathymetryIndex = require('../../bathymetry/src/index.js')
const currentsIndex = require('../../currents/src/index.js')
const scalarProcessesIndex = require('../../scalar-processes/src/index.js')
const EnvironmentArtifact = require('./EnvironmentArtifact.js')
const EnvironmentUtil = require('./EnvironmentUtil.js')
const ENVIRONMENT_SAMPLER_VERSION = 'environment-sampler-env-pkg-r1';

const environmentSamplerRuntimeCounters = {
  samplerCreateCount: 0,
  sampleCallCount: 0
};

 function resetEnvironmentSamplerRuntimeCounters() {
  environmentSamplerRuntimeCounters.samplerCreateCount = 0;
  environmentSamplerRuntimeCounters.sampleCallCount = 0;
}

 function getEnvironmentSamplerRuntimeCounters() {
  return { ...environmentSamplerRuntimeCounters };
}

 function createEnvironmentSampler(environmentArtifact, options = {}) {
  const artifact = EnvironmentArtifact.normalizeEnvironmentArtifact(environmentArtifact);
  environmentSamplerRuntimeCounters.samplerCreateCount += 1;
  return {
    type: 'anchor.environment.sampler',
    version: ENVIRONMENT_SAMPLER_VERSION,
    environmentArtifact: artifact,
    environmentArtifactDigest: artifact.artifactDigest,
    summary: EnvironmentArtifact.environmentArtifactSummary(artifact),
    bathymetrySampler: artifact.bathymetry ? bathymetryIndex.createBathymetrySampler(artifact.bathymetry) : null,
    currentSamplers: new Map(artifact.currentFields.map((field) => [field.id, currentsIndex.createOceanCurrentSampler(field, { interpolation: options.currentInterpolation ?? 'linear4d' })])),
    scalarFields: new Map(artifact.scalarFields.map((field) => [field.id, field])),
    options: {
      currentInterpolation: options.currentInterpolation ?? 'linear4d',
      scalarInterpolation: options.scalarInterpolation ?? 'quadrilinearTimeVolumeV1',
      bathymetryInterpolation: options.bathymetryInterpolation ?? 'bilinear'
    }
  };
}

 function sampleEnvironment(samplerOrArtifact, eastMeters, northMeters, depthMeters, timeSeconds, options = {}) {
  const sampler = samplerOrArtifact?.type === 'anchor.environment.sampler'
    ? samplerOrArtifact
    : createEnvironmentSampler(samplerOrArtifact, options);
  environmentSamplerRuntimeCounters.sampleCallCount += 1;
  const warnings = [];
  const bathymetry = options.includeBathymetry === false ? null : sampleEnvironmentBathymetry(sampler, eastMeters, northMeters, options);
  const current = options.currentFieldId === null ? null : sampleEnvironmentCurrent(sampler, eastMeters, northMeters, depthMeters, timeSeconds, options);
  const scalars = sampleEnvironmentScalars(sampler, eastMeters, northMeters, depthMeters, timeSeconds, options);
  if (bathymetry?.outsideDomain) warnings.push('Bathymetry sample is outside the environment domain.');
  if (current?.valid === false) warnings.push(`Current sample invalid for ${current.fieldId ?? 'selected field'}.`);
  for (const [fieldId, sample] of Object.entries(scalars)) {
    if (sample.valid === false) warnings.push(`Scalar sample invalid for ${fieldId}.`);
  }
  return {
    type: 'anchor.environment.sample',
    version: ENVIRONMENT_SAMPLER_VERSION,
    environmentArtifactDigest: sampler.environmentArtifactDigest,
    eastMeters: EnvironmentUtil.round(eastMeters),
    northMeters: EnvironmentUtil.round(northMeters),
    depthMeters: EnvironmentUtil.round(depthMeters),
    timeSeconds: EnvironmentUtil.round(timeSeconds),
    bathymetry,
    current,
    scalars,
    valid: bathymetry?.outsideDomain !== true && (current?.valid ?? true) !== false && Object.values(scalars).every((sample) => sample.valid !== false),
    warnings,
    metadata: options.includeMetadata === true ? {
      fieldRoleSummary: sampler.summary.fieldRoleSummary,
      componentDigests: sampler.summary.componentDigests
    } : null
  };
}

 function sampleEnvironmentBathymetry(samplerOrArtifact, eastMeters, northMeters, options = {}) {
  const sampler = samplerOrArtifact?.type === 'anchor.environment.sampler'
    ? samplerOrArtifact
    : createEnvironmentSampler(samplerOrArtifact, options);
  if (!sampler.bathymetrySampler) {
    return { valid: false, wet: false, land: false, outsideDomain: false, bottomDepthMeters: null, signedElevationMeters: null, warning: 'No bathymetry component.' };
  }
  const sample = bathymetryIndex.sampleBathymetry(sampler.bathymetrySampler, eastMeters, northMeters, {
    interpolation: options.bathymetryInterpolation ?? sampler.options.bathymetryInterpolation
  });
  return {
    signedElevationMeters: sample.signedElevationMeters,
    bottomDepthMeters: sample.bottomDepthMeters,
    wet: sample.wet === true,
    land: sample.land === true,
    outsideDomain: sample.outsideDomain === true,
    valid: sample.outsideDomain !== true && sample.bottomDepthMeters != null,
    interpolation: {
      lowerEastIndex: sample.lowerEastIndex,
      upperEastIndex: sample.upperEastIndex,
      lowerNorthIndex: sample.lowerNorthIndex,
      upperNorthIndex: sample.upperNorthIndex,
      eastFraction: sample.eastFraction,
      northFraction: sample.northFraction
    },
    source: sample.source
  };
}

 function sampleEnvironmentCurrent(samplerOrArtifact, eastMeters, northMeters, depthMeters, timeSeconds, options = {}) {
  const sampler = samplerOrArtifact?.type === 'anchor.environment.sampler'
    ? samplerOrArtifact
    : createEnvironmentSampler(samplerOrArtifact, options);
  const fieldId = options.currentFieldId ?? sampler.currentSamplers.keys().next().value ?? null;
  if (!fieldId || !sampler.currentSamplers.has(fieldId)) {
    return { fieldId, valid: false, warning: 'No current field selected.' };
  }
  const sample = currentsIndex.samplePreparedOceanCurrent(sampler.currentSamplers.get(fieldId), {
    eastMeters,
    northMeters,
    depthMeters,
    timeSeconds,
    interpolation: options.currentInterpolation ?? sampler.options.currentInterpolation
  });
  return {
    fieldId,
    uEastMetersPerSecond: sample.uEastMetersPerSecond,
    vNorthMetersPerSecond: sample.vNorthMetersPerSecond,
    wDownMetersPerSecond: sample.wDownMetersPerSecond,
    magnitudeMetersPerSecond: sample.magnitudeMetersPerSecond,
    valid: sample.wet === true,
    wet: sample.wet === true,
    masked: sample.masked === true,
    belowBottom: sample.belowBottom === true,
    outsideDomain: sample.outsideDomain === true,
    interpolation: {
      lowerDepthMeters: sample.lowerDepthMeters,
      upperDepthMeters: sample.upperDepthMeters,
      depthFraction: sample.depthInterpolationFraction,
      lowerTimeSeconds: sample.lowerTimeSeconds,
      upperTimeSeconds: sample.upperTimeSeconds,
      timeFraction: sample.timeInterpolationFraction,
      lowerEastIndex: sample.lowerEastIndex,
      upperEastIndex: sample.upperEastIndex,
      lowerNorthIndex: sample.lowerNorthIndex,
      upperNorthIndex: sample.upperNorthIndex
    },
    source: sample.source
  };
}

 function sampleEnvironmentScalar(samplerOrArtifact, fieldId, eastMeters, northMeters, depthMeters, timeSeconds, options = {}) {
  const sampler = samplerOrArtifact?.type === 'anchor.environment.sampler'
    ? samplerOrArtifact
    : createEnvironmentSampler(samplerOrArtifact, options);
  const field = sampler.scalarFields.get(fieldId);
  if (!field) return { fieldId, value: null, valid: false, warning: `Scalar field ${fieldId} is not registered.` };
  const role = sampler.environmentArtifact.fieldRegistry.entries.find((entry) => entry.id === fieldId) ?? {};
  const sample = scalarProcessesIndex.sampleScalarField4D(field, {
    x: EnvironmentUtil.axisToIndex(field.xAxis, eastMeters),
    y: EnvironmentUtil.axisToIndex(field.yAxis, northMeters),
    depthMeters,
    timeSeconds,
    interpolationProfileId: options.scalarInterpolation ?? sampler.options.scalarInterpolation
  });
  return {
    fieldId,
    value: sample.value,
    units: role.units ?? field.units?.scalarValue ?? null,
    valid: sample.valid !== false,
    epistemicRole: role.epistemicRole ?? null,
    publicVisibility: role.publicVisibility ?? null,
    interpolation: sample.interpolationWeights ?? null,
    source: {
      artifactDigest: field.digest ?? null,
      sourceTier: field.sourceMetadata?.sourceTier ?? null,
      sourceId: field.sourceMetadata?.sourceId ?? null
    }
  };
}

function sampleEnvironmentScalars(sampler, eastMeters, northMeters, depthMeters, timeSeconds, options = {}) {
  const requested = options.scalarFieldIds === undefined
    ? [...sampler.scalarFields.keys()]
    : Array.isArray(options.scalarFieldIds) ? options.scalarFieldIds : [options.scalarFieldIds];
  return Object.fromEntries(requested.filter(Boolean).map((fieldId) => [fieldId, sampleEnvironmentScalar(sampler, fieldId, eastMeters, northMeters, depthMeters, timeSeconds, options)]));
}

module.exports = {resetEnvironmentSamplerRuntimeCounters, getEnvironmentSamplerRuntimeCounters, createEnvironmentSampler, sampleEnvironment, sampleEnvironmentBathymetry, sampleEnvironmentCurrent, sampleEnvironmentScalar}