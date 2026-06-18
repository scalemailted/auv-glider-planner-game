import { createAnchorViewContract, button, createDomElement, panel } from './AnchorViewContract.js';

export const LEADERBOARD_VIEW_VERSION = 'leaderboard-view-mig-r2-1';
export const LEADERBOARD_STORAGE_KEY = 'anchor.dom.leaderboard.attempts.v1';

export function createLeaderboardView(context = {}) {
  return new LeaderboardView(context);
}

export class LeaderboardView {
  constructor({ sessionStore, lifecycleController, router } = {}) {
    this.sessionStore = sessionStore;
    this.lifecycleController = lifecycleController;
    this.router = router;
    this.contract = createAnchorViewContract('leaderboard');
    this.element = null;
  }

  mount({ documentRef, shell }) {
    shell.clearSidePanels?.();
    const root = createDomElement(documentRef, 'main', 'anchor-dom-leaderboard');
    root.dataset.testid = 'leaderboard-view';
    this.element = root;
    this.render(documentRef);
    return root;
  }

  render(documentRef) {
    if (!this.element) return;
    this.element.innerHTML = '';
    const attempts = readAttempts();
    const board = panel(documentRef, 'Leaderboard', attempts.length ? 'Local saved attempts from DOM mission runs.' : 'No saved attempts yet. Complete a mission debrief and save the attempt.');
    const list = createDomElement(documentRef, 'div', 'anchor-dom-actions anchor-dom-actions-column');
    list.dataset.testid = 'leaderboard-attempt-list';
    for (const attempt of attempts) {
      const row = createDomElement(documentRef, 'article', 'anchor-dom-panel');
      row.dataset.testid = 'leaderboard-attempt-row';
      row.appendChild(createDomElement(documentRef, 'h3', 'anchor-dom-heading', attempt.name ?? attempt.id));
      row.appendChild(createDomElement(documentRef, 'p', 'anchor-dom-copy', `Score: ${attempt.result?.summary?.finalScore ?? attempt.result?.summary?.score ?? 'n/a'} | Mode: ${attempt.missionMode ?? 'mission'}`));
      const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
      actions.append(
        button(documentRef, 'Rerun', () => this.loadAttempt(attempt, true), 'anchor-dom-button'),
        button(documentRef, 'Load as Plan', () => this.loadAttempt(attempt, false), 'anchor-dom-button')
      );
      row.appendChild(actions);
      list.appendChild(row);
    }
    const actions = createDomElement(documentRef, 'div', 'anchor-dom-actions');
    actions.append(
      button(documentRef, 'Save Current Attempt', () => { saveCurrentAttempt(this.sessionStore?.getState?.() ?? {}); this.render(documentRef); }, 'anchor-dom-button anchor-dom-button-primary'),
      button(documentRef, 'Main Menu', () => this.router?.navigate?.('mainMenu'), 'anchor-dom-button')
    );
    board.append(list, actions);
    this.element.appendChild(board);
    globalThis.ANCHOR_APP_RUNTIME_DEBUG ??= {};
    globalThis.ANCHOR_APP_RUNTIME_DEBUG.leaderboardView = this.getDebugState(attempts.length);
  }

  loadAttempt(attempt, rerun = false) {
    if (!attempt?.level || !attempt?.mission) return;
    this.lifecycleController?.loadMission?.({
      level: attempt.level,
      mission: attempt.mission,
      plan: attempt.plan ?? null,
      source: 'leaderboard',
      missionMode: attempt.missionMode ?? null,
      benchmarkMode: attempt.benchmarkMode ?? null,
      visibilityMode: attempt.visibilityMode ?? null,
      seed: attempt.seed ?? null
    }, { source: 'leaderboard' });
    if (rerun) globalThis.setTimeout?.(() => this.lifecycleController?.beginPlanning?.(), 0);
  }

  getDebugState(attemptCount = readAttempts().length) {
    return {
      type: 'anchor.view.leaderboard.debug',
      version: LEADERBOARD_VIEW_VERSION,
      attemptCount,
      usesPhaserScene: false
    };
  }

  unmount() {
    this.element?.remove?.();
    this.element = null;
  }
}

export function saveCurrentAttempt(state = {}) {
  if (!state.level || !state.mission) return null;
  const attempt = {
    id: `attempt-${Date.now()}`,
    name: state.level?.meta?.name ?? state.mission?.meta?.name ?? 'DOM mission attempt',
    savedAt: new Date().toISOString(),
    level: state.level,
    mission: state.mission,
    plan: state.plan ?? null,
    result: state.result ?? null,
    missionMode: state.missionMode ?? null,
    benchmarkMode: state.benchmarkMode ?? null,
    visibilityMode: state.visibilityMode ?? null,
    seed: state.seed ?? null
  };
  const attempts = [attempt, ...readAttempts()].slice(0, 12);
  globalThis.localStorage?.setItem?.(LEADERBOARD_STORAGE_KEY, JSON.stringify(attempts));
  return attempt;
}

export function readAttempts() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem?.(LEADERBOARD_STORAGE_KEY) ?? '[]').filter(Boolean);
  } catch {
    return [];
  }
}
