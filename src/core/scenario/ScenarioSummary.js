import { summarizeDeployment } from '../deployment/DeploymentZones.js';
import { normalizeEndCondition, normalizeSamplingRules } from '../sim/MissionRules.js';

export function buildScenarioSummary({ level, mission, challengeMode = null, source = 'unknown' } = {}) {
  const time = level?.world?.time ?? {};
  const grid = level?.world?.grid ?? {};
  const agents = mission?.agents ?? level?.missionDefaults?.agents ?? [];
  const endCondition = normalizeEndCondition(mission);
  const sampling = normalizeSamplingRules(mission);
  const deployment = summarizeDeployment(level, mission);
  const hazards = countGrid(level?.layers?.hazards);
  const mobileHazards = level?.layers?.mobileHazards?.length ?? 0;
  const truthFrames = level?.layers?.truth?.frames?.length ?? 0;
  const forecastFrames = (level?.layers?.forecast?.frames?.length ?? 0) + (level?.layers?.forecasts?.length ?? 0);
  const mode = challengeMode ?? level?.challengeMode ?? 'perfectKnowledge';

  return {
    title: level?.meta?.name ?? level?.levelId ?? 'Mission',
    levelId: level?.levelId ?? 'unknown',
    instanceId: level?.instanceId ?? 'unknown',
    missionId: mission?.missionId ?? mission?.id ?? 'mission',
    source,
    challengeMode: mode,
    objective: mission?.objective ?? level?.campaign?.concept ?? level?.meta?.description ?? 'Plan a route, collect valuable ROI samples, and manage risk.',
    grid: `${grid.width ?? '?'} x ${grid.height ?? '?'}`,
    duration: `${time.duration ?? 'N/A'} ${time.displayUnits ?? 'hours'}`,
    planningWindow: `${time.planningWindow ?? 'N/A'} ${time.displayUnits ?? 'hours'}`,
    agents: agents.map((agent) => ({
      id: agent.id,
      fuel: agent.battery ?? agent.energy ?? 'N/A',
      speed: agent.maxSpeed ?? 'N/A'
    })),
    deployment: summarizeDeploymentText(deployment),
    endCondition: summarizeEndCondition(endCondition),
    sampling: summarizeSampling(sampling),
    hazards: `${hazards} static${mobileHazards ? `, ${mobileHazards} mobile` : ''}`,
    currents: truthFrames > 1 ? `${truthFrames} time-varying frames` : truthFrames ? 'single planning field' : 'not configured',
    stochastic: mode === 'forecast'
      ? `Forecast mode: planning uses forecast fields; simulation resolves against truth${forecastFrames ? ` (${forecastFrames} forecast set${forecastFrames === 1 ? '' : 's'})` : ''}.`
      : 'Perfect-knowledge mode: planning view uses the truth field.',
    scoring: buildScoringBullets(mission, endCondition, sampling),
    tutorialPrompts: level?.tutorial?.planningPrompts ?? []
  };
}

function summarizeDeploymentText(deployment) {
  const agents = deployment?.agents ?? [];
  if (!agents.length) return 'No deployment agents configured.';
  const chooseCount = agents.filter((agent) => agent.mode === 'chooseFromZone' || agent.mode === 'chooseFromZones').length;
  if (chooseCount) return `${chooseCount} glider${chooseCount === 1 ? '' : 's'} must choose a drop-zone start before planning.`;
  return 'Fixed start positions are preloaded.';
}

function summarizeEndCondition(config) {
  if (config.mode === 'none') return 'Sampling-only: mission can end when time expires or execution completes.';
  const required = config.requiredByMissionEnd ? 'required' : 'bonus objective';
  return `${labelize(config.mode)} ${required}; bonus ${config.bonus ?? 0}, penalty ${config.penalty ?? 0}.`;
}

function summarizeSampling(config) {
  if (config.mode === 'unique') return `Unique sampling: revisits use duplicate multiplier ${config.duplicateValueMultiplier ?? 0}.`;
  if (config.mode === 'diminishing') return `Diminishing sampling: sampled hotspots remain visible but nearby value is reduced by ${config.depletionFactor ?? 0}.`;
  if (config.mode === 'cooldown') return `Cooldown sampling: sampled hotspots recover after ${config.cooldownWindows ?? 0} planning window(s).`;
  if (config.mode === 'persistent') return `Persistent monitoring: revisits can remain valuable with multiplier ${config.persistentWindowMultiplier ?? 1}.`;
  return labelize(config.mode);
}

function buildScoringBullets(mission, endCondition, sampling) {
  const scoring = mission?.scoring ?? mission?.rules?.scoring ?? {};
  return [
    `ROI samples add value; repeated visits follow ${sampling.mode} sampling rules.`,
    `Energy, hazards, and mobile hazards affect the final score.`,
    endCondition.mode === 'none'
      ? 'No final recovery or communication requirement is active.'
      : `End condition ${endCondition.mode} is ${endCondition.requiredByMissionEnd ? 'required' : 'optional'} by mission end.`,
    scoring.updatePenalty ? `Each replanning update costs ${scoring.updatePenalty}.` : 'Replanning penalties apply only when enabled by mission rules.'
  ];
}

function countGrid(grid) {
  if (!Array.isArray(grid)) return 0;
  return grid.reduce((sum, row) => sum + (Array.isArray(row) ? row.filter(Boolean).length : 0), 0);
}

function labelize(value) {
  return String(value ?? '').replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}
