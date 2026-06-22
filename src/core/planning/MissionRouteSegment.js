import { getSelectedStart } from '../deployment/DeploymentZones.js';
import { createSegmentFlightPlan, segmentFlightPlanSummary } from './SegmentFlightPlan.js';

export const MISSION_ROUTE_SEGMENT_VERSION = 'mission-route-segment-dive-r1-1';

export function buildMissionRouteSegments(plan = {}, context = {}) {
  const mission = context.mission ?? null;
  const level = context.level ?? null;
  const waterColumnConfig = context.waterColumnConfig ?? mission?.waterColumnConfig ?? mission?.world?.waterColumnConfig ?? level?.world?.waterColumnConfig ?? null;
  const segments = [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    if (!agentPlan?.agentId) continue;
    const agent = (mission?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(agentPlan.agentId)) ?? null;
    const start = normalizeEndpoint(agentPlan.selectedStart ?? agentPlan.start ?? agentPlan.deployment?.selectedStart ?? getSelectedStart(agent) ?? agent?.start, {
      type: 'selectedStart',
      id: `${agentPlan.agentId}-surface-start`,
      agentId: agentPlan.agentId,
      sequenceIndex: -1
    });
    if (!start) continue;
    const waypoints = Array.isArray(agentPlan.waypoints) ? agentPlan.waypoints : [];
    for (let index = 0; index < waypoints.length; index += 1) {
      const sourceWaypoint = index === 0 ? start : normalizeEndpoint(waypoints[index - 1], { type: 'waypoint', agentId: agentPlan.agentId, sequenceIndex: index - 1 });
      const targetWaypoint = normalizeEndpoint(waypoints[index], { type: 'waypoint', agentId: agentPlan.agentId, sequenceIndex: index });
      if (!sourceWaypoint || !targetWaypoint) continue;
      const rawSegment = {
        version: MISSION_ROUTE_SEGMENT_VERSION,
        id: segmentId(agentPlan.agentId, sourceWaypoint.id, targetWaypoint.id),
        agentId: agentPlan.agentId,
        sequenceIndex: index,
        source: endpointRecord(sourceWaypoint),
        target: endpointRecord(targetWaypoint),
        horizontalGeometry: horizontalGeometry(sourceWaypoint.point, targetWaypoint.point),
        arrivalBehavior: arrivalBehaviorForTarget(waypoints[index]),
        warnings: [],
        boundaryFlags: defaultBoundaryFlags()
      };
      const flightPlan = createSegmentFlightPlan({
        segment: { ...rawSegment, targetWaypoint: waypoints[index], sourceWaypoint: index === 0 ? null : waypoints[index - 1] },
        waypoint: waypoints[index],
        targetWaypoint: waypoints[index],
        agentPlan,
        agent,
        mission,
        level,
        waterColumnConfig
      });
      segments.push(normalizeMissionRouteSegment({
        ...rawSegment,
        flightProfile: flightPlan,
        feasibility: flightPlan.feasibility,
        warnings: [...rawSegment.warnings, ...(flightPlan.warnings ?? [])]
      }));
    }
  }
  return segments;
}

export function missionRouteSegmentById(segments = [], id = null) {
  return (segments ?? []).find((segment) => String(segment.id) === String(id)) ?? null;
}

export function normalizeMissionRouteSegment(segment = {}) {
  const source = normalizeEndpoint(segment.source?.point ?? segment.source, { type: segment.source?.type ?? 'source', id: segment.source?.id ?? 'source', agentId: segment.agentId, sequenceIndex: Number(segment.sequenceIndex ?? 0) - 1 });
  const target = normalizeEndpoint(segment.target?.point ?? segment.target, { type: segment.target?.type ?? 'target', id: segment.target?.id ?? 'target', agentId: segment.agentId, sequenceIndex: segment.sequenceIndex ?? 0 });
  const id = segment.id ?? segmentId(segment.agentId ?? 'agent', source?.id ?? 'source', target?.id ?? 'target');
  const flightProfile = segment.flightProfile?.type === 'anchor.planning.segment-flight-plan'
    ? segment.flightProfile
    : createSegmentFlightPlan({ segment: { ...segment, id }, targetWaypoint: segment.targetWaypoint ?? segment.target });
  return {
    version: segment.version ?? MISSION_ROUTE_SEGMENT_VERSION,
    id,
    agentId: segment.agentId ?? null,
    sequenceIndex: Number.isFinite(Number(segment.sequenceIndex)) ? Number(segment.sequenceIndex) : null,
    source: endpointRecord(source),
    target: endpointRecord(target),
    horizontalGeometry: segment.horizontalGeometry ?? horizontalGeometry(source?.point, target?.point),
    flightProfile,
    arrivalBehavior: normalizeArrivalBehavior(segment.arrivalBehavior ?? segment.targetWaypoint?.arrivalBehavior),
    feasibility: segment.feasibility ?? flightProfile.feasibility ?? null,
    warnings: [...new Set([...(segment.warnings ?? []), ...(flightProfile.warnings ?? [])].map(String))],
    boundaryFlags: { ...defaultBoundaryFlags(), ...(segment.boundaryFlags ?? {}) }
  };
}

export function missionRouteSegmentDigest(segment = {}) {
  const normalized = normalizeMissionRouteSegment(segment);
  return `seg-${hashStable({
    id: normalized.id,
    agentId: normalized.agentId,
    sequenceIndex: normalized.sequenceIndex,
    sourceId: normalized.source?.id,
    targetId: normalized.target?.id,
    sourcePoint: normalized.source?.point,
    targetPoint: normalized.target?.point,
    flightPlanDigest: normalized.flightProfile?.digest ?? null,
    arrivalBehavior: normalized.arrivalBehavior?.mode ?? null
  })}`;
}

