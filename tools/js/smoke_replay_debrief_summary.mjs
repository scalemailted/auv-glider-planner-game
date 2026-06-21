#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReplayReviewSourceFromResult, replayReviewSourceSummary } from '../../src/core/replay/ReplayReviewLoader.js';

const debrief = fs.readFileSync('src/game/phaser/scenes/DebriefScene.js', 'utf8');
assert.ok(debrief.includes('replayReviewPanelHtml'), 'Debrief renders a replay review panel');
assert.ok(debrief.includes('data-action="review-replay"'), 'Debrief exposes a replay review action');
assert.ok(debrief.includes('buildReplayReviewSourceFromResult'), 'Debrief builds review source from public result');
const source = buildReplayReviewSourceFromResult({
  level: { levelId: 'smoke-level', world: { grid: { width: 4, height: 4 }, time: { dt: 1 } }, layers: { terrain: [] } },
  mission: { missionId: 'smoke-mission', agents: [{ id: 'glider-1', start: { x: 0, y: 0 } }] },
  plan: { agentPlans: [{ agentId: 'glider-1', waypoints: [{ x: 1, y: 1 }] }] },
  result: { missionId: 'smoke-mission', frames: [{ agentId: 'glider-1', x: 0, y: 0, t: 0 }, { agentId: 'glider-1', x: 1, y: 1, t: 1 }], events: [], summary: { finalScore: 12 } }
});
const summary = replayReviewSourceSummary(source);
assert.equal(summary.changesOfficialBrowserScoring, false, 'debrief replay source does not change scoring');
assert.equal(summary.hiddenTruthIncluded, false, 'debrief replay source is public-safe');
console.log('smoke_replay_debrief_summary: PASS', JSON.stringify({ present: summary.present, sourceKind: summary.sourceKind, eventCount: summary.eventCount }));
