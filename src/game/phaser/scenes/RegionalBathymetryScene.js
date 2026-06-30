import { markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { beginScenario, markBriefingSeen } from '../../../core/scenario/ScenarioState.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import {
  buildEnvironmentStudioProject,
  buildEnvironmentStudioReferenceBenchmarkBundle,
  buildEnvironmentStudioReferencePlanningLaunch,
  composeEnvironmentStudioReferenceEnvironment,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  importEnvironmentStudioProject,
  regenerateEnvironmentStudioFields,
  refreshEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow,
  setEnvironmentStudioPreviewCameraState,
  validateEnvironmentStudioProject,
  validateEnvironmentStudioReferenceLaunch
} from '../../../core/editor/EnvironmentStudioProject.js';
import {
  loadMeshLod,
  loadReferenceTileLibrary,
  loadTileSet,
  referenceTileLibraryDebugState
} from '../../../core/editor/ReferenceBathymetryTileLibrary.js';
import {
  createThreeBathymetryRenderer,
  disposeThreeBathymetryRenderer,
  resizeThreeBathymetryRenderer,
  setBathymetryCamera,
  setBathymetryLayerVisibility,
  threeBathymetryRendererSummary,
  updateThreeBathymetryScene
} from '../../three/ThreeBathymetryRenderer.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const REGIONAL_BATHYMETRY_SCENE_VERSION = 'regional-bathymetry-scene-r1';

const PREVIEW_MESH_CAP = Object.freeze({ columns: 240, rows: 160, vertices: 40000 });
const DEFAULT_REGIONAL_CAMERA = Object.freeze({ yaw: -42, pitch: 46, zoom: 72, panX: 0, panY: 0, verticalExaggeration: 1.8 });

export class RegionalBathymetryScene extends PhaserScene {
  constructor() {
    super('RegionalBathymetryScene');
    this.objects = [];
    this.startData = {};
    this.session = createEnvironmentStudioSession({ sourceMode: 'referenceBathymetryAtlas', studioStage: 'regionalPatchWorkspace' });
    this.referenceTileLibrary = null;
    this.tileSetRecord = null;
    this.meshArtifact = null;
    this.meshLodRecord = null;
    this.statusMessage = 'Loading hosted reference bathymetry tile metadata.';
    this.lastError = null;
    this.previewHost = null;
    this.mode = 'stagedSingleTile';
    this.meshDetail = 'medium';
    this.layerVisibility = {
      bathymetry: true,
      waterSurface: true,
      coastline: true,
      plannedRoute: true,
      realizedTrajectory: true,
      surface: true,
      thermocline: true,
      deep: true,
      flowVectors: false,
      samplingPoints: false,
      surfaceWaypoints: false,
      diveProfilePath: false
    };
    this.threeRenderer = null;
    this.rendererContainer = null;
    this.previewViewModel = null;
    this.resizeObserver = null;
  }

  init(data = {}) {
    this.startData = cloneJson(data) ?? {};
    this.mode = String(this.startData.mode ?? 'stagedSingleTile');
    this.meshDetail = String(this.startData.preferredMeshLod ?? this.startData.meshDetail ?? 'medium');
    this.session = cloneJson(data.session)
      ?? createEnvironmentStudioSession({ sourceMode: 'referenceBathymetryAtlas', studioStage: 'regionalPatchWorkspace' });
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.events?.once?.('shutdown', () => this.shutdown());
    this.events?.once?.('destroy', () => this.shutdown());
    this.app.state.mode = 'environmentStudio';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Regional 3D Bathymetry Workspace');
    this.drawBackdrop();
    this.mountPreviewHost();
    this.session = this.prepareRegionalSession(this.session);
    this.render();
    this.loadRegionalArtifacts();
    markAnchorRouteReady('regional-bathymetry', { resolvedRuntimeShell: 'default', inputHandlersBound: true });
  }

