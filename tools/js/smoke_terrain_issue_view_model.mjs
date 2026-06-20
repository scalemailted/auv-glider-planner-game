import { assert, buildPlan, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { buildTerrainAwareMissionValidationReport } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const report = buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan([{ id: 'wp-cross-land', x: 16, y: 10, maximumDiveDepthMeters: 20 }]) });
const issue = report.hardErrors[0];
assert.ok(issue.position);
assert.ok(issue.focusHint);
assert.ok(['route-segment', 'surface-waypoint', 'sampling-target', 'mission-readiness'].includes(issue.focusHint.kind));
assert.ok(issue.focusHint.cameraPreset);
assert.equal(report.planDigest, buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan([{ id: 'wp-cross-land', x: 16, y: 10, maximumDiveDepthMeters: 20 }]) }).planDigest);
console.log('smoke_terrain_issue_view_model passed');
