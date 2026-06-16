import assert from 'node:assert/strict';
import { createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';
import { adaptiveEpisodeSessionPanelHtml } from '../../src/ui/benchmark/AdaptiveEpisodeSessionPanel.js';

const session = createAdaptiveEpisodeSession({ episodeId: '<script>alert(1)</script>', currentObjectiveId: 'reconnaissanceSurvey' });
const vm = buildAdaptiveObjectiveHistoryViewModel({ session });
const html = adaptiveEpisodeSessionPanelHtml(vm);
assert.ok(html.includes('Adaptive Episode Session'));
assert.ok(html.includes('Objective History'));
assert.ok(html.includes('Continue to Next Leg'));
assert.ok(html.includes('Save Adaptive Session'));
assert.ok(html.includes('does not generate routes automatically'));
assert.ok(html.includes('MARL/RL'));
assert.ok(!html.includes('<script>alert(1)</script>'), 'unsafe text is escaped');
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
console.log('smoke_adaptive_episode_session_panel: ok');
