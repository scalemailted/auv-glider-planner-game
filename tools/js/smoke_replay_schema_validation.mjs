#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { validateReplayBundle, validateReplayManifest } from '../../src/core/replay/ReplaySchemaValidation.js';

const clean = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
const before = JSON.stringify(clean);
const cleanResult = validateReplayBundle(clean);
assert.equal(cleanResult.status, 'PASS');
assert.equal(JSON.stringify(clean), before, 'validation must not mutate input');

const missingOptional = structuredClone(clean.replayManifest);
delete missingOptional.schemaVersion;
const optionalResult = validateReplayManifest(missingOptional);
assert.equal(optionalResult.status, 'WARN');
assert.ok(optionalResult.warnings.some((entry) => /schemaVersion/.test(entry.path)));

const missingRequired = structuredClone(clean.replayManifest);
delete missingRequired.type;
assert.equal(validateReplayManifest(missingRequired).status, 'FAIL');

const future = structuredClone(clean.replayManifest);
future.schemaVersion = 'replay-r9.0';
future.version = 'replay-r9.0';
const futureResult = validateReplayManifest(future);
assert.equal(futureResult.status, 'WARN');
assert.equal(futureResult.compatibility, 'forwardVersionUnknown');

console.log(JSON.stringify({ ok: true, cleanStatus: cleanResult.status, futureCompatibility: futureResult.compatibility }, null, 2));