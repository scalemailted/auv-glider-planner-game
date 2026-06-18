#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { publicReplayStateDigest, REPLAY_DIGEST_ALGORITHM } from '../../src/core/replay/ReplayDigest.js';
import { assignCanonicalReplaySequences } from '../../src/core/replay/ReplayOrdering.js';
import {
  REPLAY_ARTIFACT_TYPES,
  REPLAY_MODES,
  REPLAY_NUMERIC_POLICY,
  REPLAY_ORDERING_POLICY,
  REPLAY_R1_CONTRACT_ID,
  REPLAY_R1_SCHEMA_VERSION
} from '../../src/core/replay/ReplaySchema.js';
import { verifyReplayIntegrity } from '../../src/core/replay/ReplayIntegrityVerifier.js';

const OUT = 'docs/examples';
const CREATED_AT = '2026-06-18T00:00:00.000Z';

function baseState(agentIds) {
  const agentStates = Object.fromEntries(agentIds.map((agentId, index) => [agentId, {
    x: index * 2,
    y: 0,
    zIndex: 0,
    depthLayerId: 'surface',
    battery: 1,
    energyUsed: 0,
    status: 'initial',
    lastUpdateTick: 0
  }]));
  return {
    tick: 0,
    timeSeconds: 0,
    globalState: { missionStatus: 'active' },
    agentStates,
    vehicles: agentStates,
    activeObjectives: [{ objectiveId: 'survey-start', label: 'Survey Start' }],
    observationSummary: { count: 0, byAgent: {}, lastObservationId: null, meanObservedValue: null },
    surfacingCount: 0,
    objectiveTransitionCount: 0,
    score: null,
    missionOutcomeStatus: 'running',
    completed: false
  };
}

function event(rawIndex, tick, phase, eventType, agentId, payload = {}) {
  return {
    type: REPLAY_ARTIFACT_TYPES.event,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayId: 'pending',
    rawSequence: rawIndex,
    sequence: rawIndex,
    tick,
    timeSeconds: tick * 60,
    phase,
    eventType,
    agentId,
    visibilityTier: 'publicScenario',
    publicSafe: true,
    payload
  };
}

function createEvents(replayId, agentIds) {
  let raw = 0;
  const events = [event(++raw, 0, 'initial', 'replay.initialState', null, baseState(agentIds))];
  for (const agentId of agentIds) events.push(event(++raw, 1, 'command', 'control.target', agentId, { target: { x: agentId.endsWith('bravo') ? 4 : 2, y: 1 }, note: 'fixture command' }));
  for (const [index, agentId] of agentIds.entries()) events.push(event(++raw, 2, 'vehicleState', 'vehicle.publicState', agentId, { x: 1 + index * 2, y: 1, zIndex: 0, depthLayerId: 'surface', battery: 0.98, energyUsed: 0.2, status: 'underway' }));
  for (const [index, agentId] of agentIds.entries()) events.push(event(++raw, 3, 'observation', 'publicObservation.sample', agentId, { observationId: `obs-${agentId}`, x: 1 + index * 2, y: 1, observedValue: 0.42 + index * 0.05, surprise: 0.1 }));
  events.push(event(++raw, 4, 'surfacing', 'vehicle.surfacing', agentIds[0], { surfacingId: 'surface-alpha', reason: 'scheduled-uplink' }));
  events.push(event(++raw, 5, 'objective', 'objective.transition', null, { objectiveId: 'front-check', label: 'Front Check', source: 'mission-manager-fixture' }));
  events.push(event(++raw, 6, 'score', 'score.publicSummary', null, { score: { finalScore: 77, changesOfficialBrowserScoring: false, notBrowserOfficialScoring: true }, missionOutcomeStatus: 'complete' }));
  events.push(event(++raw, 7, 'terminal', 'mission.terminal', null, { reason: 'fixture-complete' }));
  return assignCanonicalReplaySequences(events)
    .map((entry) => ({ ...entry, replayId }))
    .map((entry) => ({ ...entry, eventId: `${replayId}-event-${String(entry.sequence).padStart(5, '0')}` }));
}