  shutdown() {
    this.destroyThreePreview();
    this.clearObjects();
    this.destroyPreviewHost();
    this.clearRightPanel();
    this.publishDebug(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawBackdrop();
    resizeThreeBathymetryRenderer(this.threeRenderer);
    this.publishDebug(true);
  }

  prepareRegionalSession(sessionInput = {}) {
    let session = refreshEnvironmentStudioSession({
      ...sessionInput,
      sourceMode: 'referenceBathymetryAtlas',
      studioStage: 'regionalPatchWorkspace'
    });
    if (!session.selectedReferenceWindow?.bounds && this.startData.selectedBounds) {
      session = selectEnvironmentStudioReferenceWindow(session, {
        ...this.startData.selectedBounds,
        selectedResolutionMeters: 1500,
        previewResolutionMeters: 6000
      }, { selectedReferenceFixtureId: this.startData.tileSetId });
    }
    if (this.isCoarsePreview()) {
      return refreshEnvironmentStudioSession({
        ...session,
        loadedReferenceFixtureId: null,
        loadedReferenceFixtureRole: null,
        loadedReferenceFixture: null,
        launchValidationResult: null,
        planningLaunchResult: null,
        benchmarkBundleResult: null,
        lastAction: 'coarse-regional-preview-opened'
      });
    }
    return this.markHostedTileLoaded(session);
  }

  isCoarsePreview() {
    return this.mode === 'coarsePreview' || this.startData.mode === 'coarsePreview';
  }

  markHostedTileLoaded(sessionInput = {}) {
    if (this.isCoarsePreview()) return sessionInput;
    const tile = this.tileSetRecord ?? this.startData.tileSetMetadata ?? {};
    const tileSetId = this.startData.tileSetId ?? tile.tileSetId ?? sessionInput.selectedReferenceFixtureId ?? 'monterey_canyon_15s';
    const role = this.startData.tileSetRole ?? tile.role ?? 'missionReadyTileSet';
    const loadedRole = role === 'missionReadyTileSet' ? 'missionReadyPatch' : 'lowResolutionReferencePatch';
    return refreshEnvironmentStudioSession({
      ...sessionInput,
      sourceMode: 'referenceBathymetryAtlas',
      studioStage: 'regionalPatchWorkspace',
      selectedReferenceFixtureId: tileSetId,
      loadedReferenceFixtureId: tileSetId,
      loadedReferenceFixtureRole: loadedRole,
      loadedReferenceFixture: {
        fixtureId: tileSetId,
        label: tile.label ?? tileSetId,
        role: loadedRole,
        sourceDataset: tile.sourceDataset ?? 'ETOPO_2022',
        provider: tile.provider ?? 'NOAA NCEI',
        sourceResolution: tile.sourceResolution ?? null,
        actualRasterResolutionArcSeconds: tile.actualRasterResolutionArcSeconds ?? null,
        columns: tile.rasterTiles?.columns ?? tile.columns ?? null,
        rows: tile.rasterTiles?.rows ?? tile.rows ?? null,
        bounds: cloneJson(tile.bounds ?? this.startData.selectedBounds ?? null),
        digest: this.startData.rasterDigest ?? tile.rasterTiles?.digest ?? tile.digests?.raster ?? tile.digest ?? null,
        tileLibraryTileSetId: tileSetId,
        tileLibraryRole: role,
        meshLods: cloneJson(tile.meshLods ?? [])
      },
      selectedOperationalWindow: null
    });
  }

  async loadRegionalArtifacts() {
    try {
      this.referenceTileLibrary = await loadReferenceTileLibrary();
      if (this.isCoarsePreview()) {
        this.statusMessage = 'Opened coarse bathymetry preview from the app-hosted global overview. This is not mission-ready; staged bathymetry is required before field generation or Planning launch.';
        this.lastError = null;
        this.session = this.prepareRegionalSession(this.session);
        this.render();
        return;
      }
      const tileSetId = this.startData.tileSetId ?? 'monterey_canyon_15s';
      const tileSet = await loadTileSet(tileSetId, { library: this.referenceTileLibrary });
      this.tileSetRecord = tileSet;
      const meshDescriptor = preferredMeshLodDescriptor(tileSet.metadata?.meshLods ?? tileSet.meshLods ?? [], this.startData.preferredMeshLod);
      this.meshLodRecord = meshDescriptor;
      if (meshDescriptor?.lod) {
        this.meshArtifact = await loadMeshLod(tileSetId, meshDescriptor.lod, { library: this.referenceTileLibrary });
      }
      this.session = this.markHostedTileLoaded(this.session);
      this.statusMessage = `Loaded hosted bathymetry tile ${tileSetId}. Mesh LOD is visualization-only.`;
      this.lastError = null;
    } catch (error) {
      this.statusMessage = 'Could not load hosted Regional 3D Bathymetry tile metadata.';
      this.lastError = error?.message ?? String(error);
    }
    this.render();
  }

  render() {
    if (!this.app) return;
    this.session = this.isCoarsePreview()
      ? this.prepareRegionalSession(this.session)
      : this.markHostedTileLoaded(this.session);
    this.renderConsole();
    this.renderRightPanel();
    this.renderPreview();
    this.publishDebug(true);
  }

  renderConsole() {
    this.app.setPanel(regionalBathymetryConsoleHtml(this));
    bindRegionalBathymetryControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderRightPanel() {
    const root = this.app.elements?.waypointTimelineRoot;
    if (!root) return;
    root.innerHTML = regionalBathymetryRightPanelHtml(this);
  }

  renderPreview() {
    if (!this.previewHost) return;
    this.destroyThreePreview();
    this.previewHost.innerHTML = regionalBathymetryPreviewHtml(this);
    this.initializeThreePreview();
  }

  drawBackdrop() {
    this.clearObjects();
    const width = Math.max(1, Number(this.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scale?.height ?? 820));
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x03101d, 0x0b2036, 0x061827, 0x020812, 1);
    graphics.fillRect(0, 0, width, height);
    this.objects.push(graphics);
  }

  clearObjects() {
    for (const object of this.objects) object?.destroy?.();
    this.objects = [];
  }

  mountPreviewHost() {
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer;
    if (!host || this.previewHost) return;
    this.previewHost = globalThis.document.createElement('div');
    this.previewHost.className = 'environment-studio-preview-host regional-bathymetry-preview-host';
    this.previewHost.setAttribute('data-regional-bathymetry-preview-host', 'true');
    host.appendChild(this.previewHost);
  }

  destroyPreviewHost() {
    this.destroyThreePreview();
    this.previewHost?.remove?.();
    this.previewHost = null;
  }

  initializeThreePreview() {
    const container = this.previewHost?.querySelector?.('[data-regional-bathymetry-three-host]');
    if (!container) return;
    this.rendererContainer = container;
    this.previewViewModel = buildRegionalBathymetryPreviewViewModel(this.previewModelInput());
    try {
      this.threeRenderer = createThreeBathymetryRenderer(container, {
        camera: this.previewCameraState(),
        layerVisibility: this.layerVisibility
      });
      updateThreeBathymetryScene(this.threeRenderer, this.previewViewModel);
      setBathymetryLayerVisibility(this.threeRenderer, this.layerVisibility);
      setBathymetryCamera(this.threeRenderer, this.previewCameraState());
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => resizeThreeBathymetryRenderer(this.threeRenderer));
        this.resizeObserver.observe(container);
      }
    } catch (error) {
      this.lastError = `Interactive bathymetry preview could not start: ${error?.message ?? error}`;
      this.statusMessage = this.lastError;
      this.threeRenderer = null;
    }
  }

  destroyThreePreview() {
    this.resizeObserver?.disconnect?.();
    this.resizeObserver = null;
    disposeThreeBathymetryRenderer(this.threeRenderer);
    this.threeRenderer = null;
    this.rendererContainer = null;
  }

  previewCameraState(patch = {}) {
    const camera = this.session.previewCameraState ?? {};
    return {
      ...DEFAULT_REGIONAL_CAMERA,
      ...camera,
      ...patch,
      verticalExaggeration: clampNumber(Number(patch.verticalExaggeration ?? camera.verticalExaggeration ?? DEFAULT_REGIONAL_CAMERA.verticalExaggeration), 0.5, 5),
      fitComplete: patch.fitComplete === true ? true : camera.fitComplete === true
    };
  }

  previewModelInput() {
    const tile = this.tileSetRecord ?? this.startData.tileSetMetadata ?? {};
    const mode = this.regionalMode();
    return {
      mode,
      meshDetail: this.meshDetail,
      selectedBounds: this.startData.selectedBounds ?? this.session.selectedReferenceWindow?.bounds ?? null,
      overviewMetadata: this.startData.overviewMetadata ?? this.session.referenceBathymetryManifest?.overview ?? this.session.referenceAtlas?.overviewArtifact ?? {},
      boundaryBudget: this.startData.boundaryBudget ?? this.session.selectedReferenceBoundaryBudget ?? this.session.selectedReferenceAvailability?.boundaryBudget ?? {},
      meshArtifact: this.meshArtifact ?? this.startData.meshLodMetadata ?? null,
      meshLodRecord: this.meshLodRecord ?? this.startData.meshLodMetadata ?? null,
      tileSetMetadata: tile.metadata ?? tile,
      sourceDataset: this.startData.sourceDataset ?? tile.sourceDataset ?? tile.metadata?.sourceDataset ?? 'ETOPO_2022',
      sourceDigest: this.startData.rasterDigest ?? tile.rasterTiles?.digest ?? tile.metadata?.rasterTiles?.digest ?? tile.digests?.raster ?? null,
      verticalExaggeration: this.previewCameraState().verticalExaggeration
    };
  }

  regionalMode() {
    const tile = this.tileSetRecord ?? this.startData.tileSetMetadata ?? {};
    if (this.isCoarsePreview()) return 'coarsePreview';
    if (this.startData.mode === 'stagedMultiTile' || this.startData.mode === 'multiTile' || tile.budgetClass === 'multiTileStaged' || tile.rasterTiles?.kind === 'multiRasterJson') return 'stagedMultiTile';
    return 'stagedSingleTile';
  }

  clearRightPanel() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
  }

  readSeed() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#regional-bathymetry-seed')?.value ?? this.session.seed ?? 'env-staging-scene-r1');
  }

  updatePreviewCamera(patch = {}) {
    this.session = setEnvironmentStudioPreviewCameraState(this.session, this.previewCameraState(patch));
    this.statusMessage = 'Updated regional bathymetry preview camera metadata.';
    this.render();
  }

  setCameraPreset(preset) {
    if (preset === 'topDown') {
      this.updatePreviewCamera({ yaw: 0, pitch: 78, zoom: 76, panX: 0, panY: 0, fitComplete: true, preset: 'topDown' });
      return;
    }
    this.updatePreviewCamera({ ...DEFAULT_REGIONAL_CAMERA, preset: 'oblique', fitComplete: true });
  }

  zoomPreview(delta) {
    const camera = this.previewCameraState();
    this.updatePreviewCamera({ zoom: clampNumber(Number(camera.zoom ?? DEFAULT_REGIONAL_CAMERA.zoom) + Number(delta), 18, 180), fitComplete: true });
  }

  setMeshDetail(detail) {
    this.meshDetail = ['coarse', 'medium', 'high'].includes(detail) ? detail : 'medium';
    this.statusMessage = `Preview mesh detail set to ${this.meshDetail}.`;
    this.render();
  }

  setLayerVisibility(key, value) {
    this.layerVisibility = { ...this.layerVisibility, [key]: Boolean(value) };
    setBathymetryLayerVisibility(this.threeRenderer, this.layerVisibility);
    this.publishDebug(true);
  }

  blockCoarsePreviewAction(actionLabel) {
    if (!this.isCoarsePreview()) return false;
    this.lastError = `${actionLabel} is disabled in coarse preview. Stage browser-safe multi-tile bathymetry before generating fields or launching Planning.`;
    this.statusMessage = this.lastError;
    this.app?.toast?.(this.lastError, 'warning');
    this.render();
    return true;
  }

  confirmBathymetry() {
    if (this.blockCoarsePreviewAction('Generate 3D Bathymetry / Confirm Bathymetry')) return;
    try {
      this.session = this.markHostedTileLoaded(this.session);
      this.session = generateEnvironmentStudioRegionFromReferenceWindow(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated 3D bathymetry from the selected hosted reference tile and operational bounds.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Bathymetry generation failed.';
    }
    this.render();
  }

  generateFields() {
    if (this.blockCoarsePreviewAction('Generate Currents & Science Fields')) return;
    try {
      if (!this.session.bathymetryArtifactDigest) {
        throw new Error('Confirm or generate 3D bathymetry before generating currents and science fields.');
      }
      this.session = regenerateEnvironmentStudioFields(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated deterministic bathymetry-conditioned currents, scalar field, hotspots, hazards, and start/drop-zone candidates.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Field generation failed.';
    }
    this.render();
  }

  composeEnvironmentArtifact() {
    if (this.blockCoarsePreviewAction('Compose Environment Artifact')) return;
    try {
      this.session = composeEnvironmentStudioReferenceEnvironment(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Composed package-backed EnvironmentArtifact from reference bathymetry and generated fields.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'EnvironmentArtifact composition failed.';
    }
    this.render();
  }

  validateLaunch() {
    if (this.blockCoarsePreviewAction('Validate Launch')) return;
    try {
      this.session = validateEnvironmentStudioReferenceLaunch(this.session, { seed: this.readSeed() });
      const launch = this.session.launchValidationResult;
      this.statusMessage = launch?.planningLaunchReady
        ? 'Reference environment launch validation passed. Planning launch is ready.'
        : 'Reference environment launch validation needs review.';
      this.lastError = launch?.planningLaunchReady ? null : (launch?.errors?.[0] ?? 'Planning launch validation did not pass.');
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference environment launch validation failed.';
    }
    this.render();
  }

  launchToPlanning() {
    if (this.blockCoarsePreviewAction('Launch to Planning')) return;
    try {
      const result = buildEnvironmentStudioReferencePlanningLaunch(this.session, { seed: this.readSeed() });
      this.session = result.session;
      const launchDebug = {
        ...(result.launchMetadata ?? {}),
        source: 'regionalBathymetrySceneLaunch',
        launchedFromEnvironmentStudio: true,
        launchedFromRegionalBathymetryScene: true,
        launchValidationStatus: result.launchMetadata?.launchValidationStatus ?? result.launchValidation?.status ?? null,
        launchValidationDigest: result.launchMetadata?.launchValidationDigest ?? result.launchValidation?.launchValidationDigest ?? null,
        warningSummary: result.launchMetadata?.warningSummary ?? result.launchValidation?.warningSummary ?? null,
        warningCount: result.launchMetadata?.warningCount ?? result.launchValidation?.warningSummary?.totalWarningCount ?? result.warnings?.length ?? 0,
        blockingWarningCount: result.launchMetadata?.blockingWarningCount ?? result.launchValidation?.warningSummary?.blockingWarningCount ?? 0,
        failureCount: result.launchMetadata?.failureCount ?? result.launchValidation?.warningSummary?.failureCount ?? 0,
        warnings: result.warnings ?? result.launchValidation?.warnings ?? [],
        hiddenTruthExposed: false,
        simulationChanged: false,
        scoringChanged: false,
        plannerChanged: false,
        fieldEquationsChanged: false
      };
      this.app.state.referenceEnvironmentLaunch = launchDebug;
      globalThis.ANCHOR_REFERENCE_ENVIRONMENT_LAUNCH_DEBUG = launchDebug;
      beginScenario(this.app.state, {
        level: result.level,
        mission: result.mission,
        challengeMode: result.challengeMode ?? 'forecast',
        source: result.source ?? 'regionalBathymetrySceneLaunch',
        experienceMode: result.experienceMode ?? 'simulationLab'
      });
      this.app.state.referenceEnvironmentLaunch = launchDebug;
      markBriefingSeen(this.app.state);
      this.statusMessage = 'Launched reference-derived environment to Planning.';
      this.lastError = null;
      this.publishDebug(true);
      this.scene.start('MissionWorkspaceScene');
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Reference environment Planning launch failed.';
      this.render();
    }
  }

  exportBenchmarkBundle() {
    if (this.blockCoarsePreviewAction('Export Public Benchmark Bundle')) return;
    try {
      const result = buildEnvironmentStudioReferenceBenchmarkBundle(this.session, { seed: this.readSeed() });
      this.session = result.session;
      downloadJSON('anchor_reference_environment_benchmark_bundle.json', result.bundle);
      this.statusMessage = 'Exported public package-backed reference environment benchmark bundle.';
      this.lastError = result.validation?.status === 'FAIL'
        ? (result.validation.failures?.[0] ?? 'Benchmark bundle validation failed.')
        : null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Public benchmark bundle export failed.';
    }
    this.render();
  }

  exportProject() {
    const project = buildEnvironmentStudioProject(this.session);
    downloadJSON('anchor_environment_studio_project.json', project);
    this.statusMessage = 'Exported Environment Studio project JSON.';
    this.render();
  }

  exportCoarsePreviewPatchRequest() {
    if (!this.isCoarsePreview()) return;
    const request = this.session.referencePatchRequest
      ?? this.session.selectedReferenceAvailability?.referencePatchRequest
      ?? null;
    if (!request) {
      this.lastError = 'No staging request is available for this coarse preview.';
      this.statusMessage = 'Patch request export skipped.';
      this.app?.toast?.(this.lastError, 'warning');
      this.render();
      return;
    }
    const isMultiTile = request.artifactType === 'anchor.reference-bathymetry-multitile-patch-request';
    const fixtureName = request.suggestedFixtureId
      ?? request.suggestedFixturePrefix
      ?? 'anchor_reference_bathymetry_preview_request';
    downloadJSON(`${fixtureName}.${isMultiTile ? 'reference-bathymetry-multitile-patch-request' : 'reference-bathymetry-patch-request'}.json`, request);
    this.statusMessage = `Exported ${isMultiTile ? 'multi-tile ' : ''}bathymetry staging request from coarse preview.`;
    this.lastError = null;
    this.render();
  }

  exportBathymetryArtifact() {
    if (this.blockCoarsePreviewAction('Export Bathymetry Artifact')) return;
    if (!this.session.tiles?.length) {
      this.lastError = 'Generate regional bathymetry before exporting a bathymetry artifact.';
      this.statusMessage = 'Bathymetry artifact export skipped.';
      this.render();
      return;
    }
    downloadJSON('anchor_environment_studio_bathymetry_artifact.json', {
      artifactType: 'anchor.environment-studio.regional-bathymetry-artifact',
      artifactVersion: '1.0.0',
      sourceGridShape: this.session.sourceGridShape,
      previewGridShape: this.session.previewGridShape,
      previewDecimation: this.session.previewDecimation,
      bathymetryBuilderResult: this.session.bathymetryBuilderResult,
      bathymetryArtifactDigest: this.session.bathymetryArtifactDigest ?? this.session.bathymetryBuilderResult?.bathymetryArtifactDigest,
      tiles: this.session.tiles,
      mosaic: this.session.mosaic,
      provenance: {
        generatedBy: 'src/game/phaser/scenes/RegionalBathymetryScene.js',
        generatorVersion: REGIONAL_BATHYMETRY_SCENE_VERSION,
        deterministicSeed: this.session.seed,
        referenceBathymetryPatch: true,
        calibratedOceanProduct: false,
        operationalForecast: false,
        certifiedForNavigation: false,
        hiddenTruthExposed: false
      }
    });
    this.statusMessage = 'Exported regional bathymetry artifact JSON.';
    this.render();
  }

  async importProject(file) {
    if (!file) return;
    try {
      const payload = await readJSONFile(file);
      const validation = validateEnvironmentStudioProject(payload);
      if (!validation.valid) throw new Error(validation.errors[0] ?? 'Project validation failed.');
      this.session = importEnvironmentStudioProject(payload);
      this.statusMessage = `Imported ${file.name}.`;
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Project import failed.';
      this.app.toast?.(this.lastError, 'warning');
    }
    this.render();
  }

  returnToAtlas() {
    this.scene.start('EnvironmentStudioScene');
  }

  publishDebug(active = true) {
    const tile = this.tileSetRecord ?? this.startData.tileSetMetadata ?? {};
    const mesh = this.meshArtifact ?? this.startData.meshLodMetadata ?? {};
    const mode = this.regionalMode();
    const missionReady = mode !== 'coarsePreview';
    const previewViewModel = this.previewViewModel ?? buildRegionalBathymetryPreviewViewModel(this.previewModelInput());
    const rendererSummary = threeBathymetryRendererSummary(this.threeRenderer ?? {});
    const rasterDigest = this.startData.rasterDigest
      ?? tile.rasterTiles?.digest
      ?? tile.metadata?.rasterTiles?.digest
      ?? tile.digests?.raster
      ?? this.session.loadedReferenceFixture?.digest
      ?? null;
    const meshDigest = this.startData.meshLodDigest
      ?? this.meshLodRecord?.digest
      ?? mesh.digest
      ?? null;
    const planningLaunchEnabled = mode !== 'coarsePreview'
      && this.session.launchValidationResult?.planningLaunchReady === true;
    const loadedTileCount = mode === 'stagedMultiTile'
        ? Number(tile.tileGrid?.tileCount ?? tile.rasterTiles?.tiles?.length ?? 0)
        : mode === 'stagedSingleTile' && (this.startData.tileSetId ?? tile.tileSetId ?? this.session.loadedReferenceFixtureId)
        ? 1
        : 0;
    const regionalBathymetryDebug = {
      version: REGIONAL_BATHYMETRY_SCENE_VERSION,
      stage: 'regionalBathymetryWorkspace',
      mode,
      rendererType: 'three',
      interactive3dEnabled: Boolean(active && this.threeRenderer && previewViewModel?.interactive3dEnabled),
      cameraControlsEnabled: Boolean(active && this.threeRenderer && previewViewModel?.cameraControlsEnabled),
      routeActive: Boolean(active),
      openedFromAtlasBoundary: this.startData.source === 'environmentStudioAtlas',
      selectedBounds: cloneJson(this.startData.selectedBounds ?? this.session.selectedReferenceWindow?.bounds ?? null),
      sourceDataset: this.startData.sourceDataset ?? tile.sourceDataset ?? tile.metadata?.sourceDataset ?? 'ETOPO_2022',
      previewSource: this.startData.previewSource ?? (mode === 'coarsePreview' ? 'globalOverview' : 'hostedMissionReadyTile'),
      previewMeshGrid: cloneJson(previewViewModel?.previewMeshGrid ?? null),
      previewGridShape: cloneJson(previewViewModel?.previewMeshGrid ?? null),
      previewVertexCount: Number(previewViewModel?.previewVertexCount ?? 0),
      previewTriangleCount: Number(previewViewModel?.previewTriangleCount ?? 0),
      renderedPreview: Boolean(active && previewViewModel?.previewVertexCount),
      missionReady,
      fieldGenerationEnabled: mode !== 'coarsePreview',
      benchmarkExportEnabled: mode !== 'coarsePreview',
      stagingRequired: mode === 'coarsePreview',
      loadedTileSetId: this.startData.tileSetId ?? tile.tileSetId ?? this.session.loadedReferenceFixtureId ?? null,
      loadedTileCount,
      loadedMeshLod: this.meshArtifact?.lod ?? this.meshLodRecord?.lod ?? this.startData.preferredMeshLod ?? null,
      loadedTileSetRole: this.startData.tileSetRole ?? tile.role ?? null,
      loadedRasterDigest: rasterDigest,
      loadedMeshLodDigest: meshDigest,
      rasterAuthoritativeForSimulation: mode !== 'coarsePreview',
      meshAuthoritativeForSimulation: false,
      meshLodLoaded: Boolean(this.meshArtifact ?? this.startData.meshLodMetadata),
      renderedMeshVertexCount: Number(previewViewModel?.previewVertexCount ?? mesh.vertexCount ?? this.meshLodRecord?.vertexCount ?? 0),
      renderedMeshTriangleCount: Number(previewViewModel?.previewTriangleCount ?? mesh.triangleCount ?? this.meshLodRecord?.triangleCount ?? 0),
      verticalExaggeration: Number(this.previewCameraState().verticalExaggeration ?? DEFAULT_REGIONAL_CAMERA.verticalExaggeration),
      noaaRuntimeFetchRequired: false,
      gebcoRuntimeFetchRequired: false,
      rawExternalDataPathExposed: false,
      localAbsolutePathExposed: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false,
      plannerChanged: false,
      fieldEquationsChanged: false,
      activeRendererCount: Boolean(active && this.threeRenderer) ? 1 : 0,
      activeRafCount: Boolean(active && this.threeRenderer?.animationFrame != null) ? 1 : 0,
      activeCanvasCount: Boolean(active && this.threeRenderer?.renderer?.domElement?.isConnected) ? 1 : 0,
      planningLaunchEnabled,
      planningLaunchReady: planningLaunchEnabled,
      bathymetryArtifactDigest: this.session.bathymetryArtifactDigest ?? null,
      fieldGenerationStatus: this.session.fieldRegenerationResult?.fieldGenerationStatus ?? null,
      currentArtifactDigest: this.session.fieldRegenerationResult?.currentArtifactDigest ?? null,
      scalarArtifactDigest: this.session.fieldRegenerationResult?.scalarArtifactDigest ?? null,
      environmentCompositionStatus: this.session.environmentCompositionResult?.environmentArtifactStatus ?? null,
      rendererSummary,
      referenceTileLibrary: this.referenceTileLibrary ? referenceTileLibraryDebugState(this.referenceTileLibrary) : null,
      statusMessage: this.statusMessage,
      lastError: this.lastError
    };
    globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG = regionalBathymetryDebug;
    globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG = {
      ...(globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG ?? {}),
      regionalBathymetryDebug
    };
  }
}

function regionalBathymetryConsoleHtml(scene) {
  const session = scene.session;
  const coarsePreview = scene.isCoarsePreview();
  const bathymetryReady = Boolean(session.bathymetryArtifactDigest);
  const fieldsReady = Boolean(session.fieldRegenerationResult?.currentArtifactDigest && session.fieldRegenerationResult?.scalarArtifactDigest);
  const canCompose = !coarsePreview && fieldsReady;
  const canValidate = !coarsePreview && fieldsReady;
  const canLaunch = !coarsePreview && session.launchValidationResult?.planningLaunchReady === true;
  const canExportBenchmark = !coarsePreview && canCompose;
  const coarseRequest = session.referencePatchRequest ?? session.selectedReferenceAvailability?.referencePatchRequest ?? null;
  const coarseRequestIsMultiTile = coarseRequest?.artifactType === 'anchor.reference-bathymetry-multitile-patch-request';
  const camera = scene.previewCameraState();
  const mode = scene.regionalMode();
  const meshOptions = ['coarse', 'medium', 'high'];
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Regional Bathymetry</h1>
      <p>${coarsePreview
        ? 'Interactive 3D preview from app-hosted overview/LOD data. It is not mission-ready.'
        : 'Interactive 3D preview from staged app-hosted bathymetry. Raster/grid authority is preserved.'}</p>
    </section>
    <section class="console-status">
      <span>Mode</span>
      <strong>${escapeHtml(mode)}</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="view-controls">
      <h2>View</h2>
      <p class="hud-muted">Drag to rotate. Shift-drag or right-drag to pan. Wheel to zoom.</p>
      <div class="environment-studio-camera-row" aria-label="Regional view controls">
        <button type="button" data-action="regional-reset-camera">Reset Camera</button>
        <button type="button" data-action="regional-topdown-view">Top-down View</button>
        <button type="button" data-action="regional-oblique-view">Oblique View</button>
        <button type="button" data-action="regional-zoom-in">Zoom In</button>
        <button type="button" data-action="regional-zoom-out">Zoom Out</button>
      </div>
      <label class="compact-field">
        Project seed
        <input id="regional-bathymetry-seed" type="text" value="${escapeAttr(session.seed ?? 'env-staging-scene-r1')}" />
      </label>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="mesh-detail">
      <h2>Mesh</h2>
      <div class="environment-studio-camera-row" aria-label="Mesh LOD">
        ${meshOptions.map((detail) => `<button type="button" class="${detail === scene.meshDetail ? 'active' : ''}" data-regional-mesh-detail="${escapeAttr(detail)}">${escapeHtml(labelize(detail))}</button>`).join('')}
      </div>
      <label class="compact-field">
        Vertical exaggeration
        <input id="regional-vertical-exaggeration" type="range" min="0.5" max="5" step="0.1" value="${escapeAttr(camera.verticalExaggeration ?? 1.8)}" />
      </label>
      <p class="hud-muted">Preview mesh is decimated for browser interaction. High-resolution staged bathymetry is required for mission-ready fields and Planning launch.</p>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="display-layers">
      <h2>Layers</h2>
      <div class="environment-studio-checkbox-grid regional-bathymetry-layer-list">
        ${layerToggle('bathymetry', 'Bathymetry Mesh', scene.layerVisibility.bathymetry)}
        ${layerToggle('surface', 'Depth Bands', scene.layerVisibility.surface)}
        ${layerToggle('plannedRoute', 'Selected Bounds', scene.layerVisibility.plannedRoute)}
        ${layerToggle('realizedTrajectory', 'Tile Boundaries', scene.layerVisibility.realizedTrajectory)}
        ${layerToggle('coastline', 'Contours', scene.layerVisibility.coastline)}
        ${layerToggle('waterSurface', 'Water Surface', scene.layerVisibility.waterSurface)}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="environment-build">
      <h2>Actions</h2>
      ${coarsePreview ? '<p class="hud-muted">Generation, composition, launch validation, Planning launch, and benchmark export are disabled in coarse preview.</p>' : ''}
      <button class="console-button secondary" type="button" data-action="regional-back-atlas">Return to Atlas</button>
      ${coarsePreview ? `<button class="console-button warning" type="button" data-action="regional-export-preview-request" ${coarseRequest ? '' : 'disabled aria-disabled="true"'}>${coarseRequestIsMultiTile ? 'Export Multi-Tile Request' : 'Export Patch Request'}</button>` : ''}
      <button class="console-button primary" type="button" data-action="regional-confirm-bathymetry" ${coarsePreview ? 'disabled aria-disabled="true"' : ''}>Confirm Bathymetry</button>
      <button class="console-button primary" type="button" data-action="regional-generate-fields" ${!coarsePreview && bathymetryReady ? '' : 'disabled'}>Generate Fields</button>
      <button class="console-button secondary" type="button" data-action="regional-compose-environment" ${canCompose ? '' : 'disabled'}>Compose Environment Artifact</button>
      <button class="console-button secondary" type="button" data-action="regional-validate-launch" ${canValidate ? '' : 'disabled'}>Validate Launch</button>
      <button class="console-button primary" type="button" data-action="regional-launch-planning" ${canLaunch ? '' : 'disabled'}>Launch to Planning</button>
      <button class="console-button secondary" type="button" data-action="regional-export-benchmark" ${canExportBenchmark ? '' : 'disabled'}>Export Public Benchmark Bundle</button>
      <button class="console-button secondary" type="button" data-action="regional-export-bathymetry" ${coarsePreview ? 'disabled aria-disabled="true"' : ''}>Export Bathymetry Artifact</button>
      <button class="console-button secondary" type="button" data-action="regional-export-project">Export Project</button>
      <label class="console-button secondary" for="regional-import-project-file">Import Project</label>
      <input id="regional-import-project-file" type="file" accept="application/json,.json" hidden data-regional-import-project />
    </section>
  `;
}

function bindRegionalBathymetryControls(scene, root) {
  root?.querySelector?.('[data-action="regional-reset-camera"]')?.addEventListener('click', () => scene.updatePreviewCamera(DEFAULT_REGIONAL_CAMERA));
  root?.querySelector?.('[data-action="regional-topdown-view"]')?.addEventListener('click', () => scene.setCameraPreset('topDown'));
  root?.querySelector?.('[data-action="regional-oblique-view"]')?.addEventListener('click', () => scene.setCameraPreset('oblique'));
  root?.querySelector?.('[data-action="regional-zoom-in"]')?.addEventListener('click', () => scene.zoomPreview(-10));
  root?.querySelector?.('[data-action="regional-zoom-out"]')?.addEventListener('click', () => scene.zoomPreview(10));
  root?.querySelectorAll?.('[data-regional-mesh-detail]')?.forEach((button) => {
    button.addEventListener('click', () => scene.setMeshDetail(button.getAttribute('data-regional-mesh-detail')));
  });
  root?.querySelectorAll?.('[data-regional-layer-toggle]')?.forEach((input) => {
    input.addEventListener('change', () => scene.setLayerVisibility(input.getAttribute('data-regional-layer-toggle'), input.checked));
  });
  root?.querySelector?.('#regional-vertical-exaggeration')?.addEventListener('change', (event) => {
    scene.updatePreviewCamera({ verticalExaggeration: Number(event.target.value) });
  });
  root?.querySelector?.('[data-action="regional-confirm-bathymetry"]')?.addEventListener('click', () => scene.confirmBathymetry());
  root?.querySelector?.('[data-action="regional-generate-fields"]')?.addEventListener('click', () => scene.generateFields());
  root?.querySelector?.('[data-action="regional-compose-environment"]')?.addEventListener('click', () => scene.composeEnvironmentArtifact());
  root?.querySelector?.('[data-action="regional-validate-launch"]')?.addEventListener('click', () => scene.validateLaunch());
  root?.querySelector?.('[data-action="regional-launch-planning"]')?.addEventListener('click', () => scene.launchToPlanning());
  root?.querySelector?.('[data-action="regional-export-benchmark"]')?.addEventListener('click', () => scene.exportBenchmarkBundle());
  root?.querySelector?.('[data-action="regional-export-bathymetry"]')?.addEventListener('click', () => scene.exportBathymetryArtifact());
  root?.querySelector?.('[data-action="regional-export-preview-request"]')?.addEventListener('click', () => scene.exportCoarsePreviewPatchRequest());
  root?.querySelector?.('[data-action="regional-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-regional-import-project]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="regional-back-atlas"]')?.addEventListener('click', () => scene.returnToAtlas());
}

function regionalBathymetryRightPanelHtml(scene) {
  if (scene.isCoarsePreview()) return coarsePreviewRightPanelHtml(scene);
  const tile = scene.tileSetRecord ?? scene.startData.tileSetMetadata ?? {};
  const metadata = tile.metadata ?? tile;
  const raster = tile.rasterTiles ?? metadata.rasterTiles ?? {};
  const mesh = scene.meshArtifact ?? scene.startData.meshLodMetadata ?? {};
  const meshDescriptor = scene.meshLodRecord ?? scene.startData.meshLodMetadata ?? {};
  const selectedBounds = scene.startData.selectedBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null;
  const claimBoundary = metadata.claimBoundary ?? tile.claimBoundary ?? {};
  const viewModel = scene.previewViewModel ?? buildRegionalBathymetryPreviewViewModel(scene.previewModelInput());
  const nextAction = scene.session.launchValidationResult?.planningLaunchReady
    ? 'Launch to Planning'
    : scene.session.environmentCompositionResult?.environmentArtifactStatus === 'CURRENT'
      ? 'Validate Launch'
      : scene.session.fieldRegenerationResult?.currentArtifactDigest
        ? 'Compose Environment'
        : scene.session.bathymetryArtifactDigest
          ? 'Generate Currents & Science Fields'
          : 'Generate 3D Bathymetry / Confirm Bathymetry';
  return `
    <section class="waypoint-shell environment-studio-right-panel regional-bathymetry-right-panel" id="regional-bathymetry-status-panel">
      <div class="console-kicker">Loaded Bathymetry Region</div>
      <h2>${escapeHtml(metadata.label ?? tile.label ?? scene.startData.tileSetId ?? 'Hosted Reference Tile')}</h2>
      <p class="hud-muted">Loaded from hosted reference bathymetry tile. The mesh is decimated for display; the raster/grid remains authoritative for bathymetry sampling, masks, environment generation, simulation, and benchmark export.</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Mode', scene.regionalMode())}
        ${metricHtml('Tile set ID', metadata.tileSetId ?? tile.tileSetId ?? scene.startData.tileSetId)}
        ${metricHtml('Source dataset', metadata.sourceDataset ?? tile.sourceDataset ?? 'ETOPO_2022')}
        ${metricHtml('Provider', metadata.provider ?? tile.provider ?? 'NOAA NCEI')}
        ${metricHtml('Source variant', metadata.sourceVariant ?? tile.sourceVariant)}
        ${metricHtml('Source resolution', metadata.sourceResolution ?? tile.sourceResolution)}
        ${metricHtml('Actual raster resolution', `${metadata.actualRasterResolutionArcSeconds ?? tile.actualRasterResolutionArcSeconds ?? 'n/a'} arc-sec`)}
        ${metricHtml('Bounds', boundsLabel(metadata.bounds ?? tile.bounds))}
        ${metricHtml('Selected operational bounds', boundsLabel(selectedBounds))}
        ${metricHtml('Preview mesh grid', `${formatInteger(viewModel.previewMeshGrid?.columns)} x ${formatInteger(viewModel.previewMeshGrid?.rows)}`)}
        ${metricHtml('Preview vertices', formatInteger(viewModel.previewVertexCount))}
        ${metricHtml('Preview triangles', formatInteger(viewModel.previewTriangleCount))}
        ${metricHtml('Raster digest', shortDigest(scene.startData.rasterDigest ?? raster.digest ?? metadata.digests?.raster ?? tile.digests?.raster))}
        ${metricHtml('Mesh LOD digest', shortDigest(scene.startData.meshLodDigest ?? meshDescriptor.digest ?? mesh.digest))}
        ${metricHtml('Raster authoritative', 'true')}
        ${metricHtml('Mesh authoritative', 'false')}
        ${metricHtml('Next action', nextAction)}
      </div>
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Bathymetry Raster</td><td>${statusTag('loaded')}</td></tr>
          <tr><td>Preview Mesh</td><td>${statusTag(scene.meshArtifact || scene.startData.meshLodMetadata ? 'loaded' : 'planned')}</td></tr>
          <tr><td>Wet/Land Mask</td><td>${statusTag(scene.session.bathymetryArtifactDigest ? 'available' : 'planned')}</td></tr>
          <tr><td>Current Field</td><td>${statusTag(scene.session.fieldRegenerationResult?.currentArtifactDigest ? 'current' : 'requires_generation')}</td></tr>
          <tr><td>Scalar Field</td><td>${statusTag(scene.session.fieldRegenerationResult?.scalarArtifactDigest ? 'current' : 'requires_generation')}</td></tr>
          <tr><td>Hotspots</td><td>${statusTag(scene.session.fieldRegenerationResult?.hotspotArtifactDigest ? 'current' : 'requires_generation')}</td></tr>
          <tr><td>Hazards</td><td>${statusTag(scene.session.fieldRegenerationResult?.hazardCandidateDigest ? 'current' : 'requires_generation')}</td></tr>
          <tr><td>Starts / Drop Zones</td><td>${statusTag(scene.session.launchValidationResult?.startDropZoneValidation?.status ?? 'needs_validation')}</td></tr>
          <tr><td>Environment Artifact</td><td>${statusTag(scene.session.environmentCompositionResult?.environmentArtifactStatus ?? 'requires_composition')}</td></tr>
          <tr><td>Benchmark Bundle</td><td>${statusTag(scene.session.benchmarkBundleResult?.status ?? 'requires_export')}</td></tr>
          <tr><td>Claim boundary</td><td>NOAA/GEBCO not fetched at runtime; mesh visualization only; not certified navigation data; not an operational forecast; hidden truth not exposed.</td></tr>
          <tr><td>Manifest claim</td><td>${escapeHtml(JSON.stringify(compactClaimBoundary(claimBoundary)))}</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function regionalBathymetryPreviewHtml(scene) {
  if (scene.isCoarsePreview()) return coarsePreviewHtml(scene);
  const tile = scene.tileSetRecord ?? scene.startData.tileSetMetadata ?? {};
  const metadata = tile.metadata ?? tile;
  const viewModel = buildRegionalBathymetryPreviewViewModel(scene.previewModelInput());
  const mesh = scene.meshArtifact ?? scene.startData.meshLodMetadata ?? viewModel.terrainMeshGeometry ?? {};
  const selectedBounds = scene.startData.selectedBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null;
  const tileBounds = metadata.bounds ?? tile.bounds ?? mesh.bounds ?? null;
  const subsetNote = selectedBounds && tileBounds && !sameBounds(selectedBounds, tileBounds)
    ? 'Selected operational window is shown within the hosted tile extent. Mesh clipping is planned.'
    : 'Selected operational window matches the loaded tile extent.';
  return `
    <main id="regional-bathymetry-route" class="environment-studio-route regional-bathymetry-route" data-regional-bathymetry-route>
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Regional 3D Bathymetry Workspace</p>
          <h1>${escapeHtml(metadata.label ?? tile.label ?? scene.startData.tileSetId ?? 'Hosted Reference Tile')}</h1>
          <p>Loaded from hosted reference bathymetry tile. 3D mesh is a decimated visualization; raster/grid remains authoritative.</p>
        </div>
        <div class="environment-studio-digest">
          <span>Raster</span>
          <strong>${escapeHtml(shortDigest(scene.startData.rasterDigest ?? metadata.rasterTiles?.digest ?? tile.rasterTiles?.digest))}</strong>
          <span>Mesh LOD</span>
          <strong>${escapeHtml(shortDigest(scene.startData.meshLodDigest ?? scene.meshLodRecord?.digest ?? mesh.digest))}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Regional bathymetry mesh preview">
        <section class="regional-bathymetry-mesh-shell" data-regional-bathymetry-preview-panel>
          <div class="regional-bathymetry-mesh-header">
            <div>
              <h2>Interactive 3D Bathymetry Preview</h2>
              <p class="hud-muted">Visualization sampled from ${escapeHtml(mesh.lod ?? scene.meshDetail ?? 'medium')} mesh LOD. Drag to rotate, shift/right-drag to pan, and wheel to zoom. The source raster remains authoritative.</p>
            </div>
            <div class="cell-inspector-metrics regional-bathymetry-inline-metrics">
              ${metricHtml('Vertices', formatInteger(viewModel.previewVertexCount))}
              ${metricHtml('Triangles', formatInteger(viewModel.previewTriangleCount))}
              ${metricHtml('Mesh rows', formatInteger(viewModel.previewMeshGrid?.rows))}
              ${metricHtml('Mesh cols', formatInteger(viewModel.previewMeshGrid?.columns))}
            </div>
          </div>
          <div class="regional-bathymetry-three-shell" data-regional-bathymetry-mesh-preview data-regional-bathymetry-three-host data-regional-bathymetry-preview-renderer="three"></div>
          <div class="environment-studio-depth-ramp regional-bathymetry-depth-ramp" aria-label="Bathymetry depth bands">
            <span style="background:#6f8056">land / nearshore</span>
            <span style="background:#47b9b3">shelf</span>
            <span style="background:#1c6aa2">slope</span>
            <span style="background:#071b55">deep</span>
          </div>
          <p class="hud-muted">${escapeHtml(subsetNote)}</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Authority boundary</strong>
        <span>Raster/grid bathymetry is authoritative. Preview mesh, color ramp, and selected-boundary overlay are display artifacts only.</span>
      </section>
    </main>
  `;
}

function coarsePreviewRightPanelHtml(scene) {
  const overview = scene.startData.overviewMetadata ?? {};
  const selectedBounds = scene.startData.selectedBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null;
  const budget = scene.startData.boundaryBudget ?? scene.session.selectedReferenceBoundaryBudget ?? {};
  const viewModel = scene.previewViewModel ?? buildRegionalBathymetryPreviewViewModel(scene.previewModelInput());
  return `
    <section class="waypoint-shell environment-studio-right-panel regional-bathymetry-right-panel" id="regional-bathymetry-status-panel">
      <div class="console-kicker">Loaded Region Inspector</div>
      <h2>${escapeHtml(overview.label ?? 'Global Reference Overview')}</h2>
      <p class="hud-muted">This preview uses the app-hosted global overview. It is not mission-ready. Stage high-resolution bathymetry tiles before field generation or Planning launch.</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Mode', 'coarsePreview')}
        ${metricHtml('Selected bounds', boundsLabel(selectedBounds))}
        ${metricHtml('Preview source', scene.startData.previewSource ?? 'globalOverview')}
        ${metricHtml('Source dataset', overview.sourceDataset ?? 'ETOPO_2022')}
        ${metricHtml('Source resolution', overview.sourceResolution ?? '60 arc-second overview')}
        ${metricHtml('Preview mesh grid', `${formatInteger(viewModel.previewMeshGrid?.columns)} x ${formatInteger(viewModel.previewMeshGrid?.rows)}`)}
        ${metricHtml('Preview vertices', formatInteger(viewModel.previewVertexCount))}
        ${metricHtml('Preview triangles', formatInteger(viewModel.previewTriangleCount))}
        ${metricHtml('Mission ready', 'false')}
        ${metricHtml('Field generation', 'disabled')}
        ${metricHtml('Generation mode', budget.budgetStatus === 'MULTI_TILE_REQUIRED' ? 'MULTI_TILE_REQUIRED' : 'COARSE_PREVIEW_ONLY')}
        ${metricHtml('Generation budget', budget.budgetStatus ?? 'n/a')}
        ${metricHtml('Source cells', formatInteger(budget.sourceCellCount))}
        ${metricHtml('Preview mesh cap', `${PREVIEW_MESH_CAP.columns} x ${PREVIEW_MESH_CAP.rows}`)}
        ${metricHtml('Field grid cap', '200 x 140')}
        ${metricHtml('Planning launch', 'disabled')}
        ${metricHtml('Staging required', 'true')}
        ${metricHtml('Next step', budget.budgetStatus === 'MULTI_TILE_REQUIRED' ? 'Export Multi-Tile Request' : 'Export Patch Request')}
      </div>
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Bathymetry Raster</td><td>${statusTag('coarse_preview_only')}</td></tr>
          <tr><td>Preview Mesh</td><td>${statusTag('overview_preview')}</td></tr>
          <tr><td>Generate Fields</td><td>${statusTag('disabled_until_staged')}</td></tr>
          <tr><td>Compose Environment</td><td>${statusTag('disabled_until_staged')}</td></tr>
          <tr><td>Launch Planning</td><td>${statusTag('disabled')}</td></tr>
          <tr><td>Claim boundary</td><td>Overview inspection only; no NOAA/GEBCO runtime fetch; no raw external_data path; no hidden truth.</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function coarsePreviewHtml(scene) {
  const overview = scene.startData.overviewMetadata ?? {};
  const selectedBounds = scene.startData.selectedBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null;
  const budget = scene.startData.boundaryBudget ?? scene.session.selectedReferenceBoundaryBudget ?? {};
  const viewModel = buildRegionalBathymetryPreviewViewModel(scene.previewModelInput());
  return `
    <main id="regional-bathymetry-route" class="environment-studio-route regional-bathymetry-route" data-regional-bathymetry-route data-regional-bathymetry-mode="coarsePreview">
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Regional 3D Bathymetry Workspace</p>
          <h1>Coarse Bathymetry Preview</h1>
          <p>Coarse reference overview preview. Not mission-ready. High-resolution tile staging required.</p>
        </div>
        <div class="environment-studio-digest">
          <span>Overview</span>
          <strong>${escapeHtml(shortDigest(overview.digest ?? overview.previewRasterDigest))}</strong>
          <span>Budget</span>
          <strong>${escapeHtml(budget.budgetStatus ?? 'n/a')}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Coarse regional bathymetry preview">
        <section class="regional-bathymetry-mesh-shell" data-regional-bathymetry-preview-panel data-regional-coarse-preview>
          <div class="regional-bathymetry-mesh-header">
            <div>
              <h2>Interactive 3D Bathymetry Preview</h2>
              <p class="hud-muted">Coarse preview only. Not mission-ready. Not suitable for official simulation/scoring. High-resolution tile staging is required before Planning launch.</p>
            </div>
            <div class="cell-inspector-metrics regional-bathymetry-inline-metrics">
              ${metricHtml('Selected bounds', boundsLabel(selectedBounds))}
              ${metricHtml('Preview mesh', `${formatInteger(viewModel.previewMeshGrid?.columns)} x ${formatInteger(viewModel.previewMeshGrid?.rows)}`)}
              ${metricHtml('Vertices', formatInteger(viewModel.previewVertexCount))}
              ${metricHtml('Source cells', formatInteger(budget.sourceCellCount))}
              ${metricHtml('Planning launch', 'disabled')}
            </div>
          </div>
          <div class="regional-bathymetry-three-shell" data-regional-bathymetry-mesh-preview data-regional-bathymetry-three-host data-regional-bathymetry-preview-renderer="three"></div>
          <div class="environment-studio-depth-ramp regional-bathymetry-depth-ramp" aria-label="Bathymetry depth bands">
            <span style="background:#6f8056">land / nearshore</span>
            <span style="background:#47b9b3">shelf</span>
            <span style="background:#1c6aa2">slope</span>
            <span style="background:#071b55">deep</span>
          </div>
          <p class="hud-muted">This view uses global overview metadata or decimated atlas context. It does not create mission-ready bathymetry, currents, science fields, or launchable benchmark artifacts.</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Coarse-preview boundary</strong>
        <span>Overview visualization only. Stage app-hosted multi-tile bathymetry before Planning launch.</span>
      </section>
    </main>
  `;
}

export function buildRegionalBathymetryPreviewViewModel(input = {}) {
  const geometry = Array.isArray(input.meshArtifact?.vertices) && input.meshArtifact.vertices.length
    ? terrainGeometryFromReferenceMesh(input)
    : terrainGeometryFromOverview(input);
  const tileBounds = input.tileSetMetadata?.bounds ?? input.meshArtifact?.bounds ?? input.overviewMetadata?.bounds ?? input.selectedBounds ?? null;
  const selectedPath = boundsToGridPath(input.selectedBounds ?? tileBounds, tileBounds, geometry.width, geometry.height, 0);
  const tilePath = boundsToGridPath(tileBounds, tileBounds, geometry.width, geometry.height, 0);
  const previewMeshGrid = { columns: geometry.width, rows: geometry.height };
  const contourGeometry = previewContourGeometry(geometry);
  return {
    type: 'anchor.regional-bathymetry.preview-view-model',
    version: REGIONAL_BATHYMETRY_SCENE_VERSION,
    mode: input.mode ?? 'coarsePreview',
    rendererType: 'three',
    interactive3dEnabled: true,
    cameraControlsEnabled: true,
    previewMeshGrid,
    previewVertexCount: geometry.vertexCount,
    previewTriangleCount: geometry.triangleCount,
    terrainMeshGeometry: geometry,
    terrainMesh: {
      width: geometry.width,
      height: geometry.height,
      sourceDigest: geometry.sourceDigest,
      vertexCount: geometry.vertexCount,
      triangleCount: geometry.triangleCount
    },
    coastlineGeometry: contourGeometry,
    contourGeometry,
    depthLayers: [
      { id: 'surface', y: -0.02, color: '#55d6be', opacity: 0.08 },
      { id: 'thermocline', y: -1.8, color: '#5bacd3', opacity: 0.08 },
      { id: 'deep', y: -4.4, color: '#8d7cff', opacity: 0.07 }
    ],
    plannedPath: selectedPath,
    realizedTrajectory: tilePath,
    featureIds: ['land-shelf-slope-deep-bands', 'selected-boundary', 'decimated-preview-mesh'],
    visibilityFlags: { bathymetry: true, waterSurface: true, coastline: true, plannedRoute: true, realizedTrajectory: true },
    displaySettings: { terrain: { mode: 'filledContours' } },
    summaries: {
      oceanWorld: {
        mode: input.mode ?? 'coarsePreview',
        sourceDataset: input.sourceDataset ?? 'ETOPO_2022',
        previewMeshGrid,
        terrainVertexCount: geometry.vertexCount,
        terrainTriangleCount: geometry.triangleCount
      }
    }
  };
}

function terrainGeometryFromReferenceMesh(input = {}) {
  const mesh = input.meshArtifact ?? {};
  const sourceRows = Math.max(2, Number(mesh.meshRows ?? input.meshLodRecord?.meshRows ?? 48));
  const sourceColumns = Math.max(2, Number(mesh.meshColumns ?? input.meshLodRecord?.meshColumns ?? 64));
  const vertices = Array.isArray(mesh.vertices) ? mesh.vertices : [];
  const target = fitPreviewMeshGrid(sourceColumns, sourceRows, input.meshDetail ?? mesh.lod ?? 'medium');
  const depths = [];
  const positions = [];
  const colors = [];
  const uvs = [];
  const depthScale = 0.018 * Number(input.verticalExaggeration ?? 1.8);
  let maxDepth = 1;
  for (const vertex of vertices) maxDepth = Math.max(maxDepth, depthFromVertex(vertex));
  for (let row = 0; row < target.rows; row += 1) {
    const sourceRow = Math.round((row / Math.max(1, target.rows - 1)) * (sourceRows - 1));
    for (let col = 0; col < target.columns; col += 1) {
      const sourceCol = Math.round((col / Math.max(1, target.columns - 1)) * (sourceColumns - 1));
      const vertex = vertices[sourceRow * sourceColumns + sourceCol] ?? vertices[0] ?? [0, 0, 0, 0];
      const depth = depthFromVertex(vertex);
      depths.push(depth);
      positions.push(
        col - (target.columns - 1) / 2,
        -depth * depthScale,
        row - (target.rows - 1) / 2
      );
      colors.push(...depthColorRgb(depth, maxDepth));
      uvs.push(col / Math.max(1, target.columns - 1), row / Math.max(1, target.rows - 1));
    }
  }
  const indices = gridIndices(target.columns, target.rows);
  return {
    version: 'regional-bathymetry-preview-reference-mesh-v1',
    sourceType: 'stagedMeshLod',
    width: target.columns,
    height: target.rows,
    bounds: mesh.bounds ?? input.tileSetMetadata?.bounds ?? input.selectedBounds ?? null,
    positions,
    colors,
    uvs,
    indices,
    depths,
    vertexCount: target.columns * target.rows,
    triangleCount: indices.length / 3,
    sourceDigest: input.sourceDigest ?? mesh.derivedFromRasterDigest ?? input.meshLodRecord?.digest ?? null,
    meshDigest: mesh.digest ?? input.meshLodRecord?.digest ?? input.sourceDigest ?? null,
    coordinateProfileId: 'regional-reference-lonlat-depth-preview',
    verticalExaggeration: Number(input.verticalExaggeration ?? 1.8),
    previewDecimated: target.columns !== sourceColumns || target.rows !== sourceRows
  };
}

function terrainGeometryFromOverview(input = {}) {
  const budget = input.boundaryBudget ?? {};
  const selected = input.selectedBounds ?? {};
  const sourceColumns = Math.max(12, Number(budget.estimatedColumns ?? budget.fieldGridEstimate?.columns ?? 480));
  const sourceRows = Math.max(12, Number(budget.estimatedRows ?? budget.fieldGridEstimate?.rows ?? 300));
  const target = fitPreviewMeshGrid(sourceColumns, sourceRows, input.meshDetail ?? 'medium');
  const positions = [];
  const colors = [];
  const uvs = [];
  const depths = [];
  const verticalExaggeration = Number(input.verticalExaggeration ?? 1.8);
  const depthScale = 0.018 * verticalExaggeration;
  let maxDepth = 1;
  const depthGrid = [];
  for (let row = 0; row < target.rows; row += 1) {
    for (let col = 0; col < target.columns; col += 1) {
      const nx = col / Math.max(1, target.columns - 1);
      const ny = row / Math.max(1, target.rows - 1);
      const depth = overviewDepthAt(nx, ny, selected);
      depthGrid.push(depth);
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  for (let row = 0; row < target.rows; row += 1) {
    for (let col = 0; col < target.columns; col += 1) {
      const depth = depthGrid[row * target.columns + col];
      depths.push(depth);
      positions.push(
        col - (target.columns - 1) / 2,
        -depth * depthScale,
        row - (target.rows - 1) / 2
      );
      colors.push(...depthColorRgb(depth, maxDepth));
      uvs.push(col / Math.max(1, target.columns - 1), row / Math.max(1, target.rows - 1));
    }
  }
  const indices = gridIndices(target.columns, target.rows);
  return {
    version: 'regional-bathymetry-preview-overview-mesh-v1',
    sourceType: 'globalOverviewLod',
    width: target.columns,
    height: target.rows,
    bounds: input.selectedBounds ?? input.overviewMetadata?.bounds ?? null,
    positions,
    colors,
    uvs,
    indices,
    depths,
    vertexCount: target.columns * target.rows,
    triangleCount: indices.length / 3,
    sourceDigest: input.sourceDigest ?? input.overviewMetadata?.digest ?? `overview:${target.columns}x${target.rows}`,
    meshDigest: `overview-lod:${target.columns}x${target.rows}:${input.meshDetail ?? 'medium'}`,
    coordinateProfileId: 'regional-overview-lonlat-depth-preview',
    verticalExaggeration,
    previewDecimated: true
  };
}

function fitPreviewMeshGrid(sourceColumns, sourceRows, detail = 'medium') {
  const detailScale = detail === 'high' ? 1 : detail === 'coarse' ? 0.42 : 0.68;
  const requestedColumns = Math.max(18, Math.round(Number(sourceColumns) * detailScale));
  const requestedRows = Math.max(14, Math.round(Number(sourceRows) * detailScale));
  const capScale = Math.min(
    1,
    PREVIEW_MESH_CAP.columns / requestedColumns,
    PREVIEW_MESH_CAP.rows / requestedRows,
    Math.sqrt(PREVIEW_MESH_CAP.vertices / Math.max(1, requestedColumns * requestedRows))
  );
  return {
    columns: Math.max(2, Math.min(PREVIEW_MESH_CAP.columns, Math.round(requestedColumns * capScale))),
    rows: Math.max(2, Math.min(PREVIEW_MESH_CAP.rows, Math.round(requestedRows * capScale)))
  };
}

function overviewDepthAt(nx, ny, selected = {}) {
  const lonSpan = Math.abs(Number(selected.eastLon ?? 1) - Number(selected.westLon ?? 0)) || 1;
  const latSpan = Math.abs(Number(selected.northLat ?? 1) - Number(selected.southLat ?? 0)) || 1;
  const aspectInfluence = clampNumber(lonSpan / Math.max(0.1, latSpan), 0.7, 3.5);
  const shelfToBasin = smoothstep(0.08, 0.92, nx);
  const crossShelf = smoothstep(0.16, 0.78, ny);
  const canyon = Math.exp(-(((nx - 0.38) ** 2) / 0.012 + ((ny - 0.58) ** 2) / 0.09));
  const seamount = Math.exp(-(((nx - 0.72) ** 2) / 0.018 + ((ny - 0.34) ** 2) / 0.025));
  const undulation = 22 * Math.sin((nx * 4.8 + aspectInfluence) * Math.PI) * Math.cos((ny * 3.2 + 0.2) * Math.PI);
  return Math.max(8, 22 + 120 * shelfToBasin + 520 * shelfToBasin * crossShelf + 180 * canyon - 95 * seamount + undulation);
}

function gridIndices(columns, rows) {
  const indices = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < columns - 1; col += 1) {
      const a = row * columns + col;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

function boundsToGridPath(selected = null, tile = null, columns = 1, rows = 1, depthMeters = 0) {
  if (!selected || !tile) return [];
  const west = Number(tile.westLon);
  const east = Number(tile.eastLon);
  const south = Number(tile.southLat);
  const north = Number(tile.northLat);
  const lonSpan = Math.max(0.000001, east - west);
  const latSpan = Math.max(0.000001, north - south);
  const x0 = clampNumber(((Number(selected.westLon) - west) / lonSpan) * (columns - 1), 0, columns - 1);
  const x1 = clampNumber(((Number(selected.eastLon) - west) / lonSpan) * (columns - 1), 0, columns - 1);
  const y0 = clampNumber(((north - Number(selected.northLat)) / latSpan) * (rows - 1), 0, rows - 1);
  const y1 = clampNumber(((north - Number(selected.southLat)) / latSpan) * (rows - 1), 0, rows - 1);
  return [
    { x: x0, y: y0, depthMeters },
    { x: x1, y: y0, depthMeters },
    { x: x1, y: y1, depthMeters },
    { x: x0, y: y1, depthMeters },
    { x: x0, y: y0, depthMeters }
  ];
}

function previewContourGeometry(geometry = {}) {
  const columns = Math.max(2, Number(geometry.width ?? 2));
  const rows = Math.max(2, Number(geometry.height ?? 2));
  const depths = geometry.depths ?? [];
  const maxDepth = depths.reduce((max, depth) => Math.max(max, Number(depth) || 0), 1);
  const levelsMeters = [0.25, 0.45, 0.65, 0.85].map((level) => Math.round(maxDepth * level));
  const segments = [];
  for (let row = 1; row < rows - 1; row += Math.max(4, Math.floor(rows / 8))) {
    const depth = depths[row * columns + Math.floor(columns / 2)] ?? maxDepth * 0.5;
    segments.push({
      start: { x: 0, y: row },
      end: { x: columns - 1, y: row },
      levelMeters: depth
    });
  }
  for (let col = Math.max(3, Math.floor(columns / 5)); col < columns - 1; col += Math.max(8, Math.floor(columns / 5))) {
    const depth = depths[Math.floor(rows / 2) * columns + col] ?? maxDepth * 0.5;
    segments.push({
      start: { x: col, y: 0 },
      end: { x: col, y: rows - 1 },
      levelMeters: depth
    });
  }
  return { sourceDigest: `${geometry.meshDigest ?? geometry.sourceDigest ?? 'regional'}:contours`, levelsMeters, segments };
}

function depthColorRgb(depth, maxDepth = 1) {
  const t = clampNumber(Number(depth) / Math.max(1, Number(maxDepth)), 0, 1);
  if (t < 0.16) return [0.44, 0.54, 0.35];
  if (t < 0.36) return [0.28, 0.73, 0.70];
  if (t < 0.68) return [0.12, 0.42, 0.64];
  return [0.04, 0.10, 0.34];
}

function smoothstep(edge0, edge1, value) {
  const t = clampNumber((Number(value) - edge0) / Math.max(0.000001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function coarsePreviewSvg(selectedBounds = null, overviewBounds = null) {
  const width = 920;
  const height = 430;
  const pad = 44;
  const boundsRect = selectedBounds && overviewBounds
    ? selectedBoundsRect(selectedBounds, overviewBounds, pad, width - pad * 2, height - pad * 2)
    : null;
  const waveLines = Array.from({ length: 8 }, (_entry, index) => {
    const y = pad + 30 + index * 38;
    return `<path d="M${pad} ${roundForSvg(y)} C ${pad + 120} ${roundForSvg(y - 28)}, ${pad + 220} ${roundForSvg(y + 28)}, ${pad + 340} ${roundForSvg(y)} S ${pad + 610} ${roundForSvg(y - 20)}, ${width - pad} ${roundForSvg(y)}" />`;
  }).join('');
  return `
    <svg class="regional-bathymetry-mesh-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Coarse regional overview preview">
      <defs>
        <linearGradient id="regionalCoarseBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#071d2a" />
          <stop offset="50%" stop-color="#124d72" />
          <stop offset="100%" stop-color="#061521" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#regionalCoarseBg)" rx="8" />
      <g class="regional-bathymetry-grid">
        ${Array.from({ length: 7 }, (_entry, index) => {
          const x = pad + (index / 6) * (width - pad * 2);
          return `<line x1="${roundForSvg(x)}" y1="${pad}" x2="${roundForSvg(x)}" y2="${height - pad}" />`;
        }).join('')}
        ${Array.from({ length: 5 }, (_entry, index) => {
          const y = pad + (index / 4) * (height - pad * 2);
          return `<line x1="${pad}" y1="${roundForSvg(y)}" x2="${width - pad}" y2="${roundForSvg(y)}" />`;
        }).join('')}
      </g>
      <g class="regional-bathymetry-ridges coarse-preview-ridges">${waveLines}</g>
      ${boundsRect ? `<rect class="regional-bathymetry-selected-window" x="${roundForSvg(boundsRect.x)}" y="${roundForSvg(boundsRect.y)}" width="${roundForSvg(boundsRect.width)}" height="${roundForSvg(boundsRect.height)}" />` : ''}
      <text x="${pad}" y="${height - 18}">coarse overview inspection only</text>
      <text x="${width - pad}" y="${height - 18}" text-anchor="end">staged tiles required for Planning</text>
    </svg>
  `;
}

function meshPreviewSvg(mesh = {}, selectedBounds = null, tileBounds = null) {
  const rows = Math.max(1, Number(mesh.meshRows ?? 1));
  const cols = Math.max(1, Number(mesh.meshColumns ?? 1));
  const vertices = Array.isArray(mesh.vertices) ? mesh.vertices : [];
  if (!vertices.length || rows * cols > vertices.length + cols) return placeholderMeshSvg(mesh);
  const width = 920;
  const height = 430;
  const pad = 44;
  const usableWidth = width - pad * 2;
  const usableHeight = height - pad * 2;
  const verticalExaggeration = 0.16;
  const rowStep = Math.max(1, Math.floor(rows / 12));
  const colStep = Math.max(1, Math.floor(cols / 56));
  const rowLines = [];
  let maxDepth = 1;
  for (const vertex of vertices) maxDepth = Math.max(maxDepth, depthFromVertex(vertex));
  for (let y = 0; y < rows; y += rowStep) {
    const points = [];
    for (let x = 0; x < cols; x += colStep) {
      const vertex = vertices[y * cols + x];
      const depth = depthFromVertex(vertex);
      const px = pad + (x / Math.max(1, cols - 1)) * usableWidth;
      const py = pad + (y / Math.max(1, rows - 1)) * usableHeight - (depth / maxDepth) * usableHeight * verticalExaggeration;
      points.push(`${roundForSvg(px)},${roundForSvg(py)}`);
    }
    rowLines.push(`<polyline points="${points.join(' ')}" stroke="${escapeAttr(depthColor(depthFromVertex(vertices[y * cols] ?? []), maxDepth))}" />`);
  }
  const boundsRect = selectedBounds && tileBounds ? selectedBoundsRect(selectedBounds, tileBounds, pad, usableWidth, usableHeight) : null;
  return `
    <svg class="regional-bathymetry-mesh-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Decimated regional bathymetry mesh preview">
      <defs>
        <linearGradient id="regionalBathymetryBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#071d2a" />
          <stop offset="52%" stop-color="#0e3f67" />
          <stop offset="100%" stop-color="#051126" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#regionalBathymetryBg)" rx="8" />
      <g class="regional-bathymetry-grid">
        ${Array.from({ length: 7 }, (_entry, index) => {
          const x = pad + (index / 6) * usableWidth;
          return `<line x1="${roundForSvg(x)}" y1="${pad}" x2="${roundForSvg(x)}" y2="${height - pad}" />`;
        }).join('')}
        ${Array.from({ length: 5 }, (_entry, index) => {
          const y = pad + (index / 4) * usableHeight;
          return `<line x1="${pad}" y1="${roundForSvg(y)}" x2="${width - pad}" y2="${roundForSvg(y)}" />`;
        }).join('')}
      </g>
      <g class="regional-bathymetry-ridges">${rowLines.join('')}</g>
      ${boundsRect ? `<rect class="regional-bathymetry-selected-window" x="${roundForSvg(boundsRect.x)}" y="${roundForSvg(boundsRect.y)}" width="${roundForSvg(boundsRect.width)}" height="${roundForSvg(boundsRect.height)}" />` : ''}
      <text x="${pad}" y="${height - 18}">non-authoritative mesh preview</text>
      <text x="${width - pad}" y="${height - 18}" text-anchor="end">raster/grid authority preserved</text>
    </svg>
  `;
}

function placeholderMeshSvg(mesh = {}) {
  return `
    <svg class="regional-bathymetry-mesh-svg" viewBox="0 0 920 430" role="img" aria-label="Regional bathymetry mesh metadata preview">
      <rect x="0" y="0" width="920" height="430" fill="#061521" rx="8" />
      <path d="M60 310 C 180 260, 260 360, 380 225 S 620 120, 860 190" fill="none" stroke="#55d6be" stroke-width="4" />
      <path d="M60 342 C 210 290, 310 386, 470 250 S 690 178, 860 225" fill="none" stroke="#5bacd3" stroke-width="3" />
      <text x="60" y="64">Mesh metadata loaded: ${escapeHtml(formatInteger(mesh.vertexCount))} vertices / ${escapeHtml(formatInteger(mesh.triangleCount))} triangles</text>
      <text x="60" y="96">Full SVG vertex preview appears after the mesh LOD JSON finishes loading.</text>
    </svg>
  `;
}

function selectedBoundsRect(selected = {}, tile = {}, pad, usableWidth, usableHeight) {
  const west = Number(tile.westLon);
  const east = Number(tile.eastLon);
  const south = Number(tile.southLat);
  const north = Number(tile.northLat);
  const lonSpan = Math.max(0.000001, east - west);
  const latSpan = Math.max(0.000001, north - south);
  const x = pad + ((Number(selected.westLon) - west) / lonSpan) * usableWidth;
  const w = ((Number(selected.eastLon) - Number(selected.westLon)) / lonSpan) * usableWidth;
  const y = pad + ((north - Number(selected.northLat)) / latSpan) * usableHeight;
  const h = ((Number(selected.northLat) - Number(selected.southLat)) / latSpan) * usableHeight;
  return {
    x: clampNumber(x, pad, pad + usableWidth),
    y: clampNumber(y, pad, pad + usableHeight),
    width: clampNumber(w, 2, usableWidth),
    height: clampNumber(h, 2, usableHeight)
  };
}

function preferredMeshLodDescriptor(meshLods = [], preferred = 'medium') {
  const lods = Array.isArray(meshLods) ? meshLods : [];
  return lods.find((entry) => entry.lod === preferred)
    ?? lods.find((entry) => entry.lod === 'medium')
    ?? lods.find((entry) => entry.lod === 'coarse')
    ?? lods[0]
    ?? null;
}

function layerToggle(key, label, enabled) {
  return `<label><input type="checkbox" data-regional-layer-toggle="${escapeAttr(key)}" ${enabled ? 'checked' : ''} /> ${escapeHtml(label)}</label>`;
}

function compactClaimBoundary(boundary = {}) {
  return {
    rasterGridAuthoritativeForBathymetrySampling: boundary.rasterGridAuthoritativeForBathymetrySampling === true,
    derivedMeshLodsVisualizationOnly: boundary.derivedMeshLodsVisualizationOnly === true,
    browserDownloadsPublicSourceData: boundary.browserDownloadsPublicSourceData === true ? true : false,
    certifiedForNavigation: boundary.certifiedForNavigation === true,
    operationalOceanForecast: boundary.operationalOceanForecast === true,
    hiddenTruthExposed: false
  };
}

function statusTag(value) {
  const normalized = String(value ?? 'planned').toLowerCase();
  const className = normalized.includes('current') || normalized.includes('loaded') || normalized.includes('available')
    ? 'current'
    : normalized.includes('fail') || normalized.includes('blocked')
      ? 'invalid'
      : normalized.includes('needs')
        ? 'needs_validation'
        : 'requires_regeneration';
  return `<span class="environment-studio-state environment-studio-state-${escapeAttr(className)}">${escapeHtml(String(value ?? 'planned').toUpperCase())}</span>`;
}

function depthFromVertex(vertex = []) {
  const directDepth = Number(vertex[3]);
  if (Number.isFinite(directDepth)) return Math.max(0, directDepth);
  const elevation = Number(vertex[2]);
  return Number.isFinite(elevation) ? Math.max(0, -elevation) : 0;
}

function depthColor(depth, maxDepth = 1) {
  const t = Math.max(0, Math.min(1, Number(depth) / Math.max(1, Number(maxDepth))));
  if (t < 0.18) return '#55d6be';
  if (t < 0.42) return '#5bacd3';
  if (t < 0.68) return '#3475b9';
  return '#8d7cff';
}

function boundsLabel(bounds = null) {
  if (!bounds) return 'n/a';
  return `${formatNumber(bounds.westLon)}..${formatNumber(bounds.eastLon)} lon, ${formatNumber(bounds.southLat)}..${formatNumber(bounds.northLat)} lat`;
}

function sameBounds(a = {}, b = {}) {
  return Math.abs(Number(a.westLon) - Number(b.westLon)) < 0.0001
    && Math.abs(Number(a.eastLon) - Number(b.eastLon)) < 0.0001
    && Math.abs(Number(a.southLat) - Number(b.southLat)) < 0.0001
    && Math.abs(Number(a.northLat) - Number(b.northLat)) < 0.0001;
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'n/a')}</strong></div>`;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 1000) / 1000) : 'n/a';
}

function formatInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : 'n/a';
}

function roundForSvg(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10) : '0';
}

function shortDigest(value) {
  const text = String(value ?? '');
  return text ? text.replace(/^fnv1a32:/, '') : 'none';
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function cloneJson(value) {
  if (value == null) return value;
  try {
    return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
