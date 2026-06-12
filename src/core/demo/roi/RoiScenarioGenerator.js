import { createDemoRoiField } from '../DemoRoiFields.js';
import { sampleFieldBehaviorSignature } from '../SampleFieldBehaviorExplainers.js';
import { sampleFieldBehaviorPresetById } from '../SampleFieldBehaviorPresets.js';
import { roiProcessContractForPreset } from './RoiProcessContracts.js';
import { referenceSignatureForPreset, referenceSignatureMetadata } from './RoiReferenceSignatures.js';
import { validateRoiScenario } from './RoiScenarioValidation.js';

export const ROI_SCENARIO_TYPE = 'anchor.syntheticRoiScenario';
export const ROI_SCENARIO_VERSION = 'roi-scenario-v1';
export const ROI_SCENARIO_SOURCE_MODES = ['currentRecipe', 'behaviorFamily'];
export const ROI_SCENARIO_DIFFICULTIES = ['easy', 'medium', 'hard'];
export const ROI_SCENARIO_VALIDATION_MODES = ['requirePass', 'allowWarn'];

export function generateRoiScenario({
  family = 'recurringHotspots',
  seed = 'roi-scenario',
  difficulty = 'medium',
  grid = { width: 24, height: 16 },
  duration = 120,
  frameCount = 25,
  componentRecipe = null,
  processContract = null,
  patternSource = null,
  referenceSignatureId = null,
  referenceSignatureModified = false,
  sourceMode = 'behaviorFamily',
  requireValidation = false
} = {}) {
  const normalizedSourceMode = ROI_SCENARIO_SOURCE_MODES.includes(sourceMode) ? sourceMode : 'behaviorFamily';
  const normalizedDifficulty = ROI_SCENARIO_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  const normalizedGrid = normalizeGrid(grid);
  const normalizedFrameCount = Math.max(1, Math.min(240, Math.round(Number(frameCount) || 25)));
  const normalizedDuration = Math.max(0, Number(duration) || 120);
  const preset = sampleFieldBehaviorPresetById(family);
  const baseConfig = normalizedSourceMode === 'currentRecipe'
    ? recipeConfigFromComponentRecipe(componentRecipe)
    : { ...(preset?.config ?? recipeConfigFromComponentRecipe(componentRecipe)) };
  const scenarioFamily = preset?.id ?? family ?? 'custom';
  const referenceSignature = referenceSignatureMetadata(referenceSignatureId, referenceSignatureModified)
    ?? referenceSignatureMetadata(referenceSignatureForPreset(preset?.id ?? family)?.id, false);
  const scenarioProcessContract = processContract ?? roiProcessContractForPreset(preset?.id ?? scenarioFamily, baseConfig);
  const sampledParameters = sampleScenarioParameters({
    seed,
    difficulty: normalizedDifficulty,
    recipe: baseConfig,
    processContract: scenarioProcessContract
  });
  const scenarioConfig = {
    ...baseConfig,
    ...sampledParameters.config,
    seed,
    timeMode: baseConfig.timeMode ?? 'dynamic'
  };
  const times = sampleTimes(normalizedDuration, normalizedFrameCount);
  const frames = times.map((time, index) => buildScenarioFrame({
    config: scenarioConfig,
    grid: normalizedGrid,
    time,
    index,
    family: scenarioFamily,
    processContract: scenarioProcessContract
  }));
  const componentRecipeOut = componentRecipeFromConfig(scenarioConfig, scenarioProcessContract);
  const diagnostics = summarizeFrames(frames);
  const labels = scenarioLabels({
    family: scenarioFamily,
    config: scenarioConfig,
    processContract: scenarioProcessContract,
    diagnostics
  });
  const scenarioId = scenarioIdentity({
    family: scenarioFamily,
    seed,
    difficulty: normalizedDifficulty,
    grid: normalizedGrid,
    frameCount: normalizedFrameCount,
    sourceMode: normalizedSourceMode,
    componentRecipe: componentRecipeOut
  });
  const scenario = {
    type: ROI_SCENARIO_TYPE,
    schemaVersion: '1.0',
    scenarioVersion: ROI_SCENARIO_VERSION,
    scenarioId,
    family: scenarioFamily,
    seed,
    difficulty: normalizedDifficulty,
    grid: normalizedGrid,
    time: {
      durationSeconds: round3(normalizedDuration),
      frameCount: frames.length,
      timesSeconds: times
    },
    sourceMode: normalizedSourceMode,
    patternSource: patternSource ?? (referenceSignature ? 'referenceSignature' : scenarioFamily === 'custom' ? 'custom' : 'legacyPreset'),
    recipe: scenarioConfig,
    componentRecipe: componentRecipeOut,
    referenceSignatureId: referenceSignature?.id ?? null,
    referenceSignatureLabel: referenceSignature?.label ?? null,
    referenceSignatureAliases: referenceSignature?.aliases ?? [],
    referenceSignatureCategory: referenceSignature?.category ?? null,
    referenceSignatureModified: Boolean(referenceSignature?.modified),
    referenceModels: referenceSignature?.referenceModels ?? [],
    referenceCoverageTags: referenceSignature?.referenceCoverageTags ?? [],
    referenceCatalogVersion: referenceSignature?.referenceCatalogVersion ?? null,
    caTaxonomy: referenceSignature?.caTaxonomy ?? null,
    expectedObservableSignature: referenceSignature?.expectedObservableSignature ?? null,
    qaExpectations: referenceSignature?.qaExpectations ?? null,
    phenotypeMetrics: referenceSignature?.phenotypeMetrics ?? null,
    genotypeNotes: referenceSignature?.genotypeNotes ?? null,
    taxonomyJustification: referenceSignature?.taxonomyJustification ?? null,
    referenceRoiInterpretation: referenceSignature?.roiInterpretation ?? null,
    referenceFailureSigns: referenceSignature?.failureSigns ?? [],
    componentDefaults: referenceSignature?.componentDefaults ?? null,
    processContract: scenarioProcessContract,
    sampledParameters,
    frames,
    labels,
    behaviorSignature: sampleFieldBehaviorSignature(scenarioFamily, scenarioProcessContract),
    diagnostics,
    metadata: {
      createdAt: new Date().toISOString(),
      patternSource: patternSource ?? (referenceSignature ? 'referenceSignature' : scenarioFamily === 'custom' ? 'custom' : 'legacyPreset'),
      referenceSignatureMetadata: referenceSignature,
      legacyPresetId: patternSource === 'legacyPreset' ? scenarioFamily : null,
      deterministicIdentity: scenarioId,
      recipeFingerprint: recipeFingerprint(componentRecipeOut),
      simplifiedAnalogProcess: true,
      scientificBoundary: 'Synthetic ROI scenarios are simplified observable event-pattern generators, not validated wildfire, crime, rainfall, ecological, or hydrodynamic simulators.'
    }
  };
  const validation = validateRoiScenario(scenario);
  return {
    ...scenario,
    validation,
    exportAllowed: validation.status === 'PASS' || (!requireValidation && validation.status === 'WARN')
  };
}

