import { expect } from '@playwright/test';

export const ACCEPTANCE_FIXTURE = '/docs/examples/headless_replay_r2a_acceptance.example.json';
export const TAMPERED_FIXTURE = '/docs/examples/headless_replay_tampered_digest.example.json';

export async function boot(page, baseUrl) {
  await page.goto(baseUrl + '/');
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.phaser)), { timeout: 20000 }).toBe(true);
}

export async function openAcceptanceReplay(page) {
  await openReplayBundle(page, ACCEPTANCE_FIXTURE);
}

export async function openReplayBundle(page, fixturePath, sourceKind = 'headlessBundleViewer') {
  await page.evaluate(async ({ fixturePath, sourceKind }) => {
    const response = await fetch(fixturePath, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to fetch ${fixturePath}: HTTP ${response.status}`);
    const payload = await response.json();
    const { buildHeadlessBundleFromFiles } = await import('/src/core/headless/HeadlessBundleLoader.js');
    const { buildReplayReviewSourceFromBundle } = await import('/src/core/replay/ReplayReviewLoader.js');
    const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
    window.anchorGame.state.replayReviewSourceBundle = bundle;
    window.anchorGame.state.replayReviewSource = buildReplayReviewSourceFromBundle(bundle, { sourceKind });
    window.anchorGame.state.replayReviewReturnScene = sourceKind === 'browserResult' ? 'DebriefScene' : 'HeadlessBundleViewerScene';
    window.anchorGame.goTo('replayReview');
  }, { fixturePath, sourceKind });
  await waitForReplayReview(page);
}

export async function waitForReplayReview(page) {
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
}

export async function seedDebriefWithAcceptanceResult(page) {
  const seed = await page.evaluate(async ({ fixturePath }) => {
    const response = await fetch(fixturePath, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to fetch ${fixturePath}: HTTP ${response.status}`);
    const payload = await response.json();
    const { buildHeadlessBundleFromFiles } = await import('/src/core/headless/HeadlessBundleLoader.js');
    const { replayDigest } = await import('/src/core/replay/ReplayDigest.js');
    const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
    const missionConfig = bundle.missionConfig ?? {};
    const visible = bundle.visibleFields ?? {};
    const tracks = bundle.gliderTracks ?? [];
    const observations = bundle.observations ?? [];
    const terrainEvents = bundle.episode?.terrainEvents ?? bundle.terrainEvents ?? [];
    const surfacingEvents = bundle.episode?.surfacingEvents ?? [];
    const actions = bundle.episode?.actions ?? [];
    const byAgent = new Map();
    for (const action of actions) {
      const agentId = action.agentId ?? action.gliderId ?? missionConfig.gliders?.[0]?.id ?? 'glider-alpha';
      if (!byAgent.has(agentId)) byAgent.set(agentId, []);
      byAgent.get(agentId).push({ id: action.id, x: action.target?.x ?? action.x, y: action.target?.y ?? action.y, action: action.type ?? 'sample', diveProfileId: action.diveProfileId ?? null });
    }
    const plan = { agentPlans: [...byAgent.entries()].map(([agentId, waypoints]) => ({ agentId, waypoints })) };
    const level = {
      levelId: missionConfig.scenarioId ?? bundle.manifest?.scenarioId,
      instanceId: bundle.manifest?.episodeId,
      challengeMode: 'deterministicReplay',
      world: { grid: visible.grid ?? { width: missionConfig.world?.width ?? 12, height: missionConfig.world?.height ?? 12 }, time: { dt: missionConfig.world?.timeStepSeconds ?? 60 }, waterColumnConfig: missionConfig.world?.waterColumnConfig ?? null },
      layers: { terrain: visible.terrain ?? [], hazards: visible.hazards ?? [] },
      bathymetry: { depthMeters: bundle.bathymetrySummary?.depthField ?? bundle.bathymetrySummary?.depthMeters ?? [] },
      meta: { experienceMode: 'simulationLab', publicSafe: true }
    };
    const mission = {
      missionId: missionConfig.missionId,
      agents: (missionConfig.gliders ?? []).map((glider) => ({ id: glider.id, start: glider.start, deployment: { selectedStart: glider.start }, diveProfileId: glider.diveProfileId ?? null })),
      world: { waterColumnConfig: missionConfig.world?.waterColumnConfig ?? null },
      meta: { experienceMode: 'simulationLab' }
    };
    const resultEvents = [
      ...observations.map((observation, index) => ({ id: observation.observationId ?? `observation-${index + 1}`, type: 'sample', eventType: 'sample', agentId: observation.agentId ?? observation.gliderId, x: observation.x, y: observation.y, depthMeters: observation.depthMeters, depthLayerId: observation.depthLayerId, observedValue: observation.observedValue, value: observation.observedValue, timeSeconds: observation.timeSeconds, t: observation.timeSeconds })),
      ...terrainEvents.map((event, index) => ({ ...event, id: event.id ?? event.eventId ?? `terrain-${index + 1}`, type: event.type ?? event.eventType ?? 'anchor.simulation.terrain-clearance-warning', eventType: event.eventType ?? event.type ?? 'anchor.simulation.terrain-clearance-warning', timeSeconds: event.timeSeconds ?? event.t ?? index, t: event.timeSeconds ?? event.t ?? index })),
      ...surfacingEvents.map((event, index) => ({ ...event, id: event.id ?? `surfacing-${index + 1}`, type: event.type ?? 'surfacing', eventType: event.eventType ?? event.type ?? 'surfacing', timeSeconds: event.timeSeconds ?? event.t ?? index, t: event.timeSeconds ?? event.t ?? index }))
    ].sort((a, b) => Number(a.timeSeconds ?? a.t ?? 0) - Number(b.timeSeconds ?? b.t ?? 0));
    const result = {
      type: 'anchor.result',
      levelId: level.levelId,
      missionId: mission.missionId,
      instanceId: bundle.manifest?.episodeId,
      challengeMode: 'deterministicReplay',
      experienceMode: 'simulationLab',
      planName: 'THREE-R2A acceptance replay fixture',
      source: 'THREE-R2A acceptance replay fixture',
      summary: { finalScore: bundle.scoreReport?.finalScore ?? 0, score: bundle.scoreReport?.finalScore ?? 0, sampleScore: observations.length * 10, energyUsed: 14, completedWaypoints: actions.length, observationCount: observations.length, terrainDiagnostics: { eventCount: terrainEvents.length } },
      priorityTargets: { captured: 2, available: 2, score: 20 },
      routeExecution: { frames: tracks.map((track, index) => ({ t: track.timeSeconds ?? index, timeSeconds: track.timeSeconds ?? index, agents: [{ ...track, id: track.agentId ?? track.gliderId }] })), events: resultEvents },
      frames: tracks.map((track, index) => ({ ...track, t: track.timeSeconds ?? index })),
      events: resultEvents,
      terrainEvents,
      actualTerrainDiagnostics: { minimumActualClearanceMeters: 8, maximumActualDepthMeters: 92, eventSummary: { eventCount: terrainEvents.length } },
      depthScience: { scoreProfileId: 'r2a-acceptance', samplesByDepthLayer: { thermocline: 1, midwater: 1 }, scienceValueByDepthLayer: { thermocline: 20, midwater: 18 }, totalScienceScore: 38, verticalCoverage: 'multi-layer', maximumActualDepthMeters: 92 },
      scoreReport: bundle.scoreReport
    };
    result.resultDigest = replayDigest(result).value;
    window.anchorGame.state.level = level;
    window.anchorGame.state.mission = mission;
    window.anchorGame.state.plan = plan;
    window.anchorGame.state.result = result;
    window.anchorGame.state.experienceMode = 'simulationLab';
    window.anchorGame.state.replayReviewSource = null;
    window.anchorGame.state.replayReviewSourceBundle = null;
    window.anchorGame.state.replayReviewReturnScene = 'DebriefScene';
    window.anchorGame.goTo('debrief');
    return { missionId: mission.missionId, resultDigest: result.resultDigest, officialScore: result.summary.finalScore };
  }, { fixturePath: ACCEPTANCE_FIXTURE });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  return seed;
}

