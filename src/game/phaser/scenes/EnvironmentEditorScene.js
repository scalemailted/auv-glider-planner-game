import { generateLevel } from '../../../core/generation/LevelGenerator.js';
import { DIFFICULTY_PRESETS } from '../../../core/generation/DifficultyPresets.js';
import { downloadJSON, readJSONFile } from '../../../core/io/ImportExport.js';
import { ensureLevelIdentity, shortInstanceId } from '../../../core/identity/GameInstanceId.js';
import { drawMissionMap, pointerToCell } from '../PhaserCoreAdapter.js';
import { saveLevelToRegistry } from '../../../core/storage/LevelRegistry.js';
import { FLUID_PRESETS } from '../../../core/fluids/FluidPresets.js';
import { generateFluidCurrentFrames } from '../../../core/fluids/FluidPresets.js';
import { computeCurrentFrameSetStats, computeCurrentMagnitudeStats, summarizeCurrentField } from '../../../core/fluids/FluidFieldStats.js';
import { createSeededRandom } from '../../../core/generation/Random.js';
import { repairDeploymentConnectivity } from '../../../core/generation/ConnectivityRepair.js';
import { validateGeneratedLevelConnectivity } from '../../../core/validation/ConnectivityValidator.js';
import { makeForecastEnsembleFromTruth, makeForecastFromTruth } from '../../../core/generation/ForecastGenerator.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import { beginScenario } from '../../../core/scenario/ScenarioState.js';
import { EXPERIENCE_MODES } from '../../../core/experience/ExperienceMode.js';
import { buildChallengeExport } from '../../../core/io/ChallengeExporter.js';
import { buildLeaderboardExport } from '../../../core/io/LeaderboardExporter.js';
import { loadLeaderboard, normalizeLeaderboard } from '../../../core/storage/LeaderboardStore.js';
import { EditorHud } from '../ui/EditorHud.js';
import { VectorBrushPreview } from '../ui/VectorBrushPreview.js';
import { PhaserButton } from '../ui/Button.js';
import {
  applyEditorCellBrush,
  buildDefaultMissionForLevel,
  copyCurrentFrameToAll,
  editCurrentVector,
  normalizeLevelForEditor,
  updateLevelTime,
  updateMissionAgents
} from '../../../core/editor/LevelEditOperations.js';

