import { continuousPointToContainingCell, normalizeContinuousMissionPoint } from '../geometry/ContinuousMissionCoordinates.js';
import { buildBottomBoundaryViewModel } from '../rendering/BottomBoundaryViewModel.js';
import { buildPlannedDiveSegmentViewModel } from '../rendering/PlannedDiveSegmentViewModel.js';
import { normalizeContinuousScienceTarget } from '../science/ContinuousScienceTarget.js';
import { getSelectedStart, isValidSelectedStart, requiresDeploymentSelection } from '../deployment/DeploymentZones.js';
import { getTimeConfig } from '../time/MissionTime.js';
import { sampleContinuousRouteSegment, closestPointOnContinuousSegment } from './ContinuousRouteGeometry.js';
import { buildRouteSegmentsForAgent } from './RouteSegmentBuilder.js';
import { estimateSegmentBeachingRisk } from './ShorelineRisk.js';
import { isCellNavigable } from './Navigability.js';

export const TERRAIN_AWARE_MISSION_VALIDATION_VERSION = 'terrain-aware-mission-validation-three-r1-2c';
export const TERRAIN_AWARE_MISSION_STATUS = Object.freeze({ VALID: 'VALID', VALID_WITH_WARNINGS: 'VALID_WITH_WARNINGS', INVALID: 'INVALID' });
export const TERRAIN_AWARE_ISSUE_SEVERITY = Object.freeze({ HARD_ERROR: 'HARD_ERROR', WARNING: 'WARNING', ADVISORY: 'ADVISORY' });
export const TERRAIN_AWARE_ISSUE_CODES = Object.freeze([
  'OUTSIDE_DOMAIN','LAND_SURFACE_WAYPOINT','INVALID_DEPLOYMENT','BLOCKED_DEPLOYMENT_ZONE',
  'SEGMENT_LAND_INTERSECTION','SEGMENT_COASTLINE_CROSSING','SEGMENT_BLOCKED_REGION_INTERSECTION','ROUTE_CORRIDOR_SHORELINE_RISK',
  'CURRENT_BEACHING_RISK','HIGH_CROSS_CURRENT','LOW_CURRENT_CONFIDENCE','BOTTOM_CLEARANCE_VIOLATION','LOW_BOTTOM_CLEARANCE',
  'BATHYMETRY_LIMITED_PROFILE','VEHICLE_DEPTH_LIMIT','PROFILE_DEPTH_LIMIT','TARGET_INSIDE_LAND','TARGET_BELOW_SEABED',
  'TARGET_PARTIAL_SEABED_INTERSECTION','TARGET_CLEARANCE_LOW','TARGET_UNREACHABLE','TARGET_PARTIALLY_COVERED','TARGET_CROSSED_WITHOUT_SAMPLE',
  'MISSION_TIME_OVERRUN','SURFACING_WINDOW_OVERRUN','LOW_ENERGY_MARGIN','ENERGY_INFEASIBLE','NO_VALID_START','NO_EXECUTABLE_WAYPOINTS','INVALID_DIVE_PROFILE'
]);

const LOW_CLEARANCE_METERS = 12;
const REQUIRED_CLEARANCE_METERS = 5;
const NEAR_SHORE_CELLS = 1.25;

export function buildTerrainAwareMissionValidationReport(options = {}) {
  return validateTerrainAwareMissionPlan(options);
}

export function validateTerrainAwareMissionPlan(options = {}) {
  const level = options.level ?? options.scenario ?? null;
  const mission = options.mission ?? null;
  const plan = options.plan ?? null;
  const gameState = options.gameState ?? options.appState ?? null;
  const bottomBoundary = normalizeBottomBoundary(options.bottomBoundary, level);
  const agentReports = [];
  const segmentReports = [];
  const targetReports = [];
  const allIssues = [];
  for (const agent of mission?.agents ?? []) {
    const agentId = agent.id ?? agent.agentId;
    const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agentId) ?? { agentId, waypoints: [] };
    const agentIssues = [];
    const startReport = validateAgentStart({ level, mission, plan, agent, agentPlan, bottomBoundary });
    agentIssues.push(...startReport.issues);
    const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan, surfacedAgents: gameState?.surfacedAgents, planningAnchor: gameState?.ui?.planningAnchor });
    if ((agentPlan.waypoints ?? []).length === 0) {
      agentIssues.push(issue({
        code: 'NO_EXECUTABLE_WAYPOINTS',
        severity: isRouteRequired(mission, agent, agentPlan) ? 'HARD_ERROR' : 'ADVISORY',
        message: isRouteRequired(mission, agent, agentPlan) ? `${agent.label ?? agentId} needs at least one executable waypoint.` : `${agent.label ?? agentId} has no executable waypoints; it will remain idle unless a route is added.`,
        agentId,
        position: startReport.position,
        repairHints: ['Add a surface waypoint for this glider or mark the agent as optional.']
      }));
    }
    for (const [segmentIndex, segment] of (route.segments ?? []).entries()) {
      const report = validateTerrainAwareRouteSegment({ ...options, level, mission, plan, agent, agentPlan, segment, segmentIndex, bottomBoundary });
      segmentReports.push(report);
      agentIssues.push(...report.hardErrors, ...report.warnings, ...report.advisories);
    }
    const hardErrors = agentIssues.filter(severityIs('HARD_ERROR'));
    const warnings = agentIssues.filter(severityIs('WARNING'));
    const advisories = agentIssues.filter(severityIs('ADVISORY'));
    allIssues.push(...agentIssues);
    agentReports.push({
      agentId,
      agentLabel: agent.label ?? agent.name ?? agentId,
      status: statusFor(hardErrors, warnings),
      executable: hardErrors.length === 0,
      startReport,
      routePointCount: agentPlan.waypoints?.length ?? 0,
      segmentCount: route.segments?.length ?? 0,
      hardErrors,
      warnings,
      advisories,
      summary: { hardErrorCount: hardErrors.length, warningCount: warnings.length, advisoryCount: advisories.length }
    });
  }
  for (const target of plan?.scienceTargets ?? plan?.samplingTargets ?? []) {
    const report = validateTerrainAwareSamplingTarget({ ...options, level, mission, plan, target, segmentReports, bottomBoundary, required: isRequiredTarget(target, mission) });
    targetReports.push(report);
    allIssues.push(...report.hardErrors, ...report.warnings, ...report.advisories);
  }
  const hardErrors = allIssues.filter(severityIs('HARD_ERROR'));
  const warnings = allIssues.filter(severityIs('WARNING'));
  const advisories = allIssues.filter(severityIs('ADVISORY'));
  const report = {
    type: 'anchor.validation.terrain-aware-mission',
    version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION,
    missionId: mission?.missionId ?? plan?.missionId ?? null,
    scenarioId: level?.levelId ?? level?.scenarioId ?? plan?.levelId ?? null,
    levelId: level?.levelId ?? null,
    planDigest: stableDigest(publicPlanDigestInput(plan)),
    terrainSourceDigest: level?.bathymetry?.sourceDigest ?? stableDigest({ depth: bottomBoundary.bottomDepthField, land: bottomBoundary.landMask }),
    status: statusFor(hardErrors, warnings),
    executable: hardErrors.length === 0,
    agentReports,
    segmentReports,
    targetReports,
    hardErrors,
    warnings,
    advisories,
    summary: {},
    boundaryFlags: validationBoundaryFlags(),
    deterministic: true,
    publicSafe: true,
    containsHiddenTruth: false
  };
  report.summary = missionSummary(report);
  return report;
}

