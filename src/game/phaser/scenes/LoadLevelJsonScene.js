import { ensureLevelIdentity, shortInstanceId } from '../../../core/identity/GameInstanceId.js';
import { ensureForecastFields } from '../../../core/sim/ChallengeMode.js';
import { normalizeLevelForEditor, buildDefaultMissionForLevel } from '../../../core/editor/LevelEditOperations.js';
import { resetPlanResultStore } from '../../../core/evaluation/PlanResultStore.js';
import { beginScenario } from '../../../core/scenario/ScenarioState.js';
import { PhaserButton } from '../ui/Button.js';
import { FileBridge, downloadJson } from '../ui/FileBridge.js';
import { Modal } from '../ui/Modal.js';
import { parseChallengeImport } from '../../../core/io/ChallengeExporter.js';
import { saveChallengeToLocalStore } from '../../../core/storage/LocalChallengeStore.js';
import { importResultJson } from '../../../core/io/ResultImporter.js';
import { importOracleDatasetJson } from '../../../core/io/OracleDatasetImporter.js';
import { EXPERIENCE_MODES } from '../../../core/experience/ExperienceMode.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class LoadLevelJsonScene extends PhaserScene {
  constructor() {
    super('LoadLevelJsonScene');
    this.level = null;
    this.mission = null;
    this.importedResult = null;
    this.importedResultSummary = null;
    this.oracleDatasetSummary = null;
    this.objects = [];
  }

  create() {
    this.app = this.sys.game.anchorApp;
    this.app.clearPanels();
    this.app.setSceneLabel('Load Level JSON');
    this.app.elements.shell?.classList.remove('planning-workspace');
    this.level = this.app.state.importedLevel ?? null;
    this.mission = this.app.state.importedMission ?? null;
    this.modal = new Modal(this);
    this.fileBridge = new FileBridge({
      onLoad: (data) => this.importLevelData(data),
      onError: (error) => this.showError(error)
    });
    this.drawScene();
    this.renderConsole();
  }

  shutdown() {
    this.fileBridge?.destroy();
    this.modal?.destroy();
    this.clearObjects();
  }

  handleViewportResize() {
    if (!this.sys?.isActive?.()) return;
    this.drawScene();
  }

  drawScene(status = '') {
    this.clearObjects();
    const sceneWidth = Math.max(1, Number(this.scale?.width ?? 1280));
    const sceneHeight = Math.max(1, Number(this.scale?.height ?? 820));
    const margin = Math.max(20, Math.min(56, sceneWidth * 0.06));
    const gap = 24;
    const contentWidth = Math.max(260, sceneWidth - margin * 2);
    const twoColumn = contentWidth >= 760;
    const leftWidth = twoColumn ? Math.min(420, contentWidth * 0.38) : contentWidth;
    const rightWidth = twoColumn ? contentWidth - leftWidth - gap : contentWidth;
    const top = Math.max(42, Math.min(76, sceneHeight * 0.1));
    const panelTop = top + 130;
    const leftHeight = twoColumn ? Math.min(292, sceneHeight - panelTop - margin) : 190;
    const rightX = twoColumn ? margin + leftWidth + gap : margin;
    const rightY = twoColumn ? panelTop : panelTop + leftHeight + 18;
    const rightHeight = Math.max(260, sceneHeight - rightY - margin);
    const g = this.add.graphics();
    g.fillGradientStyle(0x06111f, 0x0b2137, 0x08243a, 0x06111f, 1);
    g.fillRect(0, 0, sceneWidth, sceneHeight);
    g.lineStyle(1, 0x54c7ec, 0.12);
    for (let y = top + 66; y < sceneHeight; y += 62) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(sceneWidth, y + Math.sin(y * 0.025) * 16);
      g.strokePath();
    }
    this.objects.push(g);
    this.text(margin, top, 'Load Level JSON', Math.max(26, Math.min(38, sceneWidth * 0.05)), '#eef6ff', '700', contentWidth);
    this.text(margin + 4, top + 54, 'Import anchor.challenge, anchor.level, anchor.result, or research oracle JSON.', 16, '#9cb4d8', '500', Math.min(720, contentWidth));
    if (status) this.text(margin + 4, top + 90, status, 14, '#63e6be', '700', contentWidth);

    this.panel(margin, panelTop, leftWidth, leftHeight);
    this.text(margin + 24, panelTop + 24, 'Level Preview', 20, '#eef6ff', '700', leftWidth - 48);
    this.text(margin + 24, panelTop + 62, 'Use the Mission Console to choose a level JSON file. This viewport shows validation status, identity, and playable mission summary.', 14, '#b9c7dc', '500', leftWidth - 48);

    this.drawSummaryCard({ x: rightX, y: rightY, width: rightWidth, height: rightHeight });
  }

  drawSummaryCard({ x = 540, y = 204, width = 630, height = 462 } = {}) {
    this.panel(x, y, width, height);
    this.text(x + 28, y + 28, 'Imported Level Summary', 20, '#eef6ff', '700', width - 56);
    if (this.importedResultSummary) {
      const summary = this.importedResultSummary;
      this.text(x + 28, y + 78, 'Imported Result Summary', 16, '#63e6be', '700', width - 56);
      [
        ['Instance', summary.instanceId],
        ['Mission', summary.missionId],
        ['Label', summary.label],
        ['Mode', summary.executionMode],
        ['Score', summary.finalScore],
        ['Status', summary.message]
      ].forEach(([label, value], index) => {
        const rowY = y + 116 + index * 34;
        this.text(x + 28, rowY, label, 12, '#7898bd', '700', 108);
        this.text(x + 150, rowY, String(value ?? 'N/A'), 13, '#eef6ff', '500', width - 178);
      });
      return;
    }
    if (this.oracleDatasetSummary) {
      this.text(x + 28, y + 78, this.oracleDatasetSummary.title, 16, '#ffd166', '700', width - 56);
      this.text(x + 28, y + 116, this.oracleDatasetSummary.message, 14, '#b9c7dc', '500', width - 56);
      return;
    }
    if (!this.level) {
      this.text(x + 28, y + 78, 'No level imported yet.', 16, '#9cb4d8', '500', width - 56);
      return;
    }
    const summary = levelSummary(this.level, this.mission);
    const rows = [
      ['Name', summary.name],
      ['Level ID', summary.levelId],
      ['Instance', summary.instanceId],
      ['Grid', summary.grid],
      ['Duration', summary.duration],
      ['Challenge', summary.challengeMode],
      ['Data', summary.data],
      ['Mission', summary.mission]
    ];
    rows.forEach(([label, value], index) => {
      const rowY = y + 80 + index * 34;
      this.text(x + 28, rowY, label, 12, '#7898bd', '700', 108);
      this.text(x + 150, rowY, value, 13, '#eef6ff', '500', width - 178);
    });
    const buttonY = y + Math.min(height - 68, 394);
    const buttonWidth = Math.min(168, Math.max(132, (width - 72) / 3));
    const startX = x + 28 + buttonWidth / 2;
    this.button(startX, buttonY, buttonWidth, 'Play Deterministic', () => this.playImported('perfectKnowledge'));
    this.button(startX + buttonWidth + 12, buttonY, buttonWidth, 'Play Stochastic', () => this.playImported('forecast'));
    this.button(startX + (buttonWidth + 12) * 2, buttonY, buttonWidth, 'Open Editor', () => this.editImported());
    this.button(startX + buttonWidth + 12, buttonY + 48, buttonWidth, 'Export Level', () => downloadJson(`${this.level?.levelId ?? 'imported_level'}.json`, this.level));
  }

  importLevelData(raw) {
    try {
      if (raw?.type === 'anchor.result') return this.importResultData(raw);
      if (raw?.type === 'anchor.oracleDataset') return this.importOracleDataset(raw);
      const imported = parseChallengeImport(raw);
      if (!imported?.level) throw new Error('Expected type anchor.challenge or anchor.level.');
      this.level = normalizeLevelForEditor(ensureLevelIdentity(imported.level));
      this.level.challengeMode = imported.challengeMode ?? this.level.challengeMode;
      this.mission = imported.mission ?? this.buildMissionFromImportedLevel(this.level);
      if (imported.experienceMode) {
        this.level.meta ??= {};
        this.level.meta.experienceMode = imported.experienceMode;
        this.mission.meta ??= {};
        this.mission.meta.experienceMode = imported.experienceMode;
      }
      this.app.state.importedLevel = this.level;
      this.app.state.importedMission = this.mission;
      if (raw?.type === 'anchor.challenge') saveChallengeToLocalStore(raw);
      this.drawScene(`Imported ${this.level.levelId} (${shortInstanceId(this.level)}).`);
      this.renderConsole(`Imported ${this.level.levelId}.`);
    } catch (error) {
      this.showError(error);
    }
  }

  importResultData(raw) {
    const imported = importResultJson(raw, this.app.state);
    this.importedResult = imported.result;
    this.importedResultSummary = imported.summary;
    this.oracleDatasetSummary = null;
    this.drawScene(imported.summary?.message ?? 'Imported result JSON.');
    this.renderConsole(imported.summary?.message ?? 'Imported result JSON.');
  }

  importOracleDataset(raw) {
    const researchMode = Boolean(globalThis.ANCHOR_RESEARCH_MODE || new URLSearchParams(globalThis.location?.search ?? '').has('research'));
    const imported = importOracleDatasetJson(raw, { researchMode });
    this.oracleDatasetSummary = imported.summary;
    this.importedResult = null;
    this.importedResultSummary = null;
    if (imported.ok && imported.imported?.level) {
      this.level = normalizeLevelForEditor(ensureLevelIdentity(imported.imported.level));
      this.level.challengeMode = imported.imported.challengeMode ?? this.level.challengeMode;
      this.mission = imported.imported.mission ?? this.buildMissionFromImportedLevel(this.level);
      if (imported.imported.experienceMode) {
        this.level.meta ??= {};
        this.level.meta.experienceMode = imported.imported.experienceMode;
        this.mission.meta ??= {};
        this.mission.meta.experienceMode = imported.imported.experienceMode;
      }
      this.app.state.importedLevel = this.level;
      this.app.state.importedMission = this.mission;
    }
    this.drawScene(imported.summary?.message ?? 'Oracle dataset import processed.');
    this.renderConsole(imported.summary?.message ?? 'Oracle dataset import processed.');
  }

  renderConsole(status = '') {
    const root = this.app.elements.consoleRoot;
    if (!root) return;
    root.innerHTML = `
      <section class="console-header">
        <div class="console-kicker">Level Import</div>
        <h1>Load Level JSON</h1>
        <p>Import anchor.challenge, anchor.level, anchor.result, or oracle research JSON.</p>
      </section>
      <section class="console-section">
        <h2>Import</h2>
        <button class="console-button primary" data-action="choose">Choose Level JSON</button>
      </section>
      ${this.level ? `
      <section class="console-status">
        <span>Imported</span>
        <strong>${escapeHtml(this.level.levelId)}</strong>
        <small>${escapeHtml(shortInstanceId(this.level))} | ${escapeHtml(this.level.challengeMode ?? 'unknown')}</small>
      </section>
      <section class="console-section">
        <h2>Play</h2>
        <button class="console-button primary" data-action="deterministic">Play Deterministic</button>
        <button class="console-button" data-action="stochastic">Play Stochastic</button>
        <button class="console-button" data-action="editor">Open Editor</button>
      </section>` : ''}
      ${status ? `<section class="console-status"><span>Status</span><strong>${escapeHtml(status)}</strong></section>` : ''}
      ${this.importedResultSummary ? `
      <section class="console-section">
        <h2>Result</h2>
        <button class="console-button primary" data-action="debrief" ${this.importedResultSummary.compatible ? '' : 'disabled'}>Show Debrief</button>
        <div class="hud-muted">${escapeHtml(this.importedResultSummary.message)}</div>
      </section>` : ''}
      <section class="console-footer">
        <button class="console-button secondary" data-action="menu">Main Menu</button>
      </section>
    `;
    this.app.applyConsoleAccordions?.('import');
    root.querySelector('[data-action="choose"]')?.addEventListener('click', () => this.fileBridge.chooseJsonFile());
    root.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.scene.start('MainMenuScene'));
    root.querySelector('[data-action="deterministic"]')?.addEventListener('click', () => this.playImported('perfectKnowledge'));
    root.querySelector('[data-action="stochastic"]')?.addEventListener('click', () => this.playImported('forecast'));
    root.querySelector('[data-action="editor"]')?.addEventListener('click', () => this.editImported());
    root.querySelector('[data-action="debrief"]')?.addEventListener('click', () => this.showImportedDebrief());
  }

  showError(error) {
    this.modal.show({
      title: 'Could not load level JSON',
      body: String(error?.message ?? error ?? 'Invalid or unsupported JSON file.'),
      buttons: [{ label: 'Back', onClick: () => this.modal.hide() }]
    });
  }

  playImported(mode) {
    if (!this.level) return this.showError('Import a level JSON file first.');
    const level = normalizeLevelForEditor(this.level);
    if (mode === 'forecast') {
      level.challengeMode = 'forecast';
      ensureForecastFields(level, { seed: level.meta?.seed ?? level.instanceId });
    } else {
      level.challengeMode = 'perfectKnowledge';
    }
    beginScenario(this.app.state, {
      level,
      mission: this.mission ?? this.buildMissionFromImportedLevel(level),
      challengeMode: mode,
      experienceMode: level.meta?.experienceMode ?? this.mission?.meta?.experienceMode ?? EXPERIENCE_MODES.simulationLab,
      source: 'levelJson'
    });
    resetPlanResultStore(this.app.state);
    this.scene.start('MissionBriefingScene');
  }

  editImported() {
    if (!this.level) return this.showError('Import a level JSON file first.');
    this.app.state.customLevel = normalizeLevelForEditor(this.level);
    this.app.state.mission = this.mission ?? this.buildMissionFromImportedLevel(this.level);
    this.scene.start('EnvironmentEditorScene');
  }

  showImportedDebrief() {
    if (!this.importedResult || !this.importedResultSummary?.compatible) return;
    this.app.state.result = this.importedResult;
    this.scene.start('DebriefScene');
  }

  buildMissionFromImportedLevel(level) {
    return level.missionDefaults ?? this.app.state.mission ?? buildDefaultMissionForLevel(level);
  }

  panel(x, y, width, height) {
    const rect = this.add.rectangle(x, y, width, height, 0x0f1b2e, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6d86aa, 0.36);
    this.objects.push(rect);
    return rect;
  }

  button(x, y, width, label, onClick) {
    const button = new PhaserButton(this, { x, y, width, height: 36, label, onClick });
    this.objects.push(button);
    return button;
  }

  text(x, y, value, size = 14, color = '#dcecff', weight = '500', width = 780) {
    const text = this.add.text(x, y, value, {
      fontFamily: 'system-ui',
      fontSize: `${size}px`,
      fontStyle: weight,
      color,
      wordWrap: { width }
    });
    this.objects.push(text);
    return text;
  }

  clearObjects() {
    this.objects?.forEach((object) => object.destroy?.());
    this.objects = [];
  }
}

