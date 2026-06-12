#!/usr/bin/env node
import { generateRoiScenario } from '../../src/core/demo/roi/RoiScenarioGenerator.js';
import { ROI_REFERENCE_SIGNATURES } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

let runtimeFailures = 0;
let passing = 0;

console.log('ROI Process Pattern Audit');
for (const signature of ROI_REFERENCE_SIGNATURES) {
  try {
    const scenario = generateRoiScenario({
      family: 'custom',
      seed: `reference-audit:${signature.id}`,
      difficulty: 'medium',
      grid: { width: 16, height: 10 },
      duration: 48,
      frameCount: 8,
      sourceMode: 'currentRecipe',
      componentRecipe: signature.componentDefaults,
      referenceSignatureId: signature.id,
      referenceSignatureModified: false,
      requireValidation: false
    });
    const validation = scenario.validation ?? {};
    const diagnostics = scenario.diagnostics ?? {};
    const warningText = validation.warnings?.length ? ` warnings=${validation.warnings.join('; ')}` : '';
    console.log(`- ${signature.label}: ${validation.status}${warningText}`);
    console.log(`  active=${diagnostics.meanActiveFraction} high=${diagnostics.meanHighValueFraction} delta=${diagnostics.meanFrameDelta} messages=${diagnostics.meanMessageCount} transitions=${diagnostics.meanTransitionCount} front=${diagnostics.meanFrontLength} components=${diagnostics.meanComponentCount}`);
    if (validation.status !== 'FAIL') passing += 1;
  } catch (error) {
    runtimeFailures += 1;
    console.error(`- ${signature.label}: RUNTIME FAIL ${error?.message ?? error}`);
  }
}

if (passing === 0) {
  console.error('No reference signatures passed or warned.');
  process.exitCode = 1;
} else {
  process.exitCode = runtimeFailures ? 1 : 0;
}
