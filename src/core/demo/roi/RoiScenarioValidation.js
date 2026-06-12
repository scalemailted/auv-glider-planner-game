import { validateSampleFieldPreset } from '../SampleFieldPresetAudit.js';
import { sampleFieldBehaviorSignature } from '../SampleFieldBehaviorExplainers.js';
import { sampleFieldBehaviorPresetById } from '../SampleFieldBehaviorPresets.js';
import { roiProcessContractForPreset } from './RoiProcessContracts.js';
import { formatObservableSignature, referenceSignatureById, referenceSignatureForPreset } from './RoiReferenceSignatures.js';

export function validateRoiScenario(input = {}) {
  const family = input.family ?? input.presetId ?? 'custom';
  const preset = sampleFieldBehaviorPresetById(input.presetId ?? family);
  const contract = input.processContract ?? roiProcessContractForPreset(preset?.id ?? family, input.recipe ?? preset?.config ?? {});
  const referenceSignature = referenceSignatureById(input.referenceSignatureId) ?? referenceSignatureForPreset(preset?.id ?? family);
  const frames = input.frames ?? [];
  const diagnostics = input.diagnostics ?? summarizeFrames(frames);
  const signatureChecks = {
    ...genericSignatureChecks(frames, diagnostics),
    ...(referenceSignature ? {} : familySignatureChecks({ family, processClass: contract.processClass, frames, diagnostics })),
    ...referenceSignatureChecks({ referenceSignature, frames, diagnostics }),
    ...valueDistributionChecks(input.recipe?.valueDistribution ?? preset?.config?.valueDistribution, frames, diagnostics)
  };
  const failures = Object.entries(signatureChecks)
    .filter(([_key, check]) => check.status === 'FAIL')
    .map(([key, check]) => `${key}: ${check.message}`);
  const warnings = Object.entries(signatureChecks)
    .filter(([_key, check]) => check.status === 'WARN')
    .map(([key, check]) => `${key}: ${check.message}`);
  const presetValidation = preset ? validateSampleFieldPreset(preset.id, { seed: input.seed ?? 'roi-scenario' }) : null;
  for (const warning of presetValidation?.warnings ?? []) warnings.push(`preset_audit: ${warning}`);
  const status = failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
  const behaviorSignature = input.behaviorSignature ?? sampleFieldBehaviorSignature(preset?.id ?? family, contract);
  return {
    family,
    presetId: preset?.id ?? null,
    processClass: contract.processClass,
    validationSignature: contract.validationSignature ?? [],
    status,
    warnings,
    failures,
    metrics: diagnostics,
    signatureChecks,
    humanSummary: scenarioHumanSummary({ status, family, processClass: contract.processClass, warnings, failures, behaviorSignature, referenceSignature }),
    observablePattern: behaviorSignature.observablePattern,
    referenceSignatureId: referenceSignature?.id ?? null,
    referenceSignatureLabel: referenceSignature?.label ?? null,
    caTaxonomy: referenceSignature?.caTaxonomy ?? null,
    qaExpectationsUsed: referenceSignature?.qaExpectations ?? null,
    phenotypeMetrics: referenceSignature?.phenotypeMetrics ?? null,
    genotypeNotes: referenceSignature?.genotypeNotes ?? null,
    signaturePassCriteria: referenceSignature?.qaExpectations?.passCriteria ?? [],
    signatureWarnCriteria: referenceSignature?.qaExpectations?.warnCriteria ?? [],
    signatureFailCriteria: referenceSignature?.qaExpectations?.failCriteria ?? [],
    roiMeaning: behaviorSignature.roiMeaning,
    recommendedFixes: recommendedFixes({ status, warnings, failures, family }),
    presetValidation
  };
}