function levelSummary(level, mission) {
  const grid = level.world?.grid ?? {};
  const time = level.world?.time ?? {};
  const truthFrames = level.layers?.truth?.frames?.length ?? 0;
  const forecastFrames = level.layers?.forecast?.frames?.length ?? 0;
  const ensembleCount = level.layers?.forecasts?.length ?? 0;
  const agents = level.missionDefaults?.agents?.length ?? mission?.agents?.length ?? 0;
  return {
    name: level.meta?.name ?? level.levelId ?? 'Imported level',
    levelId: level.levelId ?? 'unknown',
    instanceId: shortInstanceId(level.instanceId ?? level),
    grid: `${grid.width ?? '?'} x ${grid.height ?? '?'}`,
    duration: `${time.duration ?? 'N/A'} ${time.displayUnits ?? 'hours'} | window ${time.planningWindow ?? 'N/A'}`,
    challengeMode: level.challengeMode ?? 'perfectKnowledge',
    data: `truth ${truthFrames ? 'yes' : 'no'} (${truthFrames}) | forecast ${forecastFrames ? 'yes' : 'no'} (${forecastFrames}) | ensemble ${ensembleCount}`,
    mission: agents ? `${agents} agent(s) from mission defaults or fallback mission` : 'fallback mission will be generated'
  };
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
