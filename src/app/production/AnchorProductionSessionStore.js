import { createGameState } from '../../game/state/GameState.js';
import { generateLevel } from '../../core/generation/LevelGenerator.js';
import { buildDefaultMissionForLevel } from '../../core/editor/LevelEditOperations.js';

export const ANCHOR_PRODUCTION_SESSION_STORE_VERSION = 'three-r3a-session-store';

const DEFAULT_CONFIG = Object.freeze({
  seed: 'three-r3a-next-shell-seed',
  challengeId: 'three-r3a-next-shell-baseline',
  width: 12,
  height: 10,
  duration: 24,
  planningWindow: 4,
  dt: 1,
  agentCount: 2,
  difficulty: 'medium',
  currentStrength: 1,
  hazardDensity: 0.04,
  terrainDensity: 0.05,
  roiHotspots: 3,
  challengeMode: 'perfectKnowledge',
  multipleDropZones: true,
  depthVariation: 0.8
});

export function createAnchorProductionSessionStore(options = {}) {
  const store = {
    type: 'anchor.production.session-store',
    version: ANCHOR_PRODUCTION_SESSION_STORE_VERSION,
    state: initialState(options),
    reset,
    clearRouteState,
    loadMission,
    ensureMission,
    addWaypoint,
    addSamplingTarget,
    launchMission,
    pauseSimulation,
    completeMission,
    openReplay,
    closeReplay,
    openEditor,
    editMissionDocument,
    previewEditorMission,
    returnToEditor,
    replaceFromImport,
    summary,
    digest
  };
  return store;
}

export function anchorProductionSessionSummary(storeOrState) {
  const state = storeOrState?.state ?? storeOrState ?? {};
  return {
    type: 'anchor.production.session-summary',
    version: ANCHOR_PRODUCTION_SESSION_STORE_VERSION,
    experienceMode: state.currentExperienceMode ?? null,
    challengeId: state.currentChallenge?.challengeId ?? state.currentChallenge?.levelId ?? null,
    scenarioId: state.currentScenario?.scenarioId ?? state.gameState?.level?.levelId ?? null,
    missionId: state.gameState?.mission?.missionId ?? null,
    selectedGlider: state.selectedGlider ?? null,
    planDigest: stableDigest(state.gameState?.plan),
    launchDigest: stableDigest(state.launchSnapshot),
    resultDigest: stableDigest(state.result),
    replayDigest: stableDigest(state.replayArtifacts),
    editorDocumentDigest: stableDigest(state.editorSession?.document),
    routeReturnContext: state.routeReturnContext ?? null,
    importSource: state.importSource ?? null,
    benchmarkContext: state.benchmarkContext ?? null,
    routeSequence: [...(state.routeSequence ?? [])],
    warnings: [...(state.warnings ?? [])]
  };
}

export function validateAnchorProductionSessionStore(store) {
  const errors = [];
  if (!store?.state) errors.push('Session store requires state.');
  if (store?.state?.gameState?.result && !store.state.gameState.level) errors.push('Result cannot exist without an active level.');
  if (store?.state?.activeLegacyIsland && store.state.gameState?.mode !== 'legacyLearningLab') errors.push('Legacy island flag must match route mode.');
  return { valid: errors.length === 0, errors, summary: anchorProductionSessionSummary(store) };
}

function initialState(options = {}) {
  const gameState = createGameState();
  gameState.experienceMode = 'challenge';
  return {
    gameState,
    currentExperienceMode: 'challenge',
    currentChallenge: null,
    currentScenario: null,
    selectedGlider: null,
    launchSnapshot: null,
    liveSimulationSession: null,
    result: null,
    replayArtifacts: null,
    editorSession: null,
    routeReturnContext: null,
    importSource: null,
    benchmarkContext: null,
    routeSequence: [],
    activeLegacyIsland: false,
    warnings: [],
    config: { ...DEFAULT_CONFIG, ...(options.defaultMissionConfig ?? {}) }
  };
}

function reset(reason = 'manual-reset') {
  const config = { ...(this.state?.config ?? DEFAULT_CONFIG) };
  this.state = initialState({ defaultMissionConfig: config });
  this.state.lastResetReason = reason;
  return this.state;
}

function clearRouteState(routeId) {
  const state = this.state;
  state.routeSequence.push(routeId);
  if (routeId === 'productHub') {
    state.routeReturnContext = null;
    state.liveSimulationSession = null;
    state.activeLegacyIsland = false;
    state.gameState.simulation = { running: false, paused: false, waitingForPlayerDecision: false, waitingForImport: false, waitingForExternalSolver: false, pauseReason: null };
  }
  return state;
}

