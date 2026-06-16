import { createBenchmarkModeConfig, benchmarkModeSummary } from '../../../core/benchmark/BenchmarkModeContract.js';
import { createBenchmarkModeState } from '../../../core/benchmark/BenchmarkModeState.js';
import {
  benchmarkEpisodeConfigFilename,
  benchmarkModeConfigFilename,
  buildBenchmarkEpisodeConfigExport,
  buildBenchmarkModeConfigExport
} from '../../../core/benchmark/BenchmarkModeExporter.js';
import { createBenchmarkEpisodeConfig, createBenchmarkEpisodeState, BENCHMARK_ATTEMPT_SOURCE_IDS, BENCHMARK_EPISODE_CONTRACT_VERSION } from '../../../core/benchmark/BenchmarkEpisodeContract.js';
import { BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION } from '../../../core/benchmark/BenchmarkRouteExecutionRecord.js';
import { BENCHMARK_RUN_RECORD_VERSION } from '../../../core/benchmark/BenchmarkRunRecord.js';
import { missionObjectiveOptions } from '../../../core/benchmark/MissionObjectiveTaxonomy.js';
import { openPlannerBenchmarkSetup } from '../../../core/benchmark/BenchmarkLaunchBridge.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class BenchmarkModeOverviewScene extends PhaserScene {
  constructor() {
    super('BenchmarkModeOverviewScene');
    this.objects = [];
  }

  init(data = {}) {
    this.config = createBenchmarkModeConfig({
      benchmarkMode: data.benchmarkMode ?? data.mode ?? 'plannerBenchmark',
      informationAccessTier: data.informationAccessTier,
      worldModelTier: data.worldModelTier,
      notes: ['Created from Benchmark Mode overview scene.']
    });
    this.state = createBenchmarkModeState(this.config);
    this.episodeConfig = createBenchmarkEpisodeConfig({
      benchmarkModeConfig: this.config,
      notes: ['Created from Benchmark Mode overview scene.']
    });
    this.episodeState = createBenchmarkEpisodeState({
      episodeConfig: this.episodeConfig,
      phase: 'setup',
      activeAttemptSource: this.config.benchmarkMode === 'fullAutonomyBenchmark' ? 'externalSolver' : 'manualPlayer'
    });
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'benchmarkModeOverview';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel(this.config.label);
    this.renderConsole();
    this.refreshDebugObject();
    this.draw();
  }

  shutdown() {
    this.destroyObjects();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.draw();
  }

  renderConsole() {
    const p2ImplementedSystems = ['benchmarkEpisodeRuntime', 'benchmarkAttemptSession', 'benchmarkResultAdapter', 'result/debrief adapter'];
    this.app.console?.renderBenchmarkModeOverviewControls?.({
      config: this.config,
      state: {
        ...this.state,
        implementedSystems: [...this.state.implementedSystems, ...p2ImplementedSystems]
      },
      summary: benchmarkModeSummary(this.config),
      episodeConfig: this.episodeConfig,
      episodeState: this.episodeState,
      objectiveOptions: missionObjectiveOptions().slice(0, 6),
      p1Implemented: [
        'benchmark mode config',
        'episode metadata propagation',
        'existing setup/planning/simulation/debrief path',
        'result/debrief adapter',
        'benchmark run-record export from Debrief',
        'route-execution export from Debrief',
        'attempt-set comparison export'
      ],
      p1NotImplemented: [
        'new route planner',
        'mission-manager objective switching',
        'full autonomy',
        'MARL/RL',
        'production scoring redesign'
      ]
    }, {
      exportConfig: () => this.exportConfigJson(),
      exportEpisode: () => this.exportEpisodeConfigJson(),
      openBenchmarkSetup: () => this.openPlannerBenchmarkSetup(),
      openSamplingPriority: () => this.scene.start('SamplingPriorityDemoScene'),
      openFlowCoupledSampling: () => this.scene.start('FlowCoupledSamplingDemoScene'),
      openUncertainty: () => this.scene.start('UncertaintyForecastDemoScene'),
      openPlannerEvaluation: () => this.scene.start('DatasetExportScene'),
      menu: () => this.scene.start('MainMenuScene')
    });
  }

  exportConfigJson() {
    const exportData = buildBenchmarkModeConfigExport(this.config);
    downloadJSON(benchmarkModeConfigFilename(this.config), exportData);
  }

  exportEpisodeConfigJson() {
    const exportData = buildBenchmarkEpisodeConfigExport(this.episodeConfig);
    downloadJSON(benchmarkEpisodeConfigFilename(this.episodeConfig), exportData);
  }

  openPlannerBenchmarkSetup() {
    if (this.config.benchmarkMode !== 'plannerBenchmark') {
      this.app.toast?.('Only Planner Benchmark has a P2 setup bridge. Adaptive and Full Autonomy remain contract-only.', 'info');
      return;
    }
    const result = openPlannerBenchmarkSetup({
      app: this.app,
      scene: this,
      benchmarkModeConfig: this.config,
      episodeConfig: this.episodeConfig,
      episodeState: this.episodeState
    });
    if (!result.launched) this.app.toast?.('Benchmark setup bridge is unavailable; export the episode config instead.', 'warning');
    this.refreshDebugObject();
  }

  refreshDebugObject() {
    const supportedExportTypes = [
      'anchor.benchmark.mode-config',
      'anchor.benchmark.episode-config',
      'anchor.benchmark.run-record',
      'anchor.benchmark.route-execution',
      'anchor.benchmark.attempt-set'
    ];
    globalThis.ANCHOR_BENCHMARK_MODE_DEBUG = {
      ...this.state.debugFlags,
      episodeContractVersion: BENCHMARK_EPISODE_CONTRACT_VERSION,
      runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
      routeExecutionRecordVersion: BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
      plannerBenchmarkLaunchAvailable: this.config.benchmarkMode === 'plannerBenchmark',
      routeExecutionImplemented: 'existing-simulator-debrief-export',
      missionScoringImplemented: false,
      usesExistingSimulation: true,
      usesExistingDebrief: true,
      supportedAttemptSources: [...BENCHMARK_ATTEMPT_SOURCE_IDS],
      supportedExportTypes,
      implementedSystems: [...this.state.implementedSystems, 'benchmarkEpisodeRuntime', 'benchmarkAttemptSession', 'benchmarkResultAdapter'],
      missingSystems: [...this.state.missingSystems],
      visibleLayers: [...this.state.visibleLayers],
      exportFlags: { ...this.state.exportFlags, benchmarkEpisodeConfig: true, routeExecutionRecord: true }
    };
    globalThis.ANCHOR_BENCHMARK_EPISODE_DEBUG = {
      episodeId: this.episodeState.episodeId,
      benchmarkMode: this.config.benchmarkMode,
      phase: this.episodeState.phase,
      attemptSources: [...this.episodeConfig.allowedAttemptSources],
      activeAttemptSource: this.episodeState.activeAttemptSource,
      informationAccessTier: this.config.informationAccessTier,
      objectiveAuthority: this.config.objectiveAuthority,
      routeAuthority: this.config.routeAuthority,
      fairnessLabel: this.config.fairnessLabel
    };
  }

  draw() {
    this.destroyObjects();
    const width = Number(this.sys?.game?.scale?.width ?? 960);
    const height = Number(this.sys?.game?.scale?.height ?? 640);
    const x = Math.max(32, Math.round(width * 0.08));
    let y = Math.max(48, Math.round(height * 0.12));
    const titleStyle = { fontFamily: 'system-ui', fontSize: '34px', color: '#eef6ff', fontStyle: '700' };
    const bodyStyle = { fontFamily: 'system-ui', fontSize: '18px', color: '#c7d7ee', lineSpacing: 8, wordWrap: { width: Math.max(420, width * 0.72) } };
    const mutedStyle = { fontFamily: 'system-ui', fontSize: '15px', color: '#8fa8c8', lineSpacing: 6, wordWrap: { width: Math.max(420, width * 0.72) } };
    this.objects.push(this.add.text(x, y, this.config.label, titleStyle));
    y += 52;
    this.objects.push(this.add.text(x, y, modeCardText(this.config.benchmarkMode), bodyStyle));
    y += 88;
    this.objects.push(this.add.text(x, y, [
      `Objective authority: ${authorityLabel(this.config.objectiveAuthority)}`,
      `Route authority: ${authorityLabel(this.config.routeAuthority)}`,
      `Information access: ${this.state.summary.informationAccess.label} (${this.config.fairnessLabel})`,
      `World model tier: ${this.state.summary.worldModel.label}`
    ], bodyStyle));
    y += 128;
    this.objects.push(this.add.text(x, y, 'P2 status: existing planning, simulator, and debrief can emit benchmark run, route-execution, and attempt-set records.', mutedStyle));
    y += 60;
    this.objects.push(this.add.text(x, y, 'Not implemented here: new route planner, mission-manager switching, full autonomy, MARL/RL, or production scoring redesign.', mutedStyle));
  }

  destroyObjects() {
    for (const object of this.objects) object?.destroy?.();
    this.objects = [];
  }
}

function modeCardText(mode) {
  return {
    plannerBenchmark: 'Objective is fixed. Plan manually, use Greedy Planner, or import a solver plan. Execute through the existing simulator and compare results in Debrief.',
    adaptiveBenchmark: 'Mission manager objective updates are defined by contract; execution later.',
    fullAutonomyBenchmark: 'Solver/agent objective and route authority are defined by contract; execution later.'
  }[mode] ?? 'Benchmark mode contract.';
}

function authorityLabel(value) {
  return {
    fixed: 'fixed / given objective',
    missionManager: 'transparent mission manager',
    playerOrSolver: 'player or solver',
    solverOrAgent: 'solver or agent'
  }[value] ?? value;
}