function buildScenarioFrame({ config, grid, time, index, family, processContract }) {
  const field = createDemoRoiField({
    ...config,
    grid,
    time,
    demoTime: time,
    behaviorPresetId: family
  });
  const graphField = field.graphField ?? {};
  const activityDiagnostics = field.activityDiagnostics ?? {};
  const graphDiagnostics = graphField.diagnostics ?? activityDiagnostics.graphDiagnostics ?? {};
  const fields = {
    displayedValue: cloneField(field.field),
    sampleValue: cloneField(field.sampleValueField ?? field.field),
    S: cloneField(field.sampleValueField ?? field.field),
    eventLikelihood: cloneField(field.eventLikelihoodField),
    L: cloneField(field.eventLikelihoodField),
    rawBaseValue: cloneField(field.rawBaseField),
    evolvedValue: cloneField(field.evolvedField),
    graphState: cloneField(graphField.stateField),
    graphActivation: cloneField(graphField.activationField),
    graphCommunityId: graphCommunityField(graphField),
    graphClusterLikelihood: cloneField(graphField.clusterLikelihoodField),
    graphIncomingMessage: cloneField(graphField.incomingMessageField),
    transitionField: cloneField(graphField.transitionField)
  };
  return {
    index,
    timeSeconds: round3(time),
    fields,
    likelihoodField: cloneLikelihoodField(field.likelihoodField),
    graphField: cloneGraphSummary(graphField),
    edgeMessages: cloneMessages(graphField.edgeMessages),
    graphTopMessages: cloneMessages(topGraphMessages(graphField)),
    nodeTransitions: cloneTransitions(graphField.nodeTransitions),
    activityDiagnostics,
    graphDiagnostics,
    labels: frameLabels({
      fields,
      activityDiagnostics,
      graphDiagnostics,
      graphField,
      processContract
    })
  };
}

