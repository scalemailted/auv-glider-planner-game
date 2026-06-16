import {
  absFieldDifference,
  clamp01,
  cloneScalarField,
  createScalarField,
  fieldStats,
  finiteFieldCheck
} from './UncertaintyFieldMath.js';
import {
  UNCERTAINTY_SCENARIOS,
  createUncertaintyScenarioDefinition,
  normalizeScenarioId,
  uncertaintyScenarioLabel
} from './UncertaintyScenarios.js';
import { updateBeliefFromObservations, normalizeBeliefUpdateModel } from './BeliefUpdateModel.js';
import {
  computeForecastErrorField,
  computeInnovationField,
  computeSurpriseField,
  computeUnknownEventProbabilityField,
  diagnoseUncertaintyScenario
} from './UncertaintyDiagnostics.js';
import { computeSamplingPriorityPreview } from './SamplingPriorityPreview.js';

export const UNCERTAINTY_BELIEF_STATE_VERSION = 'u0-u1-belief-state-v1';
export const UNCERTAINTY_SCENARIO_IDS = UNCERTAINTY_SCENARIOS;
export const UNCERTAINTY_VIEW_LAYER_IDS = [
  'hiddenTruth',
  'forecast',
  'observations',
  'belief',
  'uncertainty',
  'innovation',
  'surprise',
  'forecastError',
  'unknownEventProbability',
  'samplingPriorityPreview'
];

export function normalizeUncertaintyScenarioId(id) {
  return normalizeScenarioId(id);
}

export function normalizeUncertaintyViewLayer(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    truth: 'hiddenTruth',
    hiddenTruthField: 'hiddenTruth',
    expectedState: 'forecast',
    expected: 'forecast',
    beliefMean: 'belief',
    beliefMeanField: 'belief',
    posterior: 'belief',
    expectedUncertainty: 'uncertainty',
    expectedStateUncertainty: 'uncertainty',
    uncertaintyField: 'uncertainty',
    observationLayer: 'observations',
    unknownEvent: 'unknownEventProbability',
    hiddenEventProbability: 'unknownEventProbability',
    informationGain: 'samplingPriorityPreview',
    priority: 'samplingPriorityPreview',
    samplingPriority: 'samplingPriorityPreview'
  };
  const normalized = aliases[value] ?? value;
  return UNCERTAINTY_VIEW_LAYER_IDS.includes(normalized) ? normalized : 'uncertainty';
}

export function uncertaintyViewLayerLabel(id) {
  return {
    hiddenTruth: 'Hidden Truth',
    forecast: 'Forecast / Expected State',
    observations: 'Observations',
    belief: 'Belief / Updated Estimate',
    uncertainty: 'Expected-State Uncertainty',
    innovation: 'Innovation',
    surprise: 'Surprise',
    forecastError: 'Forecast Error',
    unknownEventProbability: 'Unknown-Event Probability',
    samplingPriorityPreview: 'Sampling-Priority Preview',
    truth: 'Hidden Truth',
    informationGain: 'Sampling-Priority Preview',
    deltaAfterUpdate: 'Delta After Update'
  }[id] ?? 'Expected-State Uncertainty';
}

export function createUncertaintyScenario(config = {}) {
  return createUncertaintyScenarioDefinition(config);
}

