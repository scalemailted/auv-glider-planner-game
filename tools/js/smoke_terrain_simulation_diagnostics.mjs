import assert from 'node:assert/strict';
import {
  createTerrainSimulationDiagnostics,
  finalizeTerrainSimulationDiagnostics,
  terrainSimulationDiagnosticsSummary,
  updateTerrainSimulationDiagnostics,
  validateTerrainSimulationDiagnostics
} from '../../src/core/simulation/TerrainSimulationDiagnostics.js';

const level = {
  levelId: 'terrain-runtime-smoke',
  bathymetry: {
    depthMeters: [
      [20, 8, 18],
      [20, 8, 18],
      [20, 8, 18]
    ],
    landMask: [
      [false, false, false],
      [false, false, false],
      [false, false, false]
    ]
  },
  world: { grid: { width: 3, height: 3 } }
};
const mission = { missionId: 'terrain-runtime-mission', physics: { minimumBottomClearanceMeters: 5 } };
const diagnostics = createTerrainSimulationDiagnostics({ level, mission });

for (const sample of [
  { agentId: 'g1', tick: 1, timeSeconds: 1, x: 0, y: 0, depthMeters: 8, depthLayerId: 'mid', segmentIndex: 0 },
  { agentId: 'g1', tick: 2, timeSeconds: 2, x: 1, y: 0, depthMeters: 4, depthLayerId: 'mid', segmentIndex: 0, divePhase: 'bottomTurn' },
  { agentId: 'g1', tick: 3, timeSeconds: 3, x: 2, y: 0, depthMeters: 12, depthLayerId: 'deep', segmentIndex: 1 },
  { agentId: 'g2', tick: 4, timeSeconds: 4, x: 2, y: 2, depthMeters: 6, depthLayerId: 'mid', segmentIndex: 0 }
]) {
  updateTerrainSimulationDiagnostics(diagnostics, sample, { level });
}
finalizeTerrainSimulationDiagnostics(diagnostics, { terminalReason: 'smoke-complete' });
const summary = terrainSimulationDiagnosticsSummary(diagnostics);
const validation = validateTerrainSimulationDiagnostics(diagnostics);

assert.equal(validation.status, 'PASS');
assert.equal(summary.terrainEventsSupported, true);
assert.equal(summary.minimumActualClearanceMeters, 4);
assert.equal(summary.maximumActualDepthMeters, 12);
assert.equal(summary.agents.length, 2);
assert.ok(summary.segments.length >= 2);
assert.equal(summary.terrainRelatedTerminalReason, 'smoke-complete');
assert.equal(summary.boundaryFlags.rendererOwned, false);
assert.equal(summary.boundaryFlags.generatedFromVisualInterpolation, false);
assert.equal(summary.boundaryFlags.changesOfficialScoring, false);

console.log('terrain simulation diagnostics smoke passed');
