import assert from 'node:assert/strict';
import { buildReplayArtifactsFromEpisode, publicReplayStateAtTick } from '../../src/core/replay/ReplayContractBuilder.js';

const terrainEvent = {
  id: 'terrain-mission-g1-segment0-low-clearance-2-none',
  type: 'anchor.simulation.terrain-clearance-warning',
  agentId: 'g1',
  segmentId: 'g1-segment-0',
  tick: 2,
  timeSeconds: 120,
  issueCode: 'LOW_BOTTOM_CLEARANCE',
  severity: 'WARNING',
  position: { x: 1, y: 1, depthMeters: 4 },
  bottomDepthMeters: 8,
  clearanceMeters: 4,
  source: 'canonicalSimulation',
  publicVisibility: 'publicScenario',
  publicSafe: true,
  boundaryFlags: { generatedFromVisualInterpolation: false, rendererOwned: false, changesOfficialScoring: false }
};
const artifacts = buildReplayArtifactsFromEpisode({
  episodeId: 'terrain-replay-smoke',
  seed: 'terrain-seed',
  missionConfig: { missionId: 'terrain-mission', world: { timeStepSeconds: 60 }, gliders: [{ id: 'g1', start: { x: 0, y: 0 } }] },
  tracks: [
    { gliderId: 'g1', timeSeconds: 0, x: 0, y: 0, depthMeters: 0 },
    { gliderId: 'g1', timeSeconds: 120, x: 1, y: 1, depthMeters: 4 }
  ],
  observations: [],
  terrainEvents: [terrainEvent],
  summary: { score: 12, completed: true }
}, { replayId: 'terrain-replay-smoke' });

const terrainReplayEvents = artifacts.events.events.filter((event) => event.phase === 'terrain');
assert.equal(artifacts.manifest.terrainEventSummary.eventCount, 1);
assert.equal(artifacts.events.summary.terrainEventCount, 1);
assert.equal(terrainReplayEvents.length, 1);
assert.equal(terrainReplayEvents[0].payload.terrainEventId, terrainEvent.id);
assert.equal(terrainReplayEvents[0].payload.boundaryFlags.rendererOwned, false);
const publicState = publicReplayStateAtTick(artifacts.events.events, 2, {
  initialState: artifacts.manifest.initialPublicState,
  dt: 60,
  terminalTick: 2
});
assert.equal(publicState.terrainEventSummary.count, 1);
assert.equal(publicState.terrainEventSummary.minimumActualClearanceMeters, 4);
assert.equal(JSON.stringify(artifacts).includes('T_hiddenTruth'), false);
assert.equal(JSON.stringify(artifacts).includes('cameraPreset'), false);

console.log('terrain replay alignment smoke passed');