export function validateTerrainAwareAgentRoute(options = {}) {
  const level = options.level ?? null;
  const mission = options.mission ?? null;
  const agent = options.agent ?? mission?.agents?.find((candidate) => candidate.id === options.agentId) ?? null;
  const agentPlan = options.agentPlan ?? options.plan?.agentPlans?.find((candidate) => candidate.agentId === (agent?.id ?? options.agentId)) ?? { agentId: agent?.id ?? options.agentId, waypoints: [] };
  const route = buildRouteSegmentsForAgent({ level, mission, agent, agentPlan, surfacedAgents: options.gameState?.surfacedAgents, planningAnchor: options.gameState?.ui?.planningAnchor });
  const segmentReports = (route.segments ?? []).map((segment, segmentIndex) => validateTerrainAwareRouteSegment({ ...options, level, mission, agent, agentPlan, segment, segmentIndex }));
  const issues = segmentReports.flatMap((report) => [...report.hardErrors, ...report.warnings, ...report.advisories]);
  const hardErrors = issues.filter(severityIs('HARD_ERROR'));
  const warnings = issues.filter(severityIs('WARNING'));
  return { type: 'anchor.validation.terrain-aware-agent-route', version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION, agentId: agent?.id ?? options.agentId ?? null, status: statusFor(hardErrors, warnings), executable: hardErrors.length === 0, segmentReports, hardErrors, warnings, advisories: issues.filter(severityIs('ADVISORY')) };
}

export function validateTerrainAwareSurfaceWaypoint(options = {}) {
  const level = options.level ?? null;
  const mission = options.mission ?? null;
  const bottomBoundary = normalizeBottomBoundary(options.bottomBoundary, level);
  const point = normalizeContinuousMissionPoint(options.position ?? options.waypoint ?? options.candidate ?? options, { level, grid: bottomBoundary });
  const containingCell = continuousPointToContainingCell(point, { level, grid: bottomBoundary });
  const hardErrors = [];
  const warnings = [];
  const advisories = [];
  const outside = !insideDomain(point, bottomBoundary);
  const nav = outside ? { ok: false, reason: 'outsideMap' } : isCellNavigable(level, mission, containingCell.col, containingCell.row);
  const localBottomDepthMeters = outside ? null : sampleBottomDepth(bottomBoundary, point.x, point.y);
  const land = !outside && (isLandCell(bottomBoundary, containingCell.col, containingCell.row) || nav.reason === 'terrain' || Number(localBottomDepthMeters ?? 0) <= 0);
  const water = !outside && !land && nav.ok === true;
  const nearestCoastlineDistance = outside ? null : nearestCoastlineDistanceCells(bottomBoundary, point.x, point.y);
  const agentId = options.agentId ?? options.agent?.id ?? null;
  const waypointId = options.waypoint?.id ?? options.waypointId ?? null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || outside) {
    hardErrors.push(issue({ code: 'OUTSIDE_DOMAIN', severity: 'HARD_ERROR', message: 'Surface waypoint must be inside the mission terrain domain.', agentId, waypointId, position: pos(point), observedValue: pos(point), requiredValue: 'inside grid', units: 'grid-cells', repairHints: ['Move the waypoint inside the mission terrain grid.'] }));
  } else if (land || nav.ok === false) {
    hardErrors.push(issue({ code: 'LAND_SURFACE_WAYPOINT', severity: 'HARD_ERROR', message: `Surface waypoint must be in navigable water, not ${nav.reason === 'tooShallow' ? 'too-shallow water' : 'land'}.`, agentId, waypointId, position: pos(point), observedValue: roundOrNull(localBottomDepthMeters), requiredValue: '> 0', units: 'meters', repairHints: ['Move the waypoint farther offshore.'] }));
  }
  if (water && Number.isFinite(nearestCoastlineDistance) && nearestCoastlineDistance <= NEAR_SHORE_CELLS) {
    warnings.push(issue({ code: 'ROUTE_CORRIDOR_SHORELINE_RISK', severity: 'WARNING', message: 'Surface waypoint is close to coastline; inspect corridor and current drift.', agentId, waypointId, position: pos(point), observedValue: round(nearestCoastlineDistance), requiredValue: `> ${NEAR_SHORE_CELLS}`, units: 'grid-cells', repairHints: ['Move the waypoint farther offshore if this warning is not intentional.'] }));
  }
  if (!outside && hazardAt(level, containingCell.col, containingCell.row)) {
    warnings.push(issue({ code: 'SEGMENT_BLOCKED_REGION_INTERSECTION', severity: 'WARNING', message: 'Surface waypoint is inside a hazard cell.', agentId, waypointId, position: pos(point), repairHints: ['Move the waypoint outside the hazard cell if possible.'] }));
  }
  if ((options.checkDeployment || options.role === 'deployment') && requiresDeploymentSelection(mission, agentId)) {
    const deployment = isValidSelectedStart(level, mission, agentId, point);
    if (!deployment.valid) hardErrors.push(issue({ code: deployment.reason === 'blocked' ? 'BLOCKED_DEPLOYMENT_ZONE' : 'INVALID_DEPLOYMENT', severity: 'HARD_ERROR', message: deployment.message ?? 'Deployment must use a valid water cell inside a deployment zone.', agentId, position: pos(point), repairHints: ['Choose a highlighted deployment-zone water cell.'] }));
  }
  return {
    type: 'anchor.validation.terrain-aware-surface-waypoint',
    version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION,
    status: statusFor(hardErrors, warnings),
    accepted: hardErrors.length === 0,
    position: pos(point),
    containingCell: cellPos(containingCell),
    land,
    water,
    localBottomDepthMeters: roundOrNull(localBottomDepthMeters),
    nearestCoastlineDistance: roundOrNull(nearestCoastlineDistance),
    shorelineRisk: shorelineRisk(nearestCoastlineDistance, point),
    hardErrors,
    warnings,
    advisories
  };
}

