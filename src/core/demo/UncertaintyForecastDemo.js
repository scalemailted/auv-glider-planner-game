import {
  UNCERTAINTY_BELIEF_STATE_VERSION,
  UNCERTAINTY_SCENARIO_IDS,
  UNCERTAINTY_VIEW_LAYER_IDS,
  createInitialBeliefState,
  createUncertaintyScenario,
  normalizeUncertaintyScenarioId,
  normalizeUncertaintyViewLayer,
  uncertaintyViewLayerLabel,
  validateUncertaintyBeliefState
} from './uncertainty/UncertaintyBeliefState.js';
import { UNCERTAINTY_SCENARIO_METADATA, uncertaintyScenarioLabel } from './uncertainty/UncertaintyScenarios.js';
import { BELIEF_UPDATE_MODELS, beliefUpdateModelLabel, normalizeBeliefUpdateModel } from './uncertainty/BeliefUpdateModel.js';
import { OBSERVATION_PATHS, observationPathLabel, normalizeObservationPath } from './uncertainty/ObservationModel.js';

export const UNCERTAINTY_DEMO_GRID = { width: 24, height: 16 };
export const UNCERTAINTY_DEMO_VIEW_MODES = UNCERTAINTY_VIEW_LAYER_IDS;
export const UNCERTAINTY_DEMO_PATTERNS = UNCERTAINTY_SCENARIO_IDS;
export const UNCERTAINTY_DEMO_FORECAST_MODELS = UNCERTAINTY_SCENARIO_IDS;
export const UNCERTAINTY_DEMO_BEHAVIORS = [
  'constant',
  'growthOverTime',
  'confidenceDecay',
  'burstyBreakdown',
  'reductionAfterSampling',
  'recoveryRegrowth'
];
export const UNCERTAINTY_DEMO_UPDATE_MODELS = BELIEF_UPDATE_MODELS;
export const UNCERTAINTY_DEMO_OBSERVATION_PATHS = OBSERVATION_PATHS;
export {
  UNCERTAINTY_BELIEF_STATE_VERSION,
  UNCERTAINTY_SCENARIO_IDS,
  UNCERTAINTY_VIEW_LAYER_IDS,
  createInitialBeliefState,
  createUncertaintyScenario,
  normalizeUncertaintyScenarioId,
  normalizeUncertaintyViewLayer,
  validateUncertaintyBeliefState,
  normalizeObservationPath,
  observationPathLabel,
  normalizeBeliefUpdateModel
};

export function normalizeUncertaintyDemoChoice(value, choices, fallback) {
  if (choices.includes(value)) return value;
  if (choices === UNCERTAINTY_DEMO_VIEW_MODES) return normalizeUncertaintyViewLayer(value);
  if (choices === UNCERTAINTY_DEMO_PATTERNS || choices === UNCERTAINTY_DEMO_FORECAST_MODELS) return normalizeUncertaintyScenarioId(value);
  if (choices === UNCERTAINTY_DEMO_UPDATE_MODELS) return normalizeBeliefUpdateModel(value);
  return fallback;
}

export function createUncertaintyForecastField(config = {}) {
  const state = createInitialBeliefState({
    grid: config.grid ?? UNCERTAINTY_DEMO_GRID,
    ...config,
    scenarioId: config.scenarioId ?? config.forecastModel ?? config.uncertaintyPattern,
    viewLayer: config.viewLayer ?? config.viewMode,
    time: config.time ?? config.demoTime
  });
  return {
    ...state,
    viewMode: state.viewLayer,
    viewModeLabel: uncertaintyViewLabel(state.viewLayer),
    uncertaintyPattern: state.scenarioId,
    forecastModel: state.scenarioId,
    uncertaintyBehavior: config.uncertaintyBehavior ?? 'confidenceDecay',
    updateModel: state.updateModel,
    layers: state.layers,
    field: state.field,
    stats: state.stats
  };
}

export function uncertaintyViewLabel(value) {
  return uncertaintyViewLayerLabel(normalizeUncertaintyViewLayer(value));
}

export function uncertaintyPatternLabel(value) {
  return uncertaintyScenarioLabel(value);
}

export function forecastModelLabel(value) {
  return uncertaintyScenarioLabel(value);
}

export function uncertaintyBehaviorLabel(value) {
  return {
    constant: 'Constant',
    growthOverTime: 'Growth Over Time',
    confidenceDecay: 'Confidence Decay',
    burstyBreakdown: 'Bursty Forecast Breakdown',
    reductionAfterSampling: 'Reduction After Sampling',
    recoveryRegrowth: 'Recovery / Regrowth'
  }[value] ?? 'Confidence Decay';
}

export function updateModelLabel(value) {
  return beliefUpdateModelLabel(value);
}

export function uncertaintyScenarioTeachingNote(id) {
  return UNCERTAINTY_SCENARIO_METADATA[normalizeUncertaintyScenarioId(id)]?.notes ?? '';
}

export function uncertaintyScenarioExpectedDiagnosis(id) {
  return UNCERTAINTY_SCENARIO_METADATA[normalizeUncertaintyScenarioId(id)]?.expectedDiagnosis ?? 'insufficientEvidence';
}