#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { classifySolverPacketArtifact, solverPacketHeadlessCompatibilitySummary, validateSolverPacketForHeadless } from '../../src/core/headless/HeadlessSolverPacketAdapter.js';

const packet = readJson('docs/examples/headless_solver_packet.example.json');
const before = JSON.stringify(packet);
const classification = classifySolverPacketArtifact(packet);
assert.equal(classification.recognized, true, 'solver packet artifact is recognized');
assert.equal(classification.packetId, 'H3-1-SOLVER-PACKET-EXAMPLE', 'example packet id');

const validation = validateSolverPacketForHeadless(packet);
assert.equal(validation.ok, true, 'public solver packet visibility passes');
assert.equal(validation.status, 'PASS', 'public solver packet visibility status');
assert.equal(validation.hiddenTruthIncluded, false, 'public solver packet omits hidden truth');

const compatibility = solverPacketHeadlessCompatibilitySummary(packet);
assert.equal(compatibility.recognized, true, 'compatibility summary recognizes packet');
assert.equal(compatibility.visibilityStatus, 'PASS', 'compatibility summary carries visibility status');
assert.equal(compatibility.usesPythonSimulator, false, 'adapter does not use Python simulator');
assert.equal(compatibility.usesNewPlanner, false, 'adapter does not add planner');
assert.equal(JSON.stringify(packet), before, 'adapter does not mutate packet input');

const leakingPacket = structuredClone(packet);
leakingPacket.planningData.visibleFields.truth = { fieldIds: ['T_hiddenTruth'] };
const leakValidation = validateSolverPacketForHeadless(leakingPacket, { oracle: false });
assert.equal(leakValidation.ok, false, 'hidden truth in public packet fails validation');
assert.match(leakValidation.errors.join(' '), /hidden truth|T_hiddenTruth/i, 'hidden truth failure is explicit');

console.log('Headless solver packet adapter smoke passed', {
  packetId: classification.packetId,
  status: validation.status,
  grid: compatibility.grid
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}