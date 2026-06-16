import { createHeadlessEpisode } from '../HeadlessEpisodeSchema.js';
import { updateHeadlessBeliefFromObservations } from './HeadlessBeliefUpdate.js';
import { createHeadlessFieldPack } from './HeadlessFields.js';
import { simulateHeadlessGliderRoute } from './HeadlessGlider.js';
import { computeHeadlessSamplingPriority, computeHeadlessPriorityComponents, headlessPrioritySummary } from './HeadlessPriority.js';
import { createDefaultHeadlessRuntimeConfig, validateHeadlessRuntimeConfig } from './HeadlessRuntimeConfig.js';
import { computeHeadlessScoreReport } from './HeadlessScoring.js';

export const HEADLESS_MISSION_RUNNER_VERSION = 'headless-mission-runner-h1';

export function runHeadlessMission(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  return runHeadlessMissionWithPlan(config, config.plan);
}

export function runHeadlessMissionWithPlan(configInput = {}, planInput = null) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const plan = planInput ?? config.plan;
  return simulateHeadlessEpisode(config, plan);
}

export function simulateHeadlessEpisode(configInput = {}, planInput = null) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const validation = validateHeadlessRuntimeConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid headless runtime config: ${validation.errors.join('; ')}`);
  }
  const plan = planInput ?? config.plan;
  const fieldPackBefore = createHeadlessFieldPack(config);
  fieldPackBefore.fields.A_global = computeHeadlessSamplingPriority(fieldPackBefore, config);
  const missionConfig = {
    ...config.missionConfig,
    sensorNoise: config.sensorNoise,
    planningRules: { ...(config.missionConfig.planningRules ?? {}), stepDistance: config.stepDistance }
  };
  const glider = missionConfig.gliders?.find((entry) => entry.id === plan.gliderId) ?? missionConfig.gliders?.[0];
  const routeResult = simulateHeadlessGliderRoute({
    fieldPack: fieldPackBefore,
    glider,
    waypoints: plan.waypoints,
    missionConfig,
    seed: config.seed
  });
  const fieldPackAfter = updateHeadlessBeliefFromObservations({
    fieldPack: fieldPackBefore,
    observations: routeResult.observations,
    radius: 2.5,
    confidence: 0.55,
    stalenessRate: 0.012
  });
  fieldPackAfter.fields.A_global = computeHeadlessSamplingPriority(fieldPackAfter, config);
  fieldPackAfter.diagnostics.priority = headlessPrioritySummary(
    fieldPackAfter.fields.A_global,
    computeHeadlessPriorityComponents(fieldPackAfter, config)
  );
  const scoreReport = computeHeadlessScoreReport({
    fieldPackBefore,
    fieldPackAfter,
    observations: routeResult.observations,
    tracks: routeResult.tracks,
    missionConfig
  });
  const actions = plan.waypoints.map((waypoint, index) => ({
    id: `action-wp-${index + 1}`,
    type: 'waypointTarget',
    gliderId: plan.gliderId,
    target: { x: waypoint.x, y: waypoint.y, z: waypoint.zIndex ?? waypoint.z ?? 0 },
    policyId: 'fixedDefaultWaypoints',
    note: 'H1 executes provided waypoints and does not optimize routes.'
  }));
  const rewards = [{
    id: 'reward-final-educational-score',
    value: scoreReport.finalScore,
    components: scoreReport.components,
    educationalBenchmarkSpecific: true,
    note: 'Educational headless scoring only; browser scoring remains official.'
  }];
  const replay = {
    type: 'anchor.headless.replay',
    version: HEADLESS_MISSION_RUNNER_VERSION,
    seed: config.seed,
    gliderId: plan.gliderId,
    trackPointCount: routeResult.tracks.length,
    observationCount: routeResult.observations.length,
    route: routeResult.route,
    observationIds: routeResult.observations.map((entry) => entry.observationId)
  };
  const episode = {
    type: 'anchor.headless.episode',
    version: HEADLESS_MISSION_RUNNER_VERSION,
    episodeId: `h1-node-headless-${config.scenario}-${config.seed}`,
    runtimeTarget: 'nodeHeadless',
    seed: config.seed,
    missionConfig,
    fieldPackBefore,
    fieldPackAfter,
    observations: routeResult.observations,
    tracks: routeResult.tracks,
    actions,
    rewards,
    surfacingEvents: [{
      id: 'surface-final',
      timeSeconds: routeResult.state.timeSeconds,
      gliderId: plan.gliderId,
      reason: 'mission-complete-summary-export'
    }],
    scoreReport,
    replay,
    diagnostics: {
      runtimeVersion: HEADLESS_MISSION_RUNNER_VERSION,
      configValidation: validation,
      deterministic: true,
      routeGenerated: false,
      usesProvidedWaypoints: true,
      calibratedOceanForecast: false,
      implementsNewPlanner: false,
      implementsMARL: false,
      canonicalRuntime: 'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.'
    }
  };
  episode.schemaEpisode = createHeadlessEpisode({
    episodeId: episode.episodeId,
    runtimeTarget: 'nodeHeadless',
    seed: episode.seed,
    observations: episode.observations.map((observation) => ({
      observationId: observation.observationId,
      timeSeconds: observation.timeSeconds,
      gliderId: observation.gliderId,
      position: { x: observation.x, y: observation.y, z: observation.zIndex },
      fieldId: 'T_hiddenTruth',
      value: observation.observedValue,
      payload: observation
    })),
    actions: episode.actions,
    rewards: episode.rewards,
    surfacingEvents: episode.surfacingEvents,
    diagnostics: episode.diagnostics,
    notes: [episode.diagnostics.canonicalRuntime]
  });
  return episode;
}