export function validateTerrainAwareRouteSegment(options = {}) {
  const level = options.level ?? null;
  const mission = options.mission ?? null;
  const agent = options.agent ?? null;
  const agentPlan = options.agentPlan ?? null;
  const bottomBoundary = normalizeBottomBoundary(options.bottomBoundary, level);
  const segment = options.segment ?? { from: options.from, to: options.to };
  const segmentId = idForSegment(segment, options.segmentIndex);
  const sampled = sampleContinuousRouteSegment({ from: segment.from, to: segment.to }, { level, grid: bottomBoundary, maxSpacingCells: options.maxSpacingCells ?? 0.18, maximumSamples: options.maximumSamples ?? 4096 });
  const hardErrors = [];
  const warnings = [];
  const advisories = [];
  const landSamples = [];
  const blockedSamples = [];
  const hazardSamples = [];
  const coastlineSamples = [];
  const depths = [];
  let coastCrossings = 0;
  let lastLand = null;
  let minCoastDistance = Infinity;
  for (const sample of sampled.samples) {
    const cell = sample.containingCell;
    const outside = !insideDomain(sample, bottomBoundary);
    const nav = outside ? { ok: false, reason: 'outsideMap' } : isCellNavigable(level, mission, cell.col, cell.row);
    const land = outside || isLandCell(bottomBoundary, cell.col, cell.row) || nav.ok === false;
    if (lastLand !== null && land !== lastLand) coastCrossings += 1;
    lastLand = land;
    if (land) landSamples.push(sample);
    if (outside || restrictedAt(level, sample, cell)) blockedSamples.push(sample);
    if (hazardAt(level, cell.col, cell.row)) hazardSamples.push(sample);
    if (bottomBoundary.coastlineMask?.[cell.row]?.[cell.col]) coastlineSamples.push(sample);
    const depth = sampleBottomDepth(bottomBoundary, sample.x, sample.y);
    if (Number.isFinite(depth)) depths.push(depth);
    const coast = nearestCoastlineDistanceCells(bottomBoundary, sample.x, sample.y);
    if (Number.isFinite(coast)) minCoastDistance = Math.min(minCoastDistance, coast);
  }
  const dive = diveDiagnostics({ level, mission, agent, agentPlan, segment, segmentIndex: options.segmentIndex, bottomBoundary });
  const currentRisk = currentRiskDiagnostic({ level, frame: options.frame, segment, segmentId, minCoastDistance });
  const corridor = routeCorridorDiagnostic({ level, mission, segment, segmentId, samples: sampled.samples, bottomBoundary, minCoastDistance, currentRisk });
  const firstLand = landSamples[0];
  if (landSamples.length) hardErrors.push(issue({ code: 'SEGMENT_LAND_INTERSECTION', severity: 'HARD_ERROR', message: `Route segment intersects land at ${landSamples.length} sampled position(s).`, agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(firstLand), observedValue: landSamples.length, requiredValue: 0, units: 'sampled-points', repairHints: ['Move the waypoint so the surface segment stays offshore.'] }));
  if (blockedSamples.length) hardErrors.push(issue({ code: 'SEGMENT_BLOCKED_REGION_INTERSECTION', severity: 'HARD_ERROR', message: `Route segment crosses ${blockedSamples.length} blocked or restricted sampled position(s).`, agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(blockedSamples[0]), observedValue: blockedSamples.length, requiredValue: 0, units: 'sampled-points', repairHints: ['Route around restricted cells or choose a different surface waypoint.'] }));
  if (coastCrossings > 0 || (coastlineSamples.length && !landSamples.length)) warnings.push(issue({ code: 'SEGMENT_COASTLINE_CROSSING', severity: 'WARNING', message: 'Route segment touches coastline-adjacent cells; review route corridor and current drift.', agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(coastlineSamples[0] ?? firstLand ?? segment.to), observedValue: coastCrossings || coastlineSamples.length, requiredValue: 0, units: 'coastline-samples', repairHints: ['Move the segment farther offshore if this warning is not intentional.'] }));
  if (hazardSamples.length) warnings.push(issue({ code: 'SEGMENT_BLOCKED_REGION_INTERSECTION', severity: 'WARNING', message: `Route segment passes through ${hazardSamples.length} hazard sampled position(s).`, agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, position: pos(hazardSamples[0]), observedValue: hazardSamples.length, requiredValue: 0, units: 'sampled-points', repairHints: ['Route around hazard cells if possible.'] }));
  warnings.push(...corridor.warnings, ...currentRisk.issues);
  if (dive.minimumPredictedClearanceMeters != null && dive.minimumPredictedClearanceMeters < 0) hardErrors.push(issue({ code: 'BOTTOM_CLEARANCE_VIOLATION', severity: 'HARD_ERROR', message: 'Predicted dive path penetrates the canonical seabed.', agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, position: pos(dive.minimumClearancePoint ?? segment.to), observedValue: dive.minimumPredictedClearanceMeters, requiredValue: 0, units: 'meters', repairHints: ['Reduce requested maximum depth.', 'Choose a shallower profile.', 'Move over deeper water.'] }));
  else if (dive.minimumPredictedClearanceMeters != null && dive.minimumPredictedClearanceMeters < LOW_CLEARANCE_METERS) warnings.push(issue({ code: 'LOW_BOTTOM_CLEARANCE', severity: 'WARNING', message: 'Predicted dive path has low bottom clearance.', agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, position: pos(dive.minimumClearancePoint ?? segment.to), observedValue: dive.minimumPredictedClearanceMeters, requiredValue: LOW_CLEARANCE_METERS, units: 'meters', repairHints: ['Choose a shallower profile or move over deeper water.'] }));
  if (dive.bathymetryLimitedProfile) warnings.push(issue({ code: 'BATHYMETRY_LIMITED_PROFILE', severity: 'WARNING', message: `Requested depth ${round(dive.requestedMaximumDepthMeters)} m is limited to ${round(dive.achievableMaximumDepthMeters)} m by bathymetry.`, agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, position: pos(dive.minimumClearancePoint ?? segment.to), observedValue: dive.achievableMaximumDepthMeters, requiredValue: dive.requestedMaximumDepthMeters, units: 'meters', repairHints: ['Reduce requested maximum depth or move over deeper bathymetry.'] }));
  addTimeEnergyIssues({ level, mission, agent, segment, segmentId, hardErrors, warnings });
  if (!hardErrors.length && !warnings.length && depths.length && Math.max(...depths) - Math.min(...depths) > 80) advisories.push(issue({ code: 'PROFILE_DEPTH_LIMIT', severity: 'ADVISORY', message: 'Route crosses a strong depth gradient; inspect profile clearance near the shelf break.', agentId: agent?.id ?? agentPlan?.agentId ?? null, segmentId, position: pos(sampled.samples[Math.floor(sampled.samples.length / 2)] ?? segment.to), repairHints: ['Review the side-profile camera for shelf-break clearance.'] }));
  return {
    type: 'anchor.validation.terrain-aware-route-segment',
    version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION,
    segmentId,
    agentId: agent?.id ?? agentPlan?.agentId ?? null,
    segmentIndex: Number.isFinite(Number(options.segmentIndex)) ? Number(options.segmentIndex) : null,
    from: pos(segment.from),
    to: pos(segment.to),
    status: statusFor(hardErrors, warnings),
    executable: hardErrors.length === 0,
    diagnostics: {
      centerlineSampleCount: sampled.sampleCount,
      adaptiveSubdivisionCount: Math.max(0, sampled.sampleCount - 2),
      minimumSampleSpacing: sampled.sampleCount > 1 ? round(sampled.lengthCells / Math.max(1, sampled.sampleCount - 1)) : null,
      maximumSampleSpacing: sampled.sampleCount > 1 ? round(sampled.lengthCells / Math.max(1, sampled.sampleCount - 1)) : null,
      landIntersectionCount: landSamples.length,
      coastlineCrossingCount: coastCrossings || coastlineSamples.length,
      blockedIntersectionCount: blockedSamples.length,
      minimumBottomDepthMeters: depths.length ? round(Math.min(...depths)) : null,
      minimumPredictedClearanceMeters: dive.minimumPredictedClearanceMeters,
      currentRisk: compactCurrentRisk(currentRisk),
      routeCorridor: compactCorridor(corridor),
      predictedDiveClearance: dive,
      sampledPositions: options.includeSampledPositions ? sampled.samples.map(compactSample) : compactSampleSet(sampled.samples)
    },
    corridorDiagnostic: compactCorridor(corridor),
    hardErrors,
    warnings,
    advisories
  };
}