function sampleScenarioParameters({ seed, difficulty, recipe, processContract }) {
  const difficultyScale = difficulty === 'hard' ? 1.3 : difficulty === 'easy' ? 0.78 : 1;
  const jitter = seededUnit(`${seed}:scenario:jitter`);
  const baseHotspots = Math.max(1, Math.round(Number(recipe.hotspotCount ?? 3) || 3));
  const hotspotJitter = Math.round((jitter - 0.5) * (difficulty === 'hard' ? 2 : 1));
  const hotspotCount = clampInt(baseHotspots + hotspotJitter, 1, 8, baseHotspots);
  const baseNoise = Number(recipe.noise ?? 0.15);
  const noise = clampRange(baseNoise + (seededUnit(`${seed}:scenario:noise`) - 0.5) * 0.16 * difficultyScale, 0, 0.5);
  const phaseOffsetSeconds = round3(seededUnit(`${seed}:scenario:phase`) * 12 * difficultyScale);
  return {
    config: {
      hotspotCount,
      noise: round3(noise)
    },
    difficultyScale,
    phaseOffsetSeconds,
    seededVariation: {
      hotspotJitter,
      noiseDelta: round3(noise - baseNoise),
      processClass: processContract?.processClass ?? 'component_composition'
    }
  };
}

function validateSourceRecipe(value) {
  return value && typeof value === 'object' ? value : {};
}

function recipeConfigFromComponentRecipe(componentRecipe = {}) {
  const recipe = validateSourceRecipe(componentRecipe);
  return {
    ...recipe,
    eventLikelihood: recipe.eventLikelihood ?? 'multiModalLikelihood',
    eventLikelihoodDynamics: recipe.eventLikelihoodDynamics ?? 'static',
    eventLikelihoodTemporalPattern: recipe.eventLikelihoodTemporalPattern ?? 'static',
    eventLikelihoodSpatialEvolution: recipe.eventLikelihoodSpatialEvolution ?? 'stationary',
    spatialPattern: recipe.spatialPattern ?? recipe.pureSpatialPattern ?? 'clusteredField',
    hotspotCount: recipe.hotspotCount ?? recipe.clusterCount ?? 3,
    clusterSize: recipe.clusterSize ?? 'medium',
    noise: recipe.noise ?? 0.15,
    valueDistribution: recipe.valueDistribution ?? 'gaussianNormal',
    temporalPattern: recipe.temporalPattern ?? 'bursty',
    temporalBehavior: recipe.temporalBehavior ?? 'bursty',
    spatialEvolution: recipe.spatialEvolution ?? recipe.patternEvolution ?? recipe.evolutionModel ?? 'stationary',
    patternEvolution: recipe.patternEvolution ?? recipe.spatialEvolution ?? recipe.evolutionModel ?? 'stationary',
    evolutionModel: recipe.evolutionModel ?? recipe.spatialEvolution ?? recipe.patternEvolution ?? 'stationary',
    motionScope: recipe.motionScope ?? 'perFeature',
    interactionScale: recipe.interactionScale ?? 'hybrid',
    stateModel: recipe.stateModel ?? 'stateEvolving',
    depletionMode: recipe.depletionMode ?? recipe.samplingEffect ?? 'soft',
    displayMode: recipe.displayMode ?? recipe.displayLayer ?? 'sampleValueLikelihoodOverlay',
    timeMode: recipe.timeMode ?? 'dynamic',
    dynamicComplexity: recipe.dynamicComplexity ?? 'medium'
  };
}