const BRUSHES = ['terrain', 'hazard', 'depth', 'shallow', 'clear', 'roi', 'deploymentZone', 'base', 'agentStart', 'current'];
const CURRENT_PATTERNS = ['wave', 'uniform', 'corridor', 'vortex', 'eddies', 'fluid'];
const CURRENT_TOOLS = ['directional', 'vortex', 'corridor', 'calm'];

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class EnvironmentEditorScene extends PhaserScene {
  constructor() {
    super('EnvironmentEditorScene');
    this.brush = 'terrain';
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.state.mode = 'editor';
    this.app.setDebriefFullscreen(false);
    this.app.setSceneLabel('Environment Editor');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.app.clearPanels();
    this.level = normalizeLevelForEditor(this.app.state.customLevel ?? this.app.state.level ?? generateLevel({ difficulty: 'medium', seed: 1001 }));
    this.mission = updateMissionAgents(this.app.state.mission ?? buildDefaultMissionForLevel(this.level), this.level, {});
    this.frameIndex = 0;
    this.editorToolState = {
      radius: clampNumber(this.level.meta?.editorConfig?.radius ?? 1, 1, 8),
      intensity: clampNumber(this.level.meta?.editorConfig?.intensity ?? 0.45, 0.1, 5)
    };
    this.pointerStartCell = null;
    this.graphics = this.add.graphics();
    this.currentPreviewGraphics = this.add.graphics();
    this.currentPreviewTexts = [];
    this.currentPreviewControls = [];
    this.currentPreview = buildEmptyCurrentPreview();
    this.previewScrubActive = false;
    this.previewScrubTrack = null;
    this.vectorBrushPreview = new VectorBrushPreview(this);
    this.input.mouse?.disableContextMenu?.();
    this.renderPanel();
    this.editorHud = new EditorHud(this);
    this.refreshMap();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.keyboard?.on('keydown-ESC', this.cancelVectorPreview, this);
  }

  renderPanel() {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Environment Editor</div>
        <h1>Environment Editor</h1>
        <p class="small id-line">Level ${this.level.levelId} | Instance ${shortInstanceId(this.level)} | Seed ${this.level.meta?.seed ?? 'N/A'}</p>
      </section>
      <section class="console-status" data-accordion-key="editor-status">
        <span>Editor Status</span>
        <strong>${escapeHtml(this.brush)} brush</strong>
        <small id="level-editor-status">Frame ${this.frameIndex}: click cells to edit layers. For current brush, drag from a cell to set flow direction.</small>
      </section>
      <section class="console-section" data-accordion-key="level-setup">
      <h2>Level Setup</h2>
      <div class="coordinate-grid">
        <label>Width <input id="level-width" type="number" min="8" max="32" value="${this.level.world?.grid?.width ?? 12}" /></label>
        <label>Height <input id="level-height" type="number" min="8" max="32" value="${this.level.world?.grid?.height ?? 12}" /></label>
        <label>Seed <input id="level-seed" type="text" value="${this.level.meta?.seed ?? 1001}" /></label>
        <label>Difficulty <select id="difficulty">${Object.keys(DIFFICULTY_PRESETS).map((key) => `<option value="${key}" ${key === (this.level.meta?.difficulty ?? 'medium') ? 'selected' : ''}>${key}</option>`).join('')}</select></label>
        <label>Duration <input id="level-duration" type="number" min="1" max="200" value="${this.level.world?.time?.duration ?? 24}" /></label>
        <label>dt <input id="level-dt" type="number" min="0.1" max="24" step="0.1" value="${this.level.world?.time?.dt ?? 1}" /></label>
        <label>Planning window <input id="planning-window" type="number" min="0.1" max="48" step="0.1" value="${this.level.world?.time?.planningWindow ?? 3}" /></label>
        <label>Current pattern <select id="current-pattern">${CURRENT_PATTERNS.map((key) => `<option value="${key}" ${key === (this.level.meta?.generationConfig?.currentPattern ?? 'wave') ? 'selected' : ''}>${labelize(key)}</option>`).join('')}</select></label>
        <label>Fluid preset <select id="fluid-preset">${FLUID_PRESETS.map((key) => `<option value="${key}" ${key === (this.level.meta?.generationConfig?.fluidPreset ?? 'eddyField') ? 'selected' : ''}>${labelize(key)}</option>`).join('')}</select></label>
        <label>Current strength <input id="current-strength" type="number" min="0" max="3" step="0.05" value="${this.level.meta?.generationConfig?.currentStrength ?? 0.9}" /></label>
        <label>Fluid viscosity <input id="fluid-viscosity" type="number" min="0" max="0.01" step="0.0001" value="${this.level.meta?.generationConfig?.fluidViscosity ?? 0.0008}" /></label>
        <label>Fluid iterations <input id="fluid-iterations" type="number" min="1" max="32" value="${this.level.meta?.generationConfig?.fluidIterations ?? 8}" /></label>
        <label>Vorticity <input id="fluid-vorticity" type="number" min="0" max="0.5" step="0.01" value="${this.level.meta?.generationConfig?.fluidVorticityConfinement ?? 0.08}" /></label>
        <label>Frame <input id="editor-frame" type="range" min="0" max="${Math.max(0, (this.level.layers.truth?.frames?.length ?? 1) - 1)}" value="${this.frameIndex}" /></label>
        <label>Scope <select id="frame-scope">
          <option value="current">Current frame</option>
          <option value="all">All frames</option>
        </select></label>
        <label>Current tool <select id="current-tool">${CURRENT_TOOLS.map((key) => `<option value="${key}">${labelize(key)}</option>`).join('')}</select></label>
        <label>Brush intensity <input id="brush-intensity" type="number" min="0.1" max="5" step="0.1" value="${this.editorToolState?.intensity ?? 0.45}" /></label>
        <label>Brush radius <input id="brush-radius" type="number" min="1" max="8" step="1" value="${this.editorToolState?.radius ?? 1}" /></label>
        <label>Agents <input id="agent-count" type="number" min="1" max="4" value="${this.mission.agents?.length ?? 1}" /></label>
        <label>Battery <input id="agent-battery" type="number" min="1" max="500" value="${this.mission.agents?.[0]?.battery ?? 100}" /></label>
        <label>Max speed <input id="agent-speed" type="number" min="0.1" max="5" step="0.05" value="${this.mission.agents?.[0]?.maxSpeed ?? 1.25}" /></label>
        <label>End condition <select id="end-condition-mode">
          ${['none', 'surface', 'communication', 'recovery', 'pickup', 'return'].map((mode) => `<option value="${mode}" ${mode === (this.mission.rules?.endCondition?.mode ?? 'none') ? 'selected' : ''}>${labelize(mode)}</option>`).join('')}
        </select></label>
        <label>Recovery required <select id="end-condition-required">
          <option value="false" ${this.mission.rules?.endCondition?.requiredByMissionEnd ? '' : 'selected'}>No</option>
          <option value="true" ${this.mission.rules?.endCondition?.requiredByMissionEnd ? 'selected' : ''}>Yes</option>
        </select></label>
        <label>Recovery bonus <input id="end-condition-bonus" type="number" step="1" value="${this.mission.rules?.endCondition?.bonus ?? 0}" /></label>
        <label>Recovery penalty <input id="end-condition-penalty" type="number" step="1" value="${this.mission.rules?.endCondition?.penalty ?? 0}" /></label>
        <label>Sampling mode <select id="sampling-mode">
          ${['unique', 'diminishing', 'cooldown', 'persistent'].map((mode) => `<option value="${mode}" ${mode === (this.mission.rules?.sampling?.mode ?? 'unique') ? 'selected' : ''}>${labelize(mode)}</option>`).join('')}
        </select></label>
        <label>Duplicate multiplier <input id="duplicate-multiplier" type="number" min="0" max="1" step="0.05" value="${this.mission.rules?.sampling?.duplicateValueMultiplier ?? 0}" /></label>
        <label>Depletion factor <input id="depletion-factor" type="number" min="0" max="1" step="0.05" value="${this.mission.rules?.sampling?.depletionFactor ?? 0}" /></label>
        <label>Cooldown windows <input id="cooldown-windows" type="number" min="0" max="12" step="1" value="${this.mission.rules?.sampling?.cooldownWindows ?? 0}" /></label>
        <label>Challenge <select id="challenge-mode">
          <option value="perfectKnowledge" ${(this.level.challengeMode ?? 'forecast') === 'perfectKnowledge' ? 'selected' : ''}>Perfect knowledge</option>
          <option value="forecast" ${(this.level.challengeMode ?? 'forecast') === 'forecast' ? 'selected' : ''}>Stochastic forecast</option>
        </select></label>
        <label>Forecasts <input id="ensemble-count" type="number" min="0" max="8" value="${this.level.meta?.generationConfig?.ensembleCount ?? 3}" /></label>
        <label>Forecast noise <input id="forecast-noise" type="number" min="0" max="1" step="0.05" value="${this.level.meta?.generationConfig?.forecastNoise ?? 0.18}" /></label>
        <label>ROI probabilities <select id="roi-probability-mode">
          <option value="variable" ${(this.level.meta?.generationConfig?.probabilisticROI ?? true) ? 'selected' : ''}>Variable</option>
          <option value="certain" ${(this.level.meta?.generationConfig?.probabilisticROI ?? true) ? '' : 'selected'}>Certain</option>
        </select></label>
        <label>Mobile hazards <input id="mobile-hazards-count" type="number" min="0" max="8" value="${this.level.meta?.generationConfig?.mobileHazardsCount ?? 1}" /></label>
        <label>Depth variation <input id="depth-variation" type="number" min="0" max="1" step="0.05" value="${this.level.meta?.generationConfig?.depthVariation ?? 0.45}" /></label>
      </div>
      </section>
      <section class="console-section" data-accordion-key="brush-tools">
      <h2>Brush Tools</h2>
      <div class="timeline-strip">${BRUSHES.map((brush) => `<button data-brush="${brush}" class="${brush === this.brush ? 'active' : ''}">${brush}</button>`).join('')}</div>
      </section>
      <section class="console-section" data-accordion-key="level-actions">
      <h2>Level Actions</h2>
      <div class="panel-stack">
        <button id="btn-generate-level">Generate Level</button>
        <button id="btn-preview-preset">Preview Preset</button>
        <button id="btn-apply-current-preset">Apply To Level</button>
        <button id="btn-regenerate-seed">Regenerate With Seed</button>
        <button id="btn-apply-time">Apply Time/Mission Settings</button>
        <button id="btn-copy-frame-current">Copy Current Frame to All</button>
        <button id="btn-regenerate-current">Regenerate Dynamic Currents</button>
        <button id="btn-validate-connectivity">Validate Connectivity</button>
        <button id="btn-repair-connectivity">Repair Connectivity</button>
        <button id="btn-use-level">Use This Level</button>
        <button id="btn-use-level-stochastic">Use as Stochastic</button>
        <button id="btn-save-level">Save Level</button>
        <button id="btn-export-level">Export Level JSON</button>
        <button id="btn-export-challenge">Export Challenge JSON</button>
        <button id="btn-export-challenge-history">Export Challenge + Best Path History</button>
        <label class="file-control" hidden>Import Level JSON <input id="level-file" type="file" accept="application/json" /></label>
      </div>
      </section>
      <section class="console-section" data-accordion-key="current-field">
      <h2>Current Field</h2>
      <section class="input-card" id="current-preview-summary">
        ${renderCurrentPreviewSummary(this.currentPreview)}
      </section>
      </section>
      <section class="console-footer">
      <button id="btn-back-menu" class="console-button secondary">Main Menu</button>
      </section>
    `;
    this.app.clearAuxiliaryPanels();
    this.renderEditorContextPanel();
    this.app.applyConsoleAccordions?.('editor');
    document.getElementById('btn-generate-level').onclick = () => {
      this.level = normalizeLevelForEditor(generateLevel(this.readConfig()));
      this.mission = updateMissionAgents(this.mission, this.level, this.readMissionConfig());
      this.app.state.customLevel = this.level;
      this.renderPanel();
      this.refreshMap();
    };
    document.getElementById('btn-preview-preset').onclick = () => {
      document.getElementById('current-pattern').value = 'fluid';
      this.refreshCurrentPreview();
      this.setStatus('Previewed synthetic current preset without changing the level.');
    };
    document.getElementById('btn-apply-current-preset').onclick = () => {
      document.getElementById('current-pattern').value = 'fluid';
      this.applyPreviewCurrentToLevel();
    };
    document.getElementById('btn-regenerate-seed').onclick = () => {
      const seedInput = document.getElementById('level-seed');
      seedInput.value = `${seedInput.value || 'seed'}-${Date.now().toString(36).slice(-5)}`;
      this.refreshCurrentPreview();
      this.setStatus('Regenerated preview with a new seed. Click Apply To Level to commit it.');
    };
    document.getElementById('btn-apply-time').onclick = () => {
      updateLevelTime(this.level, this.readTimeConfig());
      this.mission = updateMissionAgents(this.mission, this.level, this.readMissionConfig());
      this.frameIndex = Math.min(this.frameIndex, this.level.layers.truth.frames.length - 1);
      this.renderPanel();
      this.refreshMap();
    };
    document.getElementById('btn-copy-frame-current').onclick = () => {
      copyCurrentFrameToAll(this.level, this.frameIndex);
      this.refreshMap();
      this.setStatus('Copied selected current frame to all frames.');
    };
    document.getElementById('btn-regenerate-current').onclick = () => {
      this.refreshCurrentPreview();
      this.applyPreviewCurrentToLevel();
      this.setStatus('Regenerated preview frames and applied the full dynamic current sequence.');
    };
    document.getElementById('btn-validate-connectivity').onclick = () => {
      const validation = validateGeneratedLevelConnectivity(this.level, this.mission, { requireRoiReachability: true });
      this.level.meta ??= {};
      this.level.meta.connectivity = validation.summary;
      this.setStatus(validation.ok
        ? `Connectivity valid: ${(validation.summary.reachableNavigableRatio * 100).toFixed(0)}% navigable water reachable, ROI ${(validation.summary.roiReachableRatio * 100).toFixed(0)}%.`
        : `Connectivity warning: ${validation.warnings[0] ?? 'map is disconnected'}`);
    };
    document.getElementById('btn-repair-connectivity').onclick = () => {
      const repair = repairDeploymentConnectivity(this.level, this.mission, { requireRoiReachability: true });
      const validation = validateGeneratedLevelConnectivity(this.level, this.mission, { requireRoiReachability: true });
      this.level.meta ??= {};
      this.level.meta.connectivity = { ...(validation.summary ?? repair.summary), repaired: repair.repaired, repairMethod: repair.method };
      this.refreshMap();
      this.setStatus(validation.ok
        ? `Connectivity repaired using ${repair.method}.`
        : `Connectivity still has warnings: ${validation.warnings[0] ?? 'map is disconnected'}`);
    };
    document.getElementById('btn-use-level').onclick = async () => {
      this.prepareLevelForExport();
      this.app.state.customLevel = this.level;
      beginScenario(this.app.state, {
        level: this.level,
        mission: this.level.missionDefaults,
        challengeMode: this.level.challengeMode ?? 'perfectKnowledge',
        experienceMode: this.level.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
        source: 'editor'
      });
      resetPlanResultStore(this.app.state);
      this.scene.start('MissionBriefingScene');
    };
    document.getElementById('btn-use-level-stochastic').onclick = () => {
      this.prepareLevelForExport('forecast');
      this.app.state.customLevel = this.level;
      beginScenario(this.app.state, {
        level: this.level,
        mission: this.level.missionDefaults,
        challengeMode: 'forecast',
        experienceMode: this.level.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
        source: 'editor'
      });
      resetPlanResultStore(this.app.state);
      this.scene.start('MissionBriefingScene');
    };
    document.getElementById('btn-export-level').onclick = () => downloadJSON(`${this.level.levelId}.json`, this.prepareLevelForExport());
    document.getElementById('btn-export-challenge').onclick = () => this.exportCustomChallenge({ includeHistory: false });
    document.getElementById('btn-export-challenge-history').onclick = () => this.exportCustomChallenge({ includeHistory: true });
    document.getElementById('btn-save-level').onclick = () => {
      const saved = saveLevelToRegistry(this.prepareLevelForExport());
      if (!saved.ok) return this.app.toast(saved.error, 'warning');
      this.level = saved.level;
      this.app.state.customLevel = saved.level;
      this.app.toast(`Saved level ${shortInstanceId(saved.instanceId)}.`, 'success');
      this.renderPanel();
      this.refreshMap();
    };
    document.getElementById('level-file').onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      this.level = normalizeLevelForEditor(await readJSONFile(file));
      this.mission = updateMissionAgents(this.mission, this.level, this.readMissionConfig());
      this.app.state.customLevel = this.level;
      this.renderPanel();
      this.refreshMap();
    };
    document.getElementById('editor-frame').oninput = (event) => {
      this.frameIndex = Number(event.target.value);
      this.refreshMap();
      this.setStatus(`Selected frame ${this.frameIndex} at t=${this.level.layers.truth.frames[this.frameIndex]?.t ?? 0}.`);
    };
    ['current-pattern', 'fluid-preset', 'level-seed', 'current-strength', 'fluid-viscosity', 'fluid-iterations', 'fluid-vorticity', 'level-duration', 'level-dt', 'planning-window'].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.onchange = () => this.refreshCurrentPreview();
      if (element.type === 'number' || element.type === 'text') element.oninput = () => this.refreshCurrentPreview();
    });
    this.bindBrushSettingDomControls();
    document.getElementById('btn-back-menu').onclick = () => this.scene.start('MainMenuScene');
    document.querySelectorAll('button[data-brush]').forEach((button) => {
      button.onclick = () => {
        this.setBrushFromHud(button.dataset.brush);
      };
    });
    this.refreshCurrentPreview();
  }

  renderEditorContextPanel() {
    const root = this.app.elements.waypointTimelineRoot;
    if (!root) return;
    root.innerHTML = `
      <section class="waypoint-shell">
        <div class="console-kicker">Editor Context</div>
        <h2>${escapeHtml(this.level.meta?.name ?? 'Custom Level')}</h2>
        <p class="hud-muted">Editable map is contained in the center viewport. Editor controls are in the Mission Console.</p>
        <p class="hud-muted">Grid ${escapeHtml(this.level.world?.grid?.width ?? '?')} x ${escapeHtml(this.level.world?.grid?.height ?? '?')} | Frame ${escapeHtml(this.frameIndex + 1)} / ${escapeHtml(this.level.layers?.truth?.frames?.length ?? 1)}</p>
        <p class="hud-muted">Brush: ${escapeHtml(this.brush)} | Radius ${escapeHtml(this.editorToolState?.radius ?? 1)} | Intensity ${escapeHtml(this.editorToolState?.intensity ?? 0.45)}</p>
        <p class="hud-muted">Use the left console to generate, validate, save, import, export, or play the level.</p>
      </section>
    `;
  }

  shutdown() {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.keyboard?.off('keydown-ESC', this.cancelVectorPreview, this);
    this.editorHud?.destroy();
    this.vectorBrushPreview?.destroy();
    this.currentPreviewTexts?.forEach((text) => text.destroy());
    this.currentPreviewControls?.forEach((control) => control.destroy?.());
    this.currentPreviewTexts = [];
    this.currentPreviewControls = [];
  }

  update(time) {
    const preview = this.currentPreview;
    if (!preview?.isPlaying || preview.frames.length <= 1) return;
    const interval = 1000 / Math.max(1, Number(preview.fps ?? 4));
    if (time - (preview.lastAdvanceAt ?? 0) < interval) return;
    preview.lastAdvanceAt = time;
    this.setPreviewFrame((preview.selectedFrameIndex + 1) % preview.frames.length, { preservePlayback: true });
  }

  readConfig() {
    return {
      width: Number(document.getElementById('level-width').value),
      height: Number(document.getElementById('level-height').value),
      seed: document.getElementById('level-seed').value,
      difficulty: document.getElementById('difficulty').value,
      ...this.readTimeConfig(),
      challengeMode: document.getElementById('challenge-mode').value,
      forecastMode: document.getElementById('challenge-mode').value === 'forecast' ? 'noisy' : 'none',
      currentPattern: document.getElementById('current-pattern').value,
      fluidPreset: document.getElementById('fluid-preset').value,
      currentStrength: Number(document.getElementById('current-strength').value),
      fluidViscosity: Number(document.getElementById('fluid-viscosity').value),
      fluidIterations: Number(document.getElementById('fluid-iterations').value),
      fluidVorticityConfinement: Number(document.getElementById('fluid-vorticity').value),
      forecastNoise: Number(document.getElementById('forecast-noise').value),
      ensembleCount: Number(document.getElementById('ensemble-count').value),
      roiProbabilityMode: document.getElementById('roi-probability-mode').value,
      mobileHazardsCount: Number(document.getElementById('mobile-hazards-count').value),
      depthVariation: Number(document.getElementById('depth-variation').value)
    };
  }

  readTimeConfig() {
    return {
      duration: Number(document.getElementById('level-duration').value),
      dt: Number(document.getElementById('level-dt').value),
      planningWindow: Number(document.getElementById('planning-window').value)
    };
  }

  readMissionConfig() {
    return {
      agentCount: Number(document.getElementById('agent-count')?.value ?? this.mission?.agents?.length ?? 1),
      battery: Number(document.getElementById('agent-battery')?.value ?? this.mission?.agents?.[0]?.battery ?? 100),
      maxSpeed: Number(document.getElementById('agent-speed')?.value ?? this.mission?.agents?.[0]?.maxSpeed ?? 1.25),
      endConditionMode: document.getElementById('end-condition-mode')?.value ?? this.mission?.rules?.endCondition?.mode ?? 'none',
      endConditionRequired: document.getElementById('end-condition-required')?.value === 'true',
      endConditionBonus: Number(document.getElementById('end-condition-bonus')?.value ?? this.mission?.rules?.endCondition?.bonus ?? 0),
      endConditionPenalty: Number(document.getElementById('end-condition-penalty')?.value ?? this.mission?.rules?.endCondition?.penalty ?? 0),
      samplingMode: document.getElementById('sampling-mode')?.value ?? this.mission?.rules?.sampling?.mode ?? 'unique',
      duplicateValueMultiplier: Number(document.getElementById('duplicate-multiplier')?.value ?? this.mission?.rules?.sampling?.duplicateValueMultiplier ?? 0),
      depletionFactor: Number(document.getElementById('depletion-factor')?.value ?? this.mission?.rules?.sampling?.depletionFactor ?? 0),
      cooldownWindows: Number(document.getElementById('cooldown-windows')?.value ?? this.mission?.rules?.sampling?.cooldownWindows ?? 0)
    };
  }

  readBrushConfig() {
    const settings = this.editorToolState ?? {};
    return {
      frameIndex: this.frameIndex,
      frameScope: document.getElementById('frame-scope')?.value ?? 'current',
      currentTool: document.getElementById('current-tool')?.value ?? 'directional',
      intensity: clampNumber(settings.intensity ?? document.getElementById('brush-intensity')?.value ?? 0.45, 0.1, 5),
      vectorStrength: clampNumber(settings.intensity ?? document.getElementById('brush-intensity')?.value ?? 0.45, 0.1, 5),
      radius: clampNumber(settings.radius ?? document.getElementById('brush-radius')?.value ?? 1, 1, 8),
      agentId: this.mission?.agents?.[0]?.id,
      brush: this.brush,
      refreshForecast: this.level.challengeMode === 'forecast'
    };
  }

  bindBrushSettingDomControls() {
    const radiusInput = document.getElementById('brush-radius');
    const intensityInput = document.getElementById('brush-intensity');
    if (radiusInput) {
      radiusInput.value = this.editorToolState.radius;
      radiusInput.oninput = () => this.setBrushSettingFromHud('radius', radiusInput.value, { refreshHud: true });
      radiusInput.onchange = radiusInput.oninput;
    }
    if (intensityInput) {
      intensityInput.value = this.editorToolState.intensity;
      intensityInput.oninput = () => this.setBrushSettingFromHud('intensity', intensityInput.value, { refreshHud: true });
      intensityInput.onchange = intensityInput.oninput;
    }
  }

  setBrushSettingFromHud(key, value, options = {}) {
    const ranges = {
      radius: { min: 1, max: 8, precision: 0 },
      intensity: { min: 0.1, max: 5, precision: 2 }
    };
    const range = ranges[key];
    if (!range) return;
    const next = clampNumber(value, range.min, range.max);
    this.editorToolState[key] = Number(next.toFixed(range.precision));
    const input = document.getElementById(key === 'radius' ? 'brush-radius' : 'brush-intensity');
    if (input) input.value = this.editorToolState[key];
    this.level.meta ??= {};
    this.level.meta.editorConfig ??= {};
    this.level.meta.editorConfig[key] = this.editorToolState[key];
    if (this.vectorDragActive && this.vectorDragEndCell) this.updateVectorPreview(this.vectorDragEndCell);
    if (options.refreshHud) this.editorHud?.refresh();
    this.setStatus(`${labelize(key)} set to ${this.editorToolState[key]}.`);
  }

  refreshMap() {
    this.graphics.clear();
    this.app.adapter.layout = drawMissionMap(this.graphics, {
      level: this.level,
      mission: this.mission,
      time: this.level.layers.truth.frames[this.frameIndex]?.t ?? 0,
      challengeMode: 'perfectKnowledge',
      guidanceSettings: {
        mode: 'editor',
        showGuidance: false
      }
    });
    this.drawCurrentPreviewPanel();
    this.editorHud?.refresh();
    this.renderEditorContextPanel();
  }

  onPointerDown(pointer) {
    if (this.uiPointerActive || this.suppressNextPointerUp) return;
    if (pointer.rightButtonDown?.()) {
      this.cancelVectorPreview();
      return;
    }
    this.pointerStartCell = pointerToCell(pointer, this.app.adapter.layout);
    if (this.brush === 'current' && this.pointerStartCell) {
      this.vectorDragActive = true;
      this.vectorDragEndCell = this.pointerStartCell;
      this.updateVectorPreview(this.pointerStartCell);
    }
  }

  onPointerMove(pointer) {
    if (this.previewScrubActive) {
      this.scrubPreviewFromPointer(pointer);
      return;
    }
    if (!this.vectorDragActive || this.brush !== 'current') return;
    const cell = pointerToCell(pointer, this.app.adapter.layout);
    if (!cell) return;
    this.vectorDragEndCell = cell;
    this.updateVectorPreview(cell);
  }

  onPointerUp(pointer) {
    if (this.previewScrubActive) {
      this.previewScrubActive = false;
      this.uiPointerActive = false;
      return;
    }
    if (this.suppressNextPointerUp) {
      this.suppressNextPointerUp = false;
      return;
    }
    if (pointer.rightButtonDown?.()) {
      this.cancelVectorPreview();
      return;
    }
    const cell = pointerToCell(pointer, this.app.adapter.layout);
    if (!cell) {
      if (this.vectorDragActive) this.cancelVectorPreview();
      return;
    }
    const config = this.readBrushConfig();
    if (this.brush === 'current') {
      editCurrentVector(this.level, this.pointerStartCell ?? cell, cell, config);
      this.vectorDragActive = false;
      this.vectorBrushPreview.clear();
      this.attachCurrentStatsMetadata();
      this.refreshCurrentPreview({ useLevelFrame: true });
    } else {
      applyEditorCellBrush(this.level, this.mission, cell.x, cell.y, this.brush, config);
      if (this.brush === 'terrain' || this.brush === 'clear') this.refreshCurrentPreview();
    }
    ensureLevelIdentity(this.level);
    this.refreshMap();
    this.setStatus(`${this.brush} applied at (${cell.x}, ${cell.y}) on ${config.frameScope === 'all' ? 'all frames' : `frame ${this.frameIndex}`}.`);
  }

  updateVectorPreview(endCell) {
    this.vectorBrushPreview.show({
      layout: this.app.adapter.layout,
      startCell: this.pointerStartCell,
      endCell,
      radius: this.readBrushConfig().radius,
      intensity: this.readBrushConfig().intensity,
      scope: document.getElementById('frame-scope')?.value ?? 'current',
      tool: document.getElementById('current-tool')?.value ?? 'directional'
    });
  }

  cancelVectorPreview() {
    this.vectorDragActive = false;
    this.pointerStartCell = null;
    this.vectorDragEndCell = null;
    this.vectorBrushPreview?.clear();
    this.setStatus('Vector edit cancelled.');
  }

  setStatus(message) {
    const status = document.getElementById('level-editor-status');
    if (status) status.textContent = message;
    this.renderEditorContextPanel();
  }

  prepareLevelForExport(forcedMode = null) {
    this.level = ensureLevelIdentity(normalizeLevelForEditor(this.level));
    this.level.challengeMode = forcedMode ?? document.getElementById('challenge-mode')?.value ?? this.level.challengeMode ?? 'perfectKnowledge';
    this.level.missionDefaults = updateMissionAgents(this.mission, this.level, this.readMissionConfig());
    this.level.meta ??= {};
    this.level.meta.generated = false;
    this.level.meta.editorConfig = {
      ...(this.level.meta.editorConfig ?? {}),
      frameIndex: this.frameIndex,
      brush: this.brush,
      frameScope: document.getElementById('frame-scope')?.value ?? 'current',
      radius: this.editorToolState?.radius ?? 1,
      intensity: this.editorToolState?.intensity ?? 0.45
    };
    this.attachCurrentStatsMetadata();
    return this.level;
  }

  exportCustomChallenge({ includeHistory = false } = {}) {
    const level = this.prepareLevelForExport();
    level.meta ??= {};
    level.meta.customScenario = true;
    level.meta.source = 'editor';
    const history = includeHistory ? buildBestPathHistoryForLevel(level) : null;
    const challenge = buildChallengeExport({
      level,
      mission: level.missionDefaults,
      challengeMode: level.challengeMode ?? 'perfectKnowledge',
      experienceMode: level.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
      customScenario: true,
      sourceMetadata: {
        source: 'editor',
        tool: 'EnvironmentEditorScene',
        label: 'Custom Scenario Builder'
      },
      bestPathHistory: history
    });
    const suffix = includeHistory ? 'with-history' : 'challenge';
    downloadJSON(`anchor.custom-${suffix}.${level.levelId}.json`, challenge);
    this.setStatus(includeHistory
      ? 'Exported custom challenge JSON with local best path history metadata.'
      : 'Exported custom challenge JSON.');
  }

  refreshCurrentPreview(options = {}) {
    const pattern = document.getElementById('current-pattern')?.value ?? this.level.meta?.generationConfig?.currentPattern ?? 'fluid';
    const frames = options.useLevelFrame
      ? this.level.layers.truth.frames.map((frame) => ({ t: frame.t, current: frame.current }))
      : generateFluidCurrentFrames({
        ...this.readConfig(),
        currentPattern: pattern === 'fluid' ? 'fluid' : pattern,
        pattern: pattern,
        width: this.level.world?.grid?.width ?? Number(document.getElementById('level-width')?.value ?? 12),
        height: this.level.world?.grid?.height ?? Number(document.getElementById('level-height')?.value ?? 12),
        terrain: this.level.layers?.terrain
      });
    const statsByFrame = frames.map((frame) => computeCurrentMagnitudeStats(frame.current));
    const sequenceStats = buildCurrentSequenceStats(frames, statsByFrame);
    const previousIndex = Number(this.currentPreview?.selectedFrameIndex ?? 0);
    const selectedFrameIndex = options.preserveFrame
      ? Math.max(0, Math.min(frames.length - 1, previousIndex))
      : 0;
    const selectedFrame = frames[selectedFrameIndex] ?? frames[0] ?? { t: 0, current: [] };
    this.currentPreview = {
      pattern,
      preset: document.getElementById('fluid-preset')?.value ?? 'eddyField',
      frames,
      selectedFrameIndex,
      isPlaying: false,
      fps: 4,
      statsByFrame,
      sequenceStats,
      current: selectedFrame.current ?? [],
      stats: statsByFrame[selectedFrameIndex] ?? sequenceStats
    };
    this.updateCurrentPreviewUi();
  }

  setPreviewFrame(index, options = {}) {
    const preview = this.currentPreview;
    if (!preview?.frames?.length) return;
    const max = preview.frames.length - 1;
    const selectedFrameIndex = Math.max(0, Math.min(max, Math.round(Number(index) || 0)));
    preview.selectedFrameIndex = selectedFrameIndex;
    preview.current = preview.frames[selectedFrameIndex]?.current ?? [];
    preview.stats = preview.statsByFrame[selectedFrameIndex] ?? preview.sequenceStats;
    if (!options.preservePlayback) preview.lastAdvanceAt = 0;
    this.updateCurrentPreviewUi();
  }

  nudgePreviewFrame(delta) {
    const preview = this.currentPreview;
    if (!preview?.frames?.length) return;
    this.setPreviewFrame((preview.selectedFrameIndex ?? 0) + delta);
  }

  togglePreviewPlayback() {
    const preview = this.currentPreview;
    if (!preview?.frames?.length) return;
    preview.isPlaying = !preview.isPlaying;
    preview.lastAdvanceAt = 0;
    this.drawCurrentPreviewPanel();
  }

  resetPreviewPlayback() {
    const preview = this.currentPreview;
    if (!preview?.frames?.length) return;
    preview.isPlaying = false;
    this.setPreviewFrame(0);
  }

  scrubPreviewFromPointer(pointer) {
    const track = this.previewScrubTrack;
    const preview = this.currentPreview;
    if (!track || !preview?.frames?.length) return;
    const fraction = Math.max(0, Math.min(1, (pointer.x - track.x) / Math.max(1, track.width)));
    this.setPreviewFrame(Math.round(fraction * (preview.frames.length - 1)));
  }

  updateCurrentPreviewUi() {
    const summary = document.getElementById('current-preview-summary');
    if (summary) summary.innerHTML = renderCurrentPreviewSummary(this.currentPreview);
    this.drawCurrentPreviewPanel();
  }

  applyPreviewCurrentToLevel() {
    if (!this.currentPreview?.frames?.length) this.refreshCurrentPreview();
    const previewFrames = this.currentPreview?.frames ?? [];
    updateLevelTime(this.level, this.readTimeConfig());
    this.frameIndex = Math.min(this.frameIndex, this.level.layers.truth.frames.length - 1);
    this.level.layers.truth.frames = this.level.layers.truth.frames.map((frame, index) => ({
      ...frame,
      current: cloneCurrentGrid(previewFrames[index]?.current ?? previewFrames.at(-1)?.current ?? frame.current)
    }));
    this.refreshForecastFromTruth();
    this.attachCurrentStatsMetadata();
    this.refreshCurrentPreview({ useLevelFrame: true, preserveFrame: true });
    this.refreshMap();
    this.setStatus('Applied the full preview current sequence to the level frames.');
  }

  refreshForecastFromTruth() {
    if (this.level.challengeMode !== 'forecast' && document.getElementById('challenge-mode')?.value !== 'forecast') return;
    const config = this.readConfig();
    const random = createSeededRandom(config.seed ?? this.level.meta?.seed ?? this.level.instanceId ?? 'editor');
    this.level.layers.forecast = {
      frames: makeForecastFromTruth(this.level.layers.truth.frames, { ...config, forecastMode: 'noisy' }, random)
    };
    this.level.layers.forecasts = makeForecastEnsembleFromTruth(this.level.layers.truth.frames, {
      ...config,
      forecastMode: 'noisy'
    }, random);
  }

  attachCurrentStatsMetadata() {
    const stats = computeCurrentFrameSetStats(this.level.layers?.truth?.frames ?? []);
    this.level.meta ??= {};
    this.level.meta.generationConfig ??= {};
    this.level.meta.generationConfig.currentGenerator ??= {
      type: document.getElementById('current-pattern')?.value === 'fluid' ? 'fluid' : 'analytic',
      preset: document.getElementById('fluid-preset')?.value,
      synthetic: true
    };
    this.level.meta.generationConfig.currentGenerator = {
      ...this.level.meta.generationConfig.currentGenerator,
      preset: document.getElementById('fluid-preset')?.value ?? this.level.meta.generationConfig.currentGenerator.preset,
      strength: Number(document.getElementById('current-strength')?.value ?? this.level.meta.generationConfig.currentGenerator.strength ?? 1),
      viscosity: Number(document.getElementById('fluid-viscosity')?.value ?? this.level.meta.generationConfig.currentGenerator.viscosity ?? 0.0008),
      iterations: Number(document.getElementById('fluid-iterations')?.value ?? this.level.meta.generationConfig.currentGenerator.iterations ?? 8),
      vorticityConfinement: Number(document.getElementById('fluid-vorticity')?.value ?? this.level.meta.generationConfig.currentGenerator.vorticityConfinement ?? 0.08),
      vorticity: Number(document.getElementById('fluid-vorticity')?.value ?? this.level.meta.generationConfig.currentGenerator.vorticityConfinement ?? 0.08) > 0,
      stats,
      note: 'Synthetic ocean-inspired current field for gameplay and planning practice, not validated ocean-model output.'
    };
  }

  drawCurrentPreviewPanel() {
    this.currentPreviewGraphics.clear();
    this.currentPreviewTexts.forEach((text) => text.destroy());
    this.currentPreviewControls.forEach((control) => control.destroy?.());
    this.currentPreviewTexts = [];
    this.currentPreviewControls = [];
    if (!this.currentPreview?.current?.length) return;
    const x = 894;
    const y = 72;
    const width = 330;
    const height = 268;
    const current = this.currentPreview.current;
    const frame = this.currentPreview.frames[this.currentPreview.selectedFrameIndex] ?? { t: 0 };
    const rows = current.length;
    const cols = current[0]?.length ?? 0;
    if (!rows || !cols) return;
    this.currentPreviewGraphics.fillStyle(0x07101d, 0.88);
    this.currentPreviewGraphics.fillRoundedRect(x, y, width, height, 8);
    this.currentPreviewGraphics.lineStyle(1, 0x54c7ec, 0.35);
    this.currentPreviewGraphics.strokeRoundedRect(x, y, width, height, 8);
    this.addPreviewText(x + 14, y + 12, 'Current preview', 17, '#eef6ff', '700');
    this.addPreviewText(x + 14, y + 36, `${labelize(this.currentPreview.preset)} | ${this.currentPreview.stats.classification}`, 13, '#9cb4d8');
    this.addPreviewText(x + 14, y + 52, previewFrameLabel(this.currentPreview, frame), 12, '#cde8ff');
    const gridX = x + 16;
    const gridY = y + 78;
    const gridW = 188;
    const gridH = 124;
    this.currentPreviewGraphics.fillStyle(0x0b2740, 0.72);
    this.currentPreviewGraphics.fillRect(gridX, gridY, gridW, gridH);
    const stepX = gridW / cols;
    const stepY = gridH / rows;
    const skip = Math.max(1, Math.ceil(Math.max(cols, rows) / 10));
    for (let row = 0; row < rows; row += skip) {
      for (let col = 0; col < cols; col += skip) {
        const vector = current[row]?.[col] ?? [0, 0];
        const magnitude = Math.hypot(vector[0], vector[1]);
        const cx = gridX + (col + 0.5) * stepX;
        const cy = gridY + (row + 0.5) * stepY;
        const scale = Math.min(11, 5 + magnitude * 12);
        const color = magnitude > 0.75 ? 0xffd166 : magnitude > 0.2 ? 0x63e6be : 0x9cb4d8;
        this.currentPreviewGraphics.lineStyle(1 + Math.min(2, magnitude * 2), color, 0.78);
        this.currentPreviewGraphics.beginPath();
        this.currentPreviewGraphics.moveTo(cx - vector[0] * scale * 0.5, cy - vector[1] * scale * 0.5);
        this.currentPreviewGraphics.lineTo(cx + vector[0] * scale, cy + vector[1] * scale);
        this.currentPreviewGraphics.strokePath();
        this.currentPreviewGraphics.fillStyle(color, 0.85);
        this.currentPreviewGraphics.fillCircle(cx + vector[0] * scale, cy + vector[1] * scale, 1.8);
      }
    }
    const sx = x + 222;
    this.addPreviewText(sx, y + 72, `Mean ${formatStat(this.currentPreview.stats.meanSpeed)}`, 12);
    this.addPreviewText(sx, y + 92, `Max ${formatStat(this.currentPreview.stats.maxSpeed)}`, 12);
    this.addPreviewText(sx, y + 112, `Std ${formatStat(this.currentPreview.stats.stdSpeed)}`, 12);
    this.addPreviewText(sx, y + 134, `Strong ${formatPercent(this.currentPreview.stats.strongCellRatio)}`, 12);
    this.currentPreviewGraphics.fillStyle(0x9cb4d8, 0.9);
    this.currentPreviewGraphics.fillCircle(sx + 7, y + 170, 4);
    this.currentPreviewGraphics.fillStyle(0x63e6be, 0.9);
    this.currentPreviewGraphics.fillCircle(sx + 7, y + 186, 4);
    this.currentPreviewGraphics.fillStyle(0xffd166, 0.9);
    this.currentPreviewGraphics.fillCircle(sx + 7, y + 202, 4);
    this.addPreviewText(sx + 18, y + 164, 'weak', 11, '#9cb4d8');
    this.addPreviewText(sx + 18, y + 180, 'moderate', 11, '#63e6be');
    this.addPreviewText(sx + 18, y + 196, 'strong', 11, '#ffd166');

    const trackX = x + 18;
    const trackY = y + 224;
    const trackW = width - 36;
    const fraction = this.currentPreview.frames.length <= 1 ? 0 : this.currentPreview.selectedFrameIndex / (this.currentPreview.frames.length - 1);
    this.currentPreviewGraphics.lineStyle(3, 0x2d496b, 0.95);
    this.currentPreviewGraphics.beginPath();
    this.currentPreviewGraphics.moveTo(trackX, trackY);
    this.currentPreviewGraphics.lineTo(trackX + trackW, trackY);
    this.currentPreviewGraphics.strokePath();
    this.currentPreviewGraphics.lineStyle(3, 0x54c7ec, 0.95);
    this.currentPreviewGraphics.beginPath();
    this.currentPreviewGraphics.moveTo(trackX, trackY);
    this.currentPreviewGraphics.lineTo(trackX + trackW * fraction, trackY);
    this.currentPreviewGraphics.strokePath();
    this.currentPreviewGraphics.fillStyle(0xeef6ff, 1);
    this.currentPreviewGraphics.fillCircle(trackX + trackW * fraction, trackY, 6);
    this.previewScrubTrack = { x: trackX, y: trackY - 8, width: trackW, height: 16 };
    const scrubHit = this.add.rectangle(trackX + trackW / 2, trackY, trackW, 18, 0xffffff, 0.01).setInteractive();
    scrubHit.on('pointerdown', (pointer) => {
      this.suppressNextPointerUp = true;
      this.uiPointerActive = true;
      this.previewScrubActive = true;
      this.currentPreview.isPlaying = false;
      this.scrubPreviewFromPointer(pointer);
    });
    this.currentPreviewControls.push(scrubHit);

    this.currentPreviewControls.push(new PhaserButton(this, {
      x: x + 38,
      y: y + 248,
      width: 50,
      height: 24,
      label: 'Prev',
      onClick: () => this.nudgePreviewFrame(-1)
    }));
    this.currentPreviewControls.push(new PhaserButton(this, {
      x: x + 96,
      y: y + 248,
      width: 50,
      height: 24,
      label: 'Next',
      onClick: () => this.nudgePreviewFrame(1)
    }));
    this.currentPreviewControls.push(new PhaserButton(this, {
      x: x + 164,
      y: y + 248,
      width: 62,
      height: 24,
      label: this.currentPreview.isPlaying ? 'Pause' : 'Play',
      onClick: () => this.togglePreviewPlayback()
    }));
    this.currentPreviewControls.push(new PhaserButton(this, {
      x: x + 236,
      y: y + 248,
      width: 62,
      height: 24,
      label: 'Reset',
      onClick: () => this.resetPreviewPlayback()
    }));
  }

  addPreviewText(x, y, text, size = 12, color = '#dcecff', weight = '500') {
    const object = this.add.text(x, y, text, {
      fontFamily: 'system-ui',
      fontSize: `${size}px`,
      fontStyle: weight,
      color
    });
    this.currentPreviewTexts.push(object);
    return object;
  }

  shortInstanceLabel() {
    return `Instance ${shortInstanceId(this.level)}`;
  }

  setBrushFromHud(brush, currentTool = null) {
    this.brush = brush;
    const currentToolSelect = document.getElementById('current-tool');
    if (currentTool && currentToolSelect) currentToolSelect.value = currentTool;
    this.cancelVectorPreview();
    document.querySelectorAll('button[data-brush]').forEach((button) => {
      button.classList.toggle('active', button.dataset.brush === brush);
    });
    this.editorHud?.refresh();
    this.setStatus(`Selected ${currentTool ? `${currentTool} current` : brush} tool.`);
  }

  setFrameScopeFromHud(scope) {
    const select = document.getElementById('frame-scope');
    if (select) select.value = scope;
    this.editorHud?.refresh();
    this.setStatus(`Current edits apply to ${scope === 'all' ? 'all frames' : 'current frame'}.`);
  }

  nudgeFrameFromHud(delta) {
    const max = Math.max(0, (this.level.layers.truth?.frames?.length ?? 1) - 1);
    this.frameIndex = Math.max(0, Math.min(max, this.frameIndex + delta));
    const slider = document.getElementById('editor-frame');
    if (slider) slider.value = this.frameIndex;
    this.refreshMap();
    this.setStatus(`Selected frame ${this.frameIndex}.`);
  }

  openImportFromHud() {
    document.getElementById('level-file')?.click();
  }

  previewPresetFromHud() {
    const pattern = document.getElementById('current-pattern');
    if (pattern) pattern.value = 'fluid';
    this.refreshCurrentPreview();
    this.setStatus('Previewed synthetic current preset without changing the level.');
  }

  exportLevelFromHud() {
    downloadJSON(`${this.level.levelId}.json`, this.prepareLevelForExport());
  }

  playLevelFromHud() {
    this.prepareLevelForExport();
    this.app.state.customLevel = this.level;
    beginScenario(this.app.state, {
      level: this.level,
      mission: this.level.missionDefaults,
      challengeMode: this.level.challengeMode ?? 'perfectKnowledge',
      experienceMode: this.level.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
      source: 'editor'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  applyMissionFromHud() {
    updateLevelTime(this.level, this.readTimeConfig());
    this.mission = updateMissionAgents(this.mission, this.level, this.readMissionConfig());
    this.setStatus('Applied mission/time settings.');
    this.refreshMap();
  }
}

function labelize(value) {
  return String(value).replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function renderCurrentPreviewSummary(preview) {
  if (!preview?.frames?.length) {
    return `
      <h3>Current preview</h3>
      <p class="small">Click Preview Preset to inspect a synthetic current field before applying it.</p>
    `;
  }
  const stats = preview.stats;
  const sequenceStats = preview.sequenceStats ?? stats;
  const frame = preview.frames[preview.selectedFrameIndex] ?? preview.frames[0] ?? { t: 0 };
  const warnings = stats.warnings?.length ? stats.warnings : ['Gameplay note: field looks usable for planning practice.'];
  return `
    <h3>Current preview</h3>
    <p class="small">Preset ${labelize(preview.preset)} | ${previewFrameLabel(preview, frame)} | ${summarizeCurrentField(stats)}</p>
    <div class="coordinate-grid">
      <span class="small">Min speed ${formatStat(stats.minSpeed)}</span>
      <span class="small">Mean speed ${formatStat(stats.meanSpeed)}</span>
      <span class="small">Median speed ${formatStat(stats.medianSpeed)}</span>
      <span class="small">Max speed ${formatStat(stats.maxSpeed)}</span>
      <span class="small">Std speed ${formatStat(stats.stdSpeed)}</span>
      <span class="small">Strong-current cells ${formatPercent(stats.strongCellRatio)}</span>
      <span class="small">Near-calm cells ${formatPercent(stats.calmCellRatio)}</span>
      <span class="small">Class ${stats.classification}</span>
      <span class="small">Sequence mean ${formatStat(sequenceStats.meanSpeed)}</span>
      <span class="small">Sequence max ${formatStat(sequenceStats.maxSpeed)}</span>
      <span class="small">Most intense frame ${sequenceStats.mostIntenseFrame ?? 0}</span>
      <span class="small">Calmest frame ${sequenceStats.calmestFrame ?? 0}</span>
    </div>
    <p class="small"><strong>Legend:</strong> weak &lt; ${stats.nearCalmThreshold}, moderate planning currents, strong &gt; ${stats.strongCurrentThreshold}.</p>
    <p class="small">Scrub, step, or play the preview to inspect the generated sequence. Apply To Level commits all ${preview.frames.length} frames, not just the visible frame.</p>
    <p class="small">These are synthetic ocean-inspired currents for gameplay and planning practice, not validated ocean-model output.</p>
    ${warnings.map((warning) => `<p class="small warning">Gameplay note: ${escapeHtml(warning)}</p>`).join('')}
  `;
}

function buildEmptyCurrentPreview() {
  return {
    frames: [],
    selectedFrameIndex: 0,
    isPlaying: false,
    fps: 4,
    statsByFrame: [],
    sequenceStats: null,
    current: [],
    stats: null
  };
}

function buildBestPathHistoryForLevel(level) {
  const instanceId = level?.instanceId ?? null;
  const board = normalizeLeaderboard(loadLeaderboard());
  const record = instanceId ? board.records?.[instanceId] ?? null : null;
  const records = record ? { [instanceId]: record } : {};
  return {
    type: 'anchor.bestPathHistory',
    createdAt: new Date().toISOString(),
    instanceId,
    hasBestAttempt: Boolean(record?.bestAttemptId || record?.attempts?.length),
    recordCount: Object.keys(records).length,
    leaderboard: buildLeaderboardExport({ records }, { embedChallenges: false }),
    note: record
      ? 'Local best-path/attempt history for this custom challenge is attached.'
      : 'No local best attempt exists for this challenge yet.'
  };
}

function buildCurrentSequenceStats(frames, statsByFrame) {
  const sequenceStats = computeCurrentFrameSetStats(frames);
  const rankedByMean = statsByFrame.map((stats, index) => ({ index, mean: stats.meanSpeed }));
  const mostIntense = rankedByMean.reduce((best, candidate) => candidate.mean > best.mean ? candidate : best, rankedByMean[0] ?? { index: 0, mean: 0 });
  const calmest = rankedByMean.reduce((best, candidate) => candidate.mean < best.mean ? candidate : best, rankedByMean[0] ?? { index: 0, mean: 0 });
  return {
    ...sequenceStats,
    mostIntenseFrame: mostIntense.index,
    calmestFrame: calmest.index
  };
}

function previewFrameLabel(preview, frame) {
  return `Frame ${preview.selectedFrameIndex + 1} / ${preview.frames.length}, Time ${formatMissionTime(frame?.t ?? 0)}`;
}

function formatMissionTime(value) {
  const number = Number(value ?? 0);
  return `${Number.isInteger(number) ? number : number.toFixed(1)} hr`;
}

function cloneCurrentGrid(grid) {
  return (grid ?? []).map((row) => row.map((cell) => [Number(cell?.[0] ?? 0), Number(cell?.[1] ?? 0)]));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function formatStat(value) {
  return Number(value ?? 0).toFixed(2);
}

function formatPercent(value) {
  return `${Math.round(Number(value ?? 0) * 100)}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
