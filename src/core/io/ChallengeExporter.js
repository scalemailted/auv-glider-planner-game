import { ensureForecastFields } from '../sim/ChallengeMode.js';
import { ensureLevelIdentity, getLevelIdentity } from '../identity/GameInstanceId.js';
import { normalizeEndCondition, normalizeSamplingRules } from '../sim/MissionRules.js';
import { normalizePriorityTargets, normalizePriorityTargetRules } from '../sim/PriorityTargets.js';
import { summarizeDeployment } from '../deployment/DeploymentZones.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { cloneJson, EXPORT_SCHEMA_VERSION, hashJson, visibilityForChallenge } from './ExportVisibility.js';
import { decodeHiddenTruthBundle, encodeHiddenTruthBundle } from './HiddenTruthBundle.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';
import { normalizeExperienceMode } from '../experience/ExperienceMode.js';
import { normalizeNavigationUncertaintyConfig } from '../navigation/NavigationUncertainty.js';

export function buildChallengeExport({ level, mission, challengeMode = null, includeHiddenTruth = false, experienceMode = null } = {}) {
  const exportedLevel = cloneJson(level);
  const exportedMission = cloneJson(mission);
  ensureLevelIdentity(exportedLevel);
  const mode = challengeMode ?? exportedLevel?.challengeMode ?? 'perfectKnowledge';
  if (mode === 'forecast') ensureForecastFields(exportedLevel);
  const identity = getLevelIdentity(exportedLevel);
  const resolvedExperienceMode = normalizeExperienceMode(experienceMode ?? exportedLevel?.meta?.experienceMode ?? exportedMission?.meta?.experienceMode);
  const missionMode = exportedLevel?.meta?.missionMode
    ?? exportedMission?.meta?.missionMode
    ?? exportedLevel?.meta?.generationConfig?.missionMode
    ?? exportedMission?.rules?.missionMode
    ?? null;
  const missionModePreset = exportedLevel?.meta?.missionModePreset
    ?? exportedMission?.meta?.missionModePreset
    ?? exportedLevel?.meta?.generationConfig?.missionModePreset
    ?? null;
  const replaySeedContract = getReplaySeedContract({
    level: exportedLevel,
    mission: exportedMission,
    generationConfig: exportedLevel?.meta?.generationConfig ?? null
  });
  const navigationUncertainty = normalizeNavigationUncertaintyConfig(
    exportedMission?.rules?.navigationUncertainty
      ?? exportedMission?.meta?.navigationUncertainty
      ?? exportedLevel?.meta?.generationConfig?.navigationUncertainty
      ?? {}
  );
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
    experienceMode: resolvedExperienceMode,
    missionMode,
    missionModePreset,
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? identity.instanceId,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: exportedLevel?.meta?.generationConfig ?? null,
    navigationUncertainty,
    currentFieldConfig: exportedLevel?.meta?.generationConfig?.currentFieldConfig ?? exportedLevel?.meta?.generationConfig?.currentField ?? null,
    sampleFieldConfig: exportedLevel?.meta?.generationConfig?.sampleFieldConfig ?? exportedLevel?.meta?.generationConfig?.sampleField ?? null,
    importedFlowField: exportedLevel?.meta?.generationConfig?.importedFlowField ?? null,
    waypointSemantics: waypointSemanticsMetadata(),
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
      experienceMode: resolvedExperienceMode,
      missionMode,
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
      navigationUncertainty,
      priorityTargets: normalizePriorityTargetRules(exportedMission),
      forecast: normalizeForecastRules(exportedMission?.rules?.forecast ?? exportedLevel?.meta?.generationConfig?.forecastRules ?? {})
    },
    scoringRules: cloneJson(exportedMission?.rules?.scoring ?? exportedLevel?.scoring ?? {}),
    level: exportedLevel,
    mission: exportedMission
  };
}

function waypointSemanticsMetadata() {
  return {
    defaultKind: 'navigation',
    kinds: ['navigation', 'surface', 'samplingTarget', 'terminalCarryThrough'],
    notes: 'Navigation waypoints are commanded underwater intent; surface waypoints are GPS/update/replan points; sampling targets are objectives; terminal carry-through truncates at mission end.'
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
      experienceMode: data.experienceMode,
      source: 'challengeJson',
      visibility: data.visibility ?? null
    };
  }
  if (data?.type === 'anchor.level') {
    return {
      level: cloneJson(data),
      mission: cloneJson(data.missionDefaults ?? null),
      challengeMode: data.challengeMode ?? 'perfectKnowledge',
      experienceMode: data.experienceMode,
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
      ?? null),
    currentFieldConfig: cloneJson(level?.meta?.generationConfig?.currentFieldConfig ?? level?.meta?.generationConfig?.currentField ?? null),
    importedFlowField: cloneJson(level?.meta?.generationConfig?.importedFlowField ?? null),
    sampleFieldConfig: cloneJson(level?.meta?.generationConfig?.sampleFieldConfig ?? level?.meta?.generationConfig?.sampleField ?? null),
    navigationUncertainty: cloneJson(level?.meta?.generationConfig?.navigationUncertainty ?? null),
    missionMode: level?.meta?.missionMode ?? level?.meta?.generationConfig?.missionMode ?? null
  };
}
