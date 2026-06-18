import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const MISSION_SETUP_VIEW_VERSION = 'mission-setup-view-mig-r2';

export function createMissionSetupView(context = {}) {
  return new MissionSetupView(context);
}

export class MissionSetupView {
  constructor({ lifecycleController, router } = {}) {
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('missionSetup');
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-mission-setup');
    const intro = panel(documentRef, 'Mission Setup', 'Choose a deterministic tutorial mission or open a legacy lab island.');
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      button(documentRef, 'Use Tutorial Mission', () => this.lifecycleController?.loadTutorialMission?.('tutorial_01_first_deployment'), 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Back to Menu', () => this.router?.navigate?.('mainMenu')),
      button(documentRef, 'Load JSON in Legacy UI', () => this.router?.openLegacyScene?.('loadLevelJson'))
    );
    intro.appendChild(actions);
    root.appendChild(intro);
    this.element = root;
    return root;
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }
}
