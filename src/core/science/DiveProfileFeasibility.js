import { createDiveProfileSequence, normalizeDiveProfile } from './DiveProfileModel.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  waterColumnLayerMetadata
} from './WaterColumnSchema.js';

export const DIVE_PROFILE_FEASIBILITY_VERSION = 'dive-profile-feasibility-three-r1-2a-2';

export function assessDiveProfileFeasibility(options = {}) {
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options);
  const requestedProfileId = options.requestedProfileId ?? options.diveProfileId ?? options.profileId ?? config.diveProfileId;
  const profile = normalizeDiveProfile(requestedProfileId, config);
  const sequence = createDiveProfileSequence(profile, config, { sampleCount: Math.max(8, profile.samplesPerCycle * 2) });
  const hardErrors = [];
  const warnings = [];
  const requestedTargetLayerId = options.requestedTargetLayerId
    ? normalizeWaterColumnLayerId(options.requestedTargetLayerId, config.depthLayerIds.at(-1) ?? 'surface')
    : null;
  const targetDepthMeters = requestedTargetLayerId ? layerDepth(requestedTargetLayerId) : null;
  const profileMaximumDepthMeters = finitePositive(options.profileMaximumDepthMeters, maxDepth(sequence));
  const requestedMaximumDepthMeters = finitePositive(
    options.requestedMaximumDepthMeters ?? options.maximumDiveDepthMeters,
    Math.max(profileMaximumDepthMeters, targetDepthMeters ?? 0)
  );
  const segmentHorizontalDistance = finiteNonNegative(
    options.segmentHorizontalDistanceMeters ?? options.segmentHorizontalDistance ?? distanceBetween(options.start, options.end),
    0
  );
  const segmentDurationAvailable = finitePositive(
    options.segmentDurationAvailableSeconds ?? options.segmentDurationAvailable,
    Infinity
  );
  const missionTimeRemaining = finitePositive(options.missionTimeRemainingSeconds ?? options.missionTimeRemaining, Infinity);
  const horizontalMetersPerVerticalMeter = finitePositive(options.horizontalMetersPerVerticalMeter, 6);
  const descentRate = finitePositive(options.descentRateMetersPerSecond, 0.25);
  const ascentRate = finitePositive(options.ascentRateMetersPerSecond, 0.25);
  const bottomTurnDuration = finiteNonNegative(options.bottomTurnDurationSeconds ?? options.bottomTurnDuration, 0);
  const vehicleDepthRating = finitePositive(options.vehicleMaxDepthMeters ?? options.vehicleDepthRatingMeters, Infinity);
  const bottomDepthMeters = finitePositive(options.bottomDepthMeters ?? sampleBottomDepth(options.level, options.position ?? options.end ?? options.start), Infinity);
  const requiredBottomClearanceMeters = finiteNonNegative(options.requiredBottomClearanceMeters, 5);
  const availableBottomClearanceMeters = Number.isFinite(bottomDepthMeters) ? bottomDepthMeters - requestedMaximumDepthMeters : Infinity;
  const energyAvailable = finitePositive(options.energyAvailable ?? options.energyRemaining, Infinity);
  const energyPerDistance = finiteNonNegative(options.energyPerDistance, 0.001);
  const verticalEnergyPerMeter = finiteNonNegative(options.verticalEnergyPerMeter, 0.015);

  const factors = [
    factor('segmentLength', segmentHorizontalDistance > 0 ? segmentHorizontalDistance / horizontalMetersPerVerticalMeter : 0),
    factor('segmentDuration', durationLimitedDepth(segmentDurationAvailable, descentRate, ascentRate, bottomTurnDuration)),
    factor('missionTimeRemaining', durationLimitedDepth(missionTimeRemaining, descentRate, ascentRate, bottomTurnDuration)),
    factor('vehicleDepthRating', vehicleDepthRating),
    factor('profileMaximumDepth', profileMaximumDepthMeters),
    factor('localBathymetry', Number.isFinite(bottomDepthMeters) ? bottomDepthMeters : Infinity),
    factor('bottomClearance', Number.isFinite(bottomDepthMeters) ? bottomDepthMeters - requiredBottomClearanceMeters : Infinity),
    factor('energy', energyLimitedDepth(energyAvailable, segmentHorizontalDistance, energyPerDistance, verticalEnergyPerMeter))
  ];

  if (!profile.sequence.length) hardErrors.push('Dive profile has no reachable depth-layer sequence.');
  if (Number.isFinite(bottomDepthMeters) && bottomDepthMeters <= requiredBottomClearanceMeters) hardErrors.push('Local bathymetry leaves no required bottom clearance.');
  if (Number.isFinite(vehicleDepthRating) && vehicleDepthRating <= 0) hardErrors.push('Vehicle maximum depth rating is non-positive.');
  if (segmentHorizontalDistance <= 0) warnings.push('Segment length is zero, so only surface depth is reachable.');

  const limiting = minimumFactor(factors);
  const achievableMaximumDepthMeters = round(Math.max(0, Math.min(requestedMaximumDepthMeters, limiting.value)));
  const limitingFactor = achievableMaximumDepthMeters >= requestedMaximumDepthMeters - 1e-6 ? 'none' : limiting.name;
  const reachableLayerIds = config.depthLayerIds.filter((id) => layerDepth(id) <= achievableMaximumDepthMeters + 1e-6);
  const unreachableLayerIds = config.depthLayerIds.filter((id) => !reachableLayerIds.includes(id));
  if (requestedTargetLayerId && !reachableLayerIds.includes(requestedTargetLayerId)) {
    warnings.push(`Target layer ${requestedTargetLayerId} is not fully reachable on this segment.`);
  }
  if (limitingFactor === 'bottomClearance') warnings.push('Profile is limited by required bottom clearance.');
  if (limitingFactor === 'segmentLength') warnings.push('Additional horizontal distance would allow deeper profile coverage.');

  const descentDuration = round(achievableMaximumDepthMeters / descentRate);
  const ascentDuration = round(achievableMaximumDepthMeters / ascentRate);
  const energyEstimate = round(segmentHorizontalDistance * energyPerDistance + achievableMaximumDepthMeters * 2 * verticalEnergyPerMeter);
  if (Number.isFinite(energyAvailable) && energyEstimate > energyAvailable + 1e-6) hardErrors.push('Estimated profile energy exceeds available energy.');

  const result = {
    type: 'anchor.science.dive-profile-feasibility',
    version: DIVE_PROFILE_FEASIBILITY_VERSION,
    status: hardErrors.length ? 'infeasible' : warnings.length ? 'warning' : 'ok',
    segmentHorizontalDistance: round(segmentHorizontalDistance),
    segmentDurationAvailable: Number.isFinite(segmentDurationAvailable) ? round(segmentDurationAvailable) : null,
    requestedProfileId: profile.id,
    requestedMaximumDepthMeters: round(requestedMaximumDepthMeters),
    requestedTargetLayerId,
    achievableMaximumDepthMeters,
    limitingFactor,
    reachableLayerIds,
    unreachableLayerIds,
    descentDuration,
    bottomTurnDuration: round(bottomTurnDuration),
    ascentDuration,
    bottomDepthMeters: Number.isFinite(bottomDepthMeters) ? round(bottomDepthMeters) : null,
    requiredBottomClearanceMeters: round(requiredBottomClearanceMeters),
    availableBottomClearanceMeters: Number.isFinite(availableBottomClearanceMeters) ? round(availableBottomClearanceMeters) : null,
    energyEstimate,
    factorLimits: Object.fromEntries(factors.map((entry) => [entry.name, Number.isFinite(entry.value) ? round(entry.value) : null])),
    hardErrors,
    warnings,
    publicSafe: true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesFull3DPlanning: false,
    syntheticTeachingModel: true,
    calibratedOceanForecast: false
  };
  return result;
}

