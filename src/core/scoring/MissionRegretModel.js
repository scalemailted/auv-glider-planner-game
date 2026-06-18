import { normalizeMissionRegretReferenceId } from './MissionScoringSchema.js';

export const MISSION_REGRET_MODEL_VERSION = 'mission-regret-model-score-r1';

export function missionScoreCompatibilityKey(attempt = {}) {
  const source = attempt?.missionOutcomeReport ?? attempt?.missionScore ?? attempt;
  const profile = source?.scoreProfile ?? source?.profile ?? {};
  return {
    episodeId: source?.episodeId ?? attempt?.episodeId ?? source?.scenarioId ?? attempt?.scenarioId ?? null,
    objectiveId: source?.objectiveId ?? source?.scoreConfig?.objectiveId ?? attempt?.objectiveId ?? null,
    visibilityTier: source?.visibilityTier ?? source?.scoreConfig?.visibilityTier ?? attempt?.visibilityTier ?? null,
    profileId: source?.profileId ?? profile?.profileId ?? profile?.id ?? source?.scoreConfig?.profileId ?? null,
    profileVersion: source?.profileVersion ?? profile?.profileVersion ?? profile?.version ?? source?.scoreConfig?.profileVersion ?? null,
    environmentKey: attempt?.environmentKey ?? source?.environmentKey ?? source?.seed ?? null,
    vehicleKey: attempt?.vehicleKey ?? source?.vehicleKey ?? source?.gliderId ?? null
  };
}

export function compatibleMissionScoreAttempts(attempts = [], target = {}, options = {}) {
  const targetKey = missionScoreCompatibilityKey(target);
  return (attempts ?? []).filter((attempt) => compatibleKeys(missionScoreCompatibilityKey(attempt), targetKey, options));
}

export function buildMissionRegretReport({ achievedScore, compatibleAttempts = [], configuredBaseline = null, oracleAttempt = null, profile = {}, scoreConfig = {}, options = {} } = {}) {
  const referenceType = normalizeMissionRegretReferenceId(options.referenceType ?? scoreConfig?.regretReference ?? 'none');
  const achieved = scoreNumber(achievedScore);
  const target = options.targetAttempt ?? { missionScore: achievedScore, scoreConfig, profile };
  let reference = null;
  let compatibilityStatus = 'noReference';
  const warnings = [];
  if (referenceType === 'configuredBaseline') {
    reference = configuredBaseline;
    compatibilityStatus = reference ? 'compatibleReference' : 'missingReference';
  } else if (referenceType === 'bestKnownCompatibleAttempt') {
    const compatible = compatibleMissionScoreAttempts(compatibleAttempts, target, options);
    reference = compatible.map((attempt) => ({ attempt, score: scoreNumber(attempt) })).filter((entry) => entry.score !== null).sort((a, b) => b.score - a.score)[0]?.attempt ?? null;
    compatibilityStatus = reference ? 'compatibleReference' : 'missingReference';
    if (reference) warnings.push('Best-known compatible attempt is not a proof of mathematical optimality.');
  } else if (referenceType === 'oracleAttemptIfAvailable') {
    if (oracleAttempt && isOracleAttempt(oracleAttempt)) {
      reference = oracleAttempt;
      compatibilityStatus = 'compatibleOracleReference';
    } else {
      compatibilityStatus = 'missingReference';
      warnings.push('Oracle regret requires an explicitly labelled oracle attempt; none was used.');
    }
  } else if (referenceType === 'componentTarget') {
    reference = options.componentTarget ?? null;
    compatibilityStatus = reference ? 'componentReference' : 'missingReference';
  }
  const referenceScore = scoreNumber(reference);
  const totalRegret = achieved !== null && referenceScore !== null ? Math.max(0, referenceScore - achieved) : null;
  return {
    type: 'anchor.benchmark.regret-report',
    version: MISSION_REGRET_MODEL_VERSION,
    missionId: options.missionId ?? achievedScore?.missionId ?? null,
    episodeId: options.episodeId ?? achievedScore?.episodeId ?? null,
    attemptId: options.attemptId ?? achievedScore?.attemptId ?? null,
    profileId: profile?.id ?? scoreConfig?.profileId ?? null,
    profileVersion: profile?.version ?? scoreConfig?.profileVersion ?? null,
    referenceType,
    referenceAttemptId: reference?.attemptId ?? reference?.missionOutcomeReport?.attemptId ?? null,
    achievedScore: achieved,
    referenceScore,
    totalRegret: totalRegret === null ? null : round(totalRegret),
    groupRegret: groupRegret(achievedScore, reference),
    componentRegret: componentRegret(achievedScore, reference),
    compatibilityStatus,
    fairnessSummary: {
      comparedCompatibleAttempts: compatibilityStatus.includes('compatible'),
      bestKnownIsNotOptimalProof: referenceType === 'bestKnownCompatibleAttempt',
      oracleReference: referenceType === 'oracleAttemptIfAvailable' && Boolean(reference)
    },
    warnings,
    publicSafe: true,
    notA: ['not proof of optimality', 'not route optimization', 'not official score', 'not MARL/RL']
  };
}