export function validateTerrainAwareSamplingTarget(options = {}) {
  const level = options.level ?? null;
  const bottomBoundary = normalizeBottomBoundary(options.bottomBoundary, level);
  const target = normalizeContinuousScienceTarget(options.target ?? {});
  const samples = targetSamples(target, options);
  const sampleResults = samples.map((sample) => targetSampleValidity(sample, bottomBoundary));
  const centerValidity = sampleResults[0] ?? { valid: false, land: false, belowSeabed: false, clearanceMeters: null };
  const landCount = sampleResults.filter((sample) => sample.land || sample.outside).length;
  const belowCount = sampleResults.filter((sample) => sample.belowSeabed).length;
  const clearances = sampleResults.map((sample) => Number(sample.clearanceMeters)).filter(Number.isFinite);
  const minClearance = clearances.length ? Math.min(...clearances) : null;
  const validVolumeFraction = sampleResults.length ? sampleResults.filter((sample) => sample.valid).length / sampleResults.length : 0;
  const seabedIntersectionFraction = sampleResults.length ? belowCount / sampleResults.length : 0;
  const landIntersectionFraction = sampleResults.length ? landCount / sampleResults.length : 0;
  const coverageBySegment = targetCoverage(target, options.segmentReports ?? []);
  const reachableByAttachedSegments = coverageBySegment.some((coverage) => coverage.reachable);
  const attachedExpected = (target.attachedSegmentIds ?? []).length > 0;
  const hardErrors = [];
  const warnings = [];
  const advisories = [];
  if (centerValidity.land || centerValidity.outside) hardErrors.push(issue({ code: 'TARGET_INSIDE_LAND', severity: 'HARD_ERROR', message: 'Sampling target center must be in water, not land or outside the domain.', targetId: target.id, position: pos(target.position), repairHints: ['Move the target over water.'] }));
  if (centerValidity.belowSeabed) hardErrors.push(issue({ code: 'TARGET_BELOW_SEABED', severity: 'HARD_ERROR', message: 'Sampling target center is below the canonical seabed.', targetId: target.id, position: pos(target.position), observedValue: centerValidity.depthMeters, requiredValue: centerValidity.bottomDepthMeters, units: 'meters', repairHints: ['Choose a shallower target depth or move over deeper water.'] }));
  if (!centerValidity.belowSeabed && belowCount > 0) warnings.push(issue({ code: 'TARGET_PARTIAL_SEABED_INTERSECTION', severity: options.required ? 'HARD_ERROR' : 'WARNING', message: 'Sampling target volume partially intersects the seabed.', targetId: target.id, position: pos(target.position), observedValue: round(seabedIntersectionFraction), requiredValue: 0, units: 'fraction', repairHints: ['Reduce vertical target radius, choose a shallower interval, or move over deeper water.'] }));
  if (!centerValidity.land && landCount > 0) warnings.push(issue({ code: 'TARGET_INSIDE_LAND', severity: 'WARNING', message: 'Sampling target volume partially intersects land.', targetId: target.id, position: pos(target.position), observedValue: round(landIntersectionFraction), requiredValue: 0, units: 'fraction', repairHints: ['Move the target farther offshore or reduce horizontal radius.'] }));
  if (Number.isFinite(minClearance) && minClearance >= 0 && minClearance < LOW_CLEARANCE_METERS) warnings.push(issue({ code: 'TARGET_CLEARANCE_LOW', severity: 'WARNING', message: 'Sampling target has low clearance above the seabed.', targetId: target.id, position: pos(target.position), observedValue: round(minClearance), requiredValue: LOW_CLEARANCE_METERS, units: 'meters', repairHints: ['Move the target shallower or over deeper water.'] }));
  if (attachedExpected && !reachableByAttachedSegments) warnings.push(issue({ code: options.required ? 'TARGET_UNREACHABLE' : 'TARGET_PARTIALLY_COVERED', severity: options.required ? 'HARD_ERROR' : 'WARNING', message: options.required ? 'Required target is not reachable by attached route segments.' : 'Target is only partially covered or unreachable by attached route segments.', targetId: target.id, position: pos(target.position), observedValue: round(Math.max(0, ...coverageBySegment.map((coverage) => coverage.coverageFraction ?? 0))), requiredValue: target.minimumCoverage, units: 'coverage-fraction', repairHints: ['Attach the target to a nearby segment, extend the segment, or choose a deeper feasible profile.'] }));
  if (!attachedExpected) advisories.push(issue({ code: 'TARGET_CROSSED_WITHOUT_SAMPLE', severity: 'ADVISORY', message: 'Sampling target is not attached to a route segment; it remains a non-executable science objective.', targetId: target.id, position: pos(target.position), repairHints: ['Attach the target to a planned segment if it should be sampled.'] }));
  const promoted = warnings.filter(severityIs('HARD_ERROR'));
  const visibleWarnings = warnings.filter(severityIs('WARNING'));
  const allHardErrors = [...hardErrors, ...promoted];
  return {
    type: 'anchor.validation.terrain-aware-sampling-target',
    version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION,
    targetId: target.id,
    geometryType: target.geometryType,
    status: statusFor(allHardErrors, visibleWarnings),
    centerValidity,
    validVolumeFraction: round(validVolumeFraction),
    seabedIntersectionFraction: round(seabedIntersectionFraction),
    landIntersectionFraction: round(landIntersectionFraction),
    minimumClearanceMeters: roundOrNull(minClearance),
    reachableByAttachedSegments,
    coverageBySegment,
    hardErrors: allHardErrors,
    warnings: visibleWarnings,
    advisories
  };
}

export function validateTerrainAwareMissionValidationReport(report = {}) {
  const errors = [];
  const warnings = [];
  if (report.type !== 'anchor.validation.terrain-aware-mission') errors.push('Report type must be anchor.validation.terrain-aware-mission.');
  if (report.version !== TERRAIN_AWARE_MISSION_VALIDATION_VERSION) warnings.push('Report version differs from current terrain-aware validation version.');
  if (!['VALID', 'VALID_WITH_WARNINGS', 'INVALID'].includes(report.status)) errors.push('Report status must be VALID, VALID_WITH_WARNINGS, or INVALID.');
  if (typeof report.executable !== 'boolean') errors.push('Report executable must be boolean.');
  for (const key of ['agentReports','segmentReports','targetReports','hardErrors','warnings','advisories']) if (!Array.isArray(report[key])) errors.push(`Report requires ${key} array.`);
  for (const [key, expected] of Object.entries(validationBoundaryFlags())) if (report.boundaryFlags?.[key] !== expected) errors.push(`Boundary flag ${key} must be ${expected}.`);
  const unknown = [...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])].map((entry) => entry.code).filter((code) => !TERRAIN_AWARE_ISSUE_CODES.includes(code));
  if (unknown.length) warnings.push(`Report includes non-standard issue code(s): ${[...new Set(unknown)].join(', ')}.`);
  return { valid: errors.length === 0, errors, warnings, summary: terrainAwareMissionValidationSummary(report) };
}

