import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { missionEditorDocumentForExport } from '../../src/core/editor/MissionEditorDocument.js';
import { validateMissionEditorDocument } from '../../src/core/editor/MissionEditorValidation.js';

const { document } = createMissionEditorFixture();
const snapshot = missionEditorDocumentForExport(document, { exportedAt: '2026-06-21T00:00:00.000Z' });
assert.equal(validateMissionEditorDocument({ level: snapshot, mission: snapshot.missionDefaults }).previewAllowed, true);
const scene = fs.readFileSync('src/game/phaser/scenes/EnvironmentEditorScene.js', 'utf8');
assert.ok(scene.includes('beginScenario(this.app.state'), 'editor preview/play flow uses production scenario lifecycle');
assert.ok(scene.includes("source: 'editor'"), 'editor preview labels source as editor');
assert.ok(scene.includes("this.scene.start('MissionBriefingScene')"), 'preview enters normal mission briefing flow');
assert.equal(/new\s+SimulationEngine|scoreMission|RouteOptimizer/.test(scene), false, 'editor preview does not run editor-only simulation/scoring/planning');
console.log('smoke_mission_editor_preview_snapshot: PASS', JSON.stringify({ levelId: snapshot.levelId, missionId: snapshot.missionDefaults.missionId }));