export function validateMissionRegretReport(report = {}) {
  const errors = [];
  const warnings = [];
  if (!report || typeof report !== 'object') errors.push('Regret report must be an object.');
  if (report?.type !== 'anchor.benchmark.regret-report') errors.push(`Expected anchor.benchmark.regret-report, got ${report?.type ?? 'missing'}.`);
  if (report?.referenceType === 'bestKnownCompatibleAttempt' && !(report?.notA ?? []).includes('not proof of optimality')) errors.push('Best-known regret must preserve not proof of optimality boundary.');
  if (report?.compatibilityStatus === 'missingReference' && report?.totalRegret === 0) errors.push('Missing regret reference must not create fake zero regret.');
  if (JSON.stringify(report).includes('T_hiddenTruth')) errors.push('Regret report must not expose hidden truth.');
  if (report?.referenceScore === null) warnings.push('No numeric regret reference was available.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function missionRegretReportSummary(report = {}) {
  return {
    type: 'anchor.benchmark.regret-report-summary',
    version: MISSION_REGRET_MODEL_VERSION,
    present: report?.type === 'anchor.benchmark.regret-report',
    referenceType: report?.referenceType ?? 'none',
    referenceAttemptId: report?.referenceAttemptId ?? null,
    achievedScore: report?.achievedScore ?? null,
    referenceScore: report?.referenceScore ?? null,
    totalRegret: report?.totalRegret ?? null,
    compatibilityStatus: report?.compatibilityStatus ?? 'noReference',
    bestKnownIsNotOptimalProof: report?.fairnessSummary?.bestKnownIsNotOptimalProof === true,
    publicSafe: report?.publicSafe !== false
  };
}

function compatibleKeys(a, b, options = {}) {
  return ['episodeId', 'objectiveId', 'visibilityTier', 'profileId', 'profileVersion'].every((key) => !a[key] || !b[key] || a[key] === b[key])
    && (options.ignoreEnvironmentKey === true || !a.environmentKey || !b.environmentKey || a.environmentKey === b.environmentKey)
    && (options.ignoreVehicleKey === true || !a.vehicleKey || !b.vehicleKey || a.vehicleKey === b.vehicleKey);
}

function scoreNumber(value) {
  if (value === null || value === undefined) return null;
  const source = value?.missionOutcomeReport ?? value?.missionScore ?? value;
  const score = source?.compositeScore ?? source?.summary?.compositeScore ?? source?.missionScore?.compositeScore ?? source?.score ?? source;
  if (score === null || score === undefined) return null;
  const number = Number(score);
  return Number.isFinite(number) ? number : null;
}

function isOracleAttempt(attempt) {
  return /oracle/i.test(String(attempt?.visibilityTier ?? attempt?.fairnessLabel ?? attempt?.label ?? attempt?.source ?? '')) || attempt?.oracle === true || attempt?.usesOracle === true;
}

function groupRegret(achieved, reference) {
  const aGroups = achieved?.groupScores ?? achieved?.missionScore?.groupScores ?? [];
  const rGroups = reference?.groupScores ?? reference?.missionScore?.groupScores ?? reference?.missionOutcomeReport?.groupScores ?? [];
  return aGroups.map((group) => {
    const ref = rGroups.find((entry) => entry.groupId === group.groupId);
    const score = scoreNumber({ score: group.score });
    const referenceScore = scoreNumber({ score: ref?.score });
    return { groupId: group.groupId, regret: score !== null && referenceScore !== null ? round(Math.max(0, referenceScore - score)) : null };
  });
}

function componentRegret(achieved, reference) {
  const aComponents = achieved?.componentScores ?? achieved?.missionScore?.componentScores ?? [];
  const rComponents = reference?.componentScores ?? reference?.missionScore?.componentScores ?? reference?.missionOutcomeReport?.componentScores ?? [];
  return aComponents.map((component) => {
    const ref = rComponents.find((entry) => entry.componentId === component.componentId);
    const score = scoreNumber({ score: component.normalizedValue });
    const referenceScore = scoreNumber({ score: ref?.normalizedValue });
    return { componentId: component.componentId, regret: score !== null && referenceScore !== null ? round(Math.max(0, referenceScore - score)) : null };
  });
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