function componentRecipeFromConfig(config, processContract) {
  return {
    eventLikelihood: config.eventLikelihood,
    spatialPattern: config.spatialPattern,
    valueDistribution: config.valueDistribution,
    temporalPattern: config.temporalPattern,
    spatialEvolution: config.spatialEvolution ?? config.patternEvolution ?? config.evolutionModel,
    interactionScale: config.interactionScale ?? processContract?.interactionScale ?? 'hybrid',
    stateModel: config.stateModel,
    samplingEffect: config.depletionMode,
    displayLayer: config.displayMode,
    motionScope: config.motionScope,
    dynamicComplexity: config.dynamicComplexity,
    eventLikelihoodDynamics: config.eventLikelihoodDynamics,
    eventLikelihoodTemporalPattern: config.eventLikelihoodTemporalPattern,
    eventLikelihoodSpatialEvolution: config.eventLikelihoodSpatialEvolution
  };
}

function scenarioLabels({ family, config, processContract, diagnostics }) {
  return {
    behaviorFamily: family,
    processClass: processContract?.processClass ?? 'component_composition',
    interactionScale: config.interactionScale ?? processContract?.interactionScale ?? 'hybrid',
    dominantSpatialPattern: config.spatialPattern,
    valueDistribution: config.valueDistribution,
    dominantTemporalPattern: config.temporalPattern,
    dominantStateModel: config.stateModel,
    spatialEvolution: config.spatialEvolution,
    hasPropagation: ['neighborPropagation', 'branchingGrowth', 'expansion', 'divergence'].includes(config.spatialEvolution),
    hasMovingFeature: ['continuousDrift', 'randomWalk', 'discreteJump', 'expansion', 'contraction', 'divergence', 'convergence', 'morphMutation', 'shearStretch', 'rotationalSwirl', 'branchingGrowth'].includes(config.spatialEvolution),
    hasSyntheticDeformation: ['expansion', 'contraction', 'divergence', 'convergence', 'shearStretch', 'rotationalSwirl', 'morphMutation'].includes(config.spatialEvolution),
    hasRareValueShape: ['heavyTailed', 'rareExtremeEvents', 'bimodalValues'].includes(config.valueDistribution),
    hasRecurringBasins: ['recurringHotspots', 'oscillatingEcologicalField'].includes(family) || config.eventLikelihood === 'multiModalLikelihood',
    hasFreshness: ['freshnessAge', 'revisitRecovery'].includes(config.depletionMode),
    hasConsumedState: config.depletionMode === 'hard' || family === 'forestFireFrontInspired',
    meanActiveFraction: diagnostics.meanActiveFraction,
    meanFrameDelta: diagnostics.meanFrameDelta
  };
}

function frameLabels({ fields, activityDiagnostics, graphDiagnostics, graphField, processContract }) {
  const sample = fields.sampleValue ?? [];
  return {
    activeCellCount: countCells(sample, 0.35),
    highValueCellCount: countCells(sample, 0.68),
    activeCommunityCount: graphDiagnostics?.activeClusterCount ?? graphDiagnostics?.activeCommunityCount ?? null,
    frontLength: graphDiagnostics?.frontLength ?? activityDiagnostics?.frontLength ?? null,
    largestActiveComponent: activityDiagnostics?.largestComponentSize ?? activityDiagnostics?.largestActiveComponent ?? null,
    centroid: fieldCentroid(sample, 0.35),
    topHotspots: topCells(sample, 5, 0.5),
    stateCounts: graphDiagnostics?.stateCounts ?? {},
    messageCount: Number(graphDiagnostics?.edgeMessageCount ?? graphDiagnostics?.edgeMessageTotal ?? graphField?.edgeMessages?.length ?? 0),
    processClass: processContract?.processClass ?? null
  };
}

