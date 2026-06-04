import { normalizeROIValue } from '../sim/ROIValue.js';
import { applyForecastDecayToFrames, normalizeForecastRules } from '../forecast/ForecastDecay.js';

export function makeForecastFromTruth(frames, config = {}, random = Math.random) {
  const mode = config.forecastMode ?? 'none';
  if (mode === 'none') return [];

  const noise = Number(config.forecastNoise ?? (mode === 'confidence' ? 0.16 : 0.1));
  const forecastRules = normalizeForecastRules(config.forecastRules ?? config.rules?.forecast ?? {
    mode: config.forecastDecay ? 'decay' : config.forecastDecayMode ?? 'none',
    initialConfidence: config.forecastInitialConfidence,
    minConfidence: config.forecastMinConfidence,
    decayRate: config.forecastDecayRate,
    decayModel: config.forecastDecayModel,
    updateOnSurfacing: config.forecastUpdateOnSurfacing
  });
  const generated = frames.map((frame) => {
    const confidence = frame.roi.map((row) => row.map(() => round01(1 - noise - random() * noise)));
    return {
      t: frame.t,
      current: frame.current.map((row) => row.map(([u, v]) => [
        round(u + (random() - 0.5) * noise),
        round(v + (random() - 0.5) * noise)
      ])),
      roi: frame.roi.map((row) => row.map((value) => perturbROI(value, noise, random))),
      confidence,
      uncertainty: confidence.map((row) => row.map((value) => round01(1 - value)))
    };
  });
  return applyForecastDecayToFrames(generated, forecastRules);
}

export function makeForecastEnsembleFromTruth(frames, config = {}, random = Math.random) {
  const count = Math.max(0, Math.round(Number(config.ensembleCount ?? 0)));
  return Array.from({ length: count }, (_, index) => ({
    id: `forecast_${index + 1}`,
    label: `Forecast ${index + 1}`,
    frames: makeForecastFromTruth(frames, {
      ...config,
      forecastMode: config.forecastMode === 'none' ? 'noisy' : config.forecastMode,
      forecastNoise: Number(config.forecastNoise ?? 0.12) * (0.85 + index * 0.15)
    }, random)
  }));
}

function perturbROI(value, noise, random) {
  const roi = normalizeROIValue(value);
  const nextValue = round01(roi.value + (random() - 0.5) * noise);
  const nextProbability = round01(roi.probability + (random() - 0.5) * noise);
  if (value && typeof value === 'object') {
    return {
      value: nextValue,
      probability: nextProbability,
      expectedValue: round01(nextValue * nextProbability)
    };
  }
  return nextValue;
}

function round(value) {
  return Number(value.toFixed(3));
}

function round01(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}