function publicStateAt(events, tick, agentIds) {
  const state = structuredClone(baseState(agentIds));
  state.tick = tick;
  state.timeSeconds = tick * 60;
  const values = [];
  for (const event of events) {
    if (event.tick > tick) break;
    const payload = event.payload ?? {};
    if (event.phase === 'vehicleState' && event.agentId) {
      state.agentStates[event.agentId] = { ...state.agentStates[event.agentId], ...payload, lastUpdateTick: event.tick };
      state.vehicles = state.agentStates;
    } else if (event.phase === 'observation') {
      state.observationSummary.count += 1;
      state.observationSummary.byAgent[event.agentId] = (state.observationSummary.byAgent[event.agentId] ?? 0) + 1;
      state.observationSummary.lastObservationId = payload.observationId;
      values.push(payload.observedValue);
      state.observationSummary.meanObservedValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    } else if (event.phase === 'surfacing') {
      state.surfacingCount += 1;
      state.lastSurfacing = { tick: event.tick, timeSeconds: event.timeSeconds, agentId: event.agentId, reason: payload.reason };
    } else if (event.phase === 'objective') {
      state.objectiveTransitionCount += 1;
      state.activeObjectives = [{ objectiveId: payload.objectiveId, label: payload.label }];
    } else if (event.phase === 'score') {
      state.score = payload.score;
      state.missionOutcomeStatus = payload.missionOutcomeStatus;
    } else if (event.phase === 'terminal') {
      state.completed = true;
      state.globalState.missionStatus = 'complete';
      state.terminationReason = payload.reason;
    }
  }
  return state;
}

function checkpoint(replayId, index, tick, reason, events, agentIds) {
  const publicState = publicStateAt(events, tick, agentIds);
  const digest = publicReplayStateDigest(publicState, REPLAY_NUMERIC_POLICY);
  return {
    type: REPLAY_ARTIFACT_TYPES.checkpoint,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    checkpointId: `${replayId}-checkpoint-${String(index).padStart(3, '0')}`,
    tick,
    timeSeconds: tick * 60,
    reason,
    reasons: reason === 'periodic' ? ['periodic'] : [reason, ...(reason === 'initial' || reason === 'terminal' ? [] : ['periodic'])],
    eventCursor: events.filter((event) => event.tick <= tick).length,
    publicState,
    agentStates: publicState.agentStates,
    objectiveState: { activeObjectives: publicState.activeObjectives },
    digest,
    digestAlgorithmId: REPLAY_DIGEST_ALGORITHM,
    digestVersion: 'replay-digest-v1',
    quantization: REPLAY_NUMERIC_POLICY.id,
    publicSafe: true
  };
}

