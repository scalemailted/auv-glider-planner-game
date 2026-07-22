const VectorFieldPresets = require('./VectorFieldPresets.js')
const FLOW_FIELD_CONFIG_SCHEMA_VERSION = '1.0';
 const FLOW_FIELD_MODES = ['static', 'dynamic'];
 const FLOW_FIELD_EVOLUTION_BEHAVIORS = ['continuous', 'looping', 'pulse', 'translating'];
 const FLOW_FIELD_EVOLUTION_SPEEDS = [0.25, 0.5, 1, 2, 5, 10];
 const FLOW_FIELD_TIME_MODES = ['continuous', 'looping', 'clamped', 'frames'];
 const FLOW_FIELD_FRAME_INTERPOLATION_MODES = ['linear', 'nearest'];
 const FLOW_FIELD_VARIATION_LEVELS = ['off', 'low', 'medium', 'high'];
 const FLOW_FIELD_DYNAMIC_COMPLEXITY_LEVELS = ['low', 'medium', 'high'];
 const FLOW_FIELD_LAYER_INFLUENCES = ['global', 'spatialPocket', 'partitionedRegion'];
 const FLOW_FIELD_BOUNDARY_MODES = ['none', 'riskOnly', 'dampenIntoLand', 'deflectAlongShore', 'wakeApproximation'];
 const FLOW_FIELD_CYCLE_DURATIONS_HOURS = [6, 12, 24, 48];
 const FLOW_FIELD_MAX_LAYERS = 4;

 const FLOW_FIELD_PRESET_CHOICES = VectorFieldPresets.CURRENT_PRESET_CHOICES.filter((preset) => [
  'calm',
  'uniformDrift',
  'shearFlow',
  'eddyField',
  'doubleGyre',
  'tidalOscillation',
  'meanderingJet',
  'stormPulse',
  'curlNoise',
  'hycomInspiredComposite',
  'topologyAwareComposite'
].includes(preset));

 const FLOW_FIELD_STOCHASTIC_CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
 const FLOW_FIELD_UNCERTAINTY_GROWTH_LEVELS = ['none', 'slow', 'moderate', 'fast'];
 const FLOW_FIELD_HIDDEN_TRUTH_VARIATION_LEVELS = ['low', 'medium', 'high'];

 function createDefaultCurrentFieldConfig(mode = 'perfectKnowledge') {
  const stochastic = mode === 'forecast';
  return normalizeCurrentFieldConfig({
    fieldMode: 'dynamic',
    basePreset: 'topologyAwareComposite',
    strength: stochastic ? 1.05 : 0.85,
    evolutionBehavior: stochastic ? 'looping' : 'continuous',
    evolutionSpeed: 1,
    timeMode: stochastic ? 'looping' : 'continuous',
    frameInterpolation: 'linear',
    directionVariation: stochastic ? 'high' : 'medium',
    magnitudeVariation: stochastic ? 'medium' : 'low',
    dynamicComplexity: stochastic ? 'high' : 'medium',
    cycleDurationHours: 24,
    layers: [],
    topologyAware: true,
    boundaryConditions: { mode: 'deflectAlongShore', topologyAware: true },
    seedSalt: 'currents',
    stochastic: stochastic ? {
      forecastConfidence: 'medium',
      uncertaintyGrowth: 'moderate',
      hiddenTruthVariation: 'medium',
      forecastRefresh: 'surfaceWindows'
    } : null
  }, { mode });
}

 function normalizeCurrentFieldConfig(config = {}, context = {}) {
  config ??= {};
  const mode = context.mode === 'forecast' ? 'forecast' : 'perfectKnowledge';
  const defaults = mode === 'forecast'
    ? { basePreset: 'topologyAwareComposite', strength: 1.05, directionVariation: 'high', magnitudeVariation: 'medium' }
    : { basePreset: 'topologyAwareComposite', strength: 0.85, directionVariation: 'medium', magnitudeVariation: 'low' };
  const fieldMode = normalizeFieldMode(config.fieldMode ?? config.mode ?? (config.temporalEvolution === false ? 'static' : 'dynamic'));
  const basePreset = normalizeFlowPreset(config.basePreset ?? config.primaryPreset ?? config.currentPreset ?? context.currentPreset ?? defaults.basePreset);
  const directionVariation = normalizeVariationLevel(config.directionVariation ?? defaults.directionVariation);
  const magnitudeVariation = normalizeVariationLevel(config.magnitudeVariation ?? defaults.magnitudeVariation);
  const dynamicComplexity = normalizeDynamicComplexity(config.dynamicComplexity ?? config.currentVariability ?? strongestVariation(directionVariation, magnitudeVariation));
  const strength = Math.max(0, finiteNumber(config.strength ?? config.currentStrength ?? context.currentStrength, defaults.strength));
  const evolutionBehavior = fieldMode === 'static' ? 'continuous' : normalizeEvolutionBehavior(config.evolutionBehavior);
  return {
    schemaVersion: String(config.schemaVersion ?? FLOW_FIELD_CONFIG_SCHEMA_VERSION),
    fieldMode,
    basePreset,
    currentPreset: basePreset,
    strength,
    evolutionBehavior,
    evolutionSpeed: normalizeEvolutionSpeed(config.evolutionSpeed ?? config.evolutionSpeedScale ?? 1),
    timeMode: normalizeTimeMode(config.timeMode, fieldMode, evolutionBehavior),
    frameInterpolation: normalizeFrameInterpolation(config.frameInterpolation ?? config.interpolation),
    directionVariation: fieldMode === 'static' ? 'off' : directionVariation,
    magnitudeVariation: fieldMode === 'static' ? 'off' : magnitudeVariation,
    dynamicComplexity: fieldMode === 'static' ? 'low' : dynamicComplexity,
    cycleDurationHours: normalizeCycleDurationHours(config.cycleDurationHours ?? config.cycleDuration ?? 24),
    layers: normalizeCurrentFieldLayers(config.layers ?? config.additiveLayers ?? [], { basePreset }),
    topologyAware: config.topologyAware !== false,
    boundaryConditions: normalizeBoundaryConditions(config.boundaryConditions ?? config.boundary ?? {
      topologyAware: config.topologyAware !== false
    }),
    topologyComposite: normalizeTopologyComposite(config.topologyComposite ?? config.regions),
    seedSalt: String(config.seedSalt ?? 'currents'),
    stochastic: mode === 'forecast' ? normalizeStochasticCurrentConfig(config.stochastic ?? config.forecastUncertainty ?? {}) : null
  };
}

 function normalizeBoundaryConditions(boundary = {}) {
  return {
    mode: FLOW_FIELD_BOUNDARY_MODES.includes(boundary.mode) ? boundary.mode : 'deflectAlongShore',
    topologyAware: boundary.topologyAware !== false,
    shoreRiskRadius: clamp(finiteNumber(boundary.shoreRiskRadius, 3), 1, 8),
    dampenIntoLand: clamp(finiteNumber(boundary.dampenIntoLand, 0.78), 0, 1),
    deflectStrength: clamp(finiteNumber(boundary.deflectStrength, 0.42), 0, 1)
  };
}

 function normalizeCurrentFieldLayers(layers = [], { basePreset = 'uniformDrift' } = {}) {
  const source = Array.isArray(layers) ? layers : [];
  return source.slice(0, FLOW_FIELD_MAX_LAYERS).map((layer, index) => ({
    id: String(layer?.id ?? `layer-${index + 1}`),
    preset: normalizeFlowPreset(layer?.preset ?? nextLayerPreset(basePreset, index)),
    weight: clamp(Number(layer?.weight ?? 0.5), 0, 2),
    enabled: layer?.enabled !== false,
    influence: FLOW_FIELD_LAYER_INFLUENCES.includes(layer?.influence) ? layer.influence : 'global',
    evolutionBehavior: normalizeEvolutionBehavior(layer?.evolutionBehavior),
    evolutionSpeed: normalizeEvolutionSpeed(layer?.evolutionSpeed ?? 1),
    timeMode: normalizeTimeMode(layer?.timeMode, 'dynamic', normalizeEvolutionBehavior(layer?.evolutionBehavior)),
    frameInterpolation: normalizeFrameInterpolation(layer?.frameInterpolation ?? layer?.interpolation),
    directionVariation: normalizeVariationLevel(layer?.directionVariation),
    magnitudeVariation: normalizeVariationLevel(layer?.magnitudeVariation),
    cycleDurationHours: normalizeCycleDurationHours(layer?.cycleDurationHours ?? layer?.cycleDuration ?? 24),
    pocket: normalizePocket(layer?.pocket, index),
    partition: normalizePartition(layer?.partition, index)
  }));
}

 function createDefaultCurrentFieldLayer(existingLayers = [], basePreset = 'uniformDrift') {
  const layers = normalizeCurrentFieldLayers(existingLayers, { basePreset });
  const index = layers.length;
  return {
    id: `layer-${Date.now().toString(36)}-${index + 1}`,
    preset: nextLayerPreset(basePreset, index),
    weight: 0.45,
    enabled: true,
    influence: 'global',
    evolutionBehavior: 'continuous',
    evolutionSpeed: 1,
    timeMode: 'continuous',
    frameInterpolation: 'linear',
    directionVariation: 'medium',
    magnitudeVariation: 'medium',
    cycleDurationHours: 24,
    pocket: normalizePocket(null, index),
    partition: normalizePartition(null, index)
  };
}

 function currentFieldConfigToGeneratorConfig(currentFieldConfig = {}, context = {}) {
  const normalized = normalizeCurrentFieldConfig(currentFieldConfig, context);
  return {
    currentFieldConfig: normalized,
    currentPreset: normalized.basePreset,
    vectorPreset: normalized.basePreset,
    currentStrength: normalized.strength,
    currentVariability: currentFieldVariationToNumber(normalized),
    temporalEvolution: normalized.fieldMode !== 'static'
  };
}

 function currentFieldVariationToNumber(config = {}) {
  return Math.max(
    variationLevelToNumber(config.directionVariation),
    variationLevelToNumber(config.magnitudeVariation)
  );
}

 function variationLevelToNumber(level = 'medium') {
  if (level === 'off') return 0;
  if (level === 'low') return 0.25;
  if (level === 'high') return 0.85;
  return 0.55;
}

 function summarizeCurrentFieldConfig(config = {}) {
  const normalized = normalizeCurrentFieldConfig(config);
  const preset = VECTOR_FIELD_PRESETS[normalized.basePreset]?.label ?? labelize(normalized.basePreset);
  const mode = normalized.fieldMode === 'dynamic' ? 'Dynamic' : 'Static';
  const behavior = normalized.fieldMode === 'dynamic' ? `, ${labelize(normalized.evolutionBehavior)}, ${labelize(normalized.timeMode)}, ${normalized.evolutionSpeed}x` : '';
  const layers = normalized.layers.filter((layer) => layer.enabled && layer.weight > 0);
  const layerText = layers.length
    ? ` Layers: ${layers.map((layer) => `${VECTOR_FIELD_PRESETS[layer.preset]?.label ?? labelize(layer.preset)} ${layer.weight.toFixed(2)}x`).join(' + ')}.`
    : ' No additive layers.';
  return `${mode} ${preset}${behavior}.${layerText}`;
}

