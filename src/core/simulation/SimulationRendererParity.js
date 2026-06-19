import { digestExecutionPlan } from './MissionExecutionSnapshot.js';

export const SIMULATION_RENDERER_PARITY_VERSION = 'three-r1-1d';

export function compareSimulationExecutions(reference = {}, candidate = {}, options = {}) {
  const fields = [
    ['levelId', reference.levelId, candidate.levelId],
    ['missionId', reference.missionId, candidate.missionId],
    ['seed', reference.seed, candidate.seed],
    ['planDigest', reference.planDigest ?? digestExecutionPlan(reference.plan), candidate.planDigest ?? digestExecutionPlan(candidate.plan)],
    ['terminalReason', terminalReason(reference), terminalReason(candidate)],
    ['elapsedTime', numberOrNull(reference.elapsedTime ?? reference.summary?.elapsedTime), numberOrNull(candidate.elapsedTime ?? candidate.summary?.elapsedTime)],
    ['finalPositionsDigest', digestPublic(reference.finalPositions ?? reference.trajectories ?? reference.agents), digestPublic(candidate.finalPositions ?? candidate.trajectories ?? candidate.agents)],
    ['trajectoryDigest', digestPublic(reference.trajectories ?? reference.actualPathFrames), digestPublic(candidate.trajectories ?? candidate.actualPathFrames)],
    ['waypointStatusDigest', digestPublic(reference.waypointStatus ?? reference.summary?.waypoints), digestPublic(candidate.waypointStatus ?? candidate.summary?.waypoints)],
    ['observationDigest', digestPublic(reference.observations ?? reference.events?.filter?.(isObservationEvent)), digestPublic(candidate.observations ?? candidate.events?.filter?.(isObservationEvent))],
    ['samples', numberOrNull(reference.samples ?? reference.summary?.sampledCells), numberOrNull(candidate.samples ?? candidate.summary?.sampledCells)],
    ['energy', numberOrNull(reference.energy ?? reference.summary?.energyUsed), numberOrNull(candidate.energy ?? candidate.summary?.energyUsed)],
    ['hazards', numberOrNull(reference.hazards ?? reference.summary?.hazardsHit), numberOrNull(candidate.hazards ?? candidate.summary?.hazardsHit)],
    ['goldStars', numberOrNull(reference.goldStars ?? reference.summary?.priorityTargets?.captured), numberOrNull(candidate.goldStars ?? candidate.summary?.priorityTargets?.captured)],
    ['eventLogDigest', digestPublic(reference.events), digestPublic(candidate.events)],
    ['score', numberOrNull(reference.score ?? reference.summary?.finalScore), numberOrNull(candidate.score ?? candidate.summary?.finalScore)],
    ['resultDigest', digestPublic(reference.result ?? reference.summary), digestPublic(candidate.result ?? candidate.summary)]
  ];
  const canonicalDifferences = fields
    .filter(([_field, a, b]) => !sameValue(a, b, options))
    .map(([field, referenceValue, candidateValue]) => ({ field, referenceValue, candidateValue }));
  return {
    type: 'anchor.simulation.renderer-parity-report',
    version: SIMULATION_RENDERER_PARITY_VERSION,
    status: canonicalDifferences.length ? 'FAIL' : 'PASS',
    comparedFields: fields.map(([field]) => field),
    canonicalDifferences,
    excludedFields: ['camera', 'rendererBackend', 'webglObjectCounts', 'hoverSelection', 'frameCadence', 'visualInterpolation'],
    boundaryFlags: {
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      comparesCanonicalStateOnly: true
    }
  };
}

export function simulationRendererParitySummary(report = {}) {
  return {
    type: report.type ?? 'anchor.simulation.renderer-parity-report',
    version: report.version ?? SIMULATION_RENDERER_PARITY_VERSION,
    status: report.status ?? 'UNKNOWN',
    differenceCount: report.canonicalDifferences?.length ?? 0,
    canonicalDifferences: report.canonicalDifferences ?? [],
    boundaryFlags: report.boundaryFlags ?? {
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      comparesCanonicalStateOnly: true
    }
  };
}

function terminalReason(result = {}) {
  return result.terminalReason ?? result.summary?.terminalReason ?? result.summary?.stopReason?.code ?? result.stopReason?.code ?? null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(6)) : null;
}

function sameValue(a, b, options = {}) {
  if (typeof a === 'number' && typeof b === 'number') {
    const tolerance = Number(options.tolerance ?? 1e-9);
    return Math.abs(a - b) <= tolerance;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function digestPublic(value) {
  return hashString(stableStringify(value ?? null));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function isObservationEvent(event = {}) {
  return ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type);
}
