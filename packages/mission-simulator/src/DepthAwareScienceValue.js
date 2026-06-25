import { sampleWaterColumnScalar } from './WaterColumnFieldModel.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  waterColumnLayerMetadata
} from './WaterColumnProfileRuntime.js';
import { depthScienceScoreProfileMetadata } from './DepthScoringProfiles.js';

export const DEPTH_AWARE_SCIENCE_VALUE_VERSION = 'depth-aware-science-value-three-r1-2a-2';
export const DEPTH_OBJECTIVE_WEIGHT_PROFILE_VERSION = 'depth-objective-weight-profile-three-r1-2a-2';

export const OBJECTIVE_DEPTH_WEIGHT_PROFILES = Object.freeze({
  generalSurvey: profile('generalSurvey', 'General survey', { surface: 1, shallow: 1, thermocline: 1, midwater: 1, deep: 1 }, 0.12),
  surfaceBloom: profile('surfaceBloom', 'Surface bloom', { surface: 1.4, shallow: 1.15, thermocline: 0.55, midwater: 0.25, deep: 0.1 }, 0.08),
  thermoclineFront: profile('thermoclineFront', 'Thermocline front', { surface: 0.35, shallow: 0.8, thermocline: 1.55, midwater: 0.8, deep: 0.35 }, 0.14),
  deepPlume: profile('deepPlume', 'Deep plume', { surface: 0.1, shallow: 0.25, thermocline: 0.7, midwater: 1.15, deep: 1.6 }, 0.14),
  integratedHydrographicProfile: profile('integratedHydrographicProfile', 'Integrated hydrographic profile', { surface: 1, shallow: 1.05, thermocline: 1.15, midwater: 1.05, deep: 1 }, 0.32),
  forecastValidation: profile('forecastValidation', 'Forecast validation', { surface: 0.85, shallow: 1, thermocline: 1.2, midwater: 1, deep: 0.85 }, 0.1),
  hiddenEventConfirmation: profile('hiddenEventConfirmation', 'Hidden event confirmation', { surface: 0.45, shallow: 0.8, thermocline: 1.15, midwater: 1.2, deep: 1.15 }, 0.12),
  boundaryMapping: profile('boundaryMapping', 'Boundary mapping', { surface: 0.75, shallow: 1, thermocline: 1.35, midwater: 1.1, deep: 0.75 }, 0.14),
  uncertaintyReduction: profile('uncertaintyReduction', 'Uncertainty reduction', { surface: 1, shallow: 1, thermocline: 1.1, midwater: 1, deep: 1 }, 0.1),
  cooperativeCoverage: profile('cooperativeCoverage', 'Cooperative coverage', { surface: 1, shallow: 1, thermocline: 1, midwater: 1, deep: 1 }, 0.22)
});

const OBJECTIVE_ALIASES = Object.freeze({
  bloom: 'surfaceBloom',
  surface: 'surfaceBloom',
  surface_bloom: 'surfaceBloom',
  thermocline: 'thermoclineFront',
  front: 'thermoclineFront',
  thermocline_front: 'thermoclineFront',
  plume: 'deepPlume',
  deep: 'deepPlume',
  deep_plume: 'deepPlume',
  integrated: 'integratedHydrographicProfile',
  profile: 'integratedHydrographicProfile',
  hydrographic: 'integratedHydrographicProfile',
  forecast: 'forecastValidation',
  forecast_validation: 'forecastValidation',
  hidden: 'hiddenEventConfirmation',
  hidden_event: 'hiddenEventConfirmation',
  boundary: 'boundaryMapping',
  mapping: 'boundaryMapping',
  uncertainty: 'uncertaintyReduction',
  coverage: 'cooperativeCoverage',
  cooperative: 'cooperativeCoverage'
});

const LAYER_BASELINE_FACTORS = Object.freeze({
  surface: 1,
  shallow: 1.08,
  thermocline: 1.28,
  midwater: 1.14,
  deep: 1.2
});

