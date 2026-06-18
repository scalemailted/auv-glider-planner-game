import { buildHeadlessBundleFromFiles } from '../../../core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../../core/headless/HeadlessBundleViewModel.js';
import {
  buildBrowserHeadlessBundleDebugObject,
  buildBrowserHeadlessBundleSummaryArtifact,
  buildBrowserHeadlessRoundtripSummaryArtifact
} from '../../../core/headless/HeadlessBundleBrowserAdapter.js';
import { downloadJSON } from '../../../core/io/ImportExport.js';
import { headlessBundleViewerPanelHtml } from '../../../ui/headless/HeadlessBundleViewerPanel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};
export class HeadlessBundleViewerScene extends PhaserScene {
  constructor() {
    super('HeadlessBundleViewerScene');
    this.objects = [];
    this.bundle = null;
    this.viewModel = null;
    this.statusMessage = 'No bundle loaded yet.';
    this.lastError = null;
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'headlessBundleViewer';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Headless Bundle Viewer');
    this.renderPanel();
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

  renderPanel() {
    this.viewModel = this.bundle ? buildHeadlessBundleViewModel(this.bundle) : null;
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Headless Bundle Viewer</div>
        <h1>Headless Bundle Viewer</h1>
        <p>Import Node/OceanBox-JS headless mission bundles for browser-side inspection.</p>
      </section>
      <section class="console-section">
        <h2>Import</h2>
        <div class="panel-stack">
          <button class="console-button primary" data-action="load-example-bundle">Load Example Bundle</button>
          <button class="console-button secondary" data-action="load-example-roundtrip">Load Example Roundtrip</button>
          <button class="console-button secondary" data-action="load-example-cost-graph">Load Example Cost Graph</button>
          <button class="console-button secondary" data-action="load-example-mission-score">Load Example Mission Score</button>
          <label class="console-button secondary" for="headless-bundle-file-input">Choose Combined or Multiple Bundle Files</label>
          <input id="headless-bundle-file-input" data-headless-bundle-files type="file" multiple accept=".json,.csv,application/json,text/csv" hidden />
          <button class="console-button secondary" data-action="menu">Main Menu</button>
        </div>
        <div class="hud-muted">Supports bundle.json or separate manifest, mission_config, visible_fields, observation, track, score, replay, and episode JSON/CSV files.</div>
      </section>
      <section class="console-status">
        <span>Status</span>
        <strong>${escapeHtml(this.bundle ? this.viewModel?.bundleStatus : 'EMPTY')}</strong>
        <small>${escapeHtml(this.statusMessage)}</small>
      </section>
      ${this.viewModel ? headlessBundleViewerPanelHtml(this.viewModel) : emptyStateHtml()}
      ${this.lastError ? `<section class="console-section"><h2>Import Warning</h2><div class="hud-muted">${escapeHtml(this.lastError)}</div></section>` : ''}
    `);

    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-action="load-example-bundle"]')?.addEventListener('click', () => this.loadExampleBundle());
    root?.querySelector?.('[data-action="load-example-roundtrip"]')?.addEventListener('click', () => this.loadExampleRoundtrip());
    root?.querySelector?.('[data-action="load-example-cost-graph"]')?.addEventListener('click', () => this.loadExampleCostGraph());
    root?.querySelector?.('[data-action="load-example-mission-score"]')?.addEventListener('click', () => this.loadExampleMissionScore());
    root?.querySelector?.('[data-action="export-browser-summary"]')?.addEventListener('click', () => this.exportBrowserSummary());
    root?.querySelector?.('[data-action="export-browser-roundtrip-summary"]')?.addEventListener('click', () => this.exportBrowserRoundtripSummary());
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
    root?.querySelector?.('[data-headless-bundle-files]')?.addEventListener('change', (event) => this.loadSelectedFiles(event.target.files));
  }

  async loadSelectedFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    try {
      const entries = await Promise.all(files.map(async (file) => ({ fileName: file.name, text: await file.text() })));
      const bundle = buildHeadlessBundleFromFiles(entries);
      this.setBundle(bundle, `Loaded ${files.length} selected file(s).`);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Bundle import failed.';
      this.app.toast?.(this.lastError, 'warning');
      this.renderPanel();
      this.refreshDebugObject();
    }
  }

  async loadExampleBundle() {
    const fileName = 'docs/examples/headless_oceanbox_js_public_bundle.example.json';
    try {
      const response = await fetch(fileName, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load ${fileName}: HTTP ${response.status}`);
      const payload = await response.json();
      const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
      this.setBundle(bundle, `Loaded checked-in public example bundle from ${fileName}.`);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Example bundle load failed.';
      this.renderPanel();
      this.refreshDebugObject();
    }
  }

  async loadExampleRoundtrip() {
    const fileName = 'docs/examples/headless_solver_roundtrip_bundle.example.json';
    try {
      const response = await fetch(fileName, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load ${fileName}: HTTP ${response.status}`);
      const payload = await response.json();
      const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
      this.setBundle(bundle, `Loaded checked-in solver roundtrip example from ${fileName}.`);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Example roundtrip load failed.';
      this.renderPanel();
      this.refreshDebugObject();
    }
  }

  async loadExampleCostGraph() {
    const fileName = 'docs/examples/headless_motion_cost_graph_bundle.example.json';
    try {
      const response = await fetch(fileName, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load ${fileName}: HTTP ${response.status}`);
      const payload = await response.json();
      const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
      this.setBundle(bundle, `Loaded checked-in motion cost graph example from ${fileName}.`);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Example cost graph load failed.';
      this.renderPanel();
      this.refreshDebugObject();
    }
  }
  async loadExampleMissionScore() {
    const fileName = 'docs/examples/headless_mission_score_bundle.example.json';
    try {
      const response = await fetch(fileName, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load ${fileName}: HTTP ${response.status}`);
      const payload = await response.json();
      const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
      this.setBundle(bundle, `Loaded checked-in SCORE-R1 mission score example from ${fileName}.`);
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Example mission score load failed.';
      this.renderPanel();
      this.refreshDebugObject();
    }
  }
  setBundle(bundle, statusMessage) {
    this.bundle = bundle;
    this.statusMessage = statusMessage;
    this.lastError = null;
    this.renderPanel();
    this.refreshDebugObject();
    this.draw();
  }

  exportBrowserSummary() {
    if (!this.bundle) {
      this.app.toast?.('Load a headless bundle before exporting a browser summary.', 'warning');
      return;
    }
    downloadJSON('anchor_headless_bundle_browser_summary.json', buildBrowserHeadlessBundleSummaryArtifact(this.bundle));
  }

  exportBrowserRoundtripSummary() {
    if (!this.bundle?.roundtripReport) {
      this.app.toast?.('Load a solver roundtrip bundle before exporting a roundtrip summary.', 'warning');
      return;
    }
    downloadJSON('anchor_headless_roundtrip_browser_summary.json', buildBrowserHeadlessRoundtripSummaryArtifact(this.bundle));
  }
  refreshDebugObject() {
    globalThis.ANCHOR_HEADLESS_BUNDLE_DEBUG = this.bundle ? {
      ...buildBrowserHeadlessBundleDebugObject(this.bundle),
      statusMessage: this.statusMessage,
      lastError: this.lastError,
      sourceFiles: this.bundle.files ?? []
    } : {
      version: 'headless-bundle-viewer-scene-h2',
      bundleLoaded: false,
      bundleStatus: 'EMPTY',
      validationStatus: 'EMPTY',
      visibilityRisk: 'unknown',
      browserSummaryExportAvailable: false,
      roundtripSummaryExportAvailable: false,
      roundtripLoaded: false,
      hasScienceDiagnostics: false,
      sciencePrimaryDiagnosis: null,
      scienceForecastCorrectionStatus: null,
      scienceHiddenEventStatus: null,
      scienceRecommendedObjective: null,
      scienceDiagnosticsPublicSafe: true,
      scienceDiagnosisIsPlannerAuthority: false,
      hasWaterColumnSummary: false,
      waterColumnLayerIds: [],
      waterColumnDefaultLayers: [],
      diveProfileId: null,
      observationCountsByDepth: {},
      verticalCoverage: null,
      bestDepthLayerCounts: {},
      waterColumnPublicSafe: true,
      hasBathymetrySummary: false,
      bathymetryDepthRange: null,
      bathymetryFeatureIds: [],
      surfaceWaypointCount: 0,
      samplingPointCount: 0,
      plannedPathPointCount: 0,
      realizedTrajectoryPointCount: 0,
      hasDiveProfilePath: false,
      bathymetryViewMode: null,
      hasMissionOutcomeReport: false,
      hasMissionScore: false,
      hasRegretReport: false,
      missionScoreProfileId: null,
      missionScoreProfileVersion: null,
      missionCompositeScore: null,
      missionScienceScore: null,
      missionFeasibilityScore: null,
      missionEfficiencyScore: null,
      missionSafetyScore: null,
      missionScoreCoverageFraction: 0,
      missionRegretReferenceType: null,
      missionTotalRegret: null,
      usesMissionOutcomeScoring: false,
      changesOfficialBrowserScoring: false,
      usesRouteOptimizer: false,
      hasMotionCostGraph: false,
      hasMotionCostMatrix: false,
      motionCostGraphNodeCount: 0,
      motionCostGraphEdgeCount: 0,
      motionCostGraphMetricId: null,
      motionCostMatrixFormat: null,
      motionCostGraphPublicSafe: true,
      motionCostGraphUsesRouteOptimizer: false,
      usesFull3DPlanning: false,
      usesProductionDataAssimilation: false,
      usesHydrodynamicSolver: false,
      usesTerrainFlowAsOceanCurrent: false,
      usesMARL: false,
      roundtripReportType: null,
      roundtripCanonicalType: null,
      solverPacketValidationStatus: null,
      planValidationStatus: null,
      roundtripExecutionStatus: null,
      roundtripVisibilityRisk: null,
      usesGeneratedPlan: false,
      usesBrowserOfficialScoring: false,
      usesPythonSimulator: false,
      usesNodeHeadlessRuntime: true,
      usesMARL: false,
      statusMessage: this.statusMessage,
      lastError: this.lastError
    };
  }

  draw() {
    this.destroyObjects();
    const width = Number(this.sys?.game?.scale?.width ?? 960);
    const height = Number(this.sys?.game?.scale?.height ?? 640);
    const x = Math.max(32, Math.round(width * 0.08));
    let y = Math.max(52, Math.round(height * 0.12));
    const titleStyle = { fontFamily: 'system-ui', fontSize: '34px', color: '#eef6ff', fontStyle: '700' };
    const bodyStyle = { fontFamily: 'system-ui', fontSize: '18px', color: '#c7d7ee', lineSpacing: 8, wordWrap: { width: Math.max(420, width * 0.72) } };
    const mutedStyle = { fontFamily: 'system-ui', fontSize: '15px', color: '#8fa8c8', lineSpacing: 6, wordWrap: { width: Math.max(420, width * 0.72) } };
    this.objects.push(this.add.text(x, y, 'Headless Bundle Viewer', titleStyle));
    y += 54;
    this.objects.push(this.add.text(x, y, this.bundle
      ? `Loaded ${this.bundle.files?.length ?? 0} bundle file(s). Status: ${this.viewModel?.bundleStatus ?? 'unknown'}.`
      : 'Import a bundle.json file or the separate JSON/CSV files exported by the Node/OceanBox-JS headless runtime.', bodyStyle));
    y += 98;
    this.objects.push(this.add.text(x, y, 'Inspection only: browser ANCHOR remains the official visual referee and browser scoring UI. This does not add a Python simulator, planner, MARL/RL, or calibrated ocean forecast.', mutedStyle));
  }

  destroyObjects() {
    for (const object of this.objects) object?.destroy?.();
    this.objects = [];
  }
}

function emptyStateHtml() {
  return `
    <section class="console-section">
      <h2>Empty State</h2>
      <div class="hud-muted">No bundle has been loaded. Use Load Example Bundle, Load Example Cost Graph, or choose bundle.json / separate bundle files.</div>
    </section>
    <section class="console-section">
      <h2>Boundary</h2>
      <div class="hud-muted">Loaded headless bundles are for inspection and comparison. Browser ANCHOR remains the official visual referee and browser scoring UI.</div>
      <div class="hud-muted">Colab/Python workflows should analyze JSON/CSV artifacts or call the Node CLI, not reimplement the simulator.</div>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}





