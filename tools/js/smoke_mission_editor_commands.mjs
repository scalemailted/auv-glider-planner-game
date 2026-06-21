import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { createMissionEditorCommand, applyMissionEditorCommand, commandFromEditorIntent } from '../../src/core/editor/MissionEditorCommand.js';
import { missionEditorDocumentDigest } from '../../src/core/editor/MissionEditorDocument.js';

const { document } = createMissionEditorFixture();
const before = missionEditorDocumentDigest(document);
const hazard = applyMissionEditorCommand(document, createMissionEditorCommand('addHazard', { gridCell: { x: 3, y: 3 }, radius: 1 }));
assert.equal(hazard.accepted, true, hazard.message);
assert.notEqual(hazard.afterDigest, before, 'accepted command changes canonical document digest');
assert.equal(document.level.layers.hazards[3][3], 0, 'applyMissionEditorCommand does not mutate input document');
const currentCommand = commandFromEditorIntent({ intentId: 'editCurrentVector', brush: 'current', gridCell: { x: 4, y: 4 }, startCell: { x: 4, y: 4 }, endCell: { x: 5, y: 4 }, config: { intensity: 0.5 } });
const current = applyMissionEditorCommand(hazard.document, currentCommand);
assert.equal(current.accepted, true, current.message);
const rejected = applyMissionEditorCommand(current.document, createMissionEditorCommand('paintLand', { gridCell: { x: 999, y: 999 } }));
assert.equal(rejected.accepted, false, 'out-of-bounds edits are rejected');
assert.equal(rejected.changedCanonicalDocument, false);
console.log('smoke_mission_editor_commands: PASS', JSON.stringify({ firstCommand: hazard.command.commandType, secondCommand: current.command.commandType }));