function createReplayBundle({ replayId, agentIds, multiAgent = false }) {
  const events = createEvents(replayId, agentIds);
  const checkpoints = [
    checkpoint(replayId, 0, 0, 'initial', events, agentIds),
    checkpoint(replayId, 1, 2, 'periodic', events, agentIds),
    checkpoint(replayId, 2, 4, 'surfacing', events, agentIds),
    checkpoint(replayId, 3, 5, 'objectiveTransition', events, agentIds),
    checkpoint(replayId, 4, 7, 'terminal', events, agentIds)
  ];
  const manifest = {
    type: REPLAY_ARTIFACT_TYPES.manifest,
    version: REPLAY_R1_SCHEMA_VERSION,
    schemaVersion: REPLAY_R1_SCHEMA_VERSION,
    replayVersion: REPLAY_R1_SCHEMA_VERSION,
    contract: REPLAY_R1_CONTRACT_ID,
    replayId,
    replayMode: REPLAY_MODES.publicObservationPlayback,
    replayFidelity: 'publicObservationPlaybackWithCheckpointDigests',
    compatibilityStatus: 'current',
    missionId: 'h4-1-replay-contract-mission',
    scenarioId: 'h4-1-public-replay-fixture',
    episodeId: `${replayId}-episode`,
    seed: `${replayId}-seed`,
    seedSubstreams: { rootSeed: `${replayId}-seed`, replayUsesMathRandom: false },
    deterministicSubstreams: { rootSeed: `${replayId}-seed`, replayUsesMathRandom: false },
    timingModel: { type: 'fixedStep', dtSeconds: 60, terminalTick: 7, maxTimeSeconds: 420, wallClockAffectsSimulation: false },
    timestepSeconds: 60,
    initialPublicState: checkpoints[0].publicState,
    initialState: checkpoints[0].publicState,
    agentIds,
    featureFlags: { multiAgentReplayContractOnly: multiAgent, officialBrowserScoringChanged: false, usesNewPlanner: false, usesRouteOptimizer: false, usesPythonSimulator: false, usesMARL: false },
    replayModeImplemented: 'publicObservationPlayback',
    publicObservationPlaybackImplemented: true,
    reservedReplayModesImplemented: false,
    eventOrderingPolicy: REPLAY_ORDERING_POLICY,
    checkpointPolicy: { id: 'replay-h4.1-public-checkpoints', requiredReasons: ['initial', 'terminal'], eventCursorSemantics: 'count of events consumed through checkpoint tick' },
    numericPolicy: REPLAY_NUMERIC_POLICY,
    publicBoundary: 'Public replay artifacts contain recorded public state only and do not reconstruct hidden truth.',
    terminalReason: 'fixture-complete',
    terminationReason: 'fixture-complete',
    bundleSchemaVersion: 'headless-combined-bundle-h2',
    scoringSchemaVersion: 'score-r1-shadow-fixture',
    changesOfficialBrowserScoring: false,
    replayAuthoritativeForBrowserScoring: false,
    publicSafe: true,
    hiddenTruthIncluded: false,
    requiresHiddenTruth: false,
    visibilityTier: 'publicScenario',
    multiAgentReplayContractOnly: multiAgent,
    notA: ['not authoritative hidden-state resimulation', 'not route planning', 'not route optimization', 'not Python simulator', 'not RL/MARL', 'not official browser scoring']
  };
  const replayEvents = { type: REPLAY_ARTIFACT_TYPES.events, version: REPLAY_R1_SCHEMA_VERSION, schemaVersion: REPLAY_R1_SCHEMA_VERSION, replayVersion: REPLAY_R1_SCHEMA_VERSION, contract: REPLAY_R1_CONTRACT_ID, replayId, eventOrderingPolicy: REPLAY_ORDERING_POLICY, events, summary: { eventCount: events.length, terminalTick: 7 } };
  const replayCheckpoints = { type: REPLAY_ARTIFACT_TYPES.checkpoints, version: REPLAY_R1_SCHEMA_VERSION, schemaVersion: REPLAY_R1_SCHEMA_VERSION, replayVersion: REPLAY_R1_SCHEMA_VERSION, contract: REPLAY_R1_CONTRACT_ID, replayId, digestAlgorithm: REPLAY_DIGEST_ALGORITHM, numericPolicy: REPLAY_NUMERIC_POLICY, checkpoints, summary: { checkpointCount: checkpoints.length, initialDigest: checkpoints[0].digest.value, terminalDigest: checkpoints.at(-1).digest.value, terminalTick: 7 } };
  const report = verifyReplayIntegrity({ manifest, events: replayEvents, checkpoints: replayCheckpoints, options: { verifyAlignmentReport: false } });
  const bundle = {
    type: 'anchor.headless.bundle',
    version: 'headless-combined-bundle-h2',
    manifest: headlessManifest(replayId, agentIds),
    missionConfig: { type: 'anchor.headless.mission-config', version: 'h4.1-fixture', missionId: manifest.missionId, scenarioId: manifest.scenarioId, seed: manifest.seed, world: { width: 8, height: 6, timeStepSeconds: 60 }, gliders: agentIds.map((id, index) => ({ id, start: { x: index * 2, y: 0, z: 0 } })) },
    visibleFields: { type: 'anchor.headless.field-pack', version: 'h4.1-fixture', fieldIds: ['E_forecast'], fields: { E_forecast: [[[0.1, 0.2], [0.3, 0.4]]] }, fieldVisibility: { E_forecast: 'publicScenario' } },
    observations: events.filter((event) => event.phase === 'observation').map((event) => ({ observationId: event.payload.observationId, timeSeconds: event.timeSeconds, gliderId: event.agentId, x: event.payload.x, y: event.payload.y, observedValue: event.payload.observedValue, surprise: event.payload.surprise })),
    gliderTracks: events.filter((event) => event.phase === 'vehicleState').map((event) => ({ timeSeconds: event.timeSeconds, gliderId: event.agentId, x: event.payload.x, y: event.payload.y, zIndex: event.payload.zIndex, energyUsedIncrement: event.payload.energyUsed })),
    scoreReport: { type: 'anchor.headless.score-report', version: 'h4.1-fixture', finalScore: 77, notBrowserOfficialScoring: true },
    replayManifest: manifest,
    replayEvents,
    replayCheckpoints,
    replayAlignmentReport: report,
    replayContract: { type: REPLAY_ARTIFACT_TYPES.contract, version: REPLAY_R1_SCHEMA_VERSION, manifest, events: replayEvents, checkpoints: replayCheckpoints, alignmentReport: report },
    fixtureMetadata: { intentionallyInvalid: false, multiAgentReplayContractOnly: multiAgent, expectedFailureCodes: [] },
    notes: ['H4.1 compact public replay fixture. No hidden truth. No planner, optimizer, Python simulator, or MARL/RL.']
  };
  return bundle;
}