function normalizeStochasticCurrentConfig(config = {}) {
  return {
    forecastConfidence: FLOW_FIELD_STOCHASTIC_CONFIDENCE_LEVELS.includes(config.forecastConfidence) ? config.forecastConfidence : 'medium',
    uncertaintyGrowth: FLOW_FIELD_UNCERTAINTY_GROWTH_LEVELS.includes(config.uncertaintyGrowth) ? config.uncertaintyGrowth : 'moderate',
    hiddenTruthVariation: FLOW_FIELD_HIDDEN_TRUTH_VARIATION_LEVELS.includes(config.hiddenTruthVariation) ? config.hiddenTruthVariation : 'medium',
    forecastRefresh: config.forecastRefresh === 'none' ? 'none' : 'surfaceWindows'
  };
}

function normalizeTopologyComposite(value) {
  if (!value) return null;
  if (Array.isArray(value)) return { regions: value };
  if (typeof value !== 'object') return null;
  return {
    ...value,
    dynamicComplexity: normalizeDynamicComplexity(value.dynamicComplexity ?? value.randomness ?? 'medium'),
    assignedBehaviors: value.assignedBehaviors ?? null,
    evolutionBehavior: value.evolutionBehavior ?? null,
    regions: Array.isArray(value.regions) ? value.regions.map((region, index) => ({
      id: String(region?.id ?? `region-${index + 1}`),
      maskType: String(region?.maskType ?? region?.type ?? 'openWater'),
      behavior: String(region?.behavior ?? region?.preset ?? 'uniformDrift'),
      weight: clamp(finiteNumber(region?.weight, 0.5), 0, 2),
      phase: finiteNumber(region?.phase, 0),
      speedScale: clamp(finiteNumber(region?.speedScale, 1), 0.1, 4),
      magnitudeScale: clamp(finiteNumber(region?.magnitudeScale, 1), 0.1, 4),
      driftRadius: clamp(finiteNumber(region?.driftRadius, 0), 0, 1),
      meanderAmplitude: clamp(finiteNumber(region?.meanderAmplitude, 0), 0, 1),
      pulseScale: clamp(finiteNumber(region?.pulseScale, 0.5), 0, 2),
      textureScale: clamp(finiteNumber(region?.textureScale, 0.5), 0, 2)
    })) : []
  };
}

