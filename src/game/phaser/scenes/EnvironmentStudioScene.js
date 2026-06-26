import { markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import {
  ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES,
  ENVIRONMENT_STUDIO_DOMAIN_PROFILES,
  buildEnvironmentStudioProject,
  createEnvironmentStudioMosaic,
  createEnvironmentStudioSession,
  domainProfileById,
  environmentStudioDebugPayload,
  environmentStudioSessionSummary,
  generateEnvironmentStudioTile,
  importEnvironmentStudioProject,
  patchEnvironmentStudioDomain,
  refreshEnvironmentStudioSession,
  setEnvironmentStudioArchetype,
  validateEnvironmentStudioProject
} from '../../../core/editor/EnvironmentStudioProject.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export const ENVIRONMENT_STUDIO_SCENE_VERSION = 'environment-studio-scene-r1';

export class EnvironmentStudioScene extends PhaserScene {
  constructor() {
    super('EnvironmentStudioScene');
    this.objects = [];
    this.session = createEnvironmentStudioSession();
    this.statusMessage = 'Choose a domain and generate a public synthetic bathymetry tile.';
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
    const summary = environmentStudioSessionSummary(this.session);
    this.app.setPanel(`
      <section class="console-header">
        <div class="console-kicker">Simulation Lab / Environment Studio</div>
        <h1>Environment Studio</h1>
        <p>Author reproducible synthetic environment artifacts with validation before any launch adapter exists.</p>
      </section>
      <section class="console-status">
        <span>Status</span>
        <strong>${escapeHtml(summary.validationStatus)}</strong>
        <small>${escapeHtml(this.statusMessage)}</small>
      </section>
      ${this.lastError ? `<section class="console-section" data-keep-title="true"><h2>Warning</h2><div class="hud-muted">${escapeHtml(this.lastError)}</div></section>` : ''}
      <section class="console-section" data-keep-title="true" data-accordion-key="domain-resolution">
        <h2>Domain / Resolution</h2>
        <label class="compact-field">
          Profile
          <select id="env-studio-profile" data-env-studio-profile>
            ${ENVIRONMENT_STUDIO_DOMAIN_PROFILES.map((profile) => `<option value="${escapeAttr(profile.id)}" ${profile.id === this.session.profileId ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('')}
            <option value="custom" ${this.session.profileId === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </label>
        ${numberInput('Width m', 'env-studio-width', this.session.domainSpec.horizontal.widthMeters, 1000, 200000, 1000)}
        ${numberInput('Height m', 'env-studio-height', this.session.domainSpec.horizontal.heightMeters, 1000, 200000, 1000)}
        ${numberInput('Cell m', 'env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters, 100, 5000, 100)}
        ${numberInput('Max depth m', 'env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters, 20, 1000, 10)}
        ${numberInput('Duration s', 'env-studio-duration', this.session.domainSpec.time.durationSeconds, 300, 86400, 300)}
        ${numberInput('dt s', 'env-studio-dt', this.session.domainSpec.time.dtSeconds, 30, 3600, 30)}
        <div class="cell-inspector-metrics">
          ${metricHtml('Grid', `${summary.domain.columns} x ${summary.domain.rows}`)}
          ${metricHtml('Cells', summary.domain.cellCount)}
          ${metricHtml('Domain Digest', shortDigest(summary.domainDigest))}
        </div>
        <button class="console-button primary" type="button" data-action="env-studio-apply-domain">Apply Domain</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="bathymetry-generator">
        <h2>Bathymetry Generator</h2>
        <label class="compact-field">
          Archetype
          <select id="env-studio-archetype" data-env-studio-archetype>
            ${ENVIRONMENT_STUDIO_BATHYMETRY_ARCHETYPES.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === this.session.archetypeId ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        <label class="compact-field">
          Seed
          <input id="env-studio-seed" data-env-studio-seed type="text" value="${escapeAttr(this.session.seed)}" />
        </label>
        <div class="hud-muted">${escapeHtml(archetypeDescription(this.session.archetypeId))}</div>
        <button class="console-button primary" type="button" data-action="env-studio-generate-tile">Generate Compact Tile</button>
        <button class="console-button secondary" type="button" data-action="env-studio-create-mosaic">Create 2x2 Mosaic</button>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="validation">
        <h2>Validation</h2>
        <div class="cell-inspector-metrics">
          ${metricHtml('Status', this.session.validationReport?.status ?? 'EMPTY')}
          ${metricHtml('Warnings', this.session.validationReport?.warnings?.length ?? 0)}
          ${metricHtml('Failures', this.session.validationReport?.errors?.length ?? 0)}
          ${metricHtml('Report Digest', shortDigest(this.session.validationReport?.validationReportDigest))}
        </div>
        <div class="hud-muted">Synthetic, public-safe artifacts only. Not calibrated survey data, not an operational forecast, and not certified for navigation.</div>
      </section>
      <section class="console-section" data-keep-title="true" data-accordion-key="import-export">
        <h2>Import / Export</h2>
        <button class="console-button primary" type="button" data-action="env-studio-export-project">Export Project JSON</button>
        <label class="console-button secondary" for="env-studio-import-file">Import Project JSON</label>
        <input id="env-studio-import-file" type="file" accept="application/json,.json" hidden data-env-studio-import />
        <button class="console-button secondary" type="button" disabled data-action="env-studio-launch-planning">Launch to Planning deferred to ENV-STUDIO-R1.1</button>
        <button class="console-button secondary" type="button" data-action="menu">Main Menu</button>
      </section>
    `);

    const root = this.app.elements?.consoleRoot ?? globalThis.document;
    root?.querySelector?.('[data-env-studio-profile]')?.addEventListener('change', (event) => this.applyProfile(event.target.value));
    root?.querySelector?.('[data-env-studio-archetype]')?.addEventListener('change', (event) => this.updateArchetype(event.target.value));
    root?.querySelector?.('[data-action="env-studio-apply-domain"]')?.addEventListener('click', () => this.applyDomainControls());
    root?.querySelector?.('[data-action="env-studio-generate-tile"]')?.addEventListener('click', () => this.generateTile());
    root?.querySelector?.('[data-action="env-studio-create-mosaic"]')?.addEventListener('click', () => this.createMosaic());
    root?.querySelector?.('[data-action="env-studio-export-project"]')?.addEventListener('click', () => this.exportProject());
    root?.querySelector?.('[data-env-studio-import]')?.addEventListener('change', (event) => this.importProject(event.target.files?.[0]));
    root?.querySelector?.('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
  }

  renderRightPanel() {
    const root = this.app.elements?.waypointTimelineRoot;
    if (!root) return;
    const project = buildEnvironmentStudioProject(this.session);
    root.innerHTML = `
      <section class="waypoint-shell environment-studio-right-panel" id="env-studio-status-panel">
        <div class="console-kicker">Generated Field Status</div>
        <h2>Environment Studio</h2>
        <p class="hud-muted">Dependency state tracks what is current, stale, not generated, or deferred. It does not alter mission simulation.</p>
        <div class="cell-inspector-metrics">
          ${metricHtml('Tiles', this.session.tiles.length)}
          ${metricHtml('Mosaic', this.session.mosaic?.manifest ? '2 x 2' : 'none')}
          ${metricHtml('Project Digest', shortDigest(project.projectDigest))}
        </div>
        ${dependencyGraphTable(this.session.dependencyGraph)}
        ${validationListHtml(this.session.validationReport)}
      </section>
    `;
  }

  renderPreview() {
    if (!this.previewHost) return;
    const project = buildEnvironmentStudioProject(this.session);
    this.previewHost.innerHTML = `
      <main id="environment-studio-route" class="environment-studio-route">
        <header class="environment-studio-route-header">
          <div>
            <p class="console-kicker">Unified Environment Studio</p>
            <h1>${escapeHtml(project.label)}</h1>
            <p>Domain, bathymetry tile, mosaic validation, dependency state, and project export.</p>
          </div>
          <div class="environment-studio-digest">
            <span>Project Digest</span>
            <strong>${escapeHtml(shortDigest(project.projectDigest))}</strong>
          </div>
        </header>
        <section class="environment-studio-preview-grid" aria-label="Bathymetry preview">
          ${this.session.tiles.length ? tilesPreviewHtml(this.session.tiles, this.session.mosaic) : emptyPreviewHtml()}
        </section>
        <section class="environment-studio-boundary">
          <strong>Boundary</strong>
          <span>Public synthetic authoring preview. No hidden truth, no mission launch adapter, no scoring changes.</span>
        </section>
      </main>
    `;
  }

  applyProfile(profileId) {
    if (profileId === 'custom') {
      this.session = { ...this.session, profileId: 'custom' };
      this.render();
      return;
    }
    const profile = domainProfileById(profileId);
    this.session = createEnvironmentStudioSession({
      profileId: profile.id,
      label: profile.label,
      seed: this.readSeed(),
      archetypeId: this.readArchetype()
    });
    this.statusMessage = `Applied ${profile.label} domain profile.`;
    this.lastError = null;
    this.render();
  }

  applyDomainControls() {
    this.session = patchEnvironmentStudioDomain(this.session, {
      label: this.session.label,
      widthMeters: this.numberValue('env-studio-width', this.session.domainSpec.horizontal.widthMeters),
      heightMeters: this.numberValue('env-studio-height', this.session.domainSpec.horizontal.heightMeters),
      cellSizeMeters: this.numberValue('env-studio-cell-size', this.session.domainSpec.horizontal.cellSizeMeters),
      maxDepthMeters: this.numberValue('env-studio-max-depth', this.session.domainSpec.vertical.maxDepthMeters),
      durationSeconds: this.numberValue('env-studio-duration', this.session.domainSpec.time.durationSeconds),
      dtSeconds: this.numberValue('env-studio-dt', this.session.domainSpec.time.dtSeconds)
    });
    this.session = { ...this.session, profileId: 'custom' };
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
      this.session = setEnvironmentStudioArchetype(this.session, this.readArchetype(), { seed: this.readSeed() });
      this.session = createEnvironmentStudioMosaic(this.session, { seed: this.readSeed(), archetypeId: this.readArchetype() });
      this.statusMessage = 'Created deterministic 2x2 bathymetry mosaic with seam validation.';
      this.lastError = null;
    } catch (error) {
      this.lastError = error?.message ?? String(error);
      this.statusMessage = 'Mosaic generation failed.';
    }
    this.render();
  }

  exportProject() {
    const project = buildEnvironmentStudioProject(this.session);
    downloadJSON('anchor_environment_studio_project.json', project);
    this.statusMessage = 'Exported Environment Studio project JSON.';
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

  numberValue(id, fallback) {
    const value = Number(this.app.elements?.consoleRoot?.querySelector?.(`#${id}`)?.value);
    return Number.isFinite(value) ? value : fallback;
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
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false
    };
  }
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
    <article class="environment-studio-tile-preview" data-env-studio-tile-id="${escapeAttr(tile.id)}">
      <header>
        <strong>${escapeHtml(tile.id)}</strong>
        <span>${escapeHtml(tile.manifest?.cells?.columns ?? columns)} x ${escapeHtml(tile.manifest?.cells?.rows ?? rows)}</span>
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
      <h2>No Tile Generated</h2>
      <p>Use Generate Compact Tile or Create 2x2 Mosaic. The preview is a static public visualization of generated bathymetry artifacts.</p>
    </article>
  `;
}

function dependencyGraphTable(graph = {}) {
  const nodes = Object.values(graph.nodes ?? {});
  return `
    <table class="environment-studio-table">
      <thead><tr><th>Artifact</th><th>State</th><th>Digest</th></tr></thead>
      <tbody>
        ${nodes.map((node) => `
          <tr>
            <td>${escapeHtml(labelize(node.id))}</td>
            <td><span class="environment-studio-state environment-studio-state-${escapeAttr(String(node.state).toLowerCase())}">${escapeHtml(node.state)}</span></td>
            <td>${escapeHtml(shortDigest(node.artifactDigest))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
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
      ${rows.map((row) => `<div><strong>${escapeHtml(row.kind)}</strong><span>${escapeHtml(row.message)}</span></div>`).join('')}
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

function metricHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'n/a')}</strong></div>`;
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
