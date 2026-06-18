#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const normalPublicFixtures = [
  'docs/examples/headless_replay_public.example.json',
  'docs/examples/headless_replay_multi_agent.example.json'
];
const forbidden = [/T_hiddenTruth/, /trueRoi/, /eventIntensityTruth/, /"hiddenFields"/, /oracle tensor/i, /refereeOnlyPayload/, /refereePayload/];
for (const file of normalPublicFixtures) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) assert.equal(pattern.test(text), false, `${file} contains ${pattern}`);
}
const hiddenNegative = JSON.parse(fs.readFileSync('docs/examples/headless_replay_tampered_hidden_truth.example.json', 'utf8'));
assert.equal(hiddenNegative.fixtureMetadata.intentionallyInvalid, true);
assert.ok(hiddenNegative.fixtureMetadata.expectedFailureCodes.includes('REPLAY_PUBLIC_HIDDEN_TRUTH_LEAK'));
console.log(JSON.stringify({ ok: true, checked: normalPublicFixtures }, null, 2));