function normalizeFieldMode(value = 'dynamic') {
  return FLOW_FIELD_MODES.includes(value) ? value : 'dynamic';
}

function normalizeEvolutionBehavior(value = 'continuous') {
  return FLOW_FIELD_EVOLUTION_BEHAVIORS.includes(value) ? value : 'continuous';
}

function normalizeTimeMode(value, fieldMode = 'dynamic', evolutionBehavior = 'continuous') {
  if (FLOW_FIELD_TIME_MODES.includes(value)) return value;
  if (fieldMode === 'static') return 'clamped';
  if (evolutionBehavior === 'looping') return 'looping';
  if (evolutionBehavior === 'pulse') return 'clamped';
  return 'continuous';
}

function normalizeFrameInterpolation(value = 'linear') {
  return FLOW_FIELD_FRAME_INTERPOLATION_MODES.includes(value) ? value : 'linear';
}

function normalizeVariationLevel(value = 'medium') {
  return FLOW_FIELD_VARIATION_LEVELS.includes(value) ? value : 'medium';
}

function normalizeDynamicComplexity(value = 'medium') {
  if (FLOW_FIELD_DYNAMIC_COMPLEXITY_LEVELS.includes(value)) return value;
  if (value === 'off') return 'low';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric >= 0.7 ? 'high' : numeric <= 0.35 ? 'low' : 'medium';
  return 'medium';
}