export function missionRouteSegmentSummary(segment = {}) {
  const normalized = normalizeMissionRouteSegment(segment);
  return {
    version: normalized.version,
    id: normalized.id,
    agentId: normalized.agentId,
    sequenceIndex: normalized.sequenceIndex,
    sourceId: normalized.source?.id ?? null,
    targetId: normalized.target?.id ?? null,
    sourceType: normalized.source?.type ?? null,
    targetType: normalized.target?.type ?? null,
    distanceCells: normalized.horizontalGeometry?.distanceCells ?? null,
    profile: segmentFlightPlanSummary(normalized.flightProfile),
    arrivalBehavior: normalized.arrivalBehavior,
    feasibilityStatus: normalized.flightProfile?.feasibilityStatus ?? null,
    digest: missionRouteSegmentDigest(normalized),
    ownsRouteGeometry: normalized.boundaryFlags?.ownsRouteGeometry === true,
    ownsSimulation: normalized.boundaryFlags?.ownsSimulation === true,
    ownsScoring: normalized.boundaryFlags?.ownsScoring === true,
    usesNewPlanner: normalized.boundaryFlags?.usesNewPlanner === true,
    warnings: normalized.warnings ?? []
  };
}

export function segmentId(agentId, sourceId, targetId) {
  return `${sanitize(agentId)}:segment:${sanitize(sourceId)}->${sanitize(targetId)}`;
}

function normalizeEndpoint(value = null, fallback = {}) {
  if (!value) return null;
  const point = value.point ?? value.position ?? value;
  const x = Number(point.x ?? point.col);
  const y = Number(point.y ?? point.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const id = String(value.id ?? value.waypointId ?? fallback.id ?? `${fallback.agentId ?? 'agent'}-${fallback.type ?? 'point'}-${Number(fallback.sequenceIndex ?? 0) + 1}`);
  return {
    type: value.type ?? fallback.type ?? 'waypoint',
    id,
    sequenceIndex: Number.isFinite(Number(value.sequenceIndex ?? fallback.sequenceIndex)) ? Number(value.sequenceIndex ?? fallback.sequenceIndex) : null,
    point: { x: round(x), y: round(y) },
    raw: value
  };
}

function endpointRecord(endpoint = null) {
  if (!endpoint) return null;
  return {
    type: endpoint.type,
    id: endpoint.id,
    sequenceIndex: endpoint.sequenceIndex,
    point: { ...endpoint.point }
  };
}

function horizontalGeometry(source = {}, target = {}) {
  const sx = Number(source?.x ?? 0);
  const sy = Number(source?.y ?? 0);
  const tx = Number(target?.x ?? sx);
  const ty = Number(target?.y ?? sy);
  const dx = tx - sx;
  const dy = ty - sy;
  return {
    type: 'horizontal-surface-leg',
    start: { x: round(sx), y: round(sy) },
    end: { x: round(tx), y: round(ty) },
    dx: round(dx),
    dy: round(dy),
    distanceCells: round(Math.hypot(dx, dy)),
    midpoint: { x: round((sx + tx) / 2), y: round((sy + ty) / 2) },
    continuousGeometry: true,
    ownsVerticalMotion: false
  };
}

function arrivalBehaviorForTarget(waypoint = {}) {
  const explicit = waypoint.arrivalBehavior ?? waypoint.surfaceAtEndBehavior ?? waypoint.arrivalMode;
  if (explicit) return normalizeArrivalBehavior(explicit, waypoint);
  const kind = waypoint.kind ?? waypoint.waypointKind ?? waypoint.type;
  if (kind === 'surface') return normalizeArrivalBehavior('surfaceAndCommunicate', waypoint);
  if (kind === 'terminalCarryThrough' || waypoint.action === 'return') return normalizeArrivalBehavior('missionTerminal', waypoint);
  return normalizeArrivalBehavior('continueUnderwater', waypoint);
}

function normalizeArrivalBehavior(value, waypoint = {}) {
  const raw = typeof value === 'object' ? value.mode ?? value.id : value;
  const text = String(raw ?? 'inheritMissionRule').trim();
  const mode = text === 'surface' || text === 'surfaceAndCommunicate' || text === 'Surface and Communicate'
    ? 'surfaceAndCommunicate'
    : text === 'missionTerminal' || text === 'terminal' || text === 'Mission Terminal'
      ? 'missionTerminal'
      : text === 'continueUnderwater' || text === 'Continue Underwater'
        ? 'continueUnderwater'
        : 'inheritMissionRule';
  return {
    mode,
    label: labelize(mode),
    surfaceAtEnd: mode === 'surfaceAndCommunicate' || waypoint.surfaceAtEnd === true,
    communicationWaitSeconds: Number.isFinite(Number(waypoint.communicationWaitSeconds)) ? Number(waypoint.communicationWaitSeconds) : (mode === 'surfaceAndCommunicate' ? 300 : 0)
  };
}

function defaultBoundaryFlags() {
  return {
    ownsRouteGeometry: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesNewPlanner: false,
    representsLowLevelControl: false,
    waypointIsHorizontalTarget: true,
    flightProfileBelongsToIncomingSegment: true,
    rendererAuthority: false
  };
}

function sanitize(value) {
  return String(value ?? 'unknown').replace(/[^a-zA-Z0-9_.:-]+/g, '-');
}

function hashStable(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