function ensureMission() {
  if (!this.state.gameState.level || !this.state.gameState.mission) this.loadMission();
  return this.state;
}

function loadMission(configPatch = {}) {
  const config = { ...(this.state.config ?? DEFAULT_CONFIG), ...(configPatch ?? {}) };
  const level = generateLevel(config);
  const mission = buildDefaultMissionForLevel(level, {
    agentCount: config.agentCount,
    missionId: 'three_r3a_parity_mission',
    name: 'R3A Parity Mission',
    deploymentMode: 'fixedStart',
    battery: 120,
    maxSpeed: 1.25
  });
  const plan = buildInitialPlan(level, mission);
  this.state.config = config;
  this.state.currentChallenge = level;
  this.state.currentScenario = { scenarioId: level.levelId ?? level.instanceId ?? 'three-r3a-scenario', source: 'deterministicGenerated' };
  this.state.selectedGlider = mission.agents?.[0]?.id ?? null;
  this.state.gameState.level = level;
  this.state.gameState.mission = mission;
  this.state.gameState.plan = plan;
  this.state.gameState.selectedAgentId = this.state.selectedGlider;
  this.state.gameState.challengeMode = config.challengeMode ?? 'perfectKnowledge';
  this.state.gameState.experienceMode = 'challenge';
  this.state.gameState.currentScenario = this.state.currentScenario;
  this.state.gameState.result = null;
  this.state.result = null;
  this.state.replayArtifacts = null;
  this.state.launchSnapshot = null;
  return this.state;
}

function addWaypoint(agentId = null) {
  this.ensureMission();
  const mission = this.state.gameState.mission;
  const plan = this.state.gameState.plan;
  const agent = mission.agents?.find((candidate) => candidate.id === agentId) ?? mission.agents?.[0];
  const agentPlan = plan.agentPlans.find((candidate) => candidate.agentId === agent.id);
  const last = agentPlan.waypoints.at(-1) ?? agent.start ?? { x: 1, y: 1 };
  const grid = this.state.gameState.level.world.grid;
  const waypoint = {
    id: `${agent.id}-manual-${agentPlan.waypoints.length + 1}`,
    x: Math.max(0, Math.min(grid.width - 1, Math.round(last.x + 2))),
    y: Math.max(0, Math.min(grid.height - 1, Math.round(last.y + 1))),
    t: agentPlan.waypoints.length + 2,
    action: 'sample'
  };
  agentPlan.waypoints.push(waypoint);
  return waypoint;
}

function addSamplingTarget() {
  this.ensureMission();
  const plan = this.state.gameState.plan;
  const grid = this.state.gameState.level.world.grid;
  plan.scienceTargets ??= [];
  const target = {
    id: `science-target-${plan.scienceTargets.length + 1}`,
    x: Math.max(1, Math.round(grid.width * 0.66)),
    y: Math.max(1, Math.round(grid.height * 0.48)),
    depthLayerId: 'thermocline',
    targetDepthMeters: 80,
    priority: 1,
    executable: false
  };
  plan.scienceTargets.push(target);
  return target;
}

function launchMission() {
  this.ensureMission();
  const state = this.state;
  state.launchSnapshot = {
    missionId: state.gameState.mission?.missionId ?? null,
    levelId: state.gameState.level?.levelId ?? null,
    planDigest: stableDigest(state.gameState.plan),
    launchedAtStep: state.routeSequence.length,
    shell: 'next'
  };
  state.liveSimulationSession = {
    running: true,
    paused: false,
    simTime: 0,
    steps: 0,
    terminalReason: null
  };
  state.gameState.simulation = { running: true, paused: false, waitingForPlayerDecision: false, waitingForImport: false, waitingForExternalSolver: false, pauseReason: null };
  return state.liveSimulationSession;
}

function pauseSimulation() {
  if (!this.state.liveSimulationSession) this.launchMission();
  this.state.liveSimulationSession.paused = !this.state.liveSimulationSession.paused;
  this.state.gameState.simulation.paused = this.state.liveSimulationSession.paused;
  return this.state.liveSimulationSession;
}

