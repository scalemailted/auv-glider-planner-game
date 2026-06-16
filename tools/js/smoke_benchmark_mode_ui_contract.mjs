import assert from 'node:assert/strict';
import fs from 'node:fs';

import { BenchmarkModeOverviewScene } from '../../src/game/phaser/scenes/BenchmarkModeOverviewScene.js';
import {
  buildAdaptiveManagerPreviewExport,
  buildBenchmarkEpisodeConfigExport,
  buildBenchmarkModeConfigExport
} from '../../src/core/benchmark/BenchmarkModeExporter.js';

const missionConsole = fs.readFileSync('src/ui/MissionConsole.js', 'utf8');
const phaserGame = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
const benchmarkScene = fs.readFileSync('src/game/phaser/scenes/BenchmarkModeOverviewScene.js', 'utf8');
const adaptivePanel = fs.readFileSync('src/ui/benchmark/AdaptiveBenchmarkPanel.js', 'utf8');
const debriefScene = fs.readFileSync('src/game/phaser/scenes/DebriefScene.js', 'utf8');

for (const label of ['Planner Benchmark', 'Adaptive Benchmark', 'Full Autonomy Benchmark']) {
  assert.ok(missionConsole.includes(label), `MissionConsole includes ${label}`);
}
assert.ok(missionConsole.includes('Benchmark Modes'), 'MissionConsole includes Benchmark Modes group');
assert.ok(missionConsole.includes('benchmark-planner'), 'MissionConsole has Planner Benchmark action');
assert.ok(missionConsole.includes('benchmark-adaptive'), 'MissionConsole has Adaptive Benchmark action');
assert.ok(missionConsole.includes('benchmark-full-autonomy'), 'MissionConsole has Full Autonomy Benchmark action');
assert.ok(missionConsole.includes('Open Planner Benchmark Setup'), 'UI contains Planner Benchmark setup control');
assert.ok(missionConsole.includes('Export Benchmark Episode JSON'), 'UI contains episode export control');
assert.ok(missionConsole.includes('P2 Execution Integration'), 'UI states P2 execution integration');
assert.ok(missionConsole.includes('Existing simulator and debrief produce benchmark records'), 'UI states existing simulator/debrief boundary');
assert.ok(missionConsole.includes('Export Benchmark Run Record'), 'Debrief console includes run-record export control');
assert.ok(missionConsole.includes('Export Route Execution Record'), 'Debrief console includes route-execution export control');
assert.ok(missionConsole.includes('Export Benchmark Attempt Set'), 'Debrief console includes attempt-set export control');
assert.ok(missionConsole.includes('Export Benchmark Comparison'), 'Debrief console includes comparison export control');
assert.ok(missionConsole.includes('Adaptive Mission Manager'), 'Adaptive Benchmark UI mentions mission manager');
assert.ok(missionConsole.includes('P6 Adaptive Mission Manager Contract'), 'Adaptive Benchmark UI mentions P6 contract');
assert.ok(missionConsole.includes('Adaptive Benchmark previews mission-manager objective updates'), 'Adaptive Benchmark UI states preview boundary');
assert.ok(adaptivePanel.includes('The player or solver still chooses the route'), 'Adaptive panel says player/solver chooses route');
assert.ok(adaptivePanel.includes('P6 does not implement full route execution for adaptive missions'), 'Adaptive panel states no adaptive route execution');
assert.ok(adaptivePanel.includes('MARL/RL'), 'Adaptive panel states no MARL/RL boundary');
assert.ok(missionConsole.includes('Solver/agent objective and route authority are defined by contract; execution later.'), 'Full Autonomy placeholder boundary is visible');
assert.ok(phaserGame.includes('BenchmarkModeOverviewScene'), 'PhaserGame registers BenchmarkModeOverviewScene');
assert.equal(typeof BenchmarkModeOverviewScene, 'function', 'BenchmarkModeOverviewScene imports');
assert.ok(benchmarkScene.includes('openPlannerBenchmarkSetup'), 'Benchmark scene imports launch bridge');
assert.ok(benchmarkScene.includes('ANCHOR_BENCHMARK_EPISODE_DEBUG'), 'Benchmark scene exposes episode debug object');
assert.ok(benchmarkScene.includes('ANCHOR_ADAPTIVE_BENCHMARK_DEBUG'), 'Benchmark scene exposes adaptive debug object');
assert.ok(benchmarkScene.includes('buildAdaptiveManagerPreviewExport'), 'Benchmark scene supports adaptive preview export');
assert.ok(debriefScene.includes('ANCHOR_BENCHMARK_EXECUTION_DEBUG'), 'Debrief scene exposes benchmark execution debug object');
assert.ok(debriefScene.includes('usesExistingSimulation: true'), 'Debrief benchmark debug marks existing simulation');
assert.ok(debriefScene.includes('usesNewPlanner: false'), 'Debrief benchmark debug excludes new planner');
assert.ok(debriefScene.includes('hasComparisonViewModel'), 'Debrief benchmark debug includes comparison view model field');
assert.ok(debriefScene.includes('hasRouteReviewViewModel'), 'Debrief benchmark debug includes route review view model field');

const exportJson = buildBenchmarkModeConfigExport({ benchmarkMode: 'plannerBenchmark' });
assert.equal(exportJson.type, 'anchor.benchmark.mode-config', 'benchmark export type');
assert.equal(exportJson.debugFlags.usesMARL, false, 'benchmark export keeps MARL disabled');
assert.equal(exportJson.debugFlags.usesMissionScoring, false, 'benchmark export keeps mission scoring disabled');

const adaptivePreview = buildAdaptiveManagerPreviewExport({ fixtureId: 'shiftedFrontForecastError' });
assert.equal(adaptivePreview.type, 'anchor.benchmark.adaptive-manager-preview', 'adaptive preview export type');
assert.equal(adaptivePreview.objectiveAuthority, 'missionManager', 'adaptive preview objective authority');
assert.equal(adaptivePreview.routeAuthority, 'playerOrSolver', 'adaptive preview route authority');
assert.equal(adaptivePreview.usesRoutePlanning, false, 'adaptive preview excludes route planning');
assert.equal(adaptivePreview.usesMARL, false, 'adaptive preview excludes MARL');

const episodeJson = buildBenchmarkEpisodeConfigExport({ benchmarkMode: 'plannerBenchmark' });
assert.equal(episodeJson.type, 'anchor.benchmark.episode-config', 'episode export type');
assert.ok(episodeJson.allowedAttemptSources.includes('manualPlayer'), 'episode export permits manual player attempts');
assert.ok(episodeJson.allowedAttemptSources.includes('greedyPlanner'), 'episode export permits greedy planner attempts');
assert.ok(episodeJson.allowedAttemptSources.includes('importedSolver'), 'episode export permits imported solver attempts');

console.log('smoke_benchmark_mode_ui_contract: ok');