function genericSignatureChecks(frames, diagnostics) {
  return {
    framesPresent: check(frames.length > 0, 'No scenario frames were generated.'),
    noExtinction: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) >= 0.02, Number(diagnostics.maxActiveFraction ?? 0) >= 0.04, 'Scenario is nearly empty across frames.'),
    noFullSaturation: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) <= 0.94, Number(diagnostics.maxActiveFraction ?? 0) <= 0.98, 'Scenario activates nearly the whole domain.'),
    nonzeroTemporalVariation: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) >= 0.01, Number(diagnostics.meanFrameDelta ?? 0) >= 0.004, 'Frame-to-frame variation is low for a bounded scenario export.'),
    boundedFrameFlicker: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) <= 0.42, Number(diagnostics.meanFrameDelta ?? 0) <= 0.58, 'Frame-to-frame variation is high enough to resemble random flicker.')
  };
}

function familySignatureChecks({ family, processClass, frames, diagnostics }) {
  if (family === 'recurringHotspots' || processClass === 'recurring_cluster_bursts') return recurringHotspotsChecks(frames, diagnostics);
  if (['expandingFront', 'forestFireFrontInspired'].includes(family) || ['propagating_front', 'front_burnout_analog'].includes(processClass)) return frontChecks(frames, diagnostics);
  if (['patchyRainfall', 'driftingStormCells'].includes(family) || ['intermittent_patch_field', 'drifting_compact_bursts'].includes(processClass)) return driftingRainfallChecks(frames, diagnostics);
  if (family === 'freshnessRevisitValue' || processClass === 'age_of_information_recovery') return freshnessChecks(frames, diagnostics);
  if (['bursty', 'randomPulses', 'rapidPulse', 'intermittent'].includes(dominantTemporalPattern(frames))) return temporalBurstChecks(frames, diagnostics);
  return {};
}

function recurringHotspotsChecks(frames, diagnostics) {
  const stateCounts = diagnostics.aggregateStateCounts ?? {};
  return {
    separatedBasins: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) > 0.04, Number(diagnostics.meanActiveFraction ?? 0) > 0.02, 'Recurring hotspot active fraction is too low to reveal basins.'),
    recurringActivation: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.035, Number(diagnostics.meanFrameDelta ?? 0) > 0.015, 'Recurring hotspot activation changes are weak.'),
    activeCoolingRecoveringStates: thresholdCheck((stateCounts.active ?? 0) > 0 && ((stateCounts.cooling ?? 0) + (stateCounts.recovering ?? 0)) > 0, (stateCounts.active ?? 0) > 0, 'Expected active plus cooling/recovering state evidence.'),
    noOneBlobCollapse: thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) < 0.35, Number(diagnostics.meanHighValueFraction ?? 0) < 0.55, 'High-value area may have collapsed into a broad blob.')
  };
}

function frontChecks(frames, diagnostics) {
  const stateCounts = diagnostics.aggregateStateCounts ?? {};
  const susceptible = Number(stateCounts.susceptible ?? 0);
  const consumed = Number(stateCounts.consumed ?? 0);
  return {
    activeBoundary: thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.03, Number(diagnostics.meanActiveFraction ?? 0) > 0.08, 'Front scenario lacks a visible active boundary.'),
    susceptibleAhead: thresholdCheck(susceptible > 0 || Number(diagnostics.meanMessageCount ?? 0) > 0, Number(diagnostics.meanActiveFraction ?? 0) > 0.05, 'No susceptible/near-front or message evidence was detected.'),
    consumedOrDepletedTrail: thresholdCheck(consumed > 0 || Number(diagnostics.meanFrameDelta ?? 0) > 0.03, Number(diagnostics.meanFrameDelta ?? 0) > 0.01, 'Consumed/depleted trail evidence is weak.'),
    localContinuity: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) < 0.85, Number(diagnostics.meanActiveFraction ?? 0) < 0.94, 'Front activates too much of the domain at once.')
  };
}

function temporalBurstChecks(_frames, diagnostics) {
  return {
    intermittentActivation: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.02, Number(diagnostics.meanFrameDelta ?? 0) > 0.008, 'Temporal burst variation is weak.'),
    basinConcentration: thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) < 0.3, Number(diagnostics.meanHighValueFraction ?? 0) < 0.5, 'Burst activity is too diffuse.'),
    noGlobalDrift: thresholdCheck(true, true, 'No global drift warning.')
  };
}

