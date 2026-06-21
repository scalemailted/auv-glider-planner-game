import assert from 'node:assert/strict';
import {
  TERRAIN_SIMULATION_EVENT_TYPES,
  createTerrainSimulationDiagnostics,
  terrainSimulationEventsDigest,
  updateTerrainSimulationDiagnostics,
  validateTerrainSimulationDiagnostics
} from '../../src/core/simulation/TerrainSimulationDiagnostics.js';

const level = { levelId: 'terrain-event-smoke', bathymetry: { depthMeters: [[20, 8, 20]], landMask: [[false, false, false]] } };
const mission = { missionId: 'terrain-event-mission', physics: { minimumBottomClearanceMeters: 5 } };
const samples = [
  { tick: 1, timeSeconds: 1, x: 0, y: 0, depthMeters: 4, agentId: 'g1', segmentIndex: 0 },
  { tick: 2, timeSeconds: 2, x: 1, y: 0, depthMeters: 4, agentId: 'g1', segmentIndex: 0 },
  { tick: 3, timeSeconds: 3, x: 1, y: 0, depthMeters: 4, agentId: 'g1', segmentIndex: 0 },
  { tick: 4, timeSeconds: 4, x: 0, y: 0, depthMeters: 2, agentId: 'g1', segmentIndex: 0 },
  { tick: 5, timeSeconds: 5, x: 1, y: 0, depthMeters: 4, agentId: 'g1', segmentIndex: 0 }
];

function runSamples() {
  const diagnostics = createTerrainSimulationDiagnostics({ level, mission });
  for (const sample of samples) updateTerrainSimulationDiagnostics(diagnostics, sample, { level });
  return diagnostics;
}

const diagnostics = runSamples();
const cloneDiagnostics = runSamples();
const digestA = terrainSimulationEventsDigest(diagnostics.events);
const digestB = terrainSimulationEventsDigest(cloneDiagnostics.events);

assert.equal(validateTerrainSimulationDiagnostics(diagnostics).status, 'PASS');
assert.equal(digestA, digestB);
assert.ok(diagnostics.events.some((event) => event.type === TERRAIN_SIMULATION_EVENT_TYPES.clearanceViolation));
assert.ok(diagnostics.events.some((event) => event.type === TERRAIN_SIMULATION_EVENT_TYPES.terrainLimit));
assert.ok(diagnostics.counters.terrainEventDuplicateSuppressionCount > 0);
assert.ok(diagnostics.events.every((event) => event.source === 'canonicalSimulation'));
assert.ok(diagnostics.events.every((event) => event.boundaryFlags?.generatedFromVisualInterpolation === false));
assert.ok(diagnostics.events.every((event) => event.boundaryFlags?.rendererOwned === false));
assert.ok(diagnostics.events.every((event) => event.boundaryFlags?.changesOfficialScoring === false));

console.log('terrain simulation events smoke passed');
