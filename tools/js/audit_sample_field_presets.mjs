#!/usr/bin/env node
import { validateSampleFieldPresets } from '../../src/core/demo/SampleFieldPresetAudit.js';

const results = validateSampleFieldPresets();
let exitCode = 0;

console.log('Preset Audit Summary');
for (const result of results) {
  const suffix = result.warnings.length ? `: ${result.warnings.join(', ')}` : '';
  console.log(`- ${result.label}: ${result.status}${suffix}`);
  console.log(`  active=${result.summary.minActiveCellFraction}/${result.summary.meanActiveCellFraction} delta=${result.summary.meanFrameDelta} components=${result.summary.meanConnectedComponents} movement=${result.summary.centerOfMassMovement} corr=${result.summary.meanSpatialCorrelation}`);
  if (result.status === 'FAIL') exitCode = 1;
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
}

process.exitCode = exitCode;