function driftingRainfallChecks(frames, diagnostics) {
  return {
    patchySpatialAutocorrelation: thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.005, Number(diagnostics.meanActiveFraction ?? 0) > 0.05, 'Patch activity is too sparse to inspect.'),
    coherentMovement: thresholdCheck(centroidMovement(frames) > 0.12 || Number(diagnostics.meanFrameDelta ?? 0) > 0.04, centroidMovement(frames) > 0.04 || Number(diagnostics.meanFrameDelta ?? 0) > 0.015, 'Movement or pulsing is weak.'),
    notFrameRandomNoise: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) < 0.35, Number(diagnostics.meanFrameDelta ?? 0) < 0.5, 'Frame delta is high enough to resemble noise.')
  };
}

function freshnessChecks(_frames, diagnostics) {
  const stateCounts = diagnostics.aggregateStateCounts ?? {};
  return {
    stationStructure: thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.02, Number(diagnostics.meanActiveFraction ?? 0) > 0.04, 'Monitoring/revisit structure is weak.'),
    coolingRecoveryStates: thresholdCheck((stateCounts.recovering ?? 0) > 0 || (stateCounts.cooling ?? 0) > 0, Number(diagnostics.meanFrameDelta ?? 0) > 0.006, 'Cooling/recovery evidence is weak.'),
    valueRecoveryOverTime: thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.008, Number(diagnostics.meanFrameDelta ?? 0) > 0.003, 'Recovery variation is weak.')
  };
}

