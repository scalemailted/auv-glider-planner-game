import assert from 'node:assert/strict';
import {
  MISSION_OBJECTIVE_IDS,
  missionObjectiveById,
  missionObjectiveOptions,
  objectiveRecommendedFields,
  objectiveSuggestedMetrics
} from '../../src/core/benchmark/MissionObjectiveTaxonomy.js';

const required = [
  'reconnaissanceSurvey',
  'exploitKnownValue',
  'reduceUncertainty',
  'mapBoundary',
  'validateForecast',
  'confirmHiddenEvent',
  'trackFeature',
  'localizeSource',
  'revisitStaleRegion',
  'avoidHazard',
  'conserveEnergy',
  'cooperativeCoverage'
];

assert.deepEqual(MISSION_OBJECTIVE_IDS, required, 'objective IDs are stable');
assert.equal(missionObjectiveOptions().length, required.length, 'all objective options are exposed');

for (const id of required) {
  const objective = missionObjectiveById(id);
  assert.equal(objective.id, id, `${id} lookup`);
  assert.ok(objective.label, `${id} label`);
  assert.ok(objective.description, `${id} description`);
  assert.ok(Array.isArray(objective.usesFields) && objective.usesFields.length > 0, `${id} usesFields`);
  assert.ok(objective.recommendedSamplingMethod, `${id} sampling method`);
  assert.ok(objective.recommendedActionMethod, `${id} action method`);
  assert.ok(Array.isArray(objective.scoringHints) && objective.scoringHints.length > 0, `${id} scoring hints`);
  assert.ok(objective.notA, `${id} notA boundary`);
}

assert.ok(objectiveRecommendedFields('mapBoundary').includes('boundaryStrength'), 'mapBoundary uses boundaryStrength');
assert.ok(objectiveRecommendedFields('mapBoundary').includes('expectedUncertainty'), 'mapBoundary uses expectedUncertainty');
assert.ok(objectiveRecommendedFields('confirmHiddenEvent').includes('hiddenEventProbability'), 'confirmHiddenEvent uses hiddenEventProbability');
assert.ok(objectiveRecommendedFields('confirmHiddenEvent').includes('surprise'), 'confirmHiddenEvent uses surprise');
assert.ok(objectiveRecommendedFields('revisitStaleRegion').includes('staleness'), 'revisitStaleRegion uses staleness');
assert.ok(objectiveRecommendedFields('revisitStaleRegion').includes('recentSamplePenalty'), 'revisitStaleRegion uses recent-sample penalty');
assert.ok(objectiveSuggestedMetrics('revisitStaleRegion').some((metric) => /age|duplicate|energy/i.test(metric)), 'revisit metrics are useful');

console.log('smoke_mission_objective_taxonomy: ok');
