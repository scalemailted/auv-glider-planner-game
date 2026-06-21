import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { missionEditorDocumentForExport } from '../../src/core/editor/MissionEditorDocument.js';
import { validateMissionEditorDocument, validateMissionEditorExport } from '../../src/core/editor/MissionEditorValidation.js';

const { document } = createMissionEditorFixture();
const browserReport = validateMissionEditorDocument(document);
const exported = missionEditorDocumentForExport(document);
const headlessLikeReport = validateMissionEditorExport(exported, exported.missionDefaults);
assert.equal(browserReport.valid, true, browserReport.issues.map((issue) => issue.message).join('\n'));
assert.equal(headlessLikeReport.valid, true, headlessLikeReport.issues.map((issue) => issue.message).join('\n'));
assert.equal(browserReport.summary.gridWidth, headlessLikeReport.summary.gridWidth);
assert.equal(browserReport.summary.gridHeight, headlessLikeReport.summary.gridHeight);
assert.equal(browserReport.summary.agentCount, headlessLikeReport.summary.agentCount);
assert.equal(exported.meta.threeMissionEditor.rendererOwnsState, false);
assert.equal(exported.meta.threeMissionEditor.calibratedOceanForecast, false);
console.log('audit_mission_editor_browser_headless_parity: PASS', JSON.stringify({ grid: `${browserReport.summary.gridWidth}x${browserReport.summary.gridHeight}`, agents: browserReport.summary.agentCount }));
