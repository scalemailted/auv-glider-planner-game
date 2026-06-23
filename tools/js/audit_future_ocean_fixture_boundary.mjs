import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const docs = readFileSync('docs/ocean_model_fixture_pipeline.md', 'utf8');
for (const term of ['NetCDF', 'attribution', 'license', 'No network requests in the browser', 'No real-data fixture should be claimed']) assert.match(docs, new RegExp(term, 'i'));
console.log('[audit_future_ocean_fixture_boundary] PASS');