export function diveProfileFeasibilitySummary(result = {}) {
  const source = result.type === 'anchor.science.dive-profile-feasibility' ? result : assessDiveProfileFeasibility(result);
  return {
    type: 'anchor.science.dive-profile-feasibility-summary',
    version: DIVE_PROFILE_FEASIBILITY_VERSION,
    status: source.status,
    requestedProfileId: source.requestedProfileId,
    requestedTargetLayerId: source.requestedTargetLayerId,
    requestedMaximumDepthMeters: source.requestedMaximumDepthMeters,
    achievableMaximumDepthMeters: source.achievableMaximumDepthMeters,
    limitingFactor: source.limitingFactor,
    reachableLayerIds: source.reachableLayerIds ?? [],
    unreachableLayerIds: source.unreachableLayerIds ?? [],
    warnings: source.warnings ?? [],
    hardErrors: source.hardErrors ?? [],
    usesFull3DPlanning: false,
    publicSafe: true
  };
}

function factor(name, value) {
  const numeric = Number(value);
  return { name, value: Number.isFinite(numeric) ? Math.max(0, numeric) : Infinity };
}

function minimumFactor(factors) {
  return factors.reduce((best, entry) => entry.value < best.value ? entry : best, factor('none', Infinity));
}

function durationLimitedDepth(duration, descentRate, ascentRate, bottomTurnDuration) {
  if (!Number.isFinite(duration)) return Infinity;
  const available = Math.max(0, duration - bottomTurnDuration);
  return available / ((1 / descentRate) + (1 / ascentRate));
}

function energyLimitedDepth(energyAvailable, segmentHorizontalDistance, energyPerDistance, verticalEnergyPerMeter) {
  if (!Number.isFinite(energyAvailable) || verticalEnergyPerMeter <= 0) return Infinity;
  const horizontalCost = segmentHorizontalDistance * energyPerDistance;
  return Math.max(0, (energyAvailable - horizontalCost) / (2 * verticalEnergyPerMeter));
}

function sampleBottomDepth(level = null, position = null) {
  if (!level || !position) return Infinity;
  const x = Math.max(0, Math.round(Number(position.x ?? position.col ?? 0)));
  const y = Math.max(0, Math.round(Number(position.y ?? position.row ?? 0)));
  const depth = level.layers?.depthMeters?.[y]?.[x] ?? level.bathymetry?.depthMeters?.[y]?.[x] ?? level.layers?.depth?.[y]?.[x];
  const numeric = Number(depth);
  if (!Number.isFinite(numeric)) return Infinity;
  return numeric <= 2 ? 20 + numeric * 220 : numeric;
}

function distanceBetween(a = null, b = null) {
  if (!a || !b) return 0;
  const dx = Number(b.x ?? b.col ?? 0) - Number(a.x ?? a.col ?? 0);
  const dy = Number(b.y ?? b.row ?? 0) - Number(a.y ?? a.row ?? 0);
  return Number.isFinite(dx) && Number.isFinite(dy) ? Math.hypot(dx, dy) : 0;
}

function maxDepth(sequence = []) {
  return Math.max(0, ...sequence.map((entry) => Number(entry.depthMeters)).filter(Number.isFinite));
}

function layerDepth(layerId) {
  return Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
}

function finitePositive(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function finiteNonNegative(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