function referenceSignatureChecks({ referenceSignature, frames, diagnostics }) {
  if (!referenceSignature) return {};
  const id = referenceSignature.id;
  const stateCounts = diagnostics.aggregateStateCounts ?? {};
  const hasMessages = Number(diagnostics.meanMessageCount ?? 0) > 0 || Number(diagnostics.meanEmittedMessageCount ?? 0) > 0;
  const hasTransitions = Number(diagnostics.meanTransitionCount ?? 0) > 0;
  const checks = {
    referenceNotEmpty: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) > 0.02, Number(diagnostics.maxActiveFraction ?? 0) > 0.03, `${referenceSignature.label} is nearly empty.`),
    referenceNotSaturated: thresholdCheck(Number(diagnostics.meanActiveFraction ?? 0) < 0.94, Number(diagnostics.maxActiveFraction ?? 0) < 0.98, `${referenceSignature.label} is too saturated.`)
  };
  if (id === 'frontPropagation') {
    checks.frontStructure = thresholdCheck(Number(diagnostics.meanFrontLength ?? 0) > 0 || (stateCounts.active ?? 0) > 0 && (stateCounts.susceptible ?? 0) > 0, Number(diagnostics.meanHighValueFraction ?? 0) > 0.04, 'Front propagation needs active boundary or transition structure.');
    checks.consumedTrail = thresholdCheck((stateCounts.consumed ?? 0) > 0 || (stateCounts.cooling ?? 0) > 0, Number(diagnostics.meanFrameDelta ?? 0) > 0.015, 'Consumed/depleted or cooling trail is weak.');
  } else if (id === 'waveExcitableMedia') {
    checks.crestEvidence = thresholdCheck((stateCounts.crest ?? 0) > 0 || (stateCounts.recovering ?? 0) > 0, Number(diagnostics.meanFrameDelta ?? 0) > 0.018, 'Wave/excitable signature needs crest or recovering states.');
    checks.motion = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.018, Number(diagnostics.meanFrameDelta ?? 0) > 0.006, 'Wave motion is too subtle.');
  } else if (id === 'birthDeathEmergence') {
    checks.localTransitions = thresholdCheck(hasTransitions || (stateCounts.alive ?? 0) > 0, Number(diagnostics.meanFrameDelta ?? 0) > 0.012, 'Birth/death transitions are weak.');
    checks.activeComponents = thresholdCheck(Number(diagnostics.meanComponentCount ?? 0) > 0, Number(diagnostics.meanActiveFraction ?? 0) > 0.04, 'No active emergent components were detected.');
  } else if (id === 'stationaryTemporalBursts') {
    checks.temporalBursts = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.02, Number(diagnostics.meanFrameDelta ?? 0) > 0.008, 'Stationary burst timing is weak.');
    checks.likelihoodRelationship = thresholdCheck(Number(diagnostics.meanLikelihoodSampleCorrelation ?? 0) > 0.08, true, 'Activity is weakly related to likelihood basins.');
  } else if (id === 'diffusionSpread') {
    checks.localSpread = thresholdCheck(hasMessages || Number(diagnostics.meanComponentCount ?? 0) > 0, Number(diagnostics.meanActiveFraction ?? 0) > 0.08, 'Diffusion/spread needs message or local component evidence.');
    checks.areaChange = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.01, Number(diagnostics.meanFrameDelta ?? 0) > 0.004, 'Spread variation is too subtle.');
  } else if (id === 'driftTransport') {
    checks.patchMovement = thresholdCheck(centroidMovement(frames) > 0.08 || Number(diagnostics.meanFrameDelta ?? 0) > 0.02, centroidMovement(frames) > 0.025, 'Drift/transport movement is weak.');
    checks.coherence = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) < 0.5, Number(diagnostics.meanFrameDelta ?? 0) < 0.62, 'Drift/transport resembles random flicker.');
  } else if (id === 'cyclicDominance') {
    checks.cyclicVariation = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.018, Number(diagnostics.meanFrameDelta ?? 0) > 0.006, 'Cyclic dominance is too static.');
    checks.multiRegion = thresholdCheck(Number(diagnostics.meanComponentCount ?? 0) > 1 || Number(diagnostics.meanActiveClusterCount ?? 0) > 1, Number(diagnostics.meanActiveFraction ?? 0) > 0.08, 'Cyclic dominance needs multi-region activity.');
  } else if (id === 'clusterFormation') {
    checks.domainCoherence = thresholdCheck(Number(diagnostics.meanComponentCount ?? 0) > 0 && Number(diagnostics.meanComponentCount ?? 0) < 28, Number(diagnostics.meanActiveFraction ?? 0) > 0.05, 'Cluster/domain coherence is weak.');
    checks.notPixelNoise = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) < 0.48, Number(diagnostics.meanFrameDelta ?? 0) < 0.62, 'Cluster formation resembles pixel noise.');
  } else if (id === 'avalancheBurstCascades') {
    checks.burstyCascade = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.025, Number(diagnostics.meanFrameDelta ?? 0) > 0.01, 'Avalanche/burst cascade timing is weak.');
    checks.rareHigh = thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.005, Number(diagnostics.maxActiveFraction ?? 0) > 0.04, 'Rare high-value cascade evidence is weak.');
  } else if (id === 'predatorPreyMigration') {
    checks.migrationOrCycle = thresholdCheck(centroidMovement(frames) > 0.06 || Number(diagnostics.meanFrameDelta ?? 0) > 0.018, Number(diagnostics.meanFrameDelta ?? 0) > 0.006, 'Predator-prey migration needs moving or oscillating patches.');
    checks.multiBasin = thresholdCheck(Number(diagnostics.meanActiveClusterCount ?? 0) > 1 || Number(diagnostics.meanComponentCount ?? 0) > 1, Number(diagnostics.meanActiveFraction ?? 0) > 0.05, 'Predator-prey signature needs multi-region activity.');
  } else if (id === 'freshnessRecovery') {
    checks.recoveryEvidence = thresholdCheck((stateCounts.recovering ?? 0) > 0 || (stateCounts.cooling ?? 0) > 0, Number(diagnostics.meanFrameDelta ?? 0) > 0.006, 'Freshness/recovery states are weak.');
    checks.stationStructure = thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.01, Number(diagnostics.meanActiveFraction ?? 0) > 0.04, 'Monitoring station or candidate-site structure is weak.');
  } else if (id === 'patternFormationMorphogenesis') {
    checks.morphingStructure = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.012, Number(diagnostics.meanFrameDelta ?? 0) > 0.004, 'Pattern formation / morphogenesis change is too subtle.');
    checks.structuredNotFlat = thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.01 && Number(diagnostics.meanActiveFraction ?? 0) > 0.04, Number(diagnostics.meanActiveFraction ?? 0) > 0.02, 'Spot/stripe or morphing structure is weak.');
  } else if (id === 'congestionDensityWaves') {
    checks.densityWaveMovement = thresholdCheck(centroidMovement(frames) > 0.05 || Number(diagnostics.meanFrameDelta ?? 0) > 0.014, Number(diagnostics.meanFrameDelta ?? 0) > 0.005, 'Congestion / density wave movement is weak.');
    checks.notFlatBand = thresholdCheck(Number(diagnostics.meanHighValueFraction ?? 0) > 0.01, Number(diagnostics.meanActiveFraction ?? 0) > 0.04, 'Density-wave contrast is weak.');
  } else if (id === 'structuredSignalPropagation') {
    checks.relayMessages = thresholdCheck(hasMessages || hasTransitions, Number(diagnostics.meanFrameDelta ?? 0) > 0.01, 'Structured signal propagation needs relay messages or state transitions.');
    checks.pulseTiming = thresholdCheck(Number(diagnostics.meanFrameDelta ?? 0) > 0.012, Number(diagnostics.meanFrameDelta ?? 0) > 0.004, 'Signal pulse timing is weak.');
  }
  return Object.fromEntries(Object.entries(checks).map(([key, value]) => [`reference:${key}`, value]));
}

