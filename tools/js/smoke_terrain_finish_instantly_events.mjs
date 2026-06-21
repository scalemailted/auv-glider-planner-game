import assert from 'node:assert/strict';
import {
  createTerrainSimulationDiagnostics,
  finalizeTerrainSimulationDiagnostics,
  terrainSimulationDiagnosticsSummary,
  terrainSimulationEventsDigest,
  updateTerrainSimulationDiagnostics
} from '../../src/core/simulation/TerrainSimulationDiagnostics.js';

const level = { levelId: 'finish-instantly-smoke', bathymetry: { depthMeters: [[14, 7, 14, 7, 14]], landMask: [[false, false, false, false, false]] } };
const mission = { missionId: 'finish-instantly-mission', physics: { minimumBottomClearanceMeters: 5 } };

function runAllAtOnce() {
  const diagnostics = createTerrainSimulationDiagnostics({ level, mission });
  for (let tick = 0; tick < 5; tick += 1) {
    updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g1', segmentIndex: tick, tick, timeSeconds: tick, x: tick, y: 0, depthMeters: tick % 2 ? 4 : 6 }, { level });
  }
  finalizeTerrainSimulationDiagnostics(diagnostics, { terminalReason: 'finish-instantly' });
  return diagnostics;
}

const first = runAllAtOnce();
const second = runAllAtOnce();
assert.equal(terrainSimulationEventsDigest(first.events), terrainSimulationEventsDigest(second.events));
assert.deepEqual(terrainSimulationDiagnosticsSummary(first).minimumActualClearanceMeters, terrainSimulationDiagnosticsSummary(second).minimumActualClearanceMeters);
assert.ok(first.events.length > 0);
assert.equal(terrainSimulationDiagnosticsSummary(first).terrainRelatedTerminalReason, 'finish-instantly');
assert.equal(terrainSimulationDiagnosticsSummary(first).boundaryFlags.rendererOwned, false);

console.log('terrain finish-instantly events smoke passed');
