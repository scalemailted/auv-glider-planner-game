export function readHeadlessSolverPacket(packet, { oracle = false } = {}) {
  if (!packet || typeof packet !== 'object') {
    throw new Error('Solver packet JSON must be an object.');
  }
  if (packet.type !== 'anchor.solverPacket') {
    throw new Error('Expected type "anchor.solverPacket".');
  }
  const visibility = packet.visibility ?? {};
  if (!oracle && visibility.oracleMode) {
    throw new Error('Oracle solver packet requires the explicit --oracle flag.');
  }
  return {
    packet,
    level: packet.level ?? null,
    mission: packet.mission ?? null,
    visibility,
    challengeId: packet.challengeId ?? packet.instanceId ?? null,
    replaySeedAnchor: packet.replaySeedAnchor ?? packet.level?.meta?.replaySeedAnchor ?? packet.instanceId ?? null,
    generationVersion: packet.generationVersion ?? packet.level?.meta?.generationVersion ?? null,
    planningData: packet.planningData ?? {},
    visibleFields: packet.planningData?.visibleFields ?? {},
    oracle
  };
}

export function summarizeHeadlessPacket(context) {
  const level = context?.level ?? {};
  const mission = context?.mission ?? {};
  const grid = level.world?.grid ?? {};
  const time = level.world?.time ?? {};
  return {
    challengeId: context?.challengeId ?? null,
    replaySeedAnchor: context?.replaySeedAnchor ?? null,
    generationVersion: context?.generationVersion ?? null,
    missionDuration: time.duration ?? null,
    planningWindow: time.planningWindow ?? null,
    grid: {
      width: grid.width ?? null,
      height: grid.height ?? null
    },
    agents: mission.agents?.length ?? 0,
    visiblePlanningSource: context?.packet?.visiblePlanningSource ?? null,
    forecastAvailable: Boolean(context?.planningData?.forecastAvailable),
    oracleMode: Boolean(context?.oracle)
  };
}
