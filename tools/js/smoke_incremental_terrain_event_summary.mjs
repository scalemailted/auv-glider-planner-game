import assert from 'node:assert/strict';
import {
  createTerrainSimulationDiagnostics,
  terrainSimulationDiagnosticsSummary,
  updateTerrainSimulationDiagnostics
} from '../../src/core/simulation/TerrainSimulationDiagnostics.js';

const level = {
  levelId: 'event-summary-smoke',
  world: { grid: { width: 2, height: 2 } },
  bathymetry: { depthMeters: [[8, 8], [8, 8]], landMask: [[false, false], [false, false]] }
};
const diagnostics = createTerrainSimulationDiagnostics({ level, mission: { missionId: 'm', physics: { minimumBottomClearanceMeters: 5 } } });
updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g1', x: 0, y: 0, depthMeters: 4, segmentIndex: 0, tick: 1, timeSeconds: 1 }, { level });
const firstCount = diagnostics.events.length;
updateTerrainSimulationDiagnostics(diagnostics, { agentId: 'g1', x: 0.1, y: 0, depthMeters: 4.1, segmentIndex: 0, tick: 2, timeSeconds: 2 }, { level });
assert.equal(diagnostics.events.length, firstCount);
assert.ok(diagnostics.counters.terrainEventDuplicateSuppressionCount > 0);
assert.ok(diagnostics.counters.terrainEventSummaryIncrementCount >= firstCount);
assert.equal(diagnostics.counters.terrainEventSummaryFullRebuildCount, 0);
const summary = terrainSimulationDiagnosticsSummary(diagnostics).terrainEventSummary;
assert.equal(summary.eventCount, firstCount);
assert.ok(Object.keys(summary.eventTypes).length > 0);
assert.ok(summary.latestEvent);
assert.equal(diagnostics.counters.terrainEventSummaryFullRebuildCount, 0);
console.log('incremental terrain event summary smoke passed');