export function terrainAwareMissionValidationSummary(report = {}) {
  const summary = report.summary ?? {};
  const issues = [...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])];
  return {
    type: 'anchor.validation.terrain-aware-mission-summary',
    version: TERRAIN_AWARE_MISSION_VALIDATION_VERSION,
    status: report.status ?? summary.status ?? 'INVALID',
    executable: report.executable === true,
    agentCount: summary.agentCount ?? report.agentReports?.length ?? 0,
    validAgentCount: summary.validAgentCount ?? countStatus(report.agentReports, 'VALID'),
    warningAgentCount: summary.warningAgentCount ?? countStatus(report.agentReports, 'VALID_WITH_WARNINGS'),
    invalidAgentCount: summary.invalidAgentCount ?? countStatus(report.agentReports, 'INVALID'),
    totalSegmentCount: summary.totalSegmentCount ?? report.segmentReports?.length ?? 0,
    invalidSegmentCount: summary.invalidSegmentCount ?? countStatus(report.segmentReports, 'INVALID'),
    warningSegmentCount: summary.warningSegmentCount ?? countStatus(report.segmentReports, 'VALID_WITH_WARNINGS'),
    targetCount: summary.targetCount ?? report.targetReports?.length ?? 0,
    invalidTargetCount: summary.invalidTargetCount ?? countStatus(report.targetReports, 'INVALID'),
    unreachableTargetCount: summary.unreachableTargetCount ?? (report.targetReports ?? []).filter((target) => target.reachableByAttachedSegments === false && (target.coverageBySegment ?? []).length).length,
    hardErrorCount: report.hardErrors?.length ?? summary.hardErrorCount ?? 0,
    warningCount: report.warnings?.length ?? summary.warningCount ?? 0,
    advisoryCount: report.advisories?.length ?? summary.advisoryCount ?? 0,
    firstIssue: report.hardErrors?.[0] ?? report.warnings?.[0] ?? report.advisories?.[0] ?? null,
    issueCodes: [...new Set(issues.map((item) => item.code))],
    boundaryFlags: { ...(report.boundaryFlags ?? validationBoundaryFlags()) }
  };
}

function validateAgentStart({ level, mission, plan, agent, agentPlan, bottomBoundary }) {
  const agentId = agent?.id ?? agentPlan?.agentId ?? null;
  const start = agentPlan?.selectedStart ?? getSelectedStart(agent) ?? agent?.start ?? null;
  const issues = [];
  let waypointReport = null;
  if (!start || !Number.isFinite(Number(start.x)) || !Number.isFinite(Number(start.y))) {
    issues.push(issue({ code: 'NO_VALID_START', severity: 'HARD_ERROR', message: `${agent?.label ?? agentId ?? 'Glider'} needs a valid start before execution.`, agentId, repairHints: ['Choose a deployment cell or restore the glider start.'] }));
  } else {
    waypointReport = validateTerrainAwareSurfaceWaypoint({ level, mission, plan, agent, agentId, position: start, role: 'deployment', checkDeployment: requiresDeploymentSelection(mission, agentId), bottomBoundary });
    issues.push(...waypointReport.hardErrors, ...waypointReport.warnings, ...waypointReport.advisories);
    if (requiresDeploymentSelection(mission, agentId)) {
      const deployment = isValidSelectedStart(level, mission, agentId, start);
      if (!deployment.valid) issues.push(issue({ code: 'INVALID_DEPLOYMENT', severity: 'HARD_ERROR', message: deployment.message ?? 'Selected deployment start is invalid.', agentId, position: pos(start), repairHints: ['Choose a highlighted deployment-zone cell.'] }));
    }
  }
  return { status: statusFor(issues.filter(severityIs('HARD_ERROR')), issues.filter(severityIs('WARNING'))), accepted: !issues.some((item) => item.severity === 'HARD_ERROR'), position: start ? pos(start) : null, waypointReport, issues };
}

function diveDiagnostics({ level, mission, agent, agentPlan, segment, segmentIndex, bottomBoundary }) {
  try {
    const target = segment.to ?? {};
    const dive = buildPlannedDiveSegmentViewModel({
      level,
      mission,
      agent,
      agentId: agent?.id ?? agentPlan?.agentId ?? null,
      segmentIndex,
      start: segment.from,
      target,
      targetWaypoint: target,
      diveProfileId: target.diveProfileId ?? target.diveProfile ?? agentPlan?.diveProfileId,
      targetDepthLayerId: target.targetDepthLayerId ?? target.depthLayerId ?? target.depthLayer ?? agentPlan?.targetDepthLayerId,
      maximumDiveDepthMeters: target.maximumDiveDepthMeters ?? target.maximumDepthMeters ?? agentPlan?.maximumDiveDepthMeters ?? agentPlan?.maximumDepthMeters,
      sampleIntervalSeconds: target.sampleIntervalSeconds ?? agentPlan?.sampleIntervalSeconds,
      cycleCount: target.cycleCount ?? agentPlan?.cycleCount,
      bottomBoundary,
      waterColumnConfig: level?.world?.waterColumnConfig,
      requiredBottomClearanceMeters: REQUIRED_CLEARANCE_METERS
    });
    const clearance = dive.bottomClearance ?? {};
    const minPoint = clearance.minimumPoint ?? clearance.minimumClearancePoint ?? (dive.predictedDivePath ?? []).find((point) => Number(point.clearanceMeters) === Number(clearance.minimumClearanceMeters));
    return {
      supported: true,
      minimumPredictedClearanceMeters: roundOrNull(clearance.minimumClearanceMeters),
      minimumClearancePoint: minPoint ?? null,
      requestedMaximumDepthMeters: roundOrNull(dive.requestedMaximumDepthMeters),
      achievableMaximumDepthMeters: roundOrNull(dive.achievableMaximumDepthMeters),
      terrainLimitedDepth: dive.bottomClearance?.terrainLimited === true,
      terrainLimitedPathRanges: clearance.terrainLimitedRanges ?? [],
      bottomTurnClearanceMeters: minClearance(dive.bottomTurns),
      seabedPenetrationCount: (dive.predictedDivePath ?? []).filter((point) => Number(point.clearanceMeters) < 0).length,
      profileLimitingFactor: dive.limitingFactor ?? dive.feasibility?.limitingFactor ?? null,
      bathymetryLimitedProfile: Number(dive.achievableMaximumDepthMeters ?? 0) + 1e-6 < Number(dive.requestedMaximumDepthMeters ?? 0),
      warningCodes: dive.warningCodes ?? [],
      source: 'PlannedDiveSegmentViewModel'
    };
  } catch (error) {
    return { supported: false, minimumPredictedClearanceMeters: null, minimumClearancePoint: null, requestedMaximumDepthMeters: null, achievableMaximumDepthMeters: null, terrainLimitedDepth: false, terrainLimitedPathRanges: [], bottomTurnClearanceMeters: null, seabedPenetrationCount: 0, profileLimitingFactor: 'unsupported', bathymetryLimitedProfile: false, warningCodes: ['INVALID_DIVE_PROFILE'], error: String(error?.message ?? error), source: 'PlannedDiveSegmentViewModel' };
  }
}

