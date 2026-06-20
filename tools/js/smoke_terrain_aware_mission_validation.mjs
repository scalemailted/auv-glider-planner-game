import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, buildPlan, createTerrainValidationFixture, issueCodes, assertNoRendererAuthority } from './terrain_validation_smoke_fixture.mjs';
import {
  TERRAIN_AWARE_ISSUE_CODES,
  buildTerrainAwareMissionValidationReport,
  validateTerrainAwareMissionValidationReport,
  terrainAwareMissionValidationSummary
} from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const valid = buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan() });
assert.equal(valid.status, 'VALID');
assert.equal(valid.executable, true);

const warning = buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan([{ id: 'wp-near-shore', x: 1.2, y: 10, maximumDiveDepthMeters: 20 }]) });
assert.equal(warning.status, 'VALID_WITH_WARNINGS');
assert.ok(issueCodes(warning).includes('ROUTE_CORRIDOR_SHORELINE_RISK'));

const invalid = buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan([{ id: 'wp-cross-land', x: 16, y: 10, maximumDiveDepthMeters: 20 }]) });
assert.equal(invalid.status, 'INVALID');
assert.ok(issueCodes(invalid).includes('SEGMENT_LAND_INTERSECTION'));

assert.deepEqual(valid, buildTerrainAwareMissionValidationReport({ level, mission, plan: buildPlan() }));
assert.ok(TERRAIN_AWARE_ISSUE_CODES.includes('BOTTOM_CLEARANCE_VIOLATION'));
const checked = validateTerrainAwareMissionValidationReport(invalid);
assert.equal(checked.valid, true);
const summary = terrainAwareMissionValidationSummary(invalid);
assert.equal(summary.hardErrorCount, invalid.hardErrors.length);
assertNoRendererAuthority(invalid);

const source = readFileSync(fileURLToPath(new URL('../../src/core/planning/TerrainAwareMissionValidation.js', import.meta.url)), 'utf8');
assert.equal(/from ['"]three['"]|Phaser|document|localStorage|fs/.test(source), false);
console.log('smoke_terrain_aware_mission_validation passed');
