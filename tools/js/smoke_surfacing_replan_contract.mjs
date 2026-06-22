import assert from 'node:assert/strict';
import {
  SURFACING_DECISION_ACTION,
  createSurfacingDecisionState,
  validateSurfacingDecisionState,
  summarizeSurfaceDecisionEvents
} from '../../src/core/simulation/SurfacingDecisionState.js';
import {
  createSurfacingDecisionTransaction,
  startSurfacingReplan,
  commitSurfacingReplan,
  cancelSurfacingReplan,
  validateSurfacingDecisionTransaction
} from '../../src/core/simulation/SurfacingDecisionTransaction.js';
import {
  createSurfacingReplanHandoff,
  commitSurfacingReplanResumeState,
  validateSurfacingReplanHandoff
} from '../../src/core/planning/SurfacingReplanHandoff.js';

const level = {
  levelId: 'surface-smoke-level',
  world: { grid: { width: 8, height: 8 }, time: { duration: 120, planningWindow: 30 } }
};
const mission = {
  missionId: 'surface-smoke-mission',
  agents: [{ id: 'glider_01', label: 'Glider 01', start: { x: 1, y: 1 }, deployment: { mode: 'fixedStart', selectedStart: { x: 1, y: 1 } } }],
  rules: { communication: { updatePenalty: 2 } }
};
const plan = {
  type: 'anchor.plan',
  agentPlans: [{
    agentId: 'glider_01',
    waypoints: [
      { id: 'wp-1', x: 2, y: 2, t: 20, kind: 'navigation' },
      { id: 'wp-2', x: 5, y: 5, t: 60, kind: 'surface' }
    ]
  }]
};
const engine = {
  t: 30,
  events: [{ type: 'surfaceDecisionRequired', t: 30, agentId: 'glider_01' }],
  agents: [{
    id: 'glider_01',
    x: 2.4,
    y: 2.1,
    battery: 88,
    sampleScore: 4,
    currentWaypointIndex: 1,
    completedWaypoints: [{ waypointIndex: 0 }],
    missedWaypoints: []
  }],
  createResumeState() {
    return resumeState;
  }
};
const decision = {
  active: true,
  agentId: 'glider_01',
  time: 30,
  t: 30,
  expected: { x: 2, y: 2 },
  actual: { x: 2.4, y: 2.1 },
  reason: 'scheduledSurface',
  agents: [{ agentId: 'glider_01', expected: { x: 2, y: 2 }, actual: { x: 2.4, y: 2.1 } }],
  actions: { continueMission: true, updateWaypoints: true, exportObservationData: true, importWaypointData: true, finishMission: true }
};
const resumeState = {
  t: 30,
  agents: engine.agents,
  events: [...engine.events],
  loggerFrames: [],
  handledSurfacingTimes: [30],
  surfaceDecision: decision,
  awaitingSurfaceDecision: decision,
  missionState: {}
};

const decisionState = createSurfacingDecisionState({ level, mission, plan, engine, decision });
assert.equal(validateSurfacingDecisionState(decisionState).ok, true, 'decision state validates');
assert.equal(decisionState.pendingWaypointCount, 1, 'pending waypoint count preserves future work');
assert.equal(decisionState.boundaryFlags.createsNewPlanner, false, 'decision does not create planner');

let transaction = createSurfacingDecisionTransaction({ decisionState });
transaction = startSurfacingReplan(transaction, { source: 'smoke' });
assert.equal(validateSurfacingDecisionTransaction(transaction).ok, true, 'replan transaction validates');
assert.equal(transaction.selectedAction, SURFACING_DECISION_ACTION.UPDATE_WAYPOINTS, 'transaction selects waypoint update');

const handoff = createSurfacingReplanHandoff({ level, mission, plan, engine, decisionState, transaction, resumeState, surfacedAgentId: 'glider_01' });
assert.equal(validateSurfacingReplanHandoff(handoff).ok, true, 'handoff validates');
assert.equal(handoff.resumeState.awaitingSurfaceDecision.agentId, 'glider_01', 'handoff keeps paused decision before commit');
assert.equal(handoff.boundaryFlags.usesNewPlanner, false, 'handoff excludes new planner');

const committedTransaction = commitSurfacingReplan(transaction, { source: 'smokeCommit' });
const committedResume = commitSurfacingReplanResumeState(resumeState, { decisionState, transaction: committedTransaction, updatePenalty: 2 });
assert.equal(committedResume.awaitingSurfaceDecision, null, 'commit clears pending surface decision');
assert.equal(committedResume.surfaceDecision, null, 'commit clears public surface decision');
assert.ok(committedResume.events.some((event) => event.type === 'surfaceDecision' && event.action === 'updateWaypoints'), 'commit records canonical surfaceDecision updateWaypoints event');
assert.ok(committedResume.events.some((event) => event.type === 'replanned' && event.agentId === 'glider_01'), 'commit records replanned event');
assert.ok(committedResume.events.some((event) => event.type === 'anchor.simulation.surfacing-replan-committed'), 'commit records compact replay event');

const summary = summarizeSurfaceDecisionEvents(committedResume.events);
assert.equal(summary.updateWaypointCount, 1, 'result summary counts committed waypoint update');
assert.equal(summary.boundaryFlags.changesOfficialScoring, false, 'summary preserves scoring boundary');

const cancelled = cancelSurfacingReplan(transaction, { source: 'smokeCancel' });
assert.equal(cancelled.status, 'cancelled', 'cancel transaction records cancellation');

console.log(JSON.stringify({ ok: true, decisionId: decisionState.id, transactionId: transaction.transactionId, committedEventCount: committedResume.events.length }));