export function objectiveDepthWeightProfileById(id = 'generalSurvey') {
  const normalized = normalizeObjectiveWeightProfileId(id);
  return cloneProfile(OBJECTIVE_DEPTH_WEIGHT_PROFILES[normalized]);
}

export function inferObjectiveWeightProfileId(missionObjective = null, fallback = 'generalSurvey') {
  const candidates = [
    missionObjective?.objectiveWeightProfileId,
    missionObjective?.depthWeightProfileId,
    missionObjective?.scienceObjectiveId,
    missionObjective?.objectiveId,
    missionObjective?.id,
    missionObjective?.type,
    missionObjective?.kind,
    typeof missionObjective === 'string' ? missionObjective : null
  ].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeObjectiveWeightProfileId(candidate, null);
    if (normalized) return normalized;
    const lower = String(candidate).trim().toLowerCase();
    for (const [alias, target] of Object.entries(OBJECTIVE_ALIASES)) {
      if (lower.includes(alias)) return target;
    }
  }
  return normalizeObjectiveWeightProfileId(fallback);
}

export function evaluateDepthAwareSampleValue(options = {}) {
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.config ?? options);
  const observation = options.observation ?? {};
  const position = normalizePosition(options.position ?? observation ?? options);
  const depthLayerId = normalizeWaterColumnLayerId(
    options.depthLayerId ?? options.depthLayer ?? observation.depthLayerId ?? observation.depthLayer ?? config.depthLayerIds[Math.max(0, Math.round(Number(observation.zIndex ?? options.zIndex ?? 0) || 0))],
    config.depthLayerIds[0] ?? 'surface'
  );
  const metadata = waterColumnLayerMetadata(depthLayerId);
  const depthMeters = finiteNumber(options.depthMeters ?? observation.depthMeters ?? metadata.nominalDepthMeters, 0);
  const timeSeconds = finiteNumber(options.timeSeconds ?? observation.timeSeconds ?? options.t, 0);
  const scoreProfile = depthScienceScoreProfileMetadata(options.scoreProfile ?? options.scoreProfileId ?? 'depthAwareScienceV1', {
    layerSchemaVersion: config.version,
    objectiveWeightProfileId: options.objectiveWeightProfileId
  });
  const objectiveWeightProfileId = inferObjectiveWeightProfileId(options.missionObjective ?? options.objective ?? null, scoreProfile.objectiveWeightProfileId);
  const objectiveProfile = objectiveDepthWeightProfileById(objectiveWeightProfileId);
  const observationType = options.observationType ?? observation.observationType ?? 'depthLayerSample';
  const integratedSample = observationType === 'integratedWaterColumnSample' || options.allowIntegratedProfileCredit === true;
  const priorityField = options.priorityField ?? options.A_global_depth ?? options.depthPriorityField ?? options.fieldPack?.fields?.A_global ?? null;
  const topDownField = options.A_global_topdown ?? options.topDownPriorityField ?? null;
  const fallbackBase = finiteNumber(
    options.priorityValue ?? observation.priorityValue ?? observation.observedValue ?? observation.value ?? observation.sampleValue ?? options.value,
    0
  );
  const baseDepthPriority = round(resolveBaseDepthPriority({
    priorityField,
    topDownField,
    x: position.x,
    y: position.y,
    depthLayerId,
    config,
    fallbackBase,
    objectiveProfile,
    integratedSample
  }));
  const targetLayerId = normalizeOptionalLayer(options.targetDepthLayerId ?? options.missionObjective?.targetDepthLayerId ?? options.objective?.targetDepthLayerId, config, depthLayerId);
  const targetLayerOverlap = round(depthLayerOverlap(depthLayerId, targetLayerId, config));
  const objectiveLayerWeight = round(finiteNumber(objectiveProfile.weights[depthLayerId], 1));
  const objectiveMatchValue = round(baseDepthPriority * objectiveLayerWeight * targetLayerOverlap * 0.55);
  const informationGainValue = round(resolveInformationGain(options, observation));
  const discoveryValue = round(finiteNumber(options.discoveryValue ?? observation.discoveryValue ?? options.unknownEventState?.confirmationValue, 0));
  const forecastValidationValue = round(resolveForecastValidation(options, observation));
  const boundaryValue = round(finiteNumber(options.boundaryValue ?? observation.boundaryValue ?? options.boundaryState?.gradientMagnitude, 0) * 0.35);
  const sensorCompatibilityFactor = round(sensorCompatibility(depthLayerId, options.sensorProfile));
  const measurementQualityFactor = round(clamp01(options.measurementQuality ?? observation.measurementQuality ?? observation.quality ?? 1));
  const redundancy = redundancyDiagnostics({
    position,
    depthLayerId,
    depthMeters,
    timeSeconds,
    samplingHistory: options.samplingHistory,
    fleetSamplingHistory: options.fleetSamplingHistory
  });
  const verticalCoverageContribution = round(verticalCoverageContributionForLayer(depthLayerId, objectiveProfile, options.samplingHistory));
  const sampleScienceGain = round(baseDepthPriority + objectiveMatchValue + informationGainValue + discoveryValue + forecastValidationValue + boundaryValue);
  const combinedFactor = sensorCompatibilityFactor
    * measurementQualityFactor
    * redundancy.noveltyFactor
    * redundancy.spatialRedundancyFactor
    * redundancy.temporalRedundancyFactor
    * redundancy.verticalRedundancyFactor;
  const totalScienceValue = round((sampleScienceGain * combinedFactor) + verticalCoverageContribution);
  const warnings = [];
  if (!priorityField && fallbackBase <= 0) warnings.push('No depth priority field or observation value was available; credited science defaults to zero.');
  if (!integratedSample && topDownField) warnings.push('Top-down priority was available but not awarded to an ordinary depth-layer sample.');
  if (sensorCompatibilityFactor < 1) warnings.push(`Sensor profile is only partially compatible with ${depthLayerId}.`);

  return {
    type: 'anchor.science.depth-aware-sample-value',
    version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    scoreProfile,
    position,
    depthMeters: round(depthMeters),
    depthLayerId,
    timeSeconds: round(timeSeconds),
    observationType,
    totalScienceValue,
    sampleScienceGain,
    baseDepthPriority,
    objectiveMatchValue,
    informationGainValue,
    discoveryValue,
    forecastValidationValue,
    boundaryValue,
    sensorCompatibilityFactor,
    measurementQualityFactor,
    noveltyFactor: redundancy.noveltyFactor,
    spatialRedundancyFactor: redundancy.spatialRedundancyFactor,
    temporalRedundancyFactor: redundancy.temporalRedundancyFactor,
    verticalRedundancyFactor: redundancy.verticalRedundancyFactor,
    targetLayerOverlap,
    verticalCoverageContribution,
    objectiveWeightProfileId,
    objectiveLayerWeight,
    redundancyDiagnostics: redundancy,
    warnings,
    boundaryFlags: {
      publicSafe: true,
      hiddenTruthIncluded: false,
      usesActualObservationDepthForScoring: true,
      predictedSampleCreatesScore: false,
      awardsIntegratedValueToSurfaceSample: false,
      topDownPriorityAwardedDirectly: integratedSample === true,
      usesFree3DPlanning: false,
      ownsRendering: false,
      ownsSimulation: false,
      operationallyValidated: false
    }
  };
}

