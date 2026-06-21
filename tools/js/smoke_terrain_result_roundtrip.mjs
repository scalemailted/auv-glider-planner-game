import assert from 'node:assert/strict';
import { buildResultExport } from '../../src/core/io/ResultExporter.js';

const terrainEvent = {
  id: 'terrain-result-event-1',
  type: 'anchor.simulation.terrain-clearance-warning',
  agentId: 'g1',
  segmentId: 'g1-segment-0',
  timeSeconds: 60,
  issueCode: 'LOW_BOTTOM_CLEARANCE',
  severity: 'WARNING',
  position: { x: 1, y: 1, depthMeters: 4 },
  bottomDepthMeters: 8,
  clearanceMeters: 4,
  source: 'canonicalSimulation',
  publicSafe: true,
  boundaryFlags: { generatedFromVisualInterpolation: false, rendererOwned: false, changesOfficialScoring: false }
};
const result = {
  summary: { finalScore: 10, terrainDiagnostics: { version: 'terrain-simulation-diagnostics-three-r1-2c-1', minimumActualClearanceMeters: 4 } },
  terrainAwareValidation: {
    launch: { status: 'VALID_WITH_WARNINGS', predictedMinimumClearanceMeters: 5 },
    actual: { minimumActualClearanceMeters: 4 },
    comparison: { predictedMinimumClearanceMeters: 5, actualMinimumClearanceMeters: 4, clearanceDifferenceMeters: -1 },
    terrainEventsSupported: true
  },
  actualTerrainDiagnostics: { minimumActualClearanceMeters: 4, maximumActualDepthMeters: 6 },
  terrainEvents: [terrainEvent],
  events: [terrainEvent]
};
const exported = buildResultExport({ level: { levelId: 'terrain-result-level' }, mission: { missionId: 'terrain-result-mission' }, plan: {}, result });
assert.equal(exported.terrainEvents.length, 1);
assert.equal(exported.actualTerrainDiagnostics.minimumActualClearanceMeters, 4);
assert.equal(exported.terrainValidationMetadata.actualSummary.minimumActualClearanceMeters, 4);
assert.equal(exported.debriefMetrics.terrainEventCount, 1);
assert.equal(JSON.stringify(exported.terrainEvents).includes('terrainMesh'), false);
assert.equal(JSON.stringify(exported.terrainEvents).includes('depthMeters[['), false);

const legacy = buildResultExport({ level: { levelId: 'legacy-level' }, mission: { missionId: 'legacy-mission' }, plan: {}, result: { summary: { finalScore: 1 }, events: [] } });
assert.deepEqual(legacy.terrainEvents, []);
assert.equal(legacy.terrainValidationMetadata.officialScoringChanged, false);

console.log('terrain result roundtrip smoke passed');
