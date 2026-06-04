export function buildHeadlessPlan(packet, agentPlans, {
  plannerLabel = 'node-headless-greedy-v1',
  oracle = false,
  validation = null
} = {}) {
  const challengeId = packet.challengeId ?? packet.instanceId ?? null;
  return {
    schemaVersion: '2.0',
    type: 'anchor.plan',
    levelId: packet.levelId ?? packet.level?.levelId ?? null,
    instanceId: packet.instanceId ?? packet.level?.instanceId ?? null,
    challengeId,
    missionId: packet.missionId ?? packet.mission?.missionId ?? null,
    executionMode: 'timedOpenLoop',
    planner: {
      name: plannerLabel,
      label: plannerLabel,
      type: 'importedSolver',
      usesForecast: true,
      usesTruth: Boolean(oracle),
      usesOracle: Boolean(oracle),
      source: 'external'
    },
    meta: {
      name: 'Node Headless Greedy Plan',
      createdAt: new Date().toISOString(),
      source: 'importedSolver',
      solver: 'tools/js/headless_solver.mjs',
      strategy: plannerLabel,
      visiblePlanningSource: packet.visiblePlanningSource ?? null,
      replaySeedAnchor: packet.replaySeedAnchor ?? challengeId,
      generationVersion: packet.generationVersion ?? packet.level?.meta?.generationVersion ?? null,
      validation: validation ? {
        ok: Boolean(validation.ok),
        errors: validation.errors ?? [],
        warnings: validation.warnings ?? []
      } : null,
      fairness: {
        usesForecast: true,
        usesTruth: Boolean(oracle),
        usesOracle: Boolean(oracle),
        note: 'Node proposes. Game validates. Game simulates. Game scores.'
      }
    },
    agentPlans
  };
}

export function sanityCheckHeadlessPlan(plan, world) {
  const errors = [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    let previousTime = null;
    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      const label = `${agentPlan.agentId} waypoint ${index + 1}`;
      const x = Number(waypoint.x);
      const y = Number(waypoint.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) errors.push(`${label} needs integer x/y.`);
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) errors.push(`${label} is outside the grid.`);
      if (world.terrain?.[y]?.[x]) errors.push(`${label} is on blocked terrain.`);
      const time = Number(waypoint.estimatedArrivalTime ?? waypoint.t);
      if (!Number.isFinite(time)) errors.push(`${label} needs finite timing.`);
      if (Number.isFinite(time) && time > world.duration) errors.push(`${label} exceeds mission duration.`);
      if (previousTime !== null && Number.isFinite(time) && time <= previousTime) errors.push(`${label} time must increase.`);
      if (Number.isFinite(time)) previousTime = time;
    }
  }
  return { ok: errors.length === 0, errors };
}