export async function clickAction(page, action) {
  await page.locator(`[data-action="${action}"]`).first().click();
}

export async function scrubReplayTo(page, eventIndex) {
  await page.locator('#three-replay-scrub').evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, eventIndex);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_REPLAY_DEBUG?.currentEventIndex ?? -1), { timeout: 10000 }).toBe(eventIndex);
}
export async function debriefState(page) {
  return page.evaluate(() => ({ missionId: window.anchorGame.state.mission?.missionId ?? null, resultDigest: window.anchorGame.state.result?.resultDigest ?? null, officialScore: window.anchorGame.state.result?.summary?.finalScore ?? null }));
}

export async function replaySnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene');
    const debug = window.ANCHOR_THREE_REPLAY_DEBUG ?? {};
    const viewModel = scene?.controller?.viewModel ?? {};
    const gliders = (viewModel.gliders ?? []).map((glider) => ({ agentId: glider.agentId ?? glider.id, x: glider.x, y: glider.y, z: glider.z, depthMeters: glider.depthMeters ?? Math.abs(Number(glider.z ?? 0)), depthLayerId: glider.depthLayerId, selected: glider.selected === true }));
    const selectedAgentPose = gliders.find((glider) => glider.selected) ?? null;
    const observations = viewModel.observations ?? [];
    const routeFailures = viewModel.routeFailures ?? [];
    const realizedTrajectories = viewModel.realizedTrajectories ?? [];
    return {
      ...debug,
      officialScore: window.anchorGame.state.result?.summary?.finalScore ?? window.anchorGame.state.result?.scoreReport?.finalScore ?? null,
      resultDigest: debug.resultDigest ?? window.anchorGame.state.result?.resultDigest ?? null,
      gliders,
      visibleAgentCount: gliders.length,
      selectedAgentPose,
      publicAgentPoseDigest: JSON.stringify(gliders.map((glider) => [glider.agentId, glider.x, glider.y, glider.depthMeters, glider.depthLayerId])),
      maxGliderDepthMeters: Math.max(0, ...gliders.map((glider) => Number(glider.depthMeters ?? 0))),
      observations,
      routeFailures,
      realizedTrajectories,
      realizedTrajectoryObjectCount: debug.realizedTrajectoryObjectCount ?? realizedTrajectories.length,
      realizedTrajectoryPointCount: debug.realizedTrajectoryPointCount ?? realizedTrajectories.reduce((sum, trajectory) => sum + (trajectory.points?.length ?? 0), 0),
      observationCount: debug.observationCount ?? observations.length,
      terrainEventCount: debug.terrainEventCount ?? routeFailures.length
    };
  });
}

