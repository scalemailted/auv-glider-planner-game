import { assert, buildPlan, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { createMissionExecutionSnapshot, createMissionLaunchPayload, summarizeMissionLaunchPayload } from '../../src/core/simulation/MissionExecutionSnapshot.js';
import { buildTerrainAwareMissionValidationReport } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const plan = buildPlan([{ id: 'wp-near-shore', x: 1.2, y: 10, maximumDiveDepthMeters: 20 }]);
const report = buildTerrainAwareMissionValidationReport({ level, mission, plan });
const snapshot = createMissionExecutionSnapshot({ level, mission, plan, terrainAwareValidationReport: report });
const payload = createMissionLaunchPayload({ snapshot });
const summary = summarizeMissionLaunchPayload(payload).terrainAwareValidationSummary;
assert.equal(summary.status, 'VALID_WITH_WARNINGS');
assert.ok(summary.warningCount > 0);
assert.equal(summary.boundaryFlags.changesOfficialScoring, false);
assert.equal(payload.terrainAwareValidationReport.segmentReports.length, report.segmentReports.length);
console.log('smoke_terrain_validation_debrief_summary passed');
