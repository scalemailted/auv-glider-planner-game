import assert from 'node:assert/strict';
import {
  createTerrainSimulationDiagnostics,
  terrainSimulationDiagnosticsSummary,
  updateTerrainSimulationDiagnostics
} from '../../src/core/simulation/TerrainSimulationDiagnostics.js';

const level = {
  levelId: 'incremental-diagnostics-smoke',
  world: { grid: { width: 3, height: 3 } },
  bathymetry: { depthMeters: Array.from({ length: 3 }, () => Array(3).fill(40)), landMask: Array.from({ length: 3 }, () => Array(3).fill(false)) }
};
const diagnostics = createTerrainSimulationDiagnostics({ level, mission: { missionId: 'm', physics: { minimumBottomClearanceMeters: 5 } } });
let result = updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g1', x: 0, y: 0, depthMeters: 10, segmentIndex: 0, tick: 1, timeSeconds: 1 }, { level });
assert.equal(result.diagnostics.counters.incrementalTerrainDiagnosticsUpdateCount, 1);
assert.equal(result.diagnostics.counters.fullTerrainDiagnosticsRebuildCount, 0);
assert.equal(result.diagnostics.counters.trajectoryPointsScannedDuringLastUpdate, 1);
assert.equal(result.diagnostics.counters.eventsScannedDuringLastUpdate, 0);
result = updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g1', x: 1, y: 0, depthMeters: 20, segmentIndex: 0, tick: 2, timeSeconds: 2, divePhase: 'bottomTurn' }, { level });
assert.equal(result.diagnostics.counters.incrementalTerrainDiagnosticsUpdateCount, 2);
assert.equal(result.diagnostics.mission.minimumActualClearanceMeters, 20);
assert.equal(result.diagnostics.mission.maximumActualDepthMeters, 20);
updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g2', x: 2, y: 0, depthMeters: 5, segmentIndex: 1, tick: 3, timeSeconds: 3 }, { level });
const summary = terrainSimulationDiagnosticsSummary(diagnostics);
assert.equal(summary.agents.length, 2);
assert.ok(summary.segments.length >= 2);
assert.equal(diagnostics.counters.fullTerrainDiagnosticsRebuildCount, 0);
console.log('incremental terrain runtime diagnostics smoke passed');