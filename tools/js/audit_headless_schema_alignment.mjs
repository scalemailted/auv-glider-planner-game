import {
  browserArtifactToHeadlessMap,
  browserHeadlessMappingSummary,
  requiredBenchmarkTypes,
  requiredDemoTypes,
  requiredP8Types
} from '../../src/core/headless/BrowserHeadlessSchemaMap.js';
import { createHeadlessSchemaDescriptor, validateHeadlessSchemaDescriptor } from '../../src/core/headless/HeadlessSchemaContract.js';
import { HEADLESS_CANONICAL_FIELDS } from '../../src/core/headless/HeadlessFieldSchema.js';

const descriptorValidation = validateHeadlessSchemaDescriptor(createHeadlessSchemaDescriptor());
const summary = browserHeadlessMappingSummary();
const map = browserArtifactToHeadlessMap();

console.log('HEADLESS / COLAB / OCEANBOX SCHEMA ALIGNMENT AUDIT');
console.log(`contract=${descriptorValidation.status} mappedTypes=${summary.entryCount} requiredForColab=${summary.requiredForColab}`);
console.log('\nCanonical fields:');
for (const field of HEADLESS_CANONICAL_FIELDS) {
  console.log(`  ${field.id} -> ${field.visibilityTier}${field.aliasOf ? ` aliasOf=${field.aliasOf}` : ''}`);
}
console.log('\nBrowser -> Headless map:');
for (const entry of map) {
  console.log(`  ${entry.browserType} -> ${entry.headlessType} [${entry.compatibility}] visibility=${entry.visibilityRisk} colab=${entry.requiredForColab}`);
  if (entry.missingFields.length) console.log(`    missing: ${entry.missingFields.join('; ')}`);
  console.log(`    H1: ${entry.recommendedH1Action}`);
}

const failures = [];
if (!descriptorValidation.valid) failures.push(...descriptorValidation.errors);
for (const [label, types] of [['P8 adaptive', requiredP8Types()], ['Planner Benchmark', requiredBenchmarkTypes()], ['S1/S2/model demos', requiredDemoTypes()]]) {
  for (const type of types) {
    const mapped = map.find((entry) => entry.browserType === type);
    if (!mapped || mapped.compatibility === 'unknown') failures.push(`${label} type is unmapped: ${type}`);
  }
}
if (failures.length) {
  console.error('\nFAILURES');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('\nPASS headless schema alignment audit');