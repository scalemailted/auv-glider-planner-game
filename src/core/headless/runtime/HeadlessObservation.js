import { seededUnit } from '../../random/SeededRng.js';
import { clamp01, sampleNearest3d } from './HeadlessGrid.js';

export function createHeadlessObservation(options = {}) {
  const truthValue = finiteNumber(options.truthValue, 0);
  const forecastValue = finiteNumber(options.forecastValue, 0);
  const beliefValue = finiteNumber(options.beliefValue, forecastValue);
  const sensorNoise = finiteNumber(options.sensorNoise, 0.03);
  const rawObservedValue = finiteNumber(options.rawObservedValue ?? options.observedValue, truthValue);
  const innovation = finiteNumber(options.innovation ?? rawObservedValue - forecastValue, 0);
  const uncertaintyValue = finiteNumber(options.uncertaintyValue, 0);
  const surprise = finiteNumber(options.surprise ?? Math.abs(innovation) / Math.sqrt(uncertaintyValue ** 2 + sensorNoise ** 2), 0);
  return {
    observationId: options.observationId ?? `obs-${String(options.gliderId ?? 'glider-1')}-${Math.round(finiteNumber(options.timeSeconds, 0) * 1000)}`,
    type: 'fieldSample',
    timeSeconds: finiteNumber(options.timeSeconds, 0),
    gliderId: options.gliderId ?? 'glider-1',
    x: finiteNumber(options.x, 0),
    y: finiteNumber(options.y, 0),
    zIndex: Math.max(0, Math.round(finiteNumber(options.zIndex, 0))),
    depthLayer: options.depthLayer ?? 'surface',
    fieldId: 'T_hiddenTruth',
    truthValue,
    forecastValue,
    beliefValue,
    uncertaintyValue,
    rawObservedValue,
    observedValue: clamp01(rawObservedValue),
    sensorNoise,
    innovation,
    surprise,
    visibilityTier: 'publicScenario'
  };
}

export function sampleHeadlessObservation({
  fieldPack,
  x,
  y,
  zIndex = 0,
  gliderId = 'glider-1',
  timeSeconds = 0,
  sensorNoise = 0.03,
  seed = 'demo-001'
} = {}) {
  const fields = fieldPack?.fields ?? {};
  const depthLayer = fieldPack?.grid?.depthLayers?.[Math.max(0, Math.round(zIndex))] ?? 'surface';
  const truthValue = sampleNearest3d(fields.T_hiddenTruth, x, y, zIndex);
  const forecastValue = sampleNearest3d(fields.E_forecast, x, y, zIndex);
  const beliefValue = sampleNearest3d(fields.mu_belief, x, y, zIndex);
  const uncertaintyValue = sampleNearest3d(fields.U_uncertainty, x, y, zIndex);
  const noise = gaussianNoise(`${seed}:obs:${gliderId}:${Math.round(timeSeconds * 10)}:${Math.round(x * 10)}:${Math.round(y * 10)}:${Math.round(zIndex)}`) * sensorNoise;
  const rawObservedValue = truthValue + noise;
  const innovation = rawObservedValue - forecastValue;
  return createHeadlessObservation({
    observationId: `obs-${gliderId}-${String(Math.round(timeSeconds)).padStart(5, '0')}`,
    timeSeconds,
    gliderId,
    x,
    y,
    zIndex,
    depthLayer,
    truthValue,
    forecastValue,
    beliefValue,
    uncertaintyValue,
    rawObservedValue,
    sensorNoise,
    innovation,
    surprise: Math.abs(innovation) / Math.sqrt(uncertaintyValue ** 2 + sensorNoise ** 2)
  });
}

export function observationSummary(observations = []) {
  const list = Array.isArray(observations) ? observations : [];
  const count = list.length;
  const meanInnovation = count ? list.reduce((sum, entry) => sum + Number(entry.innovation ?? 0), 0) / count : 0;
  const meanSurprise = count ? list.reduce((sum, entry) => sum + Number(entry.surprise ?? 0), 0) / count : 0;
  return {
    type: 'anchor.headless.observation-summary',
    count,
    meanInnovation,
    meanAbsoluteInnovation: count ? list.reduce((sum, entry) => sum + Math.abs(Number(entry.innovation ?? 0)), 0) / count : 0,
    meanSurprise,
    maxSurprise: count ? Math.max(...list.map((entry) => Number(entry.surprise ?? 0))) : 0
  };
}

function gaussianNoise(seed) {
  const u1 = Math.max(1e-9, seededUnit(`${seed}:u1`));
  const u2 = seededUnit(`${seed}:u2`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
