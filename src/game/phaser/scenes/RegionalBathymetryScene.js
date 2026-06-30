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

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const REGIONAL_BATHYMETRY_SCENE_VERSION = 'regional-bathymetry-scene-r1';

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
  }

  init(data = {}) {
    this.startData = cloneJson(data) ?? {};
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
    this.clearObjects();
    this.destroyPreviewHost();
    this.clearRightPanel();
    this.publishDebug(false);
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawBackdrop();
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
    return this.markHostedTileLoaded(session);
  }

  markHostedTileLoaded(sessionInput = {}) {
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
    this.session = this.markHostedTileLoaded(this.session);
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
    this.previewHost.innerHTML = regionalBathymetryPreviewHtml(this);
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
    this.previewHost?.remove?.();
    this.previewHost = null;
  }

  clearRightPanel() {
    const root = this.app?.elements?.waypointTimelineRoot;
    if (root) root.innerHTML = '';
  }

  readSeed() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#regional-bathymetry-seed')?.value ?? this.session.seed ?? 'env-staging-scene-r1');
  }

  updatePreviewCamera(patch = {}) {
    this.session = setEnvironmentStudioPreviewCameraState(this.session, patch);
    this.statusMessage = 'Updated regional bathymetry preview camera metadata.';
    this.render();
  }

  confirmBathymetry() {
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

  exportBathymetryArtifact() {
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
    globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG = {
      version: REGIONAL_BATHYMETRY_SCENE_VERSION,
      stage: 'regionalBathymetryWorkspace',
      routeActive: Boolean(active),
      openedFromAtlasBoundary: this.startData.source === 'environmentStudioAtlas',
      selectedBounds: cloneJson(this.startData.selectedBounds ?? this.session.selectedReferenceWindow?.bounds ?? null),
      loadedTileSetId: this.startData.tileSetId ?? tile.tileSetId ?? this.session.loadedReferenceFixtureId ?? null,
      loadedTileSetRole: this.startData.tileSetRole ?? tile.role ?? null,
      loadedRasterDigest: rasterDigest,
      loadedMeshLodDigest: meshDigest,
      rasterAuthoritativeForSimulation: true,
      meshAuthoritativeForSimulation: false,
      meshLodLoaded: Boolean(this.meshArtifact ?? this.startData.meshLodMetadata),
      renderedMeshVertexCount: Number(mesh.vertexCount ?? this.meshLodRecord?.vertexCount ?? 0),
      renderedMeshTriangleCount: Number(mesh.triangleCount ?? this.meshLodRecord?.triangleCount ?? 0),
      noaaRuntimeFetchRequired: false,
      gebcoRuntimeFetchRequired: false,
      rawExternalDataPathExposed: false,
      localAbsolutePathExposed: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false,
      plannerChanged: false,
      fieldEquationsChanged: false,
      activeRendererCount: 0,
      activeRafCount: 0,
      activeCanvasCount: 0,
      planningLaunchReady: this.session.launchValidationResult?.planningLaunchReady === true,
      bathymetryArtifactDigest: this.session.bathymetryArtifactDigest ?? null,
      fieldGenerationStatus: this.session.fieldRegenerationResult?.fieldGenerationStatus ?? null,
      currentArtifactDigest: this.session.fieldRegenerationResult?.currentArtifactDigest ?? null,
      scalarArtifactDigest: this.session.fieldRegenerationResult?.scalarArtifactDigest ?? null,
      environmentCompositionStatus: this.session.environmentCompositionResult?.environmentArtifactStatus ?? null,
      referenceTileLibrary: this.referenceTileLibrary ? referenceTileLibraryDebugState(this.referenceTileLibrary) : null,
      statusMessage: this.statusMessage,
      lastError: this.lastError
    };
  }
}