function strongestVariation(directionVariation, magnitudeVariation) {
  const score = Math.max(variationLevelToNumber(directionVariation), variationLevelToNumber(magnitudeVariation));
  return score >= 0.7 ? 'high' : score <= 0.35 ? 'low' : 'medium';
}

function normalizeEvolutionSpeed(value = 1) {
  const number = finiteNumber(value, 1);
  return FLOW_FIELD_EVOLUTION_SPEEDS.includes(number) ? number : clamp(number, 0.1, 12);
}

function normalizeCycleDurationHours(value = 24) {
  const number = finiteNumber(value, 24);
  return FLOW_FIELD_CYCLE_DURATIONS_HOURS.includes(number) ? number : clamp(number, 1, 240);
}

function normalizeFlowPreset(value = 'uniformDrift') {
  const preset = VectorFieldPresets.normalizeVectorPreset(value);
  return FLOW_FIELD_PRESET_CHOICES.includes(preset) ? preset : 'uniformDrift';
}

function nextLayerPreset(basePreset, index) {
  const candidates = ['eddyField', 'tidalOscillation', 'meanderingJet', 'curlNoise', 'stormPulse', 'uniformDrift'];
  return candidates.find((candidate, candidateIndex) => candidate !== basePreset && candidateIndex >= index) ?? 'eddyField';
}

function normalizePocket(value = {}, index = 0) {
  return {
    x: clamp(finiteNumber(value?.x, index % 2 ? 0.68 : 0.34), 0, 1),
    y: clamp(finiteNumber(value?.y, index % 3 ? 0.58 : 0.38), 0, 1),
    radius: clamp(finiteNumber(value?.radius, 0.28), 0.05, 1),
    softness: clamp(finiteNumber(value?.softness, 0.12), 0.01, 0.6)
  };
}

function normalizePartition(value = {}, index = 0) {
  return {
    type: value?.type === 'horizontal' ? 'horizontal' : 'vertical',
    side: value?.side === 'right' || value?.side === 'bottom' ? value.side : (index % 2 ? 'right' : 'left'),
    softness: clamp(finiteNumber(value?.softness, 0.08), 0.01, 0.5)
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

module.exports = {FLOW_FIELD_MODES, FLOW_FIELD_EVOLUTION_BEHAVIORS, FLOW_FIELD_EVOLUTION_SPEEDS, FLOW_FIELD_TIME_MODES, FLOW_FIELD_FRAME_INTERPOLATION_MODES, FLOW_FIELD_VARIATION_LEVELS, FLOW_FIELD_DYNAMIC_COMPLEXITY_LEVELS, FLOW_FIELD_LAYER_INFLUENCES, FLOW_FIELD_BOUNDARY_MODES, FLOW_FIELD_CYCLE_DURATIONS_HOURS, FLOW_FIELD_MAX_LAYERS, FLOW_FIELD_PRESET_CHOICES, FLOW_FIELD_STOCHASTIC_CONFIDENCE_LEVELS, FLOW_FIELD_UNCERTAINTY_GROWTH_LEVELS, FLOW_FIELD_HIDDEN_TRUTH_VARIATION_LEVELS, createDefaultCurrentFieldConfig, normalizeCurrentFieldConfig, normalizeBoundaryConditions, normalizeCurrentFieldLayers, createDefaultCurrentFieldLayer, currentFieldConfigToGeneratorConfig, currentFieldVariationToNumber, variationLevelToNumber, summarizeCurrentFieldConfig}