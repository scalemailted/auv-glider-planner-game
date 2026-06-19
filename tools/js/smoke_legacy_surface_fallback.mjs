import assert from 'node:assert/strict';
import { beginScenario } from '../../src/core/scenario/ScenarioState.js';

const state = { ui: {} };
const level = { schemaVersion: '2.0', type: 'anchor.level', levelId: 'legacy', world: { grid: { width: 4, height: 4 }, time: { duration: 4, dt: 1 } }, layers: { terrain: [], hazards: [], truth: { frames: [] } } };
const mission = { schemaVersion: '2.0', type: 'anchor.mission', missionId: 'legacy-mission', agents: [{ id: 'glider_01', start: { x: 0, y: 0 } }], rules: {}, scoring: {} };
beginScenario(state, { level, mission, source: 'customChallengeJson', challengeMode: 'perfectKnowledge' });
const config = state.mission.waterColumnConfig;
assert.equal(config.source, 'importedLegacySurfaceFallback');
assert.equal(config.depthLayerIds.length, 1);
assert.equal(config.depthLayerIds[0], 'surface');
assert.equal(state.currentScenario.waterColumnFallbackUsed, true);
assert.match(config.warnings.join(' '), /surface-only compatibility mode/i);
console.log('smoke_legacy_surface_fallback passed');