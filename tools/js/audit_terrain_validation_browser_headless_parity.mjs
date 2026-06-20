import { assert, buildPlan, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { buildTerrainAwareMissionValidationReport } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const plan = buildPlan([{ id: 'wp-cross-land', x: 16, y: 10, maximumDiveDepthMeters: 20 }]);
const browserLike = buildTerrainAwareMissionValidationReport({ level, mission, plan, appState: { ui: { rendererBackend: 'threeMission3d' } } });
const headlessLike = buildTerrainAwareMissionValidationReport({ level, mission, plan, appState: { ui: { rendererBackend: 'headless' } } });
assert.equal(browserLike.status, headlessLike.status);
assert.deepEqual(browserLike.hardErrors.map((issue) => [issue.code, issue.severity]), headlessLike.hardErrors.map((issue) => [issue.code, issue.severity]));
assert.equal(browserLike.boundaryFlags.usesMeshRaycastForValidity, false);
assert.equal(headlessLike.boundaryFlags.usesMeshRaycastForValidity, false);
console.log('audit_terrain_validation_browser_headless_parity passed');
