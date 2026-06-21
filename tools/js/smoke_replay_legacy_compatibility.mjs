#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildReplayReviewSourceFromBundle, buildReplayReviewSourceFromResult, replayReviewSourceSummary } from '../../src/core/replay/ReplayReviewLoader.js';

const legacy = buildReplayReviewSourceFromBundle({ type: 'legacy.result.summary-only', manifest: { missionId: 'legacy-mission' } }, { sourceKind: 'legacySummary', allowArtifactBuild: false });
const legacySummary = replayReviewSourceSummary(legacy);
assert.equal(legacySummary.present, false, 'summary-only legacy source does not fabricate replay events');
assert.equal(legacySummary.hiddenTruthIncluded, false, 'legacy source remains public-safe');
const browser = buildReplayReviewSourceFromResult({ result: { frames: [{ x: 0, y: 0, t: 0 }], events: [], summary: { finalScore: 1 } } });
const browserSummary = replayReviewSourceSummary(browser);
assert.equal(browserSummary.changesOfficialBrowserScoring, false, 'browser compatibility source does not recompute scoring');
assert.equal(browserSummary.hiddenTruthIncluded, false, 'browser compatibility source excludes hidden truth');
console.log('smoke_replay_legacy_compatibility: PASS', JSON.stringify({ legacyPresent: legacySummary.present, browserPresent: browserSummary.present }));
