import { createAnchorViewContract, button, createDomElement, formatNumber, metricList, panel } from './AnchorViewContract.js';

export const MISSION_DEBRIEF_VIEW_VERSION = 'mission-debrief-view-mig-r2';

export function createMissionDebriefView(context = {}) {
  return new MissionDebriefView(context);
}

export class MissionDebriefView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('missionDebrief');
    this.unsubscribe = null;
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-debrief');
    this.element = root;
    this.render(documentRef, shell);
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.render(documentRef, shell));
    return root;
  }

  render(documentRef, shell) {
    if (!this.element) return;
    const state = this.sessionStore?.getState?.() ?? {};
    const result = state.result;
    this.element.innerHTML = '';
    const debrief = panel(documentRef, result ? 'Mission Debrief' : 'No Result Yet', result ? 'Official scoring remains produced by the shared simulation/scoring core.' : 'Run a simulation to generate a mission result.');
    debrief.appendChild(metricList(documentRef, [
      { label: 'Final Score', value: result?.summary?.finalScore ?? result?.summary?.score ?? 'n/a' },
      { label: 'ROI Collected', value: result?.summary?.roiCollected ?? result?.summary?.sampleValue ?? 'n/a' },
      { label: 'Energy Used', value: formatNumber(result?.summary?.energyUsed, 2) },
      { label: 'Hazards', value: result?.summary?.hazardsHit ?? result?.risk?.staticHazardsHit ?? 0 },
      { label: 'Stop Reason', value: result?.stopReason?.label ?? result?.stopReason?.reason ?? result?.abortReason ?? 'n/a' }
    ]));
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      button(documentRef, 'Plan Again', () => this.lifecycleController?.beginPlanning?.(), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'))
    );
    debrief.appendChild(actions);
    this.element.appendChild(debrief);
    shell.setConsole?.('<h2>Mission Debrief</h2><p>Review score, sampling, energy, and safety metrics from the deterministic simulation result.</p>');
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.debriefView = this.getDebugState();
  }

  unmount() {
    this.unsubscribe?.();
    this.element?.remove?.();
    this.element = null;
  }

  getDebugState() {
    const result = this.sessionStore?.getState?.().result;
    return {
      type: 'anchor.view.mission-debrief.debug',
      version: MISSION_DEBRIEF_VIEW_VERSION,
      hasResult: Boolean(result),
      ownsScoring: false,
      usesPhaserScene: false
    };
  }
}