export async function replayEventIds(page) {
  return page.evaluate(() => {
    const viewModel = window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene')?.controller?.viewModel ?? {};
    const observationIds = (viewModel.observations ?? []).map((entry) => entry.id).filter(Boolean);
    const terrainEventIds = (viewModel.routeFailures ?? []).map((entry) => entry.id).filter(Boolean);
    return { observationIds, terrainEventIds, uniqueObservationIds: new Set(observationIds).size, uniqueTerrainEventIds: new Set(terrainEventIds).size };
  });
}

export async function browserReplaySemantics(page) {
  return page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene');
    const { replayReviewSessionSummary } = await import('/src/core/replay/ReplayReviewSession.js');
    const { replayWorldRenderViewModelSummary } = await import('/src/core/rendering/ReplayWorldRenderViewModel.js');
    return { summary: replayReviewSessionSummary(scene.session), vmSummary: replayWorldRenderViewModelSummary(scene.controller.viewModel), terminal: scene.session.playbackState?.terminalState?.completed === true };
  });
}

export async function reducerSemanticsAt(page, eventIndex) {
  return page.evaluate(async ({ eventIndex }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionReplayReviewScene');
    const { createReplayReviewSession, reduceReplayReviewSession, replayReviewSessionSummary } = await import('/src/core/replay/ReplayReviewSession.js');
    const { buildReplayWorldRenderViewModel, replayWorldRenderViewModelSummary } = await import('/src/core/rendering/ReplayWorldRenderViewModel.js');
    let session = createReplayReviewSession(scene.source);
    session = reduceReplayReviewSession(session, { type: 'scrub', eventIndex });
    const viewModel = buildReplayWorldRenderViewModel(session);
    return { summary: replayReviewSessionSummary(session), vmSummary: replayWorldRenderViewModelSummary(viewModel), terminal: session.playbackState?.terminalState?.completed === true };
  }, { eventIndex });
}
