#!/usr/bin/env node
import { createDemoRoiField } from '../../src/core/demo/DemoRoiFields.js';
import { generateRoiScenario } from '../../src/core/demo/roi/RoiScenarioGenerator.js';
import { ROI_REFERENCE_SIGNATURES } from '../../src/core/demo/roi/RoiReferenceSignatures.js';
import { REQUIRED_REFERENCE_SIGNATURE_IDS } from '../../src/core/demo/roi/RoiReferenceModelCatalog.js';

let failures = 0;

for (const signature of ROI_REFERENCE_SIGNATURES) {
  if (!signature.id || !signature.label) fail(signature, 'missing id/label');
  if (!signature.componentDefaults) fail(signature, 'missing componentDefaults');
  if (!signature.roiInterpretation) fail(signature, 'missing ROI interpretation');
  if (!signature.referenceModels?.length) fail(signature, 'missing reference model text');
  if (!signature.qaExpectations) fail(signature, 'missing qaExpectations');
  if (!signature.caTaxonomy) fail(signature, 'missing caTaxonomy');
  if (!signature.phenotypeMetrics) fail(signature, 'missing phenotypeMetrics');
  if (!signature.genotypeNotes) fail(signature, 'missing genotypeNotes');
  if (!signature.failureSigns?.length) fail(signature, 'missing failure signs');
  const field = createDemoRoiField({
    ...signature.componentDefaults,
    referenceSignatureId: signature.id,
    seed: `reference-smoke:${signature.id}`,
    time: 12,
    demoTime: 12
  });
  if (!field.sampleValueField?.length) fail(signature, 'field generation returned no sampleValueField');
  const scenario = generateRoiScenario({
    family: 'custom',
    seed: `reference-smoke:${signature.id}`,
    frameCount: 4,
    duration: 24,
    sourceMode: 'currentRecipe',
    componentRecipe: signature.componentDefaults,
    referenceSignatureId: signature.id
  });
  if (!scenario.frames?.length) fail(signature, 'scenario generation returned no frames');
  if (scenario.referenceSignatureId !== signature.id) fail(signature, 'scenario missing referenceSignatureId');
  if (!scenario.caTaxonomy) fail(signature, 'scenario missing caTaxonomy');
  if (!scenario.qaExpectations) fail(signature, 'scenario missing qaExpectations');
}

for (const id of REQUIRED_REFERENCE_SIGNATURE_IDS) {
  if (!ROI_REFERENCE_SIGNATURES.some((signature) => signature.id === id)) {
    fail({ id }, 'missing required broad signature');
  }
}

if (failures === 0) {
  console.log(`ROI reference signature smoke passed (${ROI_REFERENCE_SIGNATURES.length} signatures)`);
}

process.exitCode = failures ? 1 : 0;

function fail(signature, message) {
  failures += 1;
  console.error(`FAIL ${signature?.id ?? 'unknown'}: ${message}`);
}
