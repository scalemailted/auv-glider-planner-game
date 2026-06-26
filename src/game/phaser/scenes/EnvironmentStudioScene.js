import { markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import {
  ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES,
  ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES,
  ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS,
  ENVIRONMENT_STUDIO_CAMERA_PRESETS,
  ENVIRONMENT_STUDIO_DOMAIN_PROFILES,
  ENVIRONMENT_STUDIO_MISSION_SCALES,
  ENVIRONMENT_STUDIO_PANEL_SECTIONS,
  ENVIRONMENT_STUDIO_PREVIEW_DETAILS,
  ENVIRONMENT_STUDIO_PREVIEW_MODES,
  ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES,
  buildEnvironmentStudioProject,
  createEnvironmentStudioMosaic,
  createEnvironmentStudioSession,
  domainProfileById,
  environmentStudioDebugPayload,
  environmentStudioInspectorViewModel,
  environmentStudioSessionSummary,
  generateEnvironmentStudioRegionFromAtlasWindow,
  generateEnvironmentStudioTile,
  importEnvironmentStudioProject,
  patchEnvironmentStudioDomain,
  patchEnvironmentStudioOperationalWindow,
  randomizeEnvironmentStudioAtlasSeed,
  regenerateEnvironmentStudioFields,
  refreshEnvironmentStudioSession,
  selectEnvironmentStudioObject,
  selectEnvironmentStudioOperationalWindow,
  setEnvironmentStudioArchetype,
  setEnvironmentStudioAtlasPreset,
  setEnvironmentStudioPreviewCameraState,
  setEnvironmentStudioPreviewMode,
  updateEnvironmentStudioRegionalRecipe,
  validateEnvironmentStudioProject
} from '../../../core/editor/EnvironmentStudioProject.js';
import {
  OPERATIONAL_WINDOW_PRESETS,
  SYNTHETIC_OCEAN_ATLAS_PRESETS,
  sampleAtlasLayer
} from '../../../core/editor/SyntheticOceanAtlas.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const ENVIRONMENT_STUDIO_SCENE_VERSION = 'environment-studio-scene-r1-1';

export class EnvironmentStudioScene extends PhaserScene {
  constructor() {
    super('EnvironmentStudioScene');
    this.objects = [];
    this.session = createEnvironmentStudioSession();
    this.statusMessage = 'Choose regional inputs and generate public synthetic bathymetry.';
    this.lastError = null;
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.events?.once?.('shutdown', () => this.shutdown());
    this.events?.once?.('destroy', () => this.shutdown());
    this.app.state.mode = 'environmentStudio';
    this.app.clearPanels();
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.setSceneLabel('Environment Studio');
    this.drawBackdrop();
    this.mountPreviewHost();
    this.session = refreshEnvironmentStudioSession(this.session);
    this.render();
    markAnchorRouteReady('environment-studio', { resolvedRuntimeShell: 'default', inputHandlersBound: true });
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

  render() {
    this.session = refreshEnvironmentStudioSession(this.session);
    this.renderConsole();
    this.renderRightPanel();
    this.renderPreview();
    this.publishDebug(true);
  }

  renderConsole() {
    if (this.session.studioStage === 'atlasWindow') {
      this.renderAtlasConsole();
      return;
    }
    this.renderSimplifiedConsole();
  }

  renderAtlasConsole() {
    const window = this.session.selectedOperationalWindow;
    this.app.setPanel(atlasConsoleHtml(this, window));
    bindEnvironmentStudioAtlasControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderSimplifiedConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    const panelSections = new Map(ENVIRONMENT_STUDIO_PANEL_SECTIONS.map((section) => [section.id, section]));
    const advancedOpen = this.session.simplifiedPanelState?.advancedExpanded === true ? 'open' : '';
    const diagnosticsOpen = this.session.simplifiedPanelState?.diagnosticsExpanded === true ? 'open' : '';
    this.app.setPanel(simplifiedConsoleHtml(this, summary, panelSections, advancedOpen, diagnosticsOpen));
    bindEnvironmentStudioConsoleControls(this, this.app.elements?.consoleRoot ?? globalThis.document);
  }

  renderLegacyConsole() {
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Simulation Lab / Environment Studio</div>
        <h1>Environment Studio</h1>
        <p>Author scientifically constrained synthetic bathymetry as a 2.5D bottom surface rendered as regional 3D terrain.</p>
      </section>
      <section class="console-status">
        <span>Status</span>
        <strong>${escapeHtml(summary.validationStatus)}</strong>
        <small>${escapeHtml(this.statusMessage)}</small>
      </section>
      ${this.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(this.lastError)}</div></section>` : ''}
      <section class="console-section" data-keep-title="true" data-accordion-key="environment-scale">
        <h2>Environment Scale</h2>
        <p class="hud-muted">Choose the intended mission scale before choosing grid resolution. Larger multi-glider missions need enough spatial extent and feature diversity to avoid redundant routes.</p>
        <label class="compact-field">
          Environment Type
          <select id="env-studio-profile" data-env-studio-profile>
            ${ENVIRONMENT_STUDIO_DOMAIN_PROFILES.map((profile) => `<option value="${escapeAttr(profile.id)}" ${profile.id === this.session.environmentType ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('')}
          </select>
        </label>
        ${selectInput('Mission Scale', 'env-studio-mission-scale', this.session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
        ${numberInput('Intended Gliders', 'env-studio-intended-gliders', this.session.intendedGliders, 1, 6, 1)}
        <label class="compact-field">
          Estimated Mission Duration
          <input id="env-studio-duration-label" type="text" value="${escapeAttr(this.session.estimatedMissionDuration)}" />
        </label>
        ${selectInput('Bathymetry Source', 'env-studio-bathymetry-source', this.session.bathymetrySource, ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES)}
        <div class="hud-muted">Real patch import and statistical reference comparison are planned future validation workflows. Current authoring uses deterministic synthetic bathymetry only.</div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="domain-resolution">
        <h2>Domain &amp; Resolution</h2>
        <div class="hud-muted">Legacy label: Domain / Resolution. Source Grid is exported; Preview Mesh is decimated for interactive display.</div>
        ${numberInput('Width km', 'env-studio-width', this.session.domainSpec.horizontal.widthMeters / 1000, 1, 300, 1)}
        ${numberInput('Height km', 'env-studio-height', this.session.domainSpec.horizontal.heightMeters / 1000, 1, 200, 1)}
        ${numberInput('Horizontal source-cell size m', 'env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters, 100, 5000, 100)}
        ${numberInput('Max depth m', 'env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters, 20, 1000, 10)}
        ${numberInput('Duration s', 'env-studio-duration', this.session.domainSpec.time.durationSeconds, 300, 86400, 300)}
        ${numberInput('dt s', 'env-studio-dt', this.session.domainSpec.time.dtSeconds, 30, 3600, 30)}
        ${selectInput('Preview detail', 'env-studio-preview-detail', this.session.previewDetail, ENVIRONMENT_STUDIO_PREVIEW_DETAILS)}
        <div class="cell-inspector-metrics">
          ${metricHtml('Rows', summary.sourceGridShape.rows)}
          ${metricHtml('Columns', summary.sourceGridShape.columns)}
          ${metricHtml('Source cell count', summary.sourceGridShape.cellCount)}
          ${metricHtml('Preview mesh', `${summary.previewGridShape.columns} x ${summary.previewGridShape.rows}`)}
          ${metricHtml('Preview decimation', `${summary.previewDecimation.factor}x`)}
          ${metricHtml('Estimated cost', estimatedCostLabel(summary.sourceGridShape.cellCount, summary.previewGridShape.cellCount))}
          ${metricHtml('Domain Digest', shortDigest(summary.domainDigest))}
        </div>
        <div class="hud-muted">Preview is simplified for interactivity. Export preserves the source grid.</div>
        <button class="console-button primary" type="button" data-action="env-studio-apply-domain">Apply Domain</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="regional-layout-template">
        <h2>Regional Layout Template</h2>
        ${selectInput('Template', 'env-studio-regional-template', this.session.regionalTemplate, ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES)}
        ${selectInput('Coastline Orientation', 'env-studio-coastline-orientation', this.session.coastlineOrientation, ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS)}
        <div class="environment-studio-checkbox-grid" aria-label="Open Ocean Boundaries">
          ${['north', 'south', 'east', 'west'].map((side) => `
            <label><input type="checkbox" data-env-studio-open-boundary value="${escapeAttr(side)}" ${this.session.openOceanBoundaries.includes(side) ? 'checked' : ''} /> ${escapeHtml(labelize(side))}</label>
          `).join('')}
        </div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="regional-feature-mix">
        <h2>Regional Feature Mix</h2>
        ${levelSelect('Shelf fraction', 'env-studio-mix-shelfFraction', this.session.featureMix.shelfFraction)}
        ${levelSelect('Deep basin fraction', 'env-studio-mix-deepBasinFraction', this.session.featureMix.deepBasinFraction)}
        ${levelSelect('Canyon density', 'env-studio-mix-canyonDensity', this.session.featureMix.canyonDensity)}
        ${levelSelect('Island / seamount count', 'env-studio-mix-islandSeamountCount', this.session.featureMix.islandSeamountCount)}
        ${levelSelect('Coastline complexity', 'env-studio-mix-coastlineComplexity', this.session.featureMix.coastlineComplexity)}
        ${levelSelect('River mouth / delta influence', 'env-studio-mix-riverMouthDeltaInfluence', this.session.featureMix.riverMouthDeltaInfluence)}
        ${levelSelect('Ridge / sill strength', 'env-studio-mix-ridgeSillStrength', this.session.featureMix.ridgeSillStrength)}
        ${levelSelect('Shelf-break sharpness', 'env-studio-mix-shelfBreakSharpness', this.session.featureMix.shelfBreakSharpness)}
        ${levelSelect('Feature diversity', 'env-studio-mix-featureDiversity', this.session.featureMix.featureDiversity)}
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="bathymetry-generator">
        <h2>Randomization</h2>
        <div class="hud-muted">Bathymetry Generator: choose region type, choose feature mix, lock what you like, and reroll the rest.</div>
        <label class="compact-field">
          Compact Tile Archetype
          <select id="env-studio-archetype" data-env-studio-archetype>
            ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === this.session.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          World seed
          <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(this.session.seed)}" />
        </label>
        ${levelSelect('Variation level', 'env-studio-variation-level', this.session.randomization.variationLevel)}
        <div class="environment-studio-checkbox-grid">
          <label><input type="checkbox" id="env-studio-lock-coastline" ${this.session.randomization.locks.coastline ? 'checked' : ''} /> Lock coastline</label>
          <label><input type="checkbox" id="env-studio-lock-deep-basin" ${this.session.randomization.locks.deepBasin ? 'checked' : ''} /> Lock deep basin</label>
          <label><input type="checkbox" id="env-studio-lock-selected-features" ${this.session.randomization.locks.selectedFeatures ? 'checked' : ''} disabled /> Lock selected features (planned)</label>
          <label><input type="checkbox" id="env-studio-lock-tile-seams" ${this.session.randomization.locks.tileSeams ? 'checked' : ''} /> Lock tile seams</label>
        </div>
        <div class="environment-studio-tile-config-list">
          ${this.session.tileConfigs.map((config) => `
            <label class="compact-field">
              ${escapeHtml(config.label)} role
              <select data-env-studio-tile-archetype="${escapeAttr(config.id)}">
                ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === config.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
              </select>
            </label>
          `).join('')}
        </div>
        <div class="hud-muted">${escapeHtml(archetypeDescription(this.session.archetypeId))}</div>
        <button class="console-button primary" type="button" data-action="env-studio-create-mosaic">Regenerate all</button>
        <button class="console-button secondary" type="button" data-action="env-studio-generate-tile">Regenerate selected tile</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="validation">
        <h2>Validation &amp; Mission Suitability</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Bathymetry validity', this.session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Wet connectivity', formatNumber(this.session.regionalFeatureSummary?.navigableConnectedWaterFraction))}
          ${metricHtml('Slope warnings', this.session.regionalFeatureSummary?.canyonLikeGradientCount ?? 0)}
          ${metricHtml('Seam continuity', this.session.mosaic?.seamReport?.valid === true ? 'PASS' : this.session.mosaic?.seamReport ? 'FAIL' : 'NOT_GENERATED')}
          ${metricHtml('Land/water consistency', formatNumber(this.session.regionalFeatureSummary?.wetFraction))}
          ${metricHtml('Deep-water fraction', formatNumber(this.session.regionalFeatureSummary?.deepWaterFraction))}
          ${metricHtml('Shallow-shelf fraction', formatNumber(this.session.regionalFeatureSummary?.shallowShelfFraction))}
          ${metricHtml('Feature diversity', formatNumber(this.session.regionalFeatureSummary?.featureDiversityScore))}
          ${metricHtml('Multi-glider suitability', this.session.multiGliderSuitability?.status ?? 'WARN')}
          ${metricHtml('Performance budget', this.session.previewDecimation?.mode ?? 'preview')}
          ${metricHtml('Status', this.session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Warnings', this.session.validationReport?.warnings?.length ?? 0)}
          ${metricHtml('Failures', this.session.validationReport?.errors?.length ?? 0)}
          ${metricHtml('Report Digest', shortDigest(this.session.validationReport?.validationReportDigest))}
        </div>
        <div class="hud-muted">Synthetic, public-safe artifacts only. Not calibrated survey data, not an operational forecast, and not certified for navigation.</div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="generated-field-status">
        <h2>Generated Field Status</h2>
        ${dependencyGraphTable(this.session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(this.session.fieldRegenerationResult)}
        <button class="console-button primary" type="button" data-action="env-studio-generate-fields">Generate Currents &amp; Science Fields</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="import-export">
        <h2>Import / Export / Launch</h2>
        <button class="console-button primary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
        <button class="console-button secondary" type="button" data-action="env-studio-export-bathymetry">Export Bathymetry Artifact</button>
        <button class="console-button secondary" type="button" disabled title="Environment adapter validation is planned for ENV-STUDIO-R1.2.">Export Environment Artifact</button>
        <button class="console-button secondary" type="button" disabled title="Benchmark bundle export requires validated environment adapters.">Export Public Benchmark Bundle</button>
        <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
        <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
        <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning is planned after regional bathymetry preview and environment adapter validation stabilize.</button>
        <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
      </section>
    `);

    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-env-studio-profile]')?.addEventListener('change', (event) => this.applyProfile(event.target.value));
    root?.querySelector?.('[data-env-studio-archetype]')?.addEventListener('change', (event) => this.updateArchetype(event.target.value));
    root?.querySelector?.('[data-action="env-studio-apply-domain"]')?.addEventListener('click', () => this.applyDomainControls());
    root?.querySelector?.('[data-action="env-studio-generate-tile"]')?.addEventListener('click', () => this.generateTile());
    root?.querySelector?.('[data-action="env-studio-create-mosaic"]')?.addEventListener('click', () => this.createMosaic());
    root?.querySelector?.('[data-action="env-studio-generate-fields"]')?.addEventListener('click', () => this.generateFields());
    root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => this.exportProject());
    root?.querySelector?.('[data-action="env-studio-export-bathymetry"]')?.addEventListener('click', () => this.exportBathymetryArtifact());
    root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => this.importProject(event.target.files?.[0]));
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  renderRightPanel() {
    const root = this.app.elements?.waypointTimelineRoot;
    if (!root) return;
    if (this.session.studioStage === 'atlasWindow') {
      root.innerHTML = atlasRightPanelHtml(this.session);
      return;
    }
    const project = buildEnvironmentStudioProject(this.session);
    const inspector = environmentStudioInspectorViewModel(this.session);
    root.innerHTML = `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Contextual Inspector</div>
        <h2>${escapeHtml(inspector.type)}</h2>
        <p class="hud-muted">Selected object: ${escapeHtml(inspector.objectType)} / ${escapeHtml(inspector.objectId)}. Dependency state does not alter mission simulation.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Tiles', this.session.tiles.length)}
          ${metricHtml('Tile Mosaic', this.session.mosaic?.manifest ? '2 x 2' : 'none')}
          ${metricHtml('Project Digest', shortDigest(project.projectDigest))}
          ${metricHtml('Inspector Status', inspector.status)}
        </div>
        ${inspectorPropertiesHtml(inspector)}
        ${inspectorActionsHtml(inspector)}
        <div class="console-kicker environment-studio-panel-kicker">Feature Summary</div>
        ${featureSummaryHtml(this.session.regionalFeatureSummary)}
        ${featureRecordButtonsHtml(this.session.featureRecords, this.session.selectedObject)}
        <div class="console-kicker environment-studio-panel-kicker">Multi-Glider Suitability</div>
        ${suitabilityHtml(this.session.multiGliderSuitability)}
        <div class="console-kicker environment-studio-panel-kicker">Generated Field Status</div>
        ${dependencyGraphTable(this.session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(this.session.fieldRegenerationResult)}
        ${validationListHtml(this.session.validationReport)}
      </section>
    `;
    this.bindSelectionControls(root);
  }

  renderPreview() {
    if (!this.previewHost) return;
    const project = buildEnvironmentStudioProject(this.session);
    if (this.session.studioStage === 'atlasWindow') {
      this.previewHost.innerHTML = atlasPreviewHtml(this.session, project);
      bindEnvironmentStudioAtlasControls(this, this.previewHost);
      return;
    }
    this.previewHost.innerHTML = `
      <main id="environment-studio-route" class="environment-studio-route">
        <header class="environment-studio-route-header">
          <div>
            <p class="console-kicker">Unified Environment Studio</p>
            <h1>${escapeHtml(project.label)}</h1>
            <p>Regional 2.5D bathymetry authoring preview. The center view is diagnostic display; canonical source grids remain in the project export.</p>
          </div>
          <label class="environment-studio-preview-mode">
            Preview Mode
            <select id="env-studio-preview-mode" data-env-studio-preview-mode>
              ${ENVIRONMENT_STUDIO_PREVIEW_MODES.map((mode) => `<option value="${escapeAttr(mode.id)}" ${mode.id === this.session.previewMode ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}
            </select>
          </label>
          ${previewCameraControlsHtml(this.session)}
          <div class="environment-studio-digest">
            <span>Project Digest</span>
            <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
            <span>Bathymetry Artifact</span>
            <strong>${escapeHtml(shortDigest(this.session.bathymetryArtifactDigest ?? this.session.bathymetryBuilderResult?.bathymetryArtifactDigest))}</strong>
          </div>
        </header>
        <section class="environment-studio-preview-grid" aria-label="Regional bathymetry preview">
          ${previewModeHtml(this.session)}
        </section>
        <section class="environment-studio-boundary">
          <strong>Boundary</strong>
          <span>Scientifically constrained synthetic bathymetry. Not calibrated regional forecast, operational bathymetry, or certified navigation data. No scoring changes.</span>
        </section>
      </main>
    `;
    this.previewHost.querySelector?.('[data-env-studio-preview-mode]')?.addEventListener('change', (event) => {
      this.session = setEnvironmentStudioPreviewMode(this.session, event.target.value);
      this.statusMessage = `Preview mode changed to ${event.target.selectedOptions?.[0]?.textContent ?? event.target.value}.`;
      this.render();
    });
    bindEnvironmentStudioPreviewControls(this, this.previewHost);
    this.bindSelectionControls(this.previewHost);
  }

  updatePreviewCamera(patch = {}) {
    this.session = setEnvironmentStudioPreviewCameraState(this.session, patch);
    this.statusMessage = 'Preview camera updated. UI-only camera state is preserved in project exports as noncanonical metadata.';
    this.lastError = null;
    this.render();
  }

  setAtlasPreset(presetId) {
    this.session = setEnvironmentStudioAtlasPreset(this.session, presetId, { seed: this.readSeed() });
    this.statusMessage = 'Synthetic atlas preset changed; operational window context was re-inferred.';
    this.lastError = null;
    this.render();
  }

  selectAtlasWindow(windowPresetId) {
    this.session = selectEnvironmentStudioOperationalWindow(this.session, windowPresetId);
    this.statusMessage = 'Operational window selected from atlas examples.';
    this.lastError = null;
    this.render();
  }

  adjustAtlasWindow(action) {
    const window = this.session.selectedOperationalWindow ?? {};
    const step = 0.04;
    const sizeStep = 0.04;
    const patch = {};
    if (action === 'left') patch.x = Number(window.x ?? 0) - step;
    if (action === 'right') patch.x = Number(window.x ?? 0) + step;
    if (action === 'up') patch.y = Number(window.y ?? 0) - step;
    if (action === 'down') patch.y = Number(window.y ?? 0) + step;
    if (action === 'smaller') {
      patch.width = Number(window.width ?? 0.3) - sizeStep;
      patch.height = Number(window.height ?? 0.3) - sizeStep;
    }
    if (action === 'larger') {
      patch.width = Number(window.width ?? 0.3) + sizeStep;
      patch.height = Number(window.height ?? 0.3) + sizeStep;
    }
    this.session = patchEnvironmentStudioOperationalWindow(this.session, patch);
    this.statusMessage = 'Operational window adjusted and context re-inferred.';
    this.lastError = null;
    this.render();
  }

  randomizeAtlasSeed() {
    this.session = randomizeEnvironmentStudioAtlasSeed(this.session);
    this.statusMessage = 'Atlas seed randomized deterministically from current project/window state.';
    this.lastError = null;
    this.render();
  }

  generateAtlasRegion() {
    try {
      this.session = generateEnvironmentStudioRegionFromAtlasWindow(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated regional 3D bathymetry from the selected Synthetic Ocean Atlas window.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Atlas region generation failed.';
    }
    this.render();
  }

  applyProfile(profileId) {
    const profile = domainProfileById(profileId);
    this.session = createEnvironmentStudioSession({
      profileId: profile.id,
      environmentType: profile.id,
      label: profile.label,
      seed: this.readSeed(),
      archetypeId: this.readArchetype(),
      previewMode: this.session.previewMode,
      previewCameraState: this.session.previewCameraState,
      simplifiedPanelState: this.session.simplifiedPanelState,
      expandedAdvancedSections: this.session.expandedAdvancedSections
    });
    this.statusMessage = `Applied ${profile.label} domain profile.`;
    this.lastError = null;
    this.render();
  }

  applyDomainControls() {
    this.session = patchEnvironmentStudioDomain(this.session, {
      label: this.session.label,
      widthMeters: this.numberValue('env-studio-width', this.session.domainSpec.horizontal.widthMeters / 1000) * 1000,
      heightMeters: this.numberValue('env-studio-height', this.session.domainSpec.horizontal.heightMeters / 1000) * 1000,
      cellSizeMeters: this.numberValue('env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters),
      maxDepthMeters: this.numberValue('env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters),
      durationSeconds: this.numberValue('env-studio-duration', this.session.domainSpec.time.durationSeconds),
      dtSeconds: this.numberValue('env-studio-dt', this.session.domainSpec.time.dtSeconds)
    });
    this.session = updateEnvironmentStudioRegionalRecipe({
      ...this.session,
      profileId: 'custom',
      environmentType: this.readValue('env-studio-profile', this.session.environmentType)
    }, this.readRegionalControls());
    this.statusMessage = 'Domain updated; generated bathymetry was cleared for regeneration.';
    this.lastError = null;
    this.render();
  }

  updateArchetype(archetypeId) {
    this.session = setEnvironmentStudioArchetype(this.session, archetypeId, { seed: this.readSeed() });
    this.statusMessage = 'Bathymetry archetype changed; generate a tile or mosaic to refresh previews.';
    this.lastError = null;
    this.render();
  }

  generateTile() {
    try {
      this.session = updateEnvironmentStudioRegionalRecipe(this.session, this.readRegionalControls());
      this.session = setEnvironmentStudioArchetype(this.session, this.readArchetype(), { seed: this.readSeed() });
      this.session = generateEnvironmentStudioTile(this.session, { seed: this.readSeed(), archetypeId: this.readArchetype() });
      this.statusMessage = 'Generated deterministic compact bathymetry tile.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Tile generation failed.';
    }
    this.render();
  }

  createMosaic() {
    try {
      this.session = updateEnvironmentStudioRegionalRecipe(this.session, this.readRegionalControls());
      this.session = setEnvironmentStudioArchetype(this.session, this.readArchetype(), { seed: this.readSeed() });
      this.session = createEnvironmentStudioMosaic(this.session, { seed: this.readSeed(), tileConfigs: this.readTileConfigs() });
      this.session = selectEnvironmentStudioObject(this.session, { type: 'region', id: 'region' });
      this.statusMessage = 'Created deterministic multi-archetype regional bathymetry with seam validation.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Mosaic generation failed.';
    }
    this.render();
  }

  generateFields() {
    try {
      this.session = regenerateEnvironmentStudioFields(this.session, { seed: this.readSeed() });
      this.statusMessage = 'Generated atlas-conditioned synthetic currents, science scalar field, and hotspot candidates.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Field regeneration failed.';
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
    if (!this.session.tiles.length) {
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
      regionalTemplate: this.session.regionalTemplate,
      featureMix: this.session.featureMix,
      regionalFeatureSummary: this.session.regionalFeatureSummary,
      multiGliderSuitability: this.session.multiGliderSuitability,
      bathymetryBuilderVersion: this.session.bathymetryBuilderVersion,
      bathymetryBuilderResult: this.session.bathymetryBuilderResult,
      bathymetryArtifactDigest: this.session.bathymetryArtifactDigest ?? this.session.bathymetryBuilderResult?.bathymetryArtifactDigest,
      tiles: this.session.tiles.map((tile) => ({
        id: tile.id,
        archetypeId: tile.archetypeId,
        featureRole: tile.featureRole,
        manifest: tile.manifest,
        bathymetryArtifact: tile.bathymetryArtifact,
        diagnostics: tile.diagnostics
      })),
      mosaic: this.session.mosaic,
      provenance: {
        generatedBy: 'src/game/phaser/scenes/EnvironmentStudioScene.js',
        generatorVersion: ENVIRONMENT_STUDIO_SCENE_VERSION,
        deterministicSeed: this.session.seed,
        synthetic: true,
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

  readSeed() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#env-studio-seed')?.value ?? this.session.seed ?? 'env-studio-r1');
  }

  readArchetype() {
    return String(this.app.elements?.consoleRoot?.querySelector?.('#env-studio-archetype')?.value ?? this.session.archetypeId ?? 'coastalShelf');
  }

  readRegionalControls() {
    return {
      environmentType: this.readValue('env-studio-profile', this.session.environmentType),
      missionScale: this.readValue('env-studio-mission-scale', this.session.missionScale),
      intendedGliders: this.numberValue('env-studio-intended-gliders', this.session.intendedGliders),
      estimatedMissionDuration: this.readValue('env-studio-duration-label', this.session.estimatedMissionDuration),
      bathymetrySource: this.readValue('env-studio-bathymetry-source', this.session.bathymetrySource),
      regionalTemplate: this.readValue('env-studio-regional-template', this.session.regionalTemplate),
      coastlineOrientation: this.readValue('env-studio-coastline-orientation', this.session.coastlineOrientation),
      openOceanBoundaries: Array.from(this.app.elements?.consoleRoot?.querySelectorAll?.('[data-env-studio-open-boundary]:checked') ?? []).map((entry) => entry.value),
      featureMix: {
        shelfFraction: this.readValue('env-studio-mix-shelfFraction', this.session.featureMix.shelfFraction),
        deepBasinFraction: this.readValue('env-studio-mix-deepBasinFraction', this.session.featureMix.deepBasinFraction),
        canyonDensity: this.readValue('env-studio-mix-canyonDensity', this.session.featureMix.canyonDensity),
        islandSeamountCount: this.readValue('env-studio-mix-islandSeamountCount', this.session.featureMix.islandSeamountCount),
        coastlineComplexity: this.readValue('env-studio-mix-coastlineComplexity', this.session.featureMix.coastlineComplexity),
        riverMouthDeltaInfluence: this.readValue('env-studio-mix-riverMouthDeltaInfluence', this.session.featureMix.riverMouthDeltaInfluence),
        ridgeSillStrength: this.readValue('env-studio-mix-ridgeSillStrength', this.session.featureMix.ridgeSillStrength),
        shelfBreakSharpness: this.readValue('env-studio-mix-shelfBreakSharpness', this.session.featureMix.shelfBreakSharpness),
        featureDiversity: this.readValue('env-studio-mix-featureDiversity', this.session.featureMix.featureDiversity)
      },
      randomization: {
        worldSeed: this.readSeed(),
        variationLevel: this.readValue('env-studio-variation-level', this.session.randomization.variationLevel),
        locks: {
          coastline: this.booleanValue('env-studio-lock-coastline'),
          deepBasin: this.booleanValue('env-studio-lock-deep-basin'),
          selectedFeatures: this.booleanValue('env-studio-lock-selected-features'),
          tileSeams: this.booleanValue('env-studio-lock-tile-seams')
        }
      },
      previewDetail: this.readValue('env-studio-preview-detail', this.session.previewDetail),
      previewMode: this.session.previewMode,
      tileConfigs: this.readTileConfigs()
    };
  }

  readTileConfigs() {
    const root = this.app.elements?.consoleRoot;
    return this.session.tileConfigs.map((config) => ({
      ...config,
      archetypeId: root?.querySelector?.(`[data-env-studio-tile-archetype="${config.id}"]`)?.value ?? config.archetypeId
    }));
  }

  readValue(id, fallback) {
    const element = this.app.elements?.consoleRoot?.querySelector?.(`#${id}`);
    return String(element?.value ?? fallback ?? '');
  }

  numberValue(id, fallback) {
    const value = Number(this.app.elements?.consoleRoot?.querySelector?.(`#${id}`)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  booleanValue(id) {
    return this.app.elements?.consoleRoot?.querySelector?.(`#${id}`)?.checked === true;
  }

  selectObject(type, id) {
    this.session = selectEnvironmentStudioObject(this.session, { type, id });
    this.statusMessage = `Selected ${type || 'region'} ${id || 'region'} for inspection.`;
    this.lastError = null;
    this.render();
  }

  bindSelectionControls(root) {
    root?.querySelectorAll?.('[data-env-studio-select]')?.forEach((element) => {
      const select = () => this.selectObject(element.dataset.envStudioSelectType, element.dataset.envStudioSelectId);
      element.addEventListener('click', select);
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
    });
  }

  mountPreviewHost() {
    const host = this.app?.elements?.viewportShell ?? this.app?.elements?.gameContainer;
    if (!host || this.previewHost) return;
    this.previewHost = globalThis.document.createElement('div');
    this.previewHost.className = 'environment-studio-preview-host';
    this.previewHost.setAttribute('data-environment-studio-preview-host', 'true');
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

  publishDebug(active = true) {
    const debug = environmentStudioDebugPayload(this.session);
    globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG = {
      ...debug,
      version: ENVIRONMENT_STUDIO_SCENE_VERSION,
      routeActive: Boolean(active),
      terrainPreviewRendererCount: 0,
      terrainPreviewRafCount: 0,
      stalePreviewObjects: 0,
      previewRendererCount: 0,
      activeRafCount: 0,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false
    };
  }
}

function simplifiedConsoleHtml(scene, summary = {}, panelSections = new Map(), advancedOpen = '', diagnosticsOpen = '') {
  const session = scene.session;
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Environment Studio</h1>
      <p>Author an inspectable mission-scale synthetic ocean region. Source-tile diagnostics stay collapsed by default so the first decision is region intent.</p>
    </section>
    <section class="console-status">
      <span>Status</span>
      <strong>${escapeHtml(summary.validationStatus)}</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-section="basic">
      <h2>${escapeHtml(panelSections.get('basic')?.label ?? 'Basic Authoring')}</h2>
      <p class="hud-muted">Pick scale, size, diversity, and seed. Generate the region, then inspect the preview and feature records.</p>
      <label class="compact-field">
        Environment Type
        <select id="env-studio-profile" data-env-studio-profile>
          ${ENVIRONMENT_STUDIO_DOMAIN_PROFILES.map((profile) => `<option value="${escapeAttr(profile.id)}" ${profile.id === session.environmentType ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('')}
        </select>
      </label>
      ${selectInput('Mission Scale', 'env-studio-mission-scale', session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
      ${numberInput('Intended Gliders', 'env-studio-intended-gliders', session.intendedGliders, 1, 6, 1)}
      ${numberInput('Width km', 'env-studio-width', session.domainSpec.horizontal.widthMeters / 1000, 1, 300, 1)}
      ${numberInput('Height km', 'env-studio-height', session.domainSpec.horizontal.heightMeters / 1000, 1, 200, 1)}
      ${numberInput('Horizontal source-cell size m', 'env-studio-cell-size', session.domainSpec.horizontal.cellSizeMeters, 100, 5000, 100)}
      ${selectInput('Preview detail', 'env-studio-preview-detail', session.previewDetail, ENVIRONMENT_STUDIO_PREVIEW_DETAILS)}
      ${levelSelect('Feature diversity', 'env-studio-mix-featureDiversity', session.featureMix.featureDiversity)}
      <label class="compact-field">
        World seed
        <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(session.seed)}" />
      </label>
      <div class="cell-inspector-metrics">
        ${metricHtml('Source grid', `${summary.sourceGridShape.columns} x ${summary.sourceGridShape.rows}`)}
        ${metricHtml('Preview mesh', `${summary.previewGridShape.columns} x ${summary.previewGridShape.rows}`)}
        ${metricHtml('Preview budget', session.previewBudget?.label ?? 'Not measured')}
        ${metricHtml('Suitability', session.multiGliderSuitability?.status ?? 'WARN')}
        ${metricHtml('Builder validation', session.bathymetryBuilderResult?.validationReport?.status ?? 'NOT_GENERATED')}
        ${metricHtml('Bathymetry artifact', shortDigest(session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest))}
      </div>
      ${suitabilityHtml(session.multiGliderSuitability)}
      <button class="console-button primary" type="button" data-action="env-studio-apply-domain">Apply Domain</button>
      <button class="console-button primary" type="button" data-action="env-studio-create-mosaic">Generate Region</button>
      <button class="console-button primary" type="button" data-action="env-studio-generate-fields">Generate Currents &amp; Science Fields</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
      <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning remains disabled until environment-adapter validation.</button>
    </section>
    <section class="console-section environment-studio-secondary-panel" data-keep-title="true" data-env-studio-section="advanced" data-collapsed="true">
      <h2>Advanced Region Recipe</h2>
      <p class="hud-muted">Feature-mix and tile-role tuning are secondary controls after atlas selection. Use them only when the inferred recipe needs expert adjustment.</p>
      <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
      <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
      <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
    </section>
    <section class="console-section environment-studio-secondary-panel" data-keep-title="true" data-env-studio-section="diagnostics" data-env-studio-source-diagnostics data-collapsed="true">
      <h2>Source Tile Provenance</h2>
      <p class="hud-muted">Source tiles explain provenance for the synthetic regional surface. They are not depth slabs or separate water-column layers.</p>
    </section>
    <details class="console-section environment-studio-collapsible" data-keep-title="true" data-env-studio-section="advanced" ${advancedOpen}>
      <summary><span>${escapeHtml(panelSections.get('advanced')?.label ?? 'Advanced Region Controls')}</span><small>Domain / Resolution, templates, feature mix, randomization</small></summary>
      <div class="environment-studio-collapsible-body">
        <h2>Domain &amp; Resolution</h2>
        <div class="hud-muted">Legacy label: Domain / Resolution. Source Grid is exported; Preview Mesh is decimated for interactive display.</div>
        ${numberInput('Max depth m', 'env-studio-max-depth', session.domainSpec.vertical.maxDepthMeters, 20, 1000, 10)}
        ${numberInput('Duration s', 'env-studio-duration', session.domainSpec.time.durationSeconds, 300, 86400, 300)}
        ${numberInput('dt s', 'env-studio-dt', session.domainSpec.time.dtSeconds, 30, 3600, 30)}
        <label class="compact-field">
          Estimated Mission Duration
          <input id="env-studio-duration-label" type="text" value="${escapeAttr(session.estimatedMissionDuration)}" />
        </label>
        ${selectInput('Bathymetry Source', 'env-studio-bathymetry-source', session.bathymetrySource, ENVIRONMENT_STUDIO_BATHYMETRY_SOURCES)}
        <div class="hud-muted">Current authoring uses deterministic synthetic bathymetry only. Real patch import and reference comparison remain planned workflows.</div>
        <h2>Regional Layout Template</h2>
        ${selectInput('Template', 'env-studio-regional-template', session.regionalTemplate, ENVIRONMENT_STUDIO_REGIONAL_TEMPLATES)}
        ${selectInput('Coastline Orientation', 'env-studio-coastline-orientation', session.coastlineOrientation, ENVIRONMENT_STUDIO_COASTLINE_ORIENTATIONS)}
        <div class="environment-studio-checkbox-grid" aria-label="Open Ocean Boundaries">
          ${['north', 'south', 'east', 'west'].map((side) => `
            <label><input type="checkbox" data-env-studio-open-boundary value="${escapeAttr(side)}" ${session.openOceanBoundaries.includes(side) ? 'checked' : ''} /> ${escapeHtml(labelize(side))}</label>
          `).join('')}
        </div>
        <h2>Regional Feature Mix</h2>
        ${levelSelect('Shelf fraction', 'env-studio-mix-shelfFraction', session.featureMix.shelfFraction)}
        ${levelSelect('Deep basin fraction', 'env-studio-mix-deepBasinFraction', session.featureMix.deepBasinFraction)}
        ${levelSelect('Canyon density', 'env-studio-mix-canyonDensity', session.featureMix.canyonDensity)}
        ${levelSelect('Island / seamount count', 'env-studio-mix-islandSeamountCount', session.featureMix.islandSeamountCount)}
        ${levelSelect('Coastline complexity', 'env-studio-mix-coastlineComplexity', session.featureMix.coastlineComplexity)}
        ${levelSelect('River mouth / delta influence', 'env-studio-mix-riverMouthDeltaInfluence', session.featureMix.riverMouthDeltaInfluence)}
        ${levelSelect('Ridge / sill strength', 'env-studio-mix-ridgeSillStrength', session.featureMix.ridgeSillStrength)}
        ${levelSelect('Shelf-break sharpness', 'env-studio-mix-shelfBreakSharpness', session.featureMix.shelfBreakSharpness)}
        <h2>Randomization</h2>
        <div class="hud-muted">Bathymetry Generator: choose region type, choose feature mix, lock what you like, and reroll the rest.</div>
        <label class="compact-field">
          Compact Tile Archetype
          <select id="env-studio-archetype" data-env-studio-archetype>
            ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === session.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        ${levelSelect('Variation level', 'env-studio-variation-level', session.randomization.variationLevel)}
        <div class="environment-studio-checkbox-grid">
          <label><input type="checkbox" id="env-studio-lock-coastline" ${session.randomization.locks.coastline ? 'checked' : ''} /> Lock coastline</label>
          <label><input type="checkbox" id="env-studio-lock-deep-basin" ${session.randomization.locks.deepBasin ? 'checked' : ''} /> Lock deep basin</label>
          <label><input type="checkbox" id="env-studio-lock-selected-features" ${session.randomization.locks.selectedFeatures ? 'checked' : ''} disabled /> Lock selected features (planned)</label>
          <label><input type="checkbox" id="env-studio-lock-tile-seams" ${session.randomization.locks.tileSeams ? 'checked' : ''} /> Lock tile seams</label>
        </div>
        <div class="environment-studio-tile-config-list">
          ${session.tileConfigs.map((config) => `
            <label class="compact-field">
              ${escapeHtml(config.label)} role
              <select data-env-studio-tile-archetype="${escapeAttr(config.id)}">
                ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === config.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
              </select>
            </label>
          `).join('')}
        </div>
        <div class="hud-muted">${escapeHtml(archetypeDescription(session.archetypeId))}</div>
        <button class="console-button secondary" type="button" data-action="env-studio-generate-tile">Regenerate Selected Source Tile</button>
        <button class="console-button secondary" type="button" data-action="env-studio-export-bathymetry">Export Bathymetry Artifact</button>
        <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
        <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
        <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
      </div>
    </details>
    <details class="console-section environment-studio-collapsible" data-keep-title="true" data-env-studio-section="diagnostics" data-env-studio-source-diagnostics ${diagnosticsOpen}>
      <summary><span>${escapeHtml(panelSections.get('diagnostics')?.label ?? 'Diagnostics')}</span><small>Validation, source tiles, digests, dependency state</small></summary>
      <div class="environment-studio-collapsible-body">
        <h2>Validation &amp; Mission Suitability</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Bathymetry validity', session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Wet connectivity', formatNumber(session.regionalFeatureSummary?.navigableConnectedWaterFraction))}
          ${metricHtml('Slope warnings', session.regionalFeatureSummary?.canyonLikeGradientCount ?? 0)}
          ${metricHtml('Seam continuity', session.mosaic?.seamReport?.valid === true ? 'PASS' : session.mosaic?.seamReport ? 'FAIL' : 'NOT_GENERATED')}
          ${metricHtml('Deep water', formatNumber(session.regionalFeatureSummary?.deepWaterFraction))}
          ${metricHtml('Shallow shelf', formatNumber(session.regionalFeatureSummary?.shallowShelfFraction))}
          ${metricHtml('Feature diversity', formatNumber(session.regionalFeatureSummary?.featureDiversityScore))}
          ${metricHtml('Feature records', session.featureRecords?.length ?? 0)}
          ${metricHtml('Builder', shortDigest(session.bathymetryBuilderResult?.builderDigest))}
          ${metricHtml('Builder attempts', session.bathymetryBuilderResult?.generationAttempts?.length ?? 0)}
          ${metricHtml('Bathymetry artifact', shortDigest(session.bathymetryArtifactDigest ?? session.bathymetryBuilderResult?.bathymetryArtifactDigest))}
          ${metricHtml('Builder validation', session.bathymetryBuilderResult?.validationReport?.status ?? 'NOT_GENERATED')}
          ${metricHtml('Preview budget', session.previewBudget?.label ?? 'Not measured')}
          ${metricHtml('Estimated cost', session.previewBudget?.estimatedRenderCost ?? 'Not measured')}
          ${metricHtml('Domain Digest', shortDigest(summary.domainDigest))}
          ${metricHtml('Report Digest', shortDigest(session.validationReport?.validationReportDigest))}
        </div>
        <div class="hud-muted">Synthetic, public-safe artifacts only. Not calibrated survey data, not an operational forecast, and not certified for navigation.</div>
        <h2>Generated Field Status</h2>
        ${dependencyGraphTable(session.dependencyGraph)}
        ${fieldRegenerationSummaryHtml(session.fieldRegenerationResult)}
        <h2>Source Tile Diagnostics</h2>
        <p class="hud-muted">Source tiles are provenance components for the synthetic regional surface. They are not depth slabs or separate water-column layers.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Source tiles', session.tiles.length)}
          ${metricHtml('Mosaic', session.mosaic?.manifest ? '2 x 2' : 'none')}
          ${metricHtml('Source tile digests', session.tiles.map((tile) => shortDigest(tile.manifest?.tileDigest)).join(', ') || 'none')}
        </div>
      </div>
    </details>
  `;
}

function bindEnvironmentStudioConsoleControls(scene, root) {
  root?.querySelector?.('[data-env-studio-profile]')?.addEventListener('change', (event) => scene.applyProfile(event.target.value));
  root?.querySelector?.('[data-env-studio-archetype]')?.addEventListener('change', (event) => scene.updateArchetype(event.target.value));
  root?.querySelector?.('[data-action="env-studio-apply-domain"]')?.addEventListener('click', () => scene.applyDomainControls());
  root?.querySelector?.('[data-action="env-studio-generate-tile"]')?.addEventListener('click', () => scene.generateTile());
  root?.querySelector?.('[data-action="env-studio-create-mosaic"]')?.addEventListener('click', () => scene.createMosaic());
  root?.querySelector?.('[data-action="env-studio-generate-fields"]')?.addEventListener('click', () => scene.generateFields());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
  root?.querySelector?.('[data-action="env-studio-export-bathymetry"]')?.addEventListener('click', () => scene.exportBathymetryArtifact());
  root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => scene.importProject(event.target.files?.[0]));
  root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => scene.scene.start('MainMenuScene'));
}

function atlasConsoleHtml(scene, selectedWindow = {}) {
  const session = scene.session;
  return `
    <section class="console-header">
      <div class="console-kicker">Simulation Lab / Environment Studio</div>
      <h1>Synthetic Ocean Atlas</h1>
      <p>Select an operational mission window first. Feature and source-tile controls move to the regional detail stage after generation.</p>
    </section>
    <section class="console-status">
      <span>Stage</span>
      <strong>Atlas Window</strong>
      <small>${escapeHtml(scene.statusMessage)}</small>
    </section>
    ${scene.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(scene.lastError)}</div></section>` : ''}
    <section class="console-section environment-studio-basic-panel" data-keep-title="true" data-env-studio-stage="atlasWindow">
      <h2>Mission Region</h2>
      <label class="compact-field">
        Region Source
        <select id="env-studio-region-source">
          <option value="syntheticOceanAtlas">Synthetic Ocean Atlas</option>
          <option value="importedBathymetryArtifact">Imported Bathymetry Artifact</option>
          <option value="realPatchTemplatePlanned" disabled>Real Patch Template - Planned</option>
          <option value="referenceComparisonOnlyPlanned" disabled>Reference Comparison - Planned</option>
        </select>
      </label>
      <label class="compact-field">
        Atlas Preset
        <select id="env-studio-atlas-preset" data-env-studio-atlas-preset>
          ${SYNTHETIC_OCEAN_ATLAS_PRESETS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${preset.id === session.atlasPreset ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
        </select>
      </label>
      <label class="compact-field">
        Window Example
        <select id="env-studio-window-preset" data-env-studio-window-preset>
          ${OPERATIONAL_WINDOW_PRESETS.map((preset) => `<option value="${escapeAttr(preset.id)}" ${preset.id === selectedWindow.windowId ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('')}
        </select>
      </label>
      ${selectInput('Mission Scale', 'env-studio-mission-scale', session.missionScale, ENVIRONMENT_STUDIO_MISSION_SCALES)}
      ${numberInput('Intended Gliders', 'env-studio-intended-gliders', selectedWindow.recommendedGliders ?? session.intendedGliders, 1, 6, 1)}
      <label class="compact-field">
        Mission Duration
        <input id="env-studio-duration-label" type="text" value="${escapeAttr(Math.round(Number(selectedWindow.recommendedDurationSeconds ?? 86400) / 3600))} hr" />
      </label>
      <label class="compact-field">
        Window Size
        <input id="env-studio-window-size" type="text" value="${escapeAttr(formatNumber(selectedWindow.width))} x ${escapeAttr(formatNumber(selectedWindow.height))}" readonly />
      </label>
      <label class="compact-field">
        Atlas seed
        <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(session.atlasSeed ?? session.seed)}" />
      </label>
      <div class="environment-studio-camera-row" aria-label="Window controls">
        <button type="button" data-env-studio-window-action="left">Move Left</button>
        <button type="button" data-env-studio-window-action="right">Move Right</button>
        <button type="button" data-env-studio-window-action="up">Move Up</button>
        <button type="button" data-env-studio-window-action="down">Move Down</button>
        <button type="button" data-env-studio-window-action="smaller">Smaller</button>
        <button type="button" data-env-studio-window-action="larger">Larger</button>
      </div>
      <div class="cell-inspector-metrics">
        ${metricHtml('Detected context', selectedWindow.detectedContext?.primaryContextLabel ?? 'not selected')}
        ${metricHtml('Domain', `${formatNumber((selectedWindow.recommendedDomain?.widthMeters ?? 0) / 1000)} x ${formatNumber((selectedWindow.recommendedDomain?.heightMeters ?? 0) / 1000)} km`)}
        ${metricHtml('Source cells', `${selectedWindow.recommendedDomain?.columns ?? 0} x ${selectedWindow.recommendedDomain?.rows ?? 0}`)}
        ${metricHtml('Atlas digest', shortDigest(session.atlas?.atlasDigest))}
        ${metricHtml('Window digest', shortDigest(selectedWindow.windowDigest))}
        ${metricHtml('Current hints', (selectedWindow.currentRegime ?? []).slice(0, 2).join(', ') || 'not inferred')}
        ${metricHtml('Scalar hints', (selectedWindow.scalarRegime ?? []).slice(0, 2).join(', ') || 'not inferred')}
      </div>
      <button class="console-button secondary" type="button" data-action="env-studio-randomize-atlas-seed">Randomize Atlas Seed</button>
      <button class="console-button primary" type="button" data-action="env-studio-generate-atlas-region">Generate 3D Region</button>
      <button class="console-button secondary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
      <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning remains planned for a later adapter phase.</button>
    </section>
    <details class="console-section environment-studio-collapsible" data-keep-title="true">
      <summary><span>Advanced Region Recipe</span><small>Feature and tile controls appear after a region is generated</small></summary>
      <div class="environment-studio-collapsible-body">
        <p class="hud-muted">The atlas-selected operational window creates a Regional Mission Recipe. Low-level feature mix, source-tile roles, and diagnostics are available in Regional Detail after generation.</p>
      </div>
    </details>
  `;
}

function bindEnvironmentStudioAtlasControls(scene, root) {
  root?.querySelector?.('[data-env-studio-atlas-preset]')?.addEventListener('change', (event) => scene.setAtlasPreset(event.target.value));
  root?.querySelector?.('[data-env-studio-window-preset]')?.addEventListener('change', (event) => scene.selectAtlasWindow(event.target.value));
  root?.querySelectorAll?.('[data-env-studio-window-action]')?.forEach((button) => {
    button.addEventListener('click', () => scene.adjustAtlasWindow(button.getAttribute('data-env-studio-window-action')));
  });
  root?.querySelector?.('[data-action="env-studio-randomize-atlas-seed"]')?.addEventListener('click', () => scene.randomizeAtlasSeed());
  root?.querySelector?.('[data-action="env-studio-generate-atlas-region"]')?.addEventListener('click', () => scene.generateAtlasRegion());
  root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => scene.exportProject());
}

function atlasRightPanelHtml(session = {}) {
  const window = session.selectedOperationalWindow ?? {};
  const context = window.detectedContext ?? {};
  const recipe = session.regionalMissionRecipe ?? {};
  return `
    <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
      <div class="console-kicker">Selected Operational Window</div>
      <h2>${escapeHtml(window.label ?? 'Operational Window')}</h2>
      <p class="hud-muted">Synthetic Ocean Atlas context map. This is not a real Earth map, calibrated ocean product, operational forecast, or navigation dataset.</p>
      <div class="cell-inspector-metrics">
        ${metricHtml('Studio Stage', 'Atlas Window')}
        ${metricHtml('Detected Context', context.primaryContextLabel ?? 'not inferred')}
        ${metricHtml('Recommended Gliders', window.recommendedGliders ?? session.intendedGliders)}
        ${metricHtml('Recommended Duration', `${Math.round(Number(window.recommendedDurationSeconds ?? 0) / 3600)} hr`)}
        ${metricHtml('Atlas Digest', shortDigest(session.atlas?.atlasDigest))}
        ${metricHtml('Window Digest', shortDigest(window.windowDigest))}
        ${metricHtml('Recipe Digest', shortDigest(recipe.recipeDigest))}
      </div>
      <table class="environment-studio-table">
        <tbody>
          <tr><td>Domain</td><td>${escapeHtml(formatNumber((window.recommendedDomain?.widthMeters ?? 0) / 1000))} x ${escapeHtml(formatNumber((window.recommendedDomain?.heightMeters ?? 0) / 1000))} km</td></tr>
          <tr><td>Source Resolution</td><td>${escapeHtml(window.recommendedDomain?.sourceResolutionMeters ?? 'n/a')} m</td></tr>
          <tr><td>Bathymetry Regime</td><td>${escapeHtml(labelize(window.bathymetryRegime ?? 'not inferred'))}</td></tr>
          <tr><td>Current Regime Hints</td><td>${escapeHtml((window.currentRegime ?? []).join(', ') || 'not inferred')}</td></tr>
          <tr><td>Scalar Regime Hints</td><td>${escapeHtml((window.scalarRegime ?? []).join(', ') || 'not inferred')}</td></tr>
          <tr><td>Open Boundaries</td><td>${escapeHtml((window.openBoundarySides ?? []).join(', ') || 'none')}</td></tr>
          <tr><td>Mission Suitability</td><td>${escapeHtml(context.missionSuitabilityHint ?? 'Generate or adjust a window.')}</td></tr>
          <tr><td>Expected Artifacts</td><td>Bathymetry, wet/land mask, and coastline metadata are current after generation; currents/scalars/hotspots are marked for regeneration or validation.</td></tr>
        </tbody>
      </table>
      <div class="environment-studio-summary-grid">
        ${metricHtml('Land fraction', formatNumber(context.landFraction))}
        ${metricHtml('Water fraction', formatNumber(context.waterFraction))}
        ${metricHtml('Shelf fraction', formatNumber(context.shelfFraction))}
        ${metricHtml('Basin fraction', formatNumber(context.basinFraction))}
        ${metricHtml('Island fraction', formatNumber(context.islandFraction))}
        ${metricHtml('River mouth', formatNumber(context.riverMouthInfluence))}
        ${metricHtml('Strait / sill', formatNumber(context.straitInfluence))}
      </div>
    </section>
  `;
}

function atlasPreviewHtml(session = {}, project = {}) {
  return `
    <main id="environment-studio-route" class="environment-studio-route environment-studio-atlas-route">
      <header class="environment-studio-route-header">
        <div>
          <p class="console-kicker">Synthetic Ocean Atlas</p>
          <h1>${escapeHtml(session.atlas?.label ?? 'Synthetic Ocean Atlas')}</h1>
          <p>Choose a synthetic operational window. The atlas is a deterministic context map, not a real Earth map or operational ocean forecast.</p>
        </div>
        <div class="environment-studio-digest">
          <span>Project Digest</span>
          <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
        </div>
      </header>
      <section class="environment-studio-preview-grid" aria-label="Synthetic Ocean Atlas map">
        <section class="environment-studio-terrain-preview" data-env-studio-atlas-map>
          <h2>Synthetic Ocean Atlas Map</h2>
          <div class="environment-studio-preview-meta">
            ${metricHtml('Atlas Preset', labelize(session.atlasPreset))}
            ${metricHtml('Atlas Seed', session.atlasSeed)}
            ${metricHtml('Atlas Digest', shortDigest(session.atlas?.atlasDigest))}
            ${metricHtml('Selected Window', session.selectedOperationalWindow?.label ?? 'none')}
            ${metricHtml('Window Digest', shortDigest(session.selectedOperationalWindow?.windowDigest))}
            ${metricHtml('Detected Context', session.selectedOperationalWindow?.detectedContext?.primaryContextLabel ?? 'not inferred')}
            ${metricHtml('Recipe', shortDigest(session.regionalMissionRecipe?.recipeDigest))}
          </div>
          ${atlasSvgHtml(session)}
          <div class="environment-studio-depth-ramp" aria-label="Atlas legend">
            <span style="background:#6f7b4a">land/coast</span>
            <span style="background:#2d8f9f">shelf</span>
            <span style="background:#1f5f9d">basin</span>
            <span style="background:#5442a8">deep/open</span>
          </div>
          <p class="hud-muted">Current and scalar regimes are hints recorded in the Regional Mission Recipe. This phase does not regenerate current/scalar fields or change simulation/scoring.</p>
        </section>
      </section>
      <section class="environment-studio-boundary">
        <strong>Boundary</strong>
        <span>Synthetic, reference-informed, benchmark-oriented atlas. Bathymetry remains a 2.5D bottom surface h(x,y). No hidden truth or real-region accuracy claim.</span>
      </section>
    </main>
  `;
}

function atlasSvgHtml(session = {}) {
  const atlas = session.atlas ?? {};
  const window = session.selectedOperationalWindow ?? {};
  const regions = atlas.regions ?? [];
  const fieldCells = atlasFieldRasterHtml(atlas);
  const regionShapes = regions.map((region) => atlasRegionShapeHtml(region)).join('');
  const x = 60 + Number(window.x ?? 0) * 600;
  const y = 42 + Number(window.y ?? 0) * 276;
  const width = Number(window.width ?? 0.3) * 600;
  const height = Number(window.height ?? 0.3) * 276;
  return `
    <svg class="environment-studio-3d-svg environment-studio-atlas-svg" role="img" aria-label="Synthetic Ocean Atlas map" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="720" height="360" rx="8" fill="rgba(2, 8, 18, 0.88)" />
      <rect x="60" y="42" width="600" height="276" rx="6" fill="#123e62" />
      ${fieldCells}
      ${regionShapes}
      <g class="environment-studio-atlas-current-hints">
        <path d="M420 108 C500 88 580 118 620 178" />
        <path d="M238 238 C318 204 408 214 500 258" />
      </g>
      <rect x="${roundForSvg(x)}" y="${roundForSvg(y)}" width="${roundForSvg(width)}" height="${roundForSvg(height)}" class="environment-studio-atlas-window" />
      <text x="${roundForSvg(x + 8)}" y="${roundForSvg(Math.max(58, y - 8))}">${escapeHtml(window.label ?? 'Operational Window')}</text>
      <text x="74" y="68">Synthetic Ocean Atlas</text>
      <text x="74" y="88">normalized coordinates, not real lat/lon</text>
    </svg>
  `;
}

function atlasFieldRasterHtml(atlas = {}) {
  if (!atlas.layers) return '';
  const columns = 30;
  const rows = 16;
  const cellWidth = 600 / columns;
  const cellHeight = 276 / rows;
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = (x + 0.5) / columns;
      const ny = (y + 0.5) / rows;
      const land = sampleAtlasLayer(atlas, 'landOceanMask', nx, ny);
      const shelf = sampleAtlasLayer(atlas, 'continentalShelf', nx, ny);
      const basin = sampleAtlasLayer(atlas, 'deepBasin', nx, ny);
      const canyon = sampleAtlasLayer(atlas, 'canyonPotential', nx, ny);
      const island = sampleAtlasLayer(atlas, 'islandSeamount', nx, ny);
      const river = sampleAtlasLayer(atlas, 'riverMouthInfluence', nx, ny);
      const strait = sampleAtlasLayer(atlas, 'straitSillInfluence', nx, ny);
      const suitability = sampleAtlasLayer(atlas, 'missionSuitability', nx, ny);
      cells.push(`<rect x="${roundForSvg(60 + x * cellWidth)}" y="${roundForSvg(42 + y * cellHeight)}" width="${roundForSvg(cellWidth + 0.25)}" height="${roundForSvg(cellHeight + 0.25)}" fill="${atlasCellColor({ land, shelf, basin, canyon, island, river, strait, suitability })}" opacity=".9" />`);
    }
  }
  return `<g class="environment-studio-atlas-field-raster" data-env-studio-atlas-field-raster>${cells.join('')}</g>`;
}

function atlasCellColor(values = {}) {
  if (values.land > 0.52) return '#6f7b4a';
  if (values.river > 0.38) return '#6aa36f';
  if (values.strait > 0.34) return '#55b9b5';
  if (values.island > 0.42) return '#b8a867';
  if (values.canyon > 0.3) return '#2b4d92';
  if (values.shelf > 0.5) return '#2d8f9f';
  if (values.basin > 0.5) return '#263f88';
  if (values.suitability > 0.64) return '#1f6f9d';
  return '#123e62';
}

function atlasRegionShapeHtml(region = {}) {
  const shape = region.shape ?? {};
  const color = atlasRegionColor(region.context);
  if (shape.type === 'rect') {
    return `<rect x="${roundForSvg(60 + Number(shape.x ?? 0) * 600)}" y="${roundForSvg(42 + Number(shape.y ?? 0) * 276)}" width="${roundForSvg(Number(shape.width ?? 0.1) * 600)}" height="${roundForSvg(Number(shape.height ?? 0.1) * 276)}" fill="${color}" opacity=".62" />`;
  }
  return `<ellipse cx="${roundForSvg(60 + Number(shape.cx ?? 0.5) * 600)}" cy="${roundForSvg(42 + Number(shape.cy ?? 0.5) * 276)}" rx="${roundForSvg(Number(shape.rx ?? 0.1) * 600)}" ry="${roundForSvg(Number(shape.ry ?? 0.1) * 276)}" fill="${color}" opacity=".62" />`;
}

function atlasRegionColor(context = '') {
  return {
    coastShelf: '#2d8f9f',
    gulfBasin: '#2777a8',
    islandChain: '#c9b36b',
    shelfBreak: '#1f5f9d',
    deepBasin: '#5442a8',
    straitSill: '#51b6b3',
    riverMouth: '#76b36a',
    openOcean: '#233f8d'
  }[context] ?? '#365f7d';
}

function previewCameraControlsHtml(session = {}) {
  const camera = session.previewCameraState ?? {};
  const presets = ENVIRONMENT_STUDIO_CAMERA_PRESETS.map((preset) => (
    `<button type="button" class="${camera.preset === preset.id ? 'active' : ''}" data-env-studio-camera-preset="${escapeAttr(preset.id)}">${escapeHtml(preset.label)}</button>`
  )).join('');
  return `
    <div class="environment-studio-camera-controls" aria-label="Preview camera controls">
      <div class="environment-studio-camera-row">
        ${presets}
        <button type="button" data-env-studio-camera-action="reset">Reset View</button>
      </div>
      <div class="environment-studio-camera-row">
        <button type="button" data-env-studio-camera-action="orbit-left">Rotate Left</button>
        <button type="button" data-env-studio-camera-action="orbit-right">Rotate Right</button>
        <button type="button" data-env-studio-camera-action="pan-left">Pan Left</button>
        <button type="button" data-env-studio-camera-action="pan-right">Pan Right</button>
        <button type="button" data-env-studio-camera-action="zoom-in">Zoom In</button>
        <button type="button" data-env-studio-camera-action="zoom-out">Zoom Out</button>
      </div>
      <label class="environment-studio-camera-slider">
        Vertical exaggeration
        <input id="env-studio-vertical-exaggeration" type="range" min="0.5" max="4" step="0.1" value="${escapeAttr(camera.verticalExaggeration ?? 1.6)}" data-env-studio-vertical-exaggeration />
        <span>${escapeHtml(formatNumber(camera.verticalExaggeration ?? 1.6))}x</span>
      </label>
    </div>
  `;
}

function bindEnvironmentStudioPreviewControls(scene, root) {
  root?.querySelectorAll?.('[data-env-studio-camera-preset]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.getAttribute('data-env-studio-camera-preset') ?? 'oblique';
      const patch = preset === 'topDown'
        ? { preset, pitchDegrees: 85, yawDegrees: 0, zoom: scene.session.previewCameraState?.zoom ?? 1 }
        : preset === 'crossSection'
          ? { preset, pitchDegrees: 32, yawDegrees: 0, zoom: scene.session.previewCameraState?.zoom ?? 1.15 }
          : { preset, pitchDegrees: 54, yawDegrees: -32, zoom: scene.session.previewCameraState?.zoom ?? 1 };
      scene.updatePreviewCamera(patch);
    });
  });
  root?.querySelectorAll?.('[data-env-studio-camera-action]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-env-studio-camera-action');
      const camera = scene.session.previewCameraState ?? {};
      if (action === 'reset') scene.updatePreviewCamera({ preset: 'oblique', yawDegrees: -32, pitchDegrees: 54, panX: 0, panY: 0, zoom: 1, verticalExaggeration: 1.6 });
      if (action === 'orbit-left') scene.updatePreviewCamera({ yawDegrees: Number(camera.yawDegrees ?? 0) - 18, preset: 'oblique' });
      if (action === 'orbit-right') scene.updatePreviewCamera({ yawDegrees: Number(camera.yawDegrees ?? 0) + 18, preset: 'oblique' });
      if (action === 'pan-left') scene.updatePreviewCamera({ panX: Number(camera.panX ?? 0) - 18 });
      if (action === 'pan-right') scene.updatePreviewCamera({ panX: Number(camera.panX ?? 0) + 18 });
      if (action === 'zoom-in') scene.updatePreviewCamera({ zoom: Number(camera.zoom ?? 1) + 0.2 });
      if (action === 'zoom-out') scene.updatePreviewCamera({ zoom: Number(camera.zoom ?? 1) - 0.2 });
    });
  });
  root?.querySelector?.('[data-env-studio-vertical-exaggeration]')?.addEventListener('input', (event) => {
    scene.updatePreviewCamera({ verticalExaggeration: Number(event.target.value) });
  });
}

function previewModeHtml(session = {}) {
  if (!session.tiles.length) return emptyPreviewHtml();
  if (session.previewMode === 'topDownDepthMap') {
    return `
      <section class="environment-studio-mode-panel">
        <h2>Top-Down Depth Map</h2>
        <p>Source grid diagnostic view. Source grid: ${escapeHtml(session.sourceGridShape.columns)} x ${escapeHtml(session.sourceGridShape.rows)}.</p>
        ${tilesPreviewHtml(session.tiles, session.mosaic)}
      </section>
    `;
  }
  if (session.previewMode === 'seamDiagnostics') return seamDiagnosticsHtml(session);
  if (session.previewMode === 'slopeDiagnostics') return diagnosticSummaryHtml(session, 'Slope Diagnostics', 'Slope warnings are heuristic gradients from generated public bathymetry.', 'canyonLikeGradientCount');
  if (session.previewMode === 'wetLandMask') return diagnosticSummaryHtml(session, 'Wet / Land Mask', 'Wet and land fractions are derived from bottomDepthMeters, not hidden truth.', 'wetFraction');
  if (session.previewMode === 'crossSectionProfile') return crossSectionHtml(session);
  if (session.previewMode === 'multiGliderSuitability') return suitabilityModeHtml(session);
  return terrainPreviewHtml(session);
}

function terrainPreviewHtml(session = {}) {
  const grid = compositePreviewGrid(session.tiles);
  return `
    <section class="environment-studio-terrain-preview" data-env-studio-terrain-preview>
      <h2>Regional 3D Bathymetry Preview</h2>
      <div class="environment-studio-preview-meta">
        ${metricHtml('Preview', '3D Bathymetry')}
        ${metricHtml('Source Grid', `${session.sourceGridShape.columns} x ${session.sourceGridShape.rows}`)}
        ${metricHtml('Preview Mesh', `${session.previewGridShape.columns} x ${session.previewGridShape.rows}`)}
        ${metricHtml('Decimation', `${session.previewDecimation.factor}x`)}
        ${metricHtml('Preview Budget', session.previewBudget?.label ?? 'Not measured')}
        ${metricHtml('Camera', `${labelize(session.previewCameraState?.preset ?? 'oblique')} ${formatNumber(session.previewCameraState?.verticalExaggeration ?? 1.6)}x`)}
        ${metricHtml('Depth Range', `0-${formatNumber(session.regionalFeatureSummary?.deepestBasinDepthMeters)} m`)}
      </div>
      ${terrainSvgHtml(grid, session)}
      <div class="environment-studio-depth-ramp" aria-label="Depth color ramp">
        <span style="background:${depthColor(8)}">shallow</span>
        <span style="background:${depthColor(90)}">shelf</span>
        <span style="background:${depthColor(180)}">slope</span>
        <span style="background:${depthColor(320)}">deep</span>
      </div>
      ${featureRecordButtonsHtml(session.featureRecords, session.selectedObject)}
      <p class="hud-muted">Continuous regional preview over the canonical 2.5D bottom surface h(x,y). Source grid export remains deterministic and reproducible.</p>
      <details class="environment-studio-source-diagnostics" data-env-studio-source-diagnostics>
        <summary>Source Tile Diagnostics</summary>
        <p class="hud-muted">Source tiles are provenance components used to assemble the synthetic regional surface. They are not depth slabs or water-column layers.</p>
        ${tilesPreviewHtml(session.tiles, session.mosaic)}
      </details>
    </section>
  `;
}

function terrainSvgHtml(grid = [], session = {}) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  if (!rows || !columns) return emptyPreviewHtml();
  const maxDepthInput = session.regionalFeatureSummary?.deepestBasinDepthMeters ?? session.domainSpec?.vertical?.maxDepthMeters ?? 320;
  const maxDepth = Math.max(1, Number(maxDepthInput) || 320);
  const camera = session.previewCameraState ?? {};
  const zoom = Math.max(0.6, Math.min(2.6, Number(camera.zoom ?? 1)));
  const verticalExaggeration = Math.max(0.5, Math.min(4, Number(camera.verticalExaggeration ?? 1.6)));
  const yaw = Number(camera.yawDegrees ?? -32) * Math.PI / 180;
  const topDown = camera.preset === 'topDown';
  const crossSection = camera.preset === 'crossSection';
  const panX = Number(camera.panX ?? 0);
  const panY = Number(camera.panY ?? 0);
  const rowStep = Math.max(1, Math.floor(rows / 18));
  const colStep = Math.max(1, Math.floor(columns / 28));
  const lines = [];
  const project = (x, y, depth) => {
    const nx = columns > 1 ? x / (columns - 1) - 0.5 : 0;
    const ny = rows > 1 ? y / (rows - 1) - 0.5 : 0;
    if (topDown) {
      return [
        70 + (nx + 0.5) * 580 * zoom + panX,
        52 + (ny + 0.5) * 250 * zoom + panY
      ];
    }
    const rx = nx * Math.cos(yaw) - ny * Math.sin(yaw);
    const ry = nx * Math.sin(yaw) + ny * Math.cos(yaw);
    return [
      360 + rx * 610 * zoom + panX,
      178 + ry * 250 * zoom - (depth / maxDepth) * 74 * verticalExaggeration + panY
    ];
  };
  for (let y = 0; y < rows; y += rowStep) {
    const points = [];
    let averageDepth = 0;
    let count = 0;
    for (let x = 0; x < columns; x += colStep) {
      const depth = Number(grid[y]?.[x] ?? 0);
      const [px, py] = project(x, y, depth);
      points.push(`${roundForSvg(px)},${roundForSvg(py)}`);
      averageDepth += depth;
      count += 1;
    }
    lines.push(`<polyline points="${points.join(' ')}" stroke="${depthColor(averageDepth / Math.max(1, count))}" />`);
  }
  for (let x = 0; x < columns; x += colStep) {
    const points = [];
    let averageDepth = 0;
    let count = 0;
    for (let y = 0; y < rows; y += rowStep) {
      const depth = Number(grid[y]?.[x] ?? 0);
      const [px, py] = project(x, y, depth);
      points.push(`${roundForSvg(px)},${roundForSvg(py)}`);
      averageDepth += depth;
      count += 1;
    }
    lines.push(`<polyline points="${points.join(' ')}" stroke="${depthColor(averageDepth / Math.max(1, count))}" />`);
  }
  const tileBoundary = topDown
    ? '<path d="M360 52 L360 302 M70 177 L650 177" stroke="rgba(255,255,255,0.34)" stroke-dasharray="5 5" />'
    : '<path d="M98 178 L622 178 M360 72 L360 300" stroke="rgba(255,255,255,0.26)" stroke-dasharray="5 5" />';
  const coastline = topDown
    ? '<path d="M82 58 C132 82 114 122 154 160 C118 208 146 254 102 296" stroke="#f8f4d8" stroke-width="3" fill="none" />'
    : '<path d="M124 116 C182 136 192 172 242 202 C190 226 218 264 158 294" stroke="#f8f4d8" stroke-width="3" fill="none" />';
  const crossSectionOverlay = crossSection
    ? '<path d="M76 178 L644 178" stroke="#f9e16c" stroke-width="3" stroke-dasharray="10 6" /><text x="84" y="168">cross-section overlay</text>'
    : '';
  const featureLabels = featureSvgLabels(session, project, columns, rows, maxDepth);
  return `
    <svg class="environment-studio-3d-svg" role="img" aria-label="3D bathymetry mesh preview" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="720" height="360" rx="8" fill="rgba(2, 8, 18, 0.82)" />
      ${coastline}
      ${tileBoundary}
      <g class="environment-studio-terrain-lines">${lines.join('')}</g>
      ${crossSectionOverlay}
      ${featureLabels}
      <line x1="520" y1="326" x2="650" y2="326" stroke="#f8f4d8" stroke-width="4" />
      <text x="520" y="318">scale bar</text>
      <text x="22" y="32">Regional 3D Bathymetry Preview</text>
      <text x="22" y="52">Vertical scale exaggerated for inspection only</text>
    </svg>
  `;
}

function featureRecordButtonsHtml(records = [], selected = {}) {
  if (!records.length) {
    return '<div class="hud-muted">Generate a regional mosaic to inspect shelf, basin, canyon, island, and ridge features.</div>';
  }
  return `
    <div class="environment-studio-feature-records" aria-label="Regional feature records">
      ${records.map((record) => `
        <button type="button" class="${selected?.type === 'feature' && selected.id === record.featureId ? 'active' : ''}" data-env-studio-select data-env-studio-select-type="feature" data-env-studio-select-id="${escapeAttr(record.featureId)}">
          <strong>${escapeHtml(record.label)}</strong>
          <span>${escapeHtml(labelize(record.type))} - ${escapeHtml(formatNumber(record.confidence))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function featureSvgLabels(session = {}, project, columns, rows, maxDepth) {
  const records = (session.featureRecords ?? []).slice(0, 7);
  if (!records.length) return '';
  const width = Math.max(1, Number(session.domainSpec?.horizontal?.widthMeters ?? 1));
  const height = Math.max(1, Number(session.domainSpec?.horizontal?.heightMeters ?? 1));
  return records.map((record) => {
    const x = (record.approximateCenterMeters?.eastMeters ?? width * 0.5) / width * Math.max(1, columns - 1);
    const y = (record.approximateCenterMeters?.northMeters ?? height * 0.5) / height * Math.max(1, rows - 1);
    const depth = Math.min(maxDepth, Math.max(0, Number(record.depthRangeMeters?.[1] ?? maxDepth) * 0.55));
    const [px, py] = project(x, y, depth);
    const selected = session.selectedObject?.type === 'feature' && session.selectedObject?.id === record.featureId;
    return `
      <g class="environment-studio-feature-label ${selected ? 'selected' : ''}">
        <circle cx="${roundForSvg(px)}" cy="${roundForSvg(py)}" r="${selected ? 7 : 5}" />
        <text x="${roundForSvg(px + 9)}" y="${roundForSvg(py - 7)}">${escapeHtml(record.label)}</text>
      </g>
    `;
  }).join('');
}

function seamDiagnosticsHtml(session = {}) {
  const seams = session.mosaic?.seamReport?.seams ?? [];
  return `
    <section class="environment-studio-mode-panel">
      <h2>Seam Diagnostics</h2>
      <p>Tile boundaries, seam warnings, and blend status. Shared edges are blended deterministically when the regional mosaic is generated.</p>
      <table class="environment-studio-table">
        <thead><tr><th>Seam</th><th>Status</th><th>Max Delta</th><th>Inspect</th></tr></thead>
        <tbody>
          ${seams.length ? seams.map((seam) => `
            <tr>
              <td>${escapeHtml(seam.fromTileId)} ${escapeHtml(seam.edgePair)} ${escapeHtml(seam.toTileId)}</td>
              <td>${escapeHtml(seam.passed ? 'PASS' : 'FAIL')}</td>
              <td>${escapeHtml(formatNumber(seam.maxDeltaMeters))} m</td>
              <td><button type="button" data-env-studio-select data-env-studio-select-type="seam" data-env-studio-select-id="${escapeAttr(localSeamId(seam))}">Inspect seam</button></td>
            </tr>
          `).join('') : '<tr><td colspan="4">Generate a mosaic to inspect seams.</td></tr>'}
        </tbody>
      </table>
      ${tilesPreviewHtml(session.tiles, session.mosaic)}
    </section>
  `;
}

function diagnosticSummaryHtml(session = {}, title = 'Diagnostics', copy = '', metricKey = 'wetFraction') {
  const value = session.regionalFeatureSummary?.[metricKey] ?? session.regionalFeatureSummary?.slopeRange?.maxMetersPerCell ?? 0;
  return `
    <section class="environment-studio-mode-panel">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(copy)}</p>
      <div class="cell-inspector-metrics">
        ${metricHtml(labelize(metricKey), formatNumber(value))}
        ${metricHtml('Feature Diversity', formatNumber(session.regionalFeatureSummary?.featureDiversityScore))}
        ${metricHtml('Wet Fraction', formatNumber(session.regionalFeatureSummary?.wetFraction))}
        ${metricHtml('Land Fraction', formatNumber(session.regionalFeatureSummary?.landFraction))}
      </div>
      ${tilesPreviewHtml(session.tiles, session.mosaic)}
    </section>
  `;
}

function crossSectionHtml(session = {}) {
  const grid = compositePreviewGrid(session.tiles);
  return `
    <section class="environment-studio-mode-panel">
      <h2>Cross-Section Profile</h2>
      <p>East-west and north-south centerlines show bottom depth, tile/feature transitions, and max-depth context.</p>
      <div class="environment-studio-cross-sections">
        ${profileSvgHtml(grid, 'East-West Centerline', 'ew')}
        ${profileSvgHtml(grid, 'North-South Centerline', 'ns')}
      </div>
    </section>
  `;
}

function profileSvgHtml(grid = [], label = 'Profile', direction = 'ew') {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  if (!rows || !columns) return '';
  const samples = [];
  const maxDepth = Math.max(1, ...grid.flat().map(Number).filter(Number.isFinite));
  const count = direction === 'ew' ? columns : rows;
  const fixed = direction === 'ew' ? Math.floor(rows / 2) : Math.floor(columns / 2);
  for (let index = 0; index < count; index += 1) {
    const depth = direction === 'ew' ? Number(grid[fixed]?.[index] ?? 0) : Number(grid[index]?.[fixed] ?? 0);
    const x = 12 + (index / Math.max(1, count - 1)) * 316;
    const y = 24 + (depth / maxDepth) * 116;
    samples.push(`${roundForSvg(x)},${roundForSvg(y)}`);
  }
  return `
    <svg class="environment-studio-profile-svg" role="img" aria-label="${escapeAttr(label)}" viewBox="0 0 340 160">
      <rect x="0" y="0" width="340" height="160" rx="8" fill="rgba(2, 8, 18, 0.76)" />
      <polyline points="${samples.join(' ')}" />
      <text x="12" y="18">${escapeHtml(label)}</text>
      <text x="12" y="150">shallow</text>
      <text x="260" y="150">deep ${escapeHtml(formatNumber(maxDepth))} m</text>
    </svg>
  `;
}

function suitabilityModeHtml(session = {}) {
  return `
    <section class="environment-studio-mode-panel">
      <h2>Multi-Glider Suitability</h2>
      ${suitabilityHtml(session.multiGliderSuitability)}
      ${featureSummaryHtml(session.regionalFeatureSummary)}
    </section>
  `;
}

function tilesPreviewHtml(tiles = [], mosaic = null) {
  const classes = mosaic?.manifest ? 'environment-studio-mosaic-preview' : 'environment-studio-single-tile-preview';
  return `
    <div class="${classes}">
      ${tiles.map((tile) => tilePreviewHtml(tile)).join('')}
    </div>
  `;
}

function tilePreviewHtml(tile = {}) {
  const grid = tile.bottomDepthPreview ?? [];
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return `
    <article class="environment-studio-tile-preview" data-env-studio-tile-id="${escapeAttr(tile.id)}" data-env-studio-select data-env-studio-select-type="tile" data-env-studio-select-id="${escapeAttr(tile.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeAttr(tile.id)}">
      <header>
        <strong>${escapeHtml(tile.id)}</strong>
        <span>${escapeHtml(tile.manifest?.cells?.columns ?? columns)} x ${escapeHtml(tile.manifest?.cells?.rows ?? rows)} - ${escapeHtml(tile.featureRole ?? tile.archetypeId)}</span>
      </header>
      <div class="environment-studio-depth-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
        ${grid.flatMap((row) => row.map((depth) => `<span style="background:${depthColor(depth)}" title="${escapeAttr(formatNumber(depth))} m"></span>`)).join('')}
      </div>
      <footer>
        <span>Wet ${escapeHtml(tile.diagnostics?.wetCellCount ?? 0)}</span>
        <span>Max ${escapeHtml(formatNumber(tile.diagnostics?.maxDepthMeters))} m</span>
      </footer>
    </article>
  `;
}

function emptyPreviewHtml() {
  return `
    <article class="environment-studio-empty-preview">
      <h2>No Region Generated</h2>
      <p>Use Regenerate all to create a deterministic multi-archetype regional bathymetry preview. No hidden truth, current regeneration, scalar regeneration, or scoring change occurs.</p>
    </article>
  `;
}

function compositePreviewGrid(tiles = []) {
  if (!tiles.length) return [];
  if (tiles.length === 1) return tiles[0].bottomDepthPreview ?? [];
  const byPosition = new Map(tiles.map((tile) => [`${tile.manifest?.tileCoordinate?.row ?? 0}:${tile.manifest?.tileCoordinate?.column ?? 0}`, tile.bottomDepthPreview ?? []]));
  const nw = byPosition.get('0:0') ?? [];
  const ne = byPosition.get('0:1') ?? [];
  const sw = byPosition.get('1:0') ?? [];
  const se = byPosition.get('1:1') ?? [];
  const topRows = Math.max(nw.length, ne.length);
  const bottomRows = Math.max(sw.length, se.length);
  const top = Array.from({ length: topRows }, (_row, y) => [...(nw[y] ?? []), ...(ne[y] ?? [])]);
  const bottom = Array.from({ length: bottomRows }, (_row, y) => [...(sw[y] ?? []), ...(se[y] ?? [])]);
  return [...top, ...bottom];
}

function featureSummaryHtml(summary = {}) {
  return `
    <div class="environment-studio-summary-grid">
      ${metricHtml('Land fraction', formatNumber(summary.landFraction))}
      ${metricHtml('Wet fraction', formatNumber(summary.wetFraction))}
      ${metricHtml('Shallow shelf', formatNumber(summary.shallowShelfFraction))}
      ${metricHtml('Deep water', formatNumber(summary.deepWaterFraction))}
      ${metricHtml('Deepest basin', `${formatNumber(summary.deepestBasinDepthMeters)} m`)}
      ${metricHtml('Coastline estimate', `${formatNumber(summary.coastlineLengthEstimateMeters)} m`)}
      ${metricHtml('Canyon gradients', summary.canyonLikeGradientCount ?? 0)}
      ${metricHtml('Island / seamount', summary.islandSeamountCount ?? 0)}
      ${metricHtml('Connected water', formatNumber(summary.navigableConnectedWaterFraction))}
      ${metricHtml('Feature diversity', formatNumber(summary.featureDiversityScore))}
    </div>
    <p class="hud-muted">Feature summary is a mission-design heuristic, not official science validation.</p>
  `;
}

function suitabilityHtml(suitability = {}) {
  const checks = suitability.checks ?? [];
  return `
    <div class="environment-studio-suitability environment-studio-suitability-${escapeAttr(String(suitability.status ?? 'warn').toLowerCase())}">
      <strong>${escapeHtml(suitability.status ?? 'WARN')}</strong>
      <span>${escapeHtml(suitability.summary ?? 'Generate regional bathymetry to evaluate mission suitability.')}</span>
    </div>
    <div class="environment-studio-validation-list">
      ${checks.map((check) => `<button type="button" data-env-studio-select data-env-studio-select-type="validationIssue" data-env-studio-select-id="warning:${escapeAttr(check.id)}"><strong>${escapeHtml(check.passed ? 'PASS' : 'WARN')}</strong><span>${escapeHtml(labelize(check.id))}: ${escapeHtml(check.value)}</span></button>`).join('')}
    </div>
  `;
}

function inspectorPropertiesHtml(inspector = {}) {
  const rows = inspector.properties ?? [];
  return `
    <table class="environment-studio-table">
      <thead><tr><th>Property</th><th>Value</th></tr></thead>
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value ?? 'n/a')}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function inspectorActionsHtml(inspector = {}) {
  const actions = inspector.actions ?? [];
  if (!actions.length) return '';
  return `
    <div class="environment-studio-action-list">
      ${actions.map((action) => `<button type="button" ${action.enabled ? '' : 'disabled'} title="${escapeAttr(action.reason ?? '')}">${escapeHtml(action.label)}${action.enabled ? '' : ' - planned'}</button>`).join('')}
    </div>
  `;
}

function fieldRegenerationSummaryHtml(result = null) {
  if (!result?.currentArtifactDigest) {
    return '<div class="hud-muted">Currents, scalar science field, and hotspots have not been regenerated for this region yet.</div>';
  }
  const currentDiagnostics = result.currentDiagnostics ?? {};
  const scalarDiagnostics = result.scalarDiagnostics ?? {};
  return `
    <div class="cell-inspector-metrics">
      ${metricHtml('Field regen', shortDigest(result.fieldRegenerationDigest))}
      ${metricHtml('Current artifact', shortDigest(result.currentArtifactDigest))}
      ${metricHtml('Scalar artifact', shortDigest(result.scalarArtifactDigest))}
      ${metricHtml('Hotspots', `${result.hotspotArtifact?.hotspots?.length ?? 0} / ${shortDigest(result.hotspotArtifactDigest)}`)}
      ${metricHtml('Mean speed', formatNumber(currentDiagnostics.speedMean))}
      ${metricHtml('Max speed', formatNumber(currentDiagnostics.speedMaximum))}
      ${metricHtml('Divergence RMS', formatNumber(currentDiagnostics.divergenceRms))}
      ${metricHtml('Land vectors', currentDiagnostics.landVectorCount ?? 0)}
      ${metricHtml('Below-bottom vectors', currentDiagnostics.belowBottomVectorCount ?? 0)}
      ${metricHtml('Scalar mean', formatNumber(scalarDiagnostics.scalarMean))}
      ${metricHtml('Depth variation', formatNumber(scalarDiagnostics.depthMeanRange))}
      ${metricHtml('Start/drop candidates', result.startDropZoneCandidates?.candidates?.length ?? 0)}
    </div>
    <p class="hud-muted">Atlas-conditioned package artifacts are synthetic and compactly recorded here. Starts/drop zones still need validation; launch and scoring are unchanged.</p>
  `;
}

function dependencyGraphTable(graph = {}) {
  const nodes = dependencyRows(graph);
  return `
    <table class="environment-studio-table">
      <thead><tr><th>Artifact</th><th>State</th><th>Digest</th></tr></thead>
      <tbody>
        ${nodes.map((node) => `
          <tr data-env-studio-select data-env-studio-select-type="dependency" data-env-studio-select-id="${escapeAttr(node.id)}" tabindex="0" role="button">
            <td>${escapeHtml(labelize(node.id))}</td>
            <td><span class="environment-studio-state environment-studio-state-${escapeAttr(String(node.state).toLowerCase())}">${escapeHtml(node.state)}</span></td>
            <td>${escapeHtml(shortDigest(node.artifactDigest))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function dependencyRows(graph = {}) {
  const nodes = graph.nodes ?? {};
  const bathymetryState = nodes.bathymetryArtifact?.state ?? 'NOT_GENERATED';
  const bathymetryDigest = nodes.bathymetryArtifact?.artifactDigest ?? null;
  const generated = bathymetryState === 'CURRENT';
  return [
    { id: 'bathymetryTiles', ...(nodes.bathymetryTiles ?? {}) },
    { id: 'bathymetryArtifact', ...(nodes.bathymetryArtifact ?? {}) },
    { id: 'wetLandMask', state: generated ? 'CURRENT' : 'NOT_GENERATED', artifactDigest: bathymetryDigest, ...(nodes.wetLandMask ?? {}) },
    { id: 'coastline', state: generated ? 'CURRENT' : 'NOT_GENERATED', artifactDigest: bathymetryDigest, ...(nodes.coastline ?? {}) },
    { id: 'currentArtifact', ...(nodes.currentArtifact ?? {}) },
    { id: 'scalarArtifact', ...(nodes.scalarArtifact ?? {}) },
    { id: 'hotspots', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.hotspots ?? {}) },
    { id: 'hazards', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null },
    { id: 'startsDropZones', state: generated ? 'NEEDS_VALIDATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.startsDropZones ?? {}) },
    { id: 'benchmarkBundle', state: generated ? 'REQUIRES_REGENERATION' : 'NOT_GENERATED', artifactDigest: null, ...(nodes.benchmarkBundle ?? {}) },
    { id: 'environmentArtifact', ...(nodes.environmentArtifact ?? {}) },
    { id: 'validationReport', ...(nodes.validationReport ?? {}) },
    { id: 'preview', ...(nodes.preview ?? {}) }
  ].map((row) => ({ id: row.id, state: row.state ?? 'NOT_GENERATED', artifactDigest: row.artifactDigest ?? null, reason: row.reason ?? null }));
}

function validationListHtml(report = {}) {
  const errors = report.errors ?? [];
  const warnings = report.warnings ?? [];
  const rows = [
    ...errors.map((message) => ({ kind: 'Failure', message })),
    ...warnings.slice(0, 8).map((message) => ({ kind: 'Warning', message }))
  ];
  if (!rows.length) return '<div class="hud-muted">Validation has no failures or warnings.</div>';
  return `
    <div class="environment-studio-validation-list">
      ${rows.map((row, index) => `<button type="button" data-env-studio-select data-env-studio-select-type="validationIssue" data-env-studio-select-id="${row.kind === 'Failure' ? 'error' : 'warning'}:${index}"><strong>${escapeHtml(row.kind)}</strong><span>${escapeHtml(row.message)}</span></button>`).join('')}
    </div>
  `;
}

function numberInput(label, id, value, min, max, step) {
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <input id="${escapeAttr(id)}" type="number" min="${escapeAttr(min)}" max="${escapeAttr(max)}" step="${escapeAttr(step)}" value="${escapeAttr(formatInputNumber(value))}" />
    </label>
  `;
}

function selectInput(label, id, selectedValue, options = []) {
  return `
    <label class="compact-field">
      ${escapeHtml(label)}
      <select id="${escapeAttr(id)}">
        ${options.map((option) => `<option value="${escapeAttr(option.id)}" ${option.id === selectedValue ? 'selected' : ''} ${option.enabled === false ? 'disabled' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
}

function levelSelect(label, id, selectedValue) {
  return selectInput(label, id, selectedValue, [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' }
  ]);
}

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'n/a')}</strong></div>`;
}

function estimatedCostLabel(sourceCells, previewCells) {
  const source = Number(sourceCells) || 0;
  const preview = Number(previewCells) || 0;
  if (source > 50000 || preview > 2200) return 'high but bounded';
  if (source > 15000 || preview > 1000) return 'moderate';
  return 'low';
}

function localSeamId(seam = {}) {
  return `${seam.fromTileId}:${seam.edgePair}:${seam.toTileId}`;
}

function roundForSvg(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10) : '0';
}

function archetypeDescription(id) {
  return ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.find((entry) => entry.id === id)?.description ?? 'Synthetic public-safe bathymetry archetype.';
}

function depthColor(depth) {
  const value = Number(depth);
  if (!Number.isFinite(value) || value <= 0) return '#3d4931';
  const t = Math.min(1, Math.max(0, value / 320));
  if (t < 0.18) return '#38a7a3';
  if (t < 0.42) return '#24759b';
  if (t < 0.68) return '#174c85';
  return '#0d2454';
}

function formatInputNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 1000) / 1000) : '0';
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10) : 'n/a';
}

function shortDigest(value) {
  const text = String(value ?? '');
  return text ? text.replace(/^fnv1a32:/, '') : 'none';
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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
