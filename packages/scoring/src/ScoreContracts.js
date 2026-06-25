import { MISSION_SCORE_COMPONENTS, missionScoreComponentById, missionScoreComponentCatalogSummary } from './MissionScoreComponents.js';
import { missionScoreProfileById, validateMissionScoreProfile, missionScoreProfileSummary } from './MissionScoreProfiles.js';
import { normalizeMissionOutcomeMetrics } from './MissionScoreNormalizer.js';
import { aggregateMissionOutcomeScore } from './MissionScoreAggregator.js';
import { createMissionScoreConfig, MISSION_SCORE_PROFILE_IDS } from './MissionScoringSchema.js';
import { auditMissionScorePublicSafety, sanitizeMissionOutcomeReportForPublicExport } from './MissionScorePublicSafety.js';

export const SCORING_PROFILE_VERSION = 'score-profile-score-pkg-r1';
export const SCORING_INPUT_VERSION = 'score-input-score-pkg-r1';
export const SCORING_RESULT_VERSION = 'score-result-score-pkg-r1';
export const SCORING_COMPONENT_VERSION = 'score-component-score-pkg-r1';
export const SCORE_PACKAGE_VERSION = 'anchor-scoring-score-pkg-r1';

export function createScoreProfile(options = {}) {
  return normalizeScoreProfile(options);
}

export function normalizeScoreProfile(value = {}) {
  const source = missionScoreProfileById(value?.id ?? value?.profileId ?? value);
  const components = scoreComponentDefinitions(source);
  const normalized = stableObject({
    version: SCORING_PROFILE_VERSION,
    legacyVersion: source.version,
    id: source.id,
    profileId: source.id,
    label: source.label,
    description: source.description,
    missionMode: value?.missionMode ?? source.objectiveIds?.[0] ?? 'reconnaissanceSurvey',
    objectiveIds: source.objectiveIds.slice(),
    scoreScale: finiteNumber(value?.scoreScale, 100),
    components,
    componentWeights: stableObject({ ...(source.componentWeights ?? {}) }),
    aggregation: {
      method: 'weighted-mean-of-normalized-available-components',
      missingMetricPolicy: 'explicitUnavailableNoCredit',
      requiredComponents: source.requiredComponents.slice(),
      optionalComponents: source.optionalComponents.slice(),
      minimumCoverageFraction: source.minimumCoverageFraction
    },
    caps: { minimum: 0, maximum: finiteNumber(value?.scoreScale, 100) },
    floors: { minimumComponentContribution: 0 },
    terminalAdjustments: {
      source: 'production official summary or normalized SCORE-R1 component metrics',
      completionAffectsComponents: true,
      terminalReasonRecordedInInput: true
    },
    objectiveRules: stableObject({
      objectiveIds: source.objectiveIds.slice(),
      requireSameObjectiveForComparison: source.comparisonRules?.requireSameObjective !== false
    }),
    roundingPolicy: {
      canonicalNumbers: 'finite JavaScript Number values',
      normalizedComponentDigits: 6,
      weightedContributionDigits: 6,
      officialScoreDigits: 6,
      uiFormattingOutsidePackage: true
    },
    sourceMetadata: {
      packageVersion: SCORE_PACKAGE_VERSION,
      inheritedProfileVersion: source.version,
      changesLegacyNumericalSemantics: false
    },
    provenance: {
      createdBy: '@anchor/scoring',
      plannerClassAffectsScore: false
    },
    claimBoundary: {
      alphaStatement: ALPHA_POSITIONING_STATEMENT,
      notOperationalForecast: true,
      notCertifiedNavigation: true,
      notRlRewardSchedule: true
    },
    notA: source.notA.slice()
  });
  return { ...normalized, profileDigest: digestObject(normalized), componentDefinitionDigest: digestObject(components) };
}

