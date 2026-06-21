#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { createThreeReplayReviewController, threeReplayReviewControllerSummary, updateThreeReplayReviewController } from '../../src/game/three/ThreeReplayReviewController.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_r2a_acceptance.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const source = buildReplayReviewSourceFromBundle(bundle, { sourceKind: 'incremental-geometry-smoke' });
const controller = createThreeReplayReviewController({ renderer: null, source, options: { qualityProfile: 'balanced' } });
const initial = threeReplayReviewControllerSummary(controller);
updateThreeReplayReviewController(controller, { type: 'scrub', eventIndex: 7 });
const middle = threeReplayReviewControllerSummary(controller);
updateThreeReplayReviewController(controller, { type: 'jumpCheckpoint', selector: 'terminal' });
const terminal = threeReplayReviewControllerSummary(controller);
assert.ok(middle.replayViewModelBuildCount > initial.replayViewModelBuildCount, 'replay view model builds on navigation');
assert.ok(terminal.replayGeometryIncrementalUpdateCount > 0, 'controller records incremental replay geometry updates');
assert.equal(terminal.replayGeometryFullRebuildCount, 0, 'controller does not request full replay geometry rebuilds');
assert.equal(terminal.replayStaticGeometryBuildCount, 0, 'navigation does not rebuild static replay geometry through the controller');
assert.ok(terminal.viewModel.realizedTrajectoryPointCount >= middle.viewModel.realizedTrajectoryPointCount, 'forward replay grows realized trajectory extent');
assert.equal(terminal.includesHiddenTruth, false);
assert.equal(terminal.replayOwnsScoring, false);
console.log('smoke_replay_incremental_geometry: PASS', JSON.stringify({ viewModelBuilds: terminal.replayViewModelBuildCount, incrementalUpdates: terminal.replayGeometryIncrementalUpdateCount, terminalPoints: terminal.viewModel.realizedTrajectoryPointCount }));