function regionalBathymetryConsoleHtml(scene) {
  const session = scene.session;
  const bathymetryReady = Boolean(session.bathymetryArtifactDigest);
  const fieldsReady = Boolean(session.fieldRegenerationResult?.currentArtifactDigest && session.fieldRegenerationResult?.scalarArtifactDigest);
  const canCompose = fieldsReady;
  const canValidate = fieldsReady;
  const canLaunch = session.launchValidationResult?.planningLaunchReady === true;
  const canExportBenchmark = canCompose;
  const camera = session.previewCameraState ?? {};
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Regional 3D Bathymetry Workspace</h1>
      <p>Loaded from hosted reference bathymetry tile. 3D mesh is a decimated visualization; raster/grid remains authoritative.</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>Regional Bathymetry Workspace</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="view-controls">
      <h2>Region View Controls</h2>
      <div class="environment-studio-camera-row" aria-label="Regional view controls">
        <button type="button" disabled title="Full 3D camera controls are planned after staging-scene split.">Rotate</button>
        <button type="button" disabled title="Full 3D camera controls are planned after staging-scene split.">Pan</button>
        <button type="button" disabled title="Full 3D camera controls are planned after staging-scene split.">Zoom</button>
        <button type="button" data-action="regional-reset-camera">Reset Camera</button>
        <button type="button" disabled>Top-down View</button>
        <button type="button" disabled>Oblique View</button>
      </div>
      <label class="compact-field">
        Project seed
        <input id="regional-bathymetry-seed" type="text" value="${escapeAttr(session.seed ?? 'env-staging-scene-r1')}" />
      </label>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="mesh-detail">
      <h2>Mesh Detail</h2>
      <div class="environment-studio-camera-row" aria-label="Mesh LOD">
        ${(scene.tileSetRecord?.meshLods ?? scene.startData.tileSetMetadata?.meshLods ?? []).map((lod) => `<button type="button" class="${lod.lod === (scene.meshArtifact?.lod ?? scene.startData.preferredMeshLod) ? 'active' : ''}" disabled>${escapeHtml(labelize(lod.lod))}</button>`).join('') || '<button type="button" disabled>No mesh LOD loaded</button>'}
      </div>
      <label class="compact-field">
        Vertical exaggeration
        <input id="regional-vertical-exaggeration" type="number" min="0.5" max="4" step="0.1" value="${escapeAttr(camera.verticalExaggeration ?? 1.6)}" />
      </label>
      <p class="hud-muted">Mesh LODs are visualization artifacts only. They are not simulation authority.</p>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="display-layers">
      <h2>Display Layers</h2>
      <div class="environment-studio-checkbox-grid regional-bathymetry-layer-list">
        ${layerToggle('Bathymetry Mesh', true)}
        ${layerToggle('Coastline', true)}
        ${layerToggle('Wet/Land Mask', true)}
        ${layerToggle('Tile Boundaries', true)}
        ${layerToggle('Selected Operational Window', true)}
        ${layerToggle('Slope / Hazard Overlay planned', false)}
        ${layerToggle('Current Field planned', false)}
        ${layerToggle('Scalar Field planned', false)}
      </div>
    </section>
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-regional-panel-section="environment-build">
      <h2>Environment Build</h2>
      <button class="console-button primary" type="button" data-action="regional-confirm-bathymetry">Generate 3D Bathymetry / Confirm Bathymetry</button>
      <button class="console-button primary" type="button" data-action="regional-generate-fields" ${bathymetryReady ? '' : 'disabled'}>Generate Currents &amp; Science Fields</button>
      <button class="console-button secondary" type="button" data-action="regional-compose-environment" ${canCompose ? '' : 'disabled'}>Compose Environment Artifact</button>
      <button class="console-button secondary" type="button" data-action="regional-validate-launch" ${canValidate ? '' : 'disabled'}>Validate Launch</button>
      <button class="console-button primary" type="button" data-action="regional-launch-planning" ${canLaunch ? '' : 'disabled'}>Launch to Planning</button>
      <button class="console-button secondary" type="button" data-action="regional-export-benchmark" ${canExportBenchmark ? '' : 'disabled'}>Export Public Benchmark Bundle</button>
      <button class="console-button secondary" type="button" data-action="regional-export-bathymetry">Export Bathymetry Artifact</button>
      <button class="console-button secondary" type="button" data-action="regional-export-project">Export Project</button>
      <label class="console-button secondary" for="regional-import-project-file">Import Project</label>
      <input id="regional-import-project-file" type="file" accept="application/json,.json" hidden data-regional-import-project />
      <button class="console-button secondary" type="button" data-action="regional-back-atlas">Back to Atlas</button>
    </section>
  `;
}

function bindRegionalBathymetryControls(scene, root) {
  root?.querySelector?.('[data-action="regional-reset-camera"]')?.addEventListener('click', () => scene.updatePreviewCamera({ verticalExaggeration: 1.6 }));
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
  root?.querySelector?.('[data-action="regional-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-regional-import-project]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="regional-back-atlas"]')?.addEventListener('click', () => scene.returnToAtlas());
}

function regionalBathymetryRightPanelHtml(scene) {
  const tile = scene.tileSetRecord ?? scene.startData.tileSetMetadata ?? {};
  const metadata = tile.metadata ?? tile;
  const raster = tile.rasterTiles ?? metadata.rasterTiles ?? {};
  const mesh = scene.meshArtifact ?? scene.startData.meshLodMetadata ?? {};
  const meshDescriptor = scene.meshLodRecord ?? scene.startData.meshLodMetadata ?? {};
  const selectedBounds = scene.startData.selectedBounds ?? scene.session.selectedReferenceWindow?.bounds ?? null;
  const claimBoundary = metadata.claimBoundary ?? tile.claimBoundary ?? {};
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
        ${metricHtml('Tile set ID', metadata.tileSetId ?? tile.tileSetId ?? scene.startData.tileSetId)}
        ${metricHtml('Source dataset', metadata.sourceDataset ?? tile.sourceDataset ?? 'ETOPO_2022')}
        ${metricHtml('Provider', metadata.provider ?? tile.provider ?? 'NOAA NCEI')}
        ${metricHtml('Source variant', metadata.sourceVariant ?? tile.sourceVariant)}
        ${metricHtml('Source resolution', metadata.sourceResolution ?? tile.sourceResolution)}
        ${metricHtml('Actual raster resolution', `${metadata.actualRasterResolutionArcSeconds ?? tile.actualRasterResolutionArcSeconds ?? 'n/a'} arc-sec`)}
        ${metricHtml('Bounds', boundsLabel(metadata.bounds ?? tile.bounds))}
        ${metricHtml('Selected operational bounds', boundsLabel(selectedBounds))}
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
  const tile = scene.tileSetRecord ?? scene.startData.tileSetMetadata ?? {};
  const metadata = tile.metadata ?? tile;
  const mesh = scene.meshArtifact ?? scene.startData.meshLodMetadata ?? {};
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
        <section class="regional-bathymetry-mesh-shell" data-regional-bathymetry-mesh-preview>
          <div class="regional-bathymetry-mesh-header">
            <div>
              <h2>Bathymetry Mesh Preview</h2>
              <p class="hud-muted">Visualization sampled from ${escapeHtml(mesh.lod ?? scene.startData.preferredMeshLod ?? 'medium')} mesh LOD. The source raster remains authoritative.</p>
            </div>
            <div class="cell-inspector-metrics regional-bathymetry-inline-metrics">
              ${metricHtml('Vertices', formatInteger(mesh.vertexCount ?? scene.meshLodRecord?.vertexCount))}
              ${metricHtml('Triangles', formatInteger(mesh.triangleCount ?? scene.meshLodRecord?.triangleCount))}
              ${metricHtml('Mesh rows', formatInteger(mesh.meshRows ?? scene.meshLodRecord?.meshRows))}
              ${metricHtml('Mesh cols', formatInteger(mesh.meshColumns ?? scene.meshLodRecord?.meshColumns))}
            </div>
          </div>
          ${mesh.vertices ? meshPreviewSvg(mesh, selectedBounds, tileBounds) : placeholderMeshSvg(scene.startData.meshLodMetadata ?? scene.meshLodRecord ?? {})}
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

function layerToggle(label, enabled) {
  return `<label><input type="checkbox" ${enabled ? 'checked' : ''} ${enabled ? '' : 'disabled'} /> ${escapeHtml(label)}</label>`;
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
