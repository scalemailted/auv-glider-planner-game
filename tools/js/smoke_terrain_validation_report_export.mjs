import { assert, buildPlan, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { buildResultExport } from '../../src/core/io/ResultExporter.js';
import { buildTerrainAwareMissionValidationReport } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const plan = buildPlan();
const report = buildTerrainAwareMissionValidationReport({ level, mission, plan });
const result = { summary: { finalScore: 0 }, terrainAwareValidation: { launchSummary: report.summary, launchReport: report, actualSummary: { routeFailureCount: 0 } }, events: [], frames: [] };
const exported = buildResultExport({ level, mission, plan, result });
assert.equal(exported.terrainValidationMetadata.officialScoringChanged, false);
assert.equal(exported.terrainValidationMetadata.usesMeshRaycastForValidity, false);
assert.ok(exported.terrainAwareValidation.launchSummary);
const compact = JSON.stringify(exported.terrainValidationMetadata);
assert.equal(compact.includes('depthMeters'), false);
assert.equal(compact.includes('bottomDepthField'), false);
const legacy = buildResultExport({ level, mission, plan, result: { summary: { finalScore: 0 }, events: [], frames: [] } });
assert.equal(legacy.type, 'anchor.result');
console.log('smoke_terrain_validation_report_export passed');