function completeMission(reason = 'completed') {
  if (!this.state.liveSimulationSession) this.launchMission();
  const plan = this.state.gameState.plan;
  const waypointCount = plan?.agentPlans?.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0) ?? 0;
  const scienceTargets = plan?.scienceTargets?.length ?? 0;
  const score = waypointCount * 12 + scienceTargets * 8;
  const result = {
    schemaVersion: '2.0',
    type: 'anchor.result',
    planName: 'R3A next-shell deterministic route',
    missionId: this.state.gameState.mission?.missionId ?? null,
    levelId: this.state.gameState.level?.levelId ?? null,
    experienceMode: this.state.currentExperienceMode,
    challengeMode: this.state.gameState.challengeMode,
    terminalReason: reason,
    summary: {
      finalScore: score,
      sampleScore: waypointCount * 10,
      energyUsed: waypointCount * 3,
      hazardsHit: 0,
      completedWaypoints: waypointCount,
      priorityTargets: { captured: scienceTargets, available: scienceTargets }
    },
    events: plan.agentPlans.flatMap((agentPlan) => (agentPlan.waypoints ?? []).map((waypoint, index) => ({
      type: 'sample',
      agentId: agentPlan.agentId,
      waypointId: waypoint.id,
      step: index + 1,
      x: waypoint.x,
      y: waypoint.y
    }))),
    routeSequence: [...this.state.routeSequence]
  };
  this.state.liveSimulationSession = { running: false, paused: false, simTime: waypointCount, steps: waypointCount, terminalReason: reason };
  this.state.gameState.simulation.running = false;
  this.state.gameState.result = result;
  this.state.result = result;
  this.state.replayArtifacts = buildReplayArtifacts(this.state, result);
  return result;
}

function openReplay() {
  if (!this.state.result) this.completeMission('completed');
  this.state.routeReturnContext = { from: 'missionDebrief', focusSelector: '[data-action="open-replay"]' };
  return this.state.replayArtifacts;
}

function closeReplay() {
  this.state.routeReturnContext = null;
  return this.state;
}

function openEditor() {
  this.ensureMission();
  this.state.editorSession = {
    id: 'three-r3a-editor-session',
    document: {
      schemaVersion: '2.0',
      type: 'anchor.editor.document',
      levelId: this.state.gameState.level?.levelId ?? null,
      missionId: this.state.gameState.mission?.missionId ?? null,
      edits: []
    },
    previewReturnRoute: null
  };
  return this.state.editorSession;
}

function editMissionDocument(patch = {}) {
  if (!this.state.editorSession) this.openEditor();
  const edit = { id: `edit-${this.state.editorSession.document.edits.length + 1}`, type: patch.type ?? 'hazard-preview', value: patch.value ?? true };
  this.state.editorSession.document.edits.push(edit);
  return edit;
}

function previewEditorMission() {
  if (!this.state.editorSession) this.openEditor();
  this.state.editorSession.previewReturnRoute = 'missionEditor';
  this.state.routeReturnContext = { from: 'missionEditor', focusSelector: '[data-action="preview-editor"]' };
  this.ensureMission();
  return this.state;
}

function returnToEditor() {
  this.state.routeReturnContext = null;
  return this.state.editorSession ?? this.openEditor();
}

function replaceFromImport(payload = null, source = 'manual-import') {
  this.state.importSource = source;
  if (payload?.type === 'anchor.level') {
    this.state.gameState.level = payload;
  }
  return this.state;
}

function summary() {
  return anchorProductionSessionSummary(this);
}

function digest() {
  return stableDigest(anchorProductionSessionSummary(this));
}

function buildInitialPlan(level, mission) {
  const grid = level.world.grid;
  const agentPlans = (mission.agents ?? []).map((agent, index) => {
    const start = agent.start ?? agent.deployment?.selectedStart ?? { x: 1, y: 1 + index };
    const waypointA = { id: `${agent.id}-wp-1`, x: clamp(start.x + 2, 0, grid.width - 1), y: clamp(start.y + 1, 0, grid.height - 1), t: 1, action: 'sample' };
    const waypointB = { id: `${agent.id}-wp-2`, x: clamp(start.x + 4, 0, grid.width - 1), y: clamp(start.y + 2, 0, grid.height - 1), t: 2, action: 'sample' };
    return { agentId: agent.id, waypoints: [waypointA, waypointB] };
  });
  return {
    schemaVersion: '2.0',
    type: 'anchor.plan',
    planId: 'three-r3a-next-shell-plan',
    levelId: level.levelId ?? level.instanceId ?? null,
    missionId: mission.missionId ?? null,
    agentPlans,
    scienceTargets: [{ id: 'science-target-1', x: Math.round(grid.width * 0.66), y: Math.round(grid.height * 0.5), depthLayerId: 'thermocline', targetDepthMeters: 80, priority: 1, executable: false }],
    planningMarkers: []
  };
}

function buildReplayArtifacts(state, result) {
  return {
    type: 'anchor.replay.public-summary',
    version: 'three-r3a-replay-summary',
    missionId: result.missionId,
    levelId: result.levelId,
    planDigest: stableDigest(state.gameState.plan),
    resultDigest: stableDigest(result),
    events: result.events ?? [],
    terminalReason: result.terminalReason
  };
}

function stableDigest(value) {
  if (value == null) return null;
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}
