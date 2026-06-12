#!/usr/bin/env node
import { generateRoiScenario, ROI_SCENARIO_TYPE, ROI_SCENARIO_VERSION } from '../../src/core/demo/roi/RoiScenarioGenerator.js';
import { referenceSignatureRecipe } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const scenario = generateRoiScenario({
  family: 'recurringHotspots',
  seed: 'scenario-smoke-001',
  difficulty: 'medium',
  grid: { width: 12, height: 8 },
  duration: 24,
  frameCount: 4,
  sourceMode: 'behaviorFamily',
  requireValidation: false
});

assert(scenario.type === ROI_SCENARIO_TYPE, 'scenario type mismatch');
assert(scenario.scenarioVersion === ROI_SCENARIO_VERSION, 'scenario version mismatch');
assert(scenario.scenarioId.includes('recurringHotspots'), 'scenario id should include family');
assert(scenario.frames.length === 4, 'expected four frames');
assert(scenario.time.timesSeconds.length === 4, 'expected four time samples');
assert(scenario.frames[0].fields.sampleValue.length === scenario.grid.height, 'sampleValue height mismatch');
assert(scenario.frames[0].fields.sampleValue[0].length === scenario.grid.width, 'sampleValue width mismatch');
assert(scenario.frames[0].fields.eventLikelihood.length === scenario.grid.height, 'eventLikelihood height mismatch');
assert(scenario.frames[0].likelihoodField.values.length === scenario.grid.height, 'likelihoodField values missing');
assert(scenario.processContract.processClass, 'process contract missing process class');
assert(scenario.labels.processClass, 'scenario labels missing process class');
assert(scenario.validation.status !== 'FAIL', `scenario validation failed: ${scenario.validation.failures.join('; ')}`);

const referenceScenario = generateRoiScenario({
  family: 'custom',
  seed: 'scenario-reference-smoke-001',
  difficulty: 'medium',
  grid: { width: 12, height: 8 },
  duration: 24,
  frameCount: 4,
  sourceMode: 'currentRecipe',
  patternSource: 'referenceSignature',
  referenceSignatureId: 'patternFormationMorphogenesis',
  componentRecipe: referenceSignatureRecipe('patternFormationMorphogenesis'),
  requireValidation: false
});

assert(referenceScenario.referenceSignatureId === 'patternFormationMorphogenesis', 'reference scenario missing signature id');
assert(referenceScenario.referenceSignatureLabel === 'Pattern Formation / Morphogenesis', 'reference scenario label mismatch');
assert(referenceScenario.referenceSignatureAliases.length > 0, 'reference aliases missing');
assert(referenceScenario.referenceModels.length > 0, 'reference models missing');
assert(referenceScenario.referenceCoverageTags.includes('morphogenesis'), 'coverage tags missing morphogenesis');
assert(referenceScenario.caTaxonomy, 'reference caTaxonomy missing');
assert(referenceScenario.qaExpectations, 'reference qaExpectations missing');
assert(referenceScenario.phenotypeMetrics, 'reference phenotypeMetrics missing');
assert(referenceScenario.genotypeNotes, 'reference genotypeNotes missing');
assert(referenceScenario.validation.caTaxonomy, 'validation caTaxonomy missing');
assert(referenceScenario.validation.qaExpectationsUsed, 'validation qaExpectations missing');

console.log('ROI scenario smoke passed');
console.log(`- id=${scenario.scenarioId}`);
console.log(`- validation=${scenario.validation.status}`);
console.log(`- frames=${scenario.frames.length}`);
console.log(`- reference=${referenceScenario.referenceSignatureLabel} validation=${referenceScenario.validation.status}`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