function currentRiskDiagnostic({ level, frame, segment, segmentId, minCoastDistance }) {
  const risk = estimateSegmentBeachingRisk({ level, frame, start: segment.from, end: segment.to });
  const issues = [];
  if (Number(risk.value ?? 0) >= 0.5) issues.push(issue({ code: 'CURRENT_BEACHING_RISK', severity: 'WARNING', message: risk.message || 'Forecast current may push this segment toward land.', segmentId, position: pos(risk), observedValue: round(risk.value), requiredValue: '< 0.5', units: 'risk-index', repairHints: ['Move the route farther offshore or inspect the current forecast.'] }));
  if (Number(risk.currentMagnitude ?? 0) > 0.65 && Number.isFinite(minCoastDistance) && minCoastDistance < 3) issues.push(issue({ code: 'HIGH_CROSS_CURRENT', severity: 'WARNING', message: 'Strong current near coastline increases cross-track terrain risk.', segmentId, position: pos(risk), observedValue: round(risk.currentMagnitude), requiredValue: '<= 0.65', units: 'normalized-current', repairHints: ['Review current vectors and consider more offshore route margin.'] }));
  return { supported: true, warning: issues.length > 0, value: round(risk.value ?? 0), level: risk.level ?? 'none', currentTowardLand: roundOrNull(risk.currentTowardLand), currentMagnitude: roundOrNull(risk.currentMagnitude), shoreDistance: roundOrNull(risk.shoreDistance), nearestLand: risk.nearestLand ?? null, issues, message: risk.message ?? '' };
}

function routeCorridorDiagnostic({ level, mission, segment, segmentId, samples, bottomBoundary, minCoastDistance, currentRisk }) {
  const nominalHalfWidth = Number(mission?.rules?.routeCorridorHalfWidthCells ?? mission?.rules?.waypointValidationRadius ?? mission?.rules?.waypointTolerance ?? 0.35);
  const predictedHalfWidth = round(Math.max(nominalHalfWidth, nominalHalfWidth + Number(currentRisk?.value ?? 0) * 0.75));
  const overlap = samples.filter((sample) => nearestCoastlineDistanceCells(bottomBoundary, sample.x, sample.y) <= predictedHalfWidth);
  const landOverlapFraction = samples.length ? overlap.filter((sample) => isLandCell(bottomBoundary, sample.containingCell.col, sample.containingCell.row)).length / samples.length : 0;
  const hazardOverlapFraction = samples.length ? samples.filter((sample) => hazardAt(level, sample.containingCell.col, sample.containingCell.row)).length / samples.length : 0;
  const warnings = [];
  if (Number.isFinite(minCoastDistance) && minCoastDistance <= predictedHalfWidth + 0.25) warnings.push(issue({ code: 'ROUTE_CORRIDOR_SHORELINE_RISK', severity: 'WARNING', message: 'Route corridor approaches shoreline; this is a diagnostic warning, not a route repair.', segmentId, position: pos(segment.to), observedValue: round(minCoastDistance), requiredValue: `> ${round(predictedHalfWidth + 0.25)}`, units: 'grid-cells', repairHints: ['Move the segment farther offshore if corridor margin matters for this mission.'] }));
  return { corridorProfileId: 'nominalValidationRadiusPlusForecastRiskV1', supported: true, nominalHalfWidth: round(nominalHalfWidth), predictedHalfWidth, landOverlapFraction: round(landOverlapFraction), hazardOverlapFraction: round(hazardOverlapFraction), minimumCoastlineDistance: roundOrNull(minCoastDistance), maximumCrossTrackRisk: round(currentRisk?.value ?? 0), uncertaintyInputs: currentRisk?.supported ? 'forecast-current-risk-and-nominal-margin' : 'nominal-margin-only', warnings };
}

function targetSamples(target, options = {}) {
  const center = target.position ?? target;
  const depth = Number(center.depthMeters ?? target.depthMeters ?? 0);
  const cellMeters = Number(options.cellDistanceMeters ?? 1200);
  const rawHorizontal = Number(target.horizontalRadius ?? target.radiusMeters ?? target.radius ?? 0);
  const h = Math.max(0, Math.min(2, Number.isFinite(rawHorizontal) && rawHorizontal > 8 ? rawHorizontal / cellMeters : rawHorizontal || (['sphere','ellipsoid','volumeRegion'].includes(target.geometryType) ? 0.75 : 0)));
  const v = Math.max(0, Number(target.verticalRadius ?? target.radiusDepthMeters ?? 0) || (['sphere','ellipsoid','volumeRegion'].includes(target.geometryType) ? 8 : 0));
  const interval = target.depthInterval ?? null;
  const depths = interval ? [interval.minDepthMeters, depth, interval.maxDepthMeters].filter((value) => Number.isFinite(Number(value))).map(Number) : [...new Set([Math.max(0, depth - v), depth, depth + v].map((value) => round(value)))];
  const positions = [{ x: center.x, y: center.y, role: 'center' }];
  if (h > 0) positions.push({ x: center.x + h, y: center.y, role: 'east' }, { x: center.x - h, y: center.y, role: 'west' }, { x: center.x, y: center.y + h, role: 'south' }, { x: center.x, y: center.y - h, role: 'north' });
  return uniqueSamples(positions.flatMap((position) => depths.map((sampleDepth) => ({ x: Number(position.x), y: Number(position.y), depthMeters: Math.max(0, Number(sampleDepth)), role: position.role }))));
}

function targetSampleValidity(sample, bottomBoundary) {
  const point = normalizeContinuousMissionPoint(sample, { grid: bottomBoundary });
  const cell = continuousPointToContainingCell(point, { grid: bottomBoundary });
  const outside = !insideDomain(point, bottomBoundary);
  const land = outside || isLandCell(bottomBoundary, cell.col, cell.row);
  const bottomDepthMeters = outside ? null : sampleBottomDepth(bottomBoundary, point.x, point.y);
  const depthMeters = Number(sample.depthMeters ?? 0);
  const clearanceMeters = Number.isFinite(bottomDepthMeters) ? bottomDepthMeters - depthMeters : null;
  const belowSeabed = Number.isFinite(clearanceMeters) && clearanceMeters < 0;
  return { role: sample.role, position: pos({ ...point, depthMeters }), containingCell: cellPos(cell), outside, land, belowSeabed, valid: !outside && !land && !belowSeabed, bottomDepthMeters: roundOrNull(bottomDepthMeters), depthMeters: round(depthMeters), clearanceMeters: roundOrNull(clearanceMeters) };
}

function targetCoverage(target, segmentReports = []) {
  const attached = new Set(target.attachedSegmentIds ?? []);
  return segmentReports.filter((segment) => !attached.size || attached.has(segment.segmentId)).map((segment) => {
    const closest = closestPointOnContinuousSegment(target.position, { from: segment.from, to: segment.to });
    const depthReachable = Number(segment.diagnostics?.predictedDiveClearance?.achievableMaximumDepthMeters ?? 0) + 1e-6 >= Number(target.position?.depthMeters ?? 0);
    const near = Number(closest.distanceCells ?? Infinity) <= Number(target.minimumCoverageRadiusCells ?? 0.85);
    const coverageFraction = near && depthReachable ? 1 : near ? 0.5 : 0;
    return { segmentId: segment.segmentId, distanceCells: round(closest.distanceCells), progress: closest.progress, depthReachable, reachable: coverageFraction >= Number(target.minimumCoverage ?? 0.65), coverageFraction: round(coverageFraction), status: coverageFraction >= Number(target.minimumCoverage ?? 0.65) ? 'covered' : coverageFraction > 0 ? 'partial' : 'unreachable' };
  });
}

