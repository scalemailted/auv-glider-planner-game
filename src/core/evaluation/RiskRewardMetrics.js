export function summarizeRiskReward({ events = [], frames = [], agents = [] } = {}) {
  const mobileContacts = events.filter((event) => event.type === 'mobileHazard').length;
  const mobileNearMisses = events.filter((event) => event.type === 'mobileHazardNearMiss').length;
  const mobileExposure = events.filter((event) => event.type === 'mobileHazardExposure' || event.type === 'mobileHazardNearMiss' || event.type === 'mobileHazard').length;
  const depthSamples = collectDepthMultipliers(frames, agents);
  const shallowSteps = depthSamples.filter((value) => value > 1.01).length;
  const deepBenefitSteps = depthSamples.filter((value) => value < 0.99).length;
  const shallowEnergyPenalty = events
    .filter((event) => event.type === 'depthEnergy')
    .reduce((sum, event) => sum + Number(event.extraEnergy ?? 0), 0);
  return {
    mobileHazardContacts: mobileContacts,
    mobileHazardNearMisses: mobileNearMisses,
    mobileHazardExposureCount: mobileExposure,
    shallowDepthSteps: shallowSteps,
    deepDepthBenefitSteps: deepBenefitSteps,
    averageDepthEnergyMultiplier: round(average(depthSamples), 3),
    shallowEnergyPenalty: round(shallowEnergyPenalty, 3)
  };
}

function collectDepthMultipliers(frames, agents) {
  const fromFrames = frames.flatMap((frame) => (frame.agents ?? []).map((agent) => Number(agent.depthEnergyMultiplier ?? 1)));
  if (fromFrames.length) return fromFrames;
  return agents.map((agent) => Number(agent.lastDepthMultiplier ?? 1));
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 1;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}
