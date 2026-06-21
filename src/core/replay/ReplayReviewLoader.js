import { buildHeadlessBundleFromFiles } from '../headless/HeadlessBundleLoader.js';
import { buildReplayArtifactsFromBundle } from './ReplayContractBuilder.js';
import { normalizeReplayArtifacts, replayArtifactsSummary, validateReplayArtifacts, scanForbiddenPublicMarkers } from './ReplaySchema.js';
import { verifyReplayIntegrity, replayIntegritySummary } from './ReplayIntegrityVerifier.js';

export const REPLAY_REVIEW_LOADER_VERSION = 'replay-review-loader-r2a';

export function buildReplayReviewSourceFromFiles(entries = [], options = {}) {
  const bundle = buildHeadlessBundleFromFiles(entries);
  return buildReplayReviewSourceFromBundle(bundle, { ...options, sourceKind: options.sourceKind ?? 'headlessFiles' });
}

export function buildReplayReviewSourceFromBundle(bundle = {}, options = {}) {
  const replayArtifacts = ensureReplayArtifacts(bundle, options);
  const validation = validateReplayArtifacts(replayArtifacts, { allowLegacy: true });
  const integrityReport = replayArtifacts.present
    ? verifyReplayIntegrity({ ...replayArtifacts, options: { allowWarnings: true, verifyAlignmentReport: false } })
    : null;
  const level = options.level ?? levelFromBundle(bundle);
  const mission = options.mission ?? missionFromBundle(bundle);
  const plan = options.plan ?? planFromBundle(bundle);
  const publicSafetyScan = scanForbiddenPublicMarkers(replayArtifacts, { allowBoundaryBooleans: true });
  return compactObject({
    type: 'anchor.replay.review-source',
    version: REPLAY_REVIEW_LOADER_VERSION,
    sourceKind: options.sourceKind ?? 'headlessBundle',
    label: options.label ?? bundle.manifest?.episodeId ?? replayArtifacts.manifest?.replayId ?? 'Headless Replay Bundle',
    bundle,
    level,
    mission,
    plan,
    replayArtifacts,
    manifest: replayArtifacts.manifest,
    events: replayArtifacts.events,
    checkpoints: replayArtifacts.checkpoints,
    alignmentReport: replayArtifacts.alignmentReport,
    validation,
    integrityReport,
    warnings: [...(bundle.warnings ?? []), ...(validation.warnings ?? []), ...(publicSafetyScan.failures ?? [])],
    failures: [...(bundle.failures ?? []), ...(validation.failures ?? []), ...(integrityReport?.failures ?? [])],
    summary: replayReviewSourceSummary({ replayArtifacts, validation, integrityReport, bundle }),
    publicBoundary: {
      replayMode: replayArtifacts.manifest?.replayMode ?? null,
      visibilityTier: replayArtifacts.manifest?.visibilityTier ?? 'publicScenario',
      publicSafe: replayArtifacts.manifest?.publicSafe !== false && publicSafetyScan.failures.length === 0,
      hiddenTruthIncluded: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      browserResultPlayback: false
    }
  });
}

