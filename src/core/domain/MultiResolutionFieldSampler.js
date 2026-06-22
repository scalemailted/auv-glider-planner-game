import {
  sampleBathymetryContinuous,
  sampleMaskFieldContinuous,
  sampleScalarFieldContinuous,
  sampleVectorFieldContinuous
} from '../science/VolumetricFieldSampler.js';
import { physicalPointToRoleSample } from './OperationalDomainCoordinates.js';
import { normalizeOperationalDomainSpec } from './OperationalDomainSpec.js';
import { normalizeMissionResolutionProfile, resolutionGridForRole } from './MissionResolutionProfile.js';

export const MULTI_RESOLUTION_FIELD_SAMPLER_VERSION = 'multi-resolution-field-sampler-world-r1';

export function sampleFieldAtPhysicalPoint(options = {}) {
  const fieldType = options.fieldType ?? options.type ?? 'scalar';
  if (fieldType === 'vector') return sampleVectorAtPhysicalPoint(options);
  if (fieldType === 'mask') return sampleMaskAtPhysicalPoint(options);
  if (fieldType === 'bathymetry') return sampleBathymetryAtPhysicalPoint(options);
  return sampleScalarAtPhysicalPoint(options);
}

export function sampleScalarAtPhysicalPoint(options = {}) {
  const context = fieldSamplingContext(options, options.role ?? 'science');
  const sample = sampleScalarFieldContinuous({
    ...options,
    field: options.field,
    x: context.sample.x,
    y: context.sample.y,
    depthMeters: options.point?.depthMeters ?? options.depthMeters ?? 0,
    timeSeconds: options.timeSeconds ?? 0,
    interpolationProfileId: options.interpolationProfileId ?? 'bilinearHorizontalV1'
  });
  return withContext(sample, context, 'scalar');
}

export function sampleVectorAtPhysicalPoint(options = {}) {
  const context = fieldSamplingContext(options, options.role ?? 'current');
  const sample = sampleVectorFieldContinuous({
    ...options,
    field: options.field,
    x: context.sample.x,
    y: context.sample.y,
    depthMeters: options.point?.depthMeters ?? options.depthMeters ?? 0,
    timeSeconds: options.timeSeconds ?? 0,
    interpolationProfileId: options.interpolationProfileId ?? 'bilinearHorizontalV1'
  });
  return withContext(sample, context, 'vector');
}

export function sampleMaskAtPhysicalPoint(options = {}) {
  const context = fieldSamplingContext(options, options.role ?? 'terrain');
  const sample = sampleMaskFieldContinuous({
    ...options,
    field: options.field,
    x: context.sample.x,
    y: context.sample.y,
    threshold: options.threshold ?? 0.5,
    interpolationProfileId: 'legacyNearestCellV1'
  });
  return withContext(sample, context, 'mask');
}

export function sampleBathymetryAtPhysicalPoint(options = {}) {
  const context = fieldSamplingContext(options, options.role ?? 'terrain');
  const sample = sampleBathymetryContinuous({
    ...options,
    field: options.field,
    x: context.sample.x,
    y: context.sample.y,
    interpolationProfileId: 'bilinearHorizontalV1'
  });
  return withContext(sample, context, 'bathymetry');
}

export function multiResolutionSamplerSummary(options = {}) {
  const domain = normalizeOperationalDomainSpec(options.domain ?? options.operationalDomain, { grid: options.grid });
  const profile = normalizeMissionResolutionProfile(options.profile ?? options.resolutionProfile ?? {});
  return {
    type: 'anchor.world.multi-resolution-sampler-summary',
    version: MULTI_RESOLUTION_FIELD_SAMPLER_VERSION,
    domainId: domain.domainId,
    profileId: profile.profileId,
    grids: {
      planning: resolutionGridForRole(profile, 'planning'),
      terrain: resolutionGridForRole(profile, 'terrain'),
      science: resolutionGridForRole(profile, 'science'),
      current: resolutionGridForRole(profile, 'current')
    },
    samplerCoordinateFrame: domain.coordinateFrame,
    interpolationProfiles: ['legacyNearestCellV1', 'bilinearHorizontalV1', 'trilinearVolumeV1', 'quadrilinearTimeVolumeV1'],
    ownsSimulation: false,
    ownsScoring: false,
    calibratedOceanForecast: false
  };
}

function fieldSamplingContext(options = {}, role = 'science') {
  const domain = normalizeOperationalDomainSpec(options.domain ?? options.operationalDomain, { grid: options.grid });
  const profile = normalizeMissionResolutionProfile(options.profile ?? options.resolutionProfile ?? {});
  const grid = options.fieldGrid ?? resolutionGridForRole(profile, role);
  const point = options.point ?? options.physicalPoint ?? {
    eastMeters: options.eastMeters,
    northMeters: options.northMeters,
    depthMeters: options.depthMeters
  };
  const sample = physicalPointToRoleSample(point, domain, { ...profile, [gridKeyForRole(role)]: grid }, role, { clamp: options.clamp !== false });
  return { domain, profile, role, grid, point, sample };
}

function gridKeyForRole(role) {
  if (role === 'terrain' || role === 'bathymetry' || role === 'mask') return 'terrainGrid';
  if (role === 'current' || role === 'vector' || role === 'flow') return 'currentGrid';
  if (role === 'planning') return 'planningLattice';
  return 'scienceGrid';
}

function withContext(sample = {}, context = {}, fieldType) {
  return {
    ...sample,
    type: 'anchor.world.multi-resolution-field-sample',
    version: MULTI_RESOLUTION_FIELD_SAMPLER_VERSION,
    fieldType,
    role: context.role,
    physicalPoint: context.point,
    uv: context.sample.uv,
    sourceGrid: context.grid,
    sourceGridCoordinate: { x: context.sample.x, y: context.sample.y, col: context.sample.col, row: context.sample.row },
    containingCell: context.sample.containingCell,
    domainId: context.domain.domainId,
    resolutionProfileId: context.profile.profileId,
    interpolationDelegatedTo: sample.version ?? null,
    valid: sample.valid !== false && context.sample.inside !== false
  };
}
