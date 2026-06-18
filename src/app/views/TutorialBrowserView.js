import { CAMPAIGN_LEVELS } from '../../core/campaign/CampaignLevels.js';
import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const TUTORIAL_BROWSER_VIEW_VERSION = 'tutorial-browser-view-mig-r2-1';

export function createTutorialBrowserView(context = {}) {
  return new TutorialBrowserView(context);
}

export class TutorialBrowserView {
  constructor({ lifecycleController, router } = {}) {
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('tutorialBrowser');
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-tutorial-browser');
    root.dataset.testid = 'tutorial-browser-view';
    const browser = panel(documentRef, 'Tutorial Browser', 'Tutorial missions launch through the normal DOM mission lifecycle. Static lessons remain regular HTML pages.');
    const list = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    for (const entry of CAMPAIGN_LEVELS.slice(0, 8)) {
      const launch = button(documentRef, entry.label ?? entry.title ?? entry.id, () => this.lifecycleController?.loadTutorialMission?.(entry.id), 'anchor-dom-button');
      launch.dataset.testid = `tutorial-launch-${entry.id}`;
      list.appendChild(launch);
    }
    const links = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    const index = createDomElement(documentRef, 'a', 'anchor-dom-button', 'Learning Labs Index');
    index.href = 'labs/index.html';
    index.target = '_blank';
    index.rel = 'noopener noreferrer';
    links.append(index, button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'), 'anchor-dom-button'));
    browser.append(list, links);
    root.appendChild(browser);
    this.element = root;
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.tutorialBrowserView = this.getDebugState();
    return root;
  }

  getDebugState() {
    return {
      type: 'anchor.view.tutorial-browser.debug',
      version: TUTORIAL_BROWSER_VIEW_VERSION,
      tutorialCount: CAMPAIGN_LEVELS.length,
      usesPhaserScene: false
    };
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }
}