export function buildReplayReviewSourceFromResult({ level = null, mission = null, plan = null, result = null } = {}, options = {}) {
  const exportedResult = result?.type === 'anchor.result' ? result : null;
  const rawResult = exportedResult?.rawResult ?? result ?? {};
  const missionConfig = missionConfigFromBrowser({ level, mission, result: rawResult, exportedResult });
  const browserBundle = {
    type: 'anchor.replay.browser-result-bundle',
    version: REPLAY_REVIEW_LOADER_VERSION,
    manifest: {
      scenarioId: level?.levelId ?? exportedResult?.levelId ?? rawResult?.levelId ?? 'browser-result-scenario',
      missionId: mission?.missionId ?? mission?.id ?? exportedResult?.missionId ?? rawResult?.missionId ?? 'browser-result-mission',
      episodeId: rawResult?.episodeId ?? exportedResult?.instanceId ?? exportedResult?.challengeId ?? 'browser-result-episode',
      seed: rawResult?.seed ?? exportedResult?.replaySeedAnchor ?? exportedResult?.instanceId ?? 'browser-result-seed'
    },
    missionConfig,
    visibleFields: visibleFieldsFromLevel(level),
    gliderTracks: tracksFromBrowserResult(rawResult, exportedResult, missionConfig),
    observations: observationsFromBrowserResult(rawResult, exportedResult),
    scoreReport: scoreReportFromBrowserResult(rawResult, exportedResult),
    terrainEvents: terrainEventsFromBrowserResult(rawResult, exportedResult),
    episode: {
      episodeId: rawResult?.episodeId ?? exportedResult?.instanceId ?? 'browser-result-episode',
      seed: rawResult?.seed ?? exportedResult?.replaySeedAnchor ?? 'browser-result-seed',
      missionConfig,
      actions: actionsFromPlan(plan ?? exportedResult?.plan ?? rawResult?.plan, missionConfig),
      tracks: tracksFromBrowserResult(rawResult, exportedResult, missionConfig),
      observations: observationsFromBrowserResult(rawResult, exportedResult),
      terrainEvents: terrainEventsFromBrowserResult(rawResult, exportedResult),
      surfacingEvents: surfacingEventsFromBrowserResult(rawResult, exportedResult),
      scoreReport: scoreReportFromBrowserResult(rawResult, exportedResult),
      diagnostics: { browserResultReplayAdapter: true, changesOfficialBrowserScoring: false }
    }
  };
  const source = buildReplayReviewSourceFromBundle(browserBundle, {
    ...options,
    level,
    mission,
    plan: plan ?? exportedResult?.plan ?? rawResult?.plan,
    sourceKind: options.sourceKind ?? 'browserResult',
    label: options.label ?? 'Browser Result Replay Review',
    checkpointEvery: options.checkpointEvery ?? 5,
    useDemoObjectiveSequence: false
  });
  return {
    ...source,
    browserResult: rawResult,
    exportedResult,
    publicBoundary: {
      ...source.publicBoundary,
      browserResultPlayback: true,
      replayMode: source.replayArtifacts?.manifest?.replayMode ?? 'publicObservationPlayback',
      publicSafe: true,
      hiddenTruthIncluded: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false
    },
    warnings: [
      ...(source.warnings ?? []),
      'Browser result replay is reconstructed from public result tracks/events; checkpoint digest integrity is generated for review and does not make it authoritative headless resimulation.'
    ]
  };
}

export function replayReviewSourceSummary(source = {}) {
  const artifacts = source.replayArtifacts ?? source;
  const summary = replayArtifactsSummary(artifacts);
  const integrity = source.integrityReport ? replayIntegritySummary(source.integrityReport) : null;
  return {
    type: 'anchor.replay.review-source-summary',
    version: REPLAY_REVIEW_LOADER_VERSION,
    sourceKind: source.sourceKind ?? null,
    label: source.label ?? null,
    present: summary.present,
    replayMode: summary.replayMode,
    replayFidelity: summary.replayFidelity,
    compatibilityStatus: summary.compatibilityStatus,
    eventCount: summary.eventCount,
    checkpointCount: summary.checkpointCount,
    terminalTick: summary.terminalTick,
    terminalDigest: summary.terminalDigest,
    agentCount: source.replayArtifacts?.manifest?.agentIds?.length ?? integrity?.agentCount ?? 0,
    validationStatus: source.validation?.status ?? null,
    integrityStatus: integrity?.status ?? source.integrityReport?.status ?? null,
    failureCodes: integrity?.failureCodes ?? [],
    warningCount: integrity?.warningCount ?? source.validation?.warnings?.length ?? 0,
    failureCount: integrity?.failureCount ?? source.validation?.failures?.length ?? 0,
    publicSafe: source.publicBoundary?.publicSafe !== false && summary.publicSafe !== false,
    hiddenTruthIncluded: false,
    usesHiddenTruthResimulation: false,
    changesOfficialBrowserScoring: false
  };
}

function ensureReplayArtifacts(bundle = {}, options = {}) {
  const normalized = normalizeReplayArtifacts(bundle);
  if (normalized.present || options.allowArtifactBuild === false) return normalized;
  return normalizeReplayArtifacts(buildReplayArtifactsFromBundle(bundle, options));
}

