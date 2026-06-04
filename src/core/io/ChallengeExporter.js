import { ensureForecastFields } from '../sim/ChallengeMode.js';
import { ensureLevelIdentity, getLevelIdentity } from '../identity/GameInstanceId.js';
import { normalizeEndCondition, normalizeSamplingRules } from '../sim/MissionRules.js';
import { normalizePriorityTargets, normalizePriorityTargetRules } from '../sim/PriorityTargets.js';
import { summarizeDeployment } from '../deployment/DeploymentZones.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { cloneJson, EXPORT_SCHEMA_VERSION, hashJson, visibilityForChallenge } from './ExportVisibility.js';
import { decodeHiddenTruthBundle, encodeHiddenTruthBundle } from './HiddenTruthBundle.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';

export function buildChallengeExport({ level, mission, challengeMode = null, includeHiddenTruth = false } = {}) {
  const exportedLevel = cloneJson(level);
  const exportedMission = cloneJson(mission);
  ensureLevelIdentity(exportedLevel);
  const mode = challengeMode ?? exportedLevel?.challengeMode ?? 'perfectKnowledge';
  if (mode === 'forecast') ensureForecastFields(exportedLevel);
  const identity = getLevelIdentity(exportedLevel);
  const replaySeedContract = getReplaySeedContract({
    level: exportedLevel,
    mission: exportedMission,
    generationConfig: exportedLevel?.meta?.generationConfig ?? null
  });
  const exactReplay = evaluateExactReplayAvailability({
    level: exportedLevel,
    mission: exportedMission,
    replaySeedContract
  });
  const visibility = visibilityForChallenge(mode, { includeTruth: includeHiddenTruth });
  const originalTruth = cloneJson(exportedLevel?.layers?.truth ?? null);
  const truthHash = hashJson(originalTruth);
  if (!visibility.truthIncluded && exportedLevel?.layers) {
    delete exportedLevel.layers.truth;
  }
  const hiddenTruth = visibility.truthIncluded ? null : encodeHiddenTruthBundle(originalTruth) ?? {
    mode: 'omitted',
    encrypted: false,
    algorithm: null,
    checksum: truthHash,
    warning: 'Hidden truth is omitted from this public challenge export. Client-side challenge secrecy is cheat-resistant only.'
  };
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.challenge',
    createdAt: new Date().toISOString(),
    levelId: identity.levelId,
    instanceId: identity.instanceId,
    challengeId: identity.instanceId,
    missionId: exportedMission?.missionId ?? exportedMission?.id ?? null,
    challengeMode: mode,
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? identity.instanceId,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: exportedLevel?.meta?.generationConfig ?? null,
    derivedSeeds: replaySeedContract?.derivedSeeds ?? null,
    replaySeedContract,
    exactReplay: {
      available: exactReplay.available,
      method: exactReplay.method,
      reason: exactReplay.reason
    },
    leaderboardIdentity: {
      levelId: identity.levelId,
      instanceId: identity.instanceId,
      challengeId: identity.instanceId,
      missionId: exportedMission?.missionId ?? exportedMission?.id ?? null,
      challengeMode: mode,
      replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? identity.instanceId,
      generationVersion: replaySeedContract?.generationVersion ?? null
    },
    visibility: {
      ...visibility,
      hiddenTruthPolicy: hiddenTruth?.mode === 'opaqueBundle' ? 'opaqueBundle' : visibility.hiddenTruthPolicy,
      hiddenTruthChecksum: truthHash
    },
    hiddenTruth,
    visibleData: buildVisibleData(exportedLevel, mode),
    missionRules: {
      endCondition: normalizeEndCondition(exportedMission),
      sampling: normalizeSamplingRules(exportedMission),
      priorityTargets: normalizePriorityTargetRules(exportedMission),
      forecast: normalizeForecastRules(exportedMission?.rules?.forecast ?? exportedLevel?.meta?.generationConfig?.forecastRules ?? {})
    },
    scoringRules: cloneJson(exportedMission?.rules?.scoring ?? exportedLevel?.scoring ?? {}),
    level: exportedLevel,
    mission: exportedMission
  };
}

export function parseChallengeImport(data) {
  if (data?.type === 'anchor.challenge') {
    const level = cloneJson(data.level);
    const decodedTruth = decodeHiddenTruthBundle(data.hiddenTruth);
    if (decodedTruth) {
      level.layers ??= {};
      level.layers.truth = decodedTruth;
    }
    return {
      level,
      mission: cloneJson(data.mission),
      challengeMode: data.challengeMode,
      source: 'challengeJson',
      visibility: data.visibility ?? null
    };
  }
  if (data?.type === 'anchor.level') {
    return {
      level: cloneJson(data),
      mission: cloneJson(data.missionDefaults ?? null),
      challengeMode: data.challengeMode ?? 'perfectKnowledge',
      source: 'levelJson',
      visibility: null
    };
  }
  return null;
}

function buildVisibleData(level, challengeMode) {
  const layers = level?.layers ?? {};
  return {
    map: {
      grid: cloneJson(level?.world?.grid ?? { width: level?.width, height: level?.height }),
      time: cloneJson(level?.world?.time ?? { duration: level?.duration, dt: level?.dt })
    },
    terrain: cloneJson(layers.terrain ?? []),
    depth: cloneJson(layers.depth ?? null),
    hazards: cloneJson(layers.hazards ?? []),
    deploymentZones: cloneJson(level?.deploymentZones ?? level?.zones?.deployment ?? []),
    recoveryZones: cloneJson(level?.recoveryZones ?? level?.zones?.recovery ?? []),
    forecast: cloneJson(layers.forecast ?? null),
    forecasts: cloneJson(layers.forecasts ?? []),
    truth: challengeMode === 'perfectKnowledge' ? cloneJson(layers.truth ?? null) : null,
    priorityTargets: cloneJson(normalizePriorityTargets(level)),
    currentPreset: cloneJson(level?.meta?.generationConfig?.currentGenerator
      ?? level?.meta?.generationConfig?.vectorField
      ?? level?.meta?.generationConfig?.currentPattern
      ?? null)
  };
}
