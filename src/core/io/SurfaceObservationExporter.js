import { EXPORT_SCHEMA_VERSION, cloneJson } from './ExportVisibility.js';

export function buildSurfaceObservationExport({ level, mission, plan, engine = null, context = 'surfaceDecision', decision = null } = {}) {
  const t = Number(engine?.t ?? decision?.time ?? decision?.t ?? 0);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.surfaceObservation',
    createdAt: new Date().toISOString(),
    context,
    levelId: level?.levelId ?? null,
    instanceId: level?.instanceId ?? null,
    missionId: mission?.missionId ?? mission?.id ?? null,
    challengeMode: level?.challengeMode ?? null,
    time: t,
    decision: cloneJson(decision),
    agents: (engine?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      x: agent.x,
      y: agent.y,
      heading: agent.heading,
      battery: agent.battery,
      energyUsed: agent.energyUsed,
      currentWaypointIndex: agent.currentWaypointIndex,
      completedPlan: agent.completedPlan,
      commsState: agent.commsState,
      status: agent.status
    })),
    activePlan: cloneJson(plan),
    expectedResponse: {
      type: 'anchor.plan-segment',
      note: 'Return a waypoint segment for one surfaced or failed agent, or return a complete anchor.plan.'
    }
  };
}