function headlessManifest(replayId, agentIds) {
  const files = ['manifest', 'missionConfig', 'visibleFields', 'observations', 'gliderTracks', 'scoreReport', 'replayManifest', 'replayEvents', 'replayCheckpoints', 'replayAlignmentReport'].map((role) => ({
    path: role === 'manifest' ? 'manifest.json' : `${role}.json`,
    role,
    mediaType: 'application/json',
    schemaType: role.startsWith('replay') ? `anchor.headless.${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}` : 'anchor.headless.bundle-artifact',
    visibilityTier: 'publicScenario'
  }));
  return {
    type: 'anchor.headless.manifest',
    version: 'headless-bundle-manifest-h0',
    bundleType: 'h4.1-replay-fixture',
    createdAt: CREATED_AT,
    scenarioId: 'h4-1-public-replay-fixture',
    missionId: 'h4-1-replay-contract-mission',
    episodeId: `${replayId}-episode`,
    seed: `${replayId}-seed`,
    runtimeTarget: 'nodeHeadless',
    visibilityTier: 'publicScenario',
    files,
    notes: [`Replay fixture declares ${agentIds.length} public agent(s). Hidden truth export disabled; hidden_fields.json omitted.`]
  };
}

function clone(value) { return structuredClone(value); }
function markInvalid(bundle, expectedFailureCodes, label) {
  bundle.fixtureMetadata = { ...(bundle.fixtureMetadata ?? {}), intentionallyInvalid: true, expectedFailureCodes, label };
  bundle.notes = [...(bundle.notes ?? []), `Intentionally invalid/test-only fixture: ${label}`];
  return bundle;
}
function refreshContract(bundle) {
  bundle.replayContract = { type: REPLAY_ARTIFACT_TYPES.contract, version: REPLAY_R1_SCHEMA_VERSION, manifest: bundle.replayManifest, events: bundle.replayEvents, checkpoints: bundle.replayCheckpoints, alignmentReport: bundle.replayAlignmentReport };
  return bundle;
}
function write(name, bundle) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(refreshContract(bundle), null, 2)}\n`, 'utf8');
}

const single = createReplayBundle({ replayId: 'h4-1-public-replay', agentIds: ['glider-alpha'] });
const multi = createReplayBundle({ replayId: 'h4-1-multi-agent-replay', agentIds: ['glider-alpha', 'glider-bravo'], multiAgent: true });

write('headless_replay_public.example.json', single);
write('headless_replay_multi_agent.example.json', multi);

const tamperedDigest = markInvalid(clone(single), ['REPLAY_CHECKPOINT_DIGEST_MISMATCH', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'terminal checkpoint digest changed');
tamperedDigest.replayCheckpoints.checkpoints.at(-1).digest.value = 'fnv1a32:deadbeef';
write('headless_replay_tampered_digest.example.json', tamperedDigest);

const tamperedOrder = markInvalid(clone(multi), ['REPLAY_EVENT_ORDER_INVALID', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'same-tick agent events reordered contrary to canonical order');
const events = tamperedOrder.replayEvents.events;
const alphaIndex = events.findIndex((event) => event.tick === 1 && event.agentId === 'glider-alpha');
const bravoIndex = events.findIndex((event) => event.tick === 1 && event.agentId === 'glider-bravo');
[events[alphaIndex], events[bravoIndex]] = [events[bravoIndex], events[alphaIndex]];
write('headless_replay_tampered_order.example.json', tamperedOrder);

const tamperedCheckpoint = markInvalid(clone(single), ['REPLAY_CHECKPOINT_CURSOR_INVALID', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'terminal checkpoint event cursor changed');
tamperedCheckpoint.replayCheckpoints.checkpoints.at(-1).eventCursor = 999;
write('headless_replay_tampered_checkpoint.example.json', tamperedCheckpoint);

const missingTerminal = markInvalid(clone(single), ['REPLAY_TERMINAL_MISSING', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'terminal event removed');
missingTerminal.replayEvents.events = missingTerminal.replayEvents.events.filter((event) => event.phase !== 'terminal');
write('headless_replay_tampered_missing_terminal.example.json', missingTerminal);

const hiddenTruth = markInvalid(clone(single), ['REPLAY_PUBLIC_HIDDEN_TRUTH_LEAK', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'hidden truth marker inserted into public event payload');
hiddenTruth.replayEvents.events[1].payload.hiddenFieldMarker = 'T_hiddenTruth';
write('headless_replay_tampered_hidden_truth.example.json', hiddenTruth);

const payloadChanged = markInvalid(clone(single), ['REPLAY_CHECKPOINT_DIGEST_MISMATCH', 'REPLAY_ALIGNMENT_REPORT_MISMATCH'], 'event payload changed without updating checkpoint digest');
payloadChanged.replayCheckpoints.checkpoints[1].publicState.agentStates['glider-alpha'].x = 99;
write('headless_replay_tampered_payload.example.json', payloadChanged);

const files = [
  'headless_replay_public.example.json',
  'headless_replay_multi_agent.example.json',
  'headless_replay_tampered_digest.example.json',
  'headless_replay_tampered_order.example.json',
  'headless_replay_tampered_checkpoint.example.json',
  'headless_replay_tampered_missing_terminal.example.json',
  'headless_replay_tampered_hidden_truth.example.json',
  'headless_replay_tampered_payload.example.json'
];
for (const file of files) {
  const stat = fs.statSync(path.join(OUT, file));
  if (stat.size > 2_000_000) throw new Error(`${file} exceeds 2 MB fixture limit.`);
  if (stat.size > 500_000) console.warn(`${file} exceeds 500 KB fixture preference: ${stat.size}`);
}
console.log(JSON.stringify({ ok: true, outputDir: OUT, generated: files.sort() }, null, 2));