export function validateScoreProfile(value = {}) {
  const requestedProfileId = value?.id ?? value?.profileId ?? (typeof value === 'string' ? value : null);
  const profile = normalizeScoreProfile(value);
  const legacy = validateMissionScoreProfile(missionScoreProfileById(profile.id));
  const errors = [...legacy.errors];
  if (requestedProfileId && !MISSION_SCORE_PROFILE_IDS.includes(String(requestedProfileId))) errors.push('Unknown score profile ' + requestedProfileId + '.');
  const warnings = [...legacy.warnings];
  if (profile.version !== SCORING_PROFILE_VERSION) errors.push('ScoreProfile version is invalid.');
  if (!Array.isArray(profile.components) || profile.components.length === 0) errors.push('ScoreProfile must include components.');
  if (!profile.profileDigest) errors.push('ScoreProfile must include profileDigest.');
  for (const component of profile.components) {
    if (!component.id || !component.sourceMetricId) errors.push(`Component ${component.id ?? 'missing'} lacks source metric metadata.`);
    if (!Number.isFinite(Number(component.weight)) || Number(component.weight) < 0) errors.push(`Component ${component.id} has invalid weight.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function scoreProfileSummary(value = {}) {
  const profile = normalizeScoreProfile(value);
  return {
    ...missionScoreProfileSummary(profile.id),
    type: 'anchor.score.profile-summary',
    version: SCORING_PROFILE_VERSION,
    profileDigest: profile.profileDigest,
    componentDefinitionDigest: profile.componentDefinitionDigest,
    packageVersion: SCORE_PACKAGE_VERSION,
    packageOwnsOfficialScoring: true,
    plannerClassAffectsScore: false
  };
}

export function scoreProfileDigest(value = {}) {
  return normalizeScoreProfile(value).profileDigest;
}

export function scoreComponentDefinitions(profile = {}) {
  const source = profile?.componentWeights ? profile : missionScoreProfileById(profile?.id ?? profile?.profileId ?? profile);
  const weights = source?.componentWeights ?? {};
  return MISSION_SCORE_COMPONENTS
    .filter((component) => Object.prototype.hasOwnProperty.call(weights, component.id))
    .map((component) => stableObject({
      version: SCORING_COMPONENT_VERSION,
      id: component.id,
      label: component.label,
      description: component.description,
      sourceMetricId: component.id,
      sourceUnits: component.unit,
      direction: normalizeDirectionForContract(component.direction),
      normalization: normalizationFor(component.direction),
      parameters: {
        bounds: component.defaultBounds ?? null,
        target: component.defaultTarget ?? null,
        missingValueBehavior: component.missingDataMeaning
      },
      weight: Number(weights[component.id] ?? 0),
      cap: component.defaultBounds?.max ?? null,
      floor: component.defaultBounds?.min ?? null,
      category: component.groupId,
      public: component.refereeOnly !== true,
      dataSources: component.dataSources.slice(),
      hiddenTruthDependency: classifyHiddenTruthDependency(component),
      educationalExplanation: component.explanation ?? component.description
    }));
}

export function scoreComponentById(profile = {}, componentId) {
  return scoreComponentDefinitions(profile).find((component) => component.id === componentId) ?? null;
}

export function createScoreInput(options = {}) {
  return normalizeScoreInput(options);
}

export function normalizeScoreInput(value = {}) {
  const rawMetrics = cloneJson(value.rawMetrics ?? value.metrics ?? value.summary ?? {});
  const normalized = stableObject({
    version: SCORING_INPUT_VERSION,
    environmentArtifactDigest: stringOrNull(value.environmentArtifactDigest ?? value.environmentDigest),
    planDigest: stringOrNull(value.planDigest),
    simulationInputDigest: stringOrNull(value.simulationInputDigest),
    simulationResultDigest: stringOrNull(value.simulationResultDigest ?? value.resultDigest),
    terminalReason: stringOrNull(value.terminalReason ?? rawMetrics.abortReason ?? rawMetrics.stopReason ?? null),
    rawMetrics,
    missionObjectives: cloneJson(value.missionObjectives ?? value.objectives ?? []),
    missionMetadata: cloneJson(value.missionMetadata ?? value.mission ?? {}),
    agentMetrics: cloneJson(value.agentMetrics ?? rawMetrics.agentMetrics ?? []),
    fleetMetrics: cloneJson(value.fleetMetrics ?? rawMetrics.fleetMetrics ?? {}),
    scoreProfileId: String(value.scoreProfileId ?? value.profileId ?? rawMetrics.scoreProfileId ?? 'balancedMission'),
    scoreProfileVersion: String(value.scoreProfileVersion ?? value.profileVersion ?? rawMetrics.scoreProfileVersion ?? SCORING_PROFILE_VERSION)
  });
  return { ...normalized, inputDigest: digestObject(normalized), rawMetricDigest: digestObject(rawMetrics) };
}

export function validateScoreInput(value = {}) {
  const input = normalizeScoreInput(value);
  const errors = [];
  const warnings = [];
  if (input.version !== SCORING_INPUT_VERSION) errors.push('ScoreInput version is invalid.');
  if (!input.inputDigest) errors.push('ScoreInput must include inputDigest.');
  if (!input.rawMetrics || typeof input.rawMetrics !== 'object') errors.push('ScoreInput rawMetrics must be an object.');
  if (containsBannedHiddenTruth(input)) errors.push('ScoreInput must not expose hidden truth fields for public scoring.');
  const finiteAudit = finiteNumberAudit(input.rawMetrics);
  warnings.push(...finiteAudit.warnings);
  errors.push(...finiteAudit.errors);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function scoreInputDigest(value = {}) {
  return normalizeScoreInput(value).inputDigest;
}

export function evaluateScore(scoreProfile, scoreInput, options = {}) {
  const profile = normalizeScoreProfile(scoreProfile);
  const input = normalizeScoreInput({ ...scoreInput, scoreProfileId: profile.id, scoreProfileVersion: profile.version });
  const plannerProvenance = normalizePlannerProvenance(options.plannerProvenance ?? scoreInput?.plannerProvenance ?? scoreInput?.plannerMetadata ?? {});
  const raw = input.rawMetrics ?? {};
  const warnings = [];
  let components;
  let bonuses = [];
  let penalties = [];
  let totalBeforeAdjustments = null;
  let terminalAdjustment = 0;
  let totalBeforeCap = null;
  let officialScore = null;
  let legacyMissionScore = null;

  const metricRecord = Array.isArray(raw.metrics) ? raw : raw.missionOutcomeMetrics;
  if (metricRecord && Array.isArray(metricRecord.metrics)) {
    const normalizedMetrics = normalizeMissionOutcomeMetrics(metricRecord, profile, options);
    legacyMissionScore = aggregateMissionOutcomeScore({ normalizedMetrics, profile, scoreConfig: createMissionScoreConfig({ profileId: profile.id, profileVersion: profile.version }) });
    components = legacyMissionScore.componentScores.map((component) => scoreResultComponentFromMissionScore(component));
    totalBeforeAdjustments = finiteOrNull(legacyMissionScore.compositeScore);
    totalBeforeCap = totalBeforeAdjustments;
    officialScore = totalBeforeAdjustments;
    warnings.push(...(legacyMissionScore.warnings ?? []));
  } else {
    const officialSummary = raw.officialScoreSummary ?? raw.scoreSummary ?? raw.summary ?? raw;
    const official = buildOfficialSummaryScoreResultComponents(officialSummary);
    components = official.components;
    bonuses = official.bonuses;
    penalties = official.penalties;
    totalBeforeAdjustments = official.totalBeforeAdjustments;
    terminalAdjustment = official.terminalAdjustment;
    totalBeforeCap = official.totalBeforeCap;
    officialScore = official.officialScore;
    warnings.push(...official.warnings);
  }

  const resultBase = stableObject({
    version: SCORING_RESULT_VERSION,
    profileId: profile.id,
    profileVersion: profile.version,
    profileDigest: profile.profileDigest,
    inputDigest: input.inputDigest,
    rawMetricDigest: input.rawMetricDigest,
    componentDefinitionDigest: profile.componentDefinitionDigest,
    components,
    bonuses,
    penalties,
    totalBeforeAdjustments: roundOrNull(totalBeforeAdjustments),
    terminalAdjustment: round(terminalAdjustment),
    totalBeforeCap: roundOrNull(totalBeforeCap),
    officialScore: roundOrNull(officialScore),
    scoreScale: profile.scoreScale,
    roundingPolicy: profile.roundingPolicy,
    plannerClassAffectsScore: false,
    warnings,
    failures: []
  });
  return { ...resultBase, resultDigest: digestObject(resultBase), scoreDigest: digestObject({ components, officialScore: resultBase.officialScore, profileDigest: profile.profileDigest, inputDigest: input.inputDigest }), plannerProvenance };
}

export function normalizeScoreResult(value = {}) {
  const base = stableObject({
    version: String(value.version ?? SCORING_RESULT_VERSION),
    profileId: String(value.profileId ?? 'balancedMission'),
    profileVersion: String(value.profileVersion ?? SCORING_PROFILE_VERSION),
    profileDigest: stringOrNull(value.profileDigest),
    inputDigest: stringOrNull(value.inputDigest),
    rawMetricDigest: stringOrNull(value.rawMetricDigest),
    componentDefinitionDigest: stringOrNull(value.componentDefinitionDigest),
    components: Array.isArray(value.components) ? value.components.map(normalizeScoreResultComponent) : [],
    bonuses: Array.isArray(value.bonuses) ? cloneJson(value.bonuses) : [],
    penalties: Array.isArray(value.penalties) ? cloneJson(value.penalties) : [],
    totalBeforeAdjustments: roundOrNull(value.totalBeforeAdjustments),
    terminalAdjustment: round(value.terminalAdjustment ?? 0),
    totalBeforeCap: roundOrNull(value.totalBeforeCap),
    officialScore: roundOrNull(value.officialScore),
    scoreScale: finiteNumber(value.scoreScale, 100),
    roundingPolicy: cloneJson(value.roundingPolicy ?? {}),
    warnings: Array.isArray(value.warnings) ? value.warnings.map(String) : [],
    failures: Array.isArray(value.failures) ? value.failures.map(String) : []
  });
  return { ...base, resultDigest: value.resultDigest ?? digestObject(base), scoreDigest: value.scoreDigest ?? digestObject({ components: base.components, officialScore: base.officialScore, profileDigest: base.profileDigest, inputDigest: base.inputDigest }) };
}

export function validateScoreResult(value = {}) {
  const result = normalizeScoreResult(value);
  const errors = [];
  const warnings = [...result.warnings];
  if (result.version !== SCORING_RESULT_VERSION) errors.push('ScoreResult version is invalid.');
  if (!result.inputDigest) errors.push('ScoreResult must include inputDigest.');
  if (!result.profileDigest) errors.push('ScoreResult must include profileDigest.');
  if (!Number.isFinite(Number(result.officialScore))) errors.push('ScoreResult officialScore must be finite.');
  for (const component of result.components) {
    if (!component.id) errors.push('ScoreResult component lacks id.');
    if (component.status === 'available' && !Number.isFinite(Number(component.normalizedValue))) errors.push(`${component.id} normalizedValue must be finite when available.`);
  }
  const safety = auditMissionScorePublicSafety(publicScoreSummary(result));
  if (!safety.valid) errors.push(...safety.failures);
  warnings.push(...safety.warnings);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function scoreResultSummary(value = {}) {
  const result = normalizeScoreResult(value);
  return {
    type: 'anchor.score.result-summary',
    version: SCORING_RESULT_VERSION,
    profileId: result.profileId,
    profileVersion: result.profileVersion,
    profileDigest: result.profileDigest,
    inputDigest: result.inputDigest,
    componentCount: result.components.length,
    officialScore: result.officialScore,
    resultDigest: result.resultDigest,
    scoreDigest: result.scoreDigest,
    publicSafe: true,
    plannerClassAffectsScore: false
  };
}

export function scoreResultDigest(value = {}) {
  return normalizeScoreResult(value).resultDigest;
}

export function publicScoreSummary(result = {}) {
  const normalized = normalizeScoreResult(result);
  return sanitizeMissionOutcomeReportForPublicExport({
    type: 'anchor.score.public-summary',
    version: SCORING_RESULT_VERSION,
    profileId: normalized.profileId,
    profileVersion: normalized.profileVersion,
    profileDigest: normalized.profileDigest,
    inputDigest: normalized.inputDigest,
    scoreDigest: normalized.scoreDigest,
    officialScore: normalized.officialScore,
    componentSummary: normalized.components
      .filter((component) => component.public !== false)
      .map((component) => ({ id: component.id, label: component.label, normalizedValue: component.normalizedValue, weightedContribution: component.weightedContribution, rawUnits: component.rawUnits, explanation: component.explanation })),
    bonuses: normalized.bonuses,
    penalties: normalized.penalties,
    hiddenTruthIncluded: false,
    publicSafe: true,
    plannerClassAffectsScore: false
  });
}

export function scoreMethodologySummary(profile = {}) {
  const normalized = normalizeScoreProfile(profile);
  return {
    type: 'anchor.score.methodology-summary',
    version: SCORING_PROFILE_VERSION,
    profileId: normalized.id,
    profileVersion: normalized.version,
    profileDigest: normalized.profileDigest,
    scoreScale: normalized.scoreScale,
    aggregation: normalized.aggregation,
    roundingPolicy: normalized.roundingPolicy,
    components: normalized.components.map((component) => ({
      id: component.id,
      label: component.label,
      sourceMetricId: component.sourceMetricId,
      sourceUnits: component.sourceUnits,
      direction: component.direction,
      normalization: component.normalization,
      weight: component.weight,
      category: component.category,
      public: component.public,
      explanation: component.educationalExplanation
    })),
    alphaStatement: ALPHA_POSITIONING_STATEMENT,
    tagline: ALPHA_TAGLINE,
    officialScoreIsNotAutomaticallyRlReward: true
  };
}

export function normalizePlannerProvenance(value = {}) {
  return stableObject({
    plannerClass: normalizeEnum(value.plannerClass, ['human', 'classical', 'heuristic', 'exactOracle', 'learned', 'importedExternal'], 'unknown'),
    plannerId: stringOrNull(value.plannerId ?? value.id),
    plannerVersion: stringOrNull(value.plannerVersion ?? value.version),
    fairnessClass: normalizeEnum(value.fairnessClass, ['forecastOnly', 'beliefAware', 'publicObservationOnly', 'oracleHiddenTruth'], 'forecastOnly'),
    optimalityStatus: normalizeEnum(value.optimalityStatus, ['PROVEN_OPTIMAL', 'EXACT_SMALL_INSTANCE', 'BEST_FOUND', 'HEURISTIC', 'TIMEOUT_BOUND', 'HUMAN_PLAN', 'UNKNOWN'], 'UNKNOWN'),
    solveTimeSeconds: finiteOrNull(value.solveTimeSeconds),
    nodesExpanded: finiteOrNull(value.nodesExpanded),
    edgesEvaluated: finiteOrNull(value.edgesEvaluated),
    sourceMetadata: cloneJson(value.sourceMetadata ?? {})
  });
}

export function buildPlannerComparisonRecord({ environmentDigest, missionDigest, plannerMetadata, planDigest, simulationInputDigest, simulationResultDigest, scoreResult, metrics = {} } = {}) {
  const result = normalizeScoreResult(scoreResult ?? {});
  return stableObject({
    type: 'anchor.score.comparison-record',
    version: SCORING_RESULT_VERSION,
    environmentDigest: stringOrNull(environmentDigest),
    missionDigest: stringOrNull(missionDigest),
    plannerMetadata: normalizePlannerProvenance(plannerMetadata ?? {}),
    planDigest: stringOrNull(planDigest),
    simulationInputDigest: stringOrNull(simulationInputDigest),
    simulationResultDigest: stringOrNull(simulationResultDigest),
    scoreProfileId: result.profileId,
    scoreProfileVersion: result.profileVersion,
    scoreResultDigest: result.resultDigest,
    officialScore: result.officialScore,
    componentSummary: publicScoreSummary(result).componentSummary,
    missionDurationSeconds: finiteOrNull(metrics.missionDurationSeconds ?? metrics.elapsedTime),
    energyUsed: finiteOrNull(metrics.energyUsed),
    scienceValue: finiteOrNull(metrics.scienceValue ?? metrics.sampleScore ?? metrics.depthScienceScore),
    waypointCompletion: finiteOrNull(metrics.waypointCompletion),
    hazards: finiteOrNull(metrics.hazards ?? metrics.hazardsHit),
    depthCoverage: metrics.depthCoverage ?? metrics.verticalCoverage ?? null,
    terminalReason: stringOrNull(metrics.terminalReason ?? metrics.abortReason),
    solveTimeSeconds: finiteOrNull(plannerMetadata?.solveTimeSeconds),
    optimalityStatus: normalizePlannerProvenance(plannerMetadata).optimalityStatus
  });
}

export function scoringDebugSummary({ scoreProfile, scoreInput, scoreResult, evaluationCount = 1, parity = {} } = {}) {
  const profile = normalizeScoreProfile(scoreProfile ?? {});
  const input = normalizeScoreInput(scoreInput ?? {});
  const result = normalizeScoreResult(scoreResult ?? evaluateScore(profile, input));
  return {
    packageVersion: SCORE_PACKAGE_VERSION,
    profileId: profile.id,
    profileVersion: profile.version,
    profileDigest: profile.profileDigest,
    inputDigest: input.inputDigest,
    rawMetricDigest: input.rawMetricDigest,
    componentDefinitionDigest: profile.componentDefinitionDigest,
    componentCount: result.components.length,
    componentSummary: publicScoreSummary(result).componentSummary,
    totalBeforeAdjustments: result.totalBeforeAdjustments,
    terminalAdjustment: result.terminalAdjustment,
    officialScore: result.officialScore,
    scoreResultDigest: result.resultDigest,
    scoringEvaluationCount: evaluationCount,
    browserHeadlessParityStatus: parity.browserHeadlessParityStatus ?? 'not_checked',
    benchmarkParityStatus: parity.benchmarkParityStatus ?? 'not_checked',
    plannerClassInvarianceStatus: parity.plannerClassInvarianceStatus ?? 'not_checked',
    publicSafetyStatus: auditMissionScorePublicSafety(publicScoreSummary(result)).status,
    packageOwnsRawSimulationMetrics: false,
    packageOwnsOfficialScoring: true,
    packageOwnsPlanning: false,
    packageOwnsSimulation: false,
    packageOwnsLeaderboardPersistence: false,
    packageOwnsRendering: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    warnings: result.warnings,
    failures: result.failures
  };
}

export function componentCatalogDigest() {
  return digestObject(missionScoreComponentCatalogSummary());
}

export const ALPHA_POSITIONING_STATEMENT = 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.';
export const ALPHA_TAGLINE = 'Plan. Simulate. Compare. Learn.';

function scoreResultComponentFromMissionScore(component = {}) {
  const definition = missionScoreComponentById(component.componentId);
  return normalizeScoreResultComponent({
    id: component.componentId,
    label: definition?.label ?? component.componentId,
    rawValue: component.rawValue ?? null,
    rawUnits: definition?.unit ?? null,
    normalizedValue: component.normalizedValue,
    weight: component.weight,
    weightedContribution: component.contribution,
    capApplied: false,
    floorApplied: false,
    status: component.available ? 'available' : 'missing',
    public: component.refereeOnlyDerived !== true,
    explanation: definition?.explanation ?? definition?.description ?? component.componentId,
    warnings: component.warnings ?? []
  });
}

function buildOfficialSummaryScoreResultComponents(summary = {}) {
  const componentSpecs = [
    ['sampleScore', 'Science sample value', 'score-points', 'bonus'],
    ['depthScienceScore', 'Depth-aware science value', 'score-points', 'bonus'],
    ['weightedSampleScore', 'Weighted sample contribution', 'score-points', 'bonus'],
    ['priorityTargetScore', 'Priority target bonus', 'score-points', 'bonus'],
    ['energyPenalty', 'Energy penalty', 'score-points', 'penalty'],
    ['hazardPenalty', 'Hazard penalty', 'score-points', 'penalty'],
    ['mobileHazardPenalty', 'Mobile hazard penalty', 'score-points', 'penalty'],
    ['elapsedTimePenalty', 'Elapsed time penalty', 'score-points', 'penalty'],
    ['updatePenalty', 'Update penalty', 'score-points', 'penalty'],
    ['missedWaypointPenalty', 'Missed waypoint penalty', 'score-points', 'penalty'],
    ['priorityTargetMissPenalty', 'Priority target miss penalty', 'score-points', 'penalty'],
    ['recoveryBonus', 'Recovery bonus', 'score-points', 'bonus'],
    ['recoveryPenalty', 'Recovery penalty', 'score-points', 'penalty']
  ];
  const components = componentSpecs
    .filter(([id]) => summary[id] !== undefined && summary[id] !== null)
    .map(([id, label, units, kind]) => normalizeScoreResultComponent({
      id,
      label,
      rawValue: Number(summary[id]),
      rawUnits: units,
      normalizedValue: null,
      weight: 1,
      weightedContribution: Number(summary[id]),
      capApplied: false,
      floorApplied: false,
      status: Number.isFinite(Number(summary[id])) ? 'available' : 'missing',
      public: true,
      explanation: `${label} is copied from the package-owned official mission summary.`,
      category: kind === 'penalty' ? 'penalty' : 'bonus'
    }));
  const bonuses = components.filter((component) => component.category === 'bonus').map(({ id, label, weightedContribution }) => ({ id, label, value: weightedContribution }));
  const penalties = components.filter((component) => component.category === 'penalty').map(({ id, label, weightedContribution }) => ({ id, label, value: Math.abs(Number(weightedContribution ?? 0)) }));
  const officialScore = finiteOrNull(summary.finalScore ?? summary.officialScore ?? summary.score);
  const bonusTotal = bonuses.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  const penaltyTotal = penalties.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  const totalBeforeAdjustments = officialScore ?? round(bonusTotal - penaltyTotal);
  return {
    components,
    bonuses,
    penalties,
    totalBeforeAdjustments,
    terminalAdjustment: Number(summary.recoveryBonus ?? 0) - Number(summary.recoveryPenalty ?? 0),
    totalBeforeCap: officialScore ?? totalBeforeAdjustments,
    officialScore: officialScore ?? totalBeforeAdjustments,
    warnings: officialScore === null ? ['Official summary did not include finalScore; reconstructed from component totals.'] : []
  };
}

function normalizeScoreResultComponent(component = {}) {
  return stableObject({
    id: String(component.id ?? component.componentId ?? ''),
    label: String(component.label ?? component.id ?? ''),
    rawValue: component.rawValue ?? null,
    rawUnits: component.rawUnits ?? component.unit ?? null,
    normalizedValue: roundOrNull(component.normalizedValue),
    weight: finiteNumber(component.weight, 0),
    weightedContribution: roundOrNull(component.weightedContribution ?? component.contribution),
    capApplied: component.capApplied === true,
    floorApplied: component.floorApplied === true,
    status: String(component.status ?? (component.available === false ? 'missing' : 'available')),
    public: component.public !== false,
    category: component.category ?? null,
    explanation: String(component.explanation ?? ''),
    warnings: Array.isArray(component.warnings) ? component.warnings.map(String) : []
  });
}

function normalizeDirectionForContract(direction) {
  if (direction === 'higherIsBetter') return 'maximize';
  if (direction === 'lowerIsBetter') return 'minimize';
  if (direction === 'binaryPass') return 'boolean';
  if (direction === 'targetRange') return 'targetRange';
  return 'existingCustom';
}

function normalizationFor(direction) {
  if (direction === 'higherIsBetter' || direction === 'lowerIsBetter') return 'boundedLinear';
  if (direction === 'binaryPass') return 'threshold';
  if (direction === 'targetRange') return 'targetRange';
  return 'existingCustom';
}

function classifyHiddenTruthDependency(component = {}) {
  if (component.refereeOnly) return 'referee-only-derived';
  if ((component.dataSources ?? []).includes('oracleDerived')) return 'oracle-only';
  if ((component.dataSources ?? []).includes('publicObservation')) return 'public-observation-derived';
  if ((component.dataSources ?? []).includes('publicMissionRecord')) return 'simulator-outcome-derived';
  return 'derived-from-mission-objective';
}

function containsBannedHiddenTruth(value) {
  return /"(T_hiddenTruth|hiddenFields|rawOracleTensor)"\s*:/.test(stableStringify(value));
}

function finiteNumberAudit(value, path = 'rawMetrics') {
  const errors = [];
  const warnings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const child = finiteNumberAudit(item, `${path}[${index}]`);
      errors.push(...child.errors);
      warnings.push(...child.warnings);
    });
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childAudit = finiteNumberAudit(child, `${path}.${key}`);
      errors.push(...childAudit.errors);
      warnings.push(...childAudit.warnings);
    }
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    errors.push(`${path} must be finite.`);
  }
  return { errors, warnings };
}

function stableObject(value = {}) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function cloneJson(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  return JSON.stringify(stableObject(value));
}

function digestObject(value) {
  return fnv1a32(stableStringify(value));
}

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function normalizeEnum(value, allowed, fallback) {
  const text = String(value ?? '');
  return allowed.includes(text) ? text : fallback;
}

function stringOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function roundOrNull(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
