import { createAnchorViewContract, button, createDomElement, metricList, panel } from './AnchorViewContract.js';

export const MISSION_BRIEFING_VIEW_VERSION = 'mission-briefing-view-mig-r2';

export function createMissionBriefingView(context = {}) {
  return new MissionBriefingView(context);
}

export class MissionBriefingView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('missionBriefing');
    this.unsubscribe = null;
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-briefing');
    this.element = root;
    this.render(documentRef, shell);
    this.unsubscribe = this.sessionStore?.subscribe?.(() => this.render(documentRef, shell));
    return root;
  }

  render(documentRef, shell) {
    if (!this.element) return;
    const state = this.sessionStore?.getState?.() ?? {};
    this.element.innerHTML = '';
    if (!state.level || !state.mission) {
      const empty = panel(documentRef, 'No Mission Loaded', 'Start from the setup screen to load a mission.');
      empty.appendChild(button(documentRef, 'Open Setup', () => this.router?.navigate?.('missionSetup'), 'anchor-dom-button anchor-dom-button-primary'));
      this.element.appendChild(empty);
      return;
    }
    const briefing = panel(documentRef, state.mission?.meta?.name ?? state.level?.meta?.name ?? 'Mission Briefing');
    briefing.appendChild(metricList(documentRef, [
      { label: 'Level', value: state.level.levelId ?? 'unknown' },
      { label: 'Mission', value: state.mission.missionId ?? state.mission.id ?? 'unknown' },
      { label: 'Grid', value: `${state.level.world?.grid?.width ?? '?'} x ${state.level.world?.grid?.height ?? '?'}` },
      { label: 'Duration', value: `${state.level.world?.time?.duration ?? '?'} s` },
      { label: 'Agents', value: state.mission.agents?.length ?? 0 },
      { label: 'Runtime', value: 'DOM + Three.js + shared SimulationEngine' }
    ]));
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      button(documentRef, 'Start Planning', () => this.lifecycleController?.beginPlanning?.(), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Mission Setup', () => this.router?.navigate?.('missionSetup')),
      button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'))
    );
    briefing.appendChild(actions);
    this.element.appendChild(briefing);
    shell.setConsole?.('<h2>Mission Briefing</h2><p>Review the deterministic mission context, then enter planning.</p>');
  }

  unmount() {
    this.unsubscribe?.();
    this.element?.remove?.();
    this.element = null;
  }
}