function addTimeEnergyIssues({ level, mission, agent, segment, segmentId, hardErrors, warnings }) {
  const duration = Number(getTimeConfig(level).duration ?? level?.world?.time?.duration ?? Infinity);
  const arrivalTime = Number(segment.to?.estimatedArrivalTime ?? segment.to?.t);
  if (Number.isFinite(duration) && Number.isFinite(arrivalTime) && arrivalTime > duration) warnings.push(issue({ code: 'MISSION_TIME_OVERRUN', severity: 'WARNING', message: 'Waypoint is scheduled after mission duration; simulation may end before it is reached.', agentId: agent?.id ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(segment.to), timeSeconds: arrivalTime, observedValue: round(arrivalTime), requiredValue: round(duration), units: 'seconds', repairHints: ['Move the waypoint earlier in the route or accept that it may remain unreached.'] }));
  const margin = Number(segment.to?.energyMargin ?? segment.to?.remainingFuelEstimate);
  if (!Number.isFinite(margin)) return;
  if (margin < 0) hardErrors.push(issue({ code: 'ENERGY_INFEASIBLE', severity: 'HARD_ERROR', message: 'Route segment exceeds the estimated energy budget.', agentId: agent?.id ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(segment.to), observedValue: round(margin), requiredValue: '>= 0', units: 'energy-units', repairHints: ['Shorten the route or choose a closer waypoint.'] }));
  else if (margin < Math.max(4, Number(agent?.battery ?? agent?.maxBattery ?? mission?.rules?.energyBudget ?? 100) * 0.08)) warnings.push(issue({ code: 'LOW_ENERGY_MARGIN', severity: 'WARNING', message: 'Route segment leaves low estimated energy margin.', agentId: agent?.id ?? null, segmentId, waypointId: segment.to?.id ?? segment.to?.waypointId ?? null, position: pos(segment.to), observedValue: round(margin), requiredValue: 'comfortable positive reserve', units: 'energy-units', repairHints: ['Shorten the route or accept a low energy reserve warning.'] }));
}

function normalizeBottomBoundary(bottomBoundary, level) {
  return bottomBoundary?.bottomDepthField && bottomBoundary?.landMask ? bottomBoundary : buildBottomBoundaryViewModel({ level });
}

function missionSummary(report) {
  return {
    agentCount: report.agentReports.length,
    validAgentCount: countStatus(report.agentReports, 'VALID'),
    warningAgentCount: countStatus(report.agentReports, 'VALID_WITH_WARNINGS'),
    invalidAgentCount: countStatus(report.agentReports, 'INVALID'),
    totalSegmentCount: report.segmentReports.length,
    invalidSegmentCount: countStatus(report.segmentReports, 'INVALID'),
    warningSegmentCount: countStatus(report.segmentReports, 'VALID_WITH_WARNINGS'),
    targetCount: report.targetReports.length,
    invalidTargetCount: countStatus(report.targetReports, 'INVALID'),
    unreachableTargetCount: report.targetReports.filter((target) => target.reachableByAttachedSegments === false && (target.coverageBySegment ?? []).length).length,
    hardErrorCount: report.hardErrors.length,
    warningCount: report.warnings.length,
    advisoryCount: report.advisories.length,
    executable: report.executable,
    status: report.status
  };
}

function issue(input = {}) {
  const code = TERRAIN_AWARE_ISSUE_CODES.includes(input.code) ? input.code : String(input.code ?? 'UNKNOWN_ISSUE');
  const severity = ['HARD_ERROR', 'WARNING', 'ADVISORY'].includes(input.severity) ? input.severity : 'WARNING';
  return {
    code,
    severity,
    message: String(input.message ?? code),
    agentId: input.agentId ?? null,
    segmentId: input.segmentId ?? null,
    waypointId: input.waypointId ?? null,
    targetId: input.targetId ?? null,
    position: input.position ?? null,
    timeSeconds: roundOrNull(input.timeSeconds),
    observedValue: observed(input.observedValue),
    requiredValue: observed(input.requiredValue),
    units: input.units ?? null,
    focusHint: input.focusHint ?? focusFor(input.position, input),
    repairHints: [...(input.repairHints ?? defaultHints(code))].map(String),
    sourceModule: input.sourceModule ?? 'TerrainAwareMissionValidation',
    deterministic: true
  };
}

function statusFor(hardErrors = [], warnings = []) {
  if (hardErrors.length) return 'INVALID';
  if (warnings.length) return 'VALID_WITH_WARNINGS';
  return 'VALID';
}

function validationBoundaryFlags() {
  return { canonicalTerrainOwnedByCore: true, usesMeshRaycastForValidity: false, rendererOwnsValidation: false, rendererOwnsPlanning: false, rendererOwnsDiveFeasibility: false, changesOfficialScoring: false, usesNewPlanner: false };
}

function isRouteRequired(mission, agent, agentPlan) {
  if (agent?.optional === true || agent?.required === false) return false;
  return mission?.rules?.requireExecutableRoute === true || agentPlan?.requiredRoute === true || agent?.requiredRoute === true;
}

function isRequiredTarget(target, mission) {
  if (target?.required === true || target?.objectiveRequired === true) return true;
  const ids = new Set((mission?.objectives ?? []).filter((objective) => objective.required).map((objective) => objective.targetId ?? objective.id));
  return ids.has(target?.id ?? target?.targetId ?? target?.objectiveId);
}

function publicPlanDigestInput(plan = {}) {
  return {
    type: plan?.type ?? null,
    schemaVersion: plan?.schemaVersion ?? null,
    levelId: plan?.levelId ?? null,
    missionId: plan?.missionId ?? null,
    agentPlans: (plan?.agentPlans ?? []).map((agentPlan) => ({
      agentId: agentPlan.agentId,
      selectedStart: pos(agentPlan.selectedStart),
      waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ id: waypoint.id ?? waypoint.waypointId ?? null, x: roundOrNull(waypoint.x), y: roundOrNull(waypoint.y), t: roundOrNull(waypoint.t ?? waypoint.estimatedArrivalTime), diveProfileId: waypoint.diveProfileId ?? null, targetDepthLayerId: waypoint.targetDepthLayerId ?? waypoint.depthLayerId ?? null, maximumDiveDepthMeters: roundOrNull(waypoint.maximumDiveDepthMeters ?? waypoint.maximumDepthMeters) }))
    })),
    scienceTargets: (plan?.scienceTargets ?? []).map((target) => ({ id: target.id ?? target.targetId ?? null, position: pos(target.position ?? target), geometryType: target.geometryType ?? target.targetType ?? null, attachedSegmentIds: target.attachedSegmentIds ?? [] }))
  };
}

function stableDigest(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function insideDomain(point, grid = {}) {
  const width = Number(grid.width ?? grid.grid?.width ?? 0);
  const height = Number(grid.height ?? grid.grid?.height ?? 0);
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)) && Number(point.x) >= 0 && Number(point.y) >= 0 && Number(point.x) <= Math.max(0, width - 1) && Number(point.y) <= Math.max(0, height - 1);
}

function isLandCell(bottomBoundary, x, y) {
  const col = Math.round(Number(x));
  const row = Math.round(Number(y));
  return Boolean(bottomBoundary?.landMask?.[row]?.[col]) || Number(bottomBoundary?.bottomDepthField?.[row]?.[col] ?? 0) <= 0;
}

function hazardAt(level, x, y) {
  return Number(level?.layers?.hazards?.[Math.round(Number(y))]?.[Math.round(Number(x))] ?? 0) > 0;
}

