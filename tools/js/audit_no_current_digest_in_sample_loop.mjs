import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sampler = readFileSync('src/core/science/OceanCurrentFieldSampler.js', 'utf8');
const body = sampler.slice(sampler.indexOf('export function samplePreparedOceanCurrent'), sampler.indexOf('export function sampleOceanCurrentVector'));
assert.equal(/oceanCurrentField4DDigest|fnv\(|stable\(|digest\(/.test(body), false, 'sample loop must not calculate current digest');
assert.equal(/for \(let i = 0; i < axis\.length/.test(body), false, 'sample loop must not linearly scan full axes');
console.log('[audit_no_current_digest_in_sample_loop] PASS');