function valueDistributionChecks(valueDistribution, frames, diagnostics) {
  const values = frames.flatMap((frame) => frame.fields?.sampleValue?.flat?.() ?? []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return {};
  const p25 = percentileSorted(values, 0.25);
  const p50 = percentileSorted(values, 0.5);
  const p75 = percentileSorted(values, 0.75);
  const p90 = percentileSorted(values, 0.9);
  const p99 = percentileSorted(values, 0.99);
  const rareExtremeFraction = values.filter((value) => value >= 0.9).length / values.length;
  if (valueDistribution === 'rareExtremeEvents') {
    return {
      rareExtremeVisible: thresholdCheck(rareExtremeFraction > 0, Number(diagnostics.meanHighValueFraction ?? 0) > 0.005, 'Rare Extreme Events did not produce visible extreme cells in exported frames.')
    };
  }
  if (valueDistribution === 'bimodalValues') {
    return {
      bimodalValueSeparation: thresholdCheck(p25 < 0.42 && p75 > 0.58, Math.abs(p75 - p25) > 0.18, 'Bimodal Values did not show clear low/high separation.')
    };
  }
  if (valueDistribution === 'heavyTailed') {
    return {
      heavyTailVisible: thresholdCheck((p99 - p90) > 0.035 || p99 > 0.75, p99 > p50 + 0.25, 'Heavy-Tailed values did not show a visible high tail.')
    };
  }
  if (valueDistribution === 'skewedLow') {
    return {
      lowSkewVisible: thresholdCheck(p50 < 0.55, p50 < 0.65, 'Skewed Low values are not visibly lower than mid-range.')
    };
  }
  if (valueDistribution === 'skewedHigh') {
    return {
      highSkewVisible: thresholdCheck(p50 > 0.42, p50 > 0.32, 'Skewed High values are not visibly elevated.')
    };
  }
  return {};
}

function summarizeFrames(frames) {
  const active = frames.map((frame) => Number(frame.activityDiagnostics?.activeFraction ?? 0));
  const high = frames.map((frame) => Number(frame.activityDiagnostics?.highValueFraction ?? 0));
  const deltas = [];
  for (let index = 1; index < frames.length; index += 1) {
    deltas.push(meanFieldDelta(frames[index - 1].fields?.sampleValue, frames[index].fields?.sampleValue));
  }
  const stateCounts = {};
  const graphMetrics = [];
  for (const frame of frames) {
    for (const [state, count] of Object.entries(frame.labels?.stateCounts ?? {})) {
      stateCounts[state] = (stateCounts[state] ?? 0) + Number(count ?? 0);
    }
    graphMetrics.push(frame.graphDiagnostics ?? frame.activityDiagnostics?.graphDiagnostics ?? {});
  }
  return {
    frameCount: frames.length,
    meanActiveFraction: round3(mean(active)),
    meanHighValueFraction: round3(mean(high)),
    maxActiveFraction: round3(Math.max(0, ...active)),
    meanFrameDelta: round3(mean(deltas)),
    meanMessageCount: round3(mean(graphMetrics.map((metric) => Number(metric.edgeMessageTotal ?? 0)))),
    meanEmittedMessageCount: round3(mean(graphMetrics.map((metric) => Number(metric.emittedEdgeMessageCount ?? 0)))),
    meanTransitionCount: round3(mean(graphMetrics.map((metric) => Number(metric.nodeTransitionCount ?? 0)))),
    meanFrontLength: round3(mean(graphMetrics.map((metric) => Number(metric.frontLength ?? 0)))),
    meanComponentCount: round3(mean(graphMetrics.map((metric) => Number(metric.componentCount ?? 0)))),
    meanActiveClusterCount: round3(mean(graphMetrics.map((metric) => Number(metric.activeClusterCount ?? 0)))),
    meanLikelihoodSampleCorrelation: round3(mean(graphMetrics.map((metric) => Number(metric.likelihoodSampleCorrelation ?? 0)))),
    aggregateStateCounts: stateCounts
  };
}

function check(pass, message) {
  return pass
    ? { status: 'PASS', message: 'ok' }
    : { status: 'FAIL', message };
}

function thresholdCheck(pass, warn, message) {
  if (pass) return { status: 'PASS', message: 'ok' };
  return warn ? { status: 'WARN', message } : { status: 'FAIL', message };
}

function scenarioHumanSummary({ status, family, processClass, warnings, failures, behaviorSignature, referenceSignature }) {
  if (referenceSignature) {
    const label = referenceSignature.label.toLowerCase();
    if (status === 'PASS') return `PASS: This seed expresses a ${label} signature: ${formatObservableSignature(referenceSignature.expectedObservableSignature)}`;
    if (status === 'WARN') return `WARN: This seed is a weak ${label} example because ${warnings[0] ?? 'review warnings'}.`;
    return `FAIL: This seed does not express the intended ${label} signature because ${failures[0] ?? 'review failures'}.`;
  }
  const pattern = behaviorSignature?.observablePattern ? ` ${behaviorSignature.observablePattern}` : '';
  if (status === 'PASS') return `PASS: This seed expresses the ${family} pattern for ${processClass}.${pattern}`;
  if (status === 'WARN') return `WARN: This seed is less representative because ${warnings[0] ?? 'review warnings'}. Try a different seed, duration, frame count, or component setting.`;
  return `FAIL: This seed does not express the intended ${family} pattern because ${failures[0] ?? 'review failures'}.`;
}

function recommendedFixes({ status, warnings, failures }) {
  if (status === 'PASS') return [];
  const text = [...warnings, ...failures].join(' ').toLowerCase();
  const fixes = ['Try a different scenario seed.'];
  if (text.includes('variation') || text.includes('weak')) fixes.push('Increase duration or frame count so temporal behavior is visible.');
  if (text.includes('empty') || text.includes('sparse')) fixes.push('Use medium/hard difficulty or increase hotspot count.');
  if (text.includes('saturation') || text.includes('whole domain')) fixes.push('Use easy/medium difficulty or lower noise/hotspot count.');
  return [...new Set(fixes)];
}

function dominantTemporalPattern(frames) {
  return frames.find((frame) => frame.activityDiagnostics?.temporalPattern)?.activityDiagnostics?.temporalPattern ?? null;
}

function centroidMovement(frames) {
  const centroids = frames.map((frame) => frame.labels?.centroid).filter(Boolean);
  if (centroids.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < centroids.length; index += 1) {
    total += Math.hypot(Number(centroids[index].col) - Number(centroids[index - 1].col), Number(centroids[index].row) - Number(centroids[index - 1].row));
  }
  return total / Math.max(1, centroids.length - 1);
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

function percentileSorted(sorted, percentile) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