export function createInitialBeliefState(config = {}) {
  const width = Math.max(4, Math.round(Number(config.width ?? config.grid?.width ?? 24) || 24));
  const height = Math.max(4, Math.round(Number(config.height ?? config.grid?.height ?? 16) || 16));
  const time = Number(config.time ?? config.demoTime ?? 0) || 0;
  const seed = String(config.seed ?? 'anchor-uncertainty-demo');
  const scenarioId = normalizeUncertaintyScenarioId(config.scenarioId ?? config.forecastModel ?? config.uncertaintyPattern);
  const viewLayer = normalizeUncertaintyViewLayer(config.viewLayer ?? config.viewMode);
  const updateModel = normalizeBeliefUpdateModel(config.updateModel);
  const sensorNoise = Math.max(0, Number(config.sensorNoise ?? defaultSensorNoiseForScenario(scenarioId)) || 0);
  const lengthScale = Math.max(0.3, Number(config.lengthScale ?? config.influenceRadius ?? 2.6) || 2.6);
  const stalenessRate = Math.max(0, Number(config.stalenessRate ?? 0.012) || 0);
  const observations = normalizeObservationList(config.observations);
  const scenario = createUncertaintyScenarioDefinition({ scenarioId, width, height, time, seed });
  const { beliefMeanField, expectedUncertaintyField, updateDiagnostics } = updateBeliefFromObservations({
    forecastField: scenario.forecastField,
    priorBeliefField: config.priorBeliefField ?? scenario.forecastField,
    priorUncertaintyField: scenario.priorUncertaintyField,
    observations,
    model: updateModel,
    lengthScale,
    sensorNoise,
    confidence: config.confidence ?? 0.74,
    stalenessRate,
    time
  });
  const innovationField = computeInnovationField({ observations, width, height, lengthScale });
  const surpriseField = computeSurpriseField({ observations, width, height, lengthScale });
  const forecastErrorField = computeForecastErrorField({
    forecastField: scenario.forecastField,
    hiddenTruthField: scenario.hiddenTruthField,
    observations,
    width,
    height,
    lengthScale
  });
  const unknownEventProbabilityField = computeUnknownEventProbabilityField({
    forecastField: scenario.forecastField,
    surpriseField,
    observations,
    width,
    height,
    scenarioId,
    lengthScale
  });
  const priority = computeSamplingPriorityPreview({
    beliefMeanField,
    expectedUncertaintyField,
    forecastErrorField,
    surpriseField,
    unknownEventProbabilityField,
    stalenessField: scenario.stalenessField,
    observations
  });
  const observationLayer = createObservationLayer(observations, width, height);
  const deltaAfterUpdate = absFieldDifference(beliefMeanField, scenario.forecastField);
  const layers = {
    hiddenTruth: scenario.hiddenTruthField,
    truth: scenario.hiddenTruthField,
    forecast: scenario.forecastField,
    expectedState: scenario.forecastField,
    observations: observationLayer,
    observationLayer,
    belief: beliefMeanField,
    beliefMean: beliefMeanField,
    uncertainty: expectedUncertaintyField,
    expectedUncertainty: expectedUncertaintyField,
    innovation: innovationField,
    surprise: surpriseField,
    forecastError: forecastErrorField,
    unknownEventProbability: unknownEventProbabilityField,
    samplingPriorityPreview: priority.priorityField,
    informationGain: priority.priorityField,
    deltaAfterUpdate
  };
  const diagnostics = diagnoseUncertaintyScenario({
    scenarioId,
    forecastField: scenario.forecastField,
    hiddenTruthField: scenario.hiddenTruthField,
    observations,
    forecastErrorField,
    unknownEventProbabilityField,
    expectedUncertaintyField,
    surpriseField
  });
  const state = {
    width,
    height,
    time,
    seed,
    scenarioId,
    scenarioLabel: scenario.scenarioLabel,
    viewLayer,
    updateModel,
    sensorNoise,
    lengthScale,
    stalenessRate,
    hiddenTruthField: scenario.hiddenTruthField,
    forecastField: scenario.forecastField,
    beliefMeanField,
    expectedUncertaintyField,
    unknownEventProbabilityField,
    observationLayer,
    innovationField,
    surpriseField,
    forecastErrorField,
    samplingPriorityPreviewField: priority.priorityField,
    observations,
    layers,
    field: layers[viewLayer] ?? expectedUncertaintyField,
    stats: fieldStats(layers[viewLayer] ?? expectedUncertaintyField),
    diagnostics: {
      ...diagnostics,
      meanSurprise: diagnostics.evidenceSummary?.meanSurprise ?? fieldStats(surpriseField).mean,
      meanUncertainty: diagnostics.evidenceSummary?.meanUncertainty ?? fieldStats(expectedUncertaintyField).mean,
      fieldStats: {
        truth: fieldStats(scenario.hiddenTruthField),
        forecast: fieldStats(scenario.forecastField),
        belief: fieldStats(beliefMeanField),
        uncertainty: fieldStats(expectedUncertaintyField),
        surprise: fieldStats(surpriseField),
        priority: fieldStats(priority.priorityField)
      }
    },
    metadata: {
      version: UNCERTAINTY_BELIEF_STATE_VERSION,
      config: {
        scenarioId,
        viewLayer,
        seed,
        width,
        height,
        updateModel,
        sensorNoise,
        lengthScale,
        stalenessRate
      },
      scenario: scenario.metadata,
      updateDiagnostics,
      samplingPriorityPreview: {
        weights: priority.weights,
        explanation: priority.explanation
      },
      claimLevel: 'educational_belief_update',
      notA: 'Educational belief-update model, not a production data-assimilation system, GP/GMRF solver, calibrated ocean model, hydrodynamic model, sensor-processing pipeline, mission planner, or route optimizer.'
    }
  };
  state.fieldsFinite = validateUncertaintyBeliefState(state).ok;
  return state;
}

