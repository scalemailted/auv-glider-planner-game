 const DEBUG_SIM_STABILITY = false;

 const SIMULATION_LIMITS = {
  maxPlaybackSteps: 20000,
  maxRunUntilCompleteSteps: 10000,
  maxAgentHistoryPoints: 2500,
  maxLoggerFrames: 2500,
  maxEvents: 12000,
  maxEventsPerTick: 10,
  maxWaypointTransitionsPerTick: 3,
  maxMissedWaypointsPerTick: 3,
  maxStalledWaypointSteps: 60,
  maxBlockedWaypointSteps: 10,
  maxDtMultiplier: 4
};

 function assertFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return { ok: false, message: `${label} must be finite.`, value };
  }
  return { ok: true, value: number };
}

 function validateSimulationConfig(level, mission, plan) {
  const errors = [];
  const duration = assertFiniteNumber(level?.world?.time?.duration, 'Mission duration');
  const dt = assertFiniteNumber(level?.world?.time?.dt ?? 0.25, 'Mission dt');
  const gridWidth = assertFiniteNumber(level?.world?.grid?.width, 'Grid width');
  const gridHeight = assertFiniteNumber(level?.world?.grid?.height, 'Grid height');
  if (!level) errors.push('Level is missing.');
  if (!mission) errors.push('Mission is missing.');
  if (!plan) errors.push('Plan is missing.');
  if (!duration.ok || duration.value <= 0) errors.push(duration.message);
  if (!dt.ok || dt.value <= 0) errors.push(dt.message);
  if (!gridWidth.ok || gridWidth.value <= 0) errors.push(gridWidth.message);
  if (!gridHeight.ok || gridHeight.value <= 0) errors.push(gridHeight.message);
  for (const agent of mission?.agents ?? []) {
    const speed = assertFiniteNumber(agent.maxSpeed ?? 1, `${agent.label ?? agent.id} max speed`);
    const battery = assertFiniteNumber(agent.battery ?? 100, `${agent.label ?? agent.id} battery`);
    if (!speed.ok || speed.value <= 0) errors.push(speed.message);
    if (!battery.ok || battery.value < 0) errors.push(battery.message);
  }
  return { ok: errors.length === 0, errors };
}

 function validateAgentState(agent) {
  if (!agent) return { ok: false, reason: 'missingAgent' };
  if (!Number.isFinite(Number(agent.x)) || !Number.isFinite(Number(agent.y))) {
    return { ok: false, reason: 'invalidAgentPosition', details: { agentId: agent.id, x: agent.x, y: agent.y } };
  }
  if (!Number.isFinite(Number(agent.battery)) || !Number.isFinite(Number(agent.energyUsed))) {
    return { ok: false, reason: 'invalidAgentEnergy', details: { agentId: agent.id, battery: agent.battery, energyUsed: agent.energyUsed } };
  }
  if (!Number.isFinite(Number(agent.currentWaypointIndex)) || Number(agent.currentWaypointIndex) < 0) {
    return { ok: false, reason: 'invalidWaypointIndex', details: { agentId: agent.id, currentWaypointIndex: agent.currentWaypointIndex } };
  }
  return { ok: true };
}

 function validateWaypoint(waypoint) {
  if (!waypoint) return { ok: true };
  if (!Number.isFinite(Number(waypoint.x)) || !Number.isFinite(Number(waypoint.y))) {
    return { ok: false, reason: 'invalidWaypointPosition', details: { x: waypoint.x, y: waypoint.y } };
  }
  return { ok: true };
}

 function trimArrayToLimit(array, limit) {
  if (!Array.isArray(array) || array.length <= limit) return array;
  array.splice(0, array.length - limit);
  return array;
}

 function debugSimulation(message, payload = {}) {
  if (!DEBUG_SIM_STABILITY) return;
  console.debug(`[sim-stability] ${message}`, payload);
}

module.exports = {DEBUG_SIM_STABILITY, SIMULATION_LIMITS, assertFiniteNumber, validateSimulationConfig, validateAgentState, validateWaypoint, trimArrayToLimit, debugSimulation}