export function evaluateDepthAwareProfileValue(options = {}) {
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.config ?? options);
  const sourceSamples = normalizeProfileSamples(options.samples ?? options.observations ?? []);
  const history = normalizeHistory(options.samplingHistory);
  const evaluatedSamples = [];
  const warnings = [];
  for (const sample of sourceSamples) {
    const result = evaluateDepthAwareSampleValue({
      ...options,
      observation: sample,
      position: sample,
      depthLayerId: sample.depthLayerId ?? sample.depthLayer,
      depthMeters: sample.depthMeters,
      timeSeconds: sample.timeSeconds ?? sample.t,
      samplingHistory: history,
      allowIntegratedProfileCredit: sample.observationType === 'integratedWaterColumnSample'
    });
    evaluatedSamples.push(result);
    history.push({
      x: result.position.x,
      y: result.position.y,
      depthLayerId: result.depthLayerId,
      depthMeters: result.depthMeters,
      timeSeconds: result.timeSeconds
    });
    warnings.push(...result.warnings);
  }
  const scoreEvents = evaluatedSamples.map((sample, index) => depthAwareSampleScoreEvent(sample, {
    sampleId: sourceSamples[index]?.sampleId ?? sourceSamples[index]?.observationId ?? `profile-sample-${index + 1}`,
    agentId: sourceSamples[index]?.agentId ?? sourceSamples[index]?.gliderId ?? options.agentId ?? options.gliderId ?? 'glider-1'
  }));
  return {
    type: 'anchor.science.depth-aware-profile-value',
    version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    sampleCount: evaluatedSamples.length,
    totalScienceValue: round(evaluatedSamples.reduce((sum, sample) => sum + sample.totalScienceValue, 0)),
    samples: evaluatedSamples,
    scoreEvents,
    summary: summarizeDepthAwareScoreEvents(scoreEvents, {
      waterColumnConfig: config,
      scoreProfile: options.scoreProfile ?? options.scoreProfileId ?? 'depthAwareScienceV1'
    }),
    warnings: [...new Set(warnings)],
    boundaryFlags: {
      creditedFromActualSamples: options.prediction !== true,
      predictedValueOnly: options.prediction === true,
      awardsIntegratedValueToSurfaceSample: false,
      usesFree3DPlanning: false,
      publicSafe: true
    }
  };
}