function restrictedAt(level, sample, cell) {
  const regions = level?.layers?.static?.restrictedZones ?? level?.layers?.restrictedZones ?? level?.restrictedZones ?? [];
  return regions.some((region) => {
    if (Array.isArray(region.cells)) return region.cells.some((candidate) => Math.round(Number(candidate.x ?? candidate.col)) === cell.col && Math.round(Number(candidate.y ?? candidate.row)) === cell.row);
    if (Number.isFinite(Number(region.x)) && Number.isFinite(Number(region.y)) && Number(region.radius ?? 0) > 0) return Math.hypot(sample.x - Number(region.x), sample.y - Number(region.y)) <= Number(region.radius);
    return false;
  });
}

function sampleBottomDepth(bottomBoundary, x, y) {
  const grid = bottomBoundary?.bottomDepthField ?? [];
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return null;
  const bx = Math.max(0, Math.min(width - 1, Number(x)));
  const by = Math.max(0, Math.min(height - 1, Number(y)));
  const x0 = Math.floor(bx), y0 = Math.floor(by), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = bx - x0, ty = by - y0;
  const top = Number(grid[y0]?.[x0] ?? 0) * (1 - tx) + Number(grid[y0]?.[x1] ?? 0) * tx;
  const bottom = Number(grid[y1]?.[x0] ?? 0) * (1 - tx) + Number(grid[y1]?.[x1] ?? 0) * tx;
  return round(top * (1 - ty) + bottom * ty);
}

function nearestCoastlineDistanceCells(bottomBoundary, x, y) {
  const mask = bottomBoundary?.coastlineMask ?? [];
  const width = bottomBoundary?.width ?? mask[0]?.length ?? 0;
  const height = bottomBoundary?.height ?? mask.length;
  if (!width || !height) return Infinity;
  let best = Infinity;
  for (let row = 0; row < height; row += 1) for (let col = 0; col < width; col += 1) if (mask[row]?.[col]) best = Math.min(best, Math.hypot(Number(x) - col, Number(y) - row));
  return best;
}

function shorelineRisk(distance, point) {
  if (!Number.isFinite(distance)) return { level: 'none', value: 0, distanceCells: null, source: 'canonicalCoastlineMask' };
  const value = distance <= 0.75 ? 0.65 : distance <= NEAR_SHORE_CELLS ? 0.35 : 0;
  return { level: value >= 0.6 ? 'high' : value > 0 ? 'low' : 'none', value: round(value), distanceCells: round(distance), position: pos(point), source: 'canonicalCoastlineMask' };
}

function compactCurrentRisk(risk = {}) {
  return { supported: risk.supported === true, warning: risk.warning === true, value: roundOrNull(risk.value), level: risk.level ?? null, currentTowardLand: roundOrNull(risk.currentTowardLand), currentMagnitude: roundOrNull(risk.currentMagnitude), shoreDistance: roundOrNull(risk.shoreDistance), message: risk.message ?? '' };
}

function compactCorridor(corridor = {}) {
  return { corridorProfileId: corridor.corridorProfileId ?? null, supported: corridor.supported === true, nominalHalfWidth: roundOrNull(corridor.nominalHalfWidth), predictedHalfWidth: roundOrNull(corridor.predictedHalfWidth), landOverlapFraction: roundOrNull(corridor.landOverlapFraction), hazardOverlapFraction: roundOrNull(corridor.hazardOverlapFraction), minimumCoastlineDistance: roundOrNull(corridor.minimumCoastlineDistance), maximumCrossTrackRisk: roundOrNull(corridor.maximumCrossTrackRisk), uncertaintyInputs: corridor.uncertaintyInputs ?? null, warningCount: corridor.warnings?.length ?? 0 };
}

function compactSample(sample = {}) { return { x: roundOrNull(sample.x), y: roundOrNull(sample.y), progress: roundOrNull(sample.progress), cell: cellPos(sample.containingCell) }; }
function compactSampleSet(samples = []) { if (!samples.length) return []; return [...new Set([0, Math.floor(samples.length / 2), samples.length - 1])].map((index) => compactSample(samples[index])); }
function minClearance(points = []) { const values = points.map((point) => Number(point.clearanceMeters)).filter(Number.isFinite); return values.length ? round(Math.min(...values)) : null; }
function uniqueSamples(samples = []) { const seen = new Set(); return samples.filter((sample) => { const key = `${round(sample.x)}:${round(sample.y)}:${round(sample.depthMeters)}:${sample.role}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function idForSegment(segment = {}, segmentIndex = null) { return segment.segmentId ?? segment.id ?? `${segment.agentId ?? 'agent'}-segment-${Number(segmentIndex ?? segment.segmentIndex ?? segment.waypointIndex ?? 0) + 1}`; }

function pos(point = null) {
  if (!point) return null;
  const x = Number(point.x ?? point.col), y = Number(point.y ?? point.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const out = { x: round(x), y: round(y) };
  const depth = Number(point.depthMeters ?? point.z);
  if (Number.isFinite(depth)) out.depthMeters = round(depth);
  return out;
}

function cellPos(cell = null) {
  if (!cell) return null;
  const x = Number(cell.x ?? cell.col), y = Number(cell.y ?? cell.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x), y: Math.round(y), col: Math.round(x), row: Math.round(y) };
}

function focusFor(position = null, patch = {}) {
  if (!position) return { kind: 'mission-readiness' };
  return { kind: patch.segmentId ? 'route-segment' : patch.targetId ? 'sampling-target' : 'surface-waypoint', position, cameraPreset: patch.targetId || Number(position.depthMeters ?? 0) > 0 ? 'sideProfile' : 'obliqueMission', segmentId: patch.segmentId ?? null, targetId: patch.targetId ?? null };
}

function defaultHints(code) {
  return ({ OUTSIDE_DOMAIN: ['Move inside the mission grid.'], LAND_SURFACE_WAYPOINT: ['Move the waypoint farther offshore.'], INVALID_DEPLOYMENT: ['Choose a valid deployment-zone cell.'], BLOCKED_DEPLOYMENT_ZONE: ['Choose a water cell inside the deployment zone.'], SEGMENT_LAND_INTERSECTION: ['Move the waypoint so the segment does not cross land.'], SEGMENT_COASTLINE_CROSSING: ['Move farther from the coastline if the warning is not intentional.'], ROUTE_CORRIDOR_SHORELINE_RISK: ['Increase offshore route margin.'], BOTTOM_CLEARANCE_VIOLATION: ['Reduce requested depth or move over deeper water.'], LOW_BOTTOM_CLEARANCE: ['Review the dive profile and bottom clearance.'], BATHYMETRY_LIMITED_PROFILE: ['Reduce requested maximum depth.'], TARGET_BELOW_SEABED: ['Choose a shallower target depth.'], TARGET_INSIDE_LAND: ['Move the target into the water column.'], TARGET_UNREACHABLE: ['Attach the target to a reachable segment.'], NO_VALID_START: ['Select a deployment start for this glider.'], NO_EXECUTABLE_WAYPOINTS: ['Add at least one executable surface waypoint.'] })[code] ?? ['Inspect the issue and adjust the route manually.'];
}

function observed(value) { if (value == null) return null; return typeof value === 'number' ? roundOrNull(value) : value; }
function countStatus(items = [], status) { return (items ?? []).filter((item) => item.status === status).length; }
function severityIs(severity) { return (issueRecord) => issueRecord?.severity === severity; }
function roundOrNull(value, digits = 6) { const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(digits)) : null; }
function round(value, digits = 6) { return Number(Number(value ?? 0).toFixed(digits)); }
