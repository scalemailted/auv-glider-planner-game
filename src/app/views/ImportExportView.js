import { loadJSON, readJSONFile, downloadJSON } from '../../core/io/ImportExport.js';
import { normalizePlan } from '../../core/planning/WaypointPlan.js';
import { ensureLevelIdentity } from '../../core/identity/GameInstanceId.js';
import { applyTutorialMissionConfig } from '../../core/campaign/CampaignLevels.js';
import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const IMPORT_EXPORT_VIEW_VERSION = 'import-export-view-mig-r2-1';

export function createImportExportView(context = {}) {
  return new ImportExportView(context);
}

export class ImportExportView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('importExport');
    this.element = null;
    this.statusEl = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-import-export');
    root.dataset.testid = 'import-export-view';

    const importPanel = panel(documentRef, 'Import / Export', 'Load challenge references or plan JSON through the DOM runtime. Validation and execution remain owned by existing core modules.');
    const input = createDomElement(documentRef, 'input', 'anchor-dom-file-input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.dataset.testid = 'import-file-input';
    input.addEventListener?.('change', (event) => this.handleFile(event));
    this.statusEl = createDomElement(documentRef, 'p', 'anchor-dom-copy', 'No file loaded.');
    this.statusEl.dataset.testid = 'import-status';
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      button(documentRef, 'Export Current Session', () => this.exportCurrentSession(), 'anchor-dom-button'),
      button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'), 'anchor-dom-button')
    );
    importPanel.append(input, this.statusEl, actions);
    root.appendChild(importPanel);
    this.element = root;
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.importExportView = this.getDebugState();
    return root;
  }

  async handleFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      const payload = await readJSONFile(file);
      await this.importPayload(payload);
    } catch (error) {
      this.setStatus(`Import failed: ${error.message}`);
    }
  }

  async importPayload(payload) {
    const type = payload?.type ?? '';
    if (type === 'anchor.challenge-reference') {
      const level = ensureLevelIdentity(await loadJSON(cleanReferencePath(payload.levelUrl ?? 'levels/tutorial_05_forecast.json')));
      const mission = applyTutorialMissionConfig(await loadJSON(cleanReferencePath(payload.missionUrl ?? 'missions/tutorial_sampling.json')), payload.challengeId ?? 'tutorial_14_import_export_workflow');
      this.lifecycleController?.loadMission?.({
        level,
        mission,
        source: 'import',
        missionMode: 'importedChallenge',
        experienceMode: 'challenge',
        visibilityMode: 'imported',
        challengeMode: level.challengeMode ?? 'forecastUncertainty'
      }, { source: 'import', missionMode: 'importedChallenge', visibilityMode: 'imported' });
      this.setStatus(`Imported challenge ${payload.challengeId ?? 'unknown'} and opened briefing.`);
      return;
    }
    if (type === 'anchor.plan') {
      const state = this.sessionStore?.getState?.() ?? {};
      if (!state.level || !state.mission) throw new Error('Plan import requires a loaded mission first.');
      const plan = normalizePlan(payload, state.level, state.mission);
      this.lifecycleController?.updatePlan?.(plan, { type: 'importPlan' });
      this.lifecycleController?.beginPlanning?.();
      this.setStatus(`Imported plan ${payload.meta?.name ?? payload.planId ?? 'unnamed plan'}.`);
      return;
    }
    if (payload?.level && payload?.mission) {
      this.lifecycleController?.loadMission?.({ level: ensureLevelIdentity(payload.level), mission: payload.mission, plan: payload.plan ?? null, source: 'import' }, { source: 'import' });
      this.setStatus('Imported embedded mission bundle and opened briefing.');
      return;
    }
    throw new Error(`Unsupported JSON type: ${type || 'unknown'}`);
  }

  exportCurrentSession() {
    const state = this.sessionStore?.getState?.() ?? {};
    downloadJSON('anchor-session-export.json', {
      type: 'anchor.dom-session-export',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      level: state.level ?? null,
      mission: state.mission ?? null,
      plan: state.plan ?? null,
      result: state.result ?? null
    });
  }

  setStatus(message) {
    if (this.statusEl) this.statusEl.textContent = message;
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.importExportView = this.getDebugState(message);
  }

  getDebugState(status = this.statusEl?.textContent ?? '') {
    return {
      type: 'anchor.view.import-export.debug',
      version: IMPORT_EXPORT_VIEW_VERSION,
      status,
      usesPhaserScene: false
    };
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }
}

function cleanReferencePath(value) {
  return String(value ?? '').replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
}