export function stepUncertaintyBeliefState(context = {}) {
  const previous = context.state ?? {};
  const previousConfig = previous.metadata?.config ?? {};
  const observations = [
    ...(Array.isArray(previous.observations) ? previous.observations : []),
    ...(Array.isArray(context.newObservations) ? context.newObservations : []),
    ...(Array.isArray(context.observations) ? context.observations : [])
  ];
  return createInitialBeliefState({
    ...previousConfig,
    ...context,
    observations,
    time: context.time ?? previous.time ?? previousConfig.time ?? 0,
    seed: context.seed ?? previous.seed ?? previousConfig.seed
  });
}

export function validateUncertaintyBeliefState(state) {
  const errors = [];
  const fields = {
    hiddenTruthField: state?.hiddenTruthField,
    forecastField: state?.forecastField,
    beliefMeanField: state?.beliefMeanField,
    expectedUncertaintyField: state?.expectedUncertaintyField,
    unknownEventProbabilityField: state?.unknownEventProbabilityField,
    observationLayer: state?.observationLayer,
    innovationField: state?.innovationField,
    surpriseField: state?.surpriseField,
    forecastErrorField: state?.forecastErrorField,
    samplingPriorityPreviewField: state?.samplingPriorityPreviewField
  };
  for (const [name, field] of Object.entries(fields)) {
    const check = finiteFieldCheck(field);
    if (!check.ok) errors.push(`${name}: ${check.errors.join('; ')}`);
    if (state?.width && check.width && check.width !== state.width) errors.push(`${name}: width ${check.width} does not match ${state.width}.`);
    if (state?.height && check.height && check.height !== state.height) errors.push(`${name}: height ${check.height} does not match ${state.height}.`);
  }
  return { ok: errors.length === 0, errors, fields: Object.keys(fields) };
}

function createObservationLayer(observations, width, height) {
  const layer = createScalarField(width, height, 0);
  for (const observation of observations) {
    const col = Math.max(0, Math.min(width - 1, Math.round(Number(observation.x ?? observation.col) || 0)));
    const row = Math.max(0, Math.min(height - 1, Math.round(Number(observation.y ?? observation.row) || 0)));
    layer[row][col] = Math.max(Number(layer[row][col]) || 0, clamp01(observation.normalizedSurprise ?? observation.observedValue ?? 0));
  }
  return layer;
}

function normalizeObservationList(observations) {
  if (!Array.isArray(observations)) return [];
  return observations.map((observation, index) => {
    const x = Number(observation.x ?? observation.col);
    const y = Number(observation.y ?? observation.row);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      id: observation.id ?? `obs-${index}`,
      ...observation,
      x,
      y,
      row: Math.max(0, Math.round(Number(observation.row ?? y) || 0)),
      col: Math.max(0, Math.round(Number(observation.col ?? x) || 0)),
      time: Number(observation.time ?? observation.t ?? 0) || 0,
      truthValue: clamp01(observation.truthValue),
      expectedValue: clamp01(observation.expectedValue),
      observedValue: clamp01(observation.observedValue ?? observation.value ?? observation.truthValue),
      expectedUncertainty: clamp01(observation.expectedUncertainty),
      sensorNoise: Math.max(0, Number(observation.sensorNoise) || 0),
      innovation: Number(observation.innovation) || 0,
      surprise: Math.max(0, Number(observation.surprise) || 0),
      normalizedSurprise: clamp01(observation.normalizedSurprise ?? (Number(observation.surprise) || 0) / 4),
      sensorType: observation.sensorType ?? 'synthetic-scalar'
    };
  }).filter(Boolean);
}

function defaultSensorNoiseForScenario(scenarioId) {
  return scenarioId === 'noisyFalseAlarm' ? 0.24 : 0.08;
}