function summarizeFrames(frames) {
  const active = frames.map((frame) => Number(frame.activityDiagnostics?.activeFraction ?? frame.labels?.activeCellCount ?? 0));
  const high = frames.map((frame) => Number(frame.activityDiagnostics?.highValueFraction ?? 0));
  const deltas = [];
  for (let index = 1; index < frames.length; index += 1) {
    deltas.push(meanFieldDelta(frames[index - 1].fields.sampleValue, frames[index].fields.sampleValue));
  }
  const stateCounts = {};
  const graphMetrics = frames.map((frame) => frame.graphDiagnostics ?? frame.activityDiagnostics?.graphDiagnostics ?? {});
  for (const frame of frames) {
    for (const [state, count] of Object.entries(frame.labels?.stateCounts ?? {})) {
      stateCounts[state] = (stateCounts[state] ?? 0) + Number(count ?? 0);
    }
  }
  return {
    frameCount: frames.length,
    meanActiveFraction: round3(mean(active)),
    meanHighValueFraction: round3(mean(high)),
    maxActiveFraction: round3(Math.max(0, ...active)),
    minActiveFraction: round3(Math.min(...active, 0)),
    meanFrameDelta: round3(mean(deltas)),
    maxFrameDelta: round3(Math.max(0, ...deltas)),
    meanMessageCount: round3(mean(frames.map((frame) => Number(frame.labels?.messageCount ?? 0)))),
    meanEmittedMessageCount: round3(mean(graphMetrics.map((metric) => Number(metric.emittedEdgeMessageCount ?? 0)))),
    meanTransitionCount: round3(mean(graphMetrics.map((metric) => Number(metric.nodeTransitionCount ?? 0)))),
    meanFrontLength: round3(mean(graphMetrics.map((metric) => Number(metric.frontLength ?? 0)))),
    meanComponentCount: round3(mean(graphMetrics.map((metric) => Number(metric.componentCount ?? 0)))),
    meanActiveClusterCount: round3(mean(graphMetrics.map((metric) => Number(metric.activeClusterCount ?? 0)))),
    meanLikelihoodSampleCorrelation: round3(mean(graphMetrics.map((metric) => Number(metric.likelihoodSampleCorrelation ?? 0)))),
    aggregateStateCounts: stateCounts
  };
}

function sampleTimes(duration, frameCount) {
  const count = Math.max(1, Math.min(240, Math.round(Number(frameCount) || 1)));
  const end = Math.max(0, Number(duration) || 0);
  if (count === 1) return [0];
  return Array.from({ length: count }, (_entry, index) => round3(end * index / Math.max(1, count - 1)));
}

function scenarioIdentity({ family, seed, difficulty, grid, frameCount, sourceMode, componentRecipe }) {
  const familyText = String(family ?? 'custom').replace(/[^a-z0-9-]/gi, '');
  const seedText = String(seed ?? 'seed').replace(/[^a-z0-9-]/gi, '').slice(0, 28) || 'seed';
  const fingerprint = recipeFingerprint(componentRecipe).slice(0, 6);
  return `roi-${familyText}-${difficulty}-${seedText}-${grid.width}x${grid.height}-${frameCount}f-${sourceMode}-${fingerprint}`;
}

function recipeFingerprint(recipe) {
  return hashText(JSON.stringify(recipe ?? {}));
}

function normalizeGrid(grid) {
  return {
    width: Math.max(1, Math.round(Number(grid?.width) || 24)),
    height: Math.max(1, Math.round(Number(grid?.height) || 16))
  };
}

function cloneField(field) {
  return Array.isArray(field) ? field.map((row) => Array.isArray(row) ? row.map(cloneValue) : row) : null;
}

function cloneValue(value) {
  if (value && typeof value === 'object') return { ...value };
  return value;
}

