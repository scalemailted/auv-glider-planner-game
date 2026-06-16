import { clamp01, cloneField3d, field3dStats, sampleNearest3d } from './HeadlessGrid.js';

export function updateHeadlessBeliefFromObservations({
  fieldPack,
  observations = [],
  radius = 2.5,
  confidence = 0.55,
  stalenessRate = 0.015
} = {}) {
  const before = cloneJson(fieldPack);
  const after = cloneJson(fieldPack);
  const fields = after.fields ?? {};
  fields.mu_belief = cloneField3d(fields.mu_belief);
  fields.U_uncertainty = cloneField3d(fields.U_uncertainty);
  fields.P_unknown = cloneField3d(fields.P_unknown);
  fields.staleness = cloneField3d(fields.staleness);
  for (let z = 0; z < fields.staleness.length; z += 1) {
    for (let y = 0; y < fields.staleness[z].length; y += 1) {
      for (let x = 0; x < fields.staleness[z][y].length; x += 1) {
        fields.staleness[z][y][x] = clamp01(fields.staleness[z][y][x] + stalenessRate);
      }
    }
  }
  for (const observation of observations) {
    applyObservation(fields, observation, radius, confidence);
  }
  after.diagnostics = {
    ...(after.diagnostics ?? {}),
    beliefUpdate: headlessBeliefUpdateSummary(before, after, observations)
  };
  return after;
}

export function headlessBeliefUpdateSummary(before, after, observations = []) {
  const beforeStats = field3dStats(before?.fields?.U_uncertainty);
  const afterStats = field3dStats(after?.fields?.U_uncertainty);
  const beforeBelief = field3dStats(before?.fields?.mu_belief);
  const afterBelief = field3dStats(after?.fields?.mu_belief);
  return {
    type: 'anchor.headless.belief-update-summary',
    observationCount: Array.isArray(observations) ? observations.length : 0,
    meanUncertaintyBefore: beforeStats.mean,
    meanUncertaintyAfter: afterStats.mean,
    meanUncertaintyReduction: Number(beforeStats.mean ?? 0) - Number(afterStats.mean ?? 0),
    meanBeliefBefore: beforeBelief.mean,
    meanBeliefAfter: afterBelief.mean,
    educationalUpdate: true,
    notProductionInference: true,
    note: 'Belief update is a local educational assimilation rule, not GP, GMRF, Kalman, EnKF, or production data assimilation.'
  };
}

function applyObservation(fields, observation, radius, confidence) {
  const zCenter = Math.max(0, Math.round(Number(observation.zIndex ?? 0)));
  const observed = clamp01(observation.observedValue ?? observation.rawObservedValue ?? 0);
  const surprise = Number(observation.surprise ?? 0);
  const radiusSq = Math.max(0.01, radius * radius);
  for (let z = 0; z < fields.mu_belief.length; z += 1) {
    for (let y = 0; y < fields.mu_belief[z].length; y += 1) {
      for (let x = 0; x < fields.mu_belief[z][y].length; x += 1) {
        const dz = Math.abs(z - zCenter) * 1.25;
        const distanceSq = (x - Number(observation.x ?? 0)) ** 2 + (y - Number(observation.y ?? 0)) ** 2 + dz ** 2;
        if (distanceSq > radiusSq) continue;
        const falloff = Math.exp(-distanceSq / radiusSq);
        const alpha = clamp01(confidence * falloff);
        fields.mu_belief[z][y][x] = clamp01((1 - alpha) * fields.mu_belief[z][y][x] + alpha * observed);
        fields.U_uncertainty[z][y][x] = clamp01(fields.U_uncertainty[z][y][x] * (1 - 0.62 * alpha));
        fields.staleness[z][y][x] = clamp01(fields.staleness[z][y][x] * (1 - 0.8 * alpha));
        if (surprise >= 2) {
          fields.P_unknown[z][y][x] = clamp01(sampleNearest3d(fields.P_unknown, x, y, z) + 0.045 * alpha * Math.min(3, surprise));
        }
      }
    }
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
