import { seededUnit } from '../random/SeededRng.js';

export function getDriftRules(mission = {}) {
  const rules = mission.rules?.drift ?? {};
  return {
    mode: rules.mode ?? (rules.stochasticDrift ? 'forecastUncertain' : 'deterministic'),
    driftGain: Number.isFinite(Number(rules.driftGain)) ? Number(rules.driftGain) : Number(mission.physics?.driftGain ?? 0.5),
    stochasticDrift: Boolean(rules.stochasticDrift),
    noiseScale: Math.max(0, Number(rules.noiseScale ?? 0)),
    seed: rules.seed ?? mission.rules?.stochasticSeed ?? mission.rules?.rngSeed ?? mission.missionId ?? 'anchor-drift'
  };
}

export function applySeededStochasticDrift(current, { mission, agentId, t = 0 } = {}) {
  const rules = getDriftRules(mission);
  const base = [
    Number(current?.[0] ?? 0),
    Number(current?.[1] ?? 0)
  ];
  if (!rules.stochasticDrift || rules.noiseScale <= 0) {
    return {
      current: base,
      noise: [0, 0],
      rules
    };
  }
  const timeBucket = Math.round(Number(t ?? 0) * 1000);
  const nx = (seededUnit(`${rules.seed}:${agentId}:drift-x:${timeBucket}`) * 2 - 1) * rules.noiseScale;
  const ny = (seededUnit(`${rules.seed}:${agentId}:drift-y:${timeBucket}`) * 2 - 1) * rules.noiseScale;
  return {
    current: [base[0] + nx, base[1] + ny],
    noise: [nx, ny],
    rules
  };
}