function cloneLikelihoodField(model) {
  if (!model) return null;
  return {
    ...model,
    values: cloneField(model.values),
    nodes: clonePlainArray(model.nodes),
    diagnostics: model.diagnostics ? { ...model.diagnostics } : null,
    graphField: model.graphField ? { ...model.graphField } : null
  };
}

function cloneGraphSummary(graphField) {
  if (!graphField) return null;
  return {
    graph: graphField.graph ? { ...graphField.graph } : null,
    topology: graphField.topology,
    updateRule: graphField.updateRule,
    processMetadata: graphField.processMetadata ? { ...graphField.processMetadata } : null,
    diagnostics: graphField.diagnostics ? { ...graphField.diagnostics } : null,
    stateField: cloneField(graphField.stateField),
    activationField: cloneField(graphField.activationField),
    communityIdField: graphCommunityField(graphField),
    clusterLikelihoodField: cloneField(graphField.clusterLikelihoodField),
    incomingMessageField: cloneField(graphField.incomingMessageField),
    transitionField: cloneField(graphField.transitionField),
    clusters: clonePlainArray(graphField.clusters)
  };
}

function cloneMessages(messages = []) {
  return clonePlainArray(messages).slice(0, 160);
}

function cloneTransitions(transitions = []) {
  return clonePlainArray(transitions).slice(0, 160);
}

function clonePlainArray(values = []) {
  return Array.isArray(values) ? values.map((entry) => entry && typeof entry === 'object' ? JSON.parse(JSON.stringify(entry)) : entry) : [];
}

function graphCommunityField(graphField) {
  const nodeGrid = graphField?.nodeGrid ?? [];
  if (!nodeGrid.length) return null;
  return nodeGrid.map((row) => row.map((node) => node?.communityId ?? null));
}

function topGraphMessages(graphField, maxEdges = 120) {
  const emitted = graphField?.edgeMessages ?? [];
  if (emitted.length) {
    return emitted
      .filter((message) => Number(message.messageStrength ?? message.strength ?? 0) > 0)
      .sort((a, b) => Number(b.messageStrength ?? b.strength ?? 0) - Number(a.messageStrength ?? a.strength ?? 0))
      .slice(0, maxEdges);
  }
  return [];
}

function topCells(field, maxCount, threshold) {
  const cells = [];
  for (let row = 0; row < (field?.length ?? 0); row += 1) {
    for (let col = 0; col < (field[row]?.length ?? 0); col += 1) {
      const value = Number(field[row][col] ?? 0);
      if (value >= threshold) cells.push({ col, row, value: round3(value) });
    }
  }
  return cells.sort((a, b) => b.value - a.value).slice(0, maxCount);
}

function countCells(field, threshold) {
  return (field ?? []).flat().filter((value) => Number(value ?? 0) >= threshold).length;
}

function fieldCentroid(field, threshold) {
  let total = 0;
  let x = 0;
  let y = 0;
  for (let row = 0; row < (field?.length ?? 0); row += 1) {
    for (let col = 0; col < (field[row]?.length ?? 0); col += 1) {
      const value = Number(field[row][col] ?? 0);
      if (value < threshold) continue;
      total += value;
      x += col * value;
      y += row * value;
    }
  }
  if (total <= 0) return null;
  return { col: round3(x / total), row: round3(y / total) };
}

function meanFieldDelta(previous, next) {
  const height = Math.min(previous?.length ?? 0, next?.length ?? 0);
  if (!height) return 0;
  let total = 0;
  let count = 0;
  for (let row = 0; row < height; row += 1) {
    const width = Math.min(previous[row]?.length ?? 0, next[row]?.length ?? 0);
    for (let col = 0; col < width; col += 1) {
      total += Math.abs(Number(next[row][col] ?? 0) - Number(previous[row][col] ?? 0));
      count += 1;
    }
  }
  return count ? total / count : 0;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}

function hashText(text) {
  return Math.floor(seededUnit(text) * 1e10).toString(36).toUpperCase().padStart(6, '0');
}

function seededUnit(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967295);
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