export function validateDepthAwareScienceValue(result = {}) {
  const errors = [];
  const warnings = [...(result.warnings ?? [])];
  if (!String(result.type ?? '').startsWith('anchor.science.depth-aware-')) errors.push('Depth-aware science value result has an unexpected type.');
  if (!Number.isFinite(Number(result.totalScienceValue))) errors.push('Total science value must be finite.');
  if (result.boundaryFlags?.hiddenTruthIncluded === true) errors.push('Depth-aware science value result must not include hidden truth.');
  if (result.boundaryFlags?.usesFree3DPlanning === true) errors.push('Depth-aware science value result must not claim free 3D planning.');
  if (result.boundaryFlags?.awardsIntegratedValueToSurfaceSample === true) errors.push('Ordinary surface samples must not claim integrated top-down value.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function depthAwareScienceValueSummary(result = {}) {
  if (Array.isArray(result.events)) return summarizeDepthAwareScoreEvents(result.events, result);
  if (Array.isArray(result.scoreEvents)) return summarizeDepthAwareScoreEvents(result.scoreEvents, result);
  if (Array.isArray(result.samples)) {
    return {
      type: 'anchor.science.depth-aware-profile-value-summary',
      version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
      sampleCount: result.sampleCount ?? result.samples.length,
      totalScienceValue: round(result.totalScienceValue),
      verticalCoverage: result.summary?.verticalCoverage ?? null,
      scienceValueByDepthLayer: result.summary?.scienceValueByDepthLayer ?? {},
      publicSafe: true
    };
  }
  return {
    type: 'anchor.science.depth-aware-sample-value-summary',
    version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    totalScienceValue: round(result.totalScienceValue),
    depthLayerId: result.depthLayerId ?? null,
    baseDepthPriority: round(result.baseDepthPriority),
    objectiveMatchValue: round(result.objectiveMatchValue),
    informationGainValue: round(result.informationGainValue),
    redundancyFactor: round((result.noveltyFactor ?? 1) * (result.spatialRedundancyFactor ?? 1) * (result.temporalRedundancyFactor ?? 1) * (result.verticalRedundancyFactor ?? 1)),
    warnings: result.warnings ?? [],
    publicSafe: true
  };
}

export function depthAwareSampleScoreEvent(sampleValue = {}, options = {}) {
  const componentValues = {
    baseDepthPriority: round(sampleValue.baseDepthPriority),
    objectiveMatchValue: round(sampleValue.objectiveMatchValue),
    informationGainValue: round(sampleValue.informationGainValue),
    discoveryValue: round(sampleValue.discoveryValue),
    forecastValidationValue: round(sampleValue.forecastValidationValue),
    boundaryValue: round(sampleValue.boundaryValue)
  };
  const factors = {
    sensorCompatibilityFactor: round(sampleValue.sensorCompatibilityFactor ?? 1),
    measurementQualityFactor: round(sampleValue.measurementQualityFactor ?? 1),
    noveltyFactor: round(sampleValue.noveltyFactor ?? 1),
    spatialRedundancyFactor: round(sampleValue.spatialRedundancyFactor ?? 1),
    temporalRedundancyFactor: round(sampleValue.temporalRedundancyFactor ?? 1),
    verticalRedundancyFactor: round(sampleValue.verticalRedundancyFactor ?? 1)
  };
  const agentId = options.agentId ?? sampleValue.agentId ?? sampleValue.gliderId ?? 'agent-1';
  return {
    type: 'anchor.score.depth-aware-sample',
    version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    sampleId: options.sampleId ?? sampleValue.sampleId ?? `${agentId}:${Math.round(sampleValue.position?.x ?? 0)},${Math.round(sampleValue.position?.y ?? 0)}:${sampleValue.depthLayerId ?? 'surface'}:${Math.round(sampleValue.timeSeconds ?? 0)}`,
    agentId,
    position: sampleValue.position ?? null,
    depthMeters: round(sampleValue.depthMeters),
    depthLayerId: sampleValue.depthLayerId ?? null,
    timeSeconds: round(sampleValue.timeSeconds),
    totalScienceValue: round(options.creditedScienceValue ?? sampleValue.totalScienceValue),
    rawScienceValue: round(sampleValue.totalScienceValue),
    componentValues,
    factors,
    objectiveIds: [sampleValue.objectiveWeightProfileId ?? options.objectiveWeightProfileId ?? 'generalSurvey'],
    warningCodes: (sampleValue.warnings ?? []).map((warning) => warningCode(warning)),
    scoreProfileId: sampleValue.scoreProfile?.scoreProfileId ?? options.scoreProfileId ?? 'depthAwareScienceV1',
    scoreProfileVersion: sampleValue.scoreProfile?.scoreProfileVersion ?? DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    boundaryFlags: sampleValue.boundaryFlags ?? {}
  };
}

export function summarizeDepthAwareScoreEvents(events = [], options = {}) {
  const scoreProfile = depthScienceScoreProfileMetadata(options.scoreProfile ?? options.scoreProfileId ?? 'depthAwareScienceV1');
  const config = normalizeWaterColumnConfig(options.waterColumnConfig ?? options.config ?? { depthLayerIds: uniqueLayers(events) });
  const layerIds = config.depthLayerIds.length ? config.depthLayerIds : uniqueLayers(events);
  const samplesByDepthLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const scienceValueByDepthLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const rawValueByDepthLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const informationGainByLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const objectiveContributionByLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const redundancyPenaltyByLayer = Object.fromEntries(layerIds.map((id) => [id, 0]));
  const eventIds = new Set();
  let duplicateScoreEventCount = 0;
  let maximumActualDepthMeters = 0;
  for (const event of events.filter((entry) => entry?.type === 'anchor.score.depth-aware-sample')) {
    const layerId = event.depthLayerId ?? 'surface';
    if (eventIds.has(event.sampleId)) duplicateScoreEventCount += 1;
    eventIds.add(event.sampleId);
    samplesByDepthLayer[layerId] = (samplesByDepthLayer[layerId] ?? 0) + 1;
    scienceValueByDepthLayer[layerId] = round((scienceValueByDepthLayer[layerId] ?? 0) + Number(event.totalScienceValue ?? 0));
    rawValueByDepthLayer[layerId] = round((rawValueByDepthLayer[layerId] ?? 0) + Number(event.rawScienceValue ?? event.totalScienceValue ?? 0));
    informationGainByLayer[layerId] = round((informationGainByLayer[layerId] ?? 0) + Number(event.componentValues?.informationGainValue ?? 0));
    objectiveContributionByLayer[layerId] = round((objectiveContributionByLayer[layerId] ?? 0) + Number(event.componentValues?.objectiveMatchValue ?? 0));
    const raw = Number(event.rawScienceValue ?? event.totalScienceValue ?? 0);
    const credited = Number(event.totalScienceValue ?? 0);
    redundancyPenaltyByLayer[layerId] = round((redundancyPenaltyByLayer[layerId] ?? 0) + Math.max(0, raw - credited));
    maximumActualDepthMeters = Math.max(maximumActualDepthMeters, Number(event.depthMeters ?? 0));
  }
  const totalScienceScore = round(Object.values(scienceValueByDepthLayer).reduce((sum, value) => sum + Number(value ?? 0), 0));
  const sampledLayerIds = Object.entries(samplesByDepthLayer).filter(([_id, count]) => count > 0).map(([id]) => id);
  return {
    type: 'anchor.science.depth-aware-score-summary',
    version: DEPTH_AWARE_SCIENCE_VALUE_VERSION,
    scoreProfileId: scoreProfile.scoreProfileId,
    scoreProfileVersion: scoreProfile.scoreProfileVersion,
    depthAware: scoreProfile.depthAware,
    totalScienceScore,
    totalSamples: events.filter((entry) => entry?.type === 'anchor.score.depth-aware-sample').length,
    samplesByDepthLayer,
    scienceValueByDepthLayer,
    rawValueByDepthLayer,
    informationGainByLayer,
    objectiveContributionByLayer,
    redundancyPenaltyByLayer,
    verticalCoverage: verticalCoverageLabel(sampledLayerIds.length, layerIds.length),
    sampledLayerIds,
    maximumActualDepthMeters: round(maximumActualDepthMeters),
    canonicalScoreEventCount: eventIds.size,
    uiScoreEventCount: events.filter((entry) => entry?.type === 'anchor.score.depth-aware-sample').length,
    duplicateScoreEventCount,
    browserHeadlessParityStatus: options.browserHeadlessParityStatus ?? 'not_checked',
    usesActualObservationDepthForScoring: true,
    awardsIntegratedValueToSurfaceSample: false,
    usesFree3DPlanning: false,
    ownsRendering: false,
    operationallyValidated: false,
    publicSafe: true
  };
}

function resolveBaseDepthPriority({ priorityField, topDownField, x, y, depthLayerId, config, fallbackBase, objectiveProfile, integratedSample }) {
  if (priorityField) {
    const sampled = sampleWaterColumnScalar(priorityField, x, y, depthLayerId, config);
    if (Number.isFinite(Number(sampled))) return Number(sampled);
  }
  if (integratedSample && topDownField) {
    const row = Math.max(0, Math.round(Number(y) || 0));
    const col = Math.max(0, Math.round(Number(x) || 0));
    const sampled = Number(topDownField?.[row]?.[col]);
    if (Number.isFinite(sampled)) return sampled;
  }
  const layerFactor = finiteNumber(LAYER_BASELINE_FACTORS[depthLayerId], 1);
  const objectiveFactor = Math.max(0.1, finiteNumber(objectiveProfile.weights[depthLayerId], 1));
  return fallbackBase * layerFactor * Math.min(1.6, objectiveFactor);
}

function resolveInformationGain(options, observation) {
  const explicit = options.informationGainValue ?? observation.informationGainValue;
  if (Number.isFinite(Number(explicit))) return Number(explicit);
  const uncertainty = finiteNumber(options.uncertaintyValue ?? observation.uncertaintyValue ?? options.uncertaintyState?.value, 0);
  const prior = finiteNumber(options.beliefState?.priorUncertainty, uncertainty);
  const posterior = finiteNumber(options.beliefState?.posteriorUncertainty, Math.max(0, uncertainty * 0.55));
  return Math.max(0, prior - posterior) * 0.65;
}

function resolveForecastValidation(options, observation) {
  const explicit = options.forecastValidationValue ?? observation.forecastValidationValue;
  if (Number.isFinite(Number(explicit))) return Number(explicit);
  const innovation = Number(observation.innovation ?? options.innovation);
  if (Number.isFinite(innovation)) return Math.abs(innovation) * 0.45;
  const forecast = Number(observation.forecastValue ?? options.forecastValue);
  const observed = Number(observation.observedValue ?? observation.value ?? options.observedValue);
  return Number.isFinite(forecast) && Number.isFinite(observed) ? Math.abs(observed - forecast) * 0.35 : 0;
}

function sensorCompatibility(depthLayerId, sensorProfile = null) {
  if (!sensorProfile) return 1;
  const layers = sensorProfile.compatibleDepthLayerIds ?? sensorProfile.depthLayerIds ?? sensorProfile.layers;
  if (Array.isArray(layers) && layers.length && !layers.includes(depthLayerId)) return 0.35;
  const minDepth = Number(sensorProfile.minDepthMeters ?? -Infinity);
  const maxDepth = Number(sensorProfile.maxDepthMeters ?? Infinity);
  const depth = Number(waterColumnLayerMetadata(depthLayerId).nominalDepthMeters ?? 0);
  if (Number.isFinite(minDepth) && depth < minDepth) return 0.5;
  if (Number.isFinite(maxDepth) && depth > maxDepth) return 0.5;
  return 1;
}

function redundancyDiagnostics({ position, depthLayerId, depthMeters, timeSeconds, samplingHistory, fleetSamplingHistory }) {
  const history = [...normalizeHistory(samplingHistory), ...normalizeHistory(fleetSamplingHistory)];
  let nearestSpatial = Infinity;
  let nearestTemporal = Infinity;
  let nearestVertical = Infinity;
  let sameLayerCount = 0;
  let sameBinCount = 0;
  for (const entry of history) {
    const dx = Number(entry.x ?? 0) - position.x;
    const dy = Number(entry.y ?? 0) - position.y;
    const spatial = Math.hypot(dx, dy);
    nearestSpatial = Math.min(nearestSpatial, spatial);
    nearestTemporal = Math.min(nearestTemporal, Math.abs(Number(entry.timeSeconds ?? entry.t ?? 0) - timeSeconds));
    const vertical = Math.abs(Number(entry.depthMeters ?? waterColumnLayerMetadata(entry.depthLayerId ?? entry.depthLayer ?? 'surface').nominalDepthMeters ?? 0) - depthMeters);
    nearestVertical = Math.min(nearestVertical, vertical);
    if ((entry.depthLayerId ?? entry.depthLayer) === depthLayerId) {
      sameLayerCount += 1;
      if (spatial <= 0.75 && vertical <= 8) sameBinCount += 1;
    }
  }
  const noveltyFactor = sameBinCount > 0 ? round(1 / (1 + sameBinCount * 0.75)) : 1;
  const spatialRedundancyFactor = Number.isFinite(nearestSpatial) && nearestSpatial <= 0.5 ? 0.65 : 1;
  const temporalRedundancyFactor = Number.isFinite(nearestTemporal) && nearestTemporal <= 30 ? 0.75 : 1;
  const verticalRedundancyFactor = sameLayerCount > 0 && Number.isFinite(nearestVertical) && nearestVertical <= 8 ? 0.72 : 1;
  return {
    depthBinId: `${depthLayerId}:${Math.round(depthMeters / 10) * 10}m`,
    priorSampleCount: history.length,
    sameLayerSampleCount: sameLayerCount,
    sameDepthBinSampleCount: sameBinCount,
    verticalDistanceFromNearestPriorSample: Number.isFinite(nearestVertical) ? round(nearestVertical) : null,
    noveltyFactor,
    spatialRedundancyFactor: round(spatialRedundancyFactor),
    temporalRedundancyFactor: round(temporalRedundancyFactor),
    verticalRedundancyFactor: round(verticalRedundancyFactor),
    creditedValue: null
  };
}

function verticalCoverageContributionForLayer(depthLayerId, objectiveProfile, samplingHistory) {
  const history = normalizeHistory(samplingHistory);
  const seenLayers = new Set(history.map((entry) => entry.depthLayerId ?? entry.depthLayer).filter(Boolean));
  return seenLayers.has(depthLayerId) ? 0 : objectiveProfile.coverageBonus;
}

function normalizeProfileSamples(samples = []) {
  return (Array.isArray(samples) ? samples : []).filter(Boolean).map((sample, index) => ({
    ...sample,
    observationId: sample.observationId ?? sample.sampleId ?? `sample-${index + 1}`
  }));
}

function normalizeHistory(history = null) {
  if (!history) return [];
  if (history instanceof Map) {
    return [...history.entries()].map(([key, value]) => {
      const [xy, depthLayerId = value?.depthLayerId] = String(key).split(':');
      const [x, y] = xy.split(',').map(Number);
      return { x, y, depthLayerId, ...value };
    });
  }
  if (Array.isArray(history)) return history.filter(Boolean).map((entry) => ({
    x: Number(entry.x ?? entry.position?.x ?? 0),
    y: Number(entry.y ?? entry.position?.y ?? 0),
    depthLayerId: entry.depthLayerId ?? entry.depthLayer ?? entry.position?.depthLayerId ?? 'surface',
    depthMeters: Number(entry.depthMeters ?? 0),
    timeSeconds: Number(entry.timeSeconds ?? entry.t ?? 0)
  }));
  return [];
}

function normalizePosition(value = {}) {
  return {
    x: finiteNumber(value.x ?? value.col, 0),
    y: finiteNumber(value.y ?? value.row, 0)
  };
}

function normalizeOptionalLayer(value, config, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const layerId = normalizeWaterColumnLayerId(value, fallback);
  return config.depthLayerIds.includes(layerId) ? layerId : fallback;
}

function depthLayerOverlap(sampleLayerId, targetLayerId, config) {
  if (!targetLayerId || sampleLayerId === targetLayerId) return 1;
  const sampleIndex = config.depthLayerIds.indexOf(sampleLayerId);
  const targetIndex = config.depthLayerIds.indexOf(targetLayerId);
  if (sampleIndex < 0 || targetIndex < 0) return 0;
  const distance = Math.abs(sampleIndex - targetIndex);
  if (distance === 1) return 0.55;
  if (distance === 2) return 0.2;
  return 0;
}

function normalizeObjectiveWeightProfileId(value, fallback = 'generalSurvey') {
  const text = String(value ?? '').trim();
  if (OBJECTIVE_DEPTH_WEIGHT_PROFILES[text]) return text;
  const compact = text.replace(/[^a-z0-9]/gi, '').toLowerCase();
  for (const id of Object.keys(OBJECTIVE_DEPTH_WEIGHT_PROFILES)) {
    if (id.toLowerCase() === compact) return id;
  }
  const alias = OBJECTIVE_ALIASES[text.toLowerCase()] ?? OBJECTIVE_ALIASES[compact];
  if (alias) return alias;
  return fallback;
}

function uniqueLayers(events = []) {
  const ids = [...new Set((Array.isArray(events) ? events : []).map((event) => event?.depthLayerId).filter(Boolean))];
  return ids.length ? ids : ['surface'];
}

function verticalCoverageLabel(coveredCount, totalCount) {
  if (coveredCount <= 1) return 'surface-limited';
  if (coveredCount < Math.min(3, totalCount)) return 'partial';
  return 'broad';
}

function profile(id, label, weights, coverageBonus) {
  return Object.freeze({ id, label, version: DEPTH_OBJECTIVE_WEIGHT_PROFILE_VERSION, weights: Object.freeze({ ...weights }), coverageBonus, explicit: true });
}

function cloneProfile(value) {
  return { ...value, weights: { ...(value?.weights ?? {}) } };
}

function warningCode(warning) {
  return String(warning ?? 'warning').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'warning';
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, finiteNumber(value, 0)));
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