function levelFromBundle(bundle = {}) {
  const mission = bundle.missionConfig ?? {};
  const visible = bundle.visibleFields ?? {};
  const width = finitePositive(mission.world?.width ?? mission.world?.grid?.width ?? visible.grid?.width ?? visible.shape?.[1] ?? visible.fields?.[0]?.shape?.[1], 12);
  const height = finitePositive(mission.world?.height ?? mission.world?.grid?.height ?? visible.grid?.height ?? visible.shape?.[0] ?? visible.fields?.[0]?.shape?.[0], 12);
  return {
    levelId: mission.scenarioId ?? bundle.manifest?.scenarioId ?? 'headless-replay-scenario',
    world: {
      grid: { width, height },
      time: { dt: finitePositive(mission.world?.timeStepSeconds ?? mission.world?.time?.dt, 60) },
      waterColumnConfig: mission.world?.waterColumnConfig ?? mission.waterColumnConfig ?? null
    },
    layers: {
      terrain: normalizeTerrainGrid(visible.terrain ?? visible.landMask ?? visible.landSeaMask, width, height),
      hazards: normalizeTerrainGrid(visible.hazards, width, height)
    },
    bathymetry: bundle.bathymetrySummary?.depthField ? { depthMeters: bundle.bathymetrySummary.depthField } : null,
    meta: { source: 'replayReviewLoader', publicSafe: true }
  };
}

function missionFromBundle(bundle = {}) {
  const config = bundle.missionConfig ?? {};
  const gliders = config.gliders ?? config.agents ?? [];
  return {
    missionId: config.missionId ?? bundle.manifest?.missionId ?? 'headless-replay-mission',
    agents: gliders.map((glider, index) => ({
      id: glider.id ?? glider.agentId ?? `glider-${index + 1}`,
      start: glider.start ?? glider.deployment?.selectedStart ?? { x: finiteNumber(glider.x, 0), y: finiteNumber(glider.y, 0) },
      deployment: glider.deployment ?? null,
      battery: glider.battery ?? glider.energyBudget ?? 100,
      diveProfileId: glider.diveProfileId ?? glider.diveProfile?.id ?? null
    })),
    world: { waterColumnConfig: config.world?.waterColumnConfig ?? config.waterColumnConfig ?? null },
    meta: { source: 'replayReviewLoader' }
  };
}

function planFromBundle(bundle = {}) {
  const candidate = bundle.plan ?? bundle.roundtripReport?.runtime?.adaptedPlan ?? bundle.roundtripReport?.submittedPlan ?? null;
  if (candidate) return candidate;
  const actions = bundle.episode?.actions ?? [];
  if (!actions.length) return { agentPlans: [] };
  const byAgent = new Map();
  for (const action of actions) {
    const agentId = action.agentId ?? action.gliderId ?? 'glider-1';
    const target = action.target ?? action.waypoint ?? action;
    if (!byAgent.has(agentId)) byAgent.set(agentId, []);
    byAgent.get(agentId).push({ id: action.id, x: target.x, y: target.y, t: action.timeSeconds, action: action.type ?? 'sample' });
  }
  return { agentPlans: [...byAgent.entries()].map(([agentId, waypoints]) => ({ agentId, waypoints })) };
}

function missionConfigFromBrowser({ level = null, mission = null, result = {}, exportedResult = null } = {}) {
  const width = finitePositive(level?.world?.grid?.width ?? level?.width ?? result?.grid?.width, 12);
  const height = finitePositive(level?.world?.grid?.height ?? level?.height ?? result?.grid?.height, 12);
  const agents = mission?.agents ?? result?.mission?.agents ?? [];
  return {
    missionId: mission?.missionId ?? mission?.id ?? exportedResult?.missionId ?? result?.missionId ?? 'browser-result-mission',
    scenarioId: level?.levelId ?? exportedResult?.levelId ?? result?.levelId ?? 'browser-result-scenario',
    seed: result?.seed ?? exportedResult?.replaySeedAnchor ?? exportedResult?.instanceId ?? 'browser-result-seed',
    world: {
      width,
      height,
      timeStepSeconds: finitePositive(level?.world?.time?.dt ?? level?.dt ?? result?.dt, 1),
      waterColumnConfig: level?.world?.waterColumnConfig ?? mission?.world?.waterColumnConfig ?? mission?.waterColumnConfig ?? null
    },
    gliders: agents.map((agent, index) => ({
      id: agent.id ?? agent.agentId ?? `glider-${index + 1}`,
      start: agent.start ?? agent.deployment?.selectedStart ?? agent.selectedStart ?? { x: 0, y: 0 },
      diveProfileId: agent.diveProfileId ?? null
    }))
  };
}

