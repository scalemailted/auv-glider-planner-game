import { loadJSON } from '../io/ImportExport.js';
import { TUTORIAL_DEFINITIONS, getTutorialDefinition } from '../tutorial/TutorialDefinitions.js';
import { applyForecastDecayToFrames, normalizeForecastRules } from '../forecast/ForecastDecay.js';

export const CAMPAIGN_LEVELS = TUTORIAL_DEFINITIONS.map((definition) => ({
  id: definition.id,
  sourceLevelId: definition.sourceLevelId,
  label: definition.label,
  title: definition.title,
  url: definition.url,
  mode: definition.mode,
  campaign: definition.campaign,
  tutorial: definition.tutorial,
  mission: definition.mission ?? {}
}));

export async function loadCampaignLevel(entry) {
  const definition = getTutorialDefinition(entry.id) ?? entry;
  const level = await loadJSON(definition.url);
  return applyCampaignMetadata(level, definition);
}

export function applyCampaignMetadata(level, entry) {
  const forecastRules = entry.mission?.forecastDecay
    ? normalizeForecastRules({ mode: 'decay', initialConfidence: 0.95, minConfidence: 0.35, decayRate: 0.05, decayModel: 'exponential' })
    : null;
  const nextLevel = {
    ...level,
    levelId: entry.id,
    challengeMode: entry.mode ?? level.challengeMode ?? 'perfectKnowledge',
    meta: {
      ...level.meta,
      name: entry.label ?? entry.title,
      description: entry.description ?? level.meta?.description,
      difficulty: entry.difficulty ?? level.meta?.difficulty ?? 'tutorial'
    },
    campaign: {
      ...(level.campaign ?? {}),
      ...(entry.campaign ?? {})
    },
    tutorial: {
      ...(level.tutorial ?? {}),
      ...(entry.tutorial ?? {}),
      sourceLevelId: entry.sourceLevelId ?? level.levelId,
      definitionId: entry.id
    }
  };
  if (forecastRules?.mode === 'decay') {
    nextLevel.layers = { ...(nextLevel.layers ?? {}) };
    if (nextLevel.layers.forecast?.frames) {
      nextLevel.layers.forecast = {
        ...nextLevel.layers.forecast,
        frames: applyForecastDecayToFrames(nextLevel.layers.forecast.frames, forecastRules)
      };
    }
    if (nextLevel.layers.forecasts?.length) {
      nextLevel.layers.forecasts = nextLevel.layers.forecasts.map((member) => ({
        ...member,
        frames: applyForecastDecayToFrames(member.frames ?? [], forecastRules)
      }));
    }
    nextLevel.meta.generationConfig = {
      ...(nextLevel.meta.generationConfig ?? {}),
      forecastRules
    };
  }
  return nextLevel;
}

export function applyTutorialMissionConfig(mission, tutorialId) {
  const definition = getTutorialDefinition(tutorialId);
  if (!definition) return mission;
  const updated = structuredCloneSafe(mission);
  const config = definition.mission ?? {};
  updated.meta ??= {};
  updated.meta.tutorialId = tutorialId;
  updated.meta.tutorialTitle = definition.title;
  updated.rules ??= {};
  updated.rules.communication ??= {};
  updated.rules.communication.surfaceInterval = Number(config.surfaceInterval ?? updated.rules.communication.surfaceInterval ?? 3);
  if (config.forecastDecay) {
    updated.rules.forecast = {
      mode: 'decay',
      initialConfidence: 0.95,
      minConfidence: 0.35,
      decayRate: 0.05,
      decayModel: 'exponential',
      updateOnSurfacing: true
    };
  }
  if (config.deploymentMode === 'chooseFromZone') {
    for (const agent of updated.agents ?? []) {
      agent.deployment = { mode: 'chooseFromZone', zoneId: 'base_alpha_deployment', selectedStart: null };
      delete agent.start;
    }
  }
  if (Number(config.agentCount ?? 1) > 1) {
    const first = updated.agents?.[0];
    if (first) {
      updated.agents = Array.from({ length: Number(config.agentCount) }, (_, index) => ({
        ...structuredCloneSafe(first),
        id: `glider_${String(index + 1).padStart(2, '0')}`,
        label: `Glider ${String(index + 1).padStart(2, '0')}`,
        start: first.start ? { x: first.start.x, y: Number(first.start.y ?? 1) + index } : undefined,
        battery: Math.max(70, Number(first.battery ?? 100) - index * 10),
        maxSpeed: Math.max(0.9, Number(first.maxSpeed ?? 1.25) - index * 0.1)
      }));
    }
  }
  return updated;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
