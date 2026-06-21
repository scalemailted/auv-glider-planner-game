import assert from 'node:assert/strict';
import { createMissionEditorFixture, deepClone } from './mission_editor_fixture.mjs';
import { validateMissionEditorDocument } from '../../src/core/editor/MissionEditorValidation.js';

const { document } = createMissionEditorFixture();
assert.equal(validateMissionEditorDocument(document).valid, true);
const invalidPolicy = deepClone(document);
invalidPolicy.metadata.calibratedOceanForecast = true;
const invalidPolicyReport = validateMissionEditorDocument(invalidPolicy);
assert.equal(invalidPolicyReport.valid, false);
assert.ok(invalidPolicyReport.errors.some((issue) => issue.code === 'CALIBRATED_FORECAST_CLAIM_BLOCKED'));
const calibrated = deepClone(document);
calibrated.metadata.calibratedOceanForecast = true;
const calibratedReport = validateMissionEditorDocument(calibrated);
assert.equal(calibratedReport.valid, false);
assert.ok(calibratedReport.errors.some((issue) => issue.code === 'CALIBRATED_FORECAST_CLAIM_BLOCKED'));
const hidden = deepClone(document);
hidden.level.meta.oracleDebug = { T_hiddenTruth: [[1]] };
const hiddenReport = validateMissionEditorDocument(hidden);
assert.equal(hiddenReport.valid, false);
assert.ok(hiddenReport.errors.some((issue) => issue.code === 'HIDDEN_TRUTH_EXPORT_LEAK'));
console.log('smoke_mission_editor_validation: PASS', JSON.stringify({ policy: invalidPolicyReport.status, calibrated: calibratedReport.status, hidden: hiddenReport.status }));