function visibleFieldsFromLevel(level = null) {
  if (!level) return null;
  return {
    type: 'anchor.visible-fields.public-replay-review',
    scenario: level.levelId ?? null,
    grid: level.world?.grid ?? null,
    terrain: level.layers?.terrain ?? level.bathymetry?.landMask ?? null,
    hazards: level.layers?.hazards ?? null,
    publicSafe: true
  };
}

function tracksFromBrowserResult(result = {}, exportedResult = null, missionConfig = {}) {
  const frames = exportedResult?.routeExecution?.frames ?? result.frames ?? result.trajectories ?? [];
  const rows = [];
  const agentIds = (missionConfig.gliders ?? []).map((glider) => glider.id).filter(Boolean);
  if (Array.isArray(frames)) {
    frames.forEach((frame, index) => {
      if (Array.isArray(frame?.agents)) {
        frame.agents.forEach((agent, agentIndex) => rows.push(trackRow(agent, { index, timeSeconds: frame.t ?? frame.timeSeconds ?? index, agentId: agent.agentId ?? agent.id ?? agentIds[agentIndex] })));
      } else if (Array.isArray(frame?.points)) {
        frame.points.forEach((point, pointIndex) => rows.push(trackRow(point, { index, timeSeconds: point.t ?? point.timeSeconds ?? index, agentId: point.agentId ?? agentIds[pointIndex] })));
      } else if (isFinitePoint(frame)) {
        rows.push(trackRow(frame, { index, timeSeconds: frame.t ?? frame.timeSeconds ?? index, agentId: frame.agentId ?? frame.gliderId ?? agentIds[0] ?? 'glider-1' }));
      }
    });
  }
  if (!rows.length) {
    for (const glider of missionConfig.gliders ?? [{ id: 'glider-1', start: { x: 0, y: 0 } }]) {
      rows.push({ gliderId: glider.id, agentId: glider.id, x: finiteNumber(glider.start?.x, 0), y: finiteNumber(glider.start?.y, 0), zIndex: 0, depthLayerId: 'surface', timeSeconds: 0, status: 'initial' });
    }
  }
  return rows.sort((a, b) => a.timeSeconds - b.timeSeconds || String(a.agentId).localeCompare(String(b.agentId)));
}

function trackRow(value = {}, fallback = {}) {
  const agentId = value.agentId ?? value.gliderId ?? fallback.agentId ?? 'glider-1';
  return compactObject({
    gliderId: agentId,
    agentId,
    x: finiteNumber(value.x ?? value.position?.x ?? value.actual?.x, 0),
    y: finiteNumber(value.y ?? value.position?.y ?? value.actual?.y, 0),
    zIndex: value.zIndex ?? value.z ?? null,
    depthLayerId: value.depthLayerId ?? value.depthLayer ?? null,
    depthMeters: finiteOrNull(value.depthMeters ?? value.actual?.depthMeters),
    headingDegrees: finiteOrNull(value.headingDegrees ?? value.heading),
    battery: finiteOrNull(value.battery ?? value.batteryFraction),
    energyUsed: finiteOrNull(value.energyUsed ?? value.energyUsedCumulative),
    timeSeconds: finiteNumber(value.t ?? value.timeSeconds, fallback.timeSeconds ?? fallback.index ?? 0),
    status: value.status ?? 'underway'
  });
}

function observationsFromBrowserResult(result = {}, exportedResult = null) {
  const events = exportedResult?.routeExecution?.events ?? result.events ?? [];
  const observations = [];
  for (const [index, event] of events.entries()) {
    const type = String(event?.type ?? event?.eventType ?? '');
    if (!/sample|observation|probabilityOutcome|depth-aware-sample/i.test(type)) continue;
    const x = event.x ?? event.position?.x ?? event.actual?.x ?? event.cell?.x;
    const y = event.y ?? event.position?.y ?? event.actual?.y ?? event.cell?.y;
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) continue;
    observations.push(compactObject({
      observationId: event.id ?? event.eventId ?? `browser-observation-${index + 1}`,
      gliderId: event.agentId ?? event.gliderId ?? 'glider-1',
      agentId: event.agentId ?? event.gliderId ?? 'glider-1',
      x: finiteNumber(x),
      y: finiteNumber(y),
      zIndex: event.zIndex ?? event.z ?? null,
      depthLayerId: event.depthLayerId ?? event.depthLayer ?? null,
      depthMeters: finiteOrNull(event.depthMeters ?? event.actual?.depthMeters),
      observedValue: finiteOrNull(event.observedValue ?? event.value ?? event.rewardValue ?? event.sampleValue),
      timeSeconds: finiteNumber(event.t ?? event.timeSeconds ?? event.tick, index)
    }));
  }
  return observations;
}

