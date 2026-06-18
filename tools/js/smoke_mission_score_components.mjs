import assert from 'node:assert/strict';
import { MISSION_SCORE_COMPONENTS, missionScoreComponentById, validateMissionScoreComponentCatalog } from '../../src/core/scoring/MissionScoreComponents.js';

const validation = validateMissionScoreComponentCatalog();
assert.equal(validation.valid, true, validation.errors.join('; '));
for (const id of ['scienceValueCollected', 'motionFeasibility', 'energyEfficiency', 'hazardExposure', 'evidenceFollowupQuality', 'cooperativeCoverage']) {
  assert.ok(missionScoreComponentById(id), `component ${id}`);
}
for (const component of MISSION_SCORE_COMPONENTS) {
  assert.ok(['higherIsBetter', 'lowerIsBetter', 'targetRange', 'binaryPass', 'categorical'].includes(component.direction), `${component.id} direction`);
  assert.ok(component.unit, `${component.id} unit`);
  assert.ok(Array.isArray(component.dataSources) && component.dataSources.length, `${component.id} data sources`);
  if (component.refereeOnly) assert.ok(component.dataSources.some((source) => /referee|oracle|debug/.test(source)), `${component.id} referee label`);
}
console.log('Mission score components smoke passed');