 const AGENT_SPEC_PRESETS = {
  balanced: { speed: 1.25, fuel: 120, energyRate: 1, driftGain: 0.75, samplingRadius: 0.8 },
  fast: { speed: 1.55, fuel: 95, energyRate: 1.15, driftGain: 0.85, samplingRadius: 0.7 },
  endurance: { speed: 1.0, fuel: 170, energyRate: 0.85, driftGain: 0.65, samplingRadius: 0.85 },
  survey: { speed: 1.15, fuel: 130, energyRate: 1, driftGain: 0.75, samplingRadius: 1.1 }
};

 function buildAgentSpecs(index = 0, config = {}) {
  const varied = config.agentSpecMode === 'varied' || config.variedAgentSpecs;
  const presetOrder = varied ? ['fast', 'endurance', 'balanced', 'survey'] : ['balanced'];
  const preset = AGENT_SPEC_PRESETS[presetOrder[index % presetOrder.length]] ?? AGENT_SPEC_PRESETS.balanced;
  const fuel = Number(config.fuel ?? config.battery ?? preset.fuel);
  const speed = Number(config.gliderSpeed ?? config.maxSpeed ?? preset.speed);
  return {
    speed: finiteNumber(varied ? preset.speed : speed, preset.speed),
    fuel: finiteNumber(varied ? preset.fuel : fuel, preset.fuel),
    battery: finiteNumber(varied ? preset.fuel : fuel, preset.fuel),
    maxSpeed: finiteNumber(varied ? preset.speed : speed, preset.speed),
    energyRate: finiteNumber(config.energyRate ?? preset.energyRate, preset.energyRate),
    driftGain: finiteNumber(config.driftGain ?? preset.driftGain, preset.driftGain),
    samplingRadius: finiteNumber(config.samplingRadius ?? preset.samplingRadius, preset.samplingRadius),
    specPreset: varied ? presetOrder[index % presetOrder.length] : 'uniform'
  };
}

 function normalizeAgentSpecs(agent = {}) {
  const fuel = finiteNumber(agent.fuel ?? agent.battery ?? agent.maxFuel, 100);
  const speed = finiteNumber(agent.speed ?? agent.maxSpeed, 1.25);
  return {
    ...agent,
    speed,
    maxSpeed: speed,
    fuel,
    battery: fuel,
    energyRate: finiteNumber(agent.energyRate, 1),
    driftGain: finiteNumber(agent.driftGain, 0.75),
    samplingRadius: finiteNumber(agent.samplingRadius, 0.8)
  };
}

 function summarizeAgentSpecs(agent = {}) {
  const normalized = normalizeAgentSpecs(agent);
  return {
    agentId: normalized.id,
    label: normalized.label ?? normalized.id,
    speed: normalized.speed,
    fuel: normalized.fuel,
    battery: normalized.battery,
    energyRate: normalized.energyRate,
    driftGain: normalized.driftGain,
    samplingRadius: normalized.samplingRadius,
    specPreset: normalized.specPreset ?? null
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = {AGENT_SPEC_PRESETS, buildAgentSpecs, normalizeAgentSpecs, summarizeAgentSpecs}