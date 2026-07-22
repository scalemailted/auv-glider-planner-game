const MissionRules = require('./MissionRules.js')
function evaluateEndCondition({ level, mission, agents = [], events = [] }) {
  const config = MissionRules.normalizeEndCondition(mission);
  if (config.mode === 'none') {
    return {
      ...config,
      achieved: true,
      success: true,
      bonusApplied: 0,
      penaltyApplied: 0,
      details: []
    };
  }

  const zone = findTargetZone(level, mission, config);
  const details = agents.map((agent) => evaluateAgent(agent, events, zone, config));
  const achieved = details.every((detail) => detail.achieved);
  const required = Boolean(config.requiredByMissionEnd);
  const bonusApplied = achieved ? config.bonus : 0;
  const penaltyApplied = required && !achieved ? config.penalty : 0;

  return {
    ...config,
    targetZoneId: config.targetZoneId ?? zone?.id ?? null,
    achieved,
    success: !required || achieved,
    bonusApplied,
    penaltyApplied,
    details
  };
}

function evaluateAgent(agent, events, zone, config) {
  if (config.mode === 'surface' || config.mode === 'communication') {
    const surfaced = agent.commsState === 'surfaced'
      || agent.commsState === 'surfacing'
      || events.some((event) => event.type === 'surfaced' && event.agentId === agent.id);
    if (!zone) {
      return {
        agentId: agent.id,
        achieved: surfaced,
        distance: null,
        zoneId: null
      };
    }
    const distance = distanceToZone(agent, zone);
    return {
      agentId: agent.id,
      achieved: surfaced && distance <= zone.radius,
      distance: round(distance, 3),
      zoneId: zone.id
    };
  }

  const distance = zone ? distanceToZone(agent, zone) : 0;
  return {
    agentId: agent.id,
    achieved: zone ? distance <= zone.radius : true,
    distance: zone ? round(distance, 3) : null,
    zoneId: zone?.id ?? null
  };
}

function findTargetZone(level, mission, config) {
  const zones = [
    ...(mission?.rules?.endCondition?.zones ?? []),
    ...(mission?.rules?.recoveryZones ?? []),
    ...(mission?.rules?.communicationZones ?? []),
    ...(level?.layers?.bases ?? [])
  ].map(normalizeZone).filter(Boolean);

  if (config.targetZoneId) {
    const match = zones.find((zone) => zone.id === config.targetZoneId);
    if (match) return match;
  }

  const firstAgentStart = mission?.agents?.[0]?.start;
  return zones[0] ?? (firstAgentStart ? {
    id: 'agent_start',
    x: Number(firstAgentStart.x ?? 0),
    y: Number(firstAgentStart.y ?? 0),
    radius: 1.5
  } : null);
}

function normalizeZone(zone, index) {
  if (!zone) return null;
  const x = Number(zone.x ?? zone.cx ?? zone.center?.x);
  const y = Number(zone.y ?? zone.cy ?? zone.center?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    id: zone.id ?? zone.zoneId ?? `zone_${index}`,
    x,
    y,
    radius: Number(zone.radius ?? zone.r ?? 1.5)
  };
}

function distanceToZone(agent, zone) {
  return Math.hypot(Number(agent.x ?? 0) - zone.x, Number(agent.y ?? 0) - zone.y);
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}

module.exports = {}