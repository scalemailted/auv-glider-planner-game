#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = [
  'schemas/replay-manifest.schema.json',
  'schemas/replay-events.schema.json',
  'schemas/replay-checkpoints.schema.json',
  'schemas/replay-alignment-report.schema.json',
  'schemas/replay-bundle.schema.json'
];
for (const file of files) {
  const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(schema.currentReplayVersion, 'replay-r1.0', `${file} should declare current replay version`);
  assert.equal(schema.additionalProperties, true, `${file} should allow forward-compatible fields`);
  assert.ok(schema.describes, `${file} should describe an artifact type`);
}
console.log(JSON.stringify({ ok: true, checked: files }, null, 2));