function terrainEventsFromBrowserResult(result = {}, exportedResult = null) {
  const events = [...(exportedResult?.terrainEvents ?? []), ...(result.terrainEvents ?? []), ...(result.events ?? [])];
  const seen = new Set();
  return events.filter((event, index) => {
    const type = String(event?.type ?? event?.eventType ?? '');
    if (!type.startsWith('anchor.simulation.terrain-')) return false;
    const key = event.id ?? event.eventId ?? `${type}:${event.agentId ?? ''}:${event.t ?? event.timeSeconds ?? index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((event, index) => ({ ...event, id: event.id ?? event.eventId ?? `terrain-event-${index + 1}`, timeSeconds: finiteNumber(event.timeSeconds ?? event.t ?? event.tick, index), publicSafe: true }));
}

function surfacingEventsFromBrowserResult(result = {}, exportedResult = null) {
  const events = exportedResult?.routeExecution?.events ?? result.events ?? [];
  const surfacing = events.filter((event) => /surface|surfacing|terminal/i.test(String(event?.type ?? event?.eventType ?? '')))
    .map((event, index) => ({ id: event.id ?? `surface-${index + 1}`, agentId: event.agentId ?? event.gliderId ?? 'glider-1', timeSeconds: finiteNumber(event.timeSeconds ?? event.t ?? event.tick, index), reason: event.reason ?? event.type ?? 'surfacing' }));
  if (surfacing.length) return surfacing;
  const tracks = tracksFromBrowserResult(result, exportedResult, { gliders: [{ id: 'glider-1' }] });
  return [{ id: 'browser-result-terminal', agentId: tracks.at(-1)?.agentId ?? 'glider-1', timeSeconds: tracks.at(-1)?.timeSeconds ?? 0, reason: 'browser-result-complete' }];
}

function actionsFromPlan(plan = null, missionConfig = {}) {
  const agentPlans = plan?.agentPlans ?? [];
  return agentPlans.flatMap((agentPlan) => (agentPlan.waypoints ?? []).map((waypoint, index) => ({
    id: waypoint.id ?? waypoint.waypointId ?? `${agentPlan.agentId}-action-${index + 1}`,
    type: waypoint.action ?? 'waypointTarget',
    agentId: agentPlan.agentId ?? missionConfig.gliders?.[0]?.id ?? 'glider-1',
    gliderId: agentPlan.agentId ?? missionConfig.gliders?.[0]?.id ?? 'glider-1',
    timeSeconds: finiteNumber(waypoint.t ?? waypoint.plannedTimeSeconds, index),
    target: { x: finiteNumber(waypoint.x, 0), y: finiteNumber(waypoint.y, 0) },
    diveProfileId: waypoint.diveProfileId ?? agentPlan.diveProfileId ?? null
  })));
}

function scoreReportFromBrowserResult(result = {}, exportedResult = null) {
  const summary = exportedResult?.scoreSummary ?? result.summary ?? {};
  return {
    type: 'anchor.browser.result-score-shadow',
    finalScore: summary.finalScore ?? 0,
    notBrowserOfficialScoring: false,
    changesOfficialBrowserScoring: false
  };
}

function normalizeTerrainGrid(values, width, height) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => values?.[y]?.[x] ?? 0));
}

function isFinitePoint(value = {}) {
  return Number.isFinite(Number(value.x ?? value.position?.x ?? value.actual?.x)) && Number.isFinite(Number(value.y ?? value.position?.y ?? value.actual?.y));
}

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    if (child && typeof child === 'object') result[key] = compactObject(child);
    else result[key] = child;
  }
  return result;
}
