import { normalizeOperationalDomainSpec } from './OperationalDomainSpec.js';
import { normalizeMissionResolutionProfile } from './MissionResolutionProfile.js';
import { gridCellToPhysicalPoint } from './OperationalDomainCoordinates.js';

export const MISSION_SCALE_MODEL_VERSION = 'mission-scale-model-world-r1';

export function createMissionScaleModel(options = {}) {
  const domain = normalizeOperationalDomainSpec(options.domain ?? options.operationalDomain, { grid: options.grid });
  const profile = normalizeMissionResolutionProfile(options.profile ?? options.resolutionProfile ?? {});
  const glider = {
    nominalSpeedMetersPerSecond: Math.max(0.01, finite(options.glider?.nominalSpeedMetersPerSecond ?? options.glider?.speedMetersPerSecond ?? options.nominalSpeedMetersPerSecond, 0.35)),
    energyPerMeter: Math.max(0, finite(options.glider?.energyPerMeter ?? options.energyPerMeter, 0.001)),
    enduranceSeconds: Math.max(0, finite(options.glider?.enduranceSeconds ?? options.enduranceSeconds, domain.time.durationSeconds))
  };
  return {
    type: 'anchor.world.mission-scale-model',
    version: MISSION_SCALE_MODEL_VERSION,
    domain,
    resolutionProfile: profile,
    glider,
    boundaryFlags: {
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false,
      estimatesOnly: true,
      calibratedVehicleController: false
    }
  };
}

export function missionPointToPhysicalPoint(point = {}, scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  if (Number.isFinite(Number(point.eastMeters)) && Number.isFinite(Number(point.northMeters))) {
    return {
      eastMeters: Number(point.eastMeters),
      northMeters: Number(point.northMeters),
      depthMeters: Math.max(0, finite(point.depthMeters, 0)),
      coordinateFrame: model.domain.coordinateFrame
    };
  }
  return gridCellToPhysicalPoint(point, model.domain, model.resolutionProfile.planningLattice);
}

export function distanceMetersBetweenMissionPoints(a = {}, b = {}, scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  const pa = missionPointToPhysicalPoint(a, model);
  const pb = missionPointToPhysicalPoint(b, model);
  const dz = finite(pb.depthMeters, 0) - finite(pa.depthMeters, 0);
  return round(Math.hypot(pb.eastMeters - pa.eastMeters, pb.northMeters - pa.northMeters, dz));
}

export function estimateSegmentDurationSeconds(a = {}, b = {}, scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  return round(distanceMetersBetweenMissionPoints(a, b, model) / model.glider.nominalSpeedMetersPerSecond);
}

export function estimateRouteScale(routePoints = [], scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  let distanceMeters = 0;
  for (let index = 1; index < routePoints.length; index += 1) {
    distanceMeters += distanceMetersBetweenMissionPoints(routePoints[index - 1], routePoints[index], model);
  }
  const durationSeconds = distanceMeters / model.glider.nominalSpeedMetersPerSecond;
  return {
    type: 'anchor.world.route-scale-estimate',
    version: MISSION_SCALE_MODEL_VERSION,
    pointCount: routePoints.length,
    distanceMeters: round(distanceMeters),
    distanceKm: round(distanceMeters / 1000, 3),
    estimatedDurationSeconds: round(durationSeconds),
    estimatedDurationHours: round(durationSeconds / 3600, 3),
    estimatedEnergy: round(distanceMeters * model.glider.energyPerMeter),
    estimatesOnly: true,
    ownsSimulation: false,
    ownsScoring: false
  };
}

export function missionScaleModelSummary(scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  const planningCellWidthMeters = model.domain.horizontal.widthMeters / Math.max(1, model.resolutionProfile.planningLattice.columns);
  const planningCellHeightMeters = model.domain.horizontal.heightMeters / Math.max(1, model.resolutionProfile.planningLattice.rows);
  return {
    type: 'anchor.world.mission-scale-model-summary',
    version: MISSION_SCALE_MODEL_VERSION,
    domainId: model.domain.domainId,
    profileId: model.resolutionProfile.profileId,
    domainWidthKm: round(model.domain.horizontal.widthMeters / 1000, 3),
    domainHeightKm: round(model.domain.horizontal.heightMeters / 1000, 3),
    planningLattice: { ...model.resolutionProfile.planningLattice },
    planningCellWidthMeters: round(planningCellWidthMeters),
    planningCellHeightMeters: round(planningCellHeightMeters),
    gliderNominalSpeedMetersPerSecond: model.glider.nominalSpeedMetersPerSecond,
    calibratedVehicleController: false,
    estimatesOnly: true
  };
}

export function validateMissionScaleModel(scaleModel = {}) {
  const model = normalizeScaleModel(scaleModel);
  const errors = [];
  if (model.boundaryFlags?.ownsSimulation) errors.push('Mission scale model must not own simulation.');
  if (model.boundaryFlags?.ownsScoring) errors.push('Mission scale model must not own scoring.');
  if (model.glider.nominalSpeedMetersPerSecond <= 0) errors.push('Glider nominal speed must be positive.');
  if (model.domain.horizontal.widthMeters <= 0 || model.domain.horizontal.heightMeters <= 0) errors.push('Domain extents must be positive.');
  return { valid: errors.length === 0, errors, model };
}

function normalizeScaleModel(scaleModel = {}) {
  if (scaleModel.type === 'anchor.world.mission-scale-model') return scaleModel;
  return createMissionScaleModel(scaleModel);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
