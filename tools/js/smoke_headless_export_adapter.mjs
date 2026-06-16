import assert from 'node:assert/strict';
import {
  buildHeadlessBundleManifestFromArtifacts,
  buildHeadlessEpisodeFromBenchmarkRecords,
  buildHeadlessFieldPackDescriptorFromDemoArtifact,
  buildHeadlessMissionConfigFromBrowserArtifact,
  normalizeBrowserArtifactForHeadless,
  validateHeadlessAdapterOutput
} from '../../src/core/headless/HeadlessExportAdapter.js';

const flowArtifact = { type: 'anchor.demo.flow-field', demoName: 'Flow Demo', grid: { width: 3, height: 2 }, fields: { current: [[[1, 0]]] } };
const flowPack = buildHeadlessFieldPackDescriptorFromDemoArtifact(flowArtifact);
assert.equal(flowPack.type, 'anchor.headless.field-pack');
assert.ok(flowPack.fieldIds.includes('F_u'), 'flow maps F_u');
assert.ok(flowPack.fieldIds.includes('F_v'), 'flow maps F_v');
assert.equal(validateHeadlessAdapterOutput(flowPack).valid, true, 'flow pack adapter output validates');

const priorityPack = buildHeadlessFieldPackDescriptorFromDemoArtifact({ type: 'anchor.demo.sampling-priority', grid: { width: 2, height: 2 }, fields: { samplingPriority: [[1]] } });
assert.ok(priorityPack.fieldIds.includes('A_global'), 'sampling-priority maps A_global');
const actionValuePack = buildHeadlessFieldPackDescriptorFromDemoArtifact({ type: 'anchor.demo.flow-coupled-sampling', grid: { width: 2, height: 2 }, fields: { actionValue: [[1]] } });
assert.ok(actionValuePack.fieldIds.includes('Q_glider'), 'flow-coupled sampling maps Q_glider');

const runRecord = { type: 'anchor.benchmark.run-record', episodeId: 'episode-1', benchmarkMode: 'plannerBenchmark', summary: { finalScore: 12 }, events: [{ type: 'sample', time: 1, agentId: 'g1', x: 1, y: 1, value: 4 }] };
const episode = buildHeadlessEpisodeFromBenchmarkRecords([runRecord]);
assert.equal(episode.type, 'anchor.headless.episode');
assert.equal(episode.observations.length, 1, 'benchmark event maps to observation');
assert.equal(episode.rewards.length, 1, 'summary maps to reward record');

const adaptiveSession = { type: 'anchor.benchmark.adaptive-episode-session', episodeId: 'adaptive-1', benchmarkMode: 'adaptiveBenchmark', legs: [{ legIndex: 0, objectiveId: 'reconnaissanceSurvey' }], objectiveHistory: [{ legIndex: 0, toObjectiveId: 'reconnaissanceSurvey' }] };
const adaptiveEpisode = normalizeBrowserArtifactForHeadless(adaptiveSession);
assert.equal(adaptiveEpisode.type, 'anchor.headless.episode');
assert.equal(adaptiveSession.legs.length, 1, 'adapter does not mutate input');

const mission = buildHeadlessMissionConfigFromBrowserArtifact({ type: 'anchor.solverPacket', missionId: 'm1', level: { world: { grid: { width: 4, height: 4 }, time: { dt: 1, duration: 10 } } }, mission: { agents: [{ id: 'g1', start: { x: 0, y: 0 } }] }, planningData: { visibleFields: { forecast: {}, terrain: {} } } });
assert.equal(mission.type, 'anchor.headless.mission-config');
assert.ok(mission.visibleFields.includes('E_forecast'), 'mission includes visible forecast field');

const manifest = buildHeadlessBundleManifestFromArtifacts([flowArtifact, runRecord]);
assert.equal(manifest.type, 'anchor.headless.manifest');
assert.ok(manifest.files.some((entry) => entry.role === 'fieldPack'), 'manifest includes field pack role');
console.log('smoke_headless_